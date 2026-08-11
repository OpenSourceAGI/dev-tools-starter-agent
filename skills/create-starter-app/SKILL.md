---
name: create-starter-app
description: Guide to create-starter-app (packages/create-starter-app), the interactive scaffolder that copies a starter template out of starter-templates/ — the arrow-key menu, how templates are resolved and copied, the package.json rewrite, and which template ids actually exist on disk. Use when working with create-starter-app or troubleshooting it — ENOENT when copying a template, the menu offering a template that isn't there, node_modules being copied, "directory already exists", or the CLI failing when installed from npm instead of run inside the monorepo.
---

# Working With create-starter-app

The scaffolder in `packages/create-starter-app`, published as **`create-starter-app`** (`bun create starter-app` / `npx create-starter-app`). It is deliberately tiny: pick a template from an arrow-key menu, name the project, and it copies a directory.

## Setup

```bash
bun create starter-app     # or: npx create-starter-app
```

Node ≥18, ESM. There are no flags or arguments — everything is prompted.

## How it resolves templates

`bin/create-starter-app.js` resolves `../../../starter-templates` relative to itself, i.e. **the `starter-templates/` directory at the root of this monorepo**. It then:

1. Shows the menu (↑↓ to move, Enter to confirm, `q` to quit).
2. Asks for a project name, defaulting to the template id minus the `template-` prefix.
3. Refuses to continue if that directory already exists.
4. `cpSync`s the template recursively, filtering out `node_modules`, `.next`, and `dist`.
5. Rewrites the copied `package.json`: sets `name` to the project name, sets `private: true`, deletes `version`.

Then it prints the next steps: `cd`, copy `.env.example`, install, `bun dev`.

## Menu entries vs. what exists on disk

The five entries in `TEMPLATES` do not all match directory names under `starter-templates/`:

| Menu id | On disk? |
| --- | --- |
| `template-nextjs-betterauth-shadcn-drizzle` | yes |
| `template-fumadocs` | yes |
| `template-docusaurus` | yes |
| `template-nextjs-betterauth-shadcn-prisma` | **no** — no such directory |
| `template-svelte-betterauth-drizzle-shadcn` | **no** — the directory is `template-svelte-betterauth-shadcn-drizzle` (word order differs) |

`starter-templates/template-vinext-betterauth-shadcn-themes-teams-stripe` exists but is **not** in the menu. Picking one of the two mismatched entries throws `ENOENT` from `cpSync`. Fixing it means editing the `id` fields in `TEMPLATES` (or renaming the directories) — the menu labels are decorative, only `id` is used for the path.

## Recipes

**Scaffold without the CLI** — since it's a plain recursive copy, this is equivalent:

```bash
cp -r starter-templates/template-fumadocs my-docs && cd my-docs
# then edit package.json name/version yourself
```

**Add a template** — create the directory under `starter-templates/`, then add an entry to `TEMPLATES` in `bin/create-starter-app.js` whose `id` is exactly the directory name.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `ENOENT … starter-templates/template-…` | The chosen menu entry's `id` doesn't match a real directory (see the table above). Pick a working template or correct the id. |
| Works in the repo, breaks when installed from npm | The path climbs three levels out of the package to reach the monorepo's `starter-templates/`, and `files` only publishes `bin` and `starters` (a directory that doesn't exist). From a global/npx install there's nothing to copy — run it from a checkout. |
| `Error: directory "x" already exists` | By design; it never merges into an existing directory. Choose another name or remove the old one. |
| Copied project contains `node_modules` | Only `node_modules`, `.next`, and `dist` are filtered, and only by substring match. Other build output (`.svelte-kit`, `.turbo`, `coverage`) comes along — delete it after copying. |
| Menu doesn't respond to arrow keys | It reads raw stdin; it needs a real TTY. It won't work through a pipe, in a non-interactive CI step, or inside some editor terminals. |
| `version` missing from the new `package.json` | Intentional — it's deleted so you set your own. `private: true` is also set to prevent accidental publishes. |
| The generated app won't start | Templates carry their own prerequisites (`.env.example` values, a database, a Cloudflare account). Read the template's own README before `bun dev`. |
