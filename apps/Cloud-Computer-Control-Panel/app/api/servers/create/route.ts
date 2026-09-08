process.env.AWS_SDK_LOAD_CONFIG = "0"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { runInstance, allocateAddress, associateAddress, createOrGetDokploySecurityGroup, importKeyPair } from "@/lib/aws-ec2-client"
import { getUbuntuAMI } from "@/lib/aws-ami-ids"
import { generateSSHKeyPair } from "@/lib/ssh-key-utils"
import { resolveAwsCredentials } from "@/lib/aws-credentials"
import { getSession } from "@/lib/auth/session"

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
    const { config } = body

    let securityGroupId: string | undefined
    if (config.setupDokploy) {
      try {
        const { groupId } = await createOrGetDokploySecurityGroup(accessKeyId, secretAccessKey, region)
        securityGroupId = groupId
        console.log("[v0] Using Dokploy security group:", groupId)
      } catch (sgError) {
        console.error("[v0] Failed to create security group:", sgError)
      }
    }

    let dockerComposeContent = ""
    if (config.dockerServices && config.dockerServices.length > 0) {
      dockerComposeContent = "version: '3.8'\\n\\nservices:\\n"
      config.dockerServices.forEach((service: any) => {
        dockerComposeContent += `  ${service.name}:\\n`
        dockerComposeContent += `    image: ${service.image}\\n`
        dockerComposeContent += `    restart: always\\n`
        if (service.ports && service.ports.length > 0) {
          dockerComposeContent += `    ports:\\n`
          service.ports.forEach((port: string) => {
            dockerComposeContent += `      - "${port}"\\n`
          })
        }
        dockerComposeContent += `\\n`
      })
    }

    const userDataScript = `#!/bin/bash
set -e

# Update system
apt-get update && apt-get upgrade -y

${
  config.setupDokploy
    ? `
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Initialize Docker Swarm
docker swarm init

# Install Dokploy
curl -sSL https://dokploy.com/install.sh | sh

${
  config.githubRepos && config.githubRepos.length > 0
    ? `
# Wait for Dokploy to be ready
sleep 30

# Clone GitHub repositories for Dokploy deployment
mkdir -p /root/repos
cd /root/repos

${config.githubRepos
  .map(
    (repo: any, index: number) => `
# Clone ${repo.name}
git clone ${repo.url} repo-${index}
echo "Repository ${repo.name} cloned and ready for Dokploy deployment" >> /var/log/dokploy-repos.log
`,
  )
  .join("\n")}

# Create deployment info file
cat > /root/dokploy-repos.json << 'REPOS_EOF'
${JSON.stringify(config.githubRepos, null, 2)}
REPOS_EOF

${
  config.dokployApiKey && config.dokployApiKey.trim() !== ""
    ? `
# Automated Dokploy deployment via API
echo "Starting automated Dokploy deployment..." >> /var/log/dokploy-repos.log

# Wait for Dokploy to be fully ready
sleep 60

# Get the Dokploy server URL
DOKPLOY_URL="http://localhost:3000"
API_KEY="${config.dokployApiKey}"

${config.githubRepos
  .map(
    (repo: any, index: number) => `
# Deploy ${repo.name} to Dokploy
curl -X POST "$DOKPLOY_URL/api/application.create" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "app-${index}",
    "appName": "${repo.name.split("/")[1] || repo.name}",
    "repositoryUrl": "${repo.url}",
    "branch": "main",
    "buildPath": "/",
    "autoDeploy": true
  }' >> /var/log/dokploy-api-deployment.log 2>&1

echo "Deployed ${repo.name} to Dokploy via API" >> /var/log/dokploy-repos.log
sleep 5
`,
  )
  .join("\n")}

echo "All repositories deployed to Dokploy automatically" >> /var/log/dokploy-repos.log
`
    : `
echo "GitHub repositories cloned successfully. Deploy them manually via Dokploy UI at http://YOUR_IP:3000" >> /var/log/dokploy-repos.log
`
}
`
    : ""
}
`
    : ""
}

${
  config.setupDevEnvironment
    ? `
