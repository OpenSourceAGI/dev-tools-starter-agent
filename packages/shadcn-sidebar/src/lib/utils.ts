/**
 * @fileoverview Small helpers every part of the sidebar shares.
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** shadcn/ui's class combiner: `clsx` for conditionals, `tailwind-merge` for conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Renders a count for a tree row or dock badge, shortening thousands to `1.4k`
 * so the number never crowds out the title beside it. Pass `exact` for a
 * total that reads better in full.
 */
export function formatCount(n: number, { exact = false }: { exact?: boolean } = {}): string {
  if (!exact && n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

/**
 * Whether a click asks for its link to open somewhere other than this tab —
 * ctrl/cmd (new tab), shift (new window), alt (download) or any button but
 * the primary one. Rows that intercept clicks hand these back to the browser.
 */
export function opensElsewhere(event: {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  button: number
}): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

/** Text fields and rich-text editors, where Ctrl/Cmd+B means bold rather than "toggle sidebar". */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']") !== null
}

/** First letter of a display name, for avatar fallbacks. */
export function initialOf(name: string | null | undefined): string {
  return (name?.trim()[0] ?? "?").toUpperCase()
}
