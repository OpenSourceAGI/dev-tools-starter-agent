/**
 * @fileoverview The data shapes a host hands the sidebar. Everything the
 * sidebar draws — dock buttons, tree sections, account menu rows — comes from
 * these plain objects, so a site configures the sidebar with data rather than
 * by forking its markup.
 *
 * @module lib/types
 */

import type { ComponentType, ReactNode, SVGProps } from "react"

/** Any icon component that accepts a `className` — Lucide, Heroicons, a custom SVG. */
export type SidebarIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>

/**
 * How links are rendered. Defaults to a plain `<a>`; pass your router's link
 * (`next/link`, React Router's `Link`, …) through `renderLink` on the provider
 * to get client-side navigation.
 */
export type RenderLink = (props: {
  href: string
  className?: string
  children: ReactNode
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
  "aria-current"?: "page" | undefined
  title?: string
  target?: string
  rel?: string
}) => ReactNode

/** One button in the app dock. */
export interface DockNavItem {
  id: string
  label: string
  icon: SidebarIcon
  /** Destination. Renders a real anchor, so middle-click and open-in-new-tab work. */
  href?: string
  /** Called on a plain click (after navigation for linked items, unless prevented). */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
  /** Small number or text drawn on the icon's corner, e.g. unread items. */
  badge?: number | string
  /** Highlights the button; the provider's `activeDockId` does the same. */
  active?: boolean
}

/** A row inside a tree section. Rows nest through `children`. */
export interface NavItem {
  id: string
  title: string
  href?: string
  icon?: SidebarIcon
  /** Right-aligned count; thousands shorten to `1.4k` unless `exactCount`. */
  count?: number
  exactCount?: boolean
  /** Free-form trailing badge (e.g. "New"), drawn instead of the count. */
  badge?: ReactNode
  /** Opens in a new tab with an external-link hint. */
  external?: boolean
  /** Nested rows, drawn as a collapsible sub-group. */
  children?: NavItem[]
  /** Called on a plain click — for hosts that route in state rather than by URL. */
  onSelect?: (item: NavItem) => void
}

/** A top-level collapsible section of the tree. */
export interface NavSection {
  id: string
  title: string
  icon?: SidebarIcon
  /**
   * Opened by a modifier-click on the heading (a plain click only toggles the
   * section, since sections are groupings rather than destinations).
   */
  href?: string
  /** Total shown beside the heading. */
  count?: number
  items: NavItem[]
  /** Start this section closed even when the tree opens everything by default. */
  defaultCollapsed?: boolean
}

/** A row in the account menu. */
export interface UserMenuItem {
  id: string
  label: string
  icon?: SidebarIcon
  href?: string
  onSelect?: () => void
  /** Count drawn at the row's end (e.g. unread notifications). */
  badge?: number
  /** Draws a separator before this row. */
  separatorBefore?: boolean
  /** Red, for destructive actions. */
  destructive?: boolean
}

/** The signed-in account the footer shows. */
export interface SidebarUser {
  name: string
  email?: string
  image?: string | null
  /** Short status under the name in place of the email (e.g. "Pro plan"). */
  subtitle?: string
}

/** Light / dark / follow the OS. */
export type ThemeMode = "light" | "dark" | "system"

/** A colour theme offered in the account menu's Theme submenu. */
export interface ColorTheme {
  name: string
  label?: string
  /** Swatch colours drawn beside the name. */
  primary: string
  secondary: string
}
