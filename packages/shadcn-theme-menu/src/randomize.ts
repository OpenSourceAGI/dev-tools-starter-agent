/**
 * Random color themes, on demand or on a schedule. Framework-agnostic.
 *
 * `randomizeColorTheme()` picks a theme other than the current one and applies
 * it through `setColorTheme`, so it persists and every switcher follows.
 *
 * The *schedule* says when to do that automatically:
 *
 * | mode      | randomizes                                                    |
 * | --------- | ------------------------------------------------------------- |
 * | `off`     | never (the default) — only when the button is pressed         |
 * | `visit`   | on every page load                                            |
 * | `session` | once per browser session (a new tab/window after closing all) |
 * | `hourly`  | when an hour has passed since the last random pick            |
 * | `daily`   | when a day has passed                                         |
 * | `weekly`  | when a week has passed                                        |
 *
 * Settings live in `localStorage[RANDOMIZE_STORAGE_KEY]` as
 * `{ mode, lastAt }`. Time-based modes are checked on load *and* every minute
 * while the page is open, so a tab left open all day still changes hourly.
 *
 * `themeInitScript()` runs the same on-load check before first paint, so a
 * randomized theme never flashes the previous one first.
 */
import { themeNames } from "./themes"
import { COLOR_THEME_STORAGE_KEY, getStoredColorTheme, setColorTheme } from "./color-theme"

export type RandomizeMode = "off" | "visit" | "session" | "hourly" | "daily" | "weekly"

export interface RandomizeSettings {
  mode: RandomizeMode
  /** Epoch ms of the last random pick (manual or scheduled). */
  lastAt: number
  /** Restrict the pool to these themes. Defaults to every theme. */
  pool?: string[]
}

/** `localStorage` key the schedule is stored under. */
export const RANDOMIZE_STORAGE_KEY = "color-theme-randomize"

/** `sessionStorage` marker used to detect a new browser session. */
export const RANDOMIZE_SESSION_KEY = "color-theme-randomize-session"

/** Event dispatched on `window` when the schedule settings change. */
export const RANDOMIZE_CHANGE_EVENT = "shadcn-theme-menu:randomize-change"

/** Set on `<html>` once this page load has already run its on-load check. */
export const RANDOMIZED_ATTR = "data-theme-randomized"

const HOUR = 60 * 60 * 1000

/** How long each time-based mode waits between picks. */
export const RANDOMIZE_INTERVALS: Partial<Record<RandomizeMode, number>> = {
  hourly: HOUR,
  daily: 24 * HOUR,
  weekly: 7 * 24 * HOUR,
}

/** Menu labels, in menu order. */
export const randomizeModes: { mode: RandomizeMode; label: string }[] = [
  { mode: "off", label: "Off" },
  { mode: "visit", label: "Every visit" },
  { mode: "session", label: "Every session" },
  { mode: "hourly", label: "Every hour" },
  { mode: "daily", label: "Every day" },
  { mode: "weekly", label: "Every week" },
]

const DEFAULT_SETTINGS: RandomizeSettings = { mode: "off", lastAt: 0 }
const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined"
const isMode = (m: unknown): m is RandomizeMode => randomizeModes.some((r) => r.mode === m)

