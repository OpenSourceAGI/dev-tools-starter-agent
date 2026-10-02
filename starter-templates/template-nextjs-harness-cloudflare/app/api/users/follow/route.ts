import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { userFollows, users, notifications } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"

// GET - Get user's followers and following
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "followers" or "following"
    const userId = searchParams.get("userId") || session.user.id

    if (type === "followers") {
      // Get users following this user
      const followers = await db
        .select({
          id: userFollows.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          followedAt: userFollows.createdAt,
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followerId, users.id))
        .where(eq(userFollows.followingId, userId))

      return NextResponse.json({
        success: true,
        data: followers,
      })
    } else {
      // Get users this user is following
      const following = await db
        .select({
          id: userFollows.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          followedAt: userFollows.createdAt,
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followingId, users.id))
        .where(eq(userFollows.followerId, userId))

      return NextResponse.json({
        success: true,
        data: following,
      })
    }
  } catch (error: any) {
    console.error("Error fetching follows:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch follows" },
      { status: 500 }
    )
  }
}

// POST - Follow a user
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      )
    }

    // Check if user exists
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (targetUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if already following
    const existing = await db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, session.user.id),
          eq(userFollows.followingId, userId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 400 }
      )
    }

    const now = new Date()

    const newFollow = {
      id: crypto.randomUUID(),
      followerId: session.user.id,
      followingId: userId,
      createdAt: now,
    }

    await db.insert(userFollows).values(newFollow)

    // Create notification for the followed user
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: userId,
      type: "follow",
      title: "New Follower",
      message: `${session.user.name} started following you`,
      fromUserId: session.user.id,
      read: false,
      createdAt: now,
    })

    return NextResponse.json({
      success: true,
      data: newFollow,
    })
  } catch (error: any) {
    console.error("Error following user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to follow user" },
      { status: 500 }
    )
  }
}

// DELETE - Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, session.user.id),
          eq(userFollows.followingId, userId)
        )
      )

    return NextResponse.json({
      success: true,
      message: "Unfollowed user",
    })
  } catch (error: any) {
    console.error("Error unfollowing user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to unfollow user" },
      { status: 500 }
    )
  }
}
