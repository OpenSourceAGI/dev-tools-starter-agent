/**
 * @fileoverview Media-query hooks. Both report the server value (`false`)
 * during SSR and the hydrating render, then follow the real query.
 *
 * @module hooks/use-media-query
 */

import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const list = window.matchMedia(query)
    const sync = () => setMatches(list.matches)
    sync()
    list.addEventListener?.("change", sync)
    return () => list.removeEventListener?.("change", sync)
  }, [query])

  return matches
}

/** Below Tailwind's `md` breakpoint — where the column gives way to a drawer. */
export function useIsMobile(breakpoint = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
}

/**
 * True only on pointers that hover precisely (mouse, trackpad). The dock
 * magnifies only for these: on touch there is no cursor to magnify toward.
 */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)")
}
