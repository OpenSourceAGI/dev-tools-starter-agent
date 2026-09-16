
### 📦 Packages 

**[dev-tools-help-docs](apps/dev-tools-help-docs/)** - Documentation site built with Next.js featuring AI chat, full-text search, and auto-generated API reference from TypeScript types and OpenAPI specs. Serves as the central hub for all starter template documentation.
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

[![npm downloads](https://img.shields.io/npm/dm/test-google-login.svg)](https://www.npmjs.com/package/test-google-login) **[test-google-login](packages/test-google-login/)** - End-to-end test harness for Google sign-in. Sign in once by hand, persist the Playwright `storageState` under `playwright/.auth/` (0600, gitignored two ways), and every test after that starts already signed in — with a setup-project guard that throws the exact `playwright codegen` command when the session is missing and how long ago it lapsed when it expired. For CI it mints your app's own session through a test-only endpoint, so no Google password is ever a repo secret. Ships a Cloudflare Browser Rendering Durable Object that replays the same session from a Worker, keeping one browser alive across a suite, and a CLI that inspects or redacts a state file without ever printing a value. Zero runtime dependencies; the whole suite runs without launching a browser.
`npx test-google-login init` · `npm install --save-dev test-google-login`

[![npm downloads](https://img.shields.io/npm/dm/verify-phone-sms.svg)](https://www.npmjs.com/package/verify-phone-sms) **[verify-phone-sms](packages/verify-phone-sms/)** - SMS phone verification API server built with Hono on Cloudflare Workers, backed by AWS SNS. Sends one-time codes, blocks VoIP numbers, enforces API-key authentication, applies rate limiting, and exposes auto-generated OpenAPI documentation. Includes health-check endpoints and CORS/security-header middleware.
`npm install verify-phone-sms` · `wrangler deploy`

[![npm downloads](https://img.shields.io/npm/dm/setup-git-repo.svg)](https://www.npmjs.com/package/setup-git-repo) **[setup-git-repo](packages/setup-git-repo/)** - One command to give a repo its whole GitHub setup: Turborepo, five CI workflows (auto-discovering test matrix to Codecov, content-hash npm publishing, agent PR auto-merge, Cloudflare-deployed test reports), the centered README badge block filled in from your git remote, and docs explaining how to set up every badge, workflow and secret.
`bunx setup-git-repo` · `npx setup-git-repo`

**[web2mobile-wrapper](packages/web2mobile-wrapper/)** - Transform any website URL into a native mobile app wrapper for iOS and Android. No coding required — generates a React Native project pre-configured with your URL, push notifications, and app store metadata. Boosts discoverability via App Store and Google Play presence.
`npm run generate` · `node bin/cli.js`
