/**
 * @fileoverview Pure rules for which tree sections are open, kept apart from
 * the component so they are tested on their own.
 *
 * Two behaviours, picked with `accordion`:
 *
 * - `single` — exactly one section open; opening one closes the others.
 *   debate-ai.com's tree works this way, so a dock click shows that
 *   destination's section and nothing else.
 * - `multiple` — sections open and close independently.
 *
 * Either way, the section holding the active row opens when the active row
 * changes ({@link withSectionExpanded}); nothing else is closed by navigation.
 *
 * @module components/nav/section-expansion
 */

import type { NavItem, NavSection } from "../../lib/types"

export type AccordionMode = "single" | "multiple"

/** The section ids open on first render. */
export function initialExpandedSections(
  sections: readonly NavSection[],
  mode: AccordionMode,
  activeSectionId?: string | null,
): string[] {
  if (mode === "single") {
    const first = activeSectionId ?? sections.find((section) => !section.defaultCollapsed)?.id
    return first ? [first] : []
  }
  const open = sections.filter((section) => !section.defaultCollapsed).map((section) => section.id)
  if (activeSectionId && !open.includes(activeSectionId)) open.push(activeSectionId)
  return open
}

/** Opens `id` (closing the rest in `single` mode). Returns `current` when nothing changes. */
export function withSectionExpanded(current: readonly string[], id: string, mode: AccordionMode): readonly string[] {
  if (mode === "single") return current.length === 1 && current[0] === id ? current : [id]
  return current.includes(id) ? current : [...current, id]
}

/** Flips `id` open or closed (opening it closes the rest in `single` mode). */
export function toggleExpandedSection(current: readonly string[], id: string, mode: AccordionMode): string[] {
  if (current.includes(id)) return current.filter((open) => open !== id)
  return mode === "single" ? [id] : [...current, id]
}

function containsItem(items: readonly NavItem[], id: string): boolean {
  return items.some((item) => item.id === id || (item.children ? containsItem(item.children, id) : false))
}

/** The section holding row `itemId` (at any depth), or `null`. */
export function sectionForItem(sections: readonly NavSection[], itemId: string | undefined): string | null {
  if (!itemId) return null
  return sections.find((section) => section.id === itemId || containsItem(section.items, itemId))?.id ?? null
}

/** Ids of the nested groups on the path to `itemId`, so they open around it. */
export function ancestorGroupIds(items: readonly NavItem[], itemId: string | undefined): string[] {
  if (!itemId) return []
  for (const item of items) {
    if (item.id === itemId) return []
    if (item.children) {
      if (item.children.some((child) => child.id === itemId)) return [item.id]
      const deeper = ancestorGroupIds(item.children, itemId)
      if (deeper.length > 0) return [item.id, ...deeper]
    }
  }
  return []
}
