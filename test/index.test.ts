import consola from 'consola'
import { describe, expect, it } from 'vitest'
import { git } from '../src/env'

describe('should', () => {
  it('create local branches', async () => {
    // 批量创建本地分支
    const branches = ['branch1', 'branch2', 'branch3', 'branch4', 'branch5']
    const promiseArr = branches.map(branch => git.branch([branch]).catch ((err) => {
      // 已存在则忽略
      if (err && (err.message.includes('already exists') || err.message.includes('已经存在'))) {
        consola.info(`Branch ${branch} already exists`)
      }
    }))
    await Promise.all(promiseArr)

    // 检查分支是否存在 branches
    const branchSummary = await git.branch()
    branches.forEach((branch) => {
      expect(branchSummary.all).toContain(branch)
    })
  })
})
