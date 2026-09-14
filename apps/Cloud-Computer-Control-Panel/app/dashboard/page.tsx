"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Plus, Server, Activity, Settings, BookOpen, KeyRound, Loader2 } from "lucide-react"
import { ManagerList } from "@/components/dashboard/manager-list"
import { CreateManager } from "@/components/instance/create-manager"
import { CredentialsSettings, type StoredCredentials } from "@/components/dashboard/credentials-settings"
import { UserMenu } from "@/components/auth/user-menu"
import { ThemeDropdown } from "@/components/theme/theme-dropdown"
import { DB_CREDENTIALS, DEFAULT_AWS_REGION } from "@/lib/constants"

/** What child components pass to the API. The real keys stay in the database —
 *  the browser only ever holds this sentinel plus the chosen region. */
const dbCredentials = (region: string) => ({
  accessKeyId: DB_CREDENTIALS,
  secretAccessKey: DB_CREDENTIALS,
  region,
})

export default function DashboardPage() {
  const router = useRouter()
  const [stored, setStored] = useState<StoredCredentials | null>(null)
  const [hasServerCredentials, setHasServerCredentials] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("managers")
  const [showSettings, setShowSettings] = useState(false)

  const loadCredentials = useCallback(async () => {
    try {
      const response = await fetch("/api/credentials")

      if (response.status === 401) {
        router.push("/login")
        return
      }

      const data = await response.json()
      setStored(data.credentials ?? null)
      setHasServerCredentials(Boolean(data.hasServerCredentials))
    } catch (err) {
      console.error("Failed to load credentials:", err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadCredentials()
  }, [loadCredentials])

  const region = stored?.region || DEFAULT_AWS_REGION
  const credentials = dbCredentials(region)
  const hasCredentials = Boolean(stored) || hasServerCredentials

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/apple-touch-icon.png" alt="CCCP" className="h-10 w-10 rounded-lg" />
              <div>
                <h1 className="text-2xl font-bold">CCCP Cloud Computer Control Panel</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your own personal cloud with fully self-hosted cloud applications using Dokploy
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api-reference", "_blank")}
                className="hidden md:flex"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                API Docs
              </Button>
              <ThemeDropdown />
              <Button variant="outline" size="icon" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="h-4 w-4" />
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Loading your credentials…
          </div>
        ) : (
          <div className="space-y-6">
            {(showSettings || !hasCredentials) && (
              <CredentialsSettings
                stored={stored}
                hasServerCredentials={hasServerCredentials}
                onSaved={async () => {
                  await loadCredentials()
                  setShowSettings(false)
                }}
                onClose={hasCredentials ? () => setShowSettings(false) : undefined}
              />
            )}

            {!hasCredentials ? (
              <Alert className="bg-blue-500/5 border-blue-500/20">
                <KeyRound className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-500">Connect an AWS account to get started</AlertTitle>
                <AlertDescription className="text-sm">
                  Save your IAM access key above. It is encrypted before it is written to the database and never
                  sent back to your browser.
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="managers">
                    <Activity className="h-4 w-4 mr-2" />
                    Managers
                  </TabsTrigger>
                  <TabsTrigger value="create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="managers" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        EC2 Instance Managers
                      </CardTitle>
                      <CardDescription>
                        Manage your EC2 instances with automated Dokploy installation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ManagerList credentials={credentials} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="create" className="space-y-6">
                  <CreateManager credentials={credentials} onSuccess={() => setActiveTab("managers")} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
