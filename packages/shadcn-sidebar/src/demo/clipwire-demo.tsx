"use client"

/**
 * @fileoverview "ClipWire", the demo app: the full `AppSidebar` around a
 * small page that lists videos, news articles and clips for whichever row is
 * selected, with mock Clip / Save / Share actions.
 *
 * Routing is in-memory: every link is `#/<row id>`, and the demo's
 * `renderLink` turns a plain click into a state change — the same seam a
 * host uses to plug in `next/link` or React Router.
 *
 * @module demo/clipwire-demo
 */

import { useCallback, useMemo, useState, type MouseEvent } from "react"
import { Bookmark, Check, Clapperboard, Menu, Newspaper, PanelLeft, Scissors, Search, Share2 } from "lucide-react"

import { AppSidebar } from "../components/app-sidebar"
import { useSidebar, type SidebarCollapseMode, type SidebarVariant } from "../components/layout/sidebar-context"
import type { AccordionMode } from "../components/nav/section-expansion"
import { useThemeMode } from "../components/user/use-theme-mode"
import { cn, opensElsewhere } from "../lib/utils"
import type { DockNavItem, RenderLink } from "../lib/types"
import {
  DEMO_BRAND,
  DEMO_COLOR_THEMES,
  DEMO_DOCK_ITEMS,
  DEMO_DOCK_TARGETS,
  DEMO_FOOTER_LINKS,
  DEMO_SECTIONS,
  DEMO_USER,
  DEMO_USER_MENU,
  dockIdForRow,
  findDemoRow,
  mediaForRow,
  type MediaItem,
} from "./mock-data"

export interface ClipWireDemoProps {
  collapseMode?: SidebarCollapseMode
  variant?: SidebarVariant
  accordion?: AccordionMode
  /** Start signed out (the footer becomes a Sign in button). */
  signedOut?: boolean
  /** Show the account row's loading placeholder. */
  loadingSession?: boolean
  /** Row selected on first render. */
  initialRowId?: string
  /** Start with the column collapsed (when nothing is stored yet). */
  defaultCollapsed?: boolean
  /** Separate stored state per story. */
  storageKey?: string
}

const KIND_ICON = { video: Clapperboard, article: Newspaper, clip: Scissors } as const

function rowIdFromHref(href: string): string | null {
  return href.startsWith("#/") ? href.slice(2) : null
}

function MediaCard({
  item,
  saved,
  onToggleSave,
  onAction,
}: {
  item: MediaItem
  saved: boolean
  onToggleSave: () => void
  onAction: (message: string) => void
}) {
  const KindIcon = KIND_ICON[item.kind]
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div
        className="relative flex aspect-video items-end p-3"
        style={{ backgroundImage: `linear-gradient(135deg, ${item.palette[0]}, ${item.palette[1]})` }}
      >
        <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white">
          <KindIcon className="size-3" />
          {item.kind === "article" ? "Article" : item.kind === "clip" ? "Clip" : "Video"}
        </span>
        <span className="ml-auto rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] tabular-nums text-white">{item.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
        <p className="text-xs text-muted-foreground">
          {item.source} · {item.publishedAt}
          {item.sharedBy ? ` · shared by ${item.sharedBy}` : ""}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</p>
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => onAction(`Clipped “${item.title.slice(0, 40)}…” to All Clips`)}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent"
          >
            <Scissors className="size-3.5" /> Clip
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            className={cn("inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent", saved && "text-primary")}
          >
            {saved ? <Check className="size-3.5" /> : <Bookmark className="size-3.5" />} {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => onAction("Share link copied (demo)")}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent"
          >
            <Share2 className="size-3.5" /> Share
          </button>
        </div>
      </div>
    </article>
  )
}

