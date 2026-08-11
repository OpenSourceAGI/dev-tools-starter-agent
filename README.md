<p align="center">
    <img width="350px" src="https://i.imgur.com/OKnr9ns.png" />
<h3 align="center">
     <a href="https://starterdocs.vtempest.workers.dev">🎮 Demo</a>
    <a href="https://starterdocs.js.org">📑 Docs</a>
    <a href="https://starterdocs.js.org/docs/guides/starter-docs#%EF%B8%8F-installation">⬇️ Install </a>
    <a href="https://v0.app/templates/dashboard-landing-auth-billing-teams-docs-themes-ExDfusFzX6P"> 🎨 v0 Template </a>
</h3>
<p align="center">
     <a href="https://github.com/OpenSourceAGI/starter-app-dev-tools/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/OpenSourceAGI/starter-app-dev-tools" /></a>
     <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>
    <a href="https://github.com/OpenSourceAGI/starter-app-dev-tools/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/OpenSourceAGI/starter-app-dev-tools" />
    </a>
    <a href="https://codespaces.new/OpenSourceAGI/starter-app-dev-tools">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" alt="GitHub Codespaces" />
    </a>
<br />
    <a href="https://github.com/OpenSourceAGI/starter-app-dev-tools/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/OpenSourceAGI/starter-app-dev-tools" />
    </a>
    <img src="https://img.shields.io/github/last-commit/OpenSourceAGI/starter-app-dev-tools.svg" alt="GitHub last commit" />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
    </a>
    <br />
    <img src="https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff" alt="Claude AI"> <img src="https://img.shields.io/badge/Cloudflare-F38020?logo=Cloudflare&logoColor=white" alt="Cloudflare"> <img src="https://img.shields.io/badge/shadcn%2Fui-000?logo=shadcnui&logoColor=fff" alt="shadcn/ui"> <img src="https://img.shields.io/badge/Next.js-black" alt="Next.js" />
    <a href="https://better-auth.com/docs/introduction" target="_blank"><img src="https://i.imgur.com/eaGdjBq.png" alt="better-auth" /></a>
</p>

### 📦 Packages & Apps

**[docs](apps/docs/)** - Documentation site built with Next.js featuring AI chat, full-text search, and auto-generated API reference from TypeScript types and OpenAPI specs. Serves as the central hub for all starter template documentation.
`bun dev` · `npm run dev`

**[Cloud-Computer-Control-Panel](apps/Cloud-Computer-Control-Panel/)** - Open-source cloud infrastructure management platform. Automates Dokploy deployment for container orchestration on AWS EC2 — provision servers, manage containers, and monitor services from a single dashboard.
`bun dev` · `npm run dev`

**[vscode-cloud](apps/vscode-cloud/)** - Per-user VS Code (code-server) instances on Cloudflare Containers. Each user gets a fully isolated environment: Cloudflare Access handles SSO, a Durable Object stores the per-user password in SQLite, and a Worker routes traffic to the right container.
`bun deploy` · `wrangler deploy`

**[about-system-info](packages/about-system-info/)** - Cross-platform CLI that prints CPU, memory, disk, uptime, public IP, ISP, and installed tools as a compact emoji line. Add to your shell config (`config.fish`, `.zshrc`) for an instant system snapshot on every terminal launch. Supports Windows, macOS, and Linux.
`npx about-system` · `npm install -g about-system`

**[api2ai-mcp-generator](packages/api2ai-mcp-generator/)** - Generate production-ready MCP servers from any OpenAPI spec using the mcp-use framework (8k+ GitHub stars). Supports HTTP, SSE, and Streamable HTTP transports; includes a built-in inspector UI at `/inspector`, Zod schema validation, bearer/API-key auth, and Docker/PM2/Kubernetes deployment configs.
`npx api2ai <openapi-spec-url>` · `npm install -g api2ai`

**[cloudflare-to-claude-fix](packages/cloudflare-to-claude-fix/)** - Cloudflare Workers Queue consumer that fires a Claude Code routine automatically whenever a Workers build fails. Subscribes to Cloudflare build events via a Workers Queue and dead-letter queue, then triggers an AI-powered fix routine. Requires Workers Paid plan and Claude Pro.
`bun deploy` · `wrangler deploy`

**[create-cloud-db](packages/create-cloud-db/)** - Interactive CLI that creates a Turso edge database and writes `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` directly into your `.env` file. Handles Turso login, database creation, token generation, and env-file patching in one command.
`npx create-cloud-db [db-name]` · `npm install -g create-cloud-db`

**[create-starter-app](packages/create-starter-app/)** - Interactive CLI to scaffold a starter app from curated templates. Prompts for framework, auth provider, database, and UI library, then downloads and configures the right template.
`npx create-starter-app` · `bun create starter-app`

