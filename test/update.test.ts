import path from 'node:path'
import fs from 'fs-extra'
import simpleGit from 'simple-git'
import { beforeAll, describe, expect, it } from 'vitest'
import { updateRepos } from '../src'
import { config } from './config'

const gitgUpdateDir = path.resolve(config.tempDir, 'gitg-update')

describe('gitg update', () => {
  beforeAll(async () => {
    const git = simpleGit(config.gitRepoDir)
    await git.init()

    await fs.emptyDir(gitgUpdateDir)
  })

  it('gitg update -f', async () => {
    const gitgUpdateFDir = path.resolve(gitgUpdateDir, 'f')
    await fs.emptyDir(gitgUpdateFDir)
    await fs.copy(config.gitRepoDir, gitgUpdateFDir)

    const untrackedJSON = path.resolve(gitgUpdateFDir, 'untracked.json')
    await fs.writeJSON(untrackedJSON, {})

    expect(await fs.pathExists(untrackedJSON)).toBe(true)
    await updateRepos({
      cwd: gitgUpdateFDir,
      force: true,
      yes: true,
    })
    expect(await fs.pathExists(untrackedJSON)).toBeFalsy()
  })

  it('gitg update -f -r', async () => {
    const childrenDir = path.resolve(gitgUpdateDir, 'r')
    await fs.emptyDir(childrenDir)

    // create 3 children git repos
    await fs.copy(config.gitRepoDir, path.resolve(childrenDir, 'git-repo'))

    const templateRepoDir = path.resolve(childrenDir, 'git-repo')
    const untrackedJSON = path.resolve(templateRepoDir, 'untracked.json')
    await fs.writeJSON(untrackedJSON, {})

    const repos = [
      'git-repo-1',
      'git-repo-2',
      'git-repo-3',
    ]

    for (const repo of repos) {
      await fs.copy(templateRepoDir, path.resolve(childrenDir, repo))
    }

    await updateRepos({
      cwd: childrenDir,
      force: true,
      recursive: true,
      yes: true,
    })

    for (const repo of repos) {
      expect(await fs.pathExists(path.resolve(childrenDir, repo, 'untracked.json'))).toBe(false)
    }
  })
})
