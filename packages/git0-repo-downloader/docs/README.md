# git0 docs

The [git0.js.org](https://git0.js.org) site, built from
[`starter-templates/template-fumadocs`](../../../starter-templates/template-fumadocs)
(Next.js + Fumadocs).

| Path | What it is |
| --- | --- |
| `app/(home)/page.tsx` | The landing page |
| `components/DocsHomepage/` | Landing page sections — hero, features, usage, project types, footer |
| `content/docs/` | Docs pages (MDX); sidebar order in `meta.json` |
| `lib/fumadocs/customize-docs.ts` | Site title, description and GitHub links |

```bash
bun install
bun run dev      # local dev server
bun run build    # production build
```

Or from `packages/git0-repo-downloader`: `bun run docs` / `bun run docs:build`.
