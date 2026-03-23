import { cancel, isCancel, select } from '@clack/prompts'
import consola from 'consola'
import { colors } from 'consola/utils'
import { git } from '../env'
import { convertRemoteUrl, parseRemoteUrl } from '../utils/remote'

export interface OriginOptions {
  protocol?: 'https' | 'ssh'
  remote?: string
}

/**
 * Toggle or set the remote URL protocol between HTTPS and SSH
 */
export async function toggleOrigin(options: OriginOptions = {}): Promise<void> {
  const remoteName = options.remote || 'origin'

  let remotes
  try {
    remotes = await git.getRemotes(true)
  }
  catch (err) {
    consola.error('Failed to get remotes. Make sure you are inside a Git repository.')
    consola.error(String(err))
    return
  }

  const remote = remotes.find(r => r.name === remoteName)

  if (!remote) {
    consola.error(`Remote ${colors.red(remoteName)} not found.`)
    return
  }

  const currentUrl = remote.refs.fetch || remote.refs.push
  if (!currentUrl) {
    consola.error(`Remote ${colors.red(remoteName)} has no URL configured.`)
    return
  }

  const parsed = parseRemoteUrl(currentUrl)
  if (parsed.type === 'unknown') {
    consola.error(`Cannot parse remote URL: ${colors.yellow(currentUrl)}`)
    consola.info('Only HTTPS and SSH URLs are supported.')
    return
  }

  consola.info(`Current ${colors.cyan(remoteName)} URL: ${colors.green(currentUrl)} ${colors.gray(`(${parsed.type})`)}`)

  let targetProtocol: 'https' | 'ssh'

  if (options.protocol) {
    targetProtocol = options.protocol
  }
  else {
    // Interactive: ask user to select target protocol
    const selected = await select({
      message: 'Select target protocol:',
      options: [
        { value: 'ssh', label: 'SSH', hint: `git@${parsed.host}:...` },
        { value: 'https', label: 'HTTPS', hint: `https://${parsed.host}/...` },
      ],
      initialValue: parsed.type === 'https' ? 'ssh' : 'https',
    })

    if (isCancel(selected)) {
      cancel('Operation cancelled.')
      return
    }

    targetProtocol = selected as 'https' | 'ssh'
  }

  if (parsed.type === targetProtocol) {
    consola.info(`Remote ${colors.cyan(remoteName)} is already using ${colors.green(targetProtocol.toUpperCase())}.`)
    return
  }

  const newUrl = convertRemoteUrl(currentUrl, targetProtocol)

  try {
    // Update fetch URL
    await git.remote(['set-url', remoteName, newUrl])

    // Also update push URL if it differs from fetch URL
    const pushUrl = remote.refs.push
    if (pushUrl && pushUrl !== currentUrl) {
      const newPushUrl = convertRemoteUrl(pushUrl, targetProtocol)
      await git.remote(['set-url', '--push', remoteName, newPushUrl])
      consola.success(`${colors.cyan(remoteName)} (fetch): ${colors.gray(currentUrl)} → ${colors.green(newUrl)}`)
      consola.success(`${colors.cyan(remoteName)} (push):  ${colors.gray(pushUrl)} → ${colors.green(newPushUrl)}`)
    }
    else {
      consola.success(`${colors.cyan(remoteName)}: ${colors.gray(currentUrl)} → ${colors.green(newUrl)}`)
    }
  }
  catch (err) {
    consola.error('Failed to update remote URL.')
    consola.error(String(err))
  }
}
