# Badges: what each one needs and how to set it up

Every badge in the README falls into one of three groups:

| Group | Setup | Badges |
| --- | --- | --- |
| **Zero setup** — works the moment the repo is public | none | Stars, Commit Activity, Last Commit, License, PRs Welcome, Deploy to Cloudflare, DeepWiki, tech-stack chips |
| **Needs a workflow or service connected** | one repo secret or one app install | Tests status, Coverage, npm version, npm downloads |
| **Needs an account and an id you paste in** | an external account | DOI, Discord, UptimeRobot, YouTube, Docs, API |

`setup-git-repo` drops the badge lines for group 3 unless you pass the id, so the
README never ships a badge pointing at `{{DOI}}`. Add them back later by copying
the snippet from this file.

Almost everything is [Shields.io](https://shields.io), whose URL shape is
`https://img.shields.io/<type>/<args>.svg?<options>`. Common options: `label=`,
`color=`/`colorB=`, `logo=` (any [Simple Icons](https://simpleicons.org) slug),
`logoColor=`, `style=` (`flat`, `flat-square`, `for-the-badge`).

---

## Zero setup

### GitHub Stars

```html
<a href="https://github.com/OWNER/REPO/stargazers"><img src="https://img.shields.io/github/stars/OWNER/REPO" alt="GitHub Stars" /></a>
```

Nothing to configure. Works on public repos only — Shields has no token for
your private repo and renders `invalid` or `repo not found`.

### Commit Activity

```html
<img src="https://img.shields.io/github/commit-activity/m/OWNER/REPO" alt="Commit Activity" />
```

`m` is commits per month; `w` and `y` also work. Add `/BRANCH` to scope it:
`commit-activity/m/OWNER/REPO/main`.

### Last Commit

```html
<img src="https://img.shields.io/github/last-commit/OWNER/REPO.svg" alt="Last Commit" />
```

Defaults to the default branch. `?display_timestamp=committer` switches from
author date to commit date, which is what you usually mean after a rebase.

### License

```html
<img src="https://img.shields.io/github/license/OWNER/REPO" alt="License" />
```

Reads GitHub's detected license, which comes from a recognized `LICENSE` file.
A `LICENSE.md` with a custom or modified text is often detected as `Other` —
if that bothers you, use a static badge instead:
`https://img.shields.io/badge/license-MIT-green.svg`.

### PRs Welcome

A static badge; it links to GitHub's "creating a pull request" docs. Point it at
your own `CONTRIBUTING.md` once you have one.

### Deploy to Cloudflare Workers

```html
<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/OWNER/REPO"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers" /></a>
```

The button image is hosted by Cloudflare; no account needed to *show* it. For the
click-through to actually work, the repo must be deployable: a `wrangler.jsonc`
(or `wrangler.toml`) at the root, or a `workers/` directory Cloudflare can find.
This template's Worker config lives in `apps/test-reports/`, so either move it,
add a root config, or point the button at a subdirectory URL.

### Ask DeepWiki

```html
<a href="https://deepwiki.com/OWNER/REPO"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
```

DeepWiki indexes public repos automatically. The first visit to the link
triggers indexing if the repo has not been seen; the badge image itself is
static, so it renders even before indexing finishes.

### Tech-stack chips

Pure decoration — static Shields badges with a brand color and a Simple Icons
slug:

```html
<img src="https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white" alt="Turborepo" />
```

Format is `badge/<label>-<hex color>?logo=<slug>`. A slug that isn't in Simple
Icons renders the label with no icon and no error, so check
[simpleicons.org](https://simpleicons.org) before assuming a typo elsewhere. A
literal `-` in the label must be written `--`, and a space `_`.

---

## Needs a workflow or service connected

### Workflow status (Tests)

```html
<a href="https://github.com/OWNER/REPO/actions/workflows/tests.yml"><img src="https://github.com/OWNER/REPO/actions/workflows/tests.yml/badge.svg?branch=main" alt="Tests" /></a>
```

Served by GitHub, not Shields. Three things to get right:

- The path segment is the workflow **file name**, not the `name:` inside it.
  `tests.yml` here; renaming the file breaks the badge silently (it renders
  "no status").
- `?branch=` is worth setting. Without it the badge shows the most recent run on
  *any* branch, so a red feature branch turns your README red.
- The badge shows `no status` until the workflow has run at least once on that
  branch. Push to the branch or use "Run workflow" from the Actions tab.

One badge per workflow file: add `npm-publish.yml` or `deploy-test-reports.yml`
the same way if you want them visible.

### Coverage (Codecov)

```html
<a href="https://codecov.io/gh/OWNER/REPO"><img src="https://codecov.io/gh/OWNER/REPO/graph/badge.svg" alt="Coverage" /></a>
```

Setup:

1. Sign in at [codecov.io](https://codecov.io) with GitHub and add the repo.
2. Copy the **repository upload token** and save it as the `CODECOV_TOKEN`
   repository secret (Settings → Secrets and variables → Actions → New secret).
   Public repos on GitHub Actions can often upload tokenless, but rate limits
   make that unreliable in CI — set the secret.
3. Push. `tests.yml` uploads `coverage/lcov.info` per package.

Getting the token from Codecov's UI: repo page → Settings → General → Repository
Upload Token. If the badge stays `unknown`, the upload never arrived — check the
"Upload coverage to Codecov" step's log, not the badge.

Private repos need the token in the badge URL too; Codecov's repo Settings →
Badges page shows the exact markdown with the graph token included.

`codecov.yml` in this template sets `carryforward: true` per flag, so a package
that didn't run in a given PR keeps its last coverage instead of reading as a
drop to 0%.

### npm version and downloads

```html
<a href="https://www.npmjs.com/package/PACKAGE"><img src="https://img.shields.io/npm/v/PACKAGE.svg" alt="npm version" /></a>
<a href="https://www.npmjs.com/package/PACKAGE"><img src="https://img.shields.io/npm/dm/PACKAGE.svg" alt="NPM Monthly Downloads" /></a>
```

`PACKAGE` is the name in that package's `package.json`, not the repo name. Both
badges render `invalid` until the package's **first** publish — `npm-publish.yml`
does that on the first push to the default branch. Scoped packages work with the
scope included and URL-encoded slash: `npm/v/%40scope%2Fname`.

`dm` is downloads/month; `dw` weekly, `dt` total. In a monorepo, pick the package
users actually install — or show several, one badge each.

---

## Needs an account and an id you paste in

### DOI (Zenodo)

```html
<a href="https://doi.org/10.5281/zenodo.NNNNNNN"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.NNNNNNN.svg" alt="DOI" /></a>
```

A DOI makes the repo citable in academic work. Setup:

1. Sign in to [zenodo.org](https://zenodo.org) with GitHub.
2. Zenodo → GitHub → flip the repo's switch **on**. This installs a webhook; it
   only affects releases created *after* the switch.
3. Create a GitHub Release (a tag alone is not enough — it must be a Release).
   Zenodo archives the tarball and mints a DOI within a few minutes.
4. Zenodo shows two DOIs. Use the **concept DOI** ("all versions"), not the
   version-specific one, so the badge keeps pointing at the newest release.

Pass it to the CLI without the `https://doi.org/` prefix: `--doi 10.5281/zenodo.NNNNNNN`.

### Discord

```html
<a href="https://discord.gg/INVITE"><img src="https://img.shields.io/discord/SERVER_ID.svg?label=Chat&logo=Discord&colorB=7289da&style=flat" alt="Join Discord" /></a>
```

Two different values, and mixing them up is the usual failure:

- **Server id** goes in the Shields path (it renders the online count). Get it
  with Discord → User Settings → Advanced → Developer Mode on, then right-click
  the server → Copy Server ID.
- **Invite code** goes in the `href`. Create a *never-expiring* invite —
  a default invite expires in 7 days and the badge quietly links to a dead page.

The server also needs the **Widget** enabled (Server Settings → Widget → Enable
Server Widget); without it Shields cannot read the member count and the badge
reads `invalid`.

### UptimeRobot

```html
<a href="https://stats.uptimerobot.com/PAGE_ID"><img src="https://img.shields.io/badge/Uptime-Status-brightgreen?logo=uptimerobot&logoColor=white" alt="Uptime Status" /></a>
```

As written this is a **static** badge — it always says "Status" and links to your
public status page. Setup: [uptimerobot.com](https://uptimerobot.com) → add a
monitor for your URL → Status Pages → create one → copy the id out of its URL.

For a badge that reports the *real* number, use a monitor-specific API key
(Monitor → Settings → API key, the `m` key) with Shields' UptimeRobot endpoints:

```html
<img src="https://img.shields.io/uptimerobot/ratio/7/MONITOR_API_KEY" alt="Uptime 7d" />
<img src="https://img.shields.io/uptimerobot/status/MONITOR_API_KEY" alt="Up or down" />
```

That key is read-only for one monitor, which is why it is safe in a README —
never paste your account-wide API key there.

### Docs / API / YouTube links

```html
<a href="https://your.docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
<a href="https://your.api/docs"><img src="https://img.shields.io/badge/API-blue?logo=fastapi&logoColor=white" alt="API" /></a>
<a href="https://youtu.be/VIDEO_ID"><img height="20px" src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube" /></a>
```

Static badges whose only "setup" is having somewhere to point them. They exist
to make the top of the README a navigation bar rather than a status board — the
logo does the work, so keep the label to one word.

Note the YouTube badge is `style=for-the-badge` while its neighbors are flat.
That is deliberate in the original layout but it renders taller; the `height`
attribute pulls it back in line. Drop `style=for-the-badge` if you would rather
they match.

---

## Layout

The block is plain HTML inside `<p align="center">`, not markdown, because
markdown image syntax cannot center or set a height. Consequences:

- Keep each `<a>` on one line. A newline inside the tag is fine for HTML but
  makes the block much harder to reorder later.
- `<br />` between rows is what creates the grouping — GitHub collapses
  whitespace, so blank lines do nothing.
- GitHub's markdown renderer strips `style` attributes. Sizing has to come from
  the `height` attribute or from Shields' own `style=` parameter.

Group by meaning: identity and links on row one, health and freshness on row two,
community on row three, stack chips last.

## Verifying

Badges are cached by GitHub's image proxy (camo), so a fixed badge can keep
looking broken for a while. To check the real state, open the badge's `src` URL
directly in a browser — that bypasses camo. Shields renders its own errors into
the image (`invalid`, `not found`, `inaccessible`), so the image itself tells you
which half of the URL is wrong.

To force GitHub to refetch: `curl -X PURGE <the camo URL>` on the rendered image
address, or simply wait — camo's TTL is minutes, not hours.
