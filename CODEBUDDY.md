# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Commands

| Task | Command |
|---|---|
| Build | `pnpm build` — uses unbuild, outputs `dist/index.mjs` + `dist/index.d.ts` |
| Dev (stub mode) | `pnpm dev` — unbuild stub for quick iteration without full rebuild |
| Run directly | `pnpm start` — runs `tsx src/run.ts` to invoke CLI without building |
| Lint | `pnpm lint` — eslint with @antfu/eslint-config (lib mode) |
| Typecheck | `pnpm typecheck` — `tsc --noEmit` |
| Test all | `pnpm test` — vitest (watch mode by default) |
| Test single file | `pnpm vitest run test/clean.test.ts` — run a specific test file once |
| Test single case | `pnpm vitest run -t "test name"` — run a test matching a name pattern |
| Release | `pnpm release` — bumpp version bump + npm publish |

## Architecture

**git-geass** is an interactive Git CLI tool (npm: `git-geass`, commands: `gitg` / `git-geass`). It provides commands for branch cleanup, commit date/author amendment, and repository force-update.

### Entry Flow

```
bin/index.mjs  →  dist/index.mjs  →  src/index.ts  →  src/cli/index.ts  →  main()
```

`bin/index.mjs` is the installed CLI entry point; it imports `main` from the built output. During development, `pnpm start` uses `tsx src/run.ts` which calls `main()` directly, bypassing the build step.

### Module Layout

**`src/cli/index.ts`** — CLI root. Defines the yargs command tree with three top-level commands: `clean`, `update`, `amend`. Each command handler uses **dynamic `import()`** to lazily load its implementation module only when invoked, keeping startup fast.

**`src/cli/clean.ts`** — `gitg clean branch` implementation. Supports local and remote (`-r`) branch deletion. Filters branches by age (`-d <days>`) or merge status (`-m <target>`). Uses `prompts` multiselect for interactive selection, `date-fns` for date formatting, and `ora` for loading spinners. Remote branch deletion calls `git push origin --delete`.

**`src/cli/update.ts`** — `gitg update` implementation. Force-updates a git repo: cleans untracked files, stashes changes, pulls from remote. With `--recursive`, scans all subdirectories for git repos and updates each one, using `cli-progress` bar for progress tracking.

**`src/cli/amend.ts`** — `gitg amend` implementation. Two modes: `-d` for date amendment (interactive date picker → `git commit --amend --date` + `git rebase --committer-date-is-author-date`), and `-a` for author amendment (via `git filter-branch --env-filter`).

**`src/env.ts`** — Shared environment. Exports a singleton `simpleGit()` instance (`git`) and a `GitGeass` config class with static `defaultBranch` property.

**`src/utils/index.ts`** — Git utility functions: `getLocalBranchSummary()`, `getRemoteDefaultBranch()`, `getRemoteBranches()`. These wrap simple-git calls and are used by the clean command to enumerate branches.

**`src/types.ts`** — Type definitions. Currently exports `BranchInfo` interface (name, commit hash, latest commit date).

### Key Dependencies

- **simple-git** — All git operations go through this library. The shared instance lives in `env.ts`.
- **yargs** — Command parsing and help generation. Commands are defined in `src/cli/index.ts`.
- **prompts** — Interactive user input (multiselect for branch selection, date picker, text input).
- **consola** + **ora** — Logging and spinner UI.
- **c12** / **cilicili** — Declared in dependencies but not yet actively used in current source.

### Build & Tooling

- **unbuild** builds `src/index.ts` → `dist/` with declaration files. Config in `build.config.ts`.
- **ESLint** uses `@antfu/eslint-config` in `lib` mode with `no-console` off.
- **vitest** for testing, with `test/fixtures/` excluded from both test discovery and file watching.
- **simple-git-hooks** + **lint-staged** run `eslint --fix` on pre-commit.
- **pnpm workspace** is configured (`pnpm-workspace.yaml`) for potential `playground/`, `docs/`, `packages/*`, `examples/*` sub-packages.

### Test Structure

Tests live in `test/` and create real git repos in `test/fixtures/` to verify CLI behavior end-to-end. `test/config.ts` provides shared fixture paths. Tests create branches, run git operations, and assert on git state — they are integration-level rather than unit-level.
