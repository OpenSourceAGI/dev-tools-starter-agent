import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizationMembers, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Add member to organization
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
    const { userId, role = "member" } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if already a member
    const existing = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      )
    }

    const newMember = {
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId,
      role,
      joinedAt: new Date(),
    }

    await db.insert(organizationMembers).values(newMember)

    return NextResponse.json({
      success: true,
      data: newMember,
    })
  } catch (error: any) {
    console.error("Error adding member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add member" },
      { status: 500 }
    )
  }
}

// DELETE - Remove member from organization
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
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

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

    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId)
        )
      )

    return NextResponse.json({
      success: true,
      message: "Member removed",
    })
  } catch (error: any) {
    console.error("Error removing member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove member" },
      { status: 500 }
    )
  }
}
