"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { GlobeCdn } from "@/components/ui/cobe-globe-cdn"
import { Rocket, CheckCircle, HardDrive, Cpu, MapPin, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { DockerImageSearch } from "@/components/search/docker-image-search"
import { GitHubRepoSearch } from "@/components/search/github-repo-search"
import { storeSSHKey } from "@/lib/ssh-key-utils"

const INSTANCE_TYPES = [
  { value: "t3.micro", label: "t3.micro", vcpu: 2, ram: 1, cost: 7.59 },
  { value: "t3.small", label: "t3.small", vcpu: 2, ram: 2, cost: 15.18 },
  { value: "t3.medium", label: "t3.medium", vcpu: 2, ram: 4, cost: 30.37 },
  { value: "t3.large", label: "t3.large", vcpu: 2, ram: 8, cost: 60.74 },
  { value: "t3.xlarge", label: "t3.xlarge", vcpu: 4, ram: 16, cost: 121.47 },
]

const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)", city: "Ashburn", coords: [39.0438, -77.4874] as [number, number] },
  { value: "us-east-2", label: "US East (Ohio)", city: "Columbus", coords: [39.9612, -82.9988] as [number, number] },
  { value: "us-west-1", label: "US West (N. California)", city: "San Francisco", coords: [37.7749, -122.4194] as [number, number] },
  { value: "us-west-2", label: "US West (Oregon)", city: "Portland", coords: [45.5152, -122.6784] as [number, number] },
  { value: "ca-central-1", label: "Canada (Central)", city: "Montreal", coords: [45.5017, -73.5673] as [number, number] },
  { value: "eu-central-1", label: "Europe (Frankfurt)", city: "Frankfurt", coords: [50.1109, 8.6821] as [number, number] },
  { value: "eu-west-1", label: "Europe (Ireland)", city: "Dublin", coords: [53.3498, -6.2603] as [number, number] },
  { value: "eu-west-2", label: "Europe (London)", city: "London", coords: [51.5074, -0.1278] as [number, number] },
  { value: "eu-west-3", label: "Europe (Paris)", city: "Paris", coords: [48.8566, 2.3522] as [number, number] },
  { value: "eu-north-1", label: "Europe (Stockholm)", city: "Stockholm", coords: [59.3293, 18.0686] as [number, number] },
  { value: "eu-south-1", label: "Europe (Milan)", city: "Milan", coords: [45.4642, 9.19] as [number, number] },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)", city: "Hong Kong", coords: [22.3193, 114.1694] as [number, number] },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)", city: "Mumbai", coords: [19.076, 72.8777] as [number, number] },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)", city: "Tokyo", coords: [35.6762, 139.6503] as [number, number] },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)", city: "Seoul", coords: [37.5665, 126.978] as [number, number] },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)", city: "Osaka", coords: [34.6937, 135.5023] as [number, number] },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)", city: "Singapore", coords: [1.3521, 103.8198] as [number, number] },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)", city: "Sydney", coords: [-33.8688, 151.2093] as [number, number] },
  { value: "sa-east-1", label: "South America (São Paulo)", city: "São Paulo", coords: [-23.5505, -46.6333] as [number, number] },
  { value: "me-south-1", label: "Middle East (Bahrain)", city: "Manama", coords: [26.0667, 50.5577] as [number, number] },
  { value: "af-south-1", label: "Africa (Cape Town)", city: "Cape Town", coords: [-33.9249, 18.4241] as [number, number] },
]

const AWS_REGION_MARKERS = AWS_REGIONS.map((region) => ({
  id: region.value,
  location: region.coords,
  region: region.city,
}))

const DEV_TOOLS = ["git", "docker", "nodejs", "python3", "nginx"]