**[export-svg-icons-typescript](packages/export-svg-icons-typescript/)** - Convert a folder of SVG icons into a color-customizable, tree-shakable TypeScript `index.ts` that works with any component framework. Exports all icons as named functions for tree shaking, includes JSDoc tooltip previews of each icon, and supports runtime color, size, and dimension changes. Returns SVG strings or IMG tags with inline SVG sources.
`npx export-svg-typescript -i ./src/icons` · `npm install -g export-svg-typescript`

**[git0-repo-downloader](packages/git0-repo-downloader/)** - CLI to search GitHub repositories by keyword, download source archives or platform-matched release binaries, install dependencies, and open the project in your editor. Short aliases `g` and `gg` for speed.
`npx git0 <repo>` · `npm install -g git0`

**[manage-storage](packages/manage-storage/)** - Unified storage API for AWS S3, Cloudflare R2, and Backblaze B2 built on AWS SDK v3. Auto-detects the configured provider from environment variables. Single function interface for upload, download, delete, and list — returns data directly with no filesystem dependency, ideal for serverless and edge environments.
`npm install manage-storage` · `bun add manage-storage`

**[open-when-ready](packages/open-when-ready/)** - Smart dev server wrapper for Next.js, Vite, or any CLI tool. Watches server output, auto-opens the browser when a ready signal is detected, and on error extracts context and launches your AI assistant (Perplexity, ChatGPT, or custom URL) with a pre-filled prompt.
`npx open-ready <command>` · `npm install -g open-ready`

**[react-native-app-buttons](packages/react-native-app-buttons/)** - React badge components for 8 app store and platform download links: iOS App Store, Google Play, Chrome Web Store, Mac App Store, Microsoft Store, Linux, and Snap Store. Detects the user's OS and highlights the matching button with a golden glow; generates native deep links (`itms-apps://`, `market://`, `ms-windows-store://`) so the store app opens directly. Badges ship as bundled assets — no CDN required.
`npm install react-native-app-buttons` · `bun add react-native-app-buttons`

**[server-shell-setup](packages/server-shell-setup/)** - One-command bootstrap for a modern dev environment: installs fish, nvim, nushell, bun, node, helix, starship, docker, and more. Offers an interactive menu or a fully unattended `all` mode. Includes fish aliases for `service_manager`, `killport`, and `search`. Supports Arch, Ubuntu/Debian, Android (Termux), macOS, Fedora, and Alpine.
`wget -qO- tinyurl.com/shellsetup | bash`

**[shadcn-theme-menu](packages/shadcn-theme-menu/)** - Drop-in theme switcher for shadcn/ui with 24+ color themes, dark/light/system mode toggle, and smooth animations. Includes `ThemeToggle`, `ThemeDropdown`, and `CinematicThemeSwitcher` components. Wrap your app with `ThemeProvider` and import the bundled CSS — no extra config required.
`npm install shadcn-themes` · `bun add shadcn-themes`

**[verify-phone-sms](packages/verify-phone-sms/)** - SMS phone verification API server built with Hono on Cloudflare Workers, backed by AWS SNS. Sends one-time codes, blocks VoIP numbers, enforces API-key authentication, applies rate limiting, and exposes auto-generated OpenAPI documentation. Includes health-check endpoints and CORS/security-header middleware.
`bun deploy` · `wrangler deploy`

**[web2mobile-wrapper](packages/web2mobile-wrapper/)** - Transform any website URL into a native mobile app wrapper for iOS and Android. No coding required — generates a React Native project pre-configured with your URL, push notifications, and app store metadata. Boosts discoverability via App Store and Google Play presence.
`npx create-mobile-wrapper` · `npm install -g create-mobile-wrapper`

### Starter Templates

**[template-svelte-betterauth-drizzle-shadcn](starter-templates/template-svelte-betterauth-drizzle-shadcn/)** - Full-stack SvelteKit app with Better Auth, Drizzle ORM on Cloudflare D1, Stripe payments, and shadcn-svelte components.
`bun create starter-app` · `npx create-starter-app`

**[template-nextjs-betterauth-shadcn-drizzle](starter-templates/template-nextjs-betterauth-shadcn-drizzle/)** - Next.js SaaS boilerplate with PostgreSQL, Better Auth, Stripe subscriptions, and shadcn/ui components.
`bun create starter-app` · `npx create-starter-app`

**[template-nextjs-betterauth-shadcn-prisma](starter-templates/template-nextjs-betterauth-shadcn-prisma/)** - Lightweight Next.js starter with Prisma ORM, Better Auth, Google OAuth, credential login, and protected routes.
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
