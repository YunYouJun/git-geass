# git-geass

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Some quick **interactive** actions for git.

> Its name inspired by `code-geass`.

**English** | [中文](./README.zh-CN.md)

## Install

```bash
pnpm i -g git-geass
# npm i -g git-geass
# yarn add -g git-geass
```

## Usage

```bash
gitg -h
# or
git-geass -h
```

### Clean Branch

Clean old branches interactively.

```bash
# clean all non-current branches
gitg clean branch

# clean branches older than 10 days
gitg clean branch -d 10

# clean branches merged to master
gitg clean branch -m master

# clean branches merged to master or main
gitg clean branch -m master -m main

# clean remote branches (push `--delete` to origin)
gitg clean branch -r
```

### Clean Repo

Scan directories for stale Git repos and clean them up.

Criteria: empty repos (no commits), repos with no activity for > 180 days, or repos without a remote.

```bash
# scan current directory and interactively delete stale repos
gitg clean repo

# scan a specific directory
gitg clean repo /path/to/repos

# custom stale threshold (e.g. 90 days)
gitg clean repo -d 90

# preview only, without deleting
gitg clean repo --dry-run
```

### Update Repo

Force-update git repo(s): clean untracked files, stash changes, then pull.

```bash
# update current repo (clean + stash + pull)
gitg update

# force clean (instead of dry-run) before pull
gitg update -f

# recursively update all git repos in the current directory
gitg update -r

# force + recursive
gitg update -f -r
```

### Open Repo

Open a Git repository's remote URL in your browser. `gitg open` defaults to `gitg open .`.
HTTPS, `git@host:owner/repo.git`, and `ssh://user@host/owner/repo.git` remotes are supported.

```bash
# open current repo remote URL
gitg open

# same as above
gitg open .

# scan a specific directory and choose a repo
gitg open /path/to/repos

# show repository details without opening
gitg open --info

# explicit browser mode (same as default)
gitg open --browser

# open the repo path with a specific editor
gitg open --editor code
```

### Amend Date

Modify the last commit's author date and committer date.

```bash
gitg amend -d
# enter a date interactively (e.g. 2024-01-01 12:00:00)
```

### Amend Author

Modify the commit author for all commits in the current branch.

```bash
gitg amend -a
# or
gitg amend --author
# enter author name and email interactively
```

## Sponsors

<p align="center">
  <a href="https://sponsors.yunyoujun.cn">
    <img src="https://cdn.jsdelivr.net/gh/YunYouJun/sponsors/public/sponsors.svg" alt="Sponsors"/>
  </a>
</p>

## License

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