# Install development tools
${config.devTools.includes("git") ? "apt-get install -y git" : ""}
${config.devTools.includes("nodejs") ? "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs" : ""}
${config.devTools.includes("python3") ? "apt-get install -y python3 python3-pip" : ""}
${config.devTools.includes("nginx") ? "apt-get install -y nginx" : ""}
`
    : ""
}

${
  config.setupDevToolsShell
    ? `
echo "Installing comprehensive dev tools shell..." >> /var/log/setup.log
wget -qO- https://dub.sh/dev.sh | bash -s -- all >> /var/log/dev-tools-install.log 2>&1
echo "Dev tools shell installation completed" >> /var/log/setup.log
`
    : ""
}

${
  dockerComposeContent
    ? `
# Create docker-compose.yml
cat > /root/docker-compose.yml << 'DOCKER_COMPOSE_EOF'
${dockerComposeContent}
DOCKER_COMPOSE_EOF

# Create systemd service to run docker-compose on boot
cat > /etc/systemd/system/docker-compose-app.service << 'SYSTEMD_EOF'
[Unit]
Description=Docker Compose Application Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable docker-compose-app.service
systemctl start docker-compose-app.service
`
    : ""
}

${
  config.customScript && config.customScript.trim() !== ""
    ? `
# Custom user script
${config.customScript}
`
    : ""
}

echo "Setup completed at $(date)" > /var/log/setup-complete.log
`

    // Generate SSH key pair and import to AWS
    console.log("[v0] Generating SSH key pair...")
    const sshKeyPair = generateSSHKeyPair(2048)

    // Create a unique key name based on instance name and timestamp
    const keyName = `${config.instanceName.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`

    console.log("[v0] Importing SSH public key to AWS as:", keyName)
    await importKeyPair(accessKeyId, secretAccessKey, region, keyName, sshKeyPair.publicKey)

    console.log("[v0] Launching instance with SSH key:", keyName)

    const { instanceId: newInstanceId } = await runInstance(accessKeyId, secretAccessKey, region, {
      imageId: getUbuntuAMI(region),
      instanceType: config.instanceType || "t3.small",
      keyName: keyName,
      storageSize: config.storageSize || 40,
      instanceName: config.instanceName,
      userDataScript,
      securityGroupId,
    })

    if (!newInstanceId) {
      throw new Error("Failed to launch instance")
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const { allocationId, publicIp } = await allocateAddress(accessKeyId, secretAccessKey, region)

      if (allocationId && publicIp) {
        await associateAddress(accessKeyId, secretAccessKey, region, allocationId, newInstanceId)

        return NextResponse.json({
          message: "Instance launched successfully with Elastic IP",
          instanceId: newInstanceId,
          elasticIp: publicIp,
          allocationId,
          sshKey: {
            keyName: keyName,
            privateKey: sshKeyPair.privateKey,
            publicKey: sshKeyPair.publicKey,
            fingerprint: sshKeyPair.fingerprint,
          },
        })
      }
    } catch (ipError) {
      console.error("[v0] Failed to allocate Elastic IP:", ipError)
      return NextResponse.json({
        message: "Instance launched but Elastic IP allocation failed",
        instanceId: newInstanceId,
        sshKey: {
          keyName: keyName,
          privateKey: sshKeyPair.privateKey,
          publicKey: sshKeyPair.publicKey,
          fingerprint: sshKeyPair.fingerprint,
        },
      })
    }

    return NextResponse.json({
      message: "Instance launched successfully",
      instanceId: newInstanceId,
      sshKey: {
        keyName: keyName,
        privateKey: sshKeyPair.privateKey,
        publicKey: sshKeyPair.publicKey,
        fingerprint: sshKeyPair.fingerprint,
      },
    })
  } catch (error) {
    console.error("[v0] Error creating server:", error)
    return NextResponse.json(
      {
        message: "Failed to create server",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
