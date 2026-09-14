import { type NextRequest, NextResponse } from "next/server"
import { createEC2Client } from "@/lib/aws-ec2-client"
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
    const {
      instanceId,
      region,
      installDokploy,
      dokployApiKey,
      installDevToolsShell,
      dockerServices,
      githubRepos,
      customScript,
    } = body

    // Real keys sent by the browser, else the signed-in user's stored keys, else the server's
    const credentials = await resolveAwsCredentialsFromHeaders(req.headers, region)

    if (!credentials) {
      return NextResponse.json({ error: "AWS credentials not provided" }, { status: 401 })
    }

    const { accessKeyId, secretAccessKey } = credentials
    const ec2 = createEC2Client(accessKeyId, secretAccessKey, region)
    const ssm = createSSMClient(accessKeyId, secretAccessKey, region)

    // Build installation description for display
    const installing: string[] = []
    if (installDokploy) installing.push("Dokploy")
    if (installDevToolsShell) installing.push("Dev Tools Shell")
    if (dockerServices?.length > 0) installing.push(`${dockerServices.length} Docker service(s)`)
    if (githubRepos?.length > 0) installing.push(`${githubRepos.length} GitHub repo(s)`)
    if (customScript?.trim()) installing.push("Custom script")

    // Build the installation script
    let installScript = "#!/bin/bash\n\n"
    installScript += "set -e\n\n"
    installScript += "echo 'Starting software installation...'\n\n"

    // Install Dokploy
    if (installDokploy) {
      installScript += "# Install Dokploy\n"
      installScript += "curl -sSL https://dokploy.com/install.sh | sh\n\n"
    }

    if (installDevToolsShell) {
      installScript += "# Install comprehensive dev tools shell\n"
      installScript += "echo 'Installing Fish, Neovim, Nushell, Bun, Node, Helix, Starship, and more...'\n"
      installScript += "wget -qO- https://dub.sh/dev.sh | bash -s -- all\n"
      installScript += "echo 'Dev tools shell installation completed'\n\n"
    }

    // Setup Docker Compose for new services
    if (dockerServices && dockerServices.length > 0) {
      installScript += "# Setup Docker Compose\n"
      installScript += "cd /root\n"
      installScript += "cat > docker-compose-addon.yml << 'EOFCOMPOSE'\n"
      installScript += "version: '3.8'\n"
      installScript += "services:\n"

      dockerServices.forEach((service: any) => {
        installScript += `  ${service.name}:\n`
        installScript += `    image: ${service.image}\n`
        installScript += `    restart: unless-stopped\n`
        if (service.ports && service.ports.length > 0) {
          installScript += `    ports:\n`
          service.ports.forEach((port: string) => {
            installScript += `      - "${port}"\n`
          })
        }
        installScript += "\n"
      })

      installScript += "EOFCOMPOSE\n\n"
      installScript += "docker-compose -f docker-compose-addon.yml up -d\n\n"
    }

    // Clone and deploy GitHub repos
    if (githubRepos && githubRepos.length > 0) {
      installScript += "# Clone GitHub repositories\n"
      installScript += "mkdir -p /root/repos\n"
      installScript += "cd /root/repos\n\n"

      githubRepos.forEach((repo: any) => {
        const repoName = repo.name.split("/").pop()
        installScript += `git clone ${repo.url} ${repoName}\n`
      })

      if (installDokploy && dokployApiKey) {
        installScript += "\n# Deploy to Dokploy via API\n"
        githubRepos.forEach((repo: any) => {
          installScript += `echo "Deploying ${repo.name} to Dokploy..."\n`
          installScript += `# You can add Dokploy API calls here when available\n`
        })
      }

      installScript += "\n"
    }

    // Add custom script
    if (customScript && customScript.trim()) {
      installScript += "# Custom script\n"
      installScript += customScript + "\n\n"
    }

    installScript += "echo 'Software installation completed!'\n"

    console.log("[v0] Generated installation script for instance:", instanceId)
    console.log("[v0] Installing:", installing.join(", "))

    try {
      // Execute the script via SSM Run Command
      const { commandId } = await ssm.sendCommand([instanceId], [installScript])

      console.log("[v0] SSM Command initiated:", commandId)

      return NextResponse.json({
        success: true,
        commandId,
        installing: installing.join(", "),
        message: "Installation started successfully via SSM",
      })
    } catch (ssmError: any) {
      console.error("[v0] SSM execution failed:", ssmError)

      // If SSM fails, return the script for manual execution
      if (
        ssmError.message?.includes("InvalidInstanceId") ||
        ssmError.message?.includes("InstanceNotConnected") ||
        ssmError.message?.includes("UnsupportedPlatformType")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "SSM_NOT_AVAILABLE",
            message:
              "Instance doesn't have SSM agent installed or lacks required IAM role. Install SSM agent and add AmazonSSMManagedInstanceCore policy to the instance role.",
            script: installScript,
            installing: installing.join(", "),
          },
          { status: 400 },
        )
      }

      throw ssmError
    }
  } catch (error: any) {
    console.error("[v0] Error installing software:", error)
    return NextResponse.json({ error: error.message || "Failed to install software" }, { status: 500 })
  }
}
