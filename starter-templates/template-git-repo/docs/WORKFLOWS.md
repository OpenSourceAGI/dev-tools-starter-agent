# The workflows

Five files in `.github/workflows`, plus one helper script. Each is described
here by what it does, what it needs, and how it fails — the failure modes are
the part that costs hours if you meet them cold.

| Workflow | Trigger | Needs |
| --- | --- | --- |
| `tests.yml` | PR, push to default branch | `CODECOV_TOKEN` |
| `npm-publish.yml` | push to default branch | `NPM_TOKEN` *or* trusted publishing |
| `deploy-test-reports.yml` | push to default branch | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| `auto-merge-claude.yml` | PR opened/updated | `GIT_TOKEN`, "Allow auto-merge" |
| `auto-merge-and-create-prs.yml` | every 12h, manual | `GIT_TOKEN` |

---

## tests.yml

Discovers every workspace package with a `test:ci` script, runs each as its own
matrix job, and uploads results to Codecov Test Analytics and coverage to
Codecov.

**Why the matrix is discovered rather than listed.** A hand-maintained matrix
goes stale the first time someone adds a package and forgets to edit the
workflow — the package silently has no CI. A `discover` job emits the list as
JSON; the `test` job consumes it through `fromJSON`. GitHub cannot compute a
matrix inside the job that uses it, which is why it is two jobs.

**What your package must produce.** Relative to the package directory:

```
junit.xml            test results — what Test Analytics ingests
coverage/lcov.info   coverage — uploaded when the runner can produce it
```

For Vitest:

```json
"test:ci": "vitest run --reporter=junit --outputFile=junit.xml --coverage"
```

**Details that matter:**

- `fail-fast: false` — one package's red suite must not cancel the other jobs
  before they upload. Their results are the ones you need to compare against.
- `if: ${{ !cancelled() }}` on both upload steps, not `if: success()`. Without
  it, the upload is skipped on exactly the runs whose results matter most.
- `bun install --ignore-scripts` — postinstall hooks in a workspace tend to want
  env vars CI does not have (database URLs, Tauri toolchains, doc generators),
  and none of them affect tests.
- Tests run through `bunx turbo run test:ci --filter=...` rather than `cd` +
  `bun test`, so a package that imports a sibling through its built `dist` gets
  that sibling built first.

**Failure modes:**

| Symptom | Cause → fix |
| --- | --- |
| A package you added never appears as a job | It has no `test:ci` script, or it lives outside `packages/`, `apps/` |
| `Error: Unable to process file command 'output'` in `discover` | A package name contains a newline or the JSON exceeded the 1MB output cap |
| Codecov shows the run but no coverage | The runner wrote no `lcov.info` — `--coverage` missing, or a provider that writes nothing on your Node version |
| Coverage drops to 0% for an untouched package | `carryforward` is off for that flag in `codecov.yml` |

## npm-publish.yml

Publishes every non-private workspace package **whose content changed**, then
commits the version bumps back.

**The rule it exists to enforce:** nobody has to remember a version number. Each
package is packed with `npm pack --dry-run --json` and its integrity hash
compared against `npm view <pkg>@<version> dist.integrity`. npm tarballs are
reproducible (mtimes are normalized), so identical hashes mean nothing to
release; a different hash means bump the patch and publish.

**Credentials — two supported paths:**

1. **Trusted publishing (OIDC), preferred.** No secret at all. npm ≥ 11.5.1
   trades the job's `id-token` for a short-lived publish token. Each package
   must name this repo + workflow as its trusted publisher at
   `npmjs.com/package/<name>/access`. Nothing to rotate.
2. **`NPM_TOKEN` secret.** A granular access token with write access. These
   expire after at most 90 days; classic automation tokens no longer work for
   direct publishing.

Setting the secret picks (2); leaving it unset picks (1).

**Why the credential is checked in its own step, before anything is built.** npm
answers an *unauthorized* PUT with `E404 ... could not be found or you do not
have permission to access it` — which reads like a missing package, not a
permissions problem. Without the preflight you pay a full build for every
package before the first one hits it, and each failed attempt still signs a
provenance statement into the public sigstore transparency log.

**Details that matter:**

- `set +e` in the publish loop. GitHub runs `run:` steps with `bash -e -o
  pipefail`, so *not* writing `set -e` does not disable errexit — the first
  failing package would kill the step and leave every later package unevaluated.
  Outcomes travel through `$rc`; the step still exits non-zero at the end.
- Exit 43 means "npm rejected the credential". The loop stops attempting further
  packages: they would all fail the same way, after another build and another
  provenance signature each.
- `workspace:*` dependencies are rewritten to real semver ranges before packing.
  npm keeps the literal protocol in the tarball, and consumers cannot resolve it.
  Only the `version` field of that edit is committed back.
- A local version *behind* the registry is synced forward first, otherwise the
  publish fails with "Cannot implicitly apply the latest tag".
