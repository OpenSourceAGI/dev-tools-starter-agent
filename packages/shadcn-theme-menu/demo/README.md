# shadcn-theme-menu — demo

An interactive page that exercises everything `shadcn-theme-menu` exports, built
against the package **source** rather than a published build, so a change in
`../src` shows up on the next hot reload.

## Running it

The demo pins `bun` as its package manager, so use `bun` rather than `npm` or
`pnpm` — `pnpm` refuses to run in a directory whose `packageManager` field names
another runner.

```bash
bun install
bun dev       # http://localhost:3001
```

```bash
bun build     # production bundle in dist/
bun preview   # serve that bundle
bun typecheck # tsc over the demo and the package source it pulls in
```

From the package root, `bun demo` runs the dev server for you.

## Deploying to Vercel

A [`vercel.json`](./vercel.json) is included so a Vercel project with **Root Directory** set to `packages/shadcn-theme-menu/demo` builds with Vite (`bun run build`) and serves `dist/` without triggering Turborepo defaults.

The `vercel.json` values are what make the build work, and they rely on two
things that are easy to get wrong in the dashboard:

- **Install command `bun install`**, not the default `npm install`. `npm`
  refuses to run in a directory whose `packageManager` field names another
  runner, and the demo's does.
- **Root Directory** pointing at this folder, with the rest of the repo still
  available to the build. The demo compiles the package *source* from `../src`,
  so the build needs files above the root directory — keep Vercel's
  "Include source files outside of the Root Directory" setting on.

Note that the demo directory is deliberately **not** a member of the root
`bun` workspace (`packages/*` does not reach `packages/shadcn-theme-menu/demo`).
That is what keeps `bun install` here scoped to this one package instead of
installing the whole monorepo.

On a Hobby plan the team gets **one concurrent build**, and every project
connected to this repository builds on every push. With several projects
connected, a push queues one build per project behind each other, and a
deployment can sit in "Queued" for many minutes before it even starts — the
dashboard shows "Build Logs: Loading" the whole time, because there are no
logs yet. Two ways out: connect only the projects you actually want to deploy,
or stop auto-deploying on every push for the ones you don't.

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
