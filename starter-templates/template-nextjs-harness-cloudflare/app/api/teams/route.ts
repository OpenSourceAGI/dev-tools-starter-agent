import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { teams, teamMembers, organizationMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Create new team
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, name, description } = body

    if (!organizationId || !name) {
      return NextResponse.json(
        { error: "Organization ID and name are required" },
        { status: 400 }
      )
    }

    // Check if user is a member of the organization
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0 || !["owner", "admin"].includes(membership[0].role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const teamId = crypto.randomUUID()
    const now = new Date()

    const newTeam = {
      id: teamId,
      organizationId,
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(teams).values(newTeam)

    // Add creator as team lead
    await db.insert(teamMembers).values({
      id: crypto.randomUUID(),
      teamId,
      userId: session.user.id,
      role: "lead",
      joinedAt: now,
    })

    return NextResponse.json({
      success: true,
      data: newTeam,
    })
  } catch (error: any) {
    console.error("Error creating team:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create team" },
      { status: 500 }
    )
  }
}
