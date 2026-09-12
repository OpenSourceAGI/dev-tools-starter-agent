<p align="center">
    <img width="300px" src="https://i.imgur.com/nkXljkR.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/code-tree-graph"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/code-tree-graph"><img src="https://img.shields.io/npm/dm/code-tree-graph.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/code-tree-graph"><img src="https://img.shields.io/npm/v/code-tree-graph.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/code-tree-graph"><img src="https://img.shields.io/npm/dt/code-tree-graph.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/code-tree-graph"><img src="https://img.shields.io/npm/types/code-tree-graph" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=code-tree-graph"><img src="https://packagephobia.com/badge?p=code-tree-graph" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/code-tree-graph"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Next.js-black?logo=nextdotjs&logoColor=white" alt="Next.js" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill code-tree-graph` ([what it covers](../../skills/code-tree-graph/SKILL.md))
<!-- skills:install:end -->

# code-tree-graph

Interactive code dependency graph and file tree visualization components for [Fumadocs](https://fumadocs.vercel.app/) + Next.js. Drop them into any MDX page to generate live, navigable views of your codebase — no external service required.

**What's included:**
- **`DependencyGraph`** — Mermaid flowchart built from full AST analysis, with pan/zoom, search, hover tooltips, and remote repo ZIP support
- **`FileTreeView`** — searchable, filterable file table with export/import/JSDoc metadata and GitHub deep links
- **`TypeTable`** — collapsible property tables for type documentation
- **AST engine** — TypeScript/JS parser extracting imports, exports, functions, types, and signatures

---

## Installation

```bash
npm i code-tree-graph
```

Import the CSS once in your app root (e.g. `app/layout.tsx`):

```ts
import "code-tree-graph/dist/index.css";
```

### Peer dependencies

```bash
npm install react react-dom next fumadocs-core
```

---

## Components

### DependencyGraph

Server component. Scans directories with the AST engine and renders an interactive Mermaid flowchart.

```tsx
import { DependencyGraph } from "code-tree-graph";

export default function Page() {
  return (
    <DependencyGraph
      paths={["../packages/core", "../packages/utils"]}
      ignore={["node_modules", "dist", "*.test.ts"]}
      ignoreFile="../.treeignore"
      showLegend={true}
      showNpmImports={false}
      showTypes={false}
      showPrivateFunctions={false}
      showExportedFunctions={false}
    />
  );
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `paths` | `string[]` | required | Directories to analyze (absolute or relative to `cwd`) |
| `descriptions` | `Record<string, string>` | `{}` | Manual descriptions keyed by relative path |
| `ignore` | `string[]` | `[]` | File/folder names or patterns to exclude |
| `ignoreFile` | `string` | — | Path to a `.treeignore` file (gitignore-style) |
| `showLegend` | `boolean` | `true` | Show toggle control buttons |
| `showNpmImports` | `boolean` | `false` | Display external npm dependency nodes |
| `showTypes` | `boolean` | `false` | Display type definition nodes |
| `showPrivateFunctions` | `boolean` | `false` | Display internal (non-exported) function nodes |
| `showExportedFunctions` | `boolean` | `false` | Display exported function nodes |
| `instructions` | `React.ReactNode` | built-in help | Custom help panel content |

**Features:**
- Color-coded nodes: entry points (green), core modules (blue), types (purple), utils (gray), npm deps (orange)
- Pan & zoom with drag and Ctrl+scroll
- Click a node to scroll to its file tree entry
- Hover tooltips with JSDoc, exports, and signatures
- Real-time search with node highlight
- Toggle visibility of npm / types / private / exported nodes
- Remote repo analysis: paste a GitHub URL or ZIP to analyze any repo without cloning

---

### FileTreeView

Server component. Generates a filterable table of your file tree with code-analysis metadata.

```tsx
import { FileTreeView } from "code-tree-graph";

export default function Page() {
  return (
    <FileTreeView
      paths={["../packages/my-lib"]}
      ghBase="https://github.com/user/repo/tree/master/packages/my-lib"
      descriptions={{
        "my-lib": "Core library",
        "my-lib/index.ts": "Main entry point",
      }}
      ignore={["node_modules", "dist"]}
      inferDescriptions={true}
      defaultImportFilter="all"
      defaultInternalFilter="all"
      defaultExportFilter="functions"
      defaultCollapseDepth={4}
    />
  );
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `paths` | `string[]` | required | Directories or files to scan |
| `ghBase` | `string` | required | GitHub base URL for file deep-links |
| `descriptions` | `Record<string, string>` | `{}` | Manual descriptions keyed by relative path |
| `ignore` | `string[]` | `[]` | File/folder names or patterns to exclude |
| `ignoreFile` | `string` | — | Path to a `.treeignore` file |
| `inferDescriptions` | `boolean` | `true` | Auto-extract descriptions from leading JSDoc/comments |
| `defaultImportFilter` | `"all" \| "local" \| "npm"` | — | Initial import filter |
| `defaultInternalFilter` | `"all" \| "declared-types" \| "exported-types" \| "functions" \| "classes"` | — | Initial internals filter |
| `defaultExportFilter` | `"all" \| "functions" \| "classes" \| "constants"` | — | Initial export filter |
| `defaultCollapseDepth` | `number` | — | Initial tree collapse depth |

**Features:**
- Fuzzy search (Fuse.js) across names, imports, exports, JSDoc, and signatures
- 3 independent filter dropdowns (imports, types/internals, exports)
- Sort by import / type / export count
- Collapse depth slider
- Rich badge tooltips with Markdown-parsed descriptions, signatures, and type properties
- Clickable file badges linking to GitHub source lines
- `package.json` detection with dependency listing

---

### TypeTable

Client component for rendering collapsible type/property tables in documentation pages.

```tsx
import { TypeTable } from "code-tree-graph";

export default function Page() {
  return (
    <TypeTable
      type={{
        name: { type: "string", description: "The node name", required: true },
        children: { type: "TypeNode[]", description: "Nested children", required: false },
      }}
    />
  );
}
```

---

## Programmatic API

The AST engine is available as a standalone Node.js API:

```ts
import {
  generateFileTree,
  analyzeFileContent,
  parseIgnoreFile,
} from "code-tree-graph";
```

### `generateFileTree`

Scans a directory and returns a tree of [`FileTreeNode`](#filetreenode) objects.

```ts
const tree = generateFileTree(
  "/absolute/path/to/src",
  { "index.ts": "Main entry" }, // descriptions
  new Set(["node_modules", "dist"]), // ignorePatterns
  true // inferDescriptions from JSDoc
);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `packagesDir` | `string` | required | Root directory to scan |
| `descriptions` | `Record<string, string>` | `{}` | Manual descriptions by relative path |
| `ignorePatterns` | `Set<string>` | `new Set()` | File/folder names to skip |
| `inferDescriptions` | `boolean` | `false` | Extract descriptions from source comments |

### `analyzeFileContent`

Analyzes source text in memory — no filesystem read needed.

```ts
import { analyzeFileContent } from "code-tree-graph";

const analysis = analyzeFileContent("index.ts", sourceText);
// { localImports, npmImports, exports, functions, types, ... }
```

### `parseIgnoreFile`

Parses a `.gitignore`-style file into a `Set<string>` of patterns.

```ts
import { parseIgnoreFile } from "code-tree-graph";

const patterns = parseIgnoreFile("/path/to/.treeignore");
const tree = generateFileTree("/path/to/src", {}, patterns);
```

---

## Types

### `FileTreeNode`

```ts
interface FileTreeNode {
  name: string;
  type: "file" | "folder";
  path: string;             // relative to scanned root
  description?: string;
  analysis?: FileAnalysis;
  children?: FileTreeNode[];
  packageDependencies?: string[];  // from package.json
  packageExports?: AnalysisItem[];
}
```

### `FileAnalysis`

```ts
interface FileAnalysis {
  localImports: string[];
  localImportSymbols: { source: string; valueNames: string[]; typeNames: string[] }[];
  npmImports: string[];
  exports: AnalysisItem[];
  functions: AnalysisItem[];
  types: AnalysisItem[];
}
```

### `AnalysisItem`

```ts
interface AnalysisItem {
  name: string;
  kind?: "function" | "class" | "constant" | "type";
  line?: number;
  jsdoc?: string;
  signature?: string;
  properties?: TypeProperty[];
}
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@typescript-eslint/typescript-estree` | AST parsing for TS/JS |
| `mermaid` | Graph rendering |
| `fuse.js` | Fuzzy search |
| `jszip` | Remote ZIP repo analysis |
| `marked` | JSDoc → Markdown in tooltips |
| `@radix-ui/react-tooltip` | Badge tooltips |
| `lucide-react` | Icons |
| `svg-toolbelt` | SVG pan/zoom |

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
