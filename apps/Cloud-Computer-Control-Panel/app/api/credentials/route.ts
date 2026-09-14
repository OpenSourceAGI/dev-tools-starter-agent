export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { EC2Client, DescribeRegionsCommand } from "@aws-sdk/client-ec2"
import { getUserId } from "@/lib/auth/session"
import { canEncrypt } from "@/lib/crypto"
import { deleteCredentials, describeCredentials, saveCredentials } from "@/lib/aws-credentials"
import { DEFAULT_AWS_REGION } from "@/lib/constants"

/** Cheapest call that proves a key pair is valid before it is stored. */
async function verifyCredentials(accessKeyId: string, secretAccessKey: string, region: string) {
  const client = new EC2Client({ region, credentials: { accessKeyId, secretAccessKey } })
  await client.send(new DescribeRegionsCommand({}))
}

// GET /api/credentials — what the signed-in user has saved (masked, never the secret)
export async function GET() {
  const userId = await getUserId()

  if (!userId) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 })
  }

  const credentials = await describeCredentials(userId)

  return NextResponse.json({
    credentials,
    hasCredentials: Boolean(credentials),
    hasServerCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
  })
}

// POST /api/credentials — save (or replace) the user's AWS keys, encrypted
export async function POST(request: Request) {
  const userId = await getUserId()

  if (!userId) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 })
  }

  if (!canEncrypt()) {
    return NextResponse.json(
      {
        message:
          "Server is missing CREDENTIALS_ENCRYPTION_KEY (or BETTER_AUTH_SECRET), so credentials cannot be stored securely.",
      },
      { status: 500 },
    )
  }

  try {
    const body = await request.json()
    const accessKeyId = String(body.accessKeyId || "").trim()
    const secretAccessKey = String(body.secretAccessKey || "").trim()
    const region = String(body.region || DEFAULT_AWS_REGION).trim()

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { message: "Both an access key ID and a secret access key are required" },
        { status: 400 },
      )
    }

    if (body.verify !== false) {
      try {
        await verifyCredentials(accessKeyId, secretAccessKey, region)
      } catch (error) {
        return NextResponse.json(
          {
            message:
              error instanceof Error
                ? `AWS rejected these credentials: ${error.message}`
                : "AWS rejected these credentials",
          },
          { status: 400 },
        )
      }
    }

    await saveCredentials({
      userId,
      accessKeyId,
      secretAccessKey,
      region,
      label: body.label,
    })

    return NextResponse.json({
      message: "Credentials saved",
      credentials: await describeCredentials(userId),
    })
  } catch (error) {
    console.error("[cccp] Failed to save credentials:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save credentials" },
      { status: 500 },
    )
  }
}

// DELETE /api/credentials — forget the user's stored keys
export async function DELETE() {
  const userId = await getUserId()

  if (!userId) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 })
  }

  await deleteCredentials(userId)

  return NextResponse.json({ message: "Credentials removed" })
}
