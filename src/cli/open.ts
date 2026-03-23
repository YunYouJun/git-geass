import type { RepoInfo } from '../types'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { cancel, isCancel, select, spinner } from '@clack/prompts'
import consola from 'consola'
import { colors } from 'consola/utils'
import { formatDistanceToNow } from 'date-fns'
import { buildBrowserUrl } from '../utils/remote'
import { collectRepoInfos, discoverRepos } from '../utils/repo'

export interface OpenOptions {
  scanRoot?: string
  editor?: string
  browser?: boolean
  shell?: boolean
  info?: boolean
}

interface CommandSpec {
  command: string
  args: string[]
}

const WHITESPACE_RE = /\s/
const SINGLE_QUOTE_RE = /'/g

/**
 * 获取系统打开命令（macOS: open, Linux: xdg-open）
 */
function getSystemOpenCommand(): string {
  return process.platform === 'darwin' ? 'open' : 'xdg-open'
}

/**
 * 获取默认编辑器：命令行参数 > $EDITOR > code
 */
function resolveEditor(editor?: string): string {
  return editor || process.env.EDITOR || 'code'
}

/**
 * 将命令字符串拆分为可执行文件与参数，避免通过 shell 执行
 */
function parseCommandSpec(commandText: string): CommandSpec {
  const input = commandText.trim()
  const tokens: string[] = []
  let current = ''
  let quote: 'single' | 'double' | null = null
  let escaping = false

  for (const char of input) {
    if (escaping) {
      current += char
      escaping = false
      continue
    }

    if (char === '\\' && quote !== 'single') {
      escaping = true
      continue
    }

    if (char === '\'' && quote !== 'double') {
      quote = quote === 'single' ? null : 'single'
      continue
    }

    if (char === '"' && quote !== 'single') {
      quote = quote === 'double' ? null : 'double'
      continue
    }

    if (WHITESPACE_RE.test(char) && quote === null) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (escaping)
    current += '\\'

  if (quote)
    throw new Error('Invalid command: unmatched quote.')

  if (current)
    tokens.push(current)

  const [command, ...args] = tokens
  if (!command)
    throw new Error('Invalid command: empty input.')

  return { command, args }
}

/**
 * 以非 shell 方式启动外部命令，并在启动失败时给出明确提示
 */
async function launchCommand(spec: CommandSpec): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      detached: true,
      stdio: 'ignore',
    })

    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

/**
 * 为 shell 输出生成安全的单引号字符串
 */
function quoteForShell(value: string): string {
  return `'${value.replace(SINGLE_QUOTE_RE, `'\\''`)}'`
}

/**
 * 格式化仓库信息为展示行
 */
function formatRepoLabel(repo: RepoInfo): string {
  const parts: string[] = []

  // 分支
  if (repo.branch) {
    parts.push(colors.cyan(repo.branch))
  }

  // dirty 状态
  if (repo.isDirty) {
    parts.push(colors.yellow('✎ dirty'))
  }

  // 最后提交时间
  if (repo.lastCommitDate) {
    const distance = formatDistanceToNow(new Date(repo.lastCommitDate), { addSuffix: true })
    parts.push(colors.gray(distance))
  }

  const meta = parts.length > 0 ? ` ${colors.gray('·')} ${parts.join(colors.gray(' · '))}` : ''
  return `${colors.green(repo.name)}${meta}`
}

/**
 * --info 模式：打印所有仓库的详细信息
 */
function printRepoInfos(repos: RepoInfo[]): void {
  consola.log('')
  for (const repo of repos) {
    consola.log(`  ${colors.green(colors.bold(repo.name))}`)
    consola.log(`    ${colors.gray('Path:')}    ${repo.path}`)
    consola.log(`    ${colors.gray('Branch:')}  ${repo.branch ?? colors.yellow('(detached)')}`)
    consola.log(`    ${colors.gray('Remote:')}  ${repo.remoteUrl ?? colors.yellow('(none)')}`)

    const status = repo.isDirty ? colors.yellow('dirty') : colors.green('clean')
    consola.log(`    ${colors.gray('Status:')}  ${status}`)

    if (repo.lastCommitDate) {
      const distance = formatDistanceToNow(new Date(repo.lastCommitDate), { addSuffix: true })
      consola.log(`    ${colors.gray('Last:')}    ${repo.lastCommitDate.split('T')[0]} ${colors.gray(`(${distance})`)}`)
    }
    else {
      consola.log(`    ${colors.gray('Last:')}    ${colors.yellow('(no commits)')}`)
    }
    consola.log('')
  }
}

/**
 * gitg open 命令主入口
 */
export async function openRepo(options: OpenOptions = {}): Promise<void> {
  const scanRoot = options.scanRoot || process.cwd()

  // 1. 扫描仓库
  const s = spinner()
  s.start(`Scanning git repos in ${colors.cyan(scanRoot)}...`)

  const repoPaths = discoverRepos(scanRoot)

  if (repoPaths.length === 0) {
    s.stop(colors.yellow('No git repositories found.'))
    return
  }

  // 2. 并发采集仓库信息
  s.message(`Collecting info for ${repoPaths.length} repos...`)
  const repos = await collectRepoInfos(repoPaths, scanRoot)
  s.stop(`Found ${colors.green(String(repos.length))} repositories.`)

  // 3. --info 模式：直接打印信息后退出
  if (options.info) {
    printRepoInfos(repos)
    return
  }

  // 4. 交互式选择仓库
  const selected = await select({
    message: 'Select a repository:',
    options: repos.map(repo => ({
      value: repo,
      label: formatRepoLabel(repo),
      hint: colors.gray(repo.path),
    })),
  })

  if (isCancel(selected)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  const repo = selected as RepoInfo

  // 5. 根据模式执行操作
  if (options.browser) {
    // --browser: 在浏览器打开远程仓库
    if (!repo.remoteUrl) {
      consola.warn(`Repository ${colors.green(repo.name)} has no remote URL.`)
      return
    }

    const url = buildBrowserUrl(repo.remoteUrl)
    if (!url) {
      consola.warn(`Cannot parse remote URL: ${colors.yellow(repo.remoteUrl)}`)
      return
    }

    const openCmd = getSystemOpenCommand()
    consola.info(`Opening ${colors.cyan(url)} in browser...`)

    try {
      await launchCommand({ command: openCmd, args: [url] })
    }
    catch (error) {
      consola.error(`Failed to open browser: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  else if (options.shell) {
    // --shell: 输出 cd 命令（直接用 console.log，避免 consola 前缀干扰 eval）
    console.log(`cd ${quoteForShell(repo.path)}`)
  }
  else {
    // 默认: 用编辑器打开
    const editor = resolveEditor(options.editor)
    consola.info(`Opening ${colors.green(repo.name)} with ${colors.cyan(editor)}...`)

    try {
      const spec = parseCommandSpec(editor)
      await launchCommand({
        command: spec.command,
        args: [...spec.args, repo.path],
      })
    }
    catch (error) {
      consola.error(`Failed to open editor: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
