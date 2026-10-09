import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { teamMembers, teams, organizationMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Add member to team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id

    // Get team to find organization
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    if (team.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Check if user can add members (org admin or team lead)
    const orgMembership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, team[0].organizationId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1)

    const teamMembership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, session.user.id)
        )
      )
      .limit(1)

    const isOrgAdmin = orgMembership.length > 0 && ["owner", "admin"].includes(orgMembership[0].role)
    const isTeamLead = teamMembership.length > 0 && teamMembership[0].role === "lead"

    if (!isOrgAdmin && !isTeamLead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role = "member" } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user is in the organization
    const userInOrg = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, team[0].organizationId),
          eq(organizationMembers.userId, userId)
        )
      )
      .limit(1)

    if (userInOrg.length === 0) {
      return NextResponse.json(
        { error: "User must be in the organization first" },
        { status: 400 }
      )
    }

    // Check if already a team member
    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 400 }
      )
    }

    const newMember = {
      id: crypto.randomUUID(),
      teamId,
      userId,
      role,
      joinedAt: new Date(),
    }

    await db.insert(teamMembers).values(newMember)

    return NextResponse.json({
      success: true,
      data: newMember,
    })
  } catch (error: any) {
    console.error("Error adding team member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add team member" },
      { status: 500 }
    )
  }
}

// DELETE - Remove member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get team to find organization
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    if (team.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Check permissions
    const orgMembership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, team[0].organizationId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1)

    const teamMembership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, session.user.id)
        )
      )
      .limit(1)

    const isOrgAdmin = orgMembership.length > 0 && ["owner", "admin"].includes(orgMembership[0].role)
    const isTeamLead = teamMembership.length > 0 && teamMembership[0].role === "lead"

    if (!isOrgAdmin && !isTeamLead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      )

    return NextResponse.json({
      success: true,
      message: "Team member removed",
    })
  } catch (error: any) {
    console.error("Error removing team member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove team member" },
      { status: 500 }
    )
  }
}
