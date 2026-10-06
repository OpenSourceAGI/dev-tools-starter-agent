/**
 * @file sidebar-search.tsx
 * @description Moves the docs search bar out of the top navbar and into the sidebar.
 * Reused from starter-templates/template-fumadocs — keep the two copies in sync.
 *
 * Usage (see src/app/docs/layout.tsx):
 *   <DocsLayout
 *     slots={{ searchTrigger: { sm: SearchTrigger, full: NoNavbarSearch } }}
 *     sidebar={{ banner: <SidebarSearch /> }}
 *   />
 *
 * The compact icon trigger is kept in the navbar on mobile, where the sidebar
 * is a hidden drawer.
 */
'use client'
import {
  FullSearchTrigger,
  SearchTrigger,
} from 'fumadocs-ui/layouts/shared/slots/search-trigger'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Full-width search bar rendered at the top of the sidebar. */
export function SidebarSearch({
  className,
  ...props
}: ComponentProps<typeof FullSearchTrigger>) {
  return (
    <FullSearchTrigger
      hideIfDisabled
      className={cn('w-full rounded-lg', className)}
      {...props}
    />
  )
}

/** Replaces the navbar's full search bar so search only appears once. */
export function NoNavbarSearch() {
  return null
}

export { SearchTrigger }
