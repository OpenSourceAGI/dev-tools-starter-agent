# Changelog

A month-by-month summary of this repository's history, generated from `git log`. Each month is a bullet list, one bullet per change.

## August 2026

- Added **macOS support** for hardware and system-info functions (memory, disk, and CPU retrieval), replacing an obsolete verification script, and gave the info-block renderer character-filled, mid-block-wrapping lines (#41).
- Shipped **`feat(skills)`: an agent skill for every package** (#40) — one skill per package under `skills/`, each with YAML-frontmatter trigger descriptions, setup steps, recipes, and a troubleshooting table.
- Added an exhaustive `API.md` to the larger packages (`about-system`, `manage-storage`, `code-tree-graph`, `verify-phone-sms`, `api2ai`).
- Gave the **FumaDocs template** new API routes for documentation search and LLM text generation, refreshed CSS variables, improved search functionality, and removed its obsolete middleware.
- Refactored `get-node.sh` (#42).
- Added a `curl` install one-liner to the README.
- Expanded `server-shell-setup`'s README with a full command reference (#43).
- Linked the `api2ai` docs to their hosted site (#44).
- Added npm monthly-download badges to the package listings (#45, #46).
- Rounded out the package.json changes with disk-size reporting and updated repository URLs, alongside the usual automated version bumps throughout the month.

## July 2026

- Fixed npm publish/provenance failures in **code-tree-graph** and updated repo URLs after the project moved to `starter-app-dev-tools` (#36, #37), alongside Vite config and import-path fixes and a merge-conflict resolution.
- Overhauled the **server-shell-setup** installer — corrected URLs, improved Node/Bun setup, and added password management (#33).
- Updated **vscode-cloud**'s container image to install Bun alongside Node.js (#34, #35).
- Refactored the Next.js starter template for readability, stripped unused files and dependencies, and added MDX components for FumaDocs (Tabs, File, Folder, APIPage) plus an "open-when-ready" log.
- Enhanced benchmark-file handling and Vite copy logic, including detailed CPU benchmark info added to `SystemInfo`.
- Updated project licensing to **PROSPER 1.0.0** with clarified usage rights.
- Updated the Claude auto-merge workflow.
- Gave the info-block renderer character-filled wrapping (#38).
- Introduced this file's own monthly-changelog format (#32).
- Ran automated `chore: bump package versions` commits after most merges.

## June 2026

- Brought in the full existing project through a large merge — CI workflows (`npm-publish`, `auto-merge-claude`), license and README, the **Cloud Computer Control Panel** app, and the full set of starter packages — establishing the codebase this changelog now tracks and the point where its visible history begins.
- Added a README for `react-app-store-buttons`.
- Simplified the default-shell change command in `server-shell-setup`'s `install-shell.sh`.
- Ran automated package version bumps throughout the month.
