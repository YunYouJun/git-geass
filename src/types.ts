export interface BranchInfo {
  name: string
  commit: string
  latestCommitDate: Date
}

/** 仓库健康状态 */
export interface RepoHealth {
  /** 仓库路径 */
  path: string
  /** 相对于 scanRoot 的项目名 */
  name: string
  /** 最后一次提交的日期（ISO 格式），null 表示无提交 */
  lastCommitDate: string | null
  /** 距今天数，null 表示无提交 */
  daysSinceLastCommit: number | null
  /** 是否有 remote */
  hasRemote: boolean
  /** 提交总数 */
  totalCommits: number
  /** 判定为无用的原因列表 */
  reasons: string[]
}

/** 仓库导航信息（面向 open 命令场景） */
export interface RepoInfo {
  /** 仓库绝对路径 */
  path: string
  /** 仓库显示名（owner/repo 或相对路径） */
  name: string
  /** 当前分支名 */
  branch: string | null
  /** remote origin URL（原始格式） */
  remoteUrl: string | null
  /** 工作区是否有未提交更改 */
  isDirty: boolean
  /** 最后提交日期（ISO 格式） */
  lastCommitDate: string | null
  /** 距今天数 */
  daysSinceLastCommit: number | null
}
