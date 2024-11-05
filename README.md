# git-actions

Some quick actions for git.

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

# clean branch
gitg clean branch
# clean 10 days ago branch
gitg clean branch -d 10
# clean merged to master branch
gitg clean branch -m master
# clean merged to master/main branch
gitg clean branch -m master -m main
```
