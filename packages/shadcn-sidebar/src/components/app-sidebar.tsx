"use client"

/**
 * @fileoverview The whole sidebar in one component: provider, resizable
 * column, app dock, nav tree, account menu, mobile drawer and bottom dock,
 * configured entirely with data.
 *
 * Where the dock goes follows the column's state, as on debate-ai.com:
 *
 * | Column                 | Dock                                    |
 * | ---------------------- | --------------------------------------- |
 * | expanded               | at the top of the column (`sidebar`)    |
 * | icon rail              | a vertical stack in the rail (`rail`)   |
 * | hidden (offcanvas)     | floating at the bottom (`floating`)     |
 * | phone (below `md`)     | a bottom bar that opens the drawer      |
 *
 * Each piece is also exported on its own (`SidebarProvider`,
 * `SidebarLayout`, `AppDock`, `NavTree`, `NavUser`, `MobileSidebarDrawer`)
 * for hosts that need a different arrangement.
 *
 * @module components/app-sidebar
 */

import type React from "react"

import { cn } from "../lib/utils"
import type { DockNavItem, NavItem, NavSection, SidebarIcon } from "../lib/types"
import { AppDock } from "./dock/app-dock"
import { MobileSidebarDrawer } from "./layout/mobile-sidebar-drawer"
import { SidebarProvider, useSidebar, type SidebarProviderProps } from "./layout/sidebar-context"
import { SidebarLayout, type SidebarLayoutProps } from "./layout/sidebar-layout"
import { NavTree } from "./nav/nav-tree"
import type { AccordionMode } from "./nav/section-expansion"
import { NavUser, type NavUserProps } from "./user/nav-user"

export interface SidebarBrand {
  name: string
  icon?: SidebarIcon
  href?: string
  /** Second line under the name. */
  tagline?: string
}

export interface SidebarFooterLink {
  id: string
  label: string
  href: string
}

export interface AppSidebarProps
  extends Omit<SidebarProviderProps, "children">,
    Pick<SidebarLayoutProps, "defaultWidth" | "minWidth" | "maxWidth" | "railWidth" | "resizable" | "contentClassName"> {
  /** The page beside the sidebar. */
  children: React.ReactNode
  brand?: SidebarBrand
  dockItems?: DockNavItem[]
  /** Dock clicks on linked items, for client-side routers (see `AppDock`). */
  onDockNavigate?: (item: DockNavItem, event: React.MouseEvent<HTMLElement>) => void
  sections?: NavSection[]
  accordion?: AccordionMode
  onSelectItem?: (item: NavItem) => void
  /** The account row. Omit to leave the footer to the hide button. */
  user?: NavUserProps
  /** Anything to draw between the dock and the tree (a search box, a CTA…). */
  sidebarTop?: React.ReactNode
  /** Small links at the bottom of the scrolling area. */
  footerLinks?: SidebarFooterLink[]
  /** Show the bottom dock on phones. Default `true` when there are dock items. */
  mobileDock?: boolean
  className?: string
}

function Brand({ brand, className: extra }: { brand: SidebarBrand; className?: string }) {
  const { rail, renderLink } = useSidebar()
  const Icon = brand.icon
  const body = (
    <>
      {Icon ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="size-4" />
        </span>
      ) : null}
      {!rail && (
        <span className="grid min-w-0 leading-tight">
          <span className="truncate text-sm font-semibold">{brand.name}</span>
          {brand.tagline ? <span className="truncate text-xs text-muted-foreground">{brand.tagline}</span> : null}
        </span>
      )}
    </>
  )
  const className = cn("flex min-w-0 items-center gap-2 rounded-md p-1 hover:bg-accent", rail && "justify-center", extra)
  return brand.href ? (
    <>{renderLink({ href: brand.href, className, title: rail ? brand.name : undefined, children: body })}</>
  ) : (
    <div className={className}>{body}</div>
  )
}

function FooterLinks({ links }: { links: SidebarFooterLink[] }) {
  const { renderLink } = useSidebar()
  return (
    <ul className="mt-auto flex flex-wrap gap-x-3 gap-y-1 px-2 text-xs text-muted-foreground">
      {links.map((link) => (
        <li key={link.id}>{renderLink({ href: link.href, className: "hover:text-foreground hover:underline", children: link.label })}</li>
      ))}
    </ul>
  )
}

function AppSidebarFrame({
  children,
  brand,
  dockItems = [],
  onDockNavigate,
  sections = [],
  accordion,
  onSelectItem,
  user,
  sidebarTop,
  footerLinks,
  mobileDock,
  className,
  defaultWidth,
  minWidth,
  maxWidth,
  railWidth,
  resizable,
  contentClassName,
}: Omit<AppSidebarProps, keyof Omit<SidebarProviderProps, "children">>) {
  const { rail, collapsed, collapseMode } = useSidebar()
  const hasDock = dockItems.length > 0
  const showMobileDock = mobileDock ?? hasDock

  // The column and the drawer draw the same contents.
  const contents = (inDrawer: boolean) => (
    <>
      {hasDock && !inDrawer && <AppDock items={dockItems} placement={rail ? "rail" : "sidebar"} onNavigate={onDockNavigate} />}
      {rail && hasDock && sections.length > 0 && <hr className="w-6 border-border" />}
      {!rail && sidebarTop}
      {sections.length > 0 && <NavTree sections={sections} accordion={accordion} onSelect={onSelectItem} />}
      {!rail && footerLinks && footerLinks.length > 0 && <FooterLinks links={footerLinks} />}
    </>
  )

  return (
    <>
      <SidebarLayout
        className={className}
        header={brand ? <Brand brand={brand} /> : undefined}
        sidebar={contents(false)}
        footer={user ? <NavUser {...user} /> : undefined}
        defaultWidth={defaultWidth}
        minWidth={minWidth}
        maxWidth={maxWidth}
        railWidth={railWidth}
        resizable={resizable}
        contentClassName={cn(
          "flex min-h-screen flex-col",
          showMobileDock && "max-md:pb-24",
          // Room for the floating dock while the column is hidden.
          hasDock && collapsed && collapseMode === "offcanvas" && "md:pb-24",
          contentClassName,
        )}
      >
        {children}
      </SidebarLayout>

      {hasDock && collapsed && collapseMode === "offcanvas" && (
        <AppDock items={dockItems} placement="floating" onNavigate={onDockNavigate} />
      )}

      <MobileSidebarDrawer footer={user ? <NavUser {...user} /> : undefined}>
        {brand ? <Brand brand={brand} className="mr-10" /> : null}
        {contents(true)}
      </MobileSidebarDrawer>

      {showMobileDock && <AppDock items={dockItems} placement="bottom" onNavigate={onDockNavigate} />}
    </>
  )
}

export function AppSidebar({
  storageKey,
  collapseMode,
  variant,
  collapsed,
  onCollapsedChange,
  defaultCollapsed,
  activeDockId,
  activeItemId,
  renderLink,
  keyboardShortcut,
  ...frame
}: AppSidebarProps) {
  return (
    <SidebarProvider
      storageKey={storageKey}
      collapseMode={collapseMode}
      variant={variant}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      defaultCollapsed={defaultCollapsed}
      activeDockId={activeDockId}
      activeItemId={activeItemId}
      renderLink={renderLink}
      keyboardShortcut={keyboardShortcut}
    >
      <AppSidebarFrame {...frame} />
    </SidebarProvider>
  )
}
