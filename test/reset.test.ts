// import consola from 'consola'
import { expect, it } from 'vitest'
import { git } from '../src/env'

it('reset email', async () => {
  // reset email
  // await git.addConfig('user.email', '')
  // reset username
  // await git.addConfig('user.name', '')
  const email = await git.getConfig('user.email')
  expect(email).toBeTruthy()
})
