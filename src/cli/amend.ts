import consola from 'consola'
import { colors } from 'consola/utils'
import prompts from 'prompts'
import { git } from '../env'

/**
 * modify commit date
 *
 * show all: `git log --format=fuller`
 *
 * @see https://stackoverflow.com/questions/11856983/why-is-git-authordate-different-from-commitdate
 */
export async function amendDate() {
  // prompts
  const results = await prompts({
    type: 'date',
    name: 'date',
    message: 'Enter the new commit date',
    initial: new Date(),
    format: (date: Date) => {
      const dateString = date.toLocaleString()
      consola.info(`Formatted date: ${dateString}`)
      consola.info(`Run ${colors.cyan('git log --format=fuller')} to see the commit date`)
      return dateString
    },
  })
  const date = results.date

  /**
   * --date only affects the author date
   * git.env with simple-git-hooks has some issues
   */
  // git
  //   .env({
  //     GIT_AUTHOR_DATE: date.toString(),
  //     GIT_COMMITTER_DATE: date.toString(),
  //   })

  console.log('')
  consola.info(`${colors.dim(`git commit --amend --no-edit --date ${date.toString()}`)}`)
  await git.raw(['commit', '--amend', '--no-edit', '--date', date.toString()])
  /**
   * @see https://git-scm.com/docs/git-rebase
   * --committer-date-is-author-date
   */
  consola.info(`${colors.dim('git rebase --committer-date-is-author-date')}`)
  await git.raw(['rebase', '--committer-date-is-author-date'])
}
