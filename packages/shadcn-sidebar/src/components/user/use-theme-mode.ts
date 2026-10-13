"use client"

/**
 * @fileoverview A small, framework-free theme store for hosts without one
 * (`next-themes` and the like can drive `NavUser` directly instead).
 *
 * The mode — light, dark or system — toggles the `dark` class on `<html>`,
 * and the colour theme is written to `data-color-theme` there, so a
 * stylesheet can key its tokens off either. Both are remembered in
 * localStorage under `storageKey`.
 *
 * @module components/user/use-theme-mode
 */

import { useCallback, useEffect, useState } from "react"

import type { ThemeMode } from "../../lib/types"

export interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  /** The mode after resolving `system` against the OS preference. */
  resolved: "light" | "dark"
  colorTheme?: string
  setColorTheme: (name: string) => void
  /** Applies a colour theme without saving it, for hover previews. */
  previewColorTheme: (name: string | null) => void
  /** False until the stored values have been read, so SSR markup stays stable. */
  mounted: boolean
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not remembered.
  }
}

function prefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false
}

export function useThemeMode({
  storageKey = "app-theme",
  defaultMode = "system",
  defaultColorTheme,
}: {
  storageKey?: string
  defaultMode?: ThemeMode
  defaultColorTheme?: string
} = {}): ThemeState {
  const [mounted, setMounted] = useState(false)
  const [mode, setModeState] = useState<ThemeMode>(defaultMode)
  const [colorTheme, setColorThemeState] = useState<string | undefined>(defaultColorTheme)
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    const storedMode = readStored(`${storageKey}-mode`)
    if (storedMode === "light" || storedMode === "dark" || storedMode === "system") setModeState(storedMode)
    const storedColor = readStored(`${storageKey}-color`)
    if (storedColor) setColorThemeState(storedColor)
    setSystemDark(prefersDark())
    setMounted(true)

    if (typeof window.matchMedia !== "function") return
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => setSystemDark(query.matches)
    query.addEventListener?.("change", sync)
    return () => query.removeEventListener?.("change", sync)
  }, [storageKey])

  const resolved: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [mounted, resolved])

  const applyColor = useCallback((name: string | undefined | null) => {
    if (typeof document === "undefined") return
    if (name) document.documentElement.dataset.colorTheme = name
    else delete document.documentElement.dataset.colorTheme
  }, [])

  useEffect(() => {
    if (mounted) applyColor(colorTheme)
  }, [mounted, colorTheme, applyColor])

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next)
      writeStored(`${storageKey}-mode`, next)
    },
    [storageKey],
  )

  const setColorTheme = useCallback(
    (name: string) => {
      setColorThemeState(name)
      writeStored(`${storageKey}-color`, name)
    },
    [storageKey],
  )

  const previewColorTheme = useCallback(
    (name: string | null) => applyColor(name ?? colorTheme),
    [applyColor, colorTheme],
  )

  return { mode, setMode, resolved, colorTheme, setColorTheme, previewColorTheme, mounted }
}
