import type { DemoRequest, DemoSettings } from "../../server/storage-api";

export type { DemoSettings };
export type Provider = DemoSettings["provider"];

/** What the settings panel shows for each provider. */
export const PROVIDERS: Record<
  Provider,
  {
    label: string;
    accessKeyLabel: string;
    secretLabel: string;
    endpointPlaceholder: string;
    endpointRequired: boolean;
    hasRegion: boolean;
    hint: string;
  }
> = {
  amazon: {
    label: "Amazon S3",
    accessKeyLabel: "Access key ID",
    secretLabel: "Secret access key",
    endpointPlaceholder: "https://s3.us-east-1.amazonaws.com",
    endpointRequired: false,
    hasRegion: true,
    hint: "IAM → Users → Security credentials → Create access key.",
  },
  backblaze: {
    label: "Backblaze B2",
    accessKeyLabel: "Application key ID",
    secretLabel: "Application key",
    endpointPlaceholder: "https://s3.us-west-004.backblazeb2.com",
    endpointRequired: true,
    hasRegion: false,
    hint: "B2 → Application Keys. The endpoint is on the bucket's page.",
  },
  cloudflare: {
    label: "Cloudflare R2",
    accessKeyLabel: "Access key ID",
    secretLabel: "Secret access key",
    endpointPlaceholder: "https://<account-id>.r2.cloudflarestorage.com",
    endpointRequired: true,
    hasRegion: false,
    hint: "R2 → Manage R2 API Tokens → Create API token.",
  },
  google: {
    label: "Google Cloud Storage",
    accessKeyLabel: "HMAC access ID",
    secretLabel: "HMAC secret",
    endpointPlaceholder: "https://storage.googleapis.com",
    endpointRequired: false,
    hasRegion: false,
    hint: "Cloud Storage → Settings → Interoperability → Create a key for a service account.",
  },
};

export const EMPTY_SETTINGS: DemoSettings = {
  provider: "google",
  bucket: "",
  accessKeyId: "",
  secretAccessKey: "",
  endpoint: "",
  region: "",
};

const STORAGE_KEY = "manage-storage-demo:settings";

/**
 * Settings persist per browser. The secret is only kept when the visitor opts
 * in, so a shared machine does not keep a bucket key by default.
 */
export function loadSettings(): { settings: DemoSettings; rememberSecret: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved?.settings?.provider in PROVIDERS) {
      return {
        settings: { ...EMPTY_SETTINGS, ...saved.settings },
        rememberSecret: Boolean(saved.rememberSecret),
      };
    }
  } catch {
    // Storage blocked or corrupt: start empty.
  }
  return { settings: EMPTY_SETTINGS, rememberSecret: false };
}

export function saveSettings(settings: DemoSettings, rememberSecret: boolean) {
  try {
    const stored = rememberSecret ? settings : { ...settings, secretAccessKey: "" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: stored, rememberSecret }));
  } catch {
    // Not persisting is fine; the settings still apply for this visit.
  }
}

type WithoutSettings<T> = T extends unknown ? Omit<T, "settings"> : never;

/** Ask the demo's storage server to run one operation. */
export async function callStorage<T = Record<string, unknown>>(
  settings: DemoSettings,
  request: WithoutSettings<DemoRequest>,
): Promise<T> {
  const response = await fetch("/api/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, settings }),
  });
  const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body as T;
}
