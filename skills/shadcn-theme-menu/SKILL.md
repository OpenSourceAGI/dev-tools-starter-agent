---
name: shadcn-theme-menu
description: Guide to shadcn-theme-menu (packages/shadcn-theme-menu), the shadcn/ui theme switcher — wiring ThemeProvider, ThemeToggle, ThemeDropdown, CinematicThemeSwitcher and SidebarUserMenu, importing themes.css, the 25 OKLCH color themes, setting themes programmatically, and injecting your own Button/DropdownMenu. Use when working with shadcn-theme-menu or troubleshooting it — a flash of the wrong theme on load, colors that don't change when the theme does, dark mode not applying, hydration mismatch warnings, or the dropdown rendering unstyled.
---

# Working With shadcn-theme-menu

The component set in `packages/shadcn-theme-menu`, published as **`shadcn-theme-menu`**. It layers a *color theme* (a `theme-*` class on `<html>`, persisted in `localStorage`) on top of `next-themes`' *light/dark mode* (a `class` attribute). Those are two independent axes — most confusion comes from conflating them.

## Setup

Three pieces, in this order:

1. **The CSS**, once, at the app root: `import "shadcn-theme-menu/themes.css";` — it defines every `theme-*` class as OKLCH custom properties.
2. **The provider**, wrapping the app: `<ThemeProvider attribute="class" defaultTheme="system">`. It re-exports `next-themes`, so `useTheme()` works as usual.
3. **A switcher component** anywhere below it.

```tsx
import { ThemeProvider, ThemeToggle, ThemeDropdown } from "shadcn-theme-menu";
```

Peers you're expected to already have: `react`, `react-dom`, `next-themes`, `lucide-react`.

## Picking the right component

| You want | Component |
| --- | --- |
| Light/dark/system toggle only | `<ThemeToggle />` — `mode="light-dark"` drops the system option |
| Full palette picker with live preview | `<ThemeDropdown />` |
| An animated, particle-effect toggle | `<CinematicThemeSwitcher />` |
| The switcher inside a shadcn sidebar footer | `<SidebarUserMenu />` |
| To set a theme from your own code | `themeNames`, `themeColors`, `formatThemeName` (see recipe) |

## Recipes

**Setting a color theme programmatically** — remove the previous `theme-*` class, add the new one, persist under the `color-theme` key:

```tsx
import { themeNames } from "shadcn-theme-menu";

localStorage.setItem("color-theme", name);
themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`));
document.documentElement.classList.add(`theme-${name}`);
```

**Available themes** — 25 of them: `modern-minimal`, `elegant-luxury`, `cyberpunk`, `twitter`, `mocha-mousse`, `bubblegum`, `amethyst-haze`, `pink-lemonade`, `notebook`, `doom-64`, `catppuccin`, `graphite`, `perpetuity`, `kodama-grove`, `cosmic-night`, `tangerine`, `quantum-rose`, `nature`, `bold-tech`, `amber-minimal`, `supabase`, `neo-brutalism`, `solar-dusk`, `claymorphism`, `pastel-dreams`. `themeColors[name]` gives `{ primary, secondary }` for swatches; `formatThemeName("modern-minimal")` → `"Modern Minimal"`.

**Using your own primitives** — pass `Button` and a `DropdownMenu` object (`Root`, `Trigger`, `Content`, `Item`, `Label`, `Separator`) so the switcher inherits your design system instead of the bundled shadcn copies.

**Reacting to changes** — `onThemeChange` on `ThemeToggle`; `onColorThemeChange` / `onModeChange` on `ThemeDropdown`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Flash of the wrong theme on first paint | The `theme-*` class is applied from `localStorage` after hydration. Add a small blocking inline script in `<head>` that reads `color-theme` and sets the class before React mounts — the same trick `next-themes` uses for dark mode. |
| Hydration mismatch warning on the toggle | The server can't know the stored theme. Render the switcher only after mount (`useEffect` + `mounted` flag), or pass `suppressHydrationWarning` on `<html>` as `next-themes` recommends. |
| Mode toggles but colors never change | `themes.css` wasn't imported, so the `theme-*` classes have no definitions. Import it at the root; the package marks CSS as side-effectful so bundlers keep it. |
| Colors change but dark mode doesn't | The two axes are separate: dark mode is `next-themes`' `class` attribute, color theme is `theme-*`. Make sure `ThemeProvider` has `attribute="class"` and your Tailwind config uses `darkMode: "class"`. |
| Chosen theme resets on reload | Persistence uses the `color-theme` `localStorage` key; something else is clearing it, or the app runs in an incognito/storage-blocked context. |
| Dropdown renders unstyled | Your project has no Tailwind/shadcn base layer, or you passed custom `DropdownMenu` primitives without their styles. Import `themes.css` and keep your shadcn `globals.css`. |
| `Cannot find module 'next-themes'` | It's a peer dependency, not bundled — install it. |
| Custom `Button` breaks the layout | The switchers pass their own `size`/`variant` props through; your Button must accept them or ignore them gracefully. |
