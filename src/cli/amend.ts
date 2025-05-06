import process from 'node:process'
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
  }, {
    onCancel: () => {
      consola.warn('User canceled.')
      process.exit(0)
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

/**
 * amend author
 * all commits in branch
 */
export async function amendAuthor() {
  const results = await prompts([
    {
      type: 'text',
      name: 'author',
      message: 'Enter the new author name',
    },
    {
      type: 'text',
      name: 'email',
      message: 'Enter the new author email',
    },
  ])
  const { author, email } = results

  if (!author) {
    consola.error('Author name is required')
    return
  }
  if (!email) {
    consola.error('Email is required')
    return
  }

  // git filter-branch --env-filter ''
  const bashScript = `
OLD_EMAIL="old@example.com"
NEW_NAME="${author}"
NEW_EMAIL="${email}"

if [ "$GIT_COMMITTER_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_COMMITTER_NAME="$NEW_NAME"
    export GIT_COMMITTER_EMAIL="$NEW_EMAIL"
fi
if [ "$GIT_AUTHOR_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_AUTHOR_NAME="$NEW_NAME"
    export GIT_AUTHOR_EMAIL="$NEW_EMAIL"
fi
    `
  // 仅处理 本地分支 和 本地标签
  git.raw(['filter-branch', '--env-filter', bashScript, '--tag-name-filter', 'cat', '--', '--branches', '--tags'])
}
