<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/apps/dev-tools-help-docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/apps/dev-tools-help-docs"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Next.js-black?logo=nextdotjs&logoColor=white" alt="Next.js" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /> <img src="https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white" alt="shadcn/ui" /> <img src="https://img.shields.io/badge/Vercel%20AI%20SDK-black?logo=vercel&logoColor=white" alt="Vercel AI SDK" /> <img src="https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white" alt="Zod" /> <img src="https://img.shields.io/badge/Fumadocs-000000" alt="Fumadocs" />
</p>
<!-- template-git-repo:badges:end -->

# dev-tools-help-docs

The documentation site for the whole catalog —
[starterdocs.vtempest.workers.dev](https://starterdocs.vtempest.workers.dev/).
Next.js + [Fumadocs](https://fumadocs.dev), with an AI chat assistant,
full-text search, and an API reference generated from TypeScript types and
OpenAPI specs.

## What it does

| Area | Route | What you get |
| --- | --- | --- |
| Docs | `/docs/**` | Every page under `content/docs`, with Fumadocs' sidebar, search and TOC. |
| Package pages | `/docs/(index)/**` | One page per package and app, synced from its `README.md`. |
| API reference | `/docs/**` | Type tables, dependency graphs and file trees rendered by `packages/code-tree-graph`, generated at build time. |
| Chat assistant | `/api/chat` | Answers questions against the docs corpus, with Groq for generation and OpenAI for embeddings. |
| Search | `/api/search` | Fumadocs' full-text index over the same corpus. |
| Machine-readable | `/llms.txt`, `/llms-full.txt`, `/docs/**.mdx` | The same content for agents; `/docs/:path*.mdx` rewrites to `/llms.mdx/:path*`. |
| Feeds and cards | `/rss.xml`, `/sitemap.xml`, `/og/**` | Syndication and generated Open Graph images. |

## Content comes from two places

- **`content/docs/`** — pages written here by hand.
- **Package READMEs**, copied in by `bun run docs:sync` (or
  `bun ./scripts/sync-readme-docs.ts`), which also runs as part of
  `build:pre`.

**Synced pages are generated.** Editing the copy under
`content/docs/(index)/` is lost on the next sync — edit the package's own
`README.md` instead. And that README's header row is itself generated, so the
full chain is:

```plaintext
package.json → scripts/sync-package-readmes.mjs → packages/<x>/README.md
             → apps/dev-tools-help-docs/scripts/sync-readme-docs.ts → this site
```

## Quick start

```bash
bun install          # from the repo root — never npm or yarn
cd apps/dev-tools-help-docs
bun run dev          # http://localhost:3000
```

No environment variables are needed to browse or build the site. `postinstall`
runs `fumadocs-mdx`; a missing content type or a "cannot find `.source`" error
after a fresh clone almost always means it did not — re-run `bun install` or
`bunx fumadocs-mdx` rather than hand-writing the type.

## Environment variables

Everything here is optional: the site builds and serves with none of it set,
and the providers are constructed lazily so a missing key fails the one request
that needs it rather than the build (see
[`src/lib/ai/providers.ts`](./src/lib/ai/providers.ts)).

Put values in a `.env` in this directory, or in `.env` at the repo root — the
`with-env` script reads `../../.env`.

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `GROQ_API_KEY` | The docs chat assistant at `/api/chat`. Without it the route returns a `MissingApiKeyError`; the rest of the site is unaffected. Model: `llama-3.3-70b-versatile`. | [console.groq.com/keys](https://console.groq.com/keys) |
| `OPENAI_API_KEY` | Embeddings for the assistant's retrieval step (`text-embedding-3-small`). Needed alongside `GROQ_API_KEY`. | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `NEXT_PUBLIC_BASE_URL` | The absolute base for canonical links, Open Graph images and the sitemap. Falls back to a relative base in development. | Your own deployed origin, e.g. `https://starterdocs.vtempest.workers.dev`. |
| `SOURCE_MAPS` | `"true"` emits production browser source maps. Off by default. | — |

## Scripts

| Script | What it does |
| --- | --- |
| `dev` | `next dev` on port 3000. |
| `build` | `next build` only — assumes the generated content is current. |
| `build:full` | `build:pre` → `next build` → `build:post`. **This is the one to deploy.** |
| `build:pre` | Regenerates the API reference and re-syncs package READMEs. |
| `docs:sync` | Just the README sync. |
| `typegen` / `typecheck` | `fumadocs-mdx` + `next typegen`, then `tsc --noEmit`. |
| `check` / `lint` / `format` | Biome. |
| `check:spelling` | cspell over the content. |

## Biome stays here

**This is the only Biome workspace in the repository.** `check`, `lint`,
`format` and `check:write` are Biome, and nothing outside
`apps/dev-tools-help-docs` is formatted by it — there is no repo-wide
formatter. Never run Biome over the rest of the monorepo; it rewrites files
nobody formats that way. The app's `commitlint.config.ts`, `.cspell.jsonc` and
`bunfig.toml` are scoped here for the same reason.

## Deploying

```bash
bun run build:full       # generate content, then build
bun run start            # serve the production build locally
```

No host configuration is committed in this directory — there is no
`wrangler.jsonc` or `vercel.json` here, so the deployment at
`starterdocs.vtempest.workers.dev` is configured on the host side, from a
Git connection. To point a new host at it:

| Setting | Value |
| --- | --- |
| Root directory | `apps/dev-tools-help-docs` |
| Install command | `bun install` (run from the repo root) |
| Build command | `bun run build:full` |
| Output | `.next` — a Node server build, not a static export |
| Node/Bun | Bun 1.3+ |

Then set `NEXT_PUBLIC_BASE_URL` to the deployed origin, and add `GROQ_API_KEY`
and `OPENAI_API_KEY` as secrets if you want the chat assistant live. Use
`build:full`, not `build`: plain `build` skips the pre-build step, so the API
reference and the synced package pages ship stale.

## Renders `code-tree-graph`

The dependency graphs, file trees and type tables on this site come from
`packages/code-tree-graph`. A change to that package's props breaks the docs
build, not its own tests.
