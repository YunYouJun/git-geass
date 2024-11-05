import process from 'node:process'
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'

const cli = yargs(hideBin(process.argv))
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
      },
      (argv) => {
        import('./clean').then((module) => {
          module.cleanBranches({
            days: argv.days as number,
            merged: argv.merged as string[],
          })
        })
      },
    )
  })
  .help()

export function main(): void {
  cli.parse()
}
