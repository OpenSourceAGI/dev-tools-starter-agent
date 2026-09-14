import { type NextRequest, NextResponse } from "next/server"
import { createSSMClient } from "@/lib/aws-ssm-client"
import { resolveAwsCredentialsFromHeaders } from "@/lib/aws-credentials"
import { getSession } from "@/lib/auth/session"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 })
    }

    const body = await req.json()
    const { commandId, instanceId, region } = body

    if (!commandId || !instanceId || !region) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Real keys sent by the browser, else the signed-in user's stored keys, else the server's
    const credentials = await resolveAwsCredentialsFromHeaders(req.headers, region)

    if (!credentials) {
      return NextResponse.json({ error: "AWS credentials not provided" }, { status: 401 })
    }

    const ssm = createSSMClient(credentials.accessKeyId, credentials.secretAccessKey, region)

    // Get command invocation status
    const invocation = await ssm.getCommandInvocation(commandId, instanceId)

    return NextResponse.json({
      status: invocation.status,
      statusDetails: invocation.statusDetails,
      output: invocation.standardOutput,
      error: invocation.standardError,
    })
  } catch (error: any) {
    console.error("[v0] Error checking installation status:", error)

    // Handle SSM-specific errors
    if (error.message?.includes("InvalidInstanceId")) {
      return NextResponse.json(
        {
          error: "Instance not managed by SSM",
          message: "The instance doesn't have SSM agent installed or doesn't have the required IAM role.",
        },
        { status: 400 },
      )
    }

    if (error.message?.includes("InvocationDoesNotExist")) {
      return NextResponse.json(
        {
          error: "Command not found",
          message: "The command invocation was not found.",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({ error: error.message || "Failed to check installation status" }, { status: 500 })
  }
}
