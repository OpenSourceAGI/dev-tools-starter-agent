import { themeNames } from 'shadcn-theme-menu'

/**
 * Which `theme-*` classes actually carry a rule in the loaded stylesheets.
 *
 * `themeNames` is the list the package's menus render; it is not a promise that
 * every entry has colors behind it. Reading the CSSOM instead of hard-coding a
 * second list here keeps this demo honest as themes are added or removed —
 * nothing to update on this side.
 */
export function readStyledThemes(): Set<string> {
  const styled = new Set<string>()

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      // Cross-origin stylesheet (e.g. the Google Fonts import) — not ours.
      continue
    }
    collect(rules, styled)
  }

  return styled
}

function collect(rules: CSSRuleList, into: Set<string>) {
  for (const rule of Array.from(rules)) {
    const nested = (rule as CSSGroupingRule).cssRules
    if (nested) collect(nested, into)

    const selector = (rule as CSSStyleRule).selectorText
    if (!selector) continue

    for (const match of selector.matchAll(/\.theme-([a-z0-9-]+)/g)) {
      into.add(match[1])
    }
  }
}

/** Split the registered themes into the ones with a stylesheet and the ones without. */
export function partitionThemes(styled: Set<string>) {
  // Before the probe has run we have nothing to go on, so assume everything works
  // rather than flashing a wall of "unstyled" badges.
  if (styled.size === 0) return { styled: themeNames, unstyled: [] as string[] }

  return {
    styled: themeNames.filter((name) => styled.has(name)),
    unstyled: themeNames.filter((name) => !styled.has(name)),
  }
}

/** Apply a color theme the way the package's own menus do. */
export function applyColorTheme(name: string) {
  localStorage.setItem('color-theme', name)
  themeNames.forEach((t) => document.documentElement.classList.remove(`theme-${t}`))
  document.documentElement.classList.add(`theme-${name}`)
}

/** The color theme persisted by a previous visit, if it is still a known theme. */
export function readStoredTheme(fallback: string) {
  const saved = localStorage.getItem('color-theme')
  return saved && themeNames.includes(saved) ? saved : fallback
}
