"use client"

/**
 * @fileoverview The sidebar a phone gets: a left drawer holding the same
 * contents as the desktop column, opened by the bottom dock's first button
 * (or `toggle()` / Ctrl+B). It closes on Escape, on the overlay, and when a
 * link inside it is followed — so a host needs no route listener for that.
 *
 * @module components/layout/mobile-sidebar-drawer
 */

import type React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"
import { useSidebar } from "./sidebar-context"

export interface MobileSidebarDrawerProps {
  children: React.ReactNode
  /** Pinned under the contents (e.g. the account menu). */
  footer?: React.ReactNode
  title?: string
  className?: string
}

export function MobileSidebarDrawer({ children, footer, title = "Sidebar", className }: MobileSidebarDrawerProps) {
  const { mobileOpen, setMobileOpen } = useSidebar()

  const closeOnLink = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target?.closest?.("a[href]")) setMobileOpen(false)
  }

  return (
    <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          data-sidebar="drawer"
          className={cn(
            "fixed inset-y-0 left-0 z-[61] flex w-[85vw] max-w-sm flex-col bg-sidebar text-sidebar-foreground shadow-lg md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Close sidebar"
            className="absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 pb-6" onClick={closeOnLink}>
            {children}
          </div>
          {footer ? <div className="shrink-0 border-t border-border/60 px-2 py-1.5">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