/** The page beside the sidebar. Inside the provider, so it can toggle it. */
function DemoPage({ rowId, onAction }: { rowId: string; onAction: (message: string) => void }) {
  const { toggle, collapsed, collapseMode } = useSidebar()
  const [query, setQuery] = useState("")
  const [saved, setSaved] = useState<ReadonlySet<string>>(() => new Set())
  const row = findDemoRow(rowId)
  const items = mediaForRow(rowId, query)
  const heading = rowId === "home" ? "Home" : rowId === "search" ? "Search" : (row?.title ?? "Not found")

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle sidebar"
          title="Toggle sidebar (Ctrl+B)"
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
        >
          <span className="md:hidden"><Menu className="size-4" /></span>
          <span className="hidden md:inline"><PanelLeft className="size-4" /></span>
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{row?.sectionTitle ?? "ClipWire"}</p>
          <h1 className="truncate text-sm font-semibold">{heading}</h1>
        </div>
        <label className="ml-auto flex h-8 w-full max-w-40 sm:max-w-64 items-center gap-2 rounded-md border border-input px-2 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter videos & articles"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
      </header>
      <main className="flex-1 p-4">
        <p className="mb-4 text-xs text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} · sidebar {collapsed ? (collapseMode === "icon" ? "in icon rail" : "hidden") : "expanded"} · Ctrl/Cmd+B toggles it
        </p>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nothing here yet — clip an article or save a video to fill this list.
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                saved={saved.has(item.id)}
                onAction={onAction}
                onToggleSave={() => {
                  const wasSaved = saved.has(item.id)
                  setSaved((current) => {
                    const next = new Set(current)
                    if (wasSaved) next.delete(item.id)
                    else next.add(item.id)
                    return next
                  })
                  onAction(wasSaved ? "Removed from Reading List" : "Saved to Reading List")
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export function ClipWireDemo({
  collapseMode = "offcanvas",
  variant = "sidebar",
  accordion = "single",
  signedOut = false,
  loadingSession = false,
  initialRowId = "home",
  defaultCollapsed = false,
  storageKey = "clipwire-sidebar",
}: ClipWireDemoProps) {
  const [rowId, setRowId] = useState(initialRowId)
  const [signedIn, setSignedIn] = useState(!signedOut)
  const [toast, setToast] = useState<string | null>(null)
  const theme = useThemeMode({ storageKey: `${storageKey}-theme`, defaultColorTheme: "default" })

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2200)
  }, [])

  const navigate = useCallback(
    (href: string) => {
      const id = rowIdFromHref(href)
      if (!id) return false
      if (id === "settings" || id === "notifications" || id === "about" || id === "privacy" || id === "help") {
        notify(`“${id}” would open here`)
        return true
      }
      setRowId(id)
      return true
    },
    [notify],
  )

  // In-memory routing: `#/…` links change state, anything else is a real link.
  const renderLink = useMemo<RenderLink>(
    () =>
      ({ href, children, onClick, ...props }) => (
        <a
          href={href}
          {...props}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            onClick?.(event)
            if (event.defaultPrevented || opensElsewhere(event)) return
            if (navigate(href)) event.preventDefault()
          }}
        >
          {children}
        </a>
      ),
    [navigate],
  )

  const onDockNavigate = useCallback((item: DockNavItem) => {
    setRowId(DEMO_DOCK_TARGETS[item.id] ?? item.id)
  }, [])

  return (
    <>
      <AppSidebar
        storageKey={storageKey}
        collapseMode={collapseMode}
        variant={variant}
        accordion={accordion}
        defaultCollapsed={defaultCollapsed}
        renderLink={renderLink}
        brand={DEMO_BRAND}
        dockItems={DEMO_DOCK_ITEMS}
        onDockNavigate={onDockNavigate}
        activeDockId={dockIdForRow(rowId)}
        activeItemId={rowId}
        sections={DEMO_SECTIONS}
        footerLinks={DEMO_FOOTER_LINKS}
        user={{
          user: signedIn ? DEMO_USER : null,
          loading: loadingSession,
          menuItems: DEMO_USER_MENU,
          onSignIn: () => {
            setSignedIn(true)
            notify("Signed in as Rowan Patel (demo)")
          },
          onSignOut: () => {
            setSignedIn(false)
            notify("Signed out")
          },
          theme: {
            mode: theme.mode,
            onModeChange: theme.setMode,
            colorThemes: DEMO_COLOR_THEMES,
            colorTheme: theme.colorTheme,
            onColorThemeChange: theme.setColorTheme,
            onColorThemePreview: theme.previewColorTheme,
          },
        }}
      >
        <DemoPage rowId={rowId} onAction={notify} />
      </AppSidebar>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed bottom-24 right-4 z-[70] rounded-lg bg-foreground px-3 py-2 text-sm text-background shadow-lg transition-opacity md:bottom-4",
          toast ? "opacity-100" : "opacity-0",
        )}
      >
        {toast}
      </div>
    </>
  )
}
