import process from 'node:process'
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'

const cli = yargs(hideBin(process.argv))
  .command('clean', 'clean old branches', (yargs) => {
    return yargs.command(
      'branch',
      'Clean branches',
      () => {},
      (_argv) => {
        import('./clean').then((module) => {
          module.cleanBranches({ old: true, days: 0 })
        })
      },
    )
  })
  .help()

export function main(): void {
  cli.parse()
}
