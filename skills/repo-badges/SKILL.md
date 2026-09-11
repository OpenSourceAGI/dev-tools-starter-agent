---
name: repo-badges
description: The README badge template from qwksearch-research-agent — which badges to use (DOI, DeepWiki, docs, npm version and downloads, Codecov, CI status, stars, commit activity, last commit, Discord, uptime, license, PRs welcome, Cloudflare deploy button, tech-stack chips), how they group into rows, and what you must set up outside the repo before each one shows anything real. Use when adding or fixing README badges, or when a badge renders wrong — Codecov stuck on unknown, a CI badge showing a feature branch's failure, npm reading invalid, Discord showing "invite" instead of a member count, shields.io eating a hyphen in a label, or a repo-not-found on a private repo.
---

# The Repo Badge Template

The badge row from
[qwksearch-research-agent](https://github.com/OpenSourceAGI/qwksearch-research-agent),
as a catalog you can render rather than a block to copy-paste. Lives in
`packages/template-git-repo/src/badges.js`; the generated reference is
`packages/template-git-repo/docs/BADGES.md`.

## Setup

```bash
bunx template-git-repo --badges-only
```

The block goes between `<!-- template-git-repo:badges:start -->` and
`<!-- template-git-repo:badges:end -->` in your README. Re-running replaces what
is between the markers and nothing else, so it is safe to run again after you
publish a package or finish setting up Codecov.

Badges whose inputs are missing are **left out with a note**, not rendered
broken. The run prints which ones and what each needs.

## The catalog

Rows, in order. Four rows of five reads; twenty badges in one run is a wall.

| Row | Badges | Answers |
| --- | --- | --- |
| identity | DOI, DeepWiki, Docs, API, YouTube, Cloudflare deploy button, StackBlitz | what is this |
| quality | npm downloads (monthly + total), npm version, types, install size, Codecov, per-flag Codecov, CI status, test report, uptime | does it work |
| community | stars, commit activity, last commit, Discord, PRs welcome, license | is it alive |
| stack | tech chips | what is it built with |

## Which need setup outside the repo

| Badge | Flag | What you have to do first |
| --- | --- | --- |
| `doi` | `--doi` | Enable the repo on zenodo.org, publish a GitHub Release. Use the **concept** DOI (always resolves to newest), not the per-release one. |
| `deepwiki` | — | Public repos: visit `deepwiki.com/<owner>/<repo>` once to trigger indexing. |
| `docs` / `api` | `--docs` / `--api` | Nothing — but they are static badges that say "Docs" whether or not the link works. |
| `youtube` | `--youtube` | Any video URL. A demo does more than three paragraphs. |
| `deploy-cloudflare` | `--cloudflare-deploy` | A `wrangler.toml` at the cloned path, and a build that needs no secrets — the visitor's fork runs it. |
| `npm-version` / `npm-downloads` | `--npm-package` | One published version. Counts a single package, not the workspace. |
| `codecov` | — | Add the repo at codecov.io, set `CODECOV_TOKEN`, land one upload. |
| `codecov-flag` | `--codecov-flag` | The flag has to exist twice over: an entry under `flag_management.individual_flags` in `codecov.yml`, and an upload passing `flags: <name>`. Naming a flag nothing uploads to reads "unknown" while the repo-wide badge looks fine. |
| `npm-types` | `--npm-package` | Nothing — but it reads the published tarball, so it stays grey when a build shipped JS without its `.d.ts`. That is the badge doing its job. |
| `install-size` | `--npm-package` | Nothing. Measures what `npm install` writes to disk, dependencies included — not bundled browser size. |
| `stackblitz` | `--stackblitz` | Point it at a directory that boots on its own (a package with its own `package.json`). StackBlitz installs from the manifest at that path, so a monorepo root, a Worker that only exists deployed, or anything needing a native toolchain will not run. |
| `workflow` | `--workflow` | The filename must match a real workflow, and `?branch=` must name your default branch. |
| `test-report` | `--test-report` | `deploy-test-reports.yml` plus the two Cloudflare secrets. |
| `uptime` | `--uptime` | An UptimeRobot monitor and public status page. |
| `discord` | `--discord-id` + `--discord-invite` | **Two different values**: the numeric server id (Server Settings → Widget → Enable Server Widget) drives the count; the invite is where it links. |
| `stars`, `commit-activity`, `last-commit`, `prs-welcome`, `license` | — | Nothing. Public repos only. |
| `stack` | `--stack A,B,C` | Nothing — any slug from simpleicons.org works as `?logo=`. |

## Recipes

**Add one that got skipped**

```bash
bunx template-git-repo --badges-only --doi 10.5281/zenodo.20951725
```

**Drop ones you do not want**

```bash
bunx template-git-repo --badges-only --exclude commit-activity,last-commit
```

Commit-activity and last-commit are worth thinking about before adding: a quiet
month reads as an abandoned project.

**Per-package rows in this monorepo**

The root README's block is the repo's. Each package README gets its own row
instead — its npm name, its Codecov flag, its docs page, its StackBlitz
directory — written by:

```bash
bun run readmes          # write
bun run readmes:check    # fail if any header is stale
```

`scripts/sync-package-readmes.mjs` reads each package's `package.json` for the
npm name (private packages, and everything outside `packages/`, get no npm
badges), `codecov.yml` for the flag that covers its path, and skips the rest. The
same pass writes the package's agent-skill install line under the badges, between
`<!-- skills:install:start -->` markers. Edit either block only by re-running it:
a hand edit inside the markers is overwritten.

**Render a row without touching a repo**

```js
import { renderBadgeBlock, buildContext } from 'template-git-repo';
const { markdown, skipped } = renderBadgeBlock(buildContext({ overrides: { stack: 'Bun,Cloudflare' } }));
```

**Add a badge to the catalog** — one entry in `src/badges.js` with `needs`
(context it cannot render without), `setup` (what a human does outside the repo)
and `group` (which row). Then `bun run docs:badges`. A test fails if the docs
drift from the catalog.

**Hand-writing a shields.io badge** — double every literal hyphen in the label.
A single `-` is the field separator, so `PRs-welcome` renders as the label "PRs"
with the message "welcome". `shieldsBadge()` does this for you.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Codecov reads `unknown` | No upload has landed. Check the Codecov dashboard — a missing `CODECOV_TOKEN` and a repo never added look identical from the badge. |
| A package's flagged Codecov badge reads `unknown` while the repo-wide one is fine | That flag has no uploads: the package has no suite, or the flag name in `codecov.yml` does not match the one the workflow passes. Don't swap in the repo-wide badge — it would read as this package's coverage while measuring the whole monorepo. |
| npm downloads on a package README look like another package's | The row was copied from the root README, where `--npm-package` names whichever package the repo advertises. Re-run `bun run badges`. |
| CI badge red for a branch you do not care about | `?branch=` is missing, so the badge shows the latest run on *any* branch. Re-run the CLI, which always pins it. |
| CI badge reads `no status` | The filename does not match a file in `.github/workflows/`, or that workflow has never run on that branch. |
| npm badge reads `invalid` | The package is not on the registry, or it is scoped and the scope is missing from the URL. |
| Discord shows `invite` instead of a count | The server widget is off. Server Settings → Widget → Enable Server Widget. |
| `repo not found` on stars or last-commit | shields.io cannot read private repos. |
| A hyphen vanished from a shields.io label | It was read as the field separator. Double it. |
| Badges duplicated after running the CLI | The README already had a hand-written row; the CLI leaves those alone and warns. Remove the old ones. |
| The block moved to the top of the README | With no markers present that is where it goes. Place the markers yourself and re-run. |
| A badge renders but always says the same thing | Several (Docs, API, uptime, PRs welcome) are static shields — they never reflect real state. Only the ones backed by an API do. |
