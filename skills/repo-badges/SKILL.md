---
name: repo-badges
description: The README badge template from qwksearch-research-agent — which badges to use (DOI, DeepWiki, live app, docs, npm version and downloads including all-time totals, Codecov, CI status, stars, forks, contributors, open issues, open and merged pull request counts, discussions, commit activity, last commit, Discord, uptime, license, PRs welcome, Cloudflare deploy button, Codespaces, tech-stack chips), how they group into four rows, and what you must set up outside the repo before each one shows anything real. Use when adding or fixing README badges, or when a badge renders wrong — Codecov stuck on unknown, a CI badge showing a feature branch's failure, npm reading invalid, Discord showing "invite" instead of a member count, shields.io eating a hyphen in a label, or a repo-not-found on a private repo.
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
| identity | DOI, DeepWiki, live app, Docs, API, YouTube, Cloudflare deploy button, StackBlitz, Codespaces | what is this |
| quality | npm downloads (monthly + total), npm version, types, install size, Codecov, per-flag Codecov, CI status, test report, uptime | does it work |
| community | stars, forks, contributors, open issues, open PRs, merged PRs, discussions, commit activity, last commit, Discord, PRs welcome, license | is it alive |
| stack | tech chips | what is it built with |

The community row is the one people under-fill. Stars say a repo was noticed
once; **open issues, open PRs and merged PRs together** say whether anything is
moving through it now, and a reader deciding whether to depend on you is asking
the second question. Two PR counts rather than one on purpose: an open count
alone reads the same whether the queue clears in a day or has been stuck for a
year.

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
| `website` | `--website` | Nothing — the deployed thing, not the repo. First in the row: a visitor who can click into a running app decides in seconds. |
| `codespaces` | — | Nothing. Add a `.devcontainer/` if the default image cannot install your deps — the visitor sees that failure, not you. |
| `issues` | — | Issues enabled (Settings → Features). The `/issues/` path already excludes PRs from the count. |
| `pull-requests` / `prs-merged` | — | Nothing. shields.io has no "merged" endpoint: `issues-pr-closed` counts every PR that is no longer open, so a repo that closes many stale PRs should relabel it "PRs closed". |
| `discussions` | — | Discussions has to be **on** (Settings → Features) or the badge reads "repo not found", which looks exactly like a private repo. |
| `stars`, `forks`, `contributors`, `commit-activity`, `last-commit`, `prs-welcome`, `license` | — | Nothing. Public repos only. `contributors` counts commit authors GitHub matched to an account, so unregistered-email commits are invisible to it. |
| `stack` | `--stack A,B,C` | Nothing — any slug from simpleicons.org works as `?logo=`. A name with no icon (`better-auth`, `MCP`) renders as a plain text chip rather than a blank square. In this monorepo the list is read off each package's own `package.json` instead of being passed. |

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

The root README's block is the repo's. Each package README gets its own four
rows instead, and the split between rows two and three is the point:

- **row 2 measures the package** — its npm name, its tarball, its Codecov flag.
  Nothing in it moves because a sibling package got popular.
- **row 3 measures the repo it ships from** — stars, issues, the PR queue. Those
  are repo-wide by nature, which is why they sit on their own row instead of
  being mixed into the package numbers.

Neither row substitutes for the other: a package with no downloads in a busy
repo and a popular package in a dead repo are different situations, and it takes
both rows to tell them apart. Row 4 is read off the package's own
`package.json`, so a CLI that never imports React does not advertise Next.js.

Written by:

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