- `E409 cannot publish over previously staged version` is retried at the next
  free version, up to five times. `latest` lags versions an interrupted publish
  reserved; `.github/scripts/next-free-version.mjs` reads the full version list
  *and* the release timeline, which is where those numbers appear.
- The final step rewrites only the `version` field back into each
  `package.json`, by regex rather than by re-serializing the parsed object, so
  the file keeps its own formatting. It matches `"version"\s*:\s*"..."` rather
  than a literal `"version": "x"`, and fails the step if the replace found
  nothing — a package.json written without the space after the colon would
  otherwise silently lose the bump while the log claimed to keep it.
- The bump commit ends in `[skip ci]` so it does not retrigger the workflow.
- A no-op `husky` is put on PATH. Some published dependencies ship
  `prepare: "husky install"`; when npm reconciles bun's linked `node_modules` it
  runs that hook and dies with exit 127 — and `--ignore-scripts` does **not**
  suppress it for bun-linked packages.

**Failure modes:**

| Symptom | Cause → fix |
| --- | --- |
| `E404` on publish for a package that exists | The credential cannot write to it. Read the error annotation the workflow emits |
| `EUNSUPPORTEDPROTOCOL workspace:*` | An `npm` command ran without `--no-workspaces` against bun's symlinks |
| `vite: not found` during build | Someone replaced `bun install` with `npm install`; npm cannot install a bun workspace |
| Versions bump on every run | The build is not reproducible — a timestamp or absolute path is landing in `dist` |
| Nothing publishes, no errors | Every package is `private: true`, or content genuinely did not change |

## deploy-test-reports.yml

Runs the whole suite with Vitest's HTML reporter and deploys the result to
Cloudflare Workers, so the report has a permanent URL.

**The two non-obvious parts:**

- `continue-on-error: true` on the test step. A red suite must still publish its
  report — that report is how you see what went red.
- The "Ensure a report exists to deploy" step. What a red suite must *not* do is
  leave `dist` missing: `wrangler deploy` treats an absent `assets.directory` as
  a hard error, so the run would end on a config error instead of on the test
  signal. A placeholder page is written instead.

**The reporter gotcha.** Vitest's HTML reporter ignores `outputFile` and writes
`<outputDir>/index.html` plus a UI bundle, where `outputDir` is a *reporter
option* defaulting to `.vitest`. A reporter named on the command line
(`--reporter=html`) is constructed without options and silently keeps that
default — so the deploy finds nothing. `vitest.config.ts` declares the reporter
and its destination together, keyed off `VITEST_HTML_REPORT_DIR`; `test:report`
sets it.

## auto-merge-claude.yml

Enables auto-merge on PRs opened by trusted agents and maintainers.

`gh pr merge --auto` is the safe path: GitHub holds the merge until branch
protection is satisfied. It works **only** when both are true:

- "Allow auto-merge" is on in Settings → General → Pull Requests, and
- the base branch has protection with at least one **required** status check.

Without both, GitHub rejects `--auto` and the fallback merges immediately —
without waiting for CI. That is why the actor allowlist in the `if:` matters,
and why you should turn on branch protection before turning on this workflow.

It uses `GIT_TOKEN` (a PAT) rather than `GITHUB_TOKEN` deliberately: merges made
with `GITHUB_TOKEN` do not trigger further workflows, so the publish and deploy
runs on the default branch would never fire.

Branches named `production`, `prod`, `staging` or `develop` are merged without
`--delete-branch`.

## auto-merge-and-create-prs.yml

A twice-daily sweep that merges PRs already clean/approved/green, and opens a PR
for any pushed branch that never got one. Both halves are idempotent, so a
delayed or duplicated run is harmless — and scheduled workflows **are** delayed,
sometimes by hours, during periods of high Actions load. Never rely on the exact
minute.

A *merged* PR counts when checking whether a branch already has one: reopening a
PR for a branch whose work already landed creates an empty, permanently open PR.

The second step deliberately skips `actions/checkout` — it only needs refs, so
it fetches them into an empty workspace rather than paying for a full checkout.

---

## Adapting these to another repo

- **Different package manager.** Replace `oven-sh/setup-bun@v2` with
  `actions/setup-node@v4` and the `bun install --ignore-scripts` /
  `bunx turbo` lines with `npm ci --ignore-scripts` / `npx turbo`. The publish
  loop's `--no-workspaces` flags exist for bun's symlinks and are harmless
  otherwise.
- **Not a monorepo.** `tests.yml`'s discovery finds nothing; either add a
  `packages/` layout, or replace the matrix with a single job that runs
  `npm run test:ci` at the root.
- **`main` instead of `master`.** Every `branches:` filter in this template is
  written by `setup-git-repo` from your repo's actual default branch. If you
  rename the branch later, grep the workflows for the old name.
