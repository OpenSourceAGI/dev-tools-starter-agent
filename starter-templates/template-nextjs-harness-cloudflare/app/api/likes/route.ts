import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { likes, users, notifications, comments } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

// GET - Get likes for an item and check if user liked it
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get("itemType")
    const itemId = searchParams.get("itemId")

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: "itemType and itemId are required" },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    // Get total likes count
    const likesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(
        and(
          eq(likes.itemType, itemType),
          eq(likes.itemId, itemId)
        )
      )

    // Check if current user liked this item
    let userLiked = false
    if (session?.user?.id) {
      const userLike = await db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.itemType, itemType),
            eq(likes.itemId, itemId),
            eq(likes.userId, session.user.id)
          )
        )
        .limit(1)

      userLiked = userLike.length > 0
    }

    return NextResponse.json({
      success: true,
      data: {
        count: likesCount[0]?.count || 0,
        userLiked,
      },
    })
  } catch (error: any) {
    console.error("Error fetching likes:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch likes" },
      { status: 500 }
    )
  }
}

// POST - Like an item
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { itemType, itemId } = body

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: "itemType and itemId are required" },
        { status: 400 }
      )
    }

    // Validate itemType
    const validTypes = ["debate_report", "news_tip", "signal", "strategy", "comment"]
    if (!validTypes.includes(itemType)) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 })
    }

    // Check if already liked
    const existing = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, session.user.id),
          eq(likes.itemType, itemType),
          eq(likes.itemId, itemId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Already liked this item" },
        { status: 400 }
      )
    }

    const now = new Date()

    const newLike = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      itemType,
      itemId,
      createdAt: now,
    }

    await db.insert(likes).values(newLike)

    // Create notification for the item owner
    // For comments, get the comment author
    if (itemType === "comment") {
      const comment = await db
        .select()
        .from(comments)
        .where(eq(comments.id, itemId))
        .limit(1)

      if (comment.length > 0 && comment[0].userId !== session.user.id) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: comment[0].userId,
          type: "like",
          title: "Someone liked your comment",
          message: `${session.user.name} liked your comment`,
          fromUserId: session.user.id,
          relatedItemType: itemType,
          relatedItemId: itemId,
          read: false,
          createdAt: now,
        })
      }
    }

    // Get updated count
    const likesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(
        and(
          eq(likes.itemType, itemType),
          eq(likes.itemId, itemId)
        )
      )

    return NextResponse.json({
      success: true,
      data: {
        ...newLike,
        count: likesCount[0]?.count || 0,
      },
    })
  } catch (error: any) {
    console.error("Error liking item:", error)
    return NextResponse.json(
      { error: error.message || "Failed to like item" },
      { status: 500 }
    )
  }
}

// DELETE - Unlike an item
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get("itemType")
    const itemId = searchParams.get("itemId")

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: "itemType and itemId are required" },
        { status: 400 }
      )
    }

    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, session.user.id),
          eq(likes.itemType, itemType),
          eq(likes.itemId, itemId)
        )
      )

    // Get updated count
    const likesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(
        and(
          eq(likes.itemType, itemType),
          eq(likes.itemId, itemId)
        )
      )

    return NextResponse.json({
      success: true,
      message: "Item unliked",
      data: {
        count: likesCount[0]?.count || 0,
      },
    })
  } catch (error: any) {
    console.error("Error unliking item:", error)
    return NextResponse.json(
      { error: error.message || "Failed to unlike item" },
      { status: 500 }
    )
  }
}
