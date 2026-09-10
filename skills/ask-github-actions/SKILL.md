---
name: ask-github-actions
description: How to set up the GitHub Actions workflows from the qwksearch reference CI — a discovered per-package test matrix with Codecov coverage and test analytics, content-based npm publishing with trusted publishing or NPM_TOKEN, auto-merge for agent PRs, a twice-daily PR sweep, and hosted HTML test reports on Cloudflare Workers. Use when adding or debugging CI in a monorepo, choosing repository secrets, or decoding a failure — npm E404 on publish, E409 "cannot publish over previously staged version", "Cannot find module ... or its corresponding type declarations" during a workspace build, EUNSUPPORTEDPROTOCOL workspace:*, "husky: not found", auto-merge not firing, a package that silently stopped being tested, or a Codecov badge stuck on unknown.
---

# Setting Up These GitHub Actions

The five workflows in `packages/template-git-repo/template/.github/workflows/`,
as shipped to a repo by `bunx template-git-repo`. Each one encodes a specific
failure; this is what they are and how to get them running.

Full reference: `packages/template-git-repo/docs/ACTIONS.md`.

## Setup

```bash
bunx template-git-repo --actions-only
```

Then add the secrets, under **Settings → Secrets and variables → Actions**.

| Secret | Needed by | Where it comes from | Missing means |
| --- | --- | --- | --- |
| `CODECOV_TOKEN` | `tests.yml` | codecov.io → add repo → Repository Upload Token | Uploads rejected, badge stuck on `unknown`. Tests still run. |
| `NPM_TOKEN` | `npm-publish.yml` | npmjs.com → Access Tokens → Granular, read-write | Only if you are *not* using trusted publishing. |
| `GIT_TOKEN` | both auto-merge workflows | Fine-grained PAT: Contents rw, Pull requests rw | Falls back to `GITHUB_TOKEN`, whose merges do **not** trigger further workflows — so the publish run never fires. |
| `CLOUDFLARE_API_TOKEN` | `deploy-test-reports.yml` | Cloudflare → API Tokens → "Edit Cloudflare Workers" | Deploy step fails, rest of the run is fine. |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-test-reports.yml` | The hex id in any dashboard URL | Same. |

Three repository settings matter as much as the secrets:

- **Settings → General → Allow auto-merge** — without it `--auto` is rejected and
  the workflow falls back to merging immediately, skipping the wait for checks.
- **Settings → Actions → Workflow permissions → Read and write** — without it the
  version-bump commit in `npm-publish.yml` cannot be pushed.
- **Branch protection with ≥1 required check** — this is what `--auto` waits on.

## Picking the right workflow

| You want | Workflow |
| --- | --- |
| Per-package tests, coverage, flaky-test tracking | `tests.yml` |
| Publish packages whose content changed | `npm-publish.yml` |
| Agent PRs merged as soon as they go green | `auto-merge-claude.yml` |
| Orphan branches picked up, stale green PRs merged | `auto-merge-and-create-prs.yml` |
| A test report with a URL instead of a log | `deploy-test-reports.yml` |

## Recipes

**Add a package to CI** — nothing to edit. `tests.yml`'s matrix comes from
`scripts/list-test-packages.mjs`, which reads the `workspaces` globs and picks up
any package with a `test:coverage`, `test:ci` or `test` script. Give the package
one:

```jsonc
{
  "scripts": { "test:coverage": "vitest run --coverage" },
  "ci": { "allowFailure": true }  // optional: red suite still uploads, does not fail CI
}
```

**Produce the two files the uploads want.** Coverage is `coverage/lcov.info`;
test results are `junit.xml`. For Vitest the junit half is reporter config, not a
flag:

```js
reporters: process.env.CI ? ['default', 'junit'] : ['default'],
outputFile: { junit: './junit.xml' },
```

**Publish without version bookkeeping** — push to the default branch. The
workflow builds each package in dependency order, compares `npm pack` integrity
against the registry, and publishes only what actually changed, taking the next
version the registry has not already spent.

**Prefer trusted publishing over a token.** Leave `NPM_TOKEN` unset; the job's
`id-token: write` is traded by npm ≥ 11.5.1 for a short-lived publish token. Per
package: `npmjs.com/package/<name>/access` → Trusted publisher → this repo +
`npm-publish.yml`. Nothing to rotate, nothing to expire. Setting the secret opts
back into the token path.

**Widen or narrow auto-merge** — the `if:` actor allowlist in
`auto-merge-claude.yml` is the entire safety model. Edit it to the accounts you
want merged unattended; never widen it to all contributors.

**Add your own workflow** — keep the shape: `concurrency.group` on anything that
pushes or deploys, `fail-fast: false` on matrices, `if: ${{ !cancelled() }}`
rather than `always()` on upload steps, and a comment saying what the workflow is
*for*.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `npm error code E404` publishing a package that exists | npm reports "no write access" as E404. The credential is read-only, wrongly scoped, or expired — or trusted publishing is not configured for that package yet. The workflow checks this up front and stops the rest of the loop. |
| `E409 Cannot publish over previously staged version` | A number the registry reserved via an interrupted publish; it is invisible to `latest`. `next-free-version.mjs` reads the `time` timeline too. The workflow already retries five times. |
| `Cannot implicitly apply the latest tag` | Local version fell behind the registry (a bump commit that never landed back). The workflow syncs to `latest` and re-evaluates. |
| `Cannot find module '<sibling>' or its corresponding type declarations` | Alphabetical build order. `workspace-build-order.mjs` topologically sorts the workspace — make sure the workflow calls it. |
| `EUNSUPPORTEDPROTOCOL workspace:*` | Plain `npm install` inside a bun/pnpm workspace, or `npm version` without `--no-workspaces` over its symlinks. |
| `husky: not found` (exit 127) | A dependency ships a broken `prepare: "husky install"`; `--ignore-scripts` does not suppress it for linked packages. The no-op husky shim step handles it — do not remove it. |
| `vite: not found` building a package | devDependencies were never installed, because the install ran with a package manager that cannot resolve `workspace:*`. |
| A package silently stopped being tested | It has no test script the discovery step recognizes. The `discover` job logs every package it picked up. |
| Codecov badge reads `unknown` | No upload has landed. Check the Codecov dashboard — a missing token and a repo never added look identical from the badge. |
| Auto-merge never fires | The actor is not in the `if:` allowlist, "Allow auto-merge" is off, or `GIT_TOKEN` is missing so the merge did not trigger downstream workflows. |
| Publish did not run after a merge | The merge was made with `GITHUB_TOKEN`, which does not trigger workflows. Set `GIT_TOKEN` to a PAT. |
| `wrangler deploy` fails on a missing assets directory | The test run wrote no HTML report. The placeholder step exists to prevent this — do not delete it. |
| Two runs raced and reserved a version | A workflow that pushes or deploys is missing its `concurrency.group`. |
