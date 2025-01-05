import path from 'node:path'
import fs from 'fs-extra'
import { beforeAll, describe, expect, it } from 'vitest'
import { git, updateRepos } from '../src'
import { config } from './config'

const gitgUpdateDir = path.resolve(config.tempDir, 'gitg-update')

describe('gitg update', () => {
  beforeAll(async () => {
    await fs.emptyDir(gitgUpdateDir)
    await fs.copy(config.gitRepoDir, gitgUpdateDir)

    return async () => {
      await fs.remove(gitgUpdateDir)
    }
  })

  it('gitg update -f', async () => {
    git.cwd(gitgUpdateDir)

    const untrackedJSON = path.resolve(gitgUpdateDir, 'untracked.json')
    await fs.writeJSON(untrackedJSON, {})

    expect(await fs.pathExists(untrackedJSON)).toBe(true)
    await updateRepos({
      force: true,
      yes: true,
    })
    expect(await fs.pathExists(untrackedJSON)).toBeFalsy()
  })

  it('gitg update -f -r', async () => {
    const childrenDir = path.resolve(gitgUpdateDir, 'children')
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
