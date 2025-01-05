import path from 'node:path'
import fs from 'fs-extra'
import simpleGit from 'simple-git'
import { beforeAll, describe, expect, it } from 'vitest'
import { updateRepos } from '../src'
import { config } from './config'

const gitgUpdateDir = path.resolve(config.tempDir, 'gitg-update')

describe('gitg update -f -r', () => {
  beforeAll(async () => {
    await fs.emptyDir(gitgUpdateDir)
    await fs.copy(config.gitRepoDir, gitgUpdateDir)

    // return async () => {
    //   await fs.remove(gitgUpdateDir)
    // }
  })

  it('gitg update', async () => {
    const git = simpleGit(gitgUpdateDir)

    updateRepos({
      force: true,
    })

    expect(git).toBeDefined()
  })
})
