<p align="center">
<!-- badge:doi --><a href="https://doi.org/{{DOI}}"><img src="https://zenodo.org/badge/DOI/{{DOI}}.svg" alt="DOI" /></a>
    <a href="https://deepwiki.com/{{OWNER}}/{{REPO}}"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
<!-- badge:docs --><a href="{{DOCS_URL}}"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
<!-- badge:api --><a href="{{API_URL}}"><img src="https://img.shields.io/badge/API-blue?logo=fastapi&logoColor=white" alt="API" /></a>
<!-- badge:youtube --><a href="{{YOUTUBE_URL}}"><img height="20px" src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube" /></a>
    <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/{{OWNER}}/{{REPO}}"><img height="24px" src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers" /></a>
    <a href="https://github.com/{{OWNER}}/{{REPO}}/stargazers"><img src="https://img.shields.io/github/stars/{{OWNER}}/{{REPO}}" alt="GitHub Stars" /></a>
<br />
<!-- badge:npm --><a href="https://www.npmjs.com/package/{{PACKAGE}}"><img src="https://img.shields.io/npm/dm/{{PACKAGE}}.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://codecov.io/gh/{{OWNER}}/{{REPO}}"><img src="https://codecov.io/gh/{{OWNER}}/{{REPO}}/graph/badge.svg" alt="Coverage" /></a>
    <a href="https://github.com/{{OWNER}}/{{REPO}}/graphs/contributors"><img src="https://img.shields.io/github/commit-activity/m/{{OWNER}}/{{REPO}}" alt="Commit Activity" /></a>
    <a href="https://github.com/{{OWNER}}/{{REPO}}/commits/{{DEFAULT_BRANCH}}/"><img src="https://img.shields.io/github/last-commit/{{OWNER}}/{{REPO}}.svg" alt="Last Commit" /></a>
    <a href="https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/tests.yml"><img src="https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/tests.yml/badge.svg?branch={{DEFAULT_BRANCH}}" alt="Tests" /></a>
<br />
<!-- badge:uptime --><a href="https://stats.uptimerobot.com/{{UPTIME_ID}}"><img src="https://img.shields.io/badge/Uptime-Status-brightgreen?logo=uptimerobot&logoColor=white" alt="Uptime Status" /></a>
<!-- badge:npm --><a href="https://www.npmjs.com/package/{{PACKAGE}}"><img src="https://img.shields.io/npm/v/{{PACKAGE}}.svg" alt="npm version" /></a>
<!-- badge:discord --><a href="{{DISCORD_INVITE}}"><img src="https://img.shields.io/discord/{{DISCORD_ID}}.svg?label=Chat&logo=Discord&colorB=7289da&style=flat" alt="Join Discord" /></a>
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
    <a href="./LICENSE.md"><img src="https://img.shields.io/github/license/{{OWNER}}/{{REPO}}" alt="License" /></a>
<br />
    <img src="https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff" alt="Claude AI" />
    <img src="https://img.shields.io/badge/Cloudflare-F38020?logo=Cloudflare&logoColor=white" alt="Cloudflare" />
    <img src="https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white" alt="Turborepo" />
    <img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white" alt="Bun" />
</p>

# {{REPO}}

{{DESCRIPTION}}

```bash
bun install
bun run dev
```

## Layout

```
packages/          publishable libraries, one directory per package
apps/              deployable applications, one directory per app
  test-reports/    the HTML test report deployed to Cloudflare Workers
.github/workflows/ CI: tests, publishing, auto-merge, report deploys
turbo.json         the task graph every script above runs through
codecov.yml        coverage flags and pull-request comment layout
docs/              how to set up the badges, workflows and secrets
```

Everything is driven by [Turborepo](https://turborepo.com): `bun run build`,
`bun run test`, `bun run lint` and `bun run typecheck` at the root fan out to
every workspace package in dependency order, and cache what has not changed.

| Script | What it does |
| --- | --- |
| `bun run build` | `turbo run build` across the workspace, in dependency order |
| `bun run dev` | every package's watch/dev task, in parallel |
| `bun run test` | every package's `test` task |
| `bun run test:ci` | the CI variant: writes `junit.xml` and `coverage/lcov.info` |
| `bun run test:report` | the whole suite with the HTML reporter, into `apps/test-reports/dist` |
| `bun run coverage` | every package's coverage task |
| `bun run lint` / `typecheck` | the corresponding task per package |
| `bun run clean` | drops build output, `.turbo` and `node_modules` |

Filter to one package with `--filter`:

```bash
bunx turbo run test --filter=./packages/my-package
```

## Docs

| Doc | Covers |
| --- | --- |
| [docs/BADGES.md](./docs/BADGES.md) | Every badge above: what it needs, where the id comes from, how to verify it |
| [docs/WORKFLOWS.md](./docs/WORKFLOWS.md) | Every workflow in `.github/workflows`: what it does, what it needs, how it fails |
| [docs/SECRETS.md](./docs/SECRETS.md) | The repository secrets and settings CI depends on |

## Adding a package

1. `mkdir packages/my-package` with a `package.json` (`"name"`, `"version"`, and
   a `build`/`test` script as needed).
2. Give it a `test:ci` script that writes `junit.xml` and `coverage/lcov.info`:

   ```json
   "test:ci": "vitest run --reporter=junit --outputFile=junit.xml --coverage"
   ```

3. That is all: `.github/workflows/tests.yml` discovers packages by that script,
   and `npm-publish.yml` publishes any non-private package whose content changed.
