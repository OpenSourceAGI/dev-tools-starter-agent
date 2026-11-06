# CLAUDE.md — `shadcn-theme-menu`

**skill:** [`skills/shadcn-theme-menu`](../../../skills/shadcn-theme-menu/SKILL.md)
· **runner:** Vitest (jsdom) · **build:** Vite library, `preserveModules`

shadcn/ui color themes as `theme-*` classes on `<html>`, the switchers that set
them (`ThemeToggle`, `ThemeDropdown`, `CinematicThemeSwitcher`,
`SidebarUserMenu`, `FontSwitcher`), and React-free helpers for the same.

## Rules

- **Storage keys, cookie names and event names are public API**
  (`color-theme`, `font-family`, `shadcn-theme-menu:*-change`). Apps read the
  cookies server-side; renaming one silently resets every user's choice.
- **Font ids in `fontOptions` are persisted** — add freely, never rename.
- **Every switcher goes through `src/color-theme.ts` / `src/fonts.ts`** so the
  sync events fire. Don't write `document.documentElement.classList` directly
  in a component.
- `src/themes.ts` is the registry and must stay React-free: `color-theme.ts`
  imports it, and `demo/vite.config.ts` imports `color-theme.ts` at config time.
- Switchers render `null` until mounted — the stored theme is unknowable on the
  server. Keep that guard.
- `themes-shadcn.css` font families with digits must be quoted
  (`test/themes-css.test.ts` enforces it).

## Layout

`src/themes.ts` (registry) · `src/color-theme.ts` · `src/fonts.ts` ·
`src/font-switcher.tsx` · `src/theme-dropdown.tsx` · `src/sidebar-user-menu.tsx`
· `src/themes-shadcn.css` · `demo/` (not a workspace; `index.html` full demo,
`app-shell.html` the app shell)

```bash
cd packages/shadcn-theme-menu && bun run test && bun run build
cd demo && bun install && bun run typecheck && bun run build
```
