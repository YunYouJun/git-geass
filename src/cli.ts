import process from 'node:process'
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'
import { version } from '../package.json'

const cli = yargs(hideBin(process.argv))
  .scriptName('gitg')
  .usage('$0 [args]')
  .version(version)
  .alias('h', 'help')
  .alias('v', 'version')
  .command('clean', 'clean old branches', (yargs) => {
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
            default: true,
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
  })
  .help()

export function main(): void {
  cli.parse()
}
