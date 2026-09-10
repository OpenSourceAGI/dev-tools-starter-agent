# GitHub Actions setup

What each workflow in `template/.github/workflows/` does, what it needs before it
can work, and the failure it exists to prevent. These are the workflows from
[OpenSourceAGI/qwksearch-research-agent](https://github.com/OpenSourceAGI/qwksearch-research-agent),
generalized — most of the comments in them describe an incident.

## The secrets, in one table

Add these under **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Needed by | How to get it | If it is missing |
| --- | --- | --- | --- |
| `CODECOV_TOKEN` | `tests.yml` | codecov.io → add the repo → Settings → Repository Upload Token | Uploads are rejected; the coverage badge stays `unknown`. Tests still run and still pass. |
| `NPM_TOKEN` | `npm-publish.yml` | npmjs.com → Access Tokens → Granular, read-write on the packages | Only needed if you are *not* using trusted publishing. See below. |
| `GIT_TOKEN` | `auto-merge-*.yml` | A fine-grained PAT with Contents: read-write and Pull requests: read-write | Falls back to `GITHUB_TOKEN`, which merges but does **not** trigger further workflows — so a merge would never fire the publish run. |
| `CLOUDFLARE_API_TOKEN` | `deploy-test-reports.yml` | dash.cloudflare.com → My Profile → API Tokens → "Edit Cloudflare Workers" | The deploy step fails; the rest of the run is unaffected. |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-test-reports.yml` | The hex id in any Cloudflare dashboard URL | Same. |

Repository settings that matter as much as the secrets:

- **Settings → General → Allow auto-merge** — without it, `--auto` is rejected and
  the auto-merge workflows fall back to merging immediately, which skips waiting
  for checks.
- **Settings → Actions → General → Workflow permissions → Read and write** —
  without it, the version-bump commit in `npm-publish.yml` cannot be pushed.
- **Branch protection with at least one required check** — this is what `--auto`
  waits on. With no required check there is nothing to wait for.

---

## `tests.yml` — test, coverage, and test analytics

Runs every workspace package that has a test suite, uploads `coverage/lcov.info`
to Codecov under a per-package flag, and uploads `junit.xml` to Codecov Test
Analytics, which tracks per-test run time and flakiness and comments failures on
the PR.

**The matrix is discovered, not written.** A `discover` job runs
`scripts/list-test-packages.mjs`, which reads the `workspaces` globs from the root
`package.json` and emits one entry per package with a `test:coverage`, `test:ci`
or `test` script. A hand-maintained matrix fails silently — a package added to
the repo but not to the matrix is simply never tested, and nothing goes red to
say so.

What each package has to provide:

```jsonc
{
  "scripts": {
    // Whatever writes coverage/lcov.info and junit.xml. For Vitest:
    "test:coverage": "vitest run --coverage"
  },
  // Optional: keep a currently-red suite from failing the workflow while it
  // still uploads its results. Remove once the suite is green.
  "ci": { "allowFailure": true }
}
```

For Vitest, `junit.xml` comes from the reporter config, not a flag:

```js
reporters: process.env.CI ? ['default', 'junit'] : ['default'],
outputFile: { junit: './junit.xml' },
```

**Why `if: ${{ !cancelled() }}` and not `always()`** on the upload steps: a
cancelled run has nothing worth uploading, but a *failed* one is exactly when the
report matters most. `always()` also runs on cancellation and clutters the
dashboard with partial data.

**Why `fail_ci_if_error: false`**: Codecov having an outage must not turn a green
suite red.

---

## `npm-publish.yml` — publish what changed, without version bookkeeping

Publishes every non-private workspace package whose *content* changed, on every
push to the default branch. Nobody has to remember to bump a version.

Five rules are encoded in it, each learned from a specific failure:

1. **Compare pack integrity, not version numbers.** npm tarballs are reproducible
   (normalized mtimes), so `npm pack --dry-run --json` integrity against
   `npm view <pkg>@<version> dist.integrity` is a reliable "did anything change".
   A version bump is not evidence of a change, and an unchanged version is not
   evidence of no change.
2. **Check the credential before building anything.** npm answers an unauthorized
   PUT with `E404 ... could not be found or you do not have permission to access
   it`, which reads like a missing package — and it arrives *after* every package
   has been built, with a provenance statement already signed into the public
   sigstore transparency log for each failed attempt.
3. **Walk the workspace in dependency order** (`scripts/workspace-build-order.mjs`).
   Package managers link workspace siblings as symlinks; a sibling that has not
   been built has no `dist/`, and its `exports` → `types` entries point at files
   that do not exist. Alphabetical order produces
   `Cannot find module '<sibling>' or its corresponding type declarations`.
4. **Never publish the literal `workspace:*` protocol** — no consumer outside the
   monorepo can resolve it. `scripts/pin-workspace-deps.mjs` substitutes real
   ranges at pack time; `scripts/restore-pinned-deps.mjs` takes them back out
   afterwards, so only the version bump gets committed.
5. **The registry decides which versions are spent** (`scripts/next-free-version.mjs`).
   npm refuses a PUT for any version it has *ever* seen, including ones staged by
   an interrupted publish that the `latest` dist-tag cannot show you:
   `E409 ... Cannot publish over previously staged version`. The union of
   `versions` and the `time` timeline is the real taken set.

### Trusted publishing (recommended) vs `NPM_TOKEN`

**Trusted publishing (OIDC)** — no secret at all. Leave `NPM_TOKEN` unset. The
job's `id-token: write` permission is traded by npm ≥ 11.5.1 for a short-lived
publish token. For each package, go to
`npmjs.com/package/<name>/access` → **Trusted publisher** and name this
repository plus `npm-publish.yml`. Nothing to rotate, nothing to expire.

**`NPM_TOKEN`** — a granular access token with read-write on the packages. It
expires after 90 days at most, and classic automation tokens no longer work for
direct publishing. Setting the secret selects this path; leaving it unset selects
OIDC.

### Failure decoder

| Symptom | Cause → fix |
| --- | --- |
| `E404` on publish for a package that exists | The credential cannot write. Rotate `NPM_TOKEN`, or finish the trusted-publisher setup for that package. |
| `E409 Cannot publish over previously staged version` | A number the registry reserved. The workflow already retries at the next free version five times; more than that means the registry is refusing everything. |
| `Cannot implicitly apply the latest tag` | The local version fell behind the registry, usually a bump commit that never landed back. The workflow syncs to `latest` and re-evaluates. |
| `EUNSUPPORTEDPROTOCOL workspace:*` | `npm` was run where the workspace's own package manager should have been, or without `--no-workspaces` over its symlinks. |
| `husky: not found` (exit 127) | A dependency ships a broken `prepare: "husky install"`. The no-op husky shim step handles it; do not remove that step. |
| `vite: not found` during a package build | Dependencies were installed with plain `npm` inside a bun/pnpm workspace, which leaves devDependencies uninstalled. |

---

## `auto-merge-claude.yml` — merge agent PRs when they go green

Fires on every PR event and, **only for the actors in its `if:` allowlist**,
enables auto-merge. That allowlist is the entire safety model — edit it to the
accounts you actually want merged unattended, and never widen it to all
contributors.

It tries `gh pr merge --auto` first (GitHub merges once required checks pass) and
falls back to an immediate merge, because `--auto` is rejected outright on a repo
with no branch protection — there is nothing for it to wait on.

Long-lived branches (`production`, `prod`, `staging`, `develop`) are merged
without `--delete-branch`.

---

## `auto-merge-and-create-prs.yml` — the twice-daily sweep

The backstop for two things that fall through the cracks: an agent session that
pushes a branch and never opens a PR, and a PR whose last check finished after
the per-PR workflow had already run.

It merges every open PR that is non-draft, `CLEAN`, not blocked by a requested
change, and whose checks all concluded `SUCCESS`/`SKIPPED`/`NEUTRAL` — a *pending*
check means "not yet", not "merge it". Then it opens a PR for every remote branch
that has neither an open nor a previously merged PR and is not already an ancestor
of the default branch.

It deliberately does not use `actions/checkout`: it needs every remote ref, and
`git init` + a full `git fetch` is cheaper than `fetch-depth: 0`.

---

## `deploy-test-reports.yml` — a test report with a URL

Publishes the Vitest HTML reporter output to Cloudflare Workers on every push to
the default branch, so the Test Report badge links to something current instead of
to a workflow log.

Needs an `apps/test-reports/` directory with a `wrangler.toml` whose
`assets.directory` is `dist`, and a root `test:report` script that writes there.

The test step is `continue-on-error: true` — a red suite is exactly when the
report is worth reading. What it must not do is leave `dist/` missing: wrangler
treats an absent `assets.directory` as a hard error, so the run would end on a
config error instead of on the test signal. The placeholder-page step exists for
that.

---

## Adding your own

Keep the shape the rest of these use:

- `concurrency.group` on anything that pushes or deploys, so two runs cannot race.
- `fail-fast: false` on any matrix where one entry's failure should not hide the
  others' results.
- `if: ${{ !cancelled() }}` rather than `always()` on upload steps.
- A comment at the top saying what the workflow is *for*, and a comment at any
  step whose reason is not obvious from the code. The comments in these files are
  the part that survives; the YAML is the easy half.
