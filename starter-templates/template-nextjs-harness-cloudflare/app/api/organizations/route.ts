import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations, organizationMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// GET - Fetch user's organizations
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get organizations where user is a member
    const userOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        description: organizations.description,
        image: organizations.image,
        ownerId: organizations.ownerId,
        createdAt: organizations.createdAt,
        role: organizationMembers.role,
      })
      .from(organizations)
      .innerJoin(
        organizationMembers,
        eq(organizations.id, organizationMembers.organizationId)
      )
      .where(eq(organizationMembers.userId, session.user.id))

    return NextResponse.json({
      success: true,
      data: userOrgs,
    })
  } catch (error: any) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizations" },
      { status: 500 }
    )
  }
}

// POST - Create new organization
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, image } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const orgId = crypto.randomUUID()
    const now = new Date()

    // Create organization
    const newOrg = {
      id: orgId,
      name,
      description: description || null,
      image: image || null,
      ownerId: session.user.id,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(organizations).values(newOrg)

    // Add creator as owner member
    await db.insert(organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: session.user.id,
      role: "owner",
      joinedAt: now,
    })

    return NextResponse.json({
      success: true,
      data: newOrg,
    })
  } catch (error: any) {
    console.error("Error creating organization:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create organization" },
      { status: 500 }
    )
  }
}
