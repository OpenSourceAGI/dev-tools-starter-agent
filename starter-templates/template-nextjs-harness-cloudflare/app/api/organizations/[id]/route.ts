import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations, organizationMembers, teams } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// GET - Fetch organization details
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

    const orgId = params.id

    // Check if user is a member
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get organization details
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    if (org.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Get members
    const members = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId))

    // Get teams
    const orgTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.organizationId, orgId))

    return NextResponse.json({
      success: true,
      data: {
        ...org[0],
        members,
        teams: orgTeams,
        userRole: membership[0].role,
      },
    })
  } catch (error: any) {
    console.error("Error fetching organization:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch organization" },
      { status: 500 }
    )
  }
}

// PATCH - Update organization
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

    const orgId = params.id

    // Check if user is owner or admin
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0 || !["owner", "admin"].includes(membership[0].role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, image } = body

    await db
      .update(organizations)
      .set({
        name,
        description,
        image,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId))

    return NextResponse.json({
      success: true,
      message: "Organization updated",
    })
  } catch (error: any) {
    console.error("Error updating organization:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: 500 }
    )
  }
}

// DELETE - Delete organization
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

    const orgId = params.id

    // Check if user is owner
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    if (org.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (org[0].ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.delete(organizations).where(eq(organizations.id, orgId))

    return NextResponse.json({
      success: true,
      message: "Organization deleted",
    })
  } catch (error: any) {
    console.error("Error deleting organization:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete organization" },
      { status: 500 }
    )
  }
}
