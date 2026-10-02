import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Generate a new API key
    const newApiKey = `tt_${randomBytes(32).toString("hex")}`;

    // Store the API key in the database
    // We update the user's record with the new API key
    await db.update(users)
        .set({ apiKey: newApiKey })
        .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      apiKey: newApiKey,
    });
  } catch (error) {
    console.error("API key regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate API key" },
      { status: 500 }
    );
  }
}
