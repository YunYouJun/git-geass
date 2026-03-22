# git-geass

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

一些快捷的 Git **交互式**操作。

> 名称灵感来自《反叛的鲁路修》（`code-geass`）。

[English](./README.md) | **中文**

## 安装

```bash
pnpm i -g git-geass
# npm i -g git-geass
# yarn add -g git-geass
```

## 使用

```bash
gitg -h
# 或
git-geass -h
```

### Clean Branch

交互式清理旧分支。

```bash
# 清理所有非当前分支
gitg clean branch

# 清理 10 天前的分支
gitg clean branch -d 10

# 清理已合并到 master 的分支
gitg clean branch -m master

# 清理已合并到 master 或 main 的分支
gitg clean branch -m master -m main

# 清理远程分支（向 origin 推送 `--delete`）
gitg clean branch -r
```

### Clean Repo

扫描目录中的无用 Git 仓库并清理。

判定标准：空仓库（无提交）、超过 180 天无提交、或无 remote。

```bash
# 扫描当前目录，交互式选择删除无用仓库
gitg clean repo

# 扫描指定目录
gitg clean repo /path/to/repos

# 自定义闲置阈值（例如 90 天）
gitg clean repo -d 90

# 仅预览，不执行删除
gitg clean repo --dry-run
```

### Update Repo

强制更新 Git 仓库：清理未跟踪文件、暂存更改、然后拉取。

```bash
# 更新当前仓库（clean + stash + pull）
gitg update

# 强制清理（而非 dry-run）后拉取
gitg update -f

# 递归更新当前目录下的所有 Git 仓库
gitg update -r

# 强制 + 递归
gitg update -f -r
```

### Amend Date

修改最后一次提交的作者日期和提交者日期。

```bash
gitg amend -d
# 交互式输入日期（如 2024-01-01 12:00:00）
```

### Amend Author

修改当前分支中所有提交的作者信息。

```bash
gitg amend -a
# 或
gitg amend --author
# 交互式输入作者名和邮箱
```

## 赞助

<p align="center">
  <a href="https://sponsors.yunyoujun.cn">
    <img src="https://cdn.jsdelivr.net/gh/YunYouJun/sponsors/public/sponsors.svg" alt="Sponsors"/>
  </a>
</p>

## 许可证

[MIT](./LICENSE) LICENSE @2024-PRESENT [@YunYouJun](https://github.com/YunYouJun)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/git-geass?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/git-geass
[npm-downloads-src]: https://img.shields.io/npm/dm/git-geass?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/git-geass
[bundle-src]: https://img.shields.io/bundlephobia/minzip/git-geass?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=git-geass
[license-src]: https://img.shields.io/github/license/YunYouJun/git-geass.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/YunYouJun/git-geass/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/git-geass
