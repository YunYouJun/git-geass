import process from 'node:process'
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'
import { version } from '../../package.json'

export * from './clean'
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
      return yargs.command(
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
  .help()

export function main(): void {
  cli.parse()
}
