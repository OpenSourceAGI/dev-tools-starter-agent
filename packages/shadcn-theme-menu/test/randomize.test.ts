import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { COLOR_THEME_STORAGE_KEY, themeInitScript } from '../src/color-theme'
import {
  applyRandomizeSchedule,
  getRandomizeSettings,
  isRandomizeDue,
  pickRandomTheme,
  RANDOMIZE_SESSION_KEY,
  RANDOMIZE_STORAGE_KEY,
  RANDOMIZED_ATTR,
  randomizeColorTheme,
  setRandomizeMode,
  startRandomizeSchedule,
} from '../src/randomize'
import { themeNames } from '../src/themes'

const HOUR = 60 * 60 * 1000
const themeClass = () =>
  [...document.documentElement.classList].find((c) => c.startsWith('theme-'))?.slice(6)

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  document.documentElement.className = ''
  document.documentElement.removeAttribute(RANDOMIZED_ATTR)
})

afterEach(() => vi.useRealTimers())

describe('pickRandomTheme', () => {
  it('never returns the current theme', () => {
    for (let i = 0; i < 50; i++) expect(pickRandomTheme('nord')).not.toBe('nord')
  })

  it('draws from the pool, ignoring unknown names', () => {
    expect(pickRandomTheme('nord', ['nord', 'dracula', 'bogus'], () => 0.99)).toBe('dracula')
  })

  it('falls back to the current theme when nothing else is eligible', () => {
    expect(pickRandomTheme('nord', ['nord'])).toBe('nord')
  })
})

describe('settings', () => {
  it('defaults to off and survives corrupt storage', () => {
    expect(getRandomizeSettings().mode).toBe('off')
    localStorage.setItem(RANDOMIZE_STORAGE_KEY, '{not json')
    expect(getRandomizeSettings().mode).toBe('off')
  })

  it('persists the mode', () => {
    setRandomizeMode('hourly')
    expect(JSON.parse(localStorage.getItem(RANDOMIZE_STORAGE_KEY)!).mode).toBe('hourly')
  })
})

describe('isRandomizeDue', () => {
  const now = 10 * 24 * HOUR
  it.each([
    ['off', { onLoad: true, newSession: true }, false],
    ['visit', { onLoad: true }, true],
    ['visit', { onLoad: false }, false],
    ['session', { onLoad: true, newSession: false }, false],
    ['session', { onLoad: true, newSession: true }, true],
  ] as const)('%s with %o → %s', (mode, ctx, due) => {
    expect(isRandomizeDue({ mode, lastAt: now }, { now, ...ctx })).toBe(due)
  })

  it.each([
    ['hourly', HOUR],
    ['daily', 24 * HOUR],
    ['weekly', 7 * 24 * HOUR],
  ] as const)('%s waits its interval', (mode, interval) => {
    expect(isRandomizeDue({ mode, lastAt: now - interval + 1 }, { now })).toBe(false)
    expect(isRandomizeDue({ mode, lastAt: now - interval }, { now })).toBe(true)
  })
})

describe('randomizeColorTheme', () => {
  it('applies, persists and stamps lastAt', () => {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, 'nord')
    const theme = randomizeColorTheme()
    expect(theme).not.toBe('nord')
    expect(themeNames).toContain(theme)
    expect(themeClass()).toBe(theme)
    expect(localStorage.getItem(COLOR_THEME_STORAGE_KEY)).toBe(theme)
    expect(getRandomizeSettings().lastAt).toBeGreaterThan(0)
  })
})

describe('applyRandomizeSchedule', () => {
  it('randomizes on load for "visit", but only once per page load', () => {
    setRandomizeMode('visit')
    expect(applyRandomizeSchedule()).not.toBeNull()
    expect(applyRandomizeSchedule()).toBeNull()
  })

  it('"session" fires only for a new session', () => {
    setRandomizeMode('session')
    sessionStorage.setItem(RANDOMIZE_SESSION_KEY, '1')
    expect(applyRandomizeSchedule()).toBeNull()
  })

  it('skips when the init script already ran the check', () => {
    setRandomizeMode('visit')
    document.documentElement.setAttribute(RANDOMIZED_ATTR, 'init')
    expect(applyRandomizeSchedule()).toBeNull()
  })
})

describe('startRandomizeSchedule', () => {
  it('re-checks hourly while the page is open, with one shared timer', () => {
    vi.useFakeTimers()
    vi.setSystemTime(100 * HOUR)
    document.documentElement.setAttribute(RANDOMIZED_ATTR, 'checked')
    localStorage.setItem(RANDOMIZE_STORAGE_KEY, JSON.stringify({ mode: 'hourly', lastAt: 100 * HOUR }))
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, 'nord')

    const stopA = startRandomizeSchedule()
    const stopB = startRandomizeSchedule()
    vi.advanceTimersByTime(59 * 60 * 1000)
    expect(localStorage.getItem(COLOR_THEME_STORAGE_KEY)).toBe('nord')

    vi.advanceTimersByTime(60 * 1000)
    const after = localStorage.getItem(COLOR_THEME_STORAGE_KEY)
    expect(after).not.toBe('nord')
    expect(getRandomizeSettings().lastAt).toBe(101 * HOUR)

    stopA()
    stopB()
    vi.advanceTimersByTime(5 * HOUR)
    expect(localStorage.getItem(COLOR_THEME_STORAGE_KEY)).toBe(after)
  })
})

describe('themeInitScript with a schedule', () => {
  const run = () => new Function(themeInitScript('minimal'))()

  it('picks a new theme before paint when the schedule is due', () => {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, 'nord')
    localStorage.setItem(RANDOMIZE_STORAGE_KEY, JSON.stringify({ mode: 'visit', lastAt: 0 }))
    run()
    const theme = themeClass()
    expect(theme).not.toBe('nord')
    expect(localStorage.getItem(COLOR_THEME_STORAGE_KEY)).toBe(theme)
    expect(document.documentElement.getAttribute(RANDOMIZED_ATTR)).toBe('init')
    // …so the React-side check does not roll a second time.
    expect(applyRandomizeSchedule()).toBeNull()
  })

  it('keeps the stored theme when the schedule is not due', () => {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, 'nord')
    localStorage.setItem(RANDOMIZE_STORAGE_KEY, JSON.stringify({ mode: 'daily', lastAt: Date.now() }))
    run()
    expect(themeClass()).toBe('nord')
  })
})
