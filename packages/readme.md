## 📦 Packages

Download badges show total npm downloads and downloads over the rolling last month.

### 📚 Documentation & AI Tools

[dev-tools-help-docs](apps/dev-tools-help-docs/) — Central documentation site built with Next.js, featuring AI chat, full-text search, and API references generated from TypeScript types and OpenAPI specs.  
`bun dev` · `npm run dev`

[api2ai-mcp-generator](packages/api2ai-mcp-generator/) — Generate MCP servers from OpenAPI specs using the mcp-use framework. Supports HTTP, SSE, and Streamable HTTP transports, with a built-in inspector UI, Zod schema validation, bearer/API-key authentication, and Docker, PM2, and Kubernetes deployment configurations.  
[![Total npm downloads](https://img.shields.io/npm/dt/api2ai.svg?label=total%20downloads)](https://www.npmjs.com/package/api2ai)
[![Monthly npm downloads](https://img.shields.io/npm/dm/api2ai.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/api2ai)  
`npx api2ai <openapi-spec-url>` · `npm install -g api2ai`

[ask-ai-button](packages/ask-ai-button/) — Add an “Ask AI about this page” dropdown, floating action button, or inline panel to documentation sites. Visitors can choose an AI provider and open a new tab with the page and their question pre-filled. Supports page Markdown sharing, prompt copying, custom URL or API providers, and Fumadocs theme colors.  
[![Total npm downloads](https://img.shields.io/npm/dt/ask-ai-button.svg?label=total%20downloads)](https://www.npmjs.com/package/ask-ai-button)
[![Monthly npm downloads](https://img.shields.io/npm/dm/ask-ai-button.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/ask-ai-button)  
`npm install ask-ai-button` · `bun add ask-ai-button`

[code-tree-graph](packages/code-tree-graph/) — Interactive dependency graphs, searchable file trees, and collapsible type tables for Fumadocs and Next.js. Generates Mermaid flowcharts, export/JSDoc metadata, and GitHub deep links through local TypeScript/JavaScript analysis, with no external service.  
[![Total npm downloads](https://img.shields.io/npm/dt/code-tree-graph.svg?label=total%20downloads)](https://www.npmjs.com/package/code-tree-graph)
[![Monthly npm downloads](https://img.shields.io/npm/dm/code-tree-graph.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/code-tree-graph)  
`npm install code-tree-graph` · `bun add code-tree-graph`

### ☁️ Cloud Infrastructure & Development Environments

[Cloud-Computer-Control-Panel](apps/Cloud-Computer-Control-Panel/) — Open-source cloud infrastructure dashboard for provisioning AWS EC2 servers, automating Dokploy deployment, managing containers, and monitoring services.  
`bun dev` · `npm run dev`

[cccp-vscode-ext](apps/cccp-vscode-ext/) — Cloud Computer Control Panel inside the VS Code sidebar. Reuses CCCP’s React components unchanged and routes their API calls through the extension host, enabling EC2 provisioning, Dokploy installation, and encrypted AWS credential management without leaving the editor.  
`bun run compile` · `bun run test`

[vscode-cloud](apps/vscode-cloud/) — Isolated, per-user VS Code environments powered by code-server on Cloudflare Containers. Uses Cloudflare Access for SSO, a Durable Object with SQLite for per-user password storage, and a Worker to route traffic to the correct container.  
`bun deploy` · `wrangler deploy`

[server-shell-setup](packages/server-shell-setup/) — One-command development environment bootstrap that installs fish, Neovim, Nushell, Bun, Node.js, Helix, Starship, Docker, and more. Offers interactive and unattended modes, plus utility aliases. Supports Arch, Ubuntu/Debian, Android through Termux, macOS, Fedora, and Alpine.  
`wget -qO- tinyurl.com/shellsetup | bash`

### 🗄️ Databases, Storage & Backend APIs

[create-cloud-db](packages/create-cloud-db/) — Interactive CLI that creates a Turso edge database and writes `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` into your `.env` file. Handles login, database creation, token generation, and environment-file updates in one command.  
[![Total npm downloads](https://img.shields.io/npm/dt/create-cloud-db.svg?label=total%20downloads)](https://www.npmjs.com/package/create-cloud-db)
[![Monthly npm downloads](https://img.shields.io/npm/dm/create-cloud-db.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/create-cloud-db)  
`npx create-cloud-db [db-name]` · `npm install -g create-cloud-db`

[manage-storage](packages/manage-storage/) — Unified storage API for AWS S3, Cloudflare R2, and Backblaze B2, built on AWS SDK v3. Provides upload, download, listing, existence checks, copying, renaming, and deletion, including pagination beyond 1,000 keys. Returns data directly without a filesystem dependency.  
[![Total npm downloads](https://img.shields.io/npm/dt/manage-storage.svg?label=total%20downloads)](https://www.npmjs.com/package/manage-storage)
[![Monthly npm downloads](https://img.shields.io/npm/dm/manage-storage.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/manage-storage)  
`npm install manage-storage` · `bun add manage-storage`

[verify-phone-sms](packages/verify-phone-sms/) — SMS verification API built with Hono on Cloudflare Workers and backed by AWS SNS. Sends one-time codes, blocks VoIP numbers, enforces API-key authentication, applies rate limiting, and includes OpenAPI documentation, health checks, CORS, and security-header middleware.  
[![Total npm downloads](https://img.shields.io/npm/dt/verify-phone-sms.svg?label=total%20downloads)](https://www.npmjs.com/package/verify-phone-sms)
[![Monthly npm downloads](https://img.shields.io/npm/dm/verify-phone-sms.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/verify-phone-sms)  
`npm install verify-phone-sms` · `wrangler deploy`

### 🛠️ Project Scaffolding & Repository Automation

[create-starter-app](packages/create-starter-app/) — Interactive CLI for scaffolding applications from curated templates. Prompts for framework, authentication provider, database, and UI library, then downloads and configures the selected template.  
[![Total npm downloads](https://img.shields.io/npm/dt/create-starter-app.svg?label=total%20downloads)](https://www.npmjs.com/package/create-starter-app)
[![Monthly npm downloads](https://img.shields.io/npm/dm/create-starter-app.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/create-starter-app)  
`npx create-starter-app` · `bun create starter-app`

[git0-repo-downloader](packages/git0-repo-downloader/) — CLI for searching GitHub repositories, downloading source archives or platform-matched release binaries, installing dependencies, and opening projects in your editor. Includes short aliases `g` and `gg`.  
[![Total npm downloads](https://img.shields.io/npm/dt/git0.svg?label=total%20downloads)](https://www.npmjs.com/package/git0)
[![Monthly npm downloads](https://img.shields.io/npm/dm/git0.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/git0)  
`npx git0 <repo>` · `npm install -g git0`

[template-git-repo](packages/template-git-repo/) — Apply repository CI configuration with a discovered per-package test matrix, content-based npm publishing, agent PR auto-merge, hosted test reports, Turborepo configuration, Codecov configuration, and README badges. Detects repository settings and skips badges when required inputs are unavailable.  
[![Total npm downloads](https://img.shields.io/npm/dt/template-git-repo.svg?label=total%20downloads)](https://www.npmjs.com/package/template-git-repo)
[![Monthly npm downloads](https://img.shields.io/npm/dm/template-git-repo.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/template-git-repo)  
`bunx template-git-repo` · `bunx template-git-repo --dry-run`

[setup-git-repo](packages/setup-git-repo/) — Set up Turborepo and GitHub workflows for automatically discovered package tests, Codecov reporting, content-hash npm publishing, agent PR auto-merge, and Cloudflare-hosted test reports. Includes README badges populated from your Git remote and documentation for workflows, badges, and secrets.  
[![Total npm downloads](https://img.shields.io/npm/dt/setup-git-repo.svg?label=total%20downloads)](https://www.npmjs.com/package/setup-git-repo)
[![Monthly npm downloads](https://img.shields.io/npm/dm/setup-git-repo.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/setup-git-repo)  
`bunx setup-git-repo` · `npx setup-git-repo`

### 🧪 Testing, Debugging & Build Recovery

[test-google-login](packages/test-google-login/) — Google sign-in test harness with reusable Playwright authentication state, missing-session and expiration guards, and CI session minting through a test-only application endpoint. Includes Cloudflare Browser Rendering integration and a CLI for inspecting or redacting saved authentication state without printing secret values.  
[![Total npm downloads](https://img.shields.io/npm/dt/test-google-login.svg?label=total%20downloads)](https://www.npmjs.com/package/test-google-login)
[![Monthly npm downloads](https://img.shields.io/npm/dm/test-google-login.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/test-google-login)  
`npx test-google-login init` · `npm install --save-dev test-google-login`

[open-when-ready](packages/open-when-ready/) — Development server wrapper for Next.js, Vite, or other CLI tools. Watches output and opens the browser when the server is ready. On failure, extracts error context and launches an AI assistant with a pre-filled troubleshooting prompt.  
[![Total npm downloads](https://img.shields.io/npm/dt/open-ready.svg?label=total%20downloads)](https://www.npmjs.com/package/open-ready)
[![Monthly npm downloads](https://img.shields.io/npm/dm/open-ready.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/open-ready)  
`npx open-ready <command>` · `npm install -g open-ready`

[cloudflare-to-claude-fix](packages/cloudflare-to-claude-fix/) — Cloudflare Workers Queue consumer that triggers a Claude Code fix routine when a Workers build fails. Subscribes to build events through a Workers Queue and dead-letter queue. Requires Workers Paid and Claude Pro.  
`bun deploy` · `wrangler deploy`

### 🖥️ Desktop, Mobile & System Utilities

[about-system-info](packages/about-system-info/) — Cross-platform CLI displaying CPU, memory, disk, uptime, public IP, ISP, and installed tools as a compact emoji line. Can run on terminal startup through your shell configuration. Also includes a [desktop app](packages/about-system-info/native/) with the CLI bundled inside. Supports Windows, macOS, and Linux.  
[![Total npm downloads](https://img.shields.io/npm/dt/about-system.svg?label=total%20downloads)](https://www.npmjs.com/package/about-system)
[![Monthly npm downloads](https://img.shields.io/npm/dm/about-system.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/about-system)  
`npx about-system` · `npm install -g about-system`

[native-app-wrapper](packages/native-app-wrapper/) — Tauri scaffold that turns a JSON profile into a desktop or mobile application. Wraps websites with platform icons, browser-based OAuth handoff, and a fullscreen toggle, or bundles CLI tools as sidecars behind a local HTML frontend. Generates a standalone scaffold with no link back to the original package.  
`node bin/cli.js init <dir> --profile-file <profile.json>`

[web2mobile-wrapper](packages/web2mobile-wrapper/) — Generate an iOS and Android React Native website wrapper from a URL, with push notifications and app store metadata.  
`npm run generate` · `node bin/cli.js`

### 🎨 UI Components & Icon Tooling

[export-svg-icons-typescript](packages/export-svg-icons-typescript/) — Convert SVG folders into color-customizable, tree-shakable TypeScript exports that work with any component framework. Includes named icon functions, JSDoc previews, configurable colors and dimensions, and output as SVG strings or image tags.  
[![Total npm downloads](https://img.shields.io/npm/dt/export-svg-typescript.svg?label=total%20downloads)](https://www.npmjs.com/package/export-svg-typescript)
[![Monthly npm downloads](https://img.shields.io/npm/dm/export-svg-typescript.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/export-svg-typescript)  
`npx export-svg-typescript -i ./src/icons` · `npm install -g export-svg-typescript`

[react-app-store-buttons](packages/react-app-store-buttons/) — React app-store and platform download badge components with bundled assets, operating-system detection, matching-platform highlighting, and native store deep links.  
[![Total npm downloads](https://img.shields.io/npm/dt/react-app-store-buttons.svg?label=total%20downloads)](https://www.npmjs.com/package/react-app-store-buttons)
[![Monthly npm downloads](https://img.shields.io/npm/dm/react-app-store-buttons.svg?label=downloads%2Fmonth)](https://www.npmjs.com/package/react-app-store-buttons)  
`npm install react-app-store-buttons` · `bun add react-app-store-buttons`

[shadcn-sidebar](packages/shadcn-sidebar/) — Sidebar package.

[shadcn-theme-menu](packages/shadcn-theme-menu/) — Theme-menu package.
