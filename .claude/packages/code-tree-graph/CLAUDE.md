# CLAUDE.md — `code-tree-graph`

**skill:** [`skills/code-tree-graph`](../../../skills/code-tree-graph/SKILL.md)
· **runner:** Vitest · **build:** Vite (`dist/index.cjs`)

React components for Fumadocs + Next.js:

| Component | Renders |
| --- | --- |
| `DependencyGraph` | A pan/zoom Mermaid flowchart from full AST analysis |
| `FileTreeView` | A searchable table with export/JSDoc metadata and GitHub deep links |
| `TypeTable` | Collapsible property tables |

All three are driven by a **local TypeScript/JS parser — no external service**.
Keep it that way: the selling point is that a docs build does not phone home.

## The coupling to watch

`apps/dev-tools-help-docs` renders these components. A change to a component's
props or output shape surfaces in the **docs build**, not in this package's
tests. After changing public props, build the docs site before assuming you're
done.

```bash
cd packages/code-tree-graph && bun run test && bun run build
cd ../../apps/dev-tools-help-docs && bun run build
```
