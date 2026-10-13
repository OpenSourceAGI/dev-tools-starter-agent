"use client"

/**
 * @fileoverview The sidebar's collapsible navigation tree, drawn from a list
 * of {@link NavSection}s.
 *
 * - **Sections are groupings, not destinations.** A plain click on a heading
 *   only toggles it. A heading with an `href` still renders as an anchor, so
 *   a ctrl/cmd/shift/middle-click opens that section's page in a new tab.
 * - **Accordion.** `single` keeps one section open, `multiple` lets them
 *   stack (see `section-expansion.ts`). The section holding the active row
 *   opens whenever the active row changes; navigation closes nothing.
 * - **Rows nest.** A row with `children` is a sub-group with its own chevron;
 *   indentation comes from nesting, so a leaf sits one step in from its
 *   parent wherever it hangs. The groups around the active row start open.
 * - **One highlight.** Exactly the row whose id is active is lit, with
 *   `aria-current="page"`.
 * - **Rail.** In the icon rail each section is an icon button; clicking one
 *   expands the column with that section open.
 *
 * @module components/nav/nav-tree
 */

import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react"
import { ChevronRight, ExternalLink } from "lucide-react"

import { cn, formatCount, opensElsewhere } from "../../lib/utils"
import type { NavItem, NavSection } from "../../lib/types"
import { useSidebar } from "../layout/sidebar-context"
import {
  ancestorGroupIds,
  initialExpandedSections,
  sectionForItem,
  toggleExpandedSection,
  withSectionExpanded,
  type AccordionMode,
} from "./section-expansion"

export interface NavTreeProps {
  sections: NavSection[]
  /** `single` (default) keeps one section open; `multiple` lets them stack. */
  accordion?: AccordionMode
  /** Overrides the provider's `activeItemId`. */
  activeItemId?: string
  /** Called for every plain click on a row, after the row's own `onSelect`. */
  onSelect?: (item: NavItem) => void
  /** Accessible name of the `<nav>`. */
  label?: string
  className?: string
}

const ICON = "size-4 shrink-0 text-muted-foreground"
const ROW =
  "group/row flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"

function Trailing({ count, exactCount, badge, external }: Pick<NavItem, "count" | "exactCount" | "badge" | "external">) {
  if (badge !== undefined && badge !== null) {
    return <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">{badge}</span>
  }
  if (count !== undefined) {
    return <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{formatCount(count, { exact: exactCount })}</span>
  }
  if (external) return <ExternalLink className="ml-auto size-3 shrink-0 text-muted-foreground" aria-hidden />
  return null
}

