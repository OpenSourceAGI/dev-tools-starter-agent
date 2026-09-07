<p align="center">
    <img width="350px" src="https://i.imgur.com/mgErPzk.png" />
<p align="center">
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>
     <a href="https://github.com/OpenSourceAGI/starter-app-dev-tools/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/OpenSourceAGI/starter-app-dev-tools" /></a>
    <a href="https://github.com/OpenSourceAGI/starter-app-dev-tools/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/OpenSourceAGI/starter-app-dev-tools" />
    </a>
<br />
    <a href="https://github.com/OpenSourceAGI/starter-app-dev-tools/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/OpenSourceAGI/starter-app-dev-tools" />
    </a>
    <img src="https://img.shields.io/github/last-commit/OpenSourceAGI/starter-app-dev-tools.svg" alt="GitHub last commit" />
<br />
    <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/OpenSourceAGI/starter-app-dev-tools">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>

# shadcn-theme-menu

Beautiful theme components for shadcn/ui with 24+ color themes, dark/light mode, and animations.

## Features

- **24+ pre-made themes** – from minimal and elegant to cyberpunk and app-inspired designs
- **OKLCH colors** – modern color space for perceptually uniform colors and better accessibility
- **Drop-in components** – `ThemeToggle`, `ThemeDropdown`, and `CinematicThemeSwitcher` with particle effects
- **Fully type-safe** – complete TypeScript support with exported types
- **Customizable** – pass your own Button/DropdownMenu components or set themes programmatically
- **Persistent** – automatic `localStorage` support for color theme preferences

---

## Installation

```bash
# The package includes all required dependencies
pnpm add shadcn-theme-menu

# Peer dependencies (usually already in your project)
pnpm add react react-dom next-themes lucide-react
```

## Quick Start

```tsx
// 1. Import CSS
import 'shadcn-theme-menu/themes.css';

// 2. Wrap app with ThemeProvider
import { ThemeProvider } from 'shadcn-theme-menu';

<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>

// 3. Use components
import { ThemeToggle, ThemeDropdown, CinematicThemeSwitcher } from 'shadcn-theme-menu';

<ThemeToggle />
<ThemeDropdown />
<CinematicThemeSwitcher />
```

## Components

### ThemeToggle

Simple light/dark mode toggle.

```tsx
<ThemeToggle mode="light-dark-system" />
// or
<ThemeToggle mode="light-dark" />
```

**Props:**

- `mode?` - Include system option (default: `'light-dark-system'`)
- `Button?` - Custom Button component
- `DropdownMenu?` - Custom DropdownMenu components
- `onThemeChange?` - Callback when theme changes

### ThemeDropdown

Full dropdown with 24+ color themes and live preview.

```tsx
<ThemeDropdown
  iconSrc="/custom-icon.svg"
  onColorThemeChange={(theme) => console.log(theme)}
  onModeChange={(mode) => console.log(mode)}
/>
```

**Props:**

- `iconSrc?` - Custom icon path (default: Palette icon)
- `Button?` - Custom Button component
- `DropdownMenu?` - Custom DropdownMenu components
- `onColorThemeChange?` - Callback when color theme changes
- `onModeChange?` - Callback when light/dark mode changes

### CinematicThemeSwitcher

Animated toggle with particle effects.

```tsx
<CinematicThemeSwitcher />
```

### Available Themes

24 themes: `modern-minimal`, `elegant-luxury`, `cyberpunk`, `twitter`, `mocha-mousse`, `bubblegum`, `amethyst-haze`, `pink-lemonade`, `notebook`, `doom-64`, `catppuccin`, `graphite`, `perpetuity`, `kodama-grove`, `cosmic-night`, `tangerine`, `quantum-rose`, `nature`, `bold-tech`, `amber-minimal`, `supabase`, `neo-brutalism`, `solar-dusk`, `claymorphism`, `pastel-dreams`

## Custom Components

Pass your own Button or DropdownMenu components:

```tsx
import { Button } from "@/components/ui/button";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

<ThemeDropdown
  Button={Button}
  DropdownMenu={{
    Root: DropdownMenu.Root,
    Trigger: DropdownMenu.Trigger,
    Content: DropdownMenu.Content,
    Item: DropdownMenu.Item,
    Label: DropdownMenu.Label,
    Separator: DropdownMenu.Separator,
  }}
/>;
```

## Programmatic Usage

```tsx
import { themeNames, themeColors, formatThemeName } from "shadcn-theme-menu";

// Set theme programmatically
const setTheme = (themeName: string) => {
  localStorage.setItem("color-theme", themeName);
  themeNames.forEach((t) =>
    document.documentElement.classList.remove(`theme-${t}`),
  );
  document.documentElement.classList.add(`theme-${themeName}`);
};

// Get theme info
console.log(themeNames); // Array of all theme names
console.log(themeColors["cyberpunk"]); // { primary: '#ff00c8', secondary: '#f0f0ff' }
console.log(formatThemeName("modern-minimal")); // 'Modern Minimal'
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type { ThemeProviderProps } from "shadcn-theme-menu";
```

## Demo

Run the interactive demo:

```bash
pnpm demo
```

Or manually:

```bash
cd demo
pnpm install
pnpm dev
```

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