/** Read the schedule. Missing or corrupt settings read as `{ mode: "off" }`. */
export function getRandomizeSettings(): RandomizeSettings {
  if (!isBrowser()) return { ...DEFAULT_SETTINGS }
  try {
    const raw = JSON.parse(localStorage.getItem(RANDOMIZE_STORAGE_KEY) || "null")
    if (!raw || !isMode(raw.mode)) return { ...DEFAULT_SETTINGS }
    return {
      mode: raw.mode,
      lastAt: Number(raw.lastAt) || 0,
      ...(Array.isArray(raw.pool) ? { pool: raw.pool.filter((t: unknown) => typeof t === "string") } : {}),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Merge into the stored schedule and announce the change. */
export function setRandomizeSettings(patch: Partial<RandomizeSettings>): RandomizeSettings {
  const next = { ...getRandomizeSettings(), ...patch }
  if (!isBrowser()) return next
  try {
    localStorage.setItem(RANDOMIZE_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked: the schedule just won't survive a reload.
  }
  window.dispatchEvent(new CustomEvent(RANDOMIZE_CHANGE_EVENT, { detail: next }))
  return next
}

/** Shorthand for `setRandomizeSettings({ mode })`. */
export function setRandomizeMode(mode: RandomizeMode): RandomizeSettings {
  return setRandomizeSettings({ mode })
}

/**
 * Pick a theme at random, never the current one. `random` is injectable for
 * tests; it must return a number in [0, 1).
 */
export function pickRandomTheme(
  current?: string,
  pool: string[] = themeNames,
  random: () => number = Math.random,
): string {
  const candidates = pool.filter((t) => t !== current && themeNames.includes(t))
  if (candidates.length === 0) return current ?? themeNames[0]
  return candidates[Math.floor(random() * candidates.length)]
}

/**
 * Apply a random theme now — what the dice button does. Persists the theme,
 * records `lastAt` (so an hourly schedule restarts its clock), and returns the
 * theme chosen.
 */
export function randomizeColorTheme(pool?: string[]): string {
  const settings = getRandomizeSettings()
  const next = pickRandomTheme(getStoredColorTheme(), pool ?? settings.pool)
  setColorTheme(next)
  setRandomizeSettings({ lastAt: Date.now() })
  return next
}

/**
 * Whether a schedule is due. Pure, so it can be unit-tested and mirrored in
 * the inline init script.
 */
export function isRandomizeDue(
  settings: RandomizeSettings,
  { now = Date.now(), newSession = false, onLoad = false }: { now?: number; newSession?: boolean; onLoad?: boolean } = {},
): boolean {
  switch (settings.mode) {
    case "visit":
      return onLoad
    case "session":
      return onLoad && newSession
    case "hourly":
    case "daily":
    case "weekly":
      return now - settings.lastAt >= RANDOMIZE_INTERVALS[settings.mode]!
    default:
      return false
  }
}

/** True the first time it is called in a browser session; marks the session. */
function consumeNewSession(): boolean {
  try {
    if (sessionStorage.getItem(RANDOMIZE_SESSION_KEY)) return false
    sessionStorage.setItem(RANDOMIZE_SESSION_KEY, "1")
    return true
  } catch {
    return false
  }
}

/**
 * The on-load check: randomize if the schedule says so. Safe to call from
 * several components — it runs once per page load, and is skipped entirely if
 * `themeInitScript()` already did it before paint. Returns the new theme, or
 * `null` when nothing changed.
 */
export function applyRandomizeSchedule(): string | null {
  if (!isBrowser()) return null
  const root = document.documentElement
  if (root.hasAttribute(RANDOMIZED_ATTR)) return null
  root.setAttribute(RANDOMIZED_ATTR, "checked")

  const settings = getRandomizeSettings()
  const due = isRandomizeDue(settings, { newSession: consumeNewSession(), onLoad: true })
  return due ? randomizeColorTheme() : null
}

let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined

/**
 * Start the schedule: run the on-load check, then re-check time-based modes
 * every `checkEveryMs` (default one minute) while the page is open. Reference
 * counted, so every switcher can call it and only one timer runs. Returns a
 * stop function.
 */
export function startRandomizeSchedule(checkEveryMs = 60_000): () => void {
  if (!isBrowser()) return () => {}
  applyRandomizeSchedule()
  subscribers++
  if (!timer) {
    timer = setInterval(() => {
      if (isRandomizeDue(getRandomizeSettings())) randomizeColorTheme()
    }, checkEveryMs)
  }
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    subscribers--
    if (subscribers <= 0 && timer) {
      clearInterval(timer)
      timer = undefined
      subscribers = 0
    }
  }
}

/**
 * The init-script fragment that mirrors `applyRandomizeSchedule` before first
 * paint. It expects `d` (documentElement), `n` (theme names) and `t` (the
 * stored theme) in scope, and may reassign `t`.
 */
export function randomizeInitFragment(): string {
  const json = JSON.stringify
  return (
    `var r=JSON.parse(localStorage.getItem(${json(RANDOMIZE_STORAGE_KEY)})||"null");` +
    `if(r&&r.mode&&r.mode!=="off"){var ns=!sessionStorage.getItem(${json(RANDOMIZE_SESSION_KEY)});` +
    `sessionStorage.setItem(${json(RANDOMIZE_SESSION_KEY)},"1");var iv=${json(RANDOMIZE_INTERVALS)}[r.mode],now=Date.now();` +
    `if(r.mode==="visit"||(r.mode==="session"&&ns)||(iv&&now-(r.lastAt||0)>=iv)){` +
    `var p=(r.pool&&r.pool.length?r.pool:n).filter(function(x){return x!==t&&n.indexOf(x)>=0});` +
    `if(p.length){t=p[Math.floor(Math.random()*p.length)];localStorage.setItem(${json(COLOR_THEME_STORAGE_KEY)},t);` +
    `r.lastAt=now;localStorage.setItem(${json(RANDOMIZE_STORAGE_KEY)},JSON.stringify(r))}}}` +
    `d.setAttribute(${json(RANDOMIZED_ATTR)},"init");`
  )
}
