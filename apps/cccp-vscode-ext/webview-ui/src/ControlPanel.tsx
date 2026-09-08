import { useCallback, useEffect, useState } from "react";
import { Activity, BookOpen, ExternalLink, KeyRound, Loader2, Plus, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManagerList } from "@/components/dashboard/manager-list";
import { CreateManager } from "@/components/instance/create-manager";
import { CredentialsSettings, type StoredCredentials } from "@/components/dashboard/credentials-settings";
import { DB_CREDENTIALS, DEFAULT_AWS_REGION } from "@/lib/constants";
import { openExternal } from "./bridge";
import type { AuthState } from "./protocol";

/** Mirrors the web dashboard: the real keys stay in CCCP's database, and the
 *  panel only ever carries this sentinel plus the chosen region. */
const dbCredentials = (region: string) => ({
  accessKeyId: DB_CREDENTIALS,
  secretAccessKey: DB_CREDENTIALS,
  region,
});

/**
 * The CCCP dashboard, laid out for a sidebar.
 *
 * The instance list, the create-instance form and the credentials form are the
 * Next.js app's own components, imported unchanged from
 * `apps/Cloud-Computer-Control-Panel` -- only the shell around them differs, and
 * the `/api/...` calls they make are routed to the configured deployment by
 * `bridge.ts`. The web page's own header (theme menu, user menu, API docs
 * button) is dropped here because VS Code supplies those affordances: the view's
 * title menu carries the server, browser and sign-out actions, and the panel
 * follows the editor's light/dark theme.
 */
export function ControlPanel({ auth }: { auth: AuthState }) {
  const [stored, setStored] = useState<StoredCredentials | null>(null);
  const [hasServerCredentials, setHasServerCredentials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("managers");
  const [showSettings, setShowSettings] = useState(false);

  const loadCredentials = useCallback(async () => {
    try {
      const response = await fetch("/api/credentials");

      // A 401 is handled by the extension host, which pushes a fresh auth state
      // and swaps this panel back to the sign-in view.
      if (response.status === 401) return;

      const data = await response.json();
      setStored(data.credentials ?? null);
      setHasServerCredentials(Boolean(data.hasServerCredentials));
    } catch (error) {
      console.error("Failed to load credentials:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const region = stored?.region || DEFAULT_AWS_REGION;
  const credentials = dbCredentials(region);
  const hasCredentials = Boolean(stored) || hasServerCredentials;

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">Cloud Control Panel</h1>
          <p className="truncate text-xs text-muted-foreground">
            {auth.user?.email ?? auth.serverUrl}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="API reference"
            onClick={() => openExternal(`${auth.serverUrl}/api-reference`)}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={showSettings ? "Hide AWS credentials" : "AWS credentials"}
            onClick={() => setShowSettings((open) => !open)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading your credentials…
          </div>
        ) : (
          <>
            {(showSettings || !hasCredentials) && (
              <CredentialsSettings
                stored={stored}
                hasServerCredentials={hasServerCredentials}
                onSaved={async () => {
                  await loadCredentials();
                  setShowSettings(false);
                }}
                onClose={hasCredentials ? () => setShowSettings(false) : undefined}
              />
            )}

            {!hasCredentials ? (
              <Alert className="border-blue-500/20 bg-blue-500/5">
                <KeyRound className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-500">Connect an AWS account</AlertTitle>
                <AlertDescription className="text-xs">
                  Save your IAM access key above. It is encrypted before it is written to CCCP's
                  database and never sent back to this panel.
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="managers">
                    <Activity className="mr-1.5 h-3.5 w-3.5" />
                    Instances
                  </TabsTrigger>
                  <TabsTrigger value="create">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="managers">
                  <ManagerList credentials={credentials} />
                </TabsContent>

                <TabsContent value="create">
                  <CreateManager credentials={credentials} onSuccess={() => setActiveTab("managers")} />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border/50 px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => openExternal(`${auth.serverUrl}/dashboard`)}
        >
          <ExternalLink className="h-3 w-3" />
          Open the full dashboard
        </button>
      </footer>
    </div>
  );
}
