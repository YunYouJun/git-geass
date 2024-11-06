import type { BranchSummaryBranch } from 'simple-git'
import type { BranchInfo } from './types'
import process from 'node:process'

// @clark/prompts is not perfect when using long choices
// import { group, intro, multiselect } from '@clack/prompts'

import consola from 'consola'

import { colors } from 'consola/utils'
import { formatDate, formatDistanceToNow } from 'date-fns'
import ora from 'ora'

import prompts from 'prompts'
import { git } from './env'
import { getRemoteBranches, getRemoteDefaultBranch } from './utils'

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

  const s = ora('Loading local branches info').start()
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
  s.succeed(`Local  ${colors.gray('branches info loaded.')}`)

  let remoteBranches: BranchInfo[] = []
  if (options.remote) {
    // 过滤掉默认分支
    const remoteDefaultBranch = await getRemoteDefaultBranch()
    oldBranches = oldBranches.filter(branch => `origin/${branch.name}` !== remoteDefaultBranch)

    remoteBranches = await getRemoteBranches()
  }

  const branchOptions: prompts.Choice[] = [
    ...oldBranches,
    ...remoteBranches,
  ].map((branch) => {
    // 判断是否为有效日期格式
    const latestCommitDate = branch.latestCommitDate
    const fromNow = formatDistanceToNow(latestCommitDate, { addSuffix: true })
    return {
      title: `${colors.cyan(branch.name)}`,
      value: branch.name,
      // 带有时区
      description: `${colors.yellow(branch.commit)} ${colors.green(fromNow)} [${formatDate(branch.latestCommitDate, 'yyyy-MM-dd HH:mm:ss xxx')}]`,
      // selected: true,
    }
  })

  if (!branchOptions.length) {
    consola.success('No branches need to be deleted.')
    return
  }

  console.log()
  const mergedBranchesText = options.merged?.map(b => colors.cyan(b)).join('|')

  const block = colors.bold(colors.dim(colors.gray('┃')))
  console.log(block, `${colors.green('a')} ${colors.gray('to select/unselect all,')} ${colors.green('enter')} ${colors.gray('to confirm,')} ${colors.green('space')} ${colors.gray('to toggle')}`)
  console.log()

  const results = await prompts({
    instructions: false,
    type: 'multiselect',
    name: 'deletedBranches',
    message: `Delete ${options.merged?.length ? `merged to ${mergedBranchesText}` : 'old'} Branches?`,
    choices: branchOptions,

  }, {
    onCancel: () => {
      consola.warn('User canceled.')
      process.exit(0)
    },
  })

  const deletedBranches = results.deletedBranches as string[]
  if (deletedBranches) {
    for (const branch of deletedBranches) {
      if (branch.startsWith('origin/')) {
        // delete remote branch
        const remoteName = 'origin'
        const remoteBranch = branch.replace(`${remoteName}/`, '')
        const branchText = `${colors.dim(`${remoteName}/`)}${colors.cyan(remoteBranch)}`
        const s = ora(`Deleting remote branch ${branchText}`).start()
        const data = (await git.push([remoteName, '--delete', remoteBranch]))
        s.succeed(`Remote branch ${branchText} deleted.`)
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
