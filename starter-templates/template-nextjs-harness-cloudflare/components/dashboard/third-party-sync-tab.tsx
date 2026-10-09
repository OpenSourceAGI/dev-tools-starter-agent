"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { RefreshCw, CheckCircle2 } from "lucide-react"

export function ThirdPartySyncTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Third-Party Integrations</CardTitle>
          <CardDescription>Connect and sync data with external services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slack Integration */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Slack</Label>
              <p className="text-sm text-muted-foreground">Receive notifications in your Slack workspace</p>
            </div>
            <Switch />
          </div>

          {/* GitHub Integration */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>GitHub</Label>
              <p className="text-sm text-muted-foreground">Sync with your GitHub repositories</p>
            </div>
            <Switch />
          </div>

          {/* Discord Integration */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Discord</Label>
              <p className="text-sm text-muted-foreground">Send alerts to Discord channels</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>Last synchronization status for connected services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm">All services synced</span>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
