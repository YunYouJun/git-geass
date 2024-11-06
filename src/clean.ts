import type { BranchSummaryBranch } from 'simple-git'
import consola from 'consola'
import { colors } from 'consola/utils'
import { formatDate } from 'date-fns'
import prompts from 'prompts'

import { git } from './env'

const defaultCleanBranchesOptions = {
  days: 0,
  merged: [],
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
} = defaultCleanBranchesOptions): Promise<void> {
  options = {
    ...defaultCleanBranchesOptions,
    ...options,
  }

  const branchSummary = await git.branchLocal()

  const currentDate = (new Date()).valueOf()
  const nDaysAgo = currentDate - (options.days || 0) * 24 * 60 * 60 * 1000

  // console.log('branches', branches)

  let oldBranches: (BranchSummaryBranch & {
    lastCommitDate: Date
  })[] = []

  const mergedBranches: string[] = []
  if (options.merged?.length) {
    for (const branch of options.merged) {
      try {
        const mBranches = (await git.raw(['branch', '--merged', branch]))
          .split('\n')
          .map(b => b.trim())
          // 不能删除当前分支/目标分支
          .filter(b => !!b && !b.startsWith('*') && b !== branch)
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
      const lastCommitDate = new Date(latestCommit.date)

      // 如果分支的最后提交日期早于 n 天前，删除该分支
      if (lastCommitDate.valueOf() <= nDaysAgo) {
        oldBranches.push({
          ...branchSummary.branches[branch],
          lastCommitDate,
        })
      }
    }
  }

  // 最新日期在前
  oldBranches.sort((a, b) => a.lastCommitDate.valueOf() - b.lastCommitDate.valueOf())
  // filter by mergedBranches
  oldBranches = oldBranches.filter(branch => options.merged?.length ? mergedBranches.includes(branch.name) : true)

  if (!oldBranches.length) {
    consola.success('No branches need to be deleted.')
    return
  }

  const branchOptions: prompts.Choice[] = oldBranches.map(branch => ({
    // 带有时区
    title: `${colors.cyan(branch.name)}`,
    value: branch.name,
    description: `${colors.yellow(branch.commit)} (${formatDate(branch.lastCommitDate, 'yyyy-MM-dd HH:mm:ss xxx')})`,
    selected: true,
  }))

  const mergedBranchesText = options.merged?.map(b => colors.cyan(b)).join('|')
  const results = await prompts({
    instructions: false,
    type: 'multiselect',
    name: 'deletedBranches',
    message: `Delete ${options.merged?.length ? `merged to ${mergedBranchesText}` : 'old'} Branches?`,
    choices: branchOptions,
  }, {
    onCancel: () => {
      // consola.warn('用户取消操作')
      consola.warn('User canceled.')
    },
  })

  if (results.deletedBranches) {
    for (const branch of results.deletedBranches) {
      const data = await git.deleteLocalBranch(branch, true)
      consola.success(`${colors.cyan(branch)}(${colors.yellow(data?.hash || '')}) deleted.`)
    }
  }
}
