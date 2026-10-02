---
title: 🧱 Starter Templates
---

How the scaffolds in `starter-templates/` compare with each other, and how
**nextjs-harness-cloudflare** (formerly the vinext template) compares with the
other common ways to run a Next.js SaaS app on Cloudflare.

## 🗂️ Templates in this repo

| Template | Framework | Auth | Database | Payments | Deploy target | Best for |
| --- | --- | --- | --- | --- | --- | --- |
| **nextjs-harness-cloudflare** | Next.js 16 (App Router) via [vinext](https://github.com/cloudflare/vinext) | Better Auth (social, SIWE) | Drizzle + SQLite / Cloudflare D1 | Stripe (`@better-auth/stripe`) | Cloudflare Workers (`vinext deploy`), or Node with `next start` | Full SaaS dashboard on the edge: teams, 50 themes, built-in Fumadocs docs, AI provider settings |
| **template-nextjs-betterauth-shadcn-drizzle** | Next.js 15 | Better Auth + Better Auth UI | Drizzle + PostgreSQL | Stripe | Node / Vercel | Leaner Next.js SaaS on a classic Postgres server |
| **template-svelte-betterauth-shadcn-drizzle** | SvelteKit | Better Auth | Drizzle + Cloudflare D1 | Stripe | Cloudflare Workers (`adapter-cloudflare-workers`) | Same SaaS shape in Svelte, smallest bundle |
| **template-fumadocs** | Next.js + Fumadocs | none | none | none | Static / Node / Cloudflare | Product docs with OpenAPI and TypeScript reference pages |
| **template-docusaurus** | Docusaurus | none | none | none | Static hosting | API docs with OpenAPI + TypeDoc plugins and Lunr search |
| **template-git-repo** | Bun + Turborepo | none | none | none | npm | A new monorepo of publishable packages with Vitest and Codecov |

### Which one to pick

- Want **Next.js on Cloudflare** with the most features out of the box: **nextjs-harness-cloudflare**.
- Want **Next.js on Vercel or your own Node server** with Postgres: **template-nextjs-betterauth-shadcn-drizzle**.
- Prefer **Svelte** and still want D1 on Workers: **template-svelte-betterauth-shadcn-drizzle**.
- Only need **docs**: **template-fumadocs** for React/MDX, **template-docusaurus** for a classic versioned docs site.

## ☁️ nextjs-harness-cloudflare vs other ways to run Next.js on Cloudflare

nextjs-harness-cloudflare keeps a normal Next.js app (`next dev`, `next build`
still work) and adds a second harness that builds the same `app/` directory
with vinext and Vite for Cloudflare Workers.

| Approach | How it works | Next.js compatibility | Build tool | Bindings (D1, KV, R2) | Status |
| --- | --- | --- | --- | --- | --- |
| **nextjs-harness-cloudflare** | Ships both `next` and `vinext` scripts; Workers build via vinext + `@cloudflare/vite-plugin` | Whatever vinext supports; falls back to `next start` for anything it does not | Vite (Workers) + Next (Node) | Native through Wrangler | Template; vinext itself is early (0.0.x) |
| **[vinext](https://github.com/cloudflare/vinext) alone** | Reimplements the Next.js API surface on Vite | Most App Router and Pages Router APIs, not all | Vite | Native | Experimental |
| **[OpenNext for Cloudflare](https://opennext.js.org/cloudflare)** (`@opennextjs/cloudflare`) | Runs `next build` output inside a Worker adapter | Closest to real Next.js | Next.js (webpack / Turbopack) | Through `getCloudflareContext()` | Stable, recommended by Cloudflare for production |
| **[next-on-pages](https://github.com/cloudflare/next-on-pages)** | Converts edge-runtime routes to Pages Functions | Edge runtime only | Next.js | Through `getRequestContext()` | Deprecated in favour of OpenNext |
| **[Vercel](https://vercel.com)** | Native Next.js host | Full | Next.js | No Cloudflare bindings; use HTTP APIs | Stable, paid at scale |

### Trade-offs

- **Pros of nextjs-harness-cloudflare:** fast Vite dev server, direct D1 access
  without an HTTP hop, cheap Workers hosting, and a plain Next.js escape hatch
  because `next build && next start` still runs the same code.
- **Cons:** vinext is young, so a Next.js feature it has not implemented yet
  will only work on the Node path. The template also carries custom Vite
  plugins to make Fumadocs JSON collections load under RSC builds.
- **Pick OpenNext instead** when you need maximum Next.js fidelity on
  Cloudflare today and do not need Vite.

## 🏁 vs popular external SaaS starters

| Starter | Framework | Auth | DB / ORM | Payments | Hosting | License |
| --- | --- | --- | --- | --- | --- | --- |
| **nextjs-harness-cloudflare** | Next.js + vinext | Better Auth | Drizzle + D1 / SQLite | Stripe | Cloudflare Workers | Free, in this repo |
| [create-t3-app](https://create.t3.gg) | Next.js | NextAuth / Auth.js | Prisma or Drizzle | none | Vercel / Node | MIT |
| [next-forge](https://www.next-forge.com) | Next.js (Turborepo) | Clerk | Prisma + Neon | Stripe | Vercel | MIT |
| [Open SaaS](https://opensaas.sh) | Wasp (React + Node) | Wasp auth | Prisma + Postgres | Stripe / Lemon Squeezy | Fly.io / Railway | MIT |
| [Supastarter](https://supastarter.dev) | Next.js / Nuxt | Better Auth | Prisma or Drizzle | Stripe / Lemon Squeezy / others | Vercel / Node | Paid |
| [ShipFast](https://shipfa.st) | Next.js | NextAuth | MongoDB or Supabase | Stripe / Lemon Squeezy | Vercel | Paid |

The templates in this repo are the only ones in the table that target
**Cloudflare Workers + D1** as the primary deployment, which keeps hosting and
database cost close to zero for small apps.
