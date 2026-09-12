<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/template-git-repo"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/template-git-repo"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/template-git-repo"><img src="https://img.shields.io/npm/dm/template-git-repo.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/template-git-repo"><img src="https://img.shields.io/npm/v/template-git-repo.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/template-git-repo"><img src="https://img.shields.io/npm/dt/template-git-repo.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/template-git-repo"><img src="https://img.shields.io/npm/types/template-git-repo" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=template-git-repo"><img src="https://packagephobia.com/badge?p=template-git-repo" alt="Install size" /></a>
    <a href="https://app.codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/flags"><img src="https://img.shields.io/codecov/c/github/OpenSourceAGI/dev-tools-starter-agent?flag=template-git-repo&label=template-git-repo%20coverage&logo=codecov&logoColor=white" alt="Coverage" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skills**
<br />
`npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill template-git-repo` ([what it covers](../../skills/template-git-repo/SKILL.md))
<br />
`npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill repo-badges` ([what it covers](../../skills/repo-badges/SKILL.md))
<!-- skills:install:end -->

# template-git-repo

One command to give a repository the CI, publishing, badges and Turborepo wiring
worked out in [qwksearch-research-agent](https://github.com/OpenSourceAGI/qwksearch-research-agent):

```bash
bunx template-git-repo
```

It detects the repo slug, default branch, package manager, workspace layout and
the package to advertise on npm, writes the workflows and their helper scripts,
wires up Turborepo, and injects a badge block into your README. Nothing existing
is overwritten without `--force`, and `--dry-run` prints the exact plan.

## What it writes

| Path | What it is |
| --- | --- |
| `.github/workflows/tests.yml` | Per-package tests with a **discovered** matrix, coverage + test analytics to Codecov |
| `.github/workflows/npm-publish.yml` | Publishes every workspace package whose *content* changed — no version bookkeeping |
| `.github/workflows/auto-merge-claude.yml` | Auto-merges agent PRs once their checks pass |
| `.github/workflows/auto-merge-and-create-prs.yml` | Twice-daily sweep: merges green PRs, opens PRs for orphan branches |
| `.github/workflows/deploy-test-reports.yml` | Publishes the HTML test report to Cloudflare Workers |
| `scripts/*.mjs` | The five helpers those workflows call |
| `turbo.json` | Pipeline whose task names the workflows use |
| `codecov.yml` | Per-package flags with `carryforward` |
| `README.md` | The badge block, between markers |

Full setup notes: **[docs/ACTIONS.md](./docs/ACTIONS.md)** (workflows and secrets)
and **[docs/BADGES.md](./docs/BADGES.md)** (every badge, and what you have to do
outside the repo before it shows anything real).

## Options

```bash
bunx template-git-repo --dry-run          # print the plan, change nothing
bunx template-git-repo --force            # replace files that already exist
bunx template-git-repo --actions-only     # just the workflows and their scripts
bunx template-git-repo --badges-only      # just the README badge block
bunx template-git-repo --no-turbo         # leave turbo.json and package.json alone
```

Badge inputs — each one enables the badge that needs it, and badges without their
input are left out with a note rather than rendered broken:

```bash
bunx template-git-repo \
  --doi 10.5281/zenodo.20951725 \
  --docs https://example.com/docs \
  --discord-id 1110227955554209923 --discord-invite https://discord.gg/xxxx \
  --stack Claude,Cloudflare,Next.js
```

Run `bunx template-git-repo --help` for the rest.

## The parts worth knowing

**The test matrix is discovered, not written.** `scripts/list-test-packages.mjs`
reads the `workspaces` globs and emits one matrix entry per package with a test
script. A hand-maintained matrix fails silently — a package added to the repo but
not to the matrix is never tested, and nothing goes red to say so.

**Publishing compares content, not version numbers.** npm tarballs are
reproducible, so `npm pack` integrity against the registry answers "did anything
actually change". Version bumps happen as a consequence, not as a prerequisite,
and they are taken from what the registry says is free — including the versions a
half-finished publish reserved, which `latest` cannot show you.

**Badges carry their own setup instructions.** `docs/BADGES.md` is generated from
the catalog in `src/badges.js`, and a test fails if it drifts. A badge whose
prerequisites nobody wrote down is a badge that reads `unknown` forever.

**The badge block is re-runnable.** It lives between
`<!-- template-git-repo:badges:start -->` and `...:end -->`, so running the CLI
again after you publish a package or finish setting up Codecov replaces the block
and nothing else.

## Programmatic use

```js
import { renderBadgeBlock, buildContext } from 'template-git-repo';

const context = buildContext({ overrides: { stack: 'Bun,Cloudflare' } });
const { markdown, skipped } = renderBadgeBlock(context);
```

## Adding a badge

Add an entry to `BADGES` in `src/badges.js` — `needs`, `setup` and `group` are
what make it self-documenting — then `bun run docs:badges`. Nothing else needs to
know about it.
