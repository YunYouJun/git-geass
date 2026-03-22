import type { BranchSummaryBranch } from 'simple-git'
import type { BranchInfo, RepoHealth } from '../types'
import { rmSync } from 'node:fs'
import process from 'node:process'

import { cancel, confirm, isCancel, multiselect, spinner } from '@clack/prompts'

import consola from 'consola'

import { colors } from 'consola/utils'
import { formatDate, formatDistanceToNow } from 'date-fns'
import { git } from '../env'
import { findStaleRepos, getRemoteBranches, getRemoteDefaultBranch } from '../utils'

const defaultCleanBranchesOptions = {
  days: 0,
  merged: [],
  remote: false,
}

/**
 * 清除分支
 */
export async function cleanBranches(options: {
  /**
   * 多少天前
   * @default 0
   */
  days?: number
  /**
   * 筛选已合并到目标分支的分支
   * @example clean branch -m master
   * @example clean branch -m main -m master
   */
  merged?: string[]
  /**
   * 是否删除远程分支
   */
  remote?: boolean
} = defaultCleanBranchesOptions): Promise<void> {
  options = {
    ...defaultCleanBranchesOptions,
    ...options,
  }

  const s = spinner()
  s.start('Loading local branches info')
  const branchSummary = await git.branchLocal()

  const currentDate = (new Date()).valueOf()
  const nDaysAgo = currentDate - (options.days || 0) * 24 * 60 * 60 * 1000

  let oldBranches: (BranchSummaryBranch & {
    latestCommitDate: Date
  })[] = []

  const mergedBranches: string[] = []
  if (options.merged?.length) {
    for (const branch of options.merged) {
      try {
        const mBranches = (await git.raw(['branch', '--merged', branch]))
          .split('\n')
          .map(b => b.trim())
          // 不能删除当前分支/目标分支
          .filter(b => b && !b.startsWith('*') && b !== branch)
        mergedBranches.push(...mBranches)
      }
      // eslint-disable-next-line unused-imports/no-unused-vars
      catch (_e: any) {
        // ignore error target branches
      }
    }
  }

  for (const branch in branchSummary.branches) {
    if (branchSummary.branches[branch].current)
      continue

    // 获取分支的最后提交日期
    const log = await git.log({ from: branch, maxCount: 1 })
    const latestCommit = log.latest
    if (latestCommit) {
      const latestCommitDate = new Date(latestCommit.date)

      // 如果分支的最后提交日期早于 n 天前，删除该分支
      if (latestCommitDate.valueOf() <= nDaysAgo) {
        oldBranches.push({
          ...branchSummary.branches[branch],
          latestCommitDate,
        })
      }
    }
  }

  // 最新日期在前
  oldBranches.sort((a, b) => a.latestCommitDate.valueOf() - b.latestCommitDate.valueOf())
  // filter by mergedBranches
  oldBranches = oldBranches.filter(branch => options.merged?.length ? mergedBranches.includes(branch.name) : true)

  // two spaces for align
  s.stop(`Local  ${colors.gray('branches info loaded.')}`)

  let remoteBranches: BranchInfo[] = []
  if (options.remote) {
    // 过滤掉默认分支
    const remoteDefaultBranch = await getRemoteDefaultBranch()
    oldBranches = oldBranches.filter(branch => `origin/${branch.name}` !== remoteDefaultBranch)

    remoteBranches = await getRemoteBranches()
  }

  const branchOptions = [
    ...oldBranches,
    ...remoteBranches,
  ].map((branch) => {
    // 判断是否为有效日期格式
    const latestCommitDate = branch.latestCommitDate
    const fromNow = formatDistanceToNow(latestCommitDate, { addSuffix: true })
    return {
      label: `${colors.cyan(branch.name)}`,
      value: branch.name,
      // 带有时区
      hint: `${colors.yellow(branch.commit)} ${colors.green(fromNow)} [${formatDate(branch.latestCommitDate, 'yyyy-MM-dd HH:mm:ss xxx')}]`,
    }
  })

  if (!branchOptions.length) {
    consola.success('No branches need to be deleted.')
    return
  }

  console.log()
  const mergedBranchesText = options.merged?.map(b => colors.cyan(b)).join('|')

  const deletedBranches = await multiselect({
    message: `Delete ${options.merged?.length ? `merged to ${mergedBranchesText}` : 'old'} Branches?`,
    options: branchOptions,
  })

  if (isCancel(deletedBranches)) {
    cancel('User canceled.')
    process.exit(0)
  }

  if (deletedBranches) {
    for (const branch of deletedBranches) {
      if (branch.startsWith('origin/')) {
        // delete remote branch
        const remoteName = 'origin'
        const remoteBranch = branch.replace(`${remoteName}/`, '')
        const branchText = `${colors.dim(`${remoteName}/`)}${colors.cyan(remoteBranch)}`
        const rs = spinner()
        rs.start(`Deleting remote branch ${branchText}`)
        const data = (await git.push([remoteName, '--delete', remoteBranch]))
        rs.stop(`Remote branch ${branchText} deleted.`)
        if (data.remoteMessages.all.length)
          consola.info(data.remoteMessages.all.join('\n'))
      }
      else {
        const data = await git.deleteLocalBranch(branch, true)
        consola.success(`${colors.cyan(branch)}(${colors.yellow(data?.hash || '')}) deleted.`)
      }
    }
  }
}

