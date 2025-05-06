# git-actions

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Some quick **interactive** actions for git.

> Its name inspired by `code-geass`.

## Install

```bash
pnpm i -g git-geass
# npm i -g git-actions
# yarn add -g git-actions
```

## Usage

```bash
# git-geass help
gitg -h
git-geass -h
```

### Clean Branch

> 清理分支

```bash
# clean branch
gitg clean branch
# clean 10 days ago branch
gitg clean branch -d 10
# clean merged to master branch
gitg clean branch -m master
# clean merged to master/main branch
gitg clean branch -m master -m main
# clean remote branches
gitg clean branch -r
```

### Modify Commit Date (Author Date & Committer Date)

> 修改历史提交日期

> Difference with `git commit --amend --no-edit --date=now`
> - modify author date & committer date (--date only modify author date)
> - modify with prompt to choose date

```bash
gitg amend -d
```

### Modify Commit Author

> 修改历史提交作者

```bash
gitg amend -a
gitg amend --author

# input author name
# input author email
```

## [Sponsors](https://sponsors.yunyoujun.cn)

<p align="center">
  <a href="https://sponsors.yunyoujun.cn">
    <img src='https://cdn.jsdelivr.net/gh/YunYouJun/sponsors/public/sponsors.svg'/>
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
