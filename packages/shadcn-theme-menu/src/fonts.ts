/**
 * Font switching, framework-agnostic.
 *
 * A color theme already brings its own typeface (`--font-sans` and friends,
 * applied by `themes.css`). These helpers layer an optional *user* font on top
 * of that: pick a family, it is loaded on demand from Google Fonts (unless it is
 * a system stack or you loaded it yourself), applied to the page, and
 * remembered in `localStorage` + a cookie. Choosing `"theme"` clears the
 * override and hands typography back to the active color theme.
 *
 * Why inline styles on both `<html>` and `<body>`: `themes.css` sets
 * `font-family` with `html[class*="theme-"], html[class*="theme-"] body`, so an
 * override has to beat that rule at both elements. An inline style does; a
 * `:root { --font-sans }` override does not (each theme redeclares it at higher
 * specificity).
 *
 * Nothing here touches React — `FontSwitcher` and `SidebarUserMenu` are thin
 * wrappers over these functions, and a vanilla page can call them directly.
 */

export type FontCategory = "sans" | "serif" | "mono" | "display"

export interface FontOption {
  /** Stable id stored in `localStorage` — never rename a shipped one. */
  id: string
  /** What menus show. */
  label: string
  category: FontCategory
  /** Full CSS `font-family` value, fallbacks included. */
  stack: string
  /**
   * Google Fonts family name to load on demand, e.g. `"Inter"`. Leave unset for
   * system stacks and for faces your app already self-hosts.
   */
  google?: string
  /** Weights to request from Google Fonts. Defaults to 400;500;600;700. */
  weights?: number[]
}

/** The pseudo-font that means "no override — use the color theme's font". */
export const THEME_FONT_ID = "theme"

/** `localStorage` key (and cookie name) the chosen font id is stored under. */
export const FONT_STORAGE_KEY = "font-family"

/** Id of the `<style>` `themeInitScript` injects; `applyFont` removes it. */
export const FONT_INIT_STYLE_ID = "stm-font-init"

/** Event dispatched on `window` after `setFont`, with the new id in `detail`. */
export const FONT_CHANGE_EVENT = "shadcn-theme-menu:font-change"

const SANS_FALLBACK = "ui-sans-serif, system-ui, sans-serif"
const SERIF_FALLBACK = "ui-serif, Georgia, serif"
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, monospace"

const google = (
  family: string,
  category: FontCategory,
  extra: Partial<FontOption> = {},
): FontOption => {
  const fallback =
    category === "serif" ? SERIF_FALLBACK : category === "mono" ? MONO_FALLBACK : SANS_FALLBACK
  // Families whose name starts with a digit, or contains one, must be quoted —
  // an unquoted `Source Serif 4` is an invalid identifier and the whole
  // declaration is dropped.
  return {
    id: family.toLowerCase().replace(/\s+/g, "-"),
    label: family,
    category,
    stack: `"${family}", ${fallback}`,
    google: family,
    ...extra,
  }
}

/**
 * Fonts the menus offer. The first group mirrors the families `themes.css`
 * already imports, so choosing one costs no extra request; the rest are loaded
 * from Google Fonts the first time they are previewed or chosen.
 */
export const fontOptions: FontOption[] = [
  { id: THEME_FONT_ID, label: "Theme default", category: "sans", stack: "" },
  { id: "system", label: "System UI", category: "sans", stack: SANS_FALLBACK },
  // Sans
  google("Inter", "sans"),
  google("Geist", "sans"),
  google("DM Sans", "sans", { weights: [400, 500, 700] }),
  google("Plus Jakarta Sans", "sans"),
  google("Poppins", "sans"),
  google("Montserrat", "sans"),
  google("Open Sans", "sans"),
  google("Outfit", "sans"),
  google("Roboto", "sans", { weights: [400, 500, 700] }),
  google("Nunito", "sans"),
  google("Work Sans", "sans"),
  google("Atkinson Hyperlegible", "sans", { weights: [400, 700] }),
  // Serif
  { id: "system-serif", label: "System Serif", category: "serif", stack: SERIF_FALLBACK },
  google("Lora", "serif"),
  google("Merriweather", "serif", { weights: [400, 700] }),
  google("Playfair Display", "serif"),
  google("Source Serif 4", "serif"),
  google("Libre Baskerville", "serif", { weights: [400, 700] }),
  google("Fraunces", "serif"),
  // Mono
  { id: "system-mono", label: "System Mono", category: "mono", stack: MONO_FALLBACK },
  google("JetBrains Mono", "mono", { weights: [400, 500, 700] }),
  google("Fira Code", "mono", { weights: [400, 500, 700] }),
  google("Geist Mono", "mono", { weights: [400, 500, 700] }),
  google("IBM Plex Mono", "mono", { weights: [400, 500, 700] }),
  google("Space Mono", "mono", { weights: [400, 700] }),
  // Display
  google("Oxanium", "display"),
  google("Quicksand", "display"),
  google("Architects Daughter", "display", { weights: [400] }),
]

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined"