// ============ Clean Repos ============

const EMOJI_RE = /^(\p{Emoji_Presentation})/u

/** 仓库分类标签 */
const CATEGORY_NO_COMMITS = '📭 无提交（空仓库）'
const CATEGORY_STALE = '💤 长期未提交（超过半年）'
const CATEGORY_NO_REMOTE = '🔗 无 Remote（可能是临时仓库）'

/**
 * 将无用仓库按原因分类
 * 一个仓库可能同时匹配多个分类，优先归入最严重的分类
 */
function categorizeRepos(repos: RepoHealth[]): Record<string, RepoHealth[]> {
  const groups: Record<string, RepoHealth[]> = {
    [CATEGORY_NO_COMMITS]: [],
    [CATEGORY_STALE]: [],
    [CATEGORY_NO_REMOTE]: [],
  }

  const assigned = new Set<string>()

  // 第一轮：空仓库（最严重）
  for (const repo of repos) {
    if (repo.totalCommits === 0) {
      groups[CATEGORY_NO_COMMITS].push(repo)
      assigned.add(repo.path)
    }
  }

  // 第二轮：长期未提交
  for (const repo of repos) {
    if (assigned.has(repo.path))
      continue
    if (repo.daysSinceLastCommit !== null && repo.daysSinceLastCommit > 180) {
      groups[CATEGORY_STALE].push(repo)
      assigned.add(repo.path)
    }
  }

  // 第三轮：仅无 remote
  for (const repo of repos) {
    if (assigned.has(repo.path))
      continue
    if (!repo.hasRemote) {
      groups[CATEGORY_NO_REMOTE].push(repo)
      assigned.add(repo.path)
    }
  }

  return groups
}

/** 格式化仓库提示信息 */
function formatRepoHint(repo: RepoHealth): string {
  const parts: string[] = []
  parts.push(colors.cyan(`${repo.totalCommits} 次提交`))
  parts.push(repo.hasRemote ? colors.green('remote: 有') : colors.red('remote: 无'))
  if (repo.lastCommitDate)
    parts.push(`最后提交: ${colors.dim(repo.lastCommitDate)}`)
  if (repo.daysSinceLastCommit !== null)
    parts.push(colors.yellow(`${repo.daysSinceLastCommit} 天前`))
  return parts.join(colors.dim(' · '))
}

/**
 * 清理无用的 Git 仓库
 * 递归扫描 scanRoot 下的所有 Git 仓库，检测空仓库、长期未提交、无 remote 等问题仓库
 */
