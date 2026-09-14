import { type NextRequest, NextResponse } from "next/server"
import { Client } from "ssh2"
import { getSession } from "@/lib/auth/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface SSHExecuteResult {
  stdout: string
  stderr: string
  code: number
}

async function executeSSHCommand(
  host: string,
  privateKey: string,
  command: string,
  username: string = "ubuntu"
): Promise<SSHExecuteResult> {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    let stdout = ""
    let stderr = ""

    conn
      .on("ready", () => {
        console.log("[SSH] Connection established")
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end()
            return reject(err)
          }

          stream
            .on("close", (code: number) => {
              console.log("[SSH] Command completed with code:", code)
              conn.end()
              resolve({ stdout, stderr, code })
            })
            .on("data", (data: Buffer) => {
              const output = data.toString()
              stdout += output
              console.log("[SSH] STDOUT:", output)
            })
            .stderr.on("data", (data: Buffer) => {
              const output = data.toString()
              stderr += output
              console.log("[SSH] STDERR:", output)
            })
        })
      })
      .on("error", (err) => {
        console.error("[SSH] Connection error:", err)
        reject(err)
      })
      .connect({
        host,
        port: 22,
        username,
        privateKey: privateKey,
        readyTimeout: 30000,
        timeout: 30000,
      })
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 })
    }

    const body = await req.json()
    const {
      instanceId,
      publicIp,
      keyName,
      privateKey,
      installDokploy,
      dokployApiKey,
      installDevToolsShell,
      dockerServices,
      githubRepos,
      customScript,
    } = body

    if (!publicIp) {
      return NextResponse.json({ error: "Public IP is required" }, { status: 400 })
    }

    if (!privateKey) {
      return NextResponse.json({ error: "SSH private key is required" }, { status: 400 })
    }

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
      installScript += "# Install Docker if not already installed\n"
      installScript += "if ! command -v docker &> /dev/null; then\n"
      installScript += "  curl -fsSL https://get.docker.com -o get-docker.sh\n"
      installScript += "  sh get-docker.sh\n"
      installScript += "  rm get-docker.sh\n"
      installScript += "fi\n\n"

      installScript += "# Install Docker Compose if not already installed\n"
      installScript += "if ! command -v docker-compose &> /dev/null; then\n"
      installScript += '  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose\n'
      installScript += "  chmod +x /usr/local/bin/docker-compose\n"
      installScript += "fi\n\n"

      installScript += "# Initialize Docker Swarm if not already initialized\n"
      installScript += "if ! docker info | grep -q 'Swarm: active'; then\n"
      installScript += "  docker swarm init\n"
      installScript += "fi\n\n"

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
        installScript += "sleep 30\n"
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

    console.log("[SSH] Generated installation script for instance:", instanceId)
    console.log("[SSH] Installing:", installing.join(", "))
    console.log("[SSH] Connecting to:", publicIp)

    try {
      // Execute the script via SSH
      const result = await executeSSHCommand(publicIp, privateKey, installScript)

      console.log("[SSH] Command execution completed")
      console.log("[SSH] Exit code:", result.code)

      if (result.code === 0) {
        return NextResponse.json({
          success: true,
          installing: installing.join(", "),
          message: "Installation completed successfully via SSH",
          output: result.stdout,
        })
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Installation failed",
            message: `Installation script exited with code ${result.code}`,
            stdout: result.stdout,
            stderr: result.stderr,
          },
          { status: 500 }
        )
      }
    } catch (sshError: any) {
      console.error("[SSH] Execution failed:", sshError)

      return NextResponse.json(
        {
          success: false,
          error: "SSH_CONNECTION_FAILED",
          message: `Failed to connect via SSH: ${sshError.message}`,
          script: installScript,
          installing: installing.join(", "),
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("[SSH] Error installing software:", error)
    return NextResponse.json({ error: error.message || "Failed to install software" }, { status: 500 })
  }
}
