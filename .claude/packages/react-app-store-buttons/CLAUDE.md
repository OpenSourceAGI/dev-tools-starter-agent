# CLAUDE.md — `react-app-store-buttons`

**skill:** [`skills/app-store-buttons`](../../../skills/app-store-buttons/SKILL.md)
· **runner:** Vitest · **build:** Vite + `tsc --emitDeclarationOnly`

React components for App Store / Google Play / platform download buttons, with
`appId` **or** `href` addressing, native deep links, and OS-based highlighting.

## Rules

- **Store badge artwork is trademarked and its usage rules are strict** —
  minimum sizes, clear space, no recoloring, no re-drawing. `src/assets.ts`
  holds the approved marks; do not restyle them to match a theme.
- `appId` vs `href` are two addressing modes and both are public API. Don't
  deprecate one silently.
- OS detection (`src/os.ts`) drives highlighting only — never gate the *link*
  behind it, or a desktop user can't reach the mobile store page.
- `styles.css` ships with the package; class names are public surface.

## Layout

`src/components/` · `src/assets.ts` · `src/os.ts` · `src/store-urls.ts` ·
`src/styles.css` · `src/types.ts`

```bash
cd packages/react-app-store-buttons && bun run test && bun run build
```
