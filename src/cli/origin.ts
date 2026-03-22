import { cancel, isCancel, select } from '@clack/prompts'
import consola from 'consola'
import { colors } from 'consola/utils'
import { git } from '../env'

// HTTPS: https://github.com/owner/repo.git
const HTTPS_URL_RE = /^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/
// SSH: git@github.com:owner/repo.git
const SSH_URL_RE = /^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/

/**
 * Parse remote URL and determine its protocol type
 */
export function parseRemoteUrl(url: string): { type: 'https' | 'ssh' | 'unknown', host: string, owner: string, repo: string } {
  const httpsMatch = url.match(HTTPS_URL_RE)
  if (httpsMatch) {
    return { type: 'https', host: httpsMatch[1], owner: httpsMatch[2], repo: httpsMatch[3] }
  }

  const sshMatch = url.match(SSH_URL_RE)
  if (sshMatch) {
    return { type: 'ssh', host: sshMatch[1], owner: sshMatch[2], repo: sshMatch[3] }
  }

  return { type: 'unknown', host: '', owner: '', repo: '' }
}

/**
 * Convert a remote URL to the target protocol
 */
export function convertRemoteUrl(url: string, target: 'https' | 'ssh'): string {
  const parsed = parseRemoteUrl(url)
  if (parsed.type === 'unknown') {
    return url
  }

  if (target === 'ssh') {
    return `git@${parsed.host}:${parsed.owner}/${parsed.repo}.git`
  }
  else {
    return `https://${parsed.host}/${parsed.owner}/${parsed.repo}.git`
  }
}

export interface OriginOptions {
  protocol?: 'https' | 'ssh'
  remote?: string
}

/**
 * Toggle or set the remote URL protocol between HTTPS and SSH
 */
export async function toggleOrigin(options: OriginOptions = {}): Promise<void> {
  const remoteName = options.remote || 'origin'

  // Get current remote URL
  const remotes = await git.getRemotes(true)
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
  await git.remote(['set-url', remoteName, newUrl])
  consola.success(`${colors.cyan(remoteName)}: ${colors.gray(currentUrl)} → ${colors.green(newUrl)}`)
}
