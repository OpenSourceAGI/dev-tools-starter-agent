---
name: code-tree-graph
description: Guide to code-tree-graph (packages/code-tree-graph), the dependency-graph and file-tree components for Fumadocs/Next.js — mounting DependencyGraph, FileTreeView and TypeTable, the AST engine (generateFileTree, analyzeFileContent, parseIgnoreFile), path resolution, ignore patterns, and the CSS import. Use when working with code-tree-graph or troubleshooting it — an empty or one-node graph, "window is not defined" / hydration errors from Mermaid, unstyled tables, paths that resolve differently in dev and build, or GitHub links pointing at the wrong file.
---

# Working With code-tree-graph

The React components in `packages/code-tree-graph`, published as **`code-tree-graph`**. It parses TypeScript/JS with `@typescript-eslint/typescript-estree` at build time and renders the result as a Mermaid flowchart or a searchable file table. Full prop tables and node types live in [API.md](API.md).

## Setup

Three pieces:

1. `npm i code-tree-graph`, with `react`, `react-dom`, `next`, and `fumadocs-core` present as peers.
2. **Import the stylesheet once** at the app root: `import "code-tree-graph/dist/index.css"`. Without it the tree table and tooltips render unstyled.
3. Use the components from a **server** component or MDX page. `DependencyGraph` and `FileTreeView` read the filesystem during render; only `TypeTable` (and the graph's interactive layer) is client-side.

## Picking the right component

| You want | Component |
| --- | --- |
| A visual map of what imports what | `<DependencyGraph paths={[…]} />` |
| A browsable table of files with exports/imports/JSDoc | `<FileTreeView paths={[…]} ghBase="https://github.com/…/tree/master/pkg" />` |
| A prop/property table inside docs prose | `<TypeTable type={{ name: { type, description, required } }} />` |
| The parsed data, no UI | `generateFileTree(dir, descriptions, ignorePatterns, inferDescriptions)` |
| To analyze source you already have in memory | `analyzeFileContent(filename, sourceText)` |
| A `.gitignore`-style exclusion file | `parseIgnoreFile(path)` → pass the returned `Set` as `ignorePatterns` |

## Recipes

**Scoping the scan** — `paths` are absolute or relative to `process.cwd()`, which for Next.js is the app directory, *not* the MDX file. In a monorepo that usually means `["../packages/core"]` from `apps/docs`. Verify the same relative path resolves under `next build`, which may run from a different cwd than `next dev`.

**Trimming the graph** — the node-type toggles all default to `false` (`showNpmImports`, `showTypes`, `showPrivateFunctions`, `showExportedFunctions`), so an out-of-the-box graph shows modules and their local imports only. Turn one on at a time; enabling all of them on a large package produces an unreadable chart.

**Descriptions** — `inferDescriptions` (default `true` on `FileTreeView`) pulls the leading JSDoc/comment of each file. Override individual entries with the `descriptions` map, keyed by path relative to the scanned root.

**GitHub deep links** — `ghBase` must point at the *tree* URL for the same directory you scanned (`https://github.com/user/repo/tree/master/packages/my-lib`), because file paths are appended to it verbatim.

**Ignoring files** — `ignore` takes names and patterns (`["node_modules", "dist", "*.test.ts"]`); `ignoreFile` points at a `.treeignore` parsed with gitignore semantics. Both feed the same exclusion set.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Graph or tree renders empty | `paths` resolved to a directory that doesn't exist from the current cwd, or everything in it matched `ignore`. Log the resolved absolute path first; relative paths are resolved against `process.cwd()`. |
| Only one node, no edges | The scanned files import across package boundaries only. Local edges come from relative imports; cross-package edges show up as npm nodes — enable `showNpmImports`. |
| `window is not defined` / `document is not defined` | Mermaid rendering leaked into the server pass. Keep `DependencyGraph` in a server component and let its client child handle rendering; don't wrap it in your own `"use client"` file. |
| Hydration mismatch on the graph | Same cause — the SVG is produced on the client after mount. Don't render Mermaid output during SSR or snapshot it into server HTML. |
| Tables/tooltips look unstyled | `code-tree-graph/dist/index.css` was never imported, or your bundler dropped it. Import it in the root layout. |
| `fs`/`path` errors during build | A component that reads the filesystem got pulled into a client bundle. Only `TypeTable` is safe to import from `"use client"` code. |
| GitHub links 404 | `ghBase` points at the repo root instead of the scanned subdirectory, or at `blob/` instead of `tree/`. |
| Scan is slow on a big repo | Every file is parsed to an AST. Narrow `paths`, and exclude `node_modules`, `dist`, `.next`, and test files via `ignore`/`ignoreFile`. |
| Search finds nothing | Fuse.js fuzzy-matches names, imports, exports, JSDoc, and signatures — if descriptions were never inferred (`inferDescriptions={false}`) there's less to match. |
