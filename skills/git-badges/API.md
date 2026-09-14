# Badge Catalog

Every badge in `starter-templates/template-git-repo/README.md`, in README order.
`OWNER`/`REPO`/`PACKAGE` are literal substitutions. Placeholders the
`setup-git-repo` CLI fills are named in the "CLI flag" column; a badge with a
`<!-- badge:NAME -->` marker is dropped when its flag is not given.

| # | Badge | Marker | CLI flag | Needs |
| --- | --- | --- | --- | --- |
| 1 | DOI | `doi` | `--doi` | Zenodo account + a GitHub Release |
| 2 | Ask DeepWiki | — | — | public repo |
| 3 | Docs | `docs` | `--docs` | a URL |
| 4 | API | `api` | `--api` | a URL |
| 5 | YouTube | `youtube` | `--youtube` | a URL |
| 6 | Deploy to Cloudflare | — | — | a wrangler config for the click-through |
| 7 | GitHub Stars | — | — | public repo |
| 8 | npm downloads | `npm` | `--package` | a published package |
| 9 | Coverage | — | — | `CODECOV_TOKEN` + one upload |
| 10 | Commit Activity | — | — | public repo |
| 11 | Last Commit | — | — | public repo |
| 12 | Tests (workflow status) | — | — | one run of `tests.yml` on that branch |
| 13 | Uptime | `uptime` | `--uptime` | UptimeRobot status page |
| 14 | npm version | `npm` | `--package` | a published package |
| 15 | Discord | `discord` | `--discord-id`, `--discord-invite` | server id + invite + widget enabled |
| 16 | PRs Welcome | — | — | nothing |
| 17 | License | — | — | a detectable LICENSE file |
| 18–21 | Stack chips | — | — | nothing |

---

## 1. DOI (Zenodo)

```html
<a href="https://doi.org/10.5281/zenodo.NNNNNNN"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.NNNNNNN.svg" alt="DOI" /></a>
```

1. Sign in to zenodo.org with GitHub.
2. Zenodo → GitHub → switch the repo **on**. Only affects Releases made after.
3. Create a GitHub **Release** (a bare tag is not enough).
4. Use the **concept DOI** ("all versions"), not the version-specific one, so the
   badge follows the newest release.

Pass without the `https://doi.org/` prefix.

## 2. Ask DeepWiki

```html
<a href="https://deepwiki.com/OWNER/REPO"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
```

The image is static and always renders; the first visit to the link triggers
indexing if the repo has not been seen.

## 3–5. Docs / API / YouTube

```html
<a href="URL"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
<a href="URL"><img src="https://img.shields.io/badge/API-blue?logo=fastapi&logoColor=white" alt="API" /></a>
<a href="URL"><img height="20px" src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube" /></a>
```

Static link badges — the logo does the work, so keep labels to one word. The
YouTube one is `style=for-the-badge` while its neighbors are flat, which renders
taller; the `height` attribute pulls it back in line. Drop the style to match.

## 6. Deploy to Cloudflare Workers

```html
<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/OWNER/REPO"><img height="24px" src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers" /></a>
```

Cloudflare hosts the image; no account needed to show it. The click-through needs
a `wrangler.jsonc`/`wrangler.toml` where Cloudflare looks — in this template it
lives in `apps/test-reports/`, so point the `url` at that subdirectory or add a
root config.

## 7, 10, 11, 17. GitHub metadata

```html
<img src="https://img.shields.io/github/stars/OWNER/REPO" alt="GitHub Stars" />
<img src="https://img.shields.io/github/commit-activity/m/OWNER/REPO" alt="Commit Activity" />
<img src="https://img.shields.io/github/last-commit/OWNER/REPO.svg" alt="Last Commit" />
<img src="https://img.shields.io/github/license/OWNER/REPO" alt="License" />
```

| Variant | |
| --- | --- |
| `commit-activity/{w,m,y}/OWNER/REPO[/BRANCH]` | per week / month / year, optionally branch-scoped |
| `last-commit/OWNER/REPO?display_timestamp=committer` | commit date instead of author date — what you mean after a rebase |
| `github/stars/OWNER/REPO?style=social` | the classic star-count look |

Public repos only: Shields has no token for your private repo and renders
`not found`. The license badge reads GitHub's *detected* license; a `LICENSE.md`
with custom text is often detected as `Other`, in which case use a static badge.

## 8, 14. npm

```html
<a href="https://www.npmjs.com/package/PACKAGE"><img src="https://img.shields.io/npm/v/PACKAGE.svg" alt="npm version" /></a>
<a href="https://www.npmjs.com/package/PACKAGE"><img src="https://img.shields.io/npm/dm/PACKAGE.svg" alt="NPM Monthly Downloads" /></a>
```

| Variant | |
| --- | --- |
| `npm/dt/` `npm/dw/` `npm/dm/` `npm/dy/` | total / weekly / monthly / yearly downloads |
| `npm/v/PACKAGE/next` | a dist-tag other than `latest` |
| `npm/v/%40scope%2Fname` | scoped packages — the slash must be encoded |
| `npm/l/PACKAGE` `npm/unpacked-size/PACKAGE` | license, install size |

