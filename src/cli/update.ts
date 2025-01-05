import process from 'node:process'
import consola from 'consola'
import ora from 'ora'
import prompts from 'prompts'
import { CleanOptions } from 'simple-git'
import { git } from '../env'

export interface GitgUpdateOptions {
  /**
   * Force update
   */
  force?: boolean
  /**
   * Recursive update, update all git repos in the current directory
   */
  recursive?: boolean
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

/**
 * Update all git repositories in the current directory.
 */
export async function updateRepos(options: GitgUpdateOptions) {
  // if
  consola.info('Updating all git repositories in the current directory', options)

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

  const spinner = ora('Cleaning files').start()
  await git.clean(options.force ? CleanOptions.FORCE : CleanOptions.DRY_RUN)
  spinner.succeed('Cleaned files.')
}