export function NavTree({
  sections,
  accordion = "single",
  activeItemId: activeProp,
  onSelect,
  label = "Navigation",
  className,
}: NavTreeProps) {
  const sidebar = useSidebar()
  const activeItemId = activeProp ?? sidebar.activeItemId
  const activeSectionId = sectionForItem(sections, activeItemId)

  const [expanded, setExpanded] = useState<readonly string[]>(() =>
    initialExpandedSections(sections, accordion, activeSectionId),
  )

  // Re-open the section holding the active row on navigation.
  useEffect(() => {
    if (activeSectionId == null) return
    setExpanded((current) => withSectionExpanded(current, activeSectionId, accordion))
  }, [activeSectionId, accordion])

  const toggleSection = useCallback(
    (id: string) => setExpanded((current) => toggleExpandedSection(current, id, accordion)),
    [accordion],
  )

  // Nested groups: the ones around the active row start open.
  const activeAncestors = useMemo(
    () => sections.flatMap((section) => ancestorGroupIds(section.items, activeItemId)),
    [sections, activeItemId],
  )
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => new Set(activeAncestors))
  useEffect(() => {
    if (activeAncestors.length === 0) return
    setOpenGroups((current) => {
      if (activeAncestors.every((id) => current.has(id))) return current
      return new Set([...current, ...activeAncestors])
    })
  }, [activeAncestors])
  const toggleGroup = (id: string) =>
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (sidebar.rail) {
    return (
      <nav aria-label={label} className={cn("flex flex-col items-center gap-1", className)}>
        {sections.map((section) => {
          const Icon = section.icon ?? ChevronRight
          const active = section.id === activeSectionId
          return (
            <button
              key={section.id}
              type="button"
              title={section.title}
              aria-label={section.title}
              onClick={() => {
                setExpanded((current) => withSectionExpanded(current, section.id, accordion))
                sidebar.setCollapsed(false)
              }}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-foreground",
              )}
            >
              <Icon className="size-4" />
            </button>
          )
        })}
      </nav>
    )
  }

  const select = (item: NavItem) => {
    item.onSelect?.(item)
    onSelect?.(item)
  }

  const renderItems = (items: NavItem[]): ReactNode => (
    <ul role="list" className="flex flex-col gap-0.5 border-l border-border/60 pl-2 ml-[15px]">
      {items.map((item) => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  )

  const renderItem = (item: NavItem): ReactNode => {
    const Icon = item.icon
    const active = item.id === activeItemId
    const body = (
      <>
        {Icon ? <Icon className={cn(ICON, active && "text-foreground")} /> : null}
        <span className="truncate">{item.title}</span>
        <Trailing count={item.count} exactCount={item.exactCount} badge={item.badge} external={item.external} />
      </>
    )
    const rowClass = cn(ROW, active && "bg-accent font-medium text-accent-foreground")

    if (item.children && item.children.length > 0) {
      const open = openGroups.has(item.id)
      return (
        <div>
          <div className="flex items-center">
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} ${item.title}`}
              onClick={() => toggleGroup(item.id)}
              className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent"
            >
              <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
            </button>
            {item.href
              ? sidebar.renderLink({
                  href: item.href,
                  className: rowClass,
                  "aria-current": active ? "page" : undefined,
                  onClick: (event: MouseEvent<HTMLAnchorElement>) => {
                    if (!opensElsewhere(event)) select(item)
                  },
                  children: body,
                })
              : (
                <button type="button" className={rowClass} onClick={() => { toggleGroup(item.id); select(item) }}>
                  {body}
                </button>
              )}
          </div>
          {open && renderItems(item.children)}
        </div>
      )
    }

    if (item.href) {
      return sidebar.renderLink({
        href: item.href,
        className: rowClass,
        "aria-current": active ? "page" : undefined,
        target: item.external ? "_blank" : undefined,
        rel: item.external ? "noreferrer noopener" : undefined,
        onClick: (event: MouseEvent<HTMLAnchorElement>) => {
          if (!opensElsewhere(event)) select(item)
        },
        children: body,
      })
    }

    return (
      <button type="button" className={rowClass} aria-current={active ? "page" : undefined} onClick={() => select(item)}>
        {body}
      </button>
    )
  }

  return (
    <nav aria-label={label} className={cn("flex flex-col gap-2 text-sm", className)}>
      {sections.map((section) => {
        const open = expanded.includes(section.id)
        const Icon = section.icon
        const headingId = `sidebar-section-${section.id}`
        const heading = (
          <>
            <ChevronRight
              className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
              aria-hidden
            />
            {Icon ? <Icon className={ICON} /> : null}
            <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground group-hover/row:text-foreground">
              {section.title}
            </span>
            {section.count !== undefined && (
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatCount(section.count)}</span>
            )}
          </>
        )
        const onHeadingClick = (event: MouseEvent<HTMLElement>) => {
          // Modifier clicks on a heading with a page go to the browser.
          if (section.href && opensElsewhere(event)) return
          event.preventDefault()
          toggleSection(section.id)
        }

        return (
          <section key={section.id} aria-labelledby={headingId}>
            <h2 id={headingId} className="m-0">
              {section.href ? (
                <a href={section.href} aria-expanded={open} onClick={onHeadingClick} className={ROW}>
                  {heading}
                </a>
              ) : (
                <button type="button" aria-expanded={open} onClick={onHeadingClick} className={ROW}>
                  {heading}
                </button>
              )}
            </h2>
            {open && section.items.length > 0 && <div className="mt-0.5">{renderItems(section.items)}</div>}
          </section>
        )
      })}
    </nav>
  )
}
