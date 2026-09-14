process.env.AWS_SDK_LOAD_CONFIG = "0"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import {
  describeInstances,
  startInstance,
  stopInstance,
  terminateInstance,
  describeInstanceStatus,
  releaseAddress,
  describeAddresses,
} from "@/lib/aws-ec2-client"
import { resolveAwsCredentials } from "@/lib/aws-credentials"
import { getSession } from "@/lib/auth/session"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const credentials = await resolveAwsCredentials({
      accessKeyId: searchParams.get("accessKeyId"),
      secretAccessKey: searchParams.get("secretAccessKey"),
      region: searchParams.get("region"),
    })

    if (!credentials) {
      return NextResponse.json({ message: "Missing AWS credentials" }, { status: 400 })
    }

    const { accessKeyId, secretAccessKey, region } = credentials

    const instances = await describeInstances(accessKeyId, secretAccessKey, region)
    return NextResponse.json({ instances })
  } catch (error) {
    console.error("[v0] Error fetching EC2 instances:", error)
    return NextResponse.json({ message: "Failed to fetch EC2 instances" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 })
    }

    const body = await request.json()

    const credentials = await resolveAwsCredentials(body)

    if (!credentials) {
      return NextResponse.json({ message: "Missing AWS credentials" }, { status: 400 })
    }

    const { accessKeyId, secretAccessKey, region } = credentials
    const action = body.action
    const instanceId = body.instanceId

    if (action === "start" && instanceId) {
      await startInstance(accessKeyId, secretAccessKey, region, instanceId)
      return NextResponse.json({ message: "Instance started" })
    }

    if (action === "stop" && instanceId) {
      await stopInstance(accessKeyId, secretAccessKey, region, instanceId)
      return NextResponse.json({ message: "Instance stopped" })
    }

    if (action === "terminate" && instanceId) {
      try {
        const addresses = await describeAddresses(accessKeyId, secretAccessKey, region, instanceId)
        if (addresses.length > 0) {
          console.log(`[v0] Releasing ${addresses.length} Elastic IP(s) before termination`)
          for (const address of addresses) {
            await releaseAddress(accessKeyId, secretAccessKey, region, address.allocationId)
          }
        }
      } catch (error) {
        console.error("[v0] Error releasing Elastic IP:", error)
        // Continue with termination even if IP release fails
      }

      await terminateInstance(accessKeyId, secretAccessKey, region, instanceId)
      return NextResponse.json({ message: "Instance and Elastic IP released" })
    }

    if (action === "reboot" && instanceId) {
      await stopInstance(accessKeyId, secretAccessKey, region, instanceId)

      let isStopped = false
      const maxWaitSeconds = 120
      const startTime = Date.now()

      while (!isStopped && (Date.now() - startTime) / 1000 < maxWaitSeconds) {
        await new Promise((resolve) => setTimeout(resolve, 5000))

        const { state } = await describeInstanceStatus(accessKeyId, secretAccessKey, region, instanceId)

        if (state === "stopped") {
          isStopped = true
          await startInstance(accessKeyId, secretAccessKey, region, instanceId)

          return NextResponse.json({
            message: "Instance reboot initiated - stopped and restarting",
            status: "restarting",
          })
        }
      }

      if (!isStopped) {
        return NextResponse.json({ message: "Reboot timeout - instance did not stop in time" }, { status: 408 })
      }
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error managing EC2 instances:", error)
    return NextResponse.json({ message: "Failed to manage EC2 instances" }, { status: 500 })
  }
}
