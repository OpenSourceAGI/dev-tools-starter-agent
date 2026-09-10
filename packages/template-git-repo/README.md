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
