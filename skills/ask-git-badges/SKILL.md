---
name: ask-git-badges
description: Guide to the README badge block used across this org (starter-templates/template-git-repo, applied by `setup-git-repo --badges-only`) — the Shields.io URL grammar, which badges need an account or a secret and which just work, the centered-HTML layout, and per-badge setup for DOI/Zenodo, Codecov, npm, GitHub Actions status, Discord, UptimeRobot, DeepWiki and the Cloudflare deploy button. Use when adding or fixing README badges — a badge rendering "invalid" or "not found", a workflow badge stuck on "no status" or turning red from a feature branch, coverage showing "unknown", a Discord badge that will not read the member count, an npm badge before the first publish, or a fixed badge that still looks broken because of GitHub's image cache.
---

# The README Badge Block

The badge header from `qwksearch-research-agent`, generalized into
`starter-templates/template-git-repo/README.md` and applied by the
`setup-git-repo` CLI.

## Setup

```bash
bunx setup-git-repo --badges-only          # write the block into README.md
bunx setup-git-repo --badges-only --force  # refresh an existing one
```

Owner, repo and default branch come from `git remote get-url origin`. Optional
badges are prompted for, or passed as flags:

```bash
bunx setup-git-repo --badges-only -y \
  --package my-package \
  --doi 10.5281/zenodo.20951725 \
  --discord-id 1110227955554209923 --discord-invite https://discord.gg/abc123
```

**A badge whose value you omit is dropped from the README**, rather than shipped
pointing at a literal `{{DOI}}`. Each optional badge carries a
`<!-- badge:NAME -->` marker on its line; the CLI drops the line when the badge's
placeholders are not all filled, and strips the marker from the ones it keeps.
That is why the template keeps one `<a>` per line.

## Which badges need what

| Setup needed | Badges |
| --- | --- |
| **Nothing** (public repo) | Stars, Commit Activity, Last Commit, License, PRs Welcome, DeepWiki, Deploy to Cloudflare, tech-stack chips |
| **A workflow or service** | Workflow status, Codecov coverage, npm version, npm downloads |
| **An external account + an id** | DOI (Zenodo), Discord, UptimeRobot, Docs/API/YouTube links |

Full per-badge setup — where each id comes from, what the URL means, how it
fails — is in [`API.md`](./API.md) and, in a generated repo, in `docs/BADGES.md`.

## Shields.io in one paragraph

`https://img.shields.io/<type>/<args>.svg?<options>`. Options: `label=`,
`color=`/`colorB=`, `logo=` (any [Simple Icons](https://simpleicons.org) slug),
`logoColor=`, `style=` (`flat`, `flat-square`, `for-the-badge`). Static badges are
`badge/<label>-<hex>?logo=<slug>` — a literal `-` in the label must be written
`--` and a space `_`. A logo slug that is not in Simple Icons renders the label
with no icon and no error, so verify the slug before hunting elsewhere.

## The four that bite

**Workflow status.** The path segment is the workflow **file name**, not the
`name:` inside it — rename the file and the badge silently reads "no status".
Always set `?branch=`; without it the badge reflects the most recent run on *any*
branch, so a red feature branch turns your README red.

```html
<a href="https://github.com/OWNER/REPO/actions/workflows/tests.yml"><img src="https://github.com/OWNER/REPO/actions/workflows/tests.yml/badge.svg?branch=main" alt="Tests" /></a>
```

**Codecov.** Needs `CODECOV_TOKEN` as a repository secret and at least one
successful upload. If the badge says `unknown`, the upload never arrived — read
the workflow step's log, not the badge. Private repos need a graph token in the
badge URL too (Codecov → repo Settings → Badges gives the exact markdown).

**Discord.** Two different values, and swapping them is the usual failure: the
**server id** goes in the Shields path (it renders the online count), the
**invite code** in the `href`. The server also needs Server Settings → Widget →
Enable Server Widget, or Shields cannot read the count and the badge says
`invalid`. Create a *never-expiring* invite — the default expires in 7 days and
the badge quietly links to a dead page.

**npm.** `PACKAGE` is the name in that package's `package.json`, not the repo
name, and both the version and downloads badges render `invalid` until the
package's first publish. Scoped names need the slash encoded:
`npm/v/%40scope%2Fname`.

## Layout

Plain HTML inside `<p align="center">`, not markdown, because markdown image
syntax cannot center or set a height. Consequences:

- One `<a>` per line — the badge-pruning above is line-based, and it keeps the
  block reorderable.
- `<br />` between rows creates the grouping. GitHub collapses whitespace, so
  blank lines do nothing.
- GitHub's renderer strips `style` attributes. Sizing comes from the `height`
  attribute or from Shields' own `style=` parameter.

Group by meaning: identity and links first, health and freshness second,
community third, stack chips last.

## Recipes

**Add a badge the template does not ship.** Put it on its own line at the right
row, with four spaces of indentation. If it needs a value the user might not
have, add `<!-- badge:NAME -->` at the start of the line and an entry in
`OPTIONAL_BADGES` in `packages/setup-git-repo/src/template.mjs` mapping that name
to the placeholders it needs — then it gets dropped rather than shipped broken.

**Show a real uptime number** instead of the static "Status" chip, using a
monitor-specific API key (read-only for one monitor, which is why it is safe in a
README — never the account-wide key):

```html
<img src="https://img.shields.io/uptimerobot/ratio/7/MONITOR_API_KEY" alt="Uptime 7d" />
```

**Verify a badge.** Open its `src` URL directly in a browser: that bypasses
GitHub's camo image proxy, and Shields renders its own errors into the image
(`invalid`, `not found`, `inaccessible`), telling you which half of the URL is
wrong.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Badge renders `invalid` | Shields could reach the service but not the resource — wrong id, wrong package name, or a private repo it cannot see |
| Badge renders `not found` / `repo not found` | Private repo, or a typo in `owner/repo`. Shields has no token for private repos |
| A fixed badge still looks broken on GitHub | GitHub's camo proxy cached the old image. Open the `src` URL directly to see the truth; `curl -X PURGE <camo url>` or wait a few minutes |
| Workflow badge says "no status" | The workflow has never run on that branch, or the file was renamed — the URL uses the file name, not the workflow's `name:` |
| Workflow badge is red but CI is green | No `?branch=` — it is showing a run from some other branch |
| Coverage badge says `unknown` | No upload has landed. `CODECOV_TOKEN` missing, or the run wrote no `lcov.info` |
| Coverage dropped to 0% for a package nobody touched | `carryforward` is off for that flag in `codecov.yml` |
| npm badge `invalid` on a package that exists | Scoped name not URL-encoded, or you used the repo name instead of the package name |
| Discord badge shows no count | Server widget disabled, or the server id and invite code are swapped |
| Discord link is dead | The invite expired — the default is 7 days. Create a never-expiring one |
| DOI badge points at an old release | You used the version-specific DOI. Use the *concept* DOI ("all versions") |
| Zenodo never minted a DOI | A tag is not a Release. Create an actual GitHub Release, after enabling the repo in Zenodo → GitHub |
| License badge says `Other` | GitHub could not detect the license from the file. Use a static `badge/license-MIT-green.svg` |
| Deploy-to-Cloudflare button 404s after clicking | No `wrangler.jsonc`/`wrangler.toml` where Cloudflare looks. In this template it lives in `apps/test-reports/` |
| A `{{PLACEHOLDER}}` shipped in the README | `setup-git-repo` leaves unknown placeholders visible on purpose. Re-run with the missing flag, or delete the line |
| Badge icon missing, label fine | The `logo=` slug is not in Simple Icons |
