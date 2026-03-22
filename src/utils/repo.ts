import type { RepoHealth } from '../types'
import { exec, execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

// ============ 常量 ============

/** 从 git remote URL 提取 owner/repo 路径 */
const REMOTE_PATH_RE = /[/:]([^/:]+\/[^/]+?)(?:\.git)?$/

/** 匹配路径开头的斜杠 */
const LEADING_SLASH_RE = /^\//

/** 最大递归扫描深度，防止过度深入 */
const MAX_SCAN_DEPTH = 10

/** 仓库被判定为"无用"的默认天数阈值（180 天 ≈ 半年无提交） */
export const DEFAULT_STALE_DAYS = 180

// ============ Git 仓库发现 ============

/**
 * 检测目录是否是一个合法的 Git 仓库
 * 一个合法的 .git 目录应该至少包含 HEAD 文件；
 * .git 也可能是一个文件（submodule / worktree 的 gitdir 引用）
 */
export function isValidGitRepo(dir: string): boolean {
  const gitPath = join(dir, '.git')
  if (!existsSync(gitPath))
    return false

  try {
    // .git 是文件（submodule/worktree），检查内容是否包含 gitdir 引用
    const stat = statSync(gitPath)
    if (stat.isFile()) {
      const content = readFileSync(gitPath, 'utf-8').trim()
      return content.startsWith('gitdir:')
    }

    // .git 是目录，检查是否包含 HEAD 文件
    return existsSync(join(gitPath, 'HEAD'))
  }
  catch {
    return false
  }
}

/**
 * 递归扫描目录，发现所有 Git 仓库
 * 遇到合法 .git 即停止深入（不扫描 submodule），最多递归 {@link MAX_SCAN_DEPTH} 层
 * 如果 .git 存在但损坏（缺少 HEAD 等），会跳过该目录并继续递归子目录
 */
export function discoverRepos(scanRoot: string): string[] {
  const repos: string[] = []

  if (!existsSync(scanRoot)) {
    return repos
  }

  function walk(dir: string, depth: number, isRoot: boolean): void {
    if (depth > MAX_SCAN_DEPTH)
      return

    if (!isRoot && isValidGitRepo(dir)) {
      repos.push(dir)
      // 找到合法 .git 后不再递归子目录（避免 submodule 干扰）
      return
    }

    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory())
          continue
        // 跳过常见的非项目目录
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist')
          continue
        walk(join(dir, entry.name), depth + 1, false)
      }
    }
    catch {
      // 无权限访问的目录，跳过
    }
  }

  walk(scanRoot, 0, true)
  return repos
}

// ============ 仓库健康检测 ============

/**
 * 安全执行异步命令，失败时返回空字符串
 */
async function execSafe(cmd: string, cwd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { cwd, encoding: 'utf-8' })
    return stdout.trim()
  }
  catch {
    return ''
  }
}

/**
 * 从 git remote URL 或相对路径推断仓库名称
 */
export function inferRepoName(repoDir: string, scanRoot: string): string {
  // 尝试从 git remote 提取仓库名
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    // 匹配各种 git remote 格式：
    // https://github.com/user/repo.git → user/repo
    // git@github.com:user/repo.git → user/repo
    // https://git.woa.com/user/repo.git → user/repo
    const match = remote.match(REMOTE_PATH_RE)
    if (match)
      return match[1]
  }
  catch {
    // fallback
  }

  // fallback: 用相对于 scanRoot 的路径
  const rel = repoDir.replace(scanRoot, '').replace(LEADING_SLASH_RE, '')
  return rel || basename(repoDir)
}

/**
 * 分析单个仓库的健康状态（异步版本）
 * 并发执行 3 个 git 查询，充分利用 I/O 并行
 */
export async function analyzeRepoHealth(
  repoDir: string,
  scanRoot: string,
  staleDays: number = DEFAULT_STALE_DAYS,
): Promise<RepoHealth> {
  const name = inferRepoName(repoDir, scanRoot)
  const reasons: string[] = []

  // 并发获取所有信息
  const [remoteOutput, commitCount, lastDateStr] = await Promise.all([
    execSafe('git remote get-url origin 2>/dev/null || git remote 2>/dev/null', repoDir),
    execSafe('git rev-list --all --count 2>/dev/null', repoDir),
    execSafe('git log -1 --all --format=%aI 2>/dev/null', repoDir),
  ])

  const hasRemote = remoteOutput.length > 0
  const totalCommits = Number.parseInt(commitCount, 10) || 0

  let lastCommitDate: string | null = null
  let daysSinceLastCommit: number | null = null
  if (lastDateStr) {
    lastCommitDate = lastDateStr.split('T')[0]
    const lastDate = new Date(lastDateStr)
    daysSinceLastCommit = Math.floor((Date.now() - lastDate.getTime()) / 86400000)
  }

  // 判定原因
  if (totalCommits === 0) {
    reasons.push('空仓库（无任何提交）')
  }
  else if (daysSinceLastCommit !== null && daysSinceLastCommit > staleDays) {
    reasons.push(`超过 ${daysSinceLastCommit} 天无提交`)
  }

  if (!hasRemote) {
    reasons.push('无 remote（可能是临时仓库）')
  }

  return {
    path: repoDir,
    name,
    lastCommitDate,
    daysSinceLastCommit,
    hasRemote,
    totalCommits,
    reasons,
  }
}

/**
 * 扫描并找出所有"无用"的 Git 仓库（异步版本）
 * 判定标准：空仓库、超过指定天数无提交、或无 remote
 *
 * @param scanRoot 扫描根目录
 * @param staleDays 天数阈值，默认 180 天
 * @param onProgress 进度回调，每完成一个仓库分析时调用 (已完成数, 总数)
 */
export async function findStaleRepos(
  scanRoot: string,
  staleDays: number = DEFAULT_STALE_DAYS,
  onProgress?: (done: number, total: number) => void,
): Promise<RepoHealth[]> {
  const repos = discoverRepos(scanRoot)
  const total = repos.length

  // 并发分析，附带进度回调
  let done = 0
  const results = await Promise.all(
    repos.map(async (repoDir) => {
      const result = await analyzeRepoHealth(repoDir, scanRoot, staleDays)
      done++
      onProgress?.(done, total)
      return result
    }),
  )

  const stale: RepoHealth[] = []
  for (const health of results) {
    if (health.reasons.length > 0) {
      stale.push(health)
    }
  }

  // 按严重程度排序：空仓库 > 无提交天数最多 > 无 remote
  stale.sort((a, b) => {
    if (a.totalCommits === 0 && b.totalCommits !== 0)
      return -1
    if (a.totalCommits !== 0 && b.totalCommits === 0)
      return 1
    const aDays = a.daysSinceLastCommit ?? Infinity
    const bDays = b.daysSinceLastCommit ?? Infinity
    if (aDays === bDays)
      return 0
    return bDays - aDays
  })

  return stale
}
