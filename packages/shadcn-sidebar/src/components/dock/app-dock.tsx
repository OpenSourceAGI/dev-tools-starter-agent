"use client"

/**
 * @fileoverview The app dock: a row of the site's top-level destinations,
 * drawn from a list of {@link DockNavItem}s in one of four placements.
 *
 * - `sidebar` — hosted at the top of the column. It takes the column's width
 *   and wraps rather than reaching across the border into the page.
 * - `floating` — fixed to the bottom of the viewport, centred, on wide
 *   screens. `AppSidebar` switches to this while an offcanvas column is
 *   hidden, so the destinations never vanish. (Bottom rather than debate-ai's
 *   top-left: a generic host's page header lives in the top-left corner.)
 * - `bottom` — fixed to the bottom of the viewport, for phones, with a
 *   leading button that opens the sidebar drawer.
 * - `rail` — a vertical stack of plain icon buttons, for the icon rail.
 *
 * Every placement but `rail` magnifies toward a fine pointer; touch gets a
 * still row (see `dock.tsx`).
 *
 * @module components/dock/app-dock
 */

import type React from "react"
import { PanelLeft } from "lucide-react"

import { cn, formatCount } from "../../lib/utils"
import type { DockNavItem } from "../../lib/types"
import { opensElsewhere } from "../../lib/utils"
import { useSidebar } from "../layout/sidebar-context"
import { Dock, DockIcon, DockItem, DockLabel } from "./dock"

export type AppDockPlacement = "sidebar" | "floating" | "bottom" | "rail"

export interface AppDockProps {
  items: DockNavItem[]
  placement?: AppDockPlacement
  /** Resting icon size in px. Defaults per placement. */
  iconSize?: number
  /** Peak magnified size in px. */
  magnification?: number
  /**
   * Plain clicks on linked items are handed here (after `preventDefault`) so
   * a client-side router can navigate. Modifier clicks still open new tabs.
   */
  onNavigate?: (item: DockNavItem, event: React.MouseEvent<HTMLElement>) => void
  /** Bottom placement only: label of the leading "open sidebar" button. */
  sidebarButtonLabel?: string
  className?: string
}

function Badge({ value }: { value: number | string }) {
  return (
    <span className="absolute -right-1 -top-1 z-10 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">
      {typeof value === "number" ? formatCount(value) : value}
    </span>
  )
}

export function AppDock({
  items,
  placement = "sidebar",
  iconSize,
  magnification,
  onNavigate,
  sidebarButtonLabel = "Sidebar",
  className,
}: AppDockProps) {
  const { activeDockId, setMobileOpen } = useSidebar()

  const handleClick = (item: DockNavItem) => (event: React.MouseEvent<HTMLElement>) => {
    if (item.href && onNavigate && !opensElsewhere(event)) {
      event.preventDefault()
      onNavigate(item, event)
    }
    item.onClick?.(event)
  }

  const isActive = (item: DockNavItem) => item.active || item.id === activeDockId

  if (placement === "rail") {
    return (
      <nav aria-label="App dock" className={cn("flex flex-col items-center gap-1", className)}>
        {items.map((item) => {
          const Icon = item.icon
          const classes = cn(
            "relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive(item) && "bg-accent text-foreground",
          )
          const content = (
            <>
              <Icon className="size-4" />
              {item.badge !== undefined && <Badge value={item.badge} />}
            </>
          )
          return item.href ? (
            <a
              key={item.id}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive(item) ? "page" : undefined}
              onClick={handleClick(item)}
              className={classes}
            >
              {content}
            </a>
          ) : (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive(item)}
              onClick={handleClick(item)}
              className={classes}
            >
              {content}
            </button>
          )
        })}
      </nav>
    )
  }

  const size = iconSize ?? (placement === "sidebar" ? 30 : placement === "bottom" ? 38 : 40)
  const peak = magnification ?? Math.round(size * 1.5)

  const dock = (
    <Dock
      direction="middle"
      iconSize={size}
      magnification={peak}
      fluid={placement === "sidebar"}
      className={cn(
        "bg-background/80 shadow-sm",
        placement === "sidebar" && "rounded-xl p-1.5",
        placement !== "sidebar" && "mt-0 sm:mt-0",
      )}
    >
      {placement === "bottom" && (
        <DockItem aria-label={sidebarButtonLabel} onClick={() => setMobileOpen(true)}>
          <DockLabel>{sidebarButtonLabel}</DockLabel>
          <DockIcon>
            <PanelLeft className="size-5" />
          </DockIcon>
        </DockItem>
      )}
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item)
        return (
          <DockItem
            key={item.id}
            href={item.href}
            onClick={handleClick(item)}
            aria-label={item.label}
            aria-current={active && item.href ? "page" : undefined}
            data-active={active || undefined}
          >
            <DockLabel>{item.label}</DockLabel>
            <DockIcon
              className={cn(
                "bg-muted/60 text-muted-foreground transition-colors hover:text-foreground",
                active && "bg-primary text-primary-foreground hover:text-primary-foreground",
              )}
            >
              <Icon className="size-[55%]" />
            </DockIcon>
            {item.badge !== undefined && <Badge value={item.badge} />}
          </DockItem>
        )
      })}
    </Dock>
  )

  if (placement === "floating") {
    return (
      <div
        data-sidebar-dock="floating"
        className={cn("pointer-events-none fixed inset-x-0 bottom-3 z-40 hidden justify-center md:flex [&>*]:pointer-events-auto", className)}
      >
        {dock}
      </div>
    )
  }

  if (placement === "bottom") {
    return (
      <div
        data-sidebar-dock="bottom"
        className={cn("fixed inset-x-0 bottom-2 z-50 flex justify-center px-2 md:hidden", className)}
      >
        {dock}
      </div>
    )
  }

  return (
    <div data-sidebar-dock="sidebar" className={cn("sticky top-0 z-20 -mx-1 -mt-1 bg-transparent px-1 pt-1", className)}>
      {dock}
    </div>
  )
}
