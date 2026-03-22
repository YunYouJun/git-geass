import process from 'node:process'
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'
import { version } from '../../package.json'

export * from './clean'
export * from './origin'
export * from './update'

const cli = yargs(hideBin(process.argv))
  .scriptName('gitg')
  .usage('$0 [args]')
  .version(version)
  .alias('h', 'help')
  .alias('v', 'version')
  .command(
    'clean',
    'clean old branches, for example: gitg clean branch -r -m master',
    (yargs) => {
      return yargs
        .command(
          'branch',
          'Clean branches',
          (args) => {
            return args
              .options('days', {
                alias: 'd',
                type: 'number',
                description: 'Days ago',
              })
              .options('merged', {
                alias: 'm',
                type: 'array',
                description: 'Only show merged target branches',
              })
              .options('remote', {
                alias: 'r',
                type: 'boolean',
                description: 'Delete remote branches',
                default: false,
              })
          },
          (argv) => {
            import('./clean').then((module) => {
              module.cleanBranches({
                days: argv.days as number,
                merged: argv.merged as string[],
                remote: argv.remote as boolean,
              })
            })
          },
        )
        .command(
          'repo [scan-root]',
          '检测并清理无用的 Git 仓库',
          (args) => {
            return args
              .positional('scan-root', {
                type: 'string',
                description: '扫描根目录，默认为当前目录',
              })
              .options('days', {
                alias: 'd',
                type: 'number',
                description: '天数阈值（超过该天数未提交视为无用），默认 180',
                default: 180,
              })
              .options('dry-run', {
                type: 'boolean',
                description: '仅预览，不执行删除',
                default: false,
              })
          },
          (argv) => {
            import('./clean').then((module) => {
              module.cleanRepos({
                scanRoot: argv.scanRoot as string | undefined,
                days: argv.days as number,
                dryRun: argv.dryRun as boolean,
              })
            })
          },
        )
    },
  )
  .command(
    'update',
    '强制更新 git 仓库，例如：gitg update',
    args =>
      args
        .options('force', {
          alias: 'f',
          type: 'boolean',
          description: 'Force update',
          default: false,
        })
        .options('recursive', {
          alias: 'r',
          type: 'boolean',
          description: 'Recursive update, update all git repos in the current directory',
          default: false,
        }),
    argv => import('./update').then(module => module.default(argv)),
  )
  // origin protocol toggle
  .command(
    'origin [protocol]',
    'Toggle remote URL between HTTPS and SSH, e.g.: gitg origin ssh',
    args =>
      args
        .positional('protocol', {
          type: 'string',
          description: 'Target protocol: https or ssh',
          choices: ['https', 'ssh'] as const,
        })
        .options('remote', {
          alias: 'r',
          type: 'string',
          description: 'Remote name',
          default: 'origin',
        }),
    argv => import('./origin').then(module => module.toggleOrigin({
      protocol: argv.protocol as 'https' | 'ssh' | undefined,
      remote: argv.remote as string,
    })),
  )
  // amend
  .command(
    'amend',
    'Amend the last commit message',
    args =>
      args
        .options('message', {
          alias: 'm',
          type: 'string',
          description: 'The new commit message',
        })
        .options('date', {
          alias: 'd',
          type: 'string',
          description: 'The new commit date',
        })
        .options('author', {
          alias: 'a',
          type: 'string',
          description: 'The new commit author',
        }),
    (argv) => {
      import('./amend').then((module) => {
        if (typeof argv.date !== 'undefined') {
          module.amendDate()
        }
        else if (typeof argv.author !== 'undefined') {
          module.amendAuthor()
        }
      })
    },
  )
  .help()

export function main(): void {
  cli.parse()
}
