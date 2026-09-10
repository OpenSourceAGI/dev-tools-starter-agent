---
name: ask-github-actions-setup
description: Guide to setting up the GitHub Actions CI stack this org uses (starter-templates/template-git-repo, scaffolded by the setup-git-repo CLI) — an auto-discovering test matrix uploading to Codecov, a content-hash npm publish workflow with trusted publishing, agent PR auto-merge, and a Cloudflare-deployed HTML test report, plus the secrets and repo settings each one needs. Use when adding or debugging these workflows — npm publish failing with E404 or "cannot publish over previously staged version", "husky: not found" during a publish, EUNSUPPORTEDPROTOCOL on workspace:* deps, wrangler failing because assets.directory is missing, a package that never gets a CI job, Codecov showing no coverage, or `gh pr merge --auto` merging without waiting for checks.
---

# Setting Up These GitHub Actions

Five workflows, learned from `OpenSourceAGI/qwksearch-research-agent` and packaged
as `starter-templates/template-git-repo` in this repo. Each one exists because a
specific failure cost hours; the comments in the YAML say which.

## Setup

```bash
bunx setup-git-repo              # in the repo you want set up
bunx setup-git-repo --workflows-only   # just .github/, leave the README alone
bunx setup-git-repo --dry-run    # see the plan first
```

That writes the workflows with your default branch and owner already filled in,
then prints the secrets to add. Nothing is overwritten without `--force`.

To copy them by hand instead, the source is
`starter-templates/template-git-repo/.github/`.

## The five workflows

| File | Runs on | Does |
| --- | --- | --- |
| `tests.yml` | PR, push to default | Discovers packages with a `test:ci` script, runs each as a matrix job, uploads to Codecov |
| `npm-publish.yml` | push to default | Publishes every non-private package whose *content* changed, commits the bumps back |
| `deploy-test-reports.yml` | push to default | Vitest HTML report → Cloudflare Workers |
| `auto-merge-claude.yml` | PR opened/updated | Enables auto-merge for agent and maintainer PRs |
| `auto-merge-and-create-prs.yml` | every 12h | Merges clean+green PRs, opens PRs for orphan branches |

## Secrets

| Secret | Needed by | Notes |
| --- | --- | --- |
| `CODECOV_TOKEN` | `tests.yml` | codecov.io → repo → Settings → Repository Upload Token |
| `NPM_TOKEN` | `npm-publish.yml` | **Optional** — leaving it unset switches the workflow to trusted publishing (OIDC), which is preferred |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | `deploy-test-reports.yml` | "Edit Cloudflare Workers" token template |
| `GIT_TOKEN` | both auto-merge workflows | A PAT, **not** `GITHUB_TOKEN` |

Plus repo settings: **Allow auto-merge** (Settings → General), **branch
protection with at least one required check**, **Read and write permissions** for
Actions, and **Allow Actions to create pull requests**.

### Why `GIT_TOKEN` and not `GITHUB_TOKEN`

Merges made with `GITHUB_TOKEN` do not trigger further workflows — an
intentional loop guard. A PR merged by the auto-merge workflow with
`GITHUB_TOKEN` would never fire `npm-publish.yml` or `deploy-test-reports.yml` on
the default branch. Use a fine-grained PAT scoped to the one repo, with Contents
and Pull requests read/write.

## Which workflow to reach for

**Adding CI to a new package** — nothing to edit. Give the package a `test:ci`
script that writes `junit.xml` and `coverage/lcov.info`, and `tests.yml` finds it:

```json
"test:ci": "vitest run --reporter=junit --outputFile=junit.xml --coverage"
```

The matrix is discovered by a `discover` job that emits JSON consumed through
`fromJSON`. It is two jobs because GitHub cannot compute a matrix inside the job
that uses it. A hand-maintained matrix is the thing this replaces: it goes stale
the first time someone adds a package and forgets, and that package silently has
no CI.

**Publishing** — nothing to edit either. `npm-publish.yml` walks
`packages/*` and `apps/*`, skips `private: true`, and decides per package by
comparing `npm pack --dry-run --json` integrity against
`npm view <pkg>@<version> dist.integrity`. npm tarballs are reproducible, so
identical hashes mean nothing to release; a different hash means bump the patch
and publish. No one has to remember a version number.

**Setting up trusted publishing** (preferred over `NPM_TOKEN`, nothing to
rotate): at `npmjs.com/package/<name>/access`, add a trusted publisher — GitHub
Actions, your `owner/repo`, workflow file `npm-publish.yml` — and leave
`NPM_TOKEN` unset. A package's *first* publish cannot use it (there is no package
page yet), so publish once by hand, then hand it to CI.

## Recipes

**Port these to a repo that uses npm instead of bun.** Replace
`oven-sh/setup-bun@v2` with `actions/setup-node@v4`, `bun install
--ignore-scripts` with `npm ci --ignore-scripts`, and `bunx turbo` with `npx
turbo`. The `--no-workspaces` flags on `npm version` exist for bun's symlinks and
are harmless otherwise.

**Add a status badge for a workflow.** The URL uses the workflow **file name**,
not its `name:`, and you want `?branch=`:

```html
<a href="https://github.com/OWNER/REPO/actions/workflows/tests.yml"><img src="https://github.com/OWNER/REPO/actions/workflows/tests.yml/badge.svg?branch=main" alt="Tests" /></a>
```

