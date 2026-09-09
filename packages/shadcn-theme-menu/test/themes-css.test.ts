import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vitest runs with the package root as cwd; the jsdom environment leaves
// `import.meta.url` as an http: URL, so it is no help for finding files.
const css = readFileSync(resolve(process.cwd(), 'src/themes-shadcn.css'), 'utf8')

/**
 * An unquoted font family is a sequence of CSS identifiers, and an identifier
 * may not start with a digit — so `Source Serif 4` is not a valid family name.
 * Browsers drop the whole declaration when it appears, silently falling back to
 * the inherited face, which looks exactly like "the theme has no serif".
 */
function isValidFamily(family: string) {
  const trimmed = family.trim()
  if (/^".*"$/.test(trimmed) || /^'.*'$/.test(trimmed)) return true
  return trimmed.split(/\s+/).every((ident) => /^-?[A-Za-z_-][\w-]*$/.test(ident))
}

describe('themes-shadcn.css', () => {
  const declarations = [...css.matchAll(/--font-(sans|serif|mono):\s*([^;]+);/g)]

  it('declares fonts for the themes', () => {
    expect(declarations.length).toBeGreaterThan(0)
  })

  it('quotes every family a browser would otherwise reject', () => {
    const invalid = declarations
      .flatMap(([, role, value]) =>
        value
          .split(',')
          .filter((family) => !isValidFamily(family))
          .map((family) => `--font-${role}: …${family.trim()}…`),
      )

    expect([...new Set(invalid)]).toEqual([])
  })
})
