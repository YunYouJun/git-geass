import path from 'node:path'
import fs from 'fs-extra'
import simpleGit from 'simple-git'
import { beforeEach, describe, expect, it } from 'vitest'
import { discoverRepos } from '../src/utils/repo'
import { config } from './config'

const gitRootDir = path.resolve(config.tempDir, 'repo-discovery-root')

describe('discoverRepos', () => {
  beforeEach(async () => {
    await fs.emptyDir(gitRootDir)
    await simpleGit(gitRootDir).init()
  })

  it('skips scan root by default', () => {
    expect(discoverRepos(gitRootDir)).toEqual([])
  })

  it('can include scan root itself', () => {
    expect(discoverRepos(gitRootDir, { includeRoot: true })).toEqual([gitRootDir])
  })
})
