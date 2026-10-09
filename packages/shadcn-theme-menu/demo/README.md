# shadcn-theme-menu — demo

An interactive page that exercises everything `shadcn-theme-menu` exports, built
against the package **source** rather than a published build, so a change in
`../src` shows up on the next hot reload.

## Running it

```bash
pnpm install
pnpm dev       # http://localhost:3001
```

```bash
pnpm build     # production bundle in dist/
pnpm preview   # serve that bundle
pnpm typecheck # tsc over the demo and the package source it pulls in
```

From the package root, `pnpm demo` runs the dev server for you.

## What it covers

| Section | Shows |
| --- | --- |
| Header | `ThemeToggle`, `ThemeDropdown` and `CinematicThemeSwitcher` side by side |
| Every theme | Each styled theme as a clickable swatch, plus the names the menus list that ship no stylesheet |
| A theme is a typeface too | `--font-sans` applied automatically, `.font-theme-serif` / `.font-theme-mono` opted into, with the resolved family printed live |
| The components | Every switcher wired to its callbacks, including `ThemeDropdown` rendered through injected `Button` and `DropdownMenu` primitives |
| Callbacks | A running log of `onThemeChange` / `onColorThemeChange` / `onModeChange` |
| On a real surface | The shadcn dashboard block re-themed end to end, with `SidebarUserMenu` in the sidebar footer |

Hovering a theme in any of the package's menus previews it across the whole page
— colors *and* type — and reverts on mouse-out.

## How it wires up the package

Three pieces of setup make consuming source-from-outside-the-root work, and each
is worth knowing if you copy this demo as a starting point:

- **`vite.config.ts`** aliases `shadcn-theme-menu` and `shadcn-theme-menu/themes.css`
  onto `../src`, mirroring the published `exports` map so imports here read like
  real consumer code. A small `resolveId` plugin re-resolves the bare imports the
  package source makes (`next-themes`, `lucide-react`, `@radix-ui/*`, …) against
  the demo's own `node_modules`, since `../src` has none of its own.
- **`src/index.css`** adds `@source "../../src"` so Tailwind v4 scans the package
  for class names — without it, utilities used only by the package (`w-56`,
  `max-h-[400px]`) are never generated and its menus render half-styled. It also
  declares `@custom-variant dark (&:where(.dark, .dark *))`, which is what binds
  the `dark:` variant to the class `next-themes` toggles instead of the OS
  preference.
- **`src/lib/theme-catalog.ts`** reads the CSSOM to find which `theme-*` classes
  actually have rules behind them, so the gallery never offers a theme that would
  do nothing.
