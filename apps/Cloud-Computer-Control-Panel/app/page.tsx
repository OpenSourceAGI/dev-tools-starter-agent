"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Cloud,
  ExternalLink,
  AlertCircle,
  Cpu,
  HardDrive,
  CheckCircle,
  BookOpen,
  BarChart3,
  ShieldCheck,
  LogIn,
} from "lucide-react"
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ThemeDropdown } from "@/components/theme/theme-dropdown"
import { useSession } from "@/lib/auth-client"

export default function HomePage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  // Someone who is already signed in belongs in the dashboard.
  useEffect(() => {
    if (session?.user) {
      router.push("/dashboard")
    }
  }, [session, router])

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header Bar */}
      <div className="w-full border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt="CCCP" className="h-6 w-6" />
            <span className="text-sm font-semibold text-foreground">CCCP</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://docs.appdemo.site/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded-md transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Docs
            </a>
            <a
              href="https://docs.appdemo.site/docs/comparisons/_tool_rank"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded-md transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Tool Rankings
            </a>
            <ThemeDropdown />
            <Button size="sm" onClick={() => router.push("/login")} disabled={isPending}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign in
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 pt-12">
        <div className="w-full max-w-5xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Cloud className="h-10 w-10 text-rose-800" />
            </div>
            <h1 className="text-4xl font-bold text-balance">CCCP Cloud Computer Control Panel</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Open-source cloud infrastructure management with automated Dokploy deployment for seamless container
            orchestration
          </p>
        </div>

        {/* Sign in call to action */}
        <Card className="border-border/50">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Sign in to connect your AWS account</h2>
                <p className="text-sm text-muted-foreground">
                  Create an account, then save your IAM keys once — they are encrypted and stored against your
                  account, so you never paste them again.
                </p>
              </div>
              <Button size="lg" className="px-8 shrink-0" onClick={() => router.push("/login")}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign in / Sign up
              </Button>
            </div>

            <Alert className="bg-green-500/5 border-green-500/20">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Credentials are encrypted at rest</AlertTitle>
              <AlertDescription className="text-sm">
                Your secret access key is sealed with AES-256-GCM before it is written to the database, is
                decrypted only on the server while running a request you asked for, and is never sent back to your
                browser.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Alert className="bg-blue-500/5 border-blue-500/20">
            <Cloud className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-500">What is CCCP Cloud Computer Control Panel?</AlertTitle>
            <AlertDescription className="space-y-2 mt-2 text-sm">
              <p>
                <strong>Cloud Computer Control Panel</strong> lets you manage your own personal cloud and run fully
                self-hosted cloud applications on your own terms. Spin up a full Linux OS accessible via VNC, use
                code-server to run VS Code in the browser, stream games from powerful cloud hardware, and host any
                developer tools or services you rely on.
              </p>
              <p>
                With intuitive controls for starting, stopping, and configuring environments, it gives you the
                flexibility of a major cloud platform while keeping everything under your direct control, in a secure
                and customizable setup.
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="bg-blue-500/5 border-blue-500/20">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-500">What is Dokploy?</AlertTitle>
            <AlertDescription className="space-y-2 mt-2 text-sm">
              <p>
                <strong>Dokploy</strong> is an open-source, self-hostable Platform-as-a-Service (PaaS) that lets you
                deploy any Dockerized application or stack with a web UI, Git integration, and real-time resource
                monitoring.
              </p>
              <p>
                Positioned as an open-source alternative to Vercel, Netlify, and Heroku, Dokploy runs on your own
                infrastructure. It automatically builds and deploys from Git providers (GitHub, GitLab, Bitbucket,
                Gitea) on every push to a configured branch—giving you Vercel-style auto-deploys wired directly to your
                repos.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <Alert className="bg-blue-500/5 border-blue-500/20">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500">Need AWS IAM Credentials?</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p className="text-sm">Follow these guides to create programmatic access credentials:</p>
            <div className="flex flex-col gap-2 mt-2">
              <a
                href="https://www.youtube.com/watch?v=lntWTStctIE"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Video Tutorial: Creating AWS IAM User
              </a>
              <a
                href="https://www.simplified.guide/aws/iam/create-programmatic-access-user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Step-by-Step Guide: AWS IAM Programmatic Access
              </a>
            </div>
          </AlertDescription>
        </Alert>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Automated Dokploy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Instances automatically install Docker and Dokploy for easy container management
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Custom Scripts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Execute custom shell scripts on your instances via SSH for advanced setup
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Full Control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start, stop, terminate, and create snapshots with a single click
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Sections */}
        <div className="space-y-6 border-t pt-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Try the Interface</h2>
            <p className="text-muted-foreground">
              Explore the instance configuration and software setup options (login required to create actual instances)
            </p>
          </div>

          {/* Instance Configuration Demo */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>Instance Configuration</CardTitle>
                  <CardDescription>Configure your EC2 instance with Dokploy</CardDescription>
                </div>
                <Alert className="w-fit">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Login required to create</AlertDescription>
                </Alert>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 opacity-75 pointer-events-none select-none">
              <div className="space-y-2">
                <Label htmlFor="demo-instanceName">Instance Name</Label>
                <Input id="demo-instanceName" placeholder="my-dokploy-server" disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-instanceType">Instance Type</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="t3.small" />
                  </SelectTrigger>
                </Select>
                <div className="flex gap-2 pt-1">
                  <Badge variant="outline" className="text-xs">
                    <Cpu className="h-3 w-3 mr-1" />2 vCPU
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <HardDrive className="h-3 w-3 mr-1" />2 GB RAM
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-storageSize">Storage Size (GB)</Label>
                <Input id="demo-storageSize" type="number" value="40" disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-keyName">SSH Key Pair Name (Optional)</Label>
                <Input id="demo-keyName" placeholder="Leave empty if you don't have a key pair" disabled />
              </div>
            </CardContent>
          </Card>

          {/* Software Setup Demo */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>Software Setup</CardTitle>
                  <CardDescription>Choose what to install on your instance</CardDescription>
                </div>
                <Alert className="w-fit">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Login required to create</AlertDescription>
                </Alert>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 opacity-75 pointer-events-none select-none">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="demo-setupDokploy" checked disabled />
                  <Label htmlFor="demo-setupDokploy">Install Dokploy (Recommended)</Label>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Dokploy will be automatically installed with Docker and Docker Swarm
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="demo-setupDevEnvironment" checked disabled />
                  <Label htmlFor="demo-setupDevEnvironment">Setup Development Environment</Label>
                </div>
                <div className="space-y-2 pl-6">
                  <Label className="text-sm">Select Tools:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["git", "docker", "nodejs", "python3", "nginx"].map((tool) => (
                      <div key={tool} className="flex items-center gap-2">
                        <Checkbox id={`demo-${tool}`} checked={["docker", "git"].includes(tool)} disabled />
                        <Label htmlFor={`demo-${tool}`} className="text-sm">
                          {tool}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="demo-setupDevToolsShell" disabled />
                  <Label htmlFor="demo-setupDevToolsShell">Install Comprehensive Dev Tools Shell</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-customScript">Custom Shell Script / Docker Compose (Optional)</Label>
                <Textarea
                  id="demo-customScript"
                  placeholder="#!/bin/bash&#10;# Add your custom shell commands here"
                  className="font-mono text-sm min-h-[100px]"
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Docker Hub Search Demo */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>Docker Hub Search</CardTitle>
                  <CardDescription>Search and add Docker images to your instance</CardDescription>
                </div>
                <Alert className="w-fit">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Login required to use</AlertDescription>
                </Alert>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 opacity-75 pointer-events-none select-none">
              <div className="space-y-2">
                <Label htmlFor="demo-docker-search">Search Docker Hub</Label>
                <Input
                  id="demo-docker-search"
                  placeholder="Search for Docker images (e.g., nginx, postgres, redis)..."
                  disabled
                />
              </div>
              <div className="grid gap-3">
                {["nginx", "postgres", "redis"].map((image) => (
                  <div key={image} className="flex items-center justify-between p-3 bg-accent/50 rounded-md">
                    <div>
                      <div className="font-semibold">{image}</div>
                      <div className="text-xs text-muted-foreground">Official Docker image</div>
                    </div>
                    <Button size="sm" disabled>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* GitHub Repo Search Demo */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>GitHub Repository Search</CardTitle>
                  <CardDescription>Search and deploy GitHub repositories with Dokploy</CardDescription>
                </div>
                <Alert className="w-fit">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Login required to use</AlertDescription>
                </Alert>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 opacity-75 pointer-events-none select-none">
              <div className="space-y-2">
                <Label htmlFor="demo-github-search">Search GitHub</Label>
                <Input id="demo-github-search" placeholder="Search for repositories..." disabled />
              </div>
              <div className="text-sm text-muted-foreground text-center py-4">Search results will appear here</div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  )
}
