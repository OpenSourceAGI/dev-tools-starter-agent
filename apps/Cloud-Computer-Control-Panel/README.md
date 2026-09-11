<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/apps/Cloud-Computer-Control-Panel"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/apps/Cloud-Computer-Control-Panel"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
</p>
<!-- template-git-repo:badges:end -->

![code2cloud](https://i.imgur.com/t6WlnCI.png)

# Cloud Computer Control Panel

An open-source cloud infrastructure management platform with automated [Dokploy](https://dokploy.com/) deployment for seamless container orchestration on AWS EC2.

TODO: add https://github.com/Dokploy/mcp

## Overview

CCCP (Cloud Computer Control Panel) lets you manage your own personal cloud and run fully self-hosted cloud applications on your own terms. Spin up a full Linux OS, deploy Docker containers, host developer tools, and maintain complete control over your cloud infrastructure.

### What is Dokploy?

**Dokploy** is an open-source, self-hostable Platform-as-a-Service (PaaS) that lets you deploy any Dockerized application or stack with a web UI, Git integration, and real-time resource monitoring. Positioned as an open-source alternative to Vercel, Netlify, and Heroku, Dokploy runs on your own infrastructure and automatically builds and deploys from Git providers (GitHub, GitLab, Bitbucket, Gitea) on every push to a configured branch.

## Features

- **Automated Dokploy Installation**: Instances automatically install Docker, Docker Swarm, and Dokploy for easy container management
- **AWS EC2 Management**: Create, start, stop, terminate, and snapshot EC2 instances with a single click
- **Custom Scripts**: Execute custom shell scripts on your instances via SSH for advanced setup
- **Docker Hub Integration**: Search and deploy Docker images directly from Docker Hub
- **GitHub Integration**: Search and deploy GitHub repositories with Dokploy
- **Development Environment Setup**: Automatically install git, docker, nodejs, python3, nginx, and more
- **Cost Estimator**: Calculate estimated monthly costs before creating instances
- **Real-time Monitoring**: Track instance status and health in real-time
- **Accounts & Sign-in**: Email + password out of the box, plus optional Google OAuth and magic links, powered by [Better Auth](https://better-auth.com)
- **Encrypted Credential Storage**: AWS keys are sealed with AES-256-GCM and stored per user in a libSQL/SQLite database — the secret key is never sent back to the browser
- **Multi-tenant**: Every user drives their own AWS account; API routes resolve credentials server-side from the signed-in session
- **API Documentation**: Built-in Scalar API reference for programmatic access
- **VS Code Extension**: The same dashboard runs in the editor sidebar via [`apps/cccp-vscode-ext`](../cccp-vscode-ext/), which imports these components directly rather than reimplementing them

## Tech Stack

This app is built on the [`template-vinext-betterauth-shadcn-themes-teams-stripe`](../../starter-templates/template-vinext-betterauth-shadcn-themes-teams-stripe)
starter template, which supplies the auth, database and theming layers.

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS, shadcn/ui, [shadcn-theme-menu](https://github.com/vtempest/GRAB-URL/tree/master/packages/shadcn-theme-menu)
- **Design tokens**: `app/theme-tokens.css`, kept separate from `app/globals.css` so the VS Code extension can import the palette without re-importing Tailwind
- **Auth**: Better Auth (email + password, Google OAuth, magic links, anonymous dev login)
- **Database**: Drizzle ORM over libSQL — a local SQLite file by default, or Turso in production
- **AWS Integration**: AWS SDK for JavaScript (EC2, SSM, credentials)
- **Form Handling**: Zod validation
- **Deployment**: Vercel Analytics, Next Themes for dark mode

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- AWS Account with IAM credentials (Access Key ID + Secret Access Key)
- Required AWS IAM permissions for EC2 operations:
  - `ec2:DescribeInstances`
  - `ec2:RunInstances`
  - `ec2:StartInstances`
  - `ec2:StopInstances`
  - `ec2:TerminateInstances`
  - `ec2:CreateSnapshot`
  - `ec2:DescribeRegions`
  - `ec2:DescribeAvailabilityZones`

### Creating AWS IAM Credentials

Follow these guides to create programmatic access credentials:

- [Video Tutorial: Creating AWS IAM User](https://www.youtube.com/watch?v=lntWTStctIE)
- [Step-by-Step Guide: AWS IAM Programmatic Access](https://www.simplified.guide/aws/iam/create-programmatic-access-user)

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/aws-manager.git
cd aws-manager
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Configure the environment:

```bash
cp .env.example .env
# BETTER_AUTH_SECRET is required — it signs sessions and, unless you set
# CREDENTIALS_ENCRYPTION_KEY separately, encrypts stored AWS secret keys.
openssl rand -base64 32
```

4. Create the database schema:

```bash
npm run db:push       # applies lib/db/schema.ts to DATABASE_URL
npm run db:studio     # optional: browse the data
```

With `DATABASE_URL` unset, the app uses a local SQLite file at `./data/cccp.db`.
For a hosted database, run `npm create cloud-db` (or point `DATABASE_URL` /
`DATABASE_AUTH_TOKEN` at a Turso database).

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. Click **Sign in** and create an account with an email and password
   (or configure `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Google sign-in)
2. In the dashboard, enter your AWS Access Key ID and Secret Access Key
3. CCCP verifies them against AWS, encrypts the secret, and stores it against your account

### How credentials are stored

- The secret access key is encrypted with AES-256-GCM (`lib/crypto.ts`) before it
  reaches the `cloud_credentials` table, keyed by `CREDENTIALS_ENCRYPTION_KEY`
  (falling back to `BETTER_AUTH_SECRET`).
- The browser only ever receives a masked access key id — never the secret.
- API routes send the sentinel `"db"` instead of real keys;
  `lib/aws-credentials.ts` resolves the actual credentials server-side in this
  order: keys explicitly sent with the request → the signed-in user's stored
  keys → the server's `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
- Rotating `CREDENTIALS_ENCRYPTION_KEY` makes existing stored secrets
  unreadable; users have to re-enter them.

> **Note:** instance metadata (`ec2Managers`) and generated SSH private keys are
> still kept in the browser's `localStorage`. Only cloud provider credentials
> have been moved into the database so far.

## Usage

### Creating an Instance

1. Navigate to the "Create New" tab in the dashboard
2. Configure your instance:
   - **Instance Name**: Choose a descriptive name
   - **Instance Type**: Select from t2.micro, t3.small, t3.medium, etc.
   - **Storage Size**: Specify EBS volume size in GB (default: 40GB)
   - **SSH Key Pair**: Optional, for SSH access
   - **Region**: Select AWS region (default: us-east-1)

3. Choose software to install:
   - **Install Dokploy**: Automatically installs Docker, Docker Swarm, and Dokploy
   - **Development Environment**: Select tools like git, docker, nodejs, python3, nginx
   - **Custom Shell Script**: Add your own bash scripts or docker-compose files

4. Click "Create Instance" and wait for provisioning

### Managing Instances

From the "Managers" tab:

- **Start/Stop**: Control instance power state
- **Terminate**: Permanently delete the instance
- **Create Snapshot**: Backup instance EBS volumes
- **View Details**: Monitor instance status, IP address, and connection info
- **Add Software**: Install additional tools post-creation
- **Access Dokploy**: One-click access to Dokploy dashboard (port 3000)

![CCCP Banner](https://i.imgur.com/gnjJNSJ.png)

### API Reference

Access the interactive API documentation at `/api-reference` or click the "API Docs" button in the dashboard.

Available endpoints:

All `/api/instances`, `/api/managers` and `/api/servers` routes require a signed-in session.

- `GET /api/credentials` - The signed-in user's stored credentials (masked)
- `POST /api/credentials` - Verify and store AWS credentials, encrypted
- `DELETE /api/credentials` - Forget the stored credentials
- `GET|POST /api/auth/*` - Better Auth endpoints (sign-in, sign-up, sign-out, OAuth)
- `GET /api/instances` - List all instances in a region
- `GET /api/instances/all-regions` - List instances across all regions
- `POST /api/instances/install-software` - Install software on an instance
- `POST /api/servers/create` - Create a new EC2 instance
- `GET /api/check-credentials` - Report session and credential status
- `GET /api/docker-search` - Search Docker Hub
- `GET /api/github-search` - Search GitHub repositories
