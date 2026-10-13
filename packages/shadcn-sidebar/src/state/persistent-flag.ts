/**
 * @fileoverview A boolean kept in localStorage and broadcast to every
 * subscriber in the document — how the sidebar's hidden/shown choice is one
 * choice for the whole app rather than one per page. The dock (which floats
 * while the column is hidden) and the column read the same store, and other
 * tabs follow through the real `storage` event.
 *
 * Generalised from debate-ai.com's `sidebar-collapse.ts`: the key is a
 * parameter, so two sidebars on one site can keep separate choices.
 *
 * @module state/persistent-flag
 */

import { useSyncExternalStore } from "react"

export interface PersistentFlag {
  /** localStorage key ("1" = true, absent = false). */
  readonly key: string
  get(): boolean
  set(value: boolean): void
  toggle(): void
  subscribe(onChange: () => void): () => void
}

const stores = new Map<string, PersistentFlag>()

/**
 * The store for `key`. Calling it twice with the same key returns the same
 * store, so every component that names the key shares one value.
 */
export function persistentFlag(key: string): PersistentFlag {
  const existing = stores.get(key)
  if (existing) return existing

  const changeEvent = `shadcn-sidebar:${key}`
  // Used when localStorage throws (private mode, blocked site data): the
  // choice still applies to this page, it just isn't kept.
  let memory: boolean | null = null

  const read = (): boolean => {
    if (memory !== null) return memory
    try {
      return localStorage.getItem(key) === "1"
    } catch {
      return false
    }
  }

  const store: PersistentFlag = {
    key,
    get: read,
    set(value) {
      if (read() === value) return
      try {
        if (value) localStorage.setItem(key, "1")
        else localStorage.removeItem(key)
        memory = null
      } catch {
        memory = value
      }
      if (typeof window !== "undefined") window.dispatchEvent(new Event(changeEvent))
    },
    toggle() {
      store.set(!read())
    },
    subscribe(onChange) {
      if (typeof window === "undefined") return () => {}
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === key) onChange()
      }
      window.addEventListener(changeEvent, onChange)
      window.addEventListener("storage", onStorage)
      return () => {
        window.removeEventListener(changeEvent, onChange)
        window.removeEventListener("storage", onStorage)
      }
    },
  }
  stores.set(key, store)
  return store
}

/**
 * The flag's current value. The server — and the hydrating render — always
 * see `serverValue`, so markup never disagrees with the client.
 */
export function usePersistentFlag(flag: PersistentFlag, serverValue = false): boolean {
  return useSyncExternalStore(flag.subscribe, flag.get, () => serverValue)
}

/** Reads a stored pixel width, or `null` when none is stored or storage is blocked. */
export function readStoredNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/** Remembers a pixel width; silently does nothing when storage is blocked. */
export function writeStoredNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(Math.round(value)))
  } catch {
    // Not remembered.
  }
}
