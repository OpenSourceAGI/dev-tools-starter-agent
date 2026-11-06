import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyColorTheme,
  COLOR_THEME_CHANGE_EVENT,
  COLOR_THEME_STORAGE_KEY,
  getStoredColorTheme,
  setColorTheme,
  themeInitScript,
} from '../src/color-theme'
import { FONT_INIT_STYLE_ID, FONT_STORAGE_KEY } from '../src/fonts'

const themeClasses = () =>
  [...document.documentElement.classList].filter((c) => c.startsWith('theme-'))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-font')
  document.head.innerHTML = ''
})

describe('color theme helpers', () => {
  it('keeps exactly one theme-* class on <html>, leaving light/dark alone', () => {
    document.documentElement.classList.add('dark')
    applyColorTheme('nord')
    applyColorTheme('dracula')
    expect(themeClasses()).toEqual(['theme-dracula'])
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setColorTheme persists and announces', () => {
    let seen = ''
    const listener = (e: Event) => (seen = (e as CustomEvent<string>).detail)
    window.addEventListener(COLOR_THEME_CHANGE_EVENT, listener)

    setColorTheme('cyberpunk')
    expect(localStorage.getItem(COLOR_THEME_STORAGE_KEY)).toBe('cyberpunk')
    expect(getStoredColorTheme()).toBe('cyberpunk')
    expect(seen).toBe('cyberpunk')

    window.removeEventListener(COLOR_THEME_CHANGE_EVENT, listener)
  })

  it('ignores an unknown stored theme', () => {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, 'not-a-theme')
    expect(getStoredColorTheme('minimal')).toBe('minimal')
  })
})

describe('themeInitScript', () => {
  const run = () => new Function(themeInitScript('minimal'))()

  it('applies the default theme when nothing is stored', () => {
    run()
    expect(themeClasses()).toEqual(['theme-minimal'])
    expect(document.getElementById(FONT_INIT_STYLE_ID)).toBeNull()
  })

  it('applies the stored theme and font before paint', () => {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, 'nord')
    localStorage.setItem(FONT_STORAGE_KEY, 'lora')
    run()
    expect(themeClasses()).toEqual(['theme-nord'])
    expect(document.documentElement.dataset.font).toBe('lora')
    expect(document.getElementById(FONT_INIT_STYLE_ID)?.textContent).toContain('"Lora"')
    expect(document.head.querySelector('link[href*="family=Lora"]')).not.toBeNull()
  })
})
