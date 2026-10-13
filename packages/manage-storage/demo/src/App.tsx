import { useEffect, useState } from "react";

import { FileBrowser } from "@/components/file-browser";
import { StorageSettings } from "@/components/storage-settings";
import { loadSettings, saveSettings } from "@/lib/settings";

export default function App() {
  const [initial] = useState(loadSettings);
  const [settings, setSettings] = useState(initial.settings);
  const [rememberSecret, setRememberSecret] = useState(initial.rememberSecret);

  useEffect(() => saveSettings(settings, rememberSecret), [settings, rememberSecret]);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">manage-storage</h1>
        <p className="text-muted-foreground">
          One API for Amazon S3, Backblaze B2, Cloudflare R2 and Google Cloud Storage. Configure a bucket, then try
          it out.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <StorageSettings
          settings={settings}
          rememberSecret={rememberSecret}
          onChange={setSettings}
          onRememberSecretChange={setRememberSecret}
        />
        <FileBrowser settings={settings} />
      </div>
    </main>
  );
}
