# CLAUDE.md — Dev Tools Starter Agent

Orientation for Claude agents working in this repository. Read this first; the
detailed notes live in [`.claude/architecture/`](.claude/architecture/) and are
linked from each section below.

A **Bun + Turborepo monorepo**, but *not* one product. This is a **catalog of
independent developer tools** — ~16 npm packages, four apps, six starter
templates, and one agent skill per package — that happen to share an install,
a CI pipeline, and a docs site.

That shape drives everything below: a change here usually belongs to exactly
one package and should not ripple. There is no shared runtime, no shared
database, and very little cross-package importing.

## Ground rules

1. **Bun, never npm or yarn.** `packageManager` pins `bun@1.3.11`.
2. **One package per change.** These tools ship separately and are versioned
   separately. Do not refactor across package boundaries to "share" something
   unless the sharing is the point of the PR.
3. **The directory name is not the npm name.** `git0-repo-downloader` publishes
   as `git0`; `about-system-info` as `about-system`; `open-when-ready` as
   `open-ready`. Turbo filters take the **npm name**. See
   [`architecture/monorepo.md`](.claude/architecture/monorepo.md#names).
4. **Package README headers are generated.** The badge row and the skill-install
   line at the top of every `packages/*/README.md` come from
   `bun run readmes` — hand-edits are overwritten and CI fails on
   `bun run readmes:check`. Edit the prose *below* the generated header.
5. **Every package has an agent skill** under [`skills/`](skills/), written from
   the source. Read the package's skill before re-deriving how it works, and
   update it when public behaviour changes.
6. **Each package brings its own test runner.** Mostly Vitest, but `git0` uses
   `bun test` and `web2mobile-wrapper` uses Jest. Don't standardize them as a
   drive-by.
7. **`starter-templates/` is not a workspace.** Those are scaffolds copied out
   by `create-starter-app`, not built here. See
   [`architecture/templates.md`](.claude/architecture/templates.md).
8. **Never commit secrets**, API keys, or build output.

## Where things live

| You want to change… | Go to |
| --- | --- |
| A published CLI or library | `packages/<tool>` — and its skill in `skills/<name>` |
| The docs site | `apps/docs` (Fumadocs + Next.js; the one Biome workspace) |
| Cloud infra dashboard | `apps/Cloud-Computer-Control-Panel` (+ `apps/cccp-vscode-ext`) |
| Per-user VS Code on Cloudflare Containers | `apps/vscode-cloud` |
| A scaffold that users copy out | `starter-templates/<template>` |
| The generated README headers | `scripts/sync-package-readmes.mjs` |

Full catalog: [`architecture/overview.md`](.claude/architecture/overview.md).

## Commands

```bash
bun install
bun run build                  # turbo run build across the graph
bun run test                   # turbo run test
bun run typecheck
bun run coverage
bun run readmes                # regenerate package README headers
bun run readmes:check          # what CI runs — fails if a header is stale
bun run docs:sync              # pull package READMEs into the docs site

bunx turbo run test --filter=manage-storage     # by npm name, not directory
```

## Before you open a PR

- Run the touched package's own suite (`cd packages/<dir> && bun run test`).
- Run `bun run readmes:check` if you touched a `package.json` or a README.
- Update the package's `skills/<name>/SKILL.md` when public behaviour changes —
  the skills are the documentation users actually load.
- Bump the package version if it publishes; see
  [`architecture/publishing.md`](.claude/architecture/publishing.md).
- Commit style is **gitmoji + conventional commits**:
  `✨ feat(scope): what changed`. Scope is the package's npm name.
- Target `master`. Keep the PR focused; no drive-by refactors.

## Detailed notes

| Note | Covers |
| --- | --- |
| [overview.md](.claude/architecture/overview.md) | The full catalog — every package, app and what it owns |
| [monorepo.md](.claude/architecture/monorepo.md) | Workspaces, the name mismatch, turbo, the `dist` trap, the runner zoo |
| [publishing.md](.claude/architecture/publishing.md) | npm publishing, versioning, the generated README headers |
| [documentation.md](.claude/architecture/documentation.md) | The docs site, the skills convention, how README → docs sync works |
| [templates.md](.claude/architecture/templates.md) | `starter-templates/` and the CLIs that consume them |
| [conventions.md](.claude/architecture/conventions.md) | Code style, commits, PRs, CI, security |
