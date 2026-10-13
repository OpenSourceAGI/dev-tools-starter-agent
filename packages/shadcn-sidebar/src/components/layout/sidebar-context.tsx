"use client"

/**
 * @fileoverview The state every part of the sidebar reads: whether the column
 * is hidden, which collapse mode it uses, whether the mobile drawer is open,
 * which dock button and tree row are active, and how links are rendered.
 *
 * `SidebarProvider` owns it. The hidden/shown choice is a {@link persistentFlag}
 * keyed by `storageKey`, so it survives reloads and is shared by every page
 * (and tab) that mounts a provider with the same key; pass `collapsed` +
 * `onCollapsedChange` instead to control it yourself.
 *
 * Ctrl/Cmd+B toggles the column (or the drawer, on a phone) everywhere except
 * text fields and editors, where it already means bold.
 *
 * @module components/layout/sidebar-context
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { useIsMobile } from "../../hooks/use-media-query"
import { isEditableTarget } from "../../lib/utils"
import type { RenderLink } from "../../lib/types"
import { persistentFlag, usePersistentFlag } from "../../state/persistent-flag"

/**
 * What "collapsed" means for the column.
 *
 * - `offcanvas` — the column slides away to nothing; a tab on the left edge
 *   brings it back, and the dock floats over the page while it is gone.
 *   This is debate-ai.com's behaviour.
 * - `icon` — the column shrinks to a rail of icons: dock buttons, section
 *   icons and the account avatar stay reachable without the labels.
 * - `none` — the column cannot be hidden (no hide button, no shortcut).
 */
export type SidebarCollapseMode = "offcanvas" | "icon" | "none"

/**
 * How the column is framed.
 *
 * - `sidebar` — flush against the page with a border (the default).
 * - `floating` — an inset rounded card with a shadow.
 * - `inset` — the page sits in a rounded card beside a borderless column.
 */
export type SidebarVariant = "sidebar" | "floating" | "inset"

export interface SidebarContextValue {
  /** The column is hidden (offcanvas) or reduced to a rail (icon). */
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  /** The rail is showing: icon mode and collapsed, on a wide screen. */
  rail: boolean
  collapseMode: SidebarCollapseMode
  variant: SidebarVariant
  isMobile: boolean
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  /** Collapses on desktop, opens/closes the drawer on mobile. */
  toggle: () => void
  activeDockId?: string
  activeItemId?: string
  renderLink: RenderLink
  /** Prefix for localStorage keys (`<key>-collapsed`, `<key>-width`). */
  storageKey: string
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

/** A plain anchor — the default `renderLink`. */
export const defaultRenderLink: RenderLink = ({ children, ...props }) => <a {...props}>{children}</a>

export interface SidebarProviderProps {
  children: ReactNode
  /** Prefix for the stored collapse choice and width. Default `"app-sidebar"`. */
  storageKey?: string
  collapseMode?: SidebarCollapseMode
  variant?: SidebarVariant
  /** Controlled collapse state. Leave unset to persist it under `storageKey`. */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Initial collapse state for the uncontrolled store when nothing is stored yet. */
  defaultCollapsed?: boolean
  /** Highlights a dock button. */
  activeDockId?: string
  /** Highlights a tree row (and opens the section holding it). */
  activeItemId?: string
  renderLink?: RenderLink
  /** Bind Ctrl/Cmd+B. Default `true`. */
  keyboardShortcut?: boolean
}

export function SidebarProvider({
  children,
  storageKey = "app-sidebar",
  collapseMode = "offcanvas",
  variant = "sidebar",
  collapsed: controlledCollapsed,
  onCollapsedChange,
  defaultCollapsed = false,
  activeDockId,
  activeItemId,
  renderLink = defaultRenderLink,
  keyboardShortcut = true,
}: SidebarProviderProps) {
  const flag = useMemo(() => persistentFlag(`${storageKey}-collapsed`), [storageKey])
  const storedCollapsed = usePersistentFlag(flag)
  const [seeded, setSeeded] = useState(false)

  // `defaultCollapsed` applies only when the reader has never chosen.
  useEffect(() => {
    if (seeded) return
    setSeeded(true)
    if (!defaultCollapsed) return
    try {
      if (localStorage.getItem(flag.key) === null) flag.set(true)
    } catch {
      flag.set(true)
    }
  }, [seeded, defaultCollapsed, flag])

  const controlled = controlledCollapsed !== undefined
  const collapsed = collapseMode === "none" ? false : controlled ? controlledCollapsed : storedCollapsed

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (collapseMode === "none") return
      if (!controlled) flag.set(next)
      onCollapsedChange?.(next)
    },
    [collapseMode, controlled, flag, onCollapsedChange],
  )
  const toggleCollapsed = useCallback(() => setCollapsed(!collapsed), [setCollapsed, collapsed])

  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggle = useCallback(() => {
    if (isMobile) setMobileOpen((open) => !open)
    else toggleCollapsed()
  }, [isMobile, toggleCollapsed])

  useEffect(() => {
    if (!keyboardShortcut || typeof window === "undefined") return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "b" || !(event.metaKey || event.ctrlKey)) return
      if (event.altKey || event.shiftKey || isEditableTarget(event.target)) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [keyboardShortcut, toggle])

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      setCollapsed,
      toggleCollapsed,
      rail: collapseMode === "icon" && collapsed && !isMobile,
      collapseMode,
      variant,
      isMobile,
      mobileOpen,
      setMobileOpen,
      toggle,
      activeDockId,
      activeItemId,
      renderLink,
      storageKey,
    }),
    [
      collapsed,
      setCollapsed,
      toggleCollapsed,
      collapseMode,
      variant,
      isMobile,
      mobileOpen,
      toggle,
      activeDockId,
      activeItemId,
      renderLink,
      storageKey,
    ],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

/**
 * The sidebar's state. Outside a provider it returns a static, expanded
 * default so the pieces (dock, tree, account menu) also render standalone.
 */
export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext) ?? STANDALONE
}

const noop = () => {}

const STANDALONE: SidebarContextValue = {
  collapsed: false,
  setCollapsed: noop,
  toggleCollapsed: noop,
  rail: false,
  collapseMode: "none",
  variant: "sidebar",
  isMobile: false,
  mobileOpen: false,
  setMobileOpen: noop,
  toggle: noop,
  renderLink: defaultRenderLink,
  storageKey: "app-sidebar",
}
