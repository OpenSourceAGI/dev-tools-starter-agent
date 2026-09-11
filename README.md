<p align="center">
    <img width="350px" src="https://i.imgur.com/OKnr9ns.png" />
<h3 align="center">
     <a href="https://starterdocs.vtempest.workers.dev">🎮 Demo</a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master/apps/docs/content/docs">📑 Docs</a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/blob/master/apps/docs/content/docs/(index)/guides/starter-docs.mdx#%EF%B8%8F-installation">⬇️ Install </a>
    <a href="https://v0.app/templates/dashboard-landing-auth-billing-teams-docs-themes-ExDfusFzX6P"> 🎨 v0 Template </a>
</h3>
<p align="center">
    <a href="https://deepwiki.com/OpenSourceAGI/dev-tools-starter-agent"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
    <a href="https://starterdocs.vtempest.workers.dev"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://www.npmjs.com/~vtempest"><img src="https://img.shields.io/badge/npm-packages-CB3837?logo=npm&logoColor=white" alt="npm packages" /></a>
    <a href="https://codespaces.new/OpenSourceAGI/dev-tools-starter-agent"><img src="https://github.com/codespaces/badge.svg" height="20" alt="Open in GitHub Codespaces" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
<br />
    <a href="https://codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent"><img src="https://codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/graph/badge.svg" alt="Coverage" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/actions/workflows/tests.yml"><img src="https://github.com/OpenSourceAGI/dev-tools-starter-agent/actions/workflows/tests.yml/badge.svg?branch=master" alt="Tests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/actions/workflows/npm-publish.yml"><img src="https://github.com/OpenSourceAGI/dev-tools-starter-agent/actions/workflows/npm-publish.yml/badge.svg?branch=master" alt="Publish to npm" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/graphs/contributors"><img src="https://img.shields.io/github/commit-activity/m/OpenSourceAGI/dev-tools-starter-agent" alt="Commit Activity" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="Last Commit" /></a>
<br />
    <a href="https://discord.gg/SJdBqBz3tV"><img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat" alt="Join Discord" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
    <a href="./LICENSE.md"><img src="https://img.shields.io/badge/License-PROSPER%201.0-blue.svg" alt="License: PROSPER 1.0" /></a>
<br />
    <img src="https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff" alt="Claude AI" />
    <img src="https://img.shields.io/badge/Cloudflare-F38020?logo=Cloudflare&logoColor=white" alt="Cloudflare" />
    <img src="https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white" alt="Turborepo" />
    <img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white" alt="Bun" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Next.js-black?logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/shadcn%2Fui-000?logo=shadcnui&logoColor=fff" alt="shadcn/ui" />
    <a href="https://better-auth.com/docs/introduction" target="_blank"><img src="https://i.imgur.com/eaGdjBq.png" alt="better-auth" /></a>
</p>

### 📦 Packages & Apps

**[docs](apps/docs/)** - Documentation site built with Next.js featuring AI chat, full-text search, and auto-generated API reference from TypeScript types and OpenAPI specs. Serves as the central hub for all starter template documentation.
`bun dev` · `npm run dev`

**[Cloud-Computer-Control-Panel](apps/Cloud-Computer-Control-Panel/)** - Open-source cloud infrastructure management platform. Automates Dokploy deployment for container orchestration on AWS EC2 — provision servers, manage containers, and monitor services from a single dashboard.
`bun dev` · `npm run dev`

**[cccp-vscode-ext](apps/cccp-vscode-ext/)** - The Cloud Computer Control Panel dashboard in the VS Code sidebar. Imports CCCP's own React components unchanged and routes their `/api` calls through the extension host, so provisioning EC2 instances, installing Dokploy and managing encrypted AWS credentials all happen without leaving the editor.
`bun run compile` · `bun run test`

**[vscode-cloud](apps/vscode-cloud/)** - Per-user VS Code (code-server) instances on Cloudflare Containers. Each user gets a fully isolated environment: Cloudflare Access handles SSO, a Durable Object stores the per-user password in SQLite, and a Worker routes traffic to the right container.
`bun deploy` · `wrangler deploy`

