export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { describeCredentials } from "@/lib/aws-credentials"
import { DEFAULT_AWS_REGION } from "@/lib/constants"

export async function GET() {
  const hasServerCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)

  const session = await getSession()
  const stored = session?.user?.id ? await describeCredentials(session.user.id) : null

  return NextResponse.json({
    signedIn: Boolean(session),
    user: session ? { id: session.user.id, name: session.user.name, email: session.user.email } : null,
    // Kept for backwards compatibility: true when *some* credentials are usable.
    hasCredentials: Boolean(stored) || hasServerCredentials,
    hasStoredCredentials: Boolean(stored),
    hasServerCredentials,
    credentials: stored,
    region: stored?.region || process.env.AWS_REGION || DEFAULT_AWS_REGION,
  })
}
