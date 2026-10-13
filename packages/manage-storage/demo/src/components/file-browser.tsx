import { useState } from "react";
import { DownloadIcon, FileIcon, Loader2Icon, RefreshCwIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PROVIDERS, callStorage, type DemoSettings } from "@/lib/settings";

/** List, upload, read and delete objects in the configured bucket. */
export function FileBrowser({ settings }: { settings: DemoSettings }) {
  const [keys, setKeys] = useState<string[] | null>(null);
  const [prefix, setPrefix] = useState("");
  const [key, setKey] = useState("hello.txt");
  const [body, setBody] = useState("Hello from manage-storage!");
  const [preview, setPreview] = useState<{ key: string; content: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(label: string, task: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    setError(null);
    try {
      return await task();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(null);
    }
  }

  const refresh = () =>
    run("list", async () => {
      const result = await callStorage<{ keys: string[] }>(settings, { action: "list", prefix });
      setKeys(result.keys);
    });

  const upload = () =>
    run("upload", async () => {
      await callStorage(settings, { action: "upload", key, body, contentType: "text/plain" });
      await callStorage<{ keys: string[] }>(settings, { action: "list", prefix }).then((r) => setKeys(r.keys));
    });

  const download = (target: string) =>
    run(`download:${target}`, async () => {
      const { content } = await callStorage<{ content: string }>(settings, { action: "download", key: target });
      setPreview({ key: target, content });
    });

  const remove = (target: string) =>
    run(`delete:${target}`, async () => {
      await callStorage(settings, { action: "delete", key: target });
      setKeys((current) => current?.filter((existing) => existing !== target) ?? null);
      if (preview?.key === target) setPreview(null);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bucket</CardTitle>
        <CardDescription>Every button here is one StorageManager call, run on the demo's server.</CardDescription>
        <CardAction>
          <Badge variant="secondary">{PROVIDERS[settings.provider].label}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="upload-key">Upload text</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="upload-key" value={key} onChange={(event) => setKey(event.target.value)} placeholder="path/to/file.txt" />
            <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="File contents" />
            <Button onClick={upload} disabled={!key || busy !== null}>
              {busy === "upload" ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
              Upload
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="Filter by prefix, e.g. notes/" />
          <Button variant="outline" onClick={refresh} disabled={busy !== null}>
            {busy === "list" ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
            List objects
          </Button>
        </div>

        {error && <p className="text-sm break-all text-destructive">{error}</p>}

        {keys !== null && (
          <ul className="divide-y rounded-lg border">
            {keys.length === 0 && <li className="p-3 text-sm text-muted-foreground">No objects.</li>}
            {keys.map((objectKey) => (
              <li key={objectKey} className="flex items-center gap-2 p-2 pl-3 text-sm">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono">{objectKey}</span>
                <Button size="icon-sm" variant="ghost" aria-label={`Read ${objectKey}`} onClick={() => download(objectKey)} disabled={busy !== null}>
                  {busy === `download:${objectKey}` ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Delete ${objectKey}`} onClick={() => remove(objectKey)} disabled={busy !== null}>
                  {busy === `delete:${objectKey}` ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {preview && (
          <div className="grid gap-2">
            <Label>{preview.key}</Label>
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{preview.content}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