[![npm downloads](https://img.shields.io/npm/dm/about-system.svg)](https://www.npmjs.com/package/about-system) **[about-system-info](packages/about-system-info/)** - Cross-platform CLI that prints CPU, memory, disk, uptime, public IP, ISP, and installed tools as a compact emoji line. Add to your shell config (`config.fish`, `.zshrc`) for an instant system snapshot on every terminal launch. Supports Windows, macOS, and Linux. Also ships as a [desktop app](packages/about-system-info/native/) for all three, with the CLI compiled inside it so nothing needs installing first.
`npx about-system` · `npm install -g about-system`

[![npm downloads](https://img.shields.io/npm/dm/api2ai.svg)](https://www.npmjs.com/package/api2ai) **[api2ai-mcp-generator](packages/api2ai-mcp-generator/)** - Generate production-ready MCP servers from any OpenAPI spec using the mcp-use framework (10k+ GitHub stars). Supports HTTP, SSE, and Streamable HTTP transports; includes a built-in inspector UI at `/inspector`, Zod schema validation, bearer/API-key auth, and Docker/PM2/Kubernetes deployment configs.
`npx api2ai <openapi-spec-url>` · `npm install -g api2ai`

**[cloudflare-to-claude-fix](packages/cloudflare-to-claude-fix/)** - Cloudflare Workers Queue consumer that fires a Claude Code routine automatically whenever a Workers build fails. Subscribes to Cloudflare build events via a Workers Queue and dead-letter queue, then triggers an AI-powered fix routine. Requires Workers Paid plan and Claude Pro.
`bun deploy` · `wrangler deploy`

[![npm downloads](https://img.shields.io/npm/dm/code-tree-graph.svg)](https://www.npmjs.com/package/code-tree-graph) **[code-tree-graph](packages/code-tree-graph/)** - Interactive code dependency graph and file tree components for Fumadocs + Next.js. `DependencyGraph` renders a pan/zoom Mermaid flowchart from full AST analysis, `FileTreeView` a searchable table with export/JSDoc metadata and GitHub deep links, and `TypeTable` collapsible property tables — all from a local TypeScript/JS parser, no external service.
`npm install code-tree-graph` · `bun add code-tree-graph`

[![npm downloads](https://img.shields.io/npm/dm/create-cloud-db.svg)](https://www.npmjs.com/package/create-cloud-db) **[create-cloud-db](packages/create-cloud-db/)** - Interactive CLI that creates a Turso edge database and writes `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` directly into your `.env` file. Handles Turso login, database creation, token generation, and env-file patching in one command.
`npx create-cloud-db [db-name]` · `npm install -g create-cloud-db`

[![npm downloads](https://img.shields.io/npm/dm/create-starter-app.svg)](https://www.npmjs.com/package/create-starter-app) **[create-starter-app](packages/create-starter-app/)** - Interactive CLI to scaffold a starter app from curated templates. Prompts for framework, auth provider, database, and UI library, then downloads and configures the right template.
`npx create-starter-app` · `bun create starter-app`

[![npm downloads](https://img.shields.io/npm/dm/export-svg-typescript.svg)](https://www.npmjs.com/package/export-svg-typescript) **[export-svg-icons-typescript](packages/export-svg-icons-typescript/)** - Convert a folder of SVG icons into a color-customizable, tree-shakable TypeScript `index.ts` that works with any component framework. Exports all icons as named functions for tree shaking, includes JSDoc tooltip previews of each icon, and supports runtime color, size, and dimension changes. Returns SVG strings or IMG tags with inline SVG sources.
`npx export-svg-typescript -i ./src/icons` · `npm install -g export-svg-typescript`

[![npm downloads](https://img.shields.io/npm/dm/git0.svg)](https://www.npmjs.com/package/git0) **[git0-repo-downloader](packages/git0-repo-downloader/)** - CLI to search GitHub repositories by keyword, download source archives or platform-matched release binaries, install dependencies, and open the project in your editor. Short aliases `g` and `gg` for speed.
`npx git0 <repo>` · `npm install -g git0`

[![npm downloads](https://img.shields.io/npm/dm/manage-storage.svg)](https://www.npmjs.com/package/manage-storage) **[manage-storage](packages/manage-storage/)** - Unified storage API for AWS S3, Cloudflare R2, and Backblaze B2 built on AWS SDK v3. A `StorageManager` class with `.upload()`, `.download()`, `.list()`, `.exists()`, `.copy()`, `.rename()`, `.delete()` and `.deleteAll()`; credentials resolve once from env vars or the constructor, and `list`/`deleteAll` paginate past 1000 keys. Returns data directly with no filesystem dependency, ideal for serverless and edge environments.
`npm install manage-storage` · `bun add manage-storage`

**[native-app-wrapper](packages/native-app-wrapper/)** - Tauri scaffold that turns one JSON profile into a native desktop (Windows/macOS/Linux) and mobile (Android/iOS) app. Wraps either a website — with a real app icon per platform, a Google-OAuth-compatible login handoff through the system browser, and a fullscreen toggle — or a command-line tool, by bundling the CLI as a sidecar behind a local HTML frontend so the app needs no runtime installed. `init` copies the scaffold next to whatever you're wrapping, generates its Tauri config and icons, and leaves no link back.
`node bin/cli.js init <dir> --profile-file <profile.json>`

[![npm downloads](https://img.shields.io/npm/dm/open-ready.svg)](https://www.npmjs.com/package/open-ready) **[open-when-ready](packages/open-when-ready/)** - Smart dev server wrapper for Next.js, Vite, or any CLI tool. Watches server output, auto-opens the browser when a ready signal is detected, and on error extracts context and launches your AI assistant (Perplexity, ChatGPT, or custom URL) with a pre-filled prompt.
`npx open-ready <command>` · `npm install -g open-ready`

[![npm downloads](https://img.shields.io/npm/dm/react-app-store-buttons.svg)](https://www.npmjs.com/package/react-app-store-buttons) **[react-app-store-buttons](packages/react-app-store-buttons/)** - React badge components for 8 app store and platform download links: iOS App Store, Google Play, Chrome Web Store, Mac App Store, Microsoft Store, Linux, and Snap Store. Detects the user's OS and highlights the matching button with a golden glow; generates native deep links (`itms-apps://`, `market://`, `ms-windows-store://`) so the store app opens directly. Badges ship as bundled assets — no CDN required.
`npm install react-app-store-buttons` · `bun add react-app-store-buttons`

**[server-shell-setup](packages/server-shell-setup/)** - One-command bootstrap for a modern dev environment: installs fish, nvim, nushell, bun, node, helix, starship, docker, and more. Offers an interactive menu or a fully unattended `all` mode. Includes fish aliases for `service_manager`, `killport`, and `search`. Supports Arch, Ubuntu/Debian, Android (Termux), macOS, Fedora, and Alpine.
`wget -qO- tinyurl.com/shellsetup | bash`

[![npm downloads](https://img.shields.io/npm/dm/template-git-repo.svg)](https://www.npmjs.com/package/template-git-repo) **[template-git-repo](packages/template-git-repo/)** - One command to give a repo the CI setup from qwksearch-research-agent: GitHub Actions for a discovered per-package test matrix, content-based npm publishing, agent PR auto-merge and hosted test reports, plus `turbo.json`, `codecov.yml` and a README badge block. Detects the repo slug, default branch, package manager and workspace layout; skips badges it has no input for instead of rendering them broken.
`bunx template-git-repo` · `bunx template-git-repo --dry-run`

[![npm downloads](https://img.shields.io/npm/dm/verify-phone-sms.svg)](https://www.npmjs.com/package/verify-phone-sms) **[verify-phone-sms](packages/verify-phone-sms/)** - SMS phone verification API server built with Hono on Cloudflare Workers, backed by AWS SNS. Sends one-time codes, blocks VoIP numbers, enforces API-key authentication, applies rate limiting, and exposes auto-generated OpenAPI documentation. Includes health-check endpoints and CORS/security-header middleware.
`npm install verify-phone-sms` · `wrangler deploy`

[![npm downloads](https://img.shields.io/npm/dm/setup-git-repo.svg)](https://www.npmjs.com/package/setup-git-repo) **[setup-git-repo](packages/setup-git-repo/)** - One command to give a repo its whole GitHub setup: Turborepo, five CI workflows (auto-discovering test matrix to Codecov, content-hash npm publishing, agent PR auto-merge, Cloudflare-deployed test reports), the centered README badge block filled in from your git remote, and docs explaining how to set up every badge, workflow and secret.
`bunx setup-git-repo` · `npx setup-git-repo`

**[web2mobile-wrapper](packages/web2mobile-wrapper/)** - Transform any website URL into a native mobile app wrapper for iOS and Android. No coding required — generates a React Native project pre-configured with your URL, push notifications, and app store metadata. Boosts discoverability via App Store and Google Play presence.
`npm run generate` · `node bin/cli.js`

### Starter Templates

**[template-git-repo](starter-templates/template-git-repo/)** - The GitHub repo scaffold itself: Turborepo task graph, the five CI workflows, `codecov.yml`, the badge block, and `docs/` covering every badge, workflow and secret. Applied to an existing repo rather than copied into a new one.
`bunx setup-git-repo`

**[template-svelte-betterauth-shadcn-drizzle](starter-templates/template-svelte-betterauth-shadcn-drizzle/)** - Full-stack SvelteKit app with Better Auth, Drizzle ORM on Cloudflare D1, Stripe payments, and shadcn-svelte components.
`bun create starter-app` · `npx create-starter-app`

**[template-nextjs-betterauth-shadcn-drizzle](starter-templates/template-nextjs-betterauth-shadcn-drizzle/)** - Next.js SaaS boilerplate with PostgreSQL, Better Auth, Stripe subscriptions, and shadcn/ui components.
`bun create starter-app` · `npx create-starter-app`

**[template-vinext-betterauth-shadcn-themes-teams-stripe](starter-templates/template-vinext-betterauth-shadcn-themes-teams-stripe/)** - Full Next.js dashboard template with Better Auth (social + SIWE), Stripe subscriptions and billing portal, teams, 50 shadcn color themes, and built-in Fumadocs documentation.
`bun create starter-app` · `npx create-starter-app`

**[template-fumadocs](starter-templates/template-fumadocs/)** - Documentation site with Fumadocs, Orama search, OpenAPI/Swagger docs, MDX support, and collapsible sidebar.
`bun create starter-app` · `npx create-starter-app`

**[template-docusaurus](starter-templates/template-docusaurus/)** - Docusaurus 3 docs template with offline Lunr search, OpenAPI plugin, and classic theme optimized for technical docs.
`bun create starter-app` · `npx create-starter-app`

### 🧠 Agent Skills

Every package has a matching [Agent Skill](skills/) — setup, the calls worth knowing, recipes, and a troubleshooting table, written from the source rather than the README. Install all of them, or just the one you need:

```bash
npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent
npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill manage-storage
```

See [skills/README.md](skills/README.md) for the full index.

### ✅ Tests

Six packages are wired into CI reporting today. Each exposes a `test:ci` script that writes a
`junit.xml` (and lcov coverage where its runner can produce one) for
[`.github/workflows/tests.yml`](.github/workflows/tests.yml) to upload to Codecov
Test Analytics, which tracks run times, failure rates and flaky tests, and comments
the failing ones on the pull request.

| Package | Runner | Run locally |
| --- | --- | --- |
| [setup-git-repo](packages/setup-git-repo/) | Vitest | `bun run test` |
| [git0-repo-downloader](packages/git0-repo-downloader/) | `bun test` | `bun test` |
| [web2mobile-wrapper](packages/web2mobile-wrapper/) | Jest | `npm test` |
| [verify-phone-sms](packages/verify-phone-sms/) | Vitest | `npm test` |
| [manage-storage](packages/manage-storage/) | Vitest | `bun run test` |
| [template-git-repo](packages/template-git-repo/) | Vitest | `bun run test` |

Wiring up another package means adding a `test:ci` script that writes `junit.xml`
into the package directory, then adding a matrix entry to that workflow. Coverage
is flagged per package in [`codecov.yml`](codecov.yml), which is also what the
per-package coverage badge in each README reads.

### 📖 READMEs, badges and docs

Each package README opens with a badge row describing **that package** — its npm
version and download counts, its published tarball's types and install size, its
own Codecov flag, its docs page, and a StackBlitz link to its directory. The row
is generated between markers, never hand-edited:

```bash
bun run badges          # rewrite every package's badge block
bun run badges:check    # fail if any block is stale (for CI)
```

Every package and app README is then published as a docs page under
[`/docs/packages`](https://starterdocs.vtempest.workers.dev/docs/packages), so the
README is the single source and the docs site is a view of it:

```bash
bun run docs:sync       # regenerate apps/docs/content/docs/(index)/{packages,apps}
```

Edit the README, run `bun run docs:sync`, and commit both. The badge catalog
itself lives in [`packages/template-git-repo/src/badges.js`](packages/template-git-repo/src/badges.js);
its setup notes are generated into [`docs/BADGES.md`](packages/template-git-repo/docs/BADGES.md).
