import { useState } from "react";
import { CheckCircle2Icon, Loader2Icon, PlugIcon, XCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVIDERS, callStorage, type DemoSettings, type Provider } from "@/lib/settings";

interface StorageSettingsProps {
  settings: DemoSettings;
  rememberSecret: boolean;
  onChange: (settings: DemoSettings) => void;
  onRememberSecretChange: (remember: boolean) => void;
}

type TestState =
  | { state: "idle" }
  | { state: "testing" }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

/** The provider settings form: pick a provider, enter its bucket and keys, test them. */
export function StorageSettings({ settings, rememberSecret, onChange, onRememberSecretChange }: StorageSettingsProps) {
  const [test, setTest] = useState<TestState>({ state: "idle" });
  const provider = PROVIDERS[settings.provider];

  const update = (field: keyof DemoSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setTest({ state: "idle" });
    onChange({ ...settings, [field]: event.target.value });
  };

  async function testConnection() {
    setTest({ state: "testing" });
    try {
      const { keys, bucket } = await callStorage<{ keys: string[]; bucket: string }>(settings, { action: "list" });
      setTest({ state: "ok", message: `Connected to "${bucket}": ${keys.length} object${keys.length === 1 ? "" : "s"}.` });
    } catch (error) {
      setTest({ state: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage settings</CardTitle>
        <CardDescription>
          Leave a field blank to use the server's <code>{settings.provider.toUpperCase()}_*</code> environment
          variable instead.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="provider">Provider</Label>
          <Select
            value={settings.provider}
            onValueChange={(value) => {
              setTest({ state: "idle" });
              onChange({ ...settings, provider: value as Provider });
            }}
          >
            <SelectTrigger id="provider" className="w-full">
              <SelectValue>{(value: Provider) => PROVIDERS[value]?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROVIDERS) as Provider[]).map((id) => (
                <SelectItem key={id} value={id}>
                  {PROVIDERS[id].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{provider.hint}</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bucket">Bucket</Label>
          <Input id="bucket" value={settings.bucket} onChange={update("bucket")} placeholder="my-bucket" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="access-key">{provider.accessKeyLabel}</Label>
            <Input id="access-key" value={settings.accessKeyId} onChange={update("accessKeyId")} autoComplete="off" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="secret">{provider.secretLabel}</Label>
            <Input
              id="secret"
              type="password"
              value={settings.secretAccessKey}
              onChange={update("secretAccessKey")}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="endpoint">
            Endpoint {provider.endpointRequired ? "" : <span className="text-muted-foreground">(optional)</span>}
          </Label>
          <Input
            id="endpoint"
            value={settings.endpoint}
            onChange={update("endpoint")}
            placeholder={provider.endpointPlaceholder}
          />
        </div>

        {provider.hasRegion && (
          <div className="grid gap-2">
            <Label htmlFor="region">Region</Label>
            <Input id="region" value={settings.region} onChange={update("region")} placeholder="us-east-1" />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={rememberSecret}
            onChange={(event) => onRememberSecretChange(event.target.checked)}
          />
          Remember the secret in this browser
        </label>
      </CardContent>

      <CardFooter className="flex-wrap gap-3">
        <Button onClick={testConnection} disabled={test.state === "testing"}>
          {test.state === "testing" ? <Loader2Icon className="animate-spin" /> : <PlugIcon />}
          Test connection
        </Button>
        {test.state === "ok" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" /> {test.message}
          </span>
        )}
        {test.state === "error" && (
          <span className="flex min-w-0 items-center gap-1.5 text-sm break-all text-destructive">
            <XCircleIcon className="size-4 shrink-0" /> {test.message}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
