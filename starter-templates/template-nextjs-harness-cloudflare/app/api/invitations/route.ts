import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { userInvitations, users, notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// GET - Get user's sent and received invitations
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "sent" or "received"

    if (type === "sent") {
      const sentInvitations = await db
        .select()
        .from(userInvitations)
        .where(eq(userInvitations.inviterId, session.user.id))

      return NextResponse.json({
        success: true,
        data: sentInvitations,
      })
    } else {
      // Get invitations sent to this user's email
      const receivedInvitations = await db
        .select()
        .from(userInvitations)
        .where(eq(userInvitations.email, session.user.email))

      return NextResponse.json({
        success: true,
        data: receivedInvitations,
      })
    }
  } catch (error: any) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitations" },
      { status: 500 }
    )
  }
}

// POST - Send invitation
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, organizationId, teamId } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if user already exists with this email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invitation = {
      id: crypto.randomUUID(),
      inviterId: session.user.id,
      email,
      status: "pending",
      organizationId: organizationId || null,
      teamId: teamId || null,
      expiresAt,
      createdAt: now,
    }

    await db.insert(userInvitations).values(invitation)

    // If user exists, create a notification
    if (existingUser.length > 0) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: existingUser[0].id,
        type: "invite",
        title: "You've been invited",
        message: organizationId
          ? `${session.user.name} invited you to join an organization`
          : `${session.user.name} sent you an invitation`,
        fromUserId: session.user.id,
        read: false,
        createdAt: now,
      })
    }

    // TODO: Send email invitation
    // You can integrate with a service like Resend, SendGrid, or Nodemailer here

    return NextResponse.json({
      success: true,
      data: invitation,
      message: "Invitation sent",
    })
  } catch (error: any) {
    console.error("Error sending invitation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send invitation" },
      { status: 500 }
    )
  }
}

// PATCH - Accept/Reject invitation
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { invitationId, status } = body

    if (!invitationId || !["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Get invitation
    const invitation = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.id, invitationId))
      .limit(1)

    if (invitation.length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    if (invitation[0].email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (invitation[0].status !== "pending") {
      return NextResponse.json(
        { error: "Invitation already processed" },
        { status: 400 }
      )
    }

    if (new Date() > invitation[0].expiresAt) {
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 }
      )
    }

    await db
      .update(userInvitations)
      .set({ status })
      .where(eq(userInvitations.id, invitationId))

    // If accepted and there's an organization/team, add the user
    if (status === "accepted") {
      if (invitation[0].organizationId) {
        const { organizationMembers } = await import("@/lib/db/schema")
        await db.insert(organizationMembers).values({
          id: crypto.randomUUID(),
          organizationId: invitation[0].organizationId,
          userId: session.user.id,
          role: "member",
          joinedAt: new Date(),
        })
      }

      if (invitation[0].teamId) {
        const { teamMembers } = await import("@/lib/db/schema")
        await db.insert(teamMembers).values({
          id: crypto.randomUUID(),
          teamId: invitation[0].teamId,
          userId: session.user.id,
          role: "member",
          joinedAt: new Date(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitation ${status}`,
    })
  } catch (error: any) {
    console.error("Error processing invitation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process invitation" },
      { status: 500 }
    )
  }
}
