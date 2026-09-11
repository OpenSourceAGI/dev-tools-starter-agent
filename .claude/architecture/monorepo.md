# Monorepo Mechanics

## Workspaces

```json
"workspaces": ["packages/*", "apps/*"]
```

Not in that list: **`starter-templates/`** (scaffolds, see [templates.md](templates.md)),
**`skills/`** (agent skills, see [documentation.md](documentation.md)), and
**`packages/server-shell-setup`** (shell scripts, no `package.json` — it sits
under `packages/` but is not a workspace).

## Names

The single most common way to waste time here: **the directory name is not the
package name**, and turbo filters on the package name.

| Directory | npm name |
| --- | --- |
| `about-system-info` | `about-system` |
| `api2ai-mcp-generator` | `api2ai` |
| `export-svg-icons-typescript` | `export-svg-typescript` |
| `git0-repo-downloader` | `git0` |
| `open-when-ready` | `open-ready` |
| `web2mobile-wrapper` | `create-mobile-wrapper` |

```bash
bunx turbo run test --filter=git0                    # works
bunx turbo run test --filter=git0-repo-downloader    # matches nothing
bunx turbo run test --filter=./packages/git0-repo-downloader   # also works — by path
```

Skill names are a third spelling again (`skills/git0`, `skills/about-system`) —
see the table in [`skills/README.md`](../../skills/README.md).

## The `dist` trap

Packages with a build step are consumed as built output (`dist/`), not `src/`.
`bun run build` runs `turbo run build` with `dependsOn: ["^build"]`, so
dependencies build first — but `dev` does not rebuild them on the fly. If an
edit "doesn't show up", rebuild that package.

Several packages have **no build step at all** and ship source directly
(`create-cloud-db`, `create-starter-app`, `export-svg-icons-typescript`,
`open-when-ready`, `setup-git-repo`, `template-git-repo`,
`legal-terms-privacy-policy`, `native-app-wrapper`, `web2mobile-wrapper`;
`verify-phone-sms`'s build is a literal `echo`). For those, `src` *is* the
artifact — which means a syntax error ships. Check `package.json` before
assuming either way.

Build tools differ too: Vite for `about-system-info`, `code-tree-graph`,
`manage-storage`, `react-app-store-buttons`; `bun build` for `git0`; `next build`
for `api2ai`.

## Turbo task graph

| Task | Notes |
| --- | --- |
| `build` | `dependsOn: ["^build"]`; outputs `dist/`, `.next/` (minus cache), `build/` |
| `test` | `dependsOn: ["^build"]`, no outputs |
| `lint`, `typecheck` | `dependsOn: ["^build"]` |
| `coverage` | `dependsOn: ["^build"]`; outputs `coverage/` |
| `dev`, `test:watch` | `cache: false`, `persistent: true` |
| `clean` | `cache: false` |

`codecov.yml` is a `globalDependency` — editing it busts the whole cache, on
purpose.

## The runner zoo

Each package brings its own runner. This is deliberate: they were adopted from
different places and publish independently.

| Runner | Packages |
| --- | --- |
| Vitest | most of them |
| `bun test` | `git0-repo-downloader` |
| Jest | `web2mobile-wrapper` |
| none | `server-shell-setup` (no manifest), `api-*` generated code |

Do not "unify" them as a drive-by. If you are in a package, run its own script:

```bash
cd packages/manage-storage && bun run test
```

## Two test workflows

Both exist and they do different things:

- **`tests.yml`** — an explicit matrix, one entry per package, each carrying its
  own `runtime`, `install` and `dir`. Runs `test:ci`, uploads `junit.xml` to
  Codecov Test Analytics and `coverage/lcov.info` under a per-package **flag**.
  `continue-on-error` is per-entry via `allow-failure`.
- **`test.yml`** — a turbo-driven matrix: `bun install --ignore-scripts`, then
  `bunx turbo run coverage --filter=./packages/<pkg>`.

Adding a package with tests means adding it to the `tests.yml` matrix *and*
giving it a flag in [`codecov.yml`](../../codecov.yml) — flags use
`carryforward: true`, so a package that skips a run keeps its last known
coverage instead of reading as a drop.

Coverage statuses are **informational** and `require_ci_to_pass: false`.
Coverage never blocks a merge here; Test Analytics (failed-test comments, the
flake dashboard) is the part meant to be acted on.