**Rename the default branch.** `setup-git-repo` writes it into three
`branches:` filters. After a rename, grep the workflows for the old name — the
badge's `?branch=` too.

**Stop a package from publishing.** `"private": true` in its `package.json`. The
loop skips it and says so in the log.

**Debug a publish without releasing anything.** The integrity comparison is the
whole decision, and you can run it locally:

```bash
cd packages/my-package
npm pack --dry-run --ignore-scripts --json | jq -r '.[0].integrity'
npm view my-package@$(node -p "require('./package.json').version") dist.integrity
```

Equal means the workflow will skip it.

## Things in the YAML that look wrong but are not

- **`set +e` in the publish loop.** GitHub runs `run:` steps with `bash -e -o
  pipefail`, so *omitting* `set -e` does not disable errexit. Without turning it
  off explicitly, the first package whose publish fails kills the step and every
  later package goes unreleased without even being evaluated.
- **`continue-on-error: true` on the test step in `deploy-test-reports.yml`.** A
  red suite must still publish its report — that report is how you see what went
  red. The step after it writes a placeholder page, because `wrangler deploy`
  treats a missing `assets.directory` as a hard error and would end the run on a
  config error instead of on the test signal.
- **`if: ${{ !cancelled() }}` rather than `if: success()` on every upload.**
  Otherwise uploads are skipped on exactly the runs whose results matter most.
- **A no-op `husky` shim on PATH.** Some published dependencies ship
  `prepare: "husky install"`. When npm reconciles bun's linked `node_modules` it
  runs that hook and dies with exit 127 — and `--ignore-scripts` does **not**
  suppress it for bun-linked packages.
- **The credential preflight before any build.** npm answers an *unauthorized*
  PUT with `E404 ... could not be found or you do not have permission to access
  it`, which reads like a missing package. Without the preflight you pay a full
  build for every package before the first one hits it, and each failed attempt
  signs a provenance statement into the public sigstore transparency log.
- **The version restore rewrites `package.json` by regex, not by
  `JSON.stringify`.** Re-serializing would reformat every file the publish
  touched. It matches `"version"\s*:\s*"..."` and errors if nothing matched:
  a literal `'"version": "' + v + '"'` misses a `package.json` written without
  the space after the colon, and drops the bump while logging that it kept it.
- **`next-free-version.mjs` reads the release timeline, not just `latest`.** The
  `latest` dist-tag lags any version an interrupted publish staged, and npm
  answers a PUT for one of those with `E409 Cannot publish over previously staged
  version`. Those numbers only show up in the full version list and in `time`.
- **`git init` with no `actions/checkout` in the PR-sweep step.** It only needs
  refs, so it fetches them into an empty workspace rather than paying for a
  checkout.
- **Counting *merged* PRs when deciding whether a branch needs one.** Reopening a
  PR for a branch whose work already landed creates an empty, permanently open PR.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `npm error code E404` publishing a package that exists | Not a missing package — the credential cannot write to it. Rotate `NPM_TOKEN` (granular tokens last 90 days) or add this repo+workflow as the package's trusted publisher |
| `E409 ... cannot publish over previously staged version` | A prior run reserved that version. The loop retries at the next free one, five times; if it exhausts them, publish once by hand to unstick it |
| `husky: not found` (exit 127) during publish | A dependency's `prepare` hook. The shim step is missing or was moved after `bun install` — it must come first |
| `EUNSUPPORTEDPROTOCOL workspace:*` | An `npm` command ran without `--no-workspaces` against bun's symlinks |
| `vite: not found` when building in CI | `npm install` was used in a bun workspace. It cannot resolve sibling `workspace:*` deps, so devDependencies never install |
| Versions bump on every single run | The build is not reproducible — a timestamp, absolute path or hash of the build dir is landing in `dist` |
| Nothing publishes and there are no errors | Every package is `private: true`, or content genuinely did not change. The log says which per package |
| A new package never gets a CI job | It has no `test:ci` script, or it lives outside `packages/` and `apps/` |
| Codecov shows the run but no coverage | The runner wrote no `lcov.info`. Check that `--coverage` is in `test:ci` and that the provider supports your Node version |
| An untouched package's coverage reads as 0% | `carryforward` is off for that flag in `codecov.yml` |
| `wrangler deploy` fails on `assets.directory` | The report was never written. `--reporter=html` on the command line silently keeps its default `outputDir` — declare the reporter and its directory in `vitest.config.ts` instead |
| Auto-merge merges immediately without waiting for CI | `--auto` was rejected and the fallback ran. Turn on "Allow auto-merge" **and** branch protection with at least one required check |
| `gh: Bad credentials` in an auto-merge run | `GIT_TOKEN` expired or was never set |
| The scheduled sweep runs hours late | Normal. Scheduled workflows are delayed under Actions load; both halves are idempotent for that reason |
| Published version and repo version drift apart | The restore step could not find the version field to rewrite. It now errors instead of passing silently — check the `package.json` formatting it names |
| The version-bump commit is rejected | Actions lacks write permission (Settings → Actions → General → Workflow permissions) |

## Reference

The workflows are documented in place, and the generated repo carries the long
form: `docs/WORKFLOWS.md` (per workflow) and `docs/SECRETS.md` (per secret, with
where each value comes from and how to rotate it).
