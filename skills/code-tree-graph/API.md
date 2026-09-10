# code-tree-graph API Reference

## `<DependencyGraph />` (server component)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `paths` | `string[]` | required | Directories to analyze (absolute, or relative to `cwd`). |
| `descriptions` | `Record<string, string>` | `{}` | Manual descriptions keyed by relative path. |
| `ignore` | `string[]` | `[]` | Names/patterns to exclude. |
| `ignoreFile` | `string` | — | Path to a gitignore-style `.treeignore`. |
| `showLegend` | `boolean` | `true` | Show the toggle controls. |
| `showNpmImports` | `boolean` | `false` | Render external npm dependency nodes. |
| `showTypes` | `boolean` | `false` | Render type-definition nodes. |
| `showPrivateFunctions` | `boolean` | `false` | Render non-exported function nodes. |
| `showExportedFunctions` | `boolean` | `false` | Render exported function nodes. |
| `instructions` | `React.ReactNode` | built-in help | Replace the help panel content. |

Node colors: entry points green, core modules blue, types purple, utils gray, npm deps orange. Interactions: drag to pan, Ctrl+scroll to zoom, click a node to jump to its file-tree row, hover for JSDoc/exports/signature, search to highlight. A GitHub URL or ZIP can be pasted to analyze a remote repo without cloning.

## `<FileTreeView />` (server component)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `paths` | `string[]` | required | Directories or files to scan. |
| `ghBase` | `string` | required | GitHub `tree/` URL for the scanned directory; file paths are appended to it. |
| `descriptions` | `Record<string, string>` | `{}` | Manual descriptions by relative path. |
| `ignore` | `string[]` | `[]` | Names/patterns to exclude. |
| `ignoreFile` | `string` | — | Path to a `.treeignore`. |
| `inferDescriptions` | `boolean` | `true` | Extract descriptions from leading JSDoc/comments. |
| `defaultImportFilter` | `"all" \| "local" \| "npm"` | — | Initial import filter. |
| `defaultInternalFilter` | `"all" \| "declared-types" \| "exported-types" \| "functions" \| "classes"` | — | Initial internals filter. |
| `defaultExportFilter` | `"all" \| "functions" \| "classes" \| "constants"` | — | Initial export filter. |
| `defaultCollapseDepth` | `number` | — | Initial collapse depth. |

## `<TypeTable />` (client component)

```tsx
<TypeTable type={{
  name: { type: "string", description: "The node name", required: true },
}} />
```

## Programmatic API

| Function | Signature |
| --- | --- |
| `generateFileTree` | `(packagesDir: string, descriptions?: Record<string,string>, ignorePatterns?: Set<string>, inferDescriptions?: boolean) => FileTreeNode[]` |
| `analyzeFileContent` | `(filename: string, source: string) => FileAnalysis` |
| `parseIgnoreFile` | `(path: string) => Set<string>` |

## Types

```ts
interface FileTreeNode {
  name: string;
  type: "file" | "folder";
  path: string;               // relative to scanned root
  description?: string;
  analysis?: FileAnalysis;
  children?: FileTreeNode[];
  packageDependencies?: string[];
  packageExports?: AnalysisItem[];
}

interface FileAnalysis {
  localImports: string[];
  localImportSymbols: { source: string; valueNames: string[]; typeNames: string[] }[];
  npmImports: string[];
  exports: AnalysisItem[];
  functions: AnalysisItem[];
  types: AnalysisItem[];
}

interface AnalysisItem {
  name: string;
  kind?: "function" | "class" | "constant" | "type";
  line?: number;
  jsdoc?: string;
  signature?: string;
  properties?: TypeProperty[];
}
```

## Runtime dependencies

`@typescript-eslint/typescript-estree` (AST), `mermaid` (graph), `fuse.js` (search), `jszip` (remote repos), `marked` (JSDoc → Markdown), `@radix-ui/react-tooltip`, `lucide-react`, `svg-toolbelt` (pan/zoom).
