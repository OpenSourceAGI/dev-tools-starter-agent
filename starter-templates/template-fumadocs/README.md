<p align="center">
    <img width="300px" src="https://i.imgur.com/jg49HQ8.png" />
</p>



# FumaDocs Template - API, Code Graph, Search 

A feature-rich documentation template built on [Fumadocs](https://fumadocs.vercel.app/) with Next.js 16, offering interactive code analysis, dependency graphs, AI integrations, OpenAPI docs, and full-text search out of the box.

## Quick Start

```bash
npm install
npm run dev        # Start dev server with Turbopack
npm run build      # Production build
```

## Features Overview

### 1. Site Configuration

All site-wide settings are centralized in a single config file:

**`lib/fumadocs/customize-docs.ts`**

```ts
export const docsConfig: DocsConfig = {
  title: "My Docs",
  description: "Project description",
  github: "https://github.com/user/repo",
  githubDocs: "https://github.com/user/repo/tree/master/docs/content/docs",
  favicon: "/favicon.ico",
  apiDocsPath: "./openapi.json",  // Optional: OpenAPI spec path
  topLinks: [
    { text: "Docs", url: "/docs" },
    { text: "GitHub", url: "https://github.com/user/repo", external: true },
  ],
};
```

This config drives the nav bar, favicon, GitHub links, and API doc generation automatically.

---

### 2. Interactive Code Dependency Graph

Visualizes your codebase as a Mermaid flowchart with full AST analysis.

**Usage in MDX:**

```mdx
import { DependencyGraph } from '@/components/fumadocs/graph/dependency-graph';

{/* Single directory */}
<DependencyGraph dir="../packages/my-lib" />

{/* Multiple directories merged into one graph */}
<DependencyGraph
  dir={["../packages/core", "../packages/utils"]}
  ignore={["bun.lock", "test"]}
  ignoreFile="../.treeignore"
  showLegend={true}
  showNpmImports={false}
  showTypes={false}
  showPrivateFunctions={false}
  showExportedFunctions={false}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dir` | `string \| string[]` | required | Directory or directories to analyze |
| `ignore` | `string[]` | `[]` | Glob patterns to exclude |
| `ignoreFile` | `string` | — | Path to `.treeignore` file (gitignore-style) |
| `showLegend` | `boolean` | `true` | Show toggle control buttons |
| `showNpmImports` | `boolean` | `false` | Display external npm dependency nodes |
| `showTypes` | `boolean` | `false` | Display type definition nodes |
| `showPrivateFunctions` | `boolean` | `false` | Display internal function nodes |
| `showExportedFunctions` | `boolean` | `false` | Display exported function nodes |
| `instructions` | `React.ReactNode` | Built-in help | Custom help panel content |

**Graph features:**
- Color-coded nodes: entry points (green), core modules (blue), types (purple), utils (gray), npm deps (orange)
- Pan & zoom with drag and Ctrl+scroll
- Click nodes to scroll to the file tree entry
- Hover tooltips with JSDoc, exports, and signatures
- Real-time search filtering with highlight
- Toggle buttons for npm/types/private/exported visibility
- **Remote repository analysis**: paste a GitHub URL or ZIP to analyze any repo

---

### 3. Interactive File Tree

A searchable, filterable table showing your codebase structure with full code analysis metadata.

**Usage in MDX:**

```mdx
import { FileTreeView } from '@/components/fumadocs/file-tree/filetree-view';

<FileTreeView
  dir="../packages"
  ghBase="https://github.com/user/repo/tree/master/packages"
  descriptions={{
    "my-lib": "Core library",
    "my-lib/index.ts": "Main entry point",
  }}
  ignore={["bun.lock"]}
  inferDescriptions={true}
  defaultImportFilter="all"
  defaultInternalFilter="all"
  defaultExportFilter="functions"
  defaultCollapseDepth={4}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dir` | `string` | required | Directory to scan |
| `ghBase` | `string` | required | GitHub base URL for file links |
| `descriptions` | `Record<string, string>` | `{}` | File/folder descriptions by relative path |
| `ignore` | `string[]` | `[]` | Patterns to exclude |
| `ignoreFile` | `string` | — | Path to `.treeignore` file |
| `inferDescriptions` | `boolean` | `true` | Auto-extract descriptions from JSDoc comments |
| `defaultImportFilter` | `"all" \| "local" \| "npm"` | `"all"` | Initial import filter |
| `defaultInternalFilter` | `"all" \| "declared-types" \| "exported-types" \| "functions" \| "classes"` | `"all"` | Initial types/internal filter |
| `defaultExportFilter` | `"all" \| "functions" \| "classes" \| "constants"` | `"all"` | Initial export filter |
| `defaultCollapseDepth` | `number` | — | Initial tree collapse depth |

**File tree features:**
- Fuzzy search (Fuse.js) across file names, imports, exports, JSDoc, signatures
- 3-column filter dropdowns (imports, types/internal, exports)
- Sort by import/type/export count
- Collapse depth slider
- Rich badge tooltips with Markdown-parsed descriptions, signatures, and properties
- Clickable badges linking to GitHub or npm
- Package.json detection with dependency listing

---

### 4. AST Code Analysis Engine

The core analysis engine (`lib/fumadocs/generate-filetree.ts`) parses TypeScript/JavaScript files and extracts:

- **Local imports** with symbol tracking (types vs values)
- **npm imports** (filtered against Node.js built-ins)
- **Exports**: functions, classes, constants, types with signatures
- **Internal functions and classes** with JSDoc
- **Type aliases and interfaces** with property details
- **Line numbers** for GitHub deep links

Supports `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` files using `@typescript-eslint/typescript-estree`.

**Programmatic usage:**

```ts
import { generateFileTree, parseIgnoreFile } from "@/lib/fumadocs/generate-filetree";

const tree = generateFileTree("/path/to/src", {}, new Set(["test"]), true);
```

---

### 5. AI Integration Components

#### LLM Copy Button

Fetches and copies raw MDX content to clipboard for pasting into LLMs.

```mdx
import { LLMCopyButton } from '@/components/fumadocs/ai/llm-copy-button';

<LLMCopyButton markdownUrl="/docs/getting-started.mdx" />
```

#### Ask AI Dropdown

Dropdown with links to query AI providers (GitHub Copilot, Claude, ChatGPT, QwkSearch) with page content as context.

```mdx
import { AskAIDropdown } from '@/components/fumadocs/ai/ask-ai-dropdown';

<AskAIDropdown
  markdownUrl="/docs/getting-started.mdx"
  githubUrl="https://github.com/user/repo/tree/master/docs/content/docs/getting-started.mdx"
/>
```

Both components are included automatically on every docs page via the page template.

---

### 6. LLM-Friendly Routes

Built-in API routes serve documentation content optimized for LLM and search consumption. All of them live under `app/docs/` alongside the doc pages themselves, so the whole `/docs` section — pages, search, and LLM routes — is self-contained and portable as a single folder.

| Route | Source file | Description |
|-------|-------------|-------------|
| `/docs/llms-full.txt` | `app/docs/llms-full.txt/route.ts` | All documentation pages concatenated as plain text |
| `/docs/<path>.mdx` | `app/docs/llms.mdx/docs/[[...slug]]/route.ts` | Individual page as raw Markdown (via URL rewrite) |
| `/docs/api/docs-search` | `app/docs/api/docs-search/route.ts` | Static Orama search index, consumed by the search dialog |

The `.mdx` route is reached through a rewrite in `next.config.ts` (`/docs/:path*.mdx` → `/docs/llms.mdx/docs/:path*`) rather than being requested directly. All three are cached indefinitely (`revalidate = false`).

---

### 7. OpenAPI Documentation

Generate interactive API docs from an OpenAPI/Swagger spec.

**Setup:**

1. Set `apiDocsPath` in `customize-docs.ts`
2. Run generation:

```bash
npm run build:api              # Uses path from config
# or
npm run build:api ./api.json   # Explicit path
```

3. Use in MDX:

```mdx
<APIPage />
```

Generated files go to `content/docs/(api)/`. The generator preserves existing `index.mdx` and `meta.json` files.

---

### 8. Full-Text Search

Powered by [Orama](https://orama.com/) for fast client-side full-text search across all documentation.

- Static search index generated at build time
- Integrated into the fumadocs search dialog
- Keyboard shortcut accessible (Ctrl+K)

---

### 9. Theme System

- Light/dark mode with `next-themes`
- System preference detection
- Persistent theme selection via localStorage
- Sun/Moon toggle button

---

### 10. MDX Components

All standard fumadocs-ui components plus extras are available in MDX files:

| Component | Source | Description |
|-----------|--------|-------------|
| `Tabs`, `Tab` | fumadocs-ui | Tabbed content panels |
| `File`, `Folder`, `Files` | fumadocs-ui | Static file tree display |
| `APIPage` | fumadocs-openapi | OpenAPI endpoint documentation |
| `InlineTOC` | fumadocs-ui | Inline table of contents |
| `DependencyGraph` | Custom | Interactive code dependency graph |
| `FileTreeView` | Custom | Interactive file tree with analysis |
| `TypeTable` | Custom | Property/type documentation tables |

#### Type Table

Display typed property tables with collapsible details:

```mdx
import { TypeTable } from '@/components/fumadocs/file-tree/type-table';

<TypeTable type={{
  name: {
    type: "string",
    description: "The display name",
    required: true,
  },
  options: {
    type: "Options",
    typeDescription: "{ timeout: number; retries: number }",
    default: "{}",
  },
}} />
```

---

### 11. Page Tree Code Titles

A custom loader plugin (`source.tsx`) that automatically wraps page titles ending with `()` or matching `<Component />` in `<code>` tags for proper formatting in the sidebar navigation.

---

### 12. Notebook-Style Layout

Uses `fumadocs-ui/layouts/notebook` for the docs section, providing a clean reading experience with:

- Sidebar navigation with page tree
- Table of contents per page
- Full-width page support via `full: true` frontmatter

---

## Project Structure

```
docs/
├── app/
│   ├── (home)/            # Home page layout
│   ├── docs/              # Self-contained /docs section — copy this whole folder to reuse it
│   │   ├── [[...slug]]/page.tsx        # Doc page renderer
│   │   ├── layout.tsx                  # Notebook layout (sidebar + TOC)
│   │   ├── api/docs-search/route.ts    # Orama search index route
│   │   ├── llms-full.txt/route.ts      # LLM full-text route
│   │   └── llms.mdx/docs/[[...slug]]/route.ts  # LLM per-page MDX route
│   ├── actions.ts         # Server actions (remote repo analysis)
│   ├── layout.config.tsx  # Shared layout options
│   └── provider.tsx       # Root provider (search, theme)
├── components/fumadocs/
│   ├── ai/                # LLM copy button, Ask AI dropdown
│   ├── api/               # OpenAPI page components
│   ├── file-tree/         # FileTreeView, FileTreeTable, badges, tooltips
│   ├── graph/             # DependencyGraph, Mermaid renderer
│   ├── layout/            # Search dialog, theme toggle
│   └── typography/        # Markdown renderer with highlighting
├── content/docs/          # MDX documentation files
├── lib/fumadocs/
│   ├── customize-docs.ts  # Site configuration
│   ├── generate-filetree.ts    # AST analysis engine
│   ├── generate-api-docs.ts    # OpenAPI doc generator
│   └── source.tsx         # Page loader & plugins
├── mdx-components.tsx     # MDX component registry
├── source.config.ts       # fumadocs-mdx collection config
└── next.config.ts         # Next.js + MDX config, docs `.mdx` rewrite
```

## Importing `/docs` into an Existing Next.js App

The entire documentation section — pages, notebook layout, search, and the LLM-friendly routes (`llms-full.txt`, `<path>.mdx`, search API) — is self-contained under `app/docs/`. To drop it into a bigger app and get it mounted at `/docs`, copy over only what that section needs:

**1. Copy these folders/files into the target app**

| From this template | To |
|---|---|
| `app/docs/` | `app/docs/` |
| `lib/fumadocs/` | `lib/fumadocs/` |
| `components/fumadocs/` | `components/fumadocs/` |
| `content/docs/` | `content/docs/` |
| `mdx-components.tsx` | `mdx-components.tsx` (merge if one exists) |
| `source.config.ts` | `source.config.ts` (merge if one exists) |
| `app/layout.config.tsx` | wherever you keep shared nav config; referenced by `app/docs/layout.tsx` |
| `app/provider.tsx` | merge its `RootProvider` (with `search.SearchDialog`) into your root layout/provider |

`app/(home)/` and `app/actions.ts` are specific to this template's landing page — skip them.

**2. Install dependencies**

```bash
npm install fumadocs-core fumadocs-ui fumadocs-mdx fumadocs-openapi \
  @orama/orama fuse.js next-themes lucide-react \
  @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-slot \
  class-variance-authority clsx marked mermaid
```

Drop `fumadocs-typescript`, `fumadocs-openapi`, `mermaid`, `fuse.js`, or `jszip` if you don't use the OpenAPI page, dependency graph, or file-tree components.

**3. Wrap `next.config.ts` with the MDX plugin and add the docs rewrite**

```ts
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX({});

const config = {
  // ...your existing config
  async rewrites() {
    return [
      // ...your existing rewrites
      {
        source: '/docs/:path*.mdx',
        destination: '/docs/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withMDX(config);
```

**4. Add the Fumadocs CSS to your global stylesheet**

```css
@import 'fumadocs-ui/css/shadcn.css';
@import 'fumadocs-ui/css/preset.css';
@import 'fumadocs-openapi/css/preset.css'; /* only if using OpenAPI */
```

Requires Tailwind CSS v4 (`@tailwindcss/postcss` in `postcss.config.mjs`), since Fumadocs' preset styles are Tailwind-based.

**5. Point `docsConfig` at the target app**

Edit `lib/fumadocs/customize-docs.ts` (`title`, `github`, `githubDocs`, `topLinks`, etc.) to match the host app.

**6. Verify the routes**

After merging, `/docs`, `/docs/<page>`, `/docs/<page>.mdx`, `/docs/llms-full.txt`, and `/docs/api/docs-search` should all resolve — run `npm run build` and check the route list in the build output.

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `fumadocs-core` | Core docs framework |
| `fumadocs-ui` | UI components and layouts |
| `fumadocs-mdx` | MDX integration |
| `fumadocs-openapi` | OpenAPI documentation |
| `@orama/orama` | Full-text search engine |
| `fuse.js` | Fuzzy search for file tree |
| `mermaid` | Diagram rendering |
| `marked` | Markdown parsing in tooltips |
| `@typescript-eslint/typescript-estree` | AST parsing for code analysis |
| `next-themes` | Dark/light mode |
| `lucide-react` | Icons |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run build:preview` | Build and preview locally |
| `npm run build:api` | Generate API docs from OpenAPI spec |
| `npm run check` | Type-check and validate MDX |
| `npm run favicon` | Generate favicon variants from source image |
