import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifications, users } from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")

    let query = db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        actionUrl: notifications.actionUrl,
        read: notifications.read,
        createdAt: notifications.createdAt,
        fromUserId: notifications.fromUserId,
        fromUserName: users.name,
        fromUserImage: users.image,
        relatedItemType: notifications.relatedItemType,
        relatedItemId: notifications.relatedItemId,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .where(
        unreadOnly
          ? and(
              eq(notifications.userId, session.user.id),
              eq(notifications.read, false)
            )
          : eq(notifications.userId, session.user.id)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit)

    const userNotifications = await query

    // Get unread count
    const unreadCount = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.read, false)
        )
      )

    return NextResponse.json({
      success: true,
      data: userNotifications,
      unreadCount: unreadCount.length,
    })
  } catch (error: any) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

// PATCH - Mark notification(s) as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, session.user.id))

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      })
    } else if (notificationId) {
      // Mark specific notification as read
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, session.user.id)
          )
        )

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      })
    } else {
      return NextResponse.json(
        { error: "Either notificationId or markAllAsRead is required" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error updating notifications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update notifications" },
      { status: 500 }
    )
  }
}

// DELETE - Delete notification(s)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get("notificationId")
    const deleteAll = searchParams.get("deleteAll") === "true"

    if (deleteAll) {
      // Delete all read notifications
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.userId, session.user.id),
            eq(notifications.read, true)
          )
        )

      return NextResponse.json({
        success: true,
        message: "All read notifications deleted",
      })
    } else if (notificationId) {
      // Delete specific notification
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, session.user.id)
          )
        )

      return NextResponse.json({
        success: true,
        message: "Notification deleted",
      })
    } else {
      return NextResponse.json(
        { error: "Either notificationId or deleteAll is required" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error deleting notifications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete notifications" },
      { status: 500 }
    )
  }
}
