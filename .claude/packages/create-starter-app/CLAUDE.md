# CLAUDE.md — `create-starter-app`

**skill:** [`skills/create-starter-app`](../../../skills/create-starter-app/SKILL.md)
· **runner:** Vitest · **build:** none — `bin/create-starter-app.js` ships as-is

An interactive CLI that scaffolds a project by copying a directory out of the
repo-root `starter-templates/`.

## Two known drifts — read before you debug

Full detail in [`../../architecture/templates.md`](../../architecture/templates.md).

1. **The hardcoded id list disagrees with the directories.** The menu offers
   `template-nextjs-betterauth-shadcn-prisma` (doesn't exist) and
   `template-svelte-betterauth-drizzle-shadcn` (the directory is
   `…-shadcn-drizzle`), and omits `template-git-repo` and
   `template-vinext-betterauth-shadcn-themes-teams-stripe`, which do exist.
2. **The published package cannot reach the templates.**
   `STARTERS_DIR = join(__dirname, "../../../starter-templates")` resolves to the
   repo root — fine in the monorepo, outside the tarball once installed.
   `files` declares `["bin", "starters"]` and there is no `starters/`.

Neither is fixed. If your task is one of them, it is a real design decision
(vendor the templates, or fetch from GitHub) — raise it, don't guess.

## Rules

- **Adding a template is two edits**: the directory *and* the descriptor in
  `bin/create-starter-app.js`.
- It writes into a user's chosen directory. Keep the existing overwrite
  confirmations.

```bash
cd packages/create-starter-app && bun run test
```
