/**
 * Color-theme helpers, framework-agnostic.
 *
 * A color theme is nothing more than a `theme-<name>` class on `<html>`. The
 * stylesheet pairs it with the light/dark class `next-themes` manages
 * (`.theme-nord.dark { … }`), so mode and palette switch independently. These
 * are the same steps `ThemeDropdown` and `SidebarUserMenu` take, exported so an
 * app can drive the theme from its own UI, a settings page, or plain JS.
 */
import { themeNames } from "./themes"
import { FONT_INIT_STYLE_ID, FONT_STORAGE_KEY, fontOptions, googleFontsUrl, THEME_FONT_ID } from "./fonts"

/** `localStorage` key (and cookie name) the color theme is stored under. */
export const COLOR_THEME_STORAGE_KEY = "color-theme"

/** Event dispatched on `window` after `setColorTheme`, with the name in `detail`. */
export const COLOR_THEME_CHANGE_EVENT = "shadcn-theme-menu:color-theme-change"

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined"

/** Swap the `theme-*` class on `<html>` without persisting — a preview. */
export function applyColorTheme(name: string): void {
  if (!isBrowser()) return
  const root = document.documentElement
  themeNames.forEach((t) => root.classList.remove(`theme-${t}`))
  root.classList.add(`theme-${name}`)
}

/** The stored color theme, or `fallback` when none (or an unknown one) is stored. */
export function getStoredColorTheme(fallback = "minimal"): string {
  if (!isBrowser()) return fallback
  try {
    const saved = localStorage.getItem(COLOR_THEME_STORAGE_KEY)
    return saved && themeNames.includes(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

/**
 * Choose a color theme: apply it, persist it to `localStorage` and a cookie,
 * and dispatch `COLOR_THEME_CHANGE_EVENT` on `window` so other switchers on the
 * page can follow along.
 */
export function setColorTheme(name: string): void {
  if (!isBrowser()) return
  applyColorTheme(name)
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, name)
  } catch {
    // Storage blocked: the theme still applies for this page view.
  }
  document.cookie = `${COLOR_THEME_STORAGE_KEY}=${name}; path=/; max-age=31536000`
  window.dispatchEvent(new CustomEvent(COLOR_THEME_CHANGE_EVENT, { detail: name }))
}

/**
 * A tiny script to inline in `<head>` so the stored color theme *and* font are
 * on `<html>` before the first paint — without it the page flashes the default
 * theme until React mounts. `next-themes` already does the same for light/dark.
 *
 * ```tsx
 * // Next.js app/layout.tsx
 * <head><script dangerouslySetInnerHTML={{ __html: themeInitScript() }} /></head>
 * ```
 *
 * ```html
 * <!-- any HTML page -->
 * <script>/* paste the output of themeInitScript() here *\/</script>
 * ```
 */
export function themeInitScript(defaultTheme = "minimal"): string {
  // id → [font-family stack, Google Fonts URL or ""]
  const fonts: Record<string, [string, string]> = {}
  for (const option of fontOptions) {
    if (option.id === THEME_FONT_ID) continue
    fonts[option.id] = [option.stack, option.google ? googleFontsUrl([option.google], option.weights) : ""]
  }
  const json = JSON.stringify
  // The font goes in a <style> rather than inline: <body> does not exist yet
  // when this runs. `applyFont` removes it (FONT_INIT_STYLE_ID) on first use.
  return (
    `(function(){try{var d=document.documentElement,t=localStorage.getItem(${json(COLOR_THEME_STORAGE_KEY)})||${json(defaultTheme)};` +
    `if(${json(themeNames)}.indexOf(t)<0)t=${json(defaultTheme)};d.classList.add("theme-"+t);` +
    `var id=localStorage.getItem(${json(FONT_STORAGE_KEY)}),f=${json(fonts)}[id];if(!f)return;d.dataset.font=id;` +
    `var st=document.createElement("style");st.id=${json(FONT_INIT_STYLE_ID)};` +
    `st.textContent="html,html body{font-family:"+f[0]+" !important}";document.head.appendChild(st);` +
    `if(f[1]){var l=document.createElement("link");l.rel="stylesheet";l.href=f[1];document.head.appendChild(l)}` +
    `}catch(e){}})()`
  )
}
