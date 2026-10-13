"use client"

/**
 * @fileoverview The persistent left column beside the page, drag-resizable
 * with `react-resizable-panels` — generalised from debate-ai.com's
 * `ResizableSidebarLayout`.
 *
 * - **Width is in pixels, and persisted** under `<storageKey>-width`. The
 *   panel keeps its pixel width when the window resizes, and the stored width
 *   is restored in a layout effect (not via `defaultSize`) so the server
 *   render and the first client render agree. Double-clicking the handle
 *   resets it to `defaultWidth`.
 * - **The page, not the panel, scrolls.** The column is a sticky,
 *   viewport-high `<aside>` inside whatever scrolls the page.
 * - **It collapses** per the provider's `collapseMode`: to nothing with an
 *   edge tab to bring it back (`offcanvas`), or to an icon rail (`icon`).
 *   The hide button at the foot, Ctrl/Cmd+B, or dragging the handle past the
 *   threshold all make the same choice; dragging back out undoes it.
 * - **Below `md` there is no column.** It is hidden with CSS rather than
 *   unmounted, so crossing the breakpoint never remounts the page; the
 *   drawer (`MobileSidebarDrawer`) takes over.
 *
 * @module components/layout/sidebar-layout
 */

import type React from "react"
import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Group, Panel, Separator, usePanelRef, type PanelSize } from "react-resizable-panels"

import { cn } from "../../lib/utils"
import { readStoredNumber, writeStoredNumber } from "../../state/persistent-flag"
import { useSidebar } from "./sidebar-context"

// Layout effects warn during SSR; plain effects are the server stand-in.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

export const SIDEBAR_DEFAULT_WIDTH = 300
export const SIDEBAR_MIN_WIDTH = 220
export const SIDEBAR_MAX_WIDTH = 640
export const SIDEBAR_RAIL_WIDTH = 56

export interface SidebarLayoutProps {
  /** The column's scrolling contents. */
  sidebar: React.ReactNode
  /** Pinned above the scrolling area (e.g. a brand row). */
  header?: React.ReactNode
  /** Pinned under the scrolling area, beside the hide button (e.g. the account menu). */
  footer?: React.ReactNode
  /** The page beside the column. */
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  /** Width of the icon rail, in px. */
  railWidth?: number
  /** Allow dragging the column's edge. Default `true`. */
  resizable?: boolean
  className?: string
  sidebarClassName?: string
  contentClassName?: string
}

