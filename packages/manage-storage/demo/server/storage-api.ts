import { StorageManager, type Provider, type StorageConfig } from "../../src/manage-storage";

/**
 * The connection settings the demo's settings panel sends with every request.
 * Blank fields fall through to the server's `<PROVIDER>_*` environment
 * variables, the same way `new StorageManager()` reads them.
 */
export interface DemoSettings {
  provider: Provider;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  region?: string;
}

/** One storage operation, as the browser asks the server to run it. */
export type DemoRequest =
  | { action: "list"; settings: DemoSettings; prefix?: string }
  | { action: "upload"; settings: DemoSettings; key: string; body: string; contentType?: string }
  | { action: "download"; settings: DemoSettings; key: string }
  | { action: "delete"; settings: DemoSettings; key: string }
  | { action: "rename"; settings: DemoSettings; key: string; destinationKey: string };

export interface DemoResponse {
  status: number;
  body: Record<string, unknown>;
}

const PROVIDERS: Provider[] = ["amazon", "backblaze", "cloudflare", "google"];

/** Turn the panel's settings into a StorageConfig, dropping blank fields. */
function toConfig(settings: DemoSettings): StorageConfig {
  const blankToUndefined = (value?: string) => value?.trim() || undefined;
  return {
    provider: settings.provider,
    bucket: blankToUndefined(settings.bucket),
    accessKeyId: blankToUndefined(settings.accessKeyId),
    secretAccessKey: blankToUndefined(settings.secretAccessKey),
    endpoint: blankToUndefined(settings.endpoint),
    region: blankToUndefined(settings.region),
  };
}

/**
 * Run one demo request against the bucket it names. This is the server half of
 * the demo: credentials stay out of the browser's network calls to the bucket,
 * and S3-compatible APIs do not need CORS configured to be tried out.
 *
 * Shared by the Vite dev server middleware and the Vercel function, so both
 * behave the same. Never logs the request: it carries a secret key.
 */
export async function handleStorageRequest(request: DemoRequest): Promise<DemoResponse> {
  if (!request || !PROVIDERS.includes(request.settings?.provider)) {
    return { status: 400, body: { error: `provider must be one of ${PROVIDERS.join(", ")}` } };
  }

  const storage = new StorageManager(toConfig(request.settings));
  const where = { provider: storage.provider, bucket: storage.bucket };

  try {
    switch (request.action) {
      case "list":
        return { status: 200, body: { ...where, keys: await storage.list(request.prefix || undefined) } };
      case "upload":
        await storage.upload(request.key, request.body, { contentType: request.contentType });
        return { status: 200, body: { ...where, key: request.key } };
      case "download":
        return { status: 200, body: { ...where, key: request.key, content: await storage.download(request.key) } };
      case "delete":
        await storage.delete(request.key);
        return { status: 200, body: { ...where, key: request.key } };
      case "rename":
        await storage.rename(request.key, request.destinationKey);
        return { status: 200, body: { ...where, key: request.destinationKey } };
      default:
        return { status: 400, body: { error: "action must be list, upload, download, delete or rename" } };
    }
  } catch (error) {
    return { status: 502, body: { ...where, error: error instanceof Error ? error.message : String(error) } };
  }
}
