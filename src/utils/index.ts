import type { BranchSummary } from 'simple-git'
import { git } from '../env'

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
