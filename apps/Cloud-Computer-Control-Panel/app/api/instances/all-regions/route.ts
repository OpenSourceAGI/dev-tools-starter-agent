import { NextResponse } from "next/server"
import { describeInstances } from "@/lib/aws-ec2-client"
import { resolveAwsCredentialsFromHeaders } from "@/lib/aws-credentials"
import { getSession } from "@/lib/auth/session"

const AWS_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ca-central-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-south-1",
  "eu-north-1",
  "me-south-1",
  "sa-east-1",
]

const OPT_IN_REGIONS = ["ap-east-1", "eu-south-1", "me-south-1", "af-south-1"]

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 })
    }

    // Real keys sent by the browser, else the signed-in user's stored keys, else the server's
    const credentials = await resolveAwsCredentialsFromHeaders(request.headers)

    if (!credentials) {
      return NextResponse.json({ message: "AWS credentials are required" }, { status: 400 })
    }

    const { accessKeyId, secretAccessKey } = credentials

    const allInstances = await Promise.all(
      AWS_REGIONS.map(async (region) => {
        try {
          const instances = await describeInstances(accessKeyId, secretAccessKey, region)

          return instances
            .filter((instance) => instance.state !== "terminated")
            .map((instance) => ({
              ...instance,
              region,
            }))
        } catch (error) {
          // Only log errors for regions that should work by default
          if (!OPT_IN_REGIONS.includes(region)) {
            console.error(`[v0] Error scanning region ${region}:`, error)
          }
          // Silently skip opt-in regions that aren't enabled for this account
          return []
        }
      }),
    )

    const flatInstances = allInstances.flat()

    return NextResponse.json({
      instances: flatInstances,
      totalRegions: AWS_REGIONS.length,
      regionsScanned: AWS_REGIONS,
    })
  } catch (error) {
    console.error("[v0] Error scanning all regions:", error)

    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error.message,
          error: error.name,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: "Failed to scan regions" }, { status: 500 })
  }
}
