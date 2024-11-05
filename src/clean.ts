import type { BranchSummaryBranch } from 'simple-git'
import consola from 'consola'
import { git } from './env'

/**
 * 清除分支
 */
export async function cleanBranches(options: {
  /**
   * 旧分支
   */
  old: boolean
  /**
   * 多少天前
   */
  days: number
} = {
  old: true,
  days: 0,
}): Promise<void> {
  const branchSummary = await git.branchLocal()

  const currentDate = new Date()
  const nDaysAgo = new Date()
  nDaysAgo.setDate(currentDate.getDate() - options.days)

  // console.log('branches', branches)

  const oldBranches: (BranchSummaryBranch & {
    lastCommitDate: Date
  })[] = []
  // Object.keys(branchSummary.branches).forEach((branch) => )
  for (const branch in branchSummary.branches) {
    console.log('branch', branch)
    if (branch === branchSummary.current)
      return

    // 获取分支的最后提交日期
    const log = await git.log({ from: branch })
    const latestCommit = log.latest
    console.log('latestCommit', latestCommit)
    if (latestCommit) {
      const lastCommitDate = new Date(latestCommit.date)

      // 如果分支的最后提交日期早于 30 天前，删除该分支
      if (lastCommitDate < nDaysAgo) {
        oldBranches.push({
          ...branchSummary.branches[branch],
          lastCommitDate,
        })
      }
    }
  }

  const branchOptions = oldBranches.map(branch => ({
    label: `${branch.name} ${branch.lastCommitDate}`,
    value: branch.name,
    hint: branch.commit,
  }))

  const selectedOptions = await consola.prompt('xxx', {
    type: 'multiselect',
    options: branchOptions,
  })

  console.log('selectedOptions', selectedOptions)

  // const oldBranches = branches.all.filter((branch) => {
  //   // 跳过当前分支
  //   if (branch === branches.current) {
  //     return false
  //   }

  //   // 获取分支的最后提交日期
  //   const log = git.log({ from: branch, to: branch })
  //   if (log.latest) {
  //     const lastCommitDate = new Date(log.latest.date)

  //     // 如果分支的最后提交日期早于 30 天前，删除该分支
  //     return lastCommitDate < nDaysAgo
  //   }
  // })

  // branches.all.forEach((branch) => {
  //   // 跳过当前分支
  //   if (branch === branches.current) {
  //     return
  //   }

  //   // 获取分支的最后提交日期
  //   git.log({ from: branch, to: branch }, (err, log) => {
  //     if (err) {
  //       console.error(`Error fetching log for branch ${branch}:`, err)
  //       return
  //     }

  //     if (log.latest) {
  //       const lastCommitDate = new Date(log.latest.date)

  //       // 如果分支的最后提交日期早于 30 天前，删除该分支
  //       if (lastCommitDate < nDaysAgo) {
  //         git.deleteLocalBranch(branch, true, (err) => {
  //           if (err) {
  //             consola.error(`Error deleting branch ${branch}:`, err)
  //           }
  //           else {
  //             consola.info(`Deleted branch ${branch}`)
  //           }
  //         })
  //       }
  //     }
  //   })
  // })
  console.log(res)
}
