# Changelog

A month-by-month summary of this repository's history, generated from `git log`. Each month is a bullet list, one bullet per change.

## October 2026

- Added a **live demo page** to `code-tree-graph` and made it deployable on Vercel.
- Rendered **Terms, Privacy, and Security policies separately** in `legal-terms`.
- Added **Google Cloud Storage** and a live demo to `manage-storage`.
- Made the `ask-ai-button` demo deployable on Vercel.
- Spun the **Fumadocs Ask AI dropdown** out into its own package (#117).
- Added a **hero parallax package showcase** to the `dev-tools-help-docs` homepage (#116).
- Split the docs site into sections and moved search to the sidebar (#115).
- Fixed `git0` file-manager sort to break ties by name (#114).
- Added turbo-generated **AGENTS.md agent guidance** to the repo.
- Declared **Codecov flags** for newly covered packages.
- Added tests for `react-app-store-buttons`, `export-svg-typescript`, `cloudflare-to-claude-fix`, `create-starter-app`, `create-cloud-db`, `verify-phone-sms`, `native-app-wrapper`, `open-ready`, `code-tree-graph`, `git0`, and `about-system`.
- Added a **starter templates comparison page** and renamed the Vinext template to `template-nextjs-harness-cloudflare`.
- Added a branches-count badge to the README.

## September 2026

- Added **partial downloads and lazy history attachment** to `git0` (#106).
- Installed `--ignore-scripts` for the `git0` test job in CI (#107).
- Added **Yazi file manager** to `server-shell-setup` and a web dashboard for `about-system` (#110).
- Made `open-ready` serve apps at `https://<name>.localhost` via portless by default.
- Added a **cookie consent banner** to `legal-terms` alongside the policy (#109).
- Added **persistent Google sign-in** replay across tests in `test-google-login` (#103).
- Greened the `web2mobile-wrapper` and `verify-phone-sms` test suites (#102).
- Gave **every app a README** with env vars, setup, and deploy instructions (#101).
- Added `template-git-repo` with a **four-row badge block** showing GitHub activity counts (#98, #75, #76).
- Renamed `apps/docs` to `apps/dev-tools-help-docs` (#97).
- Fixed the **Groq client breaking `next build`** (#96).
- Added an **"Open in StackBlitz" badge** to every generated badge row (#95).
- Ran the `legal-terms-privacy-policy` suite in CI (#94).
- Added a **SECURITY.md** with private vulnerability reporting policy (#93).
- Added `.claude/` agent docs and per-workspace `CLAUDE.md` files (#92).
- Kept **dashboard-set Cloudflare Worker variables** across deploys (#91).
- Added the `legal-terms-privacy-policy` package and its skill (#89, #90).
- Rebuilt the **README badge block** from the qwksearch template multiple times (#83, #85, #88).
- Grouped **GRAB features by category** in the README (#87).
- Dropped the `ask-` prefix from skill names (#84).
- Ran `git0` platform tests under **Vitest instead of `bun:test`** (#81).
- Stopped the **PR sweep from failing** when no branch needs a PR (#80).
- Reformatted the **AI changelog as bullet points** (#79).
- Published `verify-phone-sms` under its shipping npm name and added download badges (#78).
- Extracted workflow inline node into **tested scripts** for `template-git-repo` (#77).
- Fixed CI to **resolve publish versions from npm** instead of the working tree (#74).
- Added a **scheduled auto-merge and missing-PR creation** workflow (#73).
- Covered `about-system-info` cache and shell helpers in CI (#72).
- Documented **native desktop builds** for every desktop system (#71).
- Hosted **every package README at `/docs`** instead of starterdocs.js.org (#70).
- Fixed **stale URLs and package names** in READMEs (#69).
- Grouped the **GRAB features grid into categories** (#65).
- Moved **npm monthly download badges** to the start of item lines (#64).
- Brought the **Cloud Computer Control Panel into the VS Code sidebar** (#60).
- Reported **test results to Codecov Test Analytics** (#63).
- Failed fast on **bad npm credentials** and stopped version drift (#58).
- Declared `drizzle-orm` as a dependency for CCCP.
- Enlarged the **region globe** and restructured the region section layout.
- Added a **Turborepo root** with per-package Vitest and Codecov.
- Moved **comparison ranking pages** to the Rights Institute docs (#57).
- Made the **shadcn-theme-menu font follow the theme** (#56).
- Packaged a website or CLI as a **native app** and shipped `about-system` as one (#55).
- Added **sign-in and an encrypted credentials database** to CCCP (#54).
- Added an **interactive globe visualization** to region selection (#53).
- Added an **interactive KineticGrid backdrop** to the docs hero (#52).
- Fixed `about-system-info` build by setting `moduleResolution` to `bundler` (#51).
- Added **badges and banners** to the `open-ready` README (#50).
- Added **missing keywords** to package.json files and a PRs Welcome badge to package READMEs (#49).
- Fixed `about-system` colors for **light backgrounds** and added background badges (#48).
- Added this **monthly changelog** file (#47).

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