`PACKAGE` is the name in `package.json`, not the repo name. Both render `invalid`
until the first publish. In a monorepo, pick the package users install, or show
one badge per package.

## 9. Codecov

```html
<a href="https://codecov.io/gh/OWNER/REPO"><img src="https://codecov.io/gh/OWNER/REPO/graph/badge.svg" alt="Coverage" /></a>
```

1. codecov.io → sign in with GitHub → add the repo.
2. Settings → General → **Repository Upload Token** → save as the `CODECOV_TOKEN`
   repository secret.
3. Push; `tests.yml` uploads `coverage/lcov.info` per package.

Private repos also need a graph token in the badge URL — Codecov's repo
Settings → Badges page prints the exact markdown. `?flag=NAME` scopes the badge
to one package's flag; `?branch=NAME` to one branch.

`codecov.yml` sets `carryforward: true`, so a package that did not run in a given
PR keeps its last coverage instead of reading as a drop to 0%.

## 12. Workflow status

```html
<a href="https://github.com/OWNER/REPO/actions/workflows/tests.yml"><img src="https://github.com/OWNER/REPO/actions/workflows/tests.yml/badge.svg?branch=main" alt="Tests" /></a>
```

Served by GitHub, not Shields.

- The path segment is the workflow **file name**, not its `name:`. Renaming the
  file breaks the badge silently ("no status").
- Set `?branch=`. Without it the badge shows the latest run on *any* branch.
- Also accepts `?event=push` to ignore PR runs.
- Shows "no status" until the workflow has run once on that branch.

One badge per workflow file — add `npm-publish.yml` or
`deploy-test-reports.yml` the same way.

## 13. UptimeRobot

```html
<a href="https://stats.uptimerobot.com/PAGE_ID"><img src="https://img.shields.io/badge/Uptime-Status-brightgreen?logo=uptimerobot&logoColor=white" alt="Uptime Status" /></a>
```

As shipped this is a **static** chip linking to a public status page:
uptimerobot.com → add a monitor → Status Pages → create → copy the id from its
URL.

For live numbers, use a **monitor-specific** API key (Monitor → Settings → API
key, the `m…` key — read-only for that one monitor, which is why it is safe in a
README; never the account-wide key):

```html
<img src="https://img.shields.io/uptimerobot/status/MONITOR_KEY" alt="up/down" />
<img src="https://img.shields.io/uptimerobot/ratio/7/MONITOR_KEY" alt="7-day uptime" />
<img src="https://img.shields.io/uptimerobot/ratio/30/MONITOR_KEY" alt="30-day uptime" />
```

## 15. Discord

```html
<a href="https://discord.gg/INVITE"><img src="https://img.shields.io/discord/SERVER_ID.svg?label=Chat&logo=Discord&colorB=7289da&style=flat" alt="Join Discord" /></a>
```

Two different values:

- **Server id** → the Shields path. Discord → User Settings → Advanced →
  Developer Mode on, then right-click the server → Copy Server ID.
- **Invite code** → the `href`. Make it **never-expiring**; the default expires
  in 7 days and the badge quietly links to a dead page.

Also requires Server Settings → Widget → **Enable Server Widget**, or Shields
cannot read the member count and renders `invalid`.

## 16. PRs Welcome

```html
<a href="CONTRIBUTING_OR_DOCS_URL"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
```

Static. The template links GitHub's "creating a pull request" docs; repoint it at
your own `CONTRIBUTING.md` once you have one.

## 18–21. Stack chips

```html
<img src="https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white" alt="Turborepo" />
```

`badge/<label>-<hex>?logo=<slug>&logoColor=<color>`. Decoration only. A `-` in
the label is written `--`, a space `_`. Slugs come from
[simpleicons.org](https://simpleicons.org); an unknown slug renders the label
with no icon and no error.

Brand colors used in the template: Claude `D97757`, Cloudflare `F38020`,
Turborepo `EF4444`, Bun `000000`.

---

## Shields URL grammar

```
https://img.shields.io/<type>/<args>[.svg][?options]
```

| Option | |
| --- | --- |
| `label=` | override the left half |
| `color=` / `colorB=` | right-half color: a hex, or `brightgreen`, `green`, `yellow`, `orange`, `red`, `blue`, `lightgrey`, `success`, `important`, `critical`, `informational`, `inactive` |
| `labelColor=` / `colorA=` | left-half color |
| `logo=` | Simple Icons slug, or a `data:image/svg+xml;base64,…` URI |
| `logoColor=` | recolors the logo (single-color logos only) |
| `style=` | `flat` (default), `flat-square`, `plastic`, `for-the-badge`, `social` |
| `cacheSeconds=` | minimum cache TTL; Shields enforces its own floor |

## Caching

GitHub proxies README images through camo, so a fixed badge can keep looking
broken. Open the badge's `src` URL directly to see the real state — Shields
renders its errors into the image. To force a refetch: `curl -X PURGE <camo url>`
on the rendered image address, or wait; camo's TTL is minutes.
