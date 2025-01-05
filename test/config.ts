import path from 'node:path'

export const config = {
  gitRepoDir: path.resolve(__dirname, './fixtures/git-repo'),
  tempDir: path.resolve(__dirname, './fixtures/temp'),
}
