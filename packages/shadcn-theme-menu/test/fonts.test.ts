import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  applyFont,
  FONT_CHANGE_EVENT,
  FONT_INIT_STYLE_ID,
  FONT_STORAGE_KEY,
  fontOptions,
  getFontOption,
  getStoredFont,
  googleFontsUrl,
  loadGoogleFont,
  primaryFamily,
  restoreFont,
  setFont,
  THEME_FONT_ID,
} from '../src/fonts'

const fontLinks = () => document.head.querySelectorAll('link[id^="stm-font-"]')

beforeEach(() => {
  localStorage.clear()
  document.head.innerHTML = ''
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-font')
  document.body.removeAttribute('style')
})

afterEach(() => localStorage.clear())

describe('fontOptions', () => {
  it('has unique ids and starts with the theme default', () => {
    const ids = fontOptions.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe(THEME_FONT_ID)
  })

  it('quotes every Google family in its stack', () => {
    for (const option of fontOptions.filter((o) => o.google)) {
      expect(option.stack.startsWith(`"${option.google}"`)).toBe(true)
    }
  })
})

describe('googleFontsUrl', () => {
  it('builds a CSS2 URL with sorted weights and display=swap', () => {
    expect(googleFontsUrl(['Source Serif 4', 'Inter'], [700, 400])).toBe(
      'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;700&family=Inter:wght@400;700&display=swap',
    )
  })
})

describe('loadGoogleFont', () => {
  it('injects one stylesheet link per family, however often it is called', () => {
    void loadGoogleFont('Inter')
    void loadGoogleFont('Inter')
    expect(fontLinks()).toHaveLength(1)
    expect((fontLinks()[0] as HTMLLinkElement).href).toContain('family=Inter')
  })

  it('resolves once the stylesheet loads', async () => {
    const done = loadGoogleFont('Lora')
    fontLinks()[0].dispatchEvent(new Event('load'))
    await expect(done).resolves.toBeUndefined()
  })
})

describe('applyFont / setFont', () => {
  it('sets the stack inline on both <html> and <body>', () => {
    applyFont('jetbrains-mono')
    const stack = getFontOption('jetbrains-mono')!.stack
    // jsdom normalises whitespace/quotes, so compare the primary family.
    expect(primaryFamily(document.documentElement.style.fontFamily)).toBe('JetBrains Mono')
    expect(primaryFamily(document.body.style.fontFamily)).toBe(primaryFamily(stack))
    expect(document.documentElement.dataset.font).toBe('jetbrains-mono')
  })

  it('"theme" clears the override and the pre-paint style', () => {
    const style = document.createElement('style')
    style.id = FONT_INIT_STYLE_ID
    document.head.appendChild(style)

    applyFont('inter')
    applyFont(THEME_FONT_ID)
    expect(document.documentElement.style.fontFamily).toBe('')
    expect(document.body.style.fontFamily).toBe('')
    expect(document.documentElement.dataset.font).toBeUndefined()
    expect(document.getElementById(FONT_INIT_STYLE_ID)).toBeNull()
  })

  it('does not load anything for a system stack', () => {
    applyFont('system-mono')
    expect(fontLinks()).toHaveLength(0)
  })

  it('persists, announces, and restores the choice', () => {
    const seen: string[] = []
    const listener = (e: Event) => seen.push((e as CustomEvent<string>).detail)
    window.addEventListener(FONT_CHANGE_EVENT, listener)

    setFont('lora')
    expect(localStorage.getItem(FONT_STORAGE_KEY)).toBe('lora')
    expect(document.cookie).toContain(`${FONT_STORAGE_KEY}=lora`)
    expect(seen).toEqual(['lora'])

    document.documentElement.removeAttribute('style')
    expect(restoreFont()).toBe('lora')
    expect(primaryFamily(document.documentElement.style.fontFamily)).toBe('Lora')

    setFont(THEME_FONT_ID)
    expect(localStorage.getItem(FONT_STORAGE_KEY)).toBeNull()
    expect(getStoredFont()).toBe(THEME_FONT_ID)

    window.removeEventListener(FONT_CHANGE_EVENT, listener)
  })
})
