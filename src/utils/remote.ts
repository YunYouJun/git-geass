// HTTPS: https://github.com/owner/repo.git (optionally with userinfo@)
const HTTPS_URL_RE = /^https?:\/\/(?:[^/@]+@)?([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/
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

/**
 * Build a browser-accessible HTTPS URL from a git remote URL
 * Supports GitHub, GitLab, Bitbucket, etc.
 *
 * @example
 * buildBrowserUrl('git@github.com:user/repo.git') // => 'https://github.com/user/repo'
 * buildBrowserUrl('https://github.com/user/repo.git') // => 'https://github.com/user/repo'
 */
export function buildBrowserUrl(remoteUrl: string): string | null {
  const parsed = parseRemoteUrl(remoteUrl)
  if (parsed.type === 'unknown') {
    return null
  }
  return `https://${parsed.host}/${parsed.owner}/${parsed.repo}`
}
