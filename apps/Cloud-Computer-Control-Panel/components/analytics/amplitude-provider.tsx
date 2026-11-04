"use client"

import { useEffect, useRef } from "react"
import { useSession } from "@/lib/auth-client"
import { clearUser, identifyUser, initializeAnalytics } from "@/lib/analytics"

/**
 * Keeps Amplitude's user identity in sync with the better-auth session.
 *
 * - page load, signed out           → initializeAnalytics()
 * - restored session / login/signup → identifyUser(user.id)
 * - session goes away (logout)      → clearUser()
 *
 * Anonymous (guest) better-auth users are left on Amplitude's device ID.
 */
export function AmplitudeProvider() {
  const { data: session, isPending } = useSession()
  const identifiedId = useRef<string | null>(null)

  const user = session?.user as { id: string; isAnonymous?: boolean | null } | undefined
  const userId = user && !user.isAnonymous ? user.id : null

  useEffect(() => {
    if (isPending) return

    if (userId) {
      if (identifiedId.current !== userId) {
        identifiedId.current = userId
        void identifyUser(userId)
      }
    } else if (identifiedId.current) {
      identifiedId.current = null
      void clearUser()
    } else {
      void initializeAnalytics()
    }
  }, [isPending, userId])

  return null
}
