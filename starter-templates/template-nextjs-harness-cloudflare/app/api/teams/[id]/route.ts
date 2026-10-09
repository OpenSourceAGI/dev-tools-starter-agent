import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { teams, teamMembers, organizationMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// GET - Fetch team details
export async function GET(
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

    // Get team details
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    if (team.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Check if user is in the organization
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

    if (orgMembership.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get team members
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))

    return NextResponse.json({
      success: true,
      data: {
        ...team[0],
        members,
      },
    })
  } catch (error: any) {
    console.error("Error fetching team:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch team" },
      { status: 500 }
    )
  }
}

// PATCH - Update team
export async function PATCH(
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

    // Check if user is organization admin/owner or team lead
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
    const { name, description } = body

    await db
      .update(teams)
      .set({
        name,
        description,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId))

    return NextResponse.json({
      success: true,
      message: "Team updated",
    })
  } catch (error: any) {
    console.error("Error updating team:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update team" },
      { status: 500 }
    )
  }
}

// DELETE - Delete team
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

    // Get team to find organization
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    if (team.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Check if user is organization admin/owner
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

    if (orgMembership.length === 0 || !["owner", "admin"].includes(orgMembership[0].role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.delete(teams).where(eq(teams.id, teamId))

    return NextResponse.json({
      success: true,
      message: "Team deleted",
    })
  } catch (error: any) {
    console.error("Error deleting team:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete team" },
      { status: 500 }
    )
  }
}
