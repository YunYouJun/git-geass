import type { BranchSummary } from 'simple-git'
import type { BranchInfo } from '../types'
import consola from 'consola'
import { colors } from 'consola/utils'
import ora from 'ora'
import { git, GitGeass } from '../env'

export function getLocalBranchSummary(): Promise<BranchSummary> {
  return new Promise<BranchSummary>((resolve, reject) => {
    git.branchLocal((err, branches) => {
      if (err) {
        reject(err)
      }
      resolve(branches)
    })
  })
}

/**
 * 只有远程才有默认分支
 */
export async function getRemoteDefaultBranch(): Promise<string> {
  const remoteOriginInfo = await git.raw(['remote', 'show', 'origin'])
  const remoteDefaultBranch = remoteOriginInfo.match(/HEAD branch: (.*)/)?.[1] || GitGeass.defaultBranch
  GitGeass.defaultBranch = remoteDefaultBranch
  return remoteDefaultBranch
}

/**
 * 获取远程分支
 */
export async function getRemoteBranches(): Promise<BranchInfo[]> {
  const spinner = ora('Loading remote branches info...').start()
  // consola.start('Loading remote branches info...')

  // const bar = new cliProgress.SingleBar({
  //   format: `${lineStart} ${colors.cyan('{bar}')} {percentage}% | {value}/{total} Remote branches`,
  // }, cliProgress.Presets.shades_classic)

  const str = await git.listRemote(['--heads'])
  const branches = str
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split('\t')[1])
    // 远程分支
    .map(item => item.replace('refs/heads/', 'origin/'))
    // 过滤默认分支
    .filter(item => item !== `origin/${GitGeass.defaultBranch}`)

  let branchInfoArr: BranchInfo[] = []
  if (branches.length) {
    // bar.start(branches.length, 0)

    const strArr: string[] = []
    for (const branch of branches) {
      strArr.push(await git.show([branch]))
      // bar.increment()
    }

    // bar.stop()

    branchInfoArr = strArr.map((str, index) => {
      const commit = str.split(' ')[1].slice(0, 8)
      const latestCommitDate = new Date(str.split('\n')[2].split('Date: ')[1])
      return {
        commit,
        latestCommitDate,
        name: branches[index],
      }
    })

    spinner.succeed('Remote branches info loaded.')
    // consola.success('Remote branches info loaded.')
  }
  else {
    spinner.succeed('No remote branches.')
    // consola.success('No remote branches.')
  }

  const remoteBranchText = `Remote branch ${colors.green(GitGeass.defaultBranch)}${colors.gray('(default)')} is ignored.`
  consola.info(remoteBranchText)

  return branchInfoArr
}
