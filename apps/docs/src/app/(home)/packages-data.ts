export interface Package {
  name: string
  description: string
  commands: string[]
  path: string
  icon: string
}

export interface Category {
  name: string
  iconKey: string
  description: string
  color: string
  packages: Package[]
}

export const categories: Category[] = [
  {
    name: "Apps",
    iconKey: "app",
    description: "Full-featured applications for development and infrastructure",
    color: "brand",
    packages: [
      {
        name: "docs",
        icon: "FileText",
        description: "Documentation site built with Next.js featuring AI chat, full-text search, and auto-generated API reference from TypeScript types and OpenAPI specs.",
        commands: ["bun dev", "npm run dev"],
        path: "apps/docs/"
      },
      {
        name: "Cloud-Computer-Control-Panel",
        icon: "Server",
        description: "Open-source cloud infrastructure management platform. Automates Dokploy deployment for container orchestration on AWS EC2 -- provision servers, manage containers, and monitor services.",
        commands: ["bun dev", "npm run dev"],
        path: "apps/Cloud-Computer-Control-Panel/"
      },
      {
        name: "cccp-vscode-ext",
        icon: "Cloud",
        description: "The Cloud Computer Control Panel dashboard in the VS Code sidebar, reusing the Next.js app's own React components so provisioning and credential management happen inside the editor.",
        commands: ["bun run compile", "bun run test"],
        path: "apps/cccp-vscode-ext/"
      },
      {
        name: "vscode-cloud",
        icon: "Code",
        description: "Per-user VS Code (code-server) instances on Cloudflare Containers. Each user gets a fully isolated environment with SSO, SQLite storage, and traffic routing.",
        commands: ["bun deploy", "wrangler deploy"],
        path: "apps/vscode-cloud/"
      }
    ]
  },
  {
    name: "CLI Tools",
    iconKey: "terminal",
    description: "Command-line utilities for development workflows",
    color: "ember",
    packages: [
      {
        name: "about-system-info",
        icon: "Cpu",
        description: "Cross-platform CLI that prints CPU, memory, disk, uptime, public IP, ISP, and installed tools as a compact emoji line.",
        commands: ["npx about-system", "npm install -g about-system"],
        path: "packages/about-system-info/"
      },
      {
        name: "api2ai-mcp-generator",
        icon: "Wand2",
        description: "Generate production-ready MCP servers from any OpenAPI spec. Supports HTTP, SSE, and Streamable HTTP transports with Zod validation and auth.",
        commands: ["npx api2ai <openapi-spec-url>", "npm install -g api2ai"],
        path: "packages/api2ai-mcp-generator/"
      },
      {
        name: "create-cloud-db",
        icon: "Database",
        description: "Interactive CLI that creates a Turso edge database and writes credentials directly into your .env file.",
        commands: ["npx create-cloud-db [db-name]", "npm install -g create-cloud-db"],
        path: "packages/create-cloud-db/"
      },
      {
        name: "create-starter-app",
        icon: "Rocket",
        description: "Interactive CLI to scaffold a starter app from curated templates. Prompts for framework, auth provider, database, and UI library.",
        commands: ["npx create-starter-app", "bun create starter-app"],
        path: "packages/create-starter-app/"
      },
      {
        name: "git0-repo-downloader",
        icon: "GitBranch",
        description: "CLI to search GitHub repos by keyword, download source archives or release binaries, install deps, and open in editor.",
        commands: ["npx git0 <repo>", "npm install -g git0"],
        path: "packages/git0-repo-downloader/"
      },
      {
        name: "open-when-ready",
        icon: "Globe",
        description: "Smart dev server wrapper that watches output, auto-opens browser when ready, and on error launches your AI assistant.",
        commands: ["npx open-ready <command>", "npm install -g open-ready"],
        path: "packages/open-when-ready/"
      },
      {
        name: "server-shell-setup",
        icon: "HardDrive",
        description: "One-command bootstrap for a modern dev environment: installs fish, nvim, nushell, bun, node, helix, starship, docker, and more.",
        commands: ["wget -qO- tinyurl.com/shellsetup | bash"],
        path: "packages/server-shell-setup/"
      }
    ]
  },
  {
    name: "Libraries",
    iconKey: "package",
    description: "Reusable packages and components for your projects",
    color: "teal",
    packages: [
      {
        name: "manage-storage",
        icon: "HardDrive",
        description: "Unified storage API for AWS S3, Cloudflare R2, and Backblaze B2. Auto-detects provider from env vars. Single function interface.",
        commands: ["npm install manage-storage", "bun add manage-storage"],
        path: "packages/manage-storage/"
      },
      {
        name: "react-native-app-buttons",
        icon: "Smartphone",
        description: "React badge components for 8 app store and platform download links. Detects user OS and highlights matching button.",
        commands: ["npm install react-native-app-buttons", "bun add react-native-app-buttons"],
        path: "packages/react-native-app-buttons/"
      },
      {
        name: "export-svg-icons-typescript",
        icon: "Image",
        description: "Convert a folder of SVG icons into a color-customizable, tree-shakable TypeScript index that works with any component framework.",
        commands: ["npx export-svg-typescript -i ./src/icons", "npm install -g export-svg-typescript"],
        path: "packages/export-svg-icons-typescript/"
      }
    ]
  },
  {
    name: "Infrastructure",
    iconKey: "cloud",
    description: "Deployment and infrastructure automation tools",
    color: "brand",
    packages: [
      {
        name: "cloudflare-to-claude-fix",
        icon: "Zap",
        description: "Cloudflare Workers Queue consumer that fires a Claude Code routine automatically whenever a Workers build fails.",
        commands: ["bun deploy", "wrangler deploy"],
        path: "packages/cloudflare-to-claude-fix/"
      },
      {
        name: "verify-phone-sms",
        icon: "Shield",
        description: "SMS phone verification API server built with Hono on Cloudflare Workers. Sends OTP codes, blocks VoIP, enforces rate limiting.",
        commands: ["bun deploy", "wrangler deploy"],
        path: "packages/verify-phone-sms/"
      },
      {
        name: "web2mobile-wrapper",
        icon: "MonitorSmartphone",
        description: "Transform any website URL into a native mobile app wrapper for iOS and Android with push notifications.",
        commands: ["npx create-mobile-wrapper", "npm install -g create-mobile-wrapper"],
        path: "packages/web2mobile-wrapper/"
      }
    ]
  },
  {
    name: "Starter Templates",
    iconKey: "template",
    description: "Production-ready templates to jumpstart your projects",
    color: "teal",
    packages: [
      {
        name: "SvelteKit + Better Auth + Drizzle",
        icon: "Layers",
        description: "Full-stack SvelteKit app with Better Auth, Drizzle ORM on Cloudflare D1, Stripe payments, and shadcn-svelte components.",
        commands: ["bun create starter-app", "npx create-starter-app"],
        path: "starter-templates/template-svelte-betterauth-drizzle-shadcn/"
      },
      {
        name: "Next.js + Better Auth + Drizzle",
        icon: "Layers",
        description: "Next.js SaaS boilerplate with PostgreSQL, Better Auth, Stripe subscriptions, and shadcn/ui components.",
        commands: ["bun create starter-app", "npx create-starter-app"],
        path: "starter-templates/template-nextjs-betterauth-shadcn-drizzle/"
      },
      {
        name: "Next.js + Better Auth + Prisma",
        icon: "Layers",
        description: "Lightweight Next.js starter with Prisma ORM, Better Auth, Google OAuth, credential login, and protected routes.",
        commands: ["bun create starter-app", "npx create-starter-app"],
        path: "starter-templates/template-nextjs-betterauth-shadcn-prisma/"
      },
      {
        name: "Fumadocs Documentation",
        icon: "BookOpen",
        description: "Documentation site with Fumadocs, Orama search, OpenAPI/Swagger docs, MDX support, and collapsible sidebar.",
        commands: ["bun create starter-app", "npx create-starter-app"],
        path: "starter-templates/template-fumadocs/"
      },
      {
        name: "Docusaurus Documentation",
        icon: "BookOpen",
        description: "Docusaurus 3 docs template with offline Lunr search, OpenAPI plugin, and classic theme optimized for technical docs.",
        commands: ["bun create starter-app", "npx create-starter-app"],
        path: "starter-templates/template-docusaurus/"
      }
    ]
  }
]
