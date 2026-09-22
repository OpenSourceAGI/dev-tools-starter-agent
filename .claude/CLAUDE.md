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
   `bun test`. Don't standardize them as a drive-by.
7. **`starter-templates/` is not a workspace.** Those are scaffolds copied out
   by `create-starter-app`, not built here. See
   [`architecture/templates.md`](.claude/architecture/templates.md).
8. **Never commit secrets**, API keys, or build output.

## Where things live

| You want to change… | Go to |
| --- | --- |
| A published CLI or library | `packages/<tool>` — and its skill in `skills/<name>` |
| The docs site | `apps/dev-tools-help-docs` (Fumadocs + Next.js; the one Biome workspace) |
| Cloud infra dashboard | `apps/Cloud-Computer-Control-Panel` (+ `apps/cccp-vscode-ext`) |
| Per-user VS Code on Cloudflare Containers | `apps/vscode-cloud` |
| A scaffold that users copy out | `starter-templates/<template>` |
| The generated README headers | `.github/scripts/sync-package-readmes.mjs` |

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

## Per-workspace notes

Every app and package keeps its own note. They live under `.claude/`
mirroring the workspace path — `packages/manage-storage` is documented in
`.claude/packages/manage-storage/CLAUDE.md` — so every agent instruction in the repo sits in
one tree rather than beside the source.

| Workspace | Note |
| --- | --- |
| `apps/Cloud-Computer-Control-Panel` | [.claude/apps/Cloud-Computer-Control-Panel/CLAUDE.md](.claude/apps/Cloud-Computer-Control-Panel/CLAUDE.md) |
| `apps/cccp-vscode-ext` | [.claude/apps/cccp-vscode-ext/CLAUDE.md](.claude/apps/cccp-vscode-ext/CLAUDE.md) |
| `apps/dev-tools-help-docs` | [.claude/apps/dev-tools-help-docs/CLAUDE.md](.claude/apps/dev-tools-help-docs/CLAUDE.md) |
| `apps/vscode-cloud` | [.claude/apps/vscode-cloud/CLAUDE.md](.claude/apps/vscode-cloud/CLAUDE.md) |
| `packages/about-system-info` | [.claude/packages/about-system-info/CLAUDE.md](.claude/packages/about-system-info/CLAUDE.md) |
| `packages/api2ai-mcp-generator` | [.claude/packages/api2ai-mcp-generator/CLAUDE.md](.claude/packages/api2ai-mcp-generator/CLAUDE.md) |
| `packages/cloudflare-to-claude-fix` | [.claude/packages/cloudflare-to-claude-fix/CLAUDE.md](.claude/packages/cloudflare-to-claude-fix/CLAUDE.md) |
| `packages/code-tree-graph` | [.claude/packages/code-tree-graph/CLAUDE.md](.claude/packages/code-tree-graph/CLAUDE.md) |
| `packages/create-cloud-db` | [.claude/packages/create-cloud-db/CLAUDE.md](.claude/packages/create-cloud-db/CLAUDE.md) |
| `packages/create-starter-app` | [.claude/packages/create-starter-app/CLAUDE.md](.claude/packages/create-starter-app/CLAUDE.md) |
| `packages/export-svg-icons-typescript` | [.claude/packages/export-svg-icons-typescript/CLAUDE.md](.claude/packages/export-svg-icons-typescript/CLAUDE.md) |
| `packages/git0-repo-downloader` | [.claude/packages/git0-repo-downloader/CLAUDE.md](.claude/packages/git0-repo-downloader/CLAUDE.md) |
| `packages/legal-terms-privacy-policy` | [.claude/packages/legal-terms-privacy-policy/CLAUDE.md](.claude/packages/legal-terms-privacy-policy/CLAUDE.md) |
| `packages/manage-storage` | [.claude/packages/manage-storage/CLAUDE.md](.claude/packages/manage-storage/CLAUDE.md) |
| `packages/native-app-wrapper` | [.claude/packages/native-app-wrapper/CLAUDE.md](.claude/packages/native-app-wrapper/CLAUDE.md) |
| `packages/open-when-ready` | [.claude/packages/open-when-ready/CLAUDE.md](.claude/packages/open-when-ready/CLAUDE.md) |
| `packages/react-app-store-buttons` | [.claude/packages/react-app-store-buttons/CLAUDE.md](.claude/packages/react-app-store-buttons/CLAUDE.md) |
| `packages/server-shell-setup` | [.claude/packages/server-shell-setup/CLAUDE.md](.claude/packages/server-shell-setup/CLAUDE.md) |
| `packages/setup-git-repo` | [.claude/packages/setup-git-repo/CLAUDE.md](.claude/packages/setup-git-repo/CLAUDE.md) |
| `packages/template-git-repo` | [.claude/packages/template-git-repo/CLAUDE.md](.claude/packages/template-git-repo/CLAUDE.md) |
| `packages/test-google-login` | [.claude/packages/test-google-login/CLAUDE.md](.claude/packages/test-google-login/CLAUDE.md) |
| `packages/verify-phone-sms` | [.claude/packages/verify-phone-sms/CLAUDE.md](.claude/packages/verify-phone-sms/CLAUDE.md) |
| `packages/web2mobile-wrapper` | [.claude/packages/web2mobile-wrapper/CLAUDE.md](.claude/packages/web2mobile-wrapper/CLAUDE.md) |
