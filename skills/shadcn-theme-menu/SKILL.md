---
name: shadcn-theme-menu
description: Guide to shadcn-theme-menu (packages/shadcn-theme-menu) — 60+ shadcn/ui color themes as `theme-*` classes on <html>, with ThemeToggle, ThemeDropdown, CinematicThemeSwitcher, SidebarUserMenu and FontSwitcher, plus framework-agnostic helpers (setColorTheme, setFont, loadGoogleFont, themeInitScript). Covers how a theme class pairs with next-themes light/dark, per-theme fonts, adding Google / Fontsource / next/font faces to the font switcher, avoiding a flash of the default theme, and the responsive app shell demo. Use when adding a theme or font picker to a shadcn app, wiring themes into Next.js or Vite, or debugging menus that render unstyled, fonts that do not change, a theme that flashes on reload, or two switchers that disagree.
---

# Working With shadcn-theme-menu

A theme is one class on `<html>` (`theme-nord`) next to the `light`/`dark` class
`next-themes` manages. `themes.css` defines every shadcn token — colors,
`--radius`, `--font-sans/serif/mono` — for each `.theme-<name>.light|.dark`
pair, so components re-theme through the cascade without re-rendering.

## Setup

```tsx
import "shadcn-theme-menu/themes.css";
import { ThemeProvider, ThemeDropdown, ThemeToggle, FontSwitcher } from "shadcn-theme-menu";

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <header><FontSwitcher /><ThemeDropdown /><ThemeToggle /></header>
</ThemeProvider>
```

Tailwind v4 needs two lines in the app CSS: `@custom-variant dark (&:where(.dark, .dark *));`
and, when consuming the package from source, `@source "<path>/shadcn-theme-menu/src";`.

## Which export to reach for

| You want | Use |
| --- | --- |
| Light/dark/system button | `ThemeToggle` |
| Mode + color theme menu with hover preview | `ThemeDropdown` |
| Account menu with Color Theme + Font submenus | `SidebarUserMenu` (`onColorThemeChange`, `onFontChange`, `hideFontMenu`) |
| A font picker | `FontSwitcher` (`fonts`, `onFontChange`) or `useFontSwitcher` for a custom UI |
| Change theme from code | `setColorTheme(name)` — `applyColorTheme` for preview only |
| Change font from code | `setFont(id)` — `"theme"` clears the override |
| No flash on reload | `themeInitScript()` inlined in `<head>` |
| Theme list / swatches / labels | `themeNames`, `themeColors`, `formatThemeName` |

Storage: `localStorage["color-theme"]` + cookie; `localStorage["font-family"]` + cookie.
Events on `window`: `COLOR_THEME_CHANGE_EVENT`, `FONT_CHANGE_EVENT` — every switcher
listens, so they stay in sync.

## Recipes

**Add a font.** Extend `fontOptions` at module level and pass it as `fonts`.
Google: `{ id, label, category, stack: '"Manrope", sans-serif', google: "Manrope" }`
(loaded on first preview/choose). Fontsource / `next/font`: omit `google`, point
`stack` at the self-hosted family or CSS variable. Quote families containing digits.

**Next.js, no flash.** In `app/layout.tsx`:
`<html suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript("minimal") }} /></head>`.
Vite: replace a placeholder in `transformIndexHtml` (see `demo/vite.config.ts`).

**App shell.** `demo/src/app-shell/AppShell.tsx` — shadcn sidebar (`collapsible="icon"`,
sheet below 768px), sticky header with the three switchers, `SidebarUserMenu` in the
footer. `bun demo` then open `/app-shell.html`.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Menus render half-styled | Tailwind never scanned the package | `@source` the package `src` in the app CSS |
| `dark:` ignores the toggle | v4 `dark:` follows the OS by default | `@custom-variant dark (&:where(.dark, .dark *))` |
| Theme colors don't change | Only `theme-x` or only `dark` present — rules need the pair | Wrap in `ThemeProvider attribute="class"` |
| App font override loses to the theme | Theme rule is `html[class*="theme-"] body` (0,1,1); `:root { --font-sans }` loses at (0,2,0) | Restate that selector after the import, or use `setFont` (inline on html *and* body) |
| Chosen font shows the fallback | Family not loaded (no `google`, nothing self-hosted) or unquoted digit name | Add `google`, import the Fontsource package, or quote the family |
| Default theme flashes on reload | Theme read from `localStorage` after mount | Inline `themeInitScript()` in `<head>` |
| Two switchers disagree | Theme set by writing the class directly | Call `setColorTheme` / `setFont`, which fire the sync events |
| Hydration mismatch on `<html>` | Init script changed the class before hydrate | `suppressHydrationWarning` on `<html>` |
