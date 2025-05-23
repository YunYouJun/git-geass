import type { SimpleGit } from 'simple-git'
import path from 'node:path'
import process from 'node:process'
import consola from 'consola'
import { colors } from 'consola/utils'
import fs from 'fs-extra'

import ora from 'ora'
import prompts from 'prompts'
import simpleGit, { CleanOptions } from 'simple-git'
import { git } from '../env'

export interface GitgUpdateOptions {
  /**
   * cur work dir
   * @default process.cwd()
   */
  cwd?: string
  /**
   * Force update
   */
  force?: boolean
  /**
   * Recursive update, update all git repos in the current directory
   */
  recursive?: boolean
  /**
   * Yes
   */
  yes?: boolean
}

/**
 * @example
 * ```bash
 * gitg update -f -r
 * ```
 */
export default function (options: GitgUpdateOptions) {
  return updateRepos(options)
}

async function cleanRepo(params: {
  name: string
  git: SimpleGit
  cleanMode: string
}) {
  // const spinner = ora(`Cleaning repo: ${colors.cyan(params.name)}`).start()
  await params.git.clean(params.cleanMode)
  // spinner.succeed(`Cleaned repo: ${colors.cyan(params.name)}`)
  consola.success(`${colors.cyan(params.name)}: git clean`)
}

/**
 * stash one git repo
 */
async function stashRepo(params: {
  name: string
  git: SimpleGit
}) {
  try {
    await params.git.stash()
    consola.success(`${colors.cyan(params.name)}: git stash`)
  }
  catch (e: any) {
    consola.error(e?.message)
  }
}

/**
 * update one git repo
 */
async function updateRepo(params: {
  name: string
  git: SimpleGit
}) {
  const spinner = ora(`${colors.cyan(params.name)}: git pull`).start()
  try {
    await params.git.pull()
    spinner.succeed(`${colors.cyan(params.name)}: git pull`)
  }
  catch (e: any) {
    if (e.message.includes('git pull <remote> <branch>')) {
      spinner.fail(`${colors.cyan(params.name)} no remote to pull.`)
    }
    else {
      console.error(e.message)
    }
  }
}

/**
 * Update all git repositories in the current directory.
 */
export async function updateRepos(options: GitgUpdateOptions) {
  const baseDir = options.cwd || process.cwd()
  git.cwd(baseDir)

  if (!options.yes) {
    // confirm force clean
    const results = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure to update all git repositories in the current directory?',
      initial: false,
    }, {
      onCancel: () => {
        consola.warn('User canceled.')
        process.exit(0)
      },
    })
    if (!results.confirm)
      return
  }

  let cleanMode: string = options.force ? CleanOptions.FORCE : CleanOptions.DRY_RUN
  if (options.recursive) {
    cleanMode += CleanOptions.RECURSIVE

    // get children repos
    const dirs = await fs.readdir(baseDir, { withFileTypes: true })
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const repoPath = path.resolve(dir.parentPath, dir.name)
        const repoGit = simpleGit(repoPath)
        if (await repoGit.checkIsRepo()) {
          await cleanRepo({
            name: dir.name,
            git: repoGit,
            cleanMode,
          })
          await stashRepo({
            name: dir.name,
            git: repoGit,
          })
          await updateRepo({
            name: dir.name,
            git: repoGit,
          })
        }
      }
    }
  }
  else {
    await cleanRepo({
      name: path.dirname(baseDir),
      git,
      cleanMode,
    })
    await stashRepo({
      name: path.dirname(baseDir),
      git,
    })
    await updateRepo({
      name: path.dirname(baseDir),
      git,
    })
  }
}
