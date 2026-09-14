# CLAUDE.md — `export-svg-typescript` (`packages/export-svg-icons-typescript`)

**npm name:** `export-svg-typescript` · **skill:** [`skills/export-svg-typescript`](../../../skills/export-svg-typescript/SKILL.md)
· **runner:** Vitest · **build:** none

Turns a directory of SVG files into a tree-shakable TypeScript barrel, with
runtime color and size options.

## Rules

- **Tree-shakability is the feature.** One export per icon, no side effects at
  module scope, no barrel that forces the whole set into a bundle. A change that
  makes the output convenient but unshakable defeats the package.
- SVG input is untrusted markup. Sanitize; never interpolate raw file content
  into a template where it could escape the attribute it belongs in.
- Output is deterministic — same input directory, same file, byte for byte.
  Sort; don't depend on readdir order.

Used by sibling repos in CI (`npx export-svg-typescript@latest …`), so a
breaking change to the CLI flags reaches beyond this monorepo.

```bash
cd packages/export-svg-icons-typescript && bun run test
```
