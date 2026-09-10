---
name: ask-template-git-repo
description: Guide to template-git-repo (packages/template-git-repo), the one-command repo setup CLI — writing the GitHub Actions workflows, their helper scripts, turbo.json, codecov.yml and the README badge block into a repository, with detection of repo slug, default branch, package manager and workspace layout. Use when setting up CI for a repo, scaffolding workflows, adding badges to a README, wiring up Turborepo, or troubleshooting the CLI — files unexpectedly skipped, badges missing from the output, "Could not work out which GitHub repo this is", or a rendered workflow still containing {{PLACEHOLDER}}.
---

# Working With template-git-repo

The CLI in `packages/template-git-repo`, published as **`template-git-repo`**. It
gives a repository the CI, publishing, badges and Turborepo setup from
[qwksearch-research-agent](https://github.com/OpenSourceAGI/qwksearch-research-agent)
in one command.

For the workflows themselves, read **ask-github-actions**. For the badges, read
**ask-repo-badges**. This skill is about the tool.

## Setup

```bash
bunx template-git-repo            # in the repo you want to set up
```

No install, no config file. Run it from anywhere inside the repo — it walks up to
the directory holding `.git` and works from there, so running it in
`packages/foo` does not scatter a `.github/` in there.

## Picking the right invocation

| You want | Command |
| --- | --- |
| The whole setup | `bunx template-git-repo` |
| To see what it would do first | `bunx template-git-repo --dry-run` |
| Only the workflows | `bunx template-git-repo --actions-only` |
| Only to refresh the README badges | `bunx template-git-repo --badges-only` |
| To replace workflows you already have | `bunx template-git-repo --force` |
| To leave an existing build setup alone | `bunx template-git-repo --no-turbo` |
| A badge that got skipped | re-run with its flag, e.g. `--badges-only --doi 10.5281/zenodo.N` |

## What it detects, and what you have to tell it

| Detected from | Value |
| --- | --- |
| `git remote get-url origin` | `owner/repo` — https, ssh and `git@` forms all parse |
| `refs/remotes/origin/HEAD` | default branch (falls back to the current branch, then `main`) |
| `packageManager` field, then lockfiles | bun / pnpm / yarn / npm |
| `workspaces` globs | the packages directory, for the publish workflow and turbo |
| first non-private workspace package | the package the npm badges point at |

Everything else — DOI, docs URL, API URL, YouTube, uptime page, Discord, stack
chips, hosted test report — has no sensible default. Badges needing one of those
are **left out with a note** rather than rendered broken.

## Recipes

**Set up a repo that already has its own CI** — `--dry-run` first, then decide.
Existing files are skipped by default and reported as `· path (exists)`. Only
`--force` replaces them, and an identical file is reported as a skip either way,
so a no-op run never claims it changed something.

**Re-run after publishing your first package** — the npm badges need a package on
the registry. Run `--badges-only` again once it is there; only the block between
the markers changes.

**Add badges the CLI skipped**

```bash
bunx template-git-repo --badges-only \
  --discord-id 1110227955554209923 --discord-invite https://discord.gg/xxxx \
  --stack Claude,Cloudflare,Next.js
```

**Generate a badge row without touching a repo**

```js
import { renderBadgeBlock, buildContext } from 'template-git-repo';
const { markdown, skipped } = renderBadgeBlock(buildContext());
```

**Add a badge to the catalog** — one entry in `src/badges.js` (`needs`, `setup`,
`group`), then `bun run docs:badges`. `test/docs.test.js` fails if the generated
`docs/BADGES.md` drifts from the catalog.

## How the pieces fit

```
bin/template-git-repo.js   flag parsing, output, the order things happen in
src/context.js             detection + {{TOKEN}} substitution
src/badges.js              the badge catalog — data, including setup notes
src/readme.js              marker-delimited injection into the README
src/apply.js               template dir -> file plan -> writes; turbo wiring
template/                  what actually gets copied
scripts/generate-badge-docs.mjs   docs/BADGES.md, from the catalog
```

`planFiles` and `applyPlan` are separate so `--dry-run` prints the same plan a
real run carries out, rather than a second implementation that can drift.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `Could not work out which GitHub repo this is` | No `origin` remote, or one that is not on github.com. Pass `--repo owner/repo`. |
| Files reported as skipped | They already exist. That is the default — `--force` replaces them, and `--dry-run` shows which. |
| A badge is missing | Its input was not supplied. The run prints exactly which ones and what they need; re-run with the flag. |
| A rendered workflow still has `{{SOMETHING}}` | An unknown token — deliberately left visible rather than written as `undefined`. Report it; the token set lives in `substitute()` in `src/context.js`. |
| `${{ matrix.flag }}` looks like it should have been substituted | It should not. `{{TOKEN}}` is this CLI's syntax; `${{ }}` is GitHub's, and is passed through untouched. |
| README badges duplicated | The README already had a hand-written badge row. The CLI leaves those in place (silently deleting them would be worse) and warns — remove the old ones by hand. |
| Turbo wiring skipped | No `package.json` at the repo root, or `--no-turbo` / `--badges-only` was passed. |
| The badge block moved to the top of the README | With no markers present it goes above the title, which is where a badge row belongs. Move the markers and re-run if you want it elsewhere. |
| CI badge shows a failing branch you do not care about | The badge is pinned to `?branch=<default>`. If your default branch changed, re-run so the URL is regenerated. |