/** Look a font up by id. Unknown ids return `undefined`. */
export function getFontOption(id: string, options: FontOption[] = fontOptions): FontOption | undefined {
  return options.find((option) => option.id === id)
}

/**
 * The Google Fonts CSS2 URL for one or more families.
 *
 * ```ts
 * googleFontsUrl(["Inter", "JetBrains Mono"])
 * // https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap
 * ```
 */
export function googleFontsUrl(families: string[], weights: number[] = [400, 500, 600, 700]): string {
  const params = families
    .map((family) => `family=${family.trim().replace(/\s+/g, "+")}:wght@${[...weights].sort((a, b) => a - b).join(";")}`)
    .join("&")
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

const linkId = (family: string) => `stm-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

/**
 * Load a Google Fonts family by injecting a `<link rel="stylesheet">` into
 * `<head>`. Idempotent: a second call for the same family reuses the first
 * link. Resolves when the stylesheet has loaded (or failed — a missing font
 * should never break the page, the fallback stack just stays in place). On the
 * server it resolves immediately and does nothing.
 */
export function loadGoogleFont(family: string, weights?: number[]): Promise<void> {
  if (!isBrowser()) return Promise.resolve()

  const id = linkId(family)
  const existing = document.getElementById(id) as HTMLLinkElement | null
  if (existing) {
    return existing.dataset.loaded === "true"
      ? Promise.resolve()
      : new Promise((resolve) => {
          existing.addEventListener("load", () => resolve(), { once: true })
          existing.addEventListener("error", () => resolve(), { once: true })
        })
  }

  const link = document.createElement("link")
  link.id = id
  link.rel = "stylesheet"
  link.href = googleFontsUrl([family], weights)
  const done = new Promise<void>((resolve) => {
    link.addEventListener(
      "load",
      () => {
        link.dataset.loaded = "true"
        resolve()
      },
      { once: true },
    )
    link.addEventListener("error", () => resolve(), { once: true })
  })
  document.head.appendChild(link)
  return done
}

/** Load whatever a font option needs. System stacks need nothing. */
export function loadFont(option: FontOption): Promise<void> {
  return option.google ? loadGoogleFont(option.google, option.weights) : Promise.resolve()
}

/**
 * Apply a font to the page without remembering it — what a hover preview
 * wants. `"theme"` (or an unknown id) clears the override. Returns the option
 * that was applied, if any.
 */
export function applyFont(id: string, options: FontOption[] = fontOptions): FontOption | undefined {
  if (!isBrowser()) return undefined

  const option = getFontOption(id, options)
  const stack = option && option.id !== THEME_FONT_ID ? option.stack : ""

  if (option) void loadFont(option)
  document.getElementById(FONT_INIT_STYLE_ID)?.remove()
  document.documentElement.style.fontFamily = stack
  if (document.body) document.body.style.fontFamily = stack
  if (stack) document.documentElement.dataset.font = option!.id
  else delete document.documentElement.dataset.font

  return stack ? option : undefined
}

/** The font id the user last chose, or `"theme"` when there is none. */
export function getStoredFont(): string {
  if (!isBrowser()) return THEME_FONT_ID
  try {
    return localStorage.getItem(FONT_STORAGE_KEY) || THEME_FONT_ID
  } catch {
    return THEME_FONT_ID
  }
}

/**
 * Choose a font: apply it, persist it to `localStorage` and a cookie (so a
 * server can render it too), and dispatch `FONT_CHANGE_EVENT` on `window`.
 */
export function setFont(id: string, options: FontOption[] = fontOptions): void {
  if (!isBrowser()) return

  applyFont(id, options)
  try {
    if (id === THEME_FONT_ID) localStorage.removeItem(FONT_STORAGE_KEY)
    else localStorage.setItem(FONT_STORAGE_KEY, id)
  } catch {
    // Private mode / blocked storage: the font still applies for this page.
  }
  document.cookie =
    id === THEME_FONT_ID
      ? `${FONT_STORAGE_KEY}=; path=/; max-age=0`
      : `${FONT_STORAGE_KEY}=${encodeURIComponent(id)}; path=/; max-age=31536000`
  window.dispatchEvent(new CustomEvent(FONT_CHANGE_EVENT, { detail: id }))
}

/** Re-apply the stored font. Call once on startup; returns the id applied. */
export function restoreFont(options: FontOption[] = fontOptions): string {
  const id = getStoredFont()
  applyFont(id, options)
  return id
}

/**
 * The faces the active color theme defines, read from computed styles — useful
 * for showing "Theme default (Inter)" in a menu.
 */
export function getThemeFonts(): { sans: string; serif: string; mono: string } {
  if (!isBrowser()) return { sans: "", serif: "", mono: "" }
  const style = getComputedStyle(document.documentElement)
  return {
    sans: style.getPropertyValue("--font-sans").trim(),
    serif: style.getPropertyValue("--font-serif").trim(),
    mono: style.getPropertyValue("--font-mono").trim(),
  }
}

/** First family of a `font-family` stack, unquoted: `"Inter", sans-serif` → `Inter`. */
export function primaryFamily(stack: string): string {
  return (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "")
}
