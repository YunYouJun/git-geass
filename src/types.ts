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
