import type React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"

/** Everything under /dashboard requires a session. Checked on the server so an
 *  unauthenticated visitor never renders the panel at all. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return <>{children}</>
}