export function CreateManager({ credentials, onSuccess }: { credentials: any; onSuccess: () => void }) {
  const { toast } = useToast()
  const [isLaunching, setIsLaunching] = useState(false)
  const [formData, setFormData] = useState({
    instanceName: "",
    region: credentials.region || "us-east-1",
    instanceType: "t3.small",
    storageSize: 40,
    keyName: "",
    allowedPorts: [22, 80, 443, 3000],
    setupDokploy: true,
    setupDevEnvironment: true,
    setupDevToolsShell: false,
    devTools: ["docker", "git"],
    customScript: "",
    dockerServices: [] as Array<{ name: string; image: string; ports?: string[] }>,
    githubRepos: [] as Array<{ url: string; name: string }>,
    dokployApiKey: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLaunching(true)

    const sanitizedKeyName = formData.keyName && formData.keyName.trim() !== "" ? formData.keyName : ""

    const sanitizedConfig = {
      ...formData,
      keyName: sanitizedKeyName,
      createdAt: new Date().toISOString(),
    }

    const newManager = {
      managerId: `mgr-${Date.now()}`,
      config: sanitizedConfig,
      status: {
        state: "launching",
        instanceId: null,
      },
      costEstimate: calculateCost(),
    }

    // Save the manager config to localStorage first
    const existing = localStorage.getItem("ec2Managers")
    const managers = existing ? JSON.parse(existing) : []
    managers.push(newManager)
    localStorage.setItem("ec2Managers", JSON.stringify(managers))

    try {
      // Launch the instance immediately
      const response = await fetch("/api/servers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          region: sanitizedConfig.region || credentials.region,
          config: sanitizedConfig,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const result = await response.json()

      // Store SSH key if provided
      if (result.sshKey) {
        storeSSHKey(result.sshKey.keyName, {
          privateKey: result.sshKey.privateKey,
          publicKey: result.sshKey.publicKey,
          fingerprint: result.sshKey.fingerprint,
        })
      }

      // Update the manager with the launched instance details
      const updatedManagers = managers.map((mgr: any) =>
        mgr.managerId === newManager.managerId
          ? {
              ...mgr,
              config: {
                ...sanitizedConfig,
                keyName: result.sshKey?.keyName || sanitizedConfig.keyName,
              },
              status: {
                state: "pending",
                instanceId: result.instanceId,
                publicIp: result.elasticIp,
                allocationId: result.allocationId,
              },
            }
          : mgr
      )
      localStorage.setItem("ec2Managers", JSON.stringify(updatedManagers))

      toast({
        title: "Instance Launched Successfully!",
        description: `${formData.instanceName} is now starting with IP ${result.elasticIp || "pending"}`,
      })

      // Only call onSuccess after successful launch
      onSuccess()
    } catch (error) {
      console.error("Launch error:", error)

      // Update manager status to failed
      const updatedManagers = managers.map((mgr: any) =>
        mgr.managerId === newManager.managerId
          ? {
              ...mgr,
              status: {
                state: "launch-failed",
                instanceId: null,
              },
            }
          : mgr
      )
      localStorage.setItem("ec2Managers", JSON.stringify(updatedManagers))

      toast({
        title: "Launch Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLaunching(false)
    }
  }

  const calculateCost = () => {
    const instance = INSTANCE_TYPES.find((t) => t.value === formData.instanceType)
    const instanceCost = instance?.cost || 0
    const storageCost = formData.storageSize * 0.1 // $0.10 per GB/month
    const total = instanceCost + storageCost

    return {
      estimatedMonthlyCost: {
        instance: instanceCost,
        storage: storageCost,
        total,
      },
    }
  }

  const toggleDevTool = (tool: string) => {
    setFormData((prev) => ({
      ...prev,
      devTools: prev.devTools.includes(tool) ? prev.devTools.filter((t) => t !== tool) : [...prev.devTools, tool],
    }))
  }

  const handleDockerImageSelect = (dockerCommand: string) => {
    setFormData((prev) => ({
      ...prev,
      customScript: prev.customScript ? `${prev.customScript}\n${dockerCommand}` : dockerCommand,
    }))
    toast({
      title: "Docker Image Added",
      description: "The image has been added to your docker-compose configuration",
    })
  }

  const handleUpdateDockerServices = (services: Array<{ name: string; image: string; ports?: string[] }>) => {
    setFormData((prev) => ({ ...prev, dockerServices: services }))
  }

  const removeDockerService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      dockerServices: prev.dockerServices.filter((_, i) => i !== index),
    }))
  }

  const handleGitHubRepoSelect = (repoUrl: string, repoName: string) => {
    setFormData((prev) => ({
      ...prev,
      githubRepos: [...prev.githubRepos, { url: repoUrl, name: repoName }],
    }))
  }

  const removeGitHubRepo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      githubRepos: prev.githubRepos.filter((_, i) => i !== index),
    }))
  }

  const generateDockerCompose = () => {
    if (formData.dockerServices.length === 0) return ""

    let compose = "version: '3.8'\n\nservices:\n"

    formData.dockerServices.forEach((service) => {
      compose += `  ${service.name}:\n`
      compose += `    image: ${service.image}\n`
      compose += `    restart: always\n`
      if (service.ports && service.ports.length > 0) {
        compose += `    ports:\n`
        service.ports.forEach((port) => {
          compose += `      - "${port}"\n`
        })
      }
      compose += `\n`
    })

    return compose
  }

  const selectedInstance = INSTANCE_TYPES.find((t) => t.value === formData.instanceType)
  const cost = calculateCost()

  return (
    <form onSubmit={handleSubmit}>
      {isLaunching && (
        <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Launching your instance...</strong>
            <br />
            This may take a few minutes. Please wait while we set up your EC2 instance with Dokploy.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Instance Configuration</CardTitle>
            <CardDescription>Configure your EC2 instance with Dokploy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">Instance Name</Label>
              <Input
                id="instanceName"
                value={formData.instanceName}
                onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                placeholder="my-dokploy-server"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger id="region">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AWS_REGIONS.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <GlobeCdn
                  markers={AWS_REGION_MARKERS}
                  arcs={[]}
                  className="w-16 shrink-0"
                  speed={0.004}
                />
              </div>
              <div className="flex items-center gap-1 pt-1">
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {formData.region}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceType">Instance Type</Label>
              <Select
                value={formData.instanceType}
                onValueChange={(value) => setFormData({ ...formData, instanceType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.vcpu} vCPU, {type.ram} GB RAM
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInstance && (
                <div className="flex gap-2 pt-1">
                  <Badge variant="outline" className="text-xs">
                    <Cpu className="h-3 w-3 mr-1" />
                    {selectedInstance.vcpu} vCPU
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <HardDrive className="h-3 w-3 mr-1" />
                    {selectedInstance.ram} GB RAM
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="storageSize">Storage Size</Label>
                <span className="text-sm font-medium">{formData.storageSize} GB</span>
              </div>
              <Slider
                id="storageSize"
                min={20}
                max={200}
                step={10}
                value={[formData.storageSize]}
                onValueChange={([value]) => setFormData({ ...formData, storageSize: value })}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>20 GB</span>
                <span>200 GB</span>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                SSH key pairs will be automatically generated and saved securely when you launch the instance
              </AlertDescription>
            </Alert>

            {/* Cost Estimate */}
            <div className="border-t pt-4 mt-4">
              <div className="text-sm font-medium mb-3">Cost Estimate</div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Instance</div>
                  <div className="text-lg font-bold">${cost.estimatedMonthlyCost.instance.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Storage ({formData.storageSize}GB)</div>
                  <div className="text-lg font-bold">${cost.estimatedMonthlyCost.storage.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Monthly</div>
                  <div className="text-lg font-bold text-blue-500">${cost.estimatedMonthlyCost.total.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="submit" size="lg" className="w-full" disabled={isLaunching}>
              {isLaunching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Launching Instance...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Launch Instance
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Software Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Software Setup</CardTitle>
            <CardDescription>Choose what to install on your instance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="setupDokploy"
                  checked={formData.setupDokploy}
                  onCheckedChange={(checked) => setFormData({ ...formData, setupDokploy: checked as boolean })}
                />
                <Label htmlFor="setupDokploy" className="cursor-pointer">
                  Install Dokploy (Recommended)
                </Label>
              </div>
              {formData.setupDokploy && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Dokploy will be automatically installed with Docker and Docker Swarm
                  </AlertDescription>
                </Alert>
              )}
              {formData.setupDokploy && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="dokployApiKey">Dokploy API Key (Optional)</Label>
                  <Input
                    id="dokployApiKey"
                    type="password"
                    value={formData.dokployApiKey}
                    onChange={(e) => setFormData({ ...formData, dokployApiKey: e.target.value })}
                    placeholder="Enter your Dokploy API key for automated deployment"
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, GitHub repos will be automatically deployed to Dokploy via API
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="setupDevEnvironment"
                  checked={formData.setupDevEnvironment}
                  onCheckedChange={(checked) => setFormData({ ...formData, setupDevEnvironment: checked as boolean })}
                />
                <Label htmlFor="setupDevEnvironment" className="cursor-pointer">
                  Setup Development Environment
                </Label>
              </div>

              {formData.setupDevEnvironment && (
                <div className="space-y-2 pl-6">
                  <Label className="text-sm">Select Tools:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEV_TOOLS.map((tool) => (
                      <div key={tool} className="flex items-center gap-2">
                        <Checkbox
                          id={tool}
                          checked={formData.devTools.includes(tool)}
                          onCheckedChange={() => toggleDevTool(tool)}
                        />
                        <Label htmlFor={tool} className="cursor-pointer text-sm">
                          {tool}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive Dev Tools Shell Setup */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="setupDevToolsShell"
                  checked={formData.setupDevToolsShell}
                  onCheckedChange={(checked) => setFormData({ ...formData, setupDevToolsShell: checked as boolean })}
                />
                <Label htmlFor="setupDevToolsShell" className="cursor-pointer">
                  Install Comprehensive Dev Tools Shell
                </Label>
              </div>
              {formData.setupDevToolsShell && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Installs: Fish Shell, Neovim, Nushell, Bun, Node (via Volta), Helix, Starship prompt, Git, Docker,
                    and more. Includes aliases for service management, killport, and search.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Custom Script Textarea */}
            <div className="space-y-2">
              <Label htmlFor="customScript">Custom Shell Script / Docker Compose (Optional)</Label>
              <Textarea
                id="customScript"
                value={formData.customScript}
                onChange={(e) => setFormData({ ...formData, customScript: e.target.value })}
                placeholder="#!/bin/bash&#10;# Add your custom shell commands here&#10;# Or paste a Docker Compose file"
                className="font-mono text-sm min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                This script will run after the automated setup. Use for custom configurations or Docker Compose files.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Docker Hub Search Component */}
        <Card className="md:col-span-2">
          <DockerImageSearch
            onSelect={handleDockerImageSelect}
            dockerServices={formData.dockerServices}
            onUpdateServices={handleUpdateDockerServices}
          />
        </Card>

        {/* GitHub Repository Search Component */}
        <Card className="md:col-span-2">
          <GitHubRepoSearch onSelect={handleGitHubRepoSelect} selectedRepos={formData.githubRepos} />
        </Card>

        {/* Selected GitHub Repos Display */}
        {formData.githubRepos.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Selected Repositories for Dokploy Deployment</CardTitle>
              <CardDescription>These repositories will be configured for deployment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {formData.githubRepos.map((repo, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-md">
                  <div className="flex-1">
                    <div className="font-semibold text-sm font-mono">{repo.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{repo.url}</div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeGitHubRepo(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Docker Compose Services Display */}
        {formData.dockerServices.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Docker Compose Services</CardTitle>
              <CardDescription>These services will run on boot via systemd</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.dockerServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-md">
                  <div className="flex-1">
                    <div className="font-semibold font-mono text-sm">{service.name}</div>
                    <div className="text-xs text-muted-foreground">{service.image}</div>
                    {service.ports && service.ports.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">Ports: {service.ports.join(", ")}</div>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDockerService(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <div className="mt-4">
                <Label>Generated docker-compose.yml:</Label>
                <Textarea value={generateDockerCompose()} readOnly className="font-mono text-xs mt-2 min-h-[200px]" />
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </form>
  )
}