export function SidebarLayout({
  sidebar,
  header,
  footer,
  children,
  defaultWidth = SIDEBAR_DEFAULT_WIDTH,
  minWidth = SIDEBAR_MIN_WIDTH,
  maxWidth = SIDEBAR_MAX_WIDTH,
  railWidth = SIDEBAR_RAIL_WIDTH,
  resizable = true,
  className,
  sidebarClassName,
  contentClassName,
}: SidebarLayoutProps) {
  const { collapsed, setCollapsed, collapseMode, variant, rail, storageKey } = useSidebar()
  const widthKey = `${storageKey}-width`
  const collapsedSize = collapseMode === "icon" ? railWidth : 0
  const panelRef = usePanelRef()
  // Nothing is saved until the stored width is applied: the panel reports
  // its default size on mount, which would otherwise overwrite it.
  const restored = useRef(false)

  useIsomorphicLayoutEffect(() => {
    const stored = readStoredNumber(widthKey)
    if (stored !== null && !collapsed) {
      try {
        panelRef.current?.resize(Math.min(maxWidth, Math.max(minWidth, stored)))
      } catch {
        // Not registered with its group yet; the default width stands.
      }
    }
    restored.current = true
    // Only on mount / when the key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef, widthKey])

  // The shared choice drives the panel; collapse()/expand() are idempotent.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    try {
      if (collapsed) panel.collapse()
      else panel.expand()
    } catch {
      // Not registered yet; the next change applies it.
    }
  }, [collapsed, panelRef])

  const handleResize = useCallback(
    (size: PanelSize, _id: unknown, prev: PanelSize | undefined) => {
      if (!restored.current || !prev) return
      const isCollapsed = (px: number) => px <= collapsedSize + 0.5
      // A drag past the threshold, or back out, is the same choice as the
      // button. Transitions only, so mount-time reports never overwrite it.
      if (isCollapsed(size.inPixels)) {
        if (!isCollapsed(prev.inPixels)) setCollapsed(true)
        return
      }
      if (isCollapsed(prev.inPixels)) setCollapsed(false)
      writeStoredNumber(widthKey, size.inPixels)
    },
    [collapsedSize, setCollapsed, widthKey],
  )

  const canCollapse = collapseMode !== "none"
  const floating = variant === "floating"
  const inset = variant === "inset"

  return (
    <Group
      orientation="horizontal"
      // The library defaults (`height: 100%`, `overflow: hidden`) would make
      // the group its own scroll container and break the sticky column.
      style={{ height: "auto", minHeight: "100vh", overflow: "visible" }}
      data-sidebar-variant={variant}
      className={cn(
        "min-h-screen",
        inset && "bg-muted/40",
        "max-md:[&>[data-panel]:first-child]:hidden! max-md:[&>[data-separator]]:hidden!",
        className,
      )}
    >
      <Panel
        id={`${storageKey}-panel`}
        panelRef={panelRef}
        defaultSize={collapsed ? collapsedSize : defaultWidth}
        minSize={minWidth}
        maxSize={maxWidth}
        collapsible={canCollapse}
        collapsedSize={collapsedSize}
        groupResizeBehavior="preserve-pixel-size"
        onResize={handleResize}
        style={{ overflow: "visible", maxHeight: "none" }}
      >
        <aside
          data-sidebar="column"
          data-collapsed={collapsed || undefined}
          data-rail={rail || undefined}
          className={cn(
            "sticky top-0 hidden h-screen w-full min-w-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground md:flex",
            collapseMode === "offcanvas" && "data-[collapsed]:invisible",
            floating && "top-2 m-2 h-[calc(100vh-1rem)] w-[calc(100%-1rem)] rounded-xl border border-border shadow-sm",
            inset && "bg-transparent",
          )}
        >
          {header ? <div className={cn("shrink-0 px-3 pt-3", rail && "px-2")}>{header}</div> : null}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-3",
              rail && "items-center px-2",
              sidebarClassName,
            )}
          >
            {sidebar}
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 border-t border-border/60 px-2 py-1.5",
              rail && "flex-col border-t-0 pb-2",
            )}
          >
            <div className={cn("min-w-0 flex-1", rail && "flex-none")}>{footer}</div>
            {canCollapse && (
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : collapseMode === "icon" ? "Collapse sidebar" : "Hide sidebar"}
                title={`${collapsed ? "Expand" : collapseMode === "icon" ? "Collapse" : "Hide"} sidebar (Ctrl+B)`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </button>
            )}
          </div>
        </aside>
      </Panel>
      <Separator
        aria-label="Resize sidebar"
        disabled={!resizable || rail}
        className={cn(
          "relative w-px shrink-0 bg-border/60 transition-colors outline-none",
          (floating || inset) && "bg-transparent",
          "after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",
          "data-[separator=hover]:bg-primary/50 data-[separator=active]:bg-primary data-[separator=focus]:bg-primary",
        )}
      />
      <Panel id={`${storageKey}-content`} minSize={320} style={{ overflow: "visible", maxHeight: "none" }}>
        <div
          data-sidebar="content"
          className={cn(
            // `relative`: the page's absolutely positioned bits are placed
            // against the content column, not the viewport.
            "relative min-w-0",
            inset && "m-2 min-h-[calc(100vh-1rem)] rounded-xl border border-border bg-background shadow-sm max-md:m-0 max-md:rounded-none max-md:border-0",
            contentClassName,
          )}
        >
          {children}
        </div>
      </Panel>
      {collapsed && collapseMode === "offcanvas" && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Show sidebar"
          title="Show sidebar (Ctrl+B)"
          className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border bg-background py-3 pl-1 pr-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground md:flex"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}
    </Group>
  )
}