export async function cleanRepos(options: {
  /** 扫描根目录，默认 process.cwd() */
  scanRoot?: string
  /** 天数阈值，默认 180 */
  days?: number
  /** 仅预览，不执行删除 */
  dryRun?: boolean
} = {}): Promise<void> {
  const scanRoot = options.scanRoot || process.cwd()
  const staleDays = options.days || 180

  consola.info(`🧹 Git 仓库清理`)
  console.log()

  const s2 = spinner()
  s2.start(`扫描目录: ${colors.cyan(scanRoot)}`)

  const staleRepos = await findStaleRepos(scanRoot, staleDays, (done, total) => {
    s2.message(`分析仓库健康状态 ${colors.cyan(`(${done}/${total})`)}`)
  })

  s2.stop(`扫描完成，发现 ${colors.bold(colors.yellow(String(staleRepos.length)))} 个可清理仓库`)

  if (staleRepos.length === 0) {
    consola.success('所有仓库状态良好，无需清理！')
    return
  }

  // 按分类分组
  const grouped = categorizeRepos(staleRepos)

  if (options.dryRun) {
    // 预览模式：仅列出
    for (const [category, repos] of Object.entries(grouped)) {
      if (repos.length === 0)
        continue
      consola.info(`${category}（${repos.length} 个）`)
      for (const repo of repos) {
        console.log(`  ${colors.bold(repo.name)}  ${colors.dim(formatRepoHint(repo))}`)
      }
    }
    console.log()
    consola.info('📋 预览模式，未执行删除')
    return
  }

  // 先打印分类概览
  for (const [category, repos] of Object.entries(grouped)) {
    if (repos.length > 0)
      consola.info(`${category}（${repos.length} 个）`)
  }

  // 所有仓库合并到一个 multiselect，label 前缀标识分类
  const allChoices: { label: string, value: string, hint: string }[] = []
  for (const [category, repos] of Object.entries(grouped)) {
    const icon = category.match(EMOJI_RE)?.[1] || '•'
    for (const repo of repos) {
      allChoices.push({
        label: `${icon} ${colors.bold(repo.name)}`,
        value: repo.path,
        hint: formatRepoHint(repo),
      })
    }
  }

  console.log()
  const selected = await multiselect({
    message: '选择要删除的仓库（空格选中，回车确认）',
    options: allChoices,
  })

  if (isCancel(selected)) {
    cancel('已取消操作。')
    process.exit(0)
  }

  const selectedPaths = selected as string[]
  if (!selectedPaths || selectedPaths.length === 0) {
    consola.info('未选择任何仓库，已跳过。')
    return
  }

  // 二次确认
  const reposToDelete = staleRepos.filter(r => selectedPaths.includes(r.path))

  console.log()
  consola.warn(`即将删除 ${reposToDelete.length} 个仓库:`)
  for (const repo of reposToDelete) {
    console.log(`  ${colors.bold(repo.name)}  ${colors.dim(repo.path)}`)
    console.log(`    ${colors.yellow(formatRepoHint(repo))}`)
  }

  console.log()
  const confirmed = await confirm({
    message: '⚠️  此操作不可恢复！确认删除？',
    initialValue: false,
  })

  if (isCancel(confirmed)) {
    cancel('已取消删除。')
    process.exit(0)
  }

  if (!confirmed) {
    consola.warn('已取消删除。')
    return
  }

  // 执行删除
  let deleted = 0
  const total = reposToDelete.length
  for (const repo of reposToDelete) {
    try {
      rmSync(repo.path, { recursive: true, force: true })
      deleted++
      consola.success(`${colors.dim(`[${deleted}/${total}]`)} 已删除: ${colors.bold(repo.name)}`)
    }
    catch (err) {
      consola.error(`删除失败: ${colors.bold(repo.name)} — ${colors.red((err as Error).message)}`)
    }
  }

  console.log()
  consola.success(`🧹 清理完成，已删除 ${colors.bold(colors.green(String(deleted)))} 个仓库。`)
}
