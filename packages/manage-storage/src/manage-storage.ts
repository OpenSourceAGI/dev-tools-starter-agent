import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "dotenv";
config();

/**
 * Cloud storage provider type
 */
export type Provider = "amazon" | "backblaze" | "cloudflare";

/**
 * Storage operation action type.
 *
 * @deprecated Actions belong to the {@link manageStorage} function. Call the
 * matching {@link StorageManager} method instead.
 */
export type Action =
  | "upload"
  | "download"
  | "delete"
  | "list"
  | "deleteAll"
  | "copy"
  | "rename";

/** What an upload accepts as its payload. */
export type StorageBody = string | Uint8Array | Buffer | ReadableStream;

/**
 * How a {@link StorageManager} reaches its bucket.
 *
 * Every field is optional: anything left out falls back to the `*_BUCKET_NAME`,
 * `*_ACCESS_KEY_ID`, `*_SECRET_ACCESS_KEY` and `*_BUCKET_URL` environment
 * variables for the resolved provider. Edge runtimes have no `process.env` to
 * read, so there you pass all four.
 */
export interface StorageConfig {
  /** Which provider to talk to. Auto-detected from the environment if omitted. */
  provider?: Provider;
  /** Bucket name. Falls back to `<PROVIDER>_BUCKET_NAME`. */
  bucket?: string;
  /** Access key id. Falls back to `<PROVIDER>_ACCESS_KEY_ID`. */
  accessKeyId?: string;
  /** Secret access key. Falls back to `<PROVIDER>_SECRET_ACCESS_KEY`. */
  secretAccessKey?: string;
  /** S3 endpoint for the bucket. Falls back to `<PROVIDER>_BUCKET_URL`. */
  endpoint?: string;
  /** Region. Only S3 uses it; R2 and B2 are always `auto`. */
  region?: string;
  /**
   * A pre-built client, for tests or for a client configured with retry,
   * proxy or credential-provider options this class does not expose.
   */
  client?: S3Client;
}

/**
 * Options for storage operations.
 *
 * @deprecated The option bag belongs to {@link manageStorage}. {@link StorageManager}
 * takes credentials once in its constructor and the key as an argument.
 */
export interface StorageOptions {
  /** The object key/path (required for upload, download, delete) */
  key?: string;
  /** The destination key/path (required for copy, rename) */
  destinationKey?: string;
  /** The file content to upload (required for upload) */
  body?: StorageBody;
  /** Force a specific cloud provider (auto-detected if omitted) */
  provider?: Provider;
  /** Override bucket name at runtime */
  BUCKET_NAME?: string;
  /** Override access key ID at runtime */
  ACCESS_KEY_ID?: string;
  /** Override secret access key at runtime */
  SECRET_ACCESS_KEY?: string;
  /** Override bucket URL at runtime */
  BUCKET_URL?: string;
  /** AWS region (only for S3 provider) */
  awsRegion?: string;
}

/**
 * Result from upload operation
 */
export interface UploadResult {
  /** Whether the upload was successful */
  success: boolean;
  /** The object key that was uploaded */
  key: string;
  [key: string]: any;
}

/**
 * Result from delete operation
 */
export interface DeleteResult {
  /** Whether the deletion was successful */
  success: boolean;
  /** The object key that was deleted */
  key: string;
  [key: string]: any;
}

/**
 * Result from deleteAll operation
 */
export interface DeleteAllResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Number of objects deleted */
  count: number;
  [key: string]: any;
}

/**
 * Result from copy operation
 */
export interface CopyResult {
  /** Whether the copy was successful */
  success: boolean;
  /** The source object key */
  sourceKey: string;
  /** The destination object key */
  destinationKey: string;
  [key: string]: any;
}

/**
 * Result from rename operation
 */
export interface RenameResult {
  /** Whether the rename was successful */
  success: boolean;
  /** The old object key */
  oldKey: string;
  /** The new object key */
  newKey: string;
  [key: string]: any;
}

/** The fully resolved connection details, after env vars and overrides merge. */
export interface ResolvedConfig {
  provider: Provider;
  region: string;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** The env var prefixes checked, in the order they are checked. */
const PROVIDER_PREFIXES: Record<Provider, string> = {
  cloudflare: "CLOUDFLARE",
  backblaze: "BACKBLAZE",
  amazon: "AMAZON",
};

/** `DeleteObjects` takes at most 1000 keys per request. */
const DELETE_BATCH_SIZE = 1000;

/**
 * Which provider the environment is configured for, by looking for a complete
 * set of credentials under each prefix in turn: Cloudflare, Backblaze, Amazon.
 *
 * @returns The detected provider, or `cloudflare` when none is fully configured
 * (in which case the missing credentials are reported on the first call).
 *
 * @example
 * // With CLOUDFLARE_* set
 * detectProvider(); // "cloudflare"
 */
export function detectProvider(): Provider {
  for (const [provider, prefix] of Object.entries(PROVIDER_PREFIXES) as [
    Provider,
    string
  ][]) {
    const complete = [
      "BUCKET_NAME",
      "ACCESS_KEY_ID",
      "SECRET_ACCESS_KEY",
      "BUCKET_URL",
    ].every((name) => process.env[`${prefix}_${name}`]);

    if (complete) return provider;
  }

  return "cloudflare";
}

/**
 * Merge explicit config over the environment for one provider.
 *
 * @param config - Explicit values, each of which wins over its env var
 * @returns Everything the S3 client needs, with missing pieces left empty for
 * the caller to report on
 *
 * @example
 * resolveConfig({ provider: "backblaze", bucket: "my-bucket" });
 */
export function resolveConfig(config: StorageConfig = {}): ResolvedConfig {
  const provider = config.provider ?? detectProvider();
  const prefix = PROVIDER_PREFIXES[provider];
  const env = (name: string) => process.env[`${prefix}_${name}`] ?? "";

  return {
    provider,
    // R2 and B2 derive the region from the endpoint; only S3 needs a real one.
    region:
      provider === "amazon"
        ? config.region || process.env.AMAZON_REGION || "us-east-1"
        : "auto",
    endpoint: config.endpoint || env("BUCKET_URL"),
    bucket: config.bucket || env("BUCKET_NAME"),
    // B2 calls the same two credentials "application key id" and "application
    // key", and its console labels them that way, so both spellings are read.
    accessKeyId:
      config.accessKeyId || env("ACCESS_KEY_ID") || env("APPLICATION_KEY_ID"),
    secretAccessKey:
      config.secretAccessKey ||
      env("SECRET_ACCESS_KEY") ||
      env("APPLICATION_KEY"),
  };
}

/**
 * One bucket, on Amazon S3, Cloudflare R2 or Backblaze B2, as an object with a
 * method per operation.
 *
 * Credentials are resolved once, in the constructor, from the config you pass
 * and the environment: `new StorageManager()` with the env vars set is the whole
 * setup. The client is built lazily on the first call, so constructing a manager
 * for a provider you end up not using costs nothing.
 *
 * @example
 * // Env vars configure it; the provider is detected from which ones are set.
 * const storage = new StorageManager();
 *
 * await storage.upload("notes/memo.txt", "Hello, World!");
 * const text = await storage.download("notes/memo.txt");
 * const keys = await storage.list("notes/");
 * await storage.rename("notes/memo.txt", "archive/memo.txt");
 * await storage.delete("archive/memo.txt");
 *
 * @example
 * // Cloudflare Workers: no process.env, so pass the bindings in.
 * const storage = new StorageManager({
 *   provider: "cloudflare",
 *   bucket: env.CLOUDFLARE_BUCKET_NAME,
 *   accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
 *   secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
 *   endpoint: env.CLOUDFLARE_BUCKET_URL,
 * });
 */
export class StorageManager {
  /** The resolved connection details: provider, bucket, endpoint, region. */
  readonly config: ResolvedConfig;

  private readonly injectedClient?: S3Client;
  private cachedClient?: S3Client;

  /**
   * @param config - Connection details; anything omitted comes from the
   * environment. Throws only when an operation runs without credentials, not
   * here, so a manager can be constructed before the environment is loaded.
   */
  constructor(config: StorageConfig = {}) {
    this.config = resolveConfig(config);
    this.injectedClient = config.client;
  }

  /** Which provider this manager resolved to. */
  get provider(): Provider {
    return this.config.provider;
  }

  /** Which bucket this manager reads and writes. */
  get bucket(): string {
    return this.config.bucket;
  }

  /**
   * The S3 client, built on first use.
   *
   * The credential check lives here rather than in the constructor because
   * `dotenv` is often loaded after the module graph is: failing at construction
   * would break the common `new StorageManager()` at module scope.
   */
  private get client(): S3Client {
    if (this.injectedClient) return this.injectedClient;
    if (this.cachedClient) return this.cachedClient;

    const { provider, bucket, accessKeyId, secretAccessKey, region, endpoint } =
      this.config;

    const missing = [
      !bucket && `${PROVIDER_PREFIXES[provider]}_BUCKET_NAME`,
      !accessKeyId && `${PROVIDER_PREFIXES[provider]}_ACCESS_KEY_ID`,
      !secretAccessKey && `${PROVIDER_PREFIXES[provider]}_SECRET_ACCESS_KEY`,
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new Error(
        `Missing credentials for ${provider}: ${missing.join(", ")}. ` +
          "Set them in the environment, or pass bucket/accessKeyId/secretAccessKey/endpoint to the StorageManager constructor (edge runtimes have no process.env).",
      );
    }

    this.cachedClient = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    return this.cachedClient;
  }

  /**
   * Send one command, tagging any failure with the provider and operation.
   *
   * The SDK's errors say what went wrong but not which bucket or provider they
   * went wrong against, which is the first thing you need when two providers are
   * configured.
   */
  private async send<T>(operation: string, command: any): Promise<T> {
    try {
      return (await this.client.send(command)) as T;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `manage-storage ${operation} failed on ${this.config.provider} bucket "${this.config.bucket}": ${reason}`,
        { cause: error },
      );
    }
  }

  /**
   * Store bytes at a key, creating or replacing whatever was there.
   *
   * @param key - The object key/path
   * @param body - String, Buffer, Uint8Array or stream to store
   * @param options - `contentType` sets the stored MIME type, which is what a
   * browser reads when the object is served from a public bucket
   *
   * @example
   * await storage.upload("config/settings.json", JSON.stringify(settings), {
   *   contentType: "application/json",
   * });
   */
  async upload(
    key: string,
    body: StorageBody,
    options: { contentType?: string } = {},
  ): Promise<UploadResult> {
    const result = await this.send<Record<string, unknown>>(
      "upload",
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body as any,
        ContentType: options.contentType,
      }),
    );

    return { success: true, key, ...result };
  }

  /**
   * Read an object back as text.
   *
   * @param key - The object key/path
   * @returns The object's content, decoded as UTF-8
   * @throws When the key does not exist — there is no "missing" return value
   *
   * @example
   * const settings = JSON.parse(await storage.download("config/settings.json"));
   */
  async download(key: string): Promise<string> {
    const result = await this.send<{
      Body?: { transformToString(): Promise<string> };
    }>("download", new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));

    return (await result.Body?.transformToString()) ?? "";
  }

  /**
   * Read an object back as bytes, for anything that is not text.
   *
   * @param key - The object key/path
   *
   * @example
   * const bytes = await storage.downloadBytes("images/logo.png");
   */
  async downloadBytes(key: string): Promise<Uint8Array> {
    const result = await this.send<{
      Body?: { transformToByteArray(): Promise<Uint8Array> };
    }>("download", new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));

    return (await result.Body?.transformToByteArray()) ?? new Uint8Array();
  }

  /**
   * Every key in the bucket, or every key under a prefix.
   *
   * Paginated: S3 returns at most 1000 keys per response, and this follows the
   * continuation token to the end rather than silently returning the first page.
   *
   * @param prefix - Only keys starting with this string. Keys are flat — there
   * are no folders — so `"documents/"` is just a prefix match.
   *
   * @example
   * const invoices = await storage.list("invoices/2024/");
   */
  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const page = await this.send<{
        Contents?: { Key?: string }[];
        IsTruncated?: boolean;
        NextContinuationToken?: string;
      }>(
        "list",
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of page.Contents ?? []) {
        if (object.Key) keys.push(object.Key);
      }

      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  /**
   * Whether a key exists, without downloading it.
   *
   * @param key - The object key/path
   *
   * @example
   * if (await storage.exists("config/settings.json")) { … }
   */
  async exists(key: string): Promise<boolean> {
    const page = await this.send<{ Contents?: { Key?: string }[] }>(
      "exists",
      new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: key,
        MaxKeys: 1,
      }),
    );

    // A prefix match can return a longer key, so compare exactly.
    return (page.Contents ?? []).some((object) => object.Key === key);
  }

  /**
   * Duplicate an object to another key.
   *
   * @param key - The source key
   * @param destinationKey - The key to copy it to
   *
   * @example
   * await storage.copy("config/settings.json", "config/settings.backup.json");
   */
  async copy(key: string, destinationKey: string): Promise<CopyResult> {
    const result = await this.send<Record<string, unknown>>(
      "copy",
      new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${key}`,
        Key: destinationKey,
      }),
    );

    return { success: true, sourceKey: key, destinationKey, ...result };
  }

  /**
   * Move an object to another key: a copy, then a delete.
   *
   * Not atomic — S3 has no rename — so an interruption between the two can leave
   * both keys in place. Nothing is deleted unless the copy succeeded.
   *
   * @param key - The current key
   * @param destinationKey - The key to move it to
   *
   * @example
   * await storage.rename("temp/draft.md", "published/article.md");
   */
  async rename(key: string, destinationKey: string): Promise<RenameResult> {
    await this.copy(key, destinationKey);
    await this.delete(key);

    return { success: true, oldKey: key, newKey: destinationKey };
  }

  /**
   * Remove one object. Deleting a key that does not exist succeeds — that is how
   * S3 behaves, and this does not paper over it with a lookup first.
   *
   * @param key - The object key/path
   *
   * @example
   * await storage.delete("notes/memo.txt");
   */
  async delete(key: string): Promise<DeleteResult> {
    const result = await this.send<Record<string, unknown>>(
      "delete",
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );

    return { success: true, key, ...result };
  }

  /**
   * Empty the bucket, or everything under a prefix. Irreversible.
   *
   * Lists and deletes in batches of 1000 (the API's per-request limit) until
   * nothing is left, so it finishes the job on a bucket of any size.
   *
   * @param prefix - Restrict the deletion to keys starting with this string.
   * Omitting it deletes everything in the bucket.
   *
   * @example
   * const { count } = await storage.deleteAll("temp/");
   */
  async deleteAll(prefix?: string): Promise<DeleteAllResult> {
    const keys = await this.list(prefix);
    if (keys.length === 0) return { success: true, count: 0 };

    for (let index = 0; index < keys.length; index += DELETE_BATCH_SIZE) {
      const batch = keys.slice(index, index + DELETE_BATCH_SIZE);
      await this.send(
        "deleteAll",
        new DeleteObjectsCommand({
          Bucket: this.config.bucket,
          Delete: { Objects: batch.map((key) => ({ Key: key })) },
        }),
      );
    }

    return { success: true, count: keys.length };
  }
}

/**
 * Map a legacy option bag onto a {@link StorageConfig}.
 *
 * @param options - The flat, SHOUT_CASE options {@link manageStorage} took
 */
function configFromOptions(options: StorageOptions): StorageConfig {
  return {
    provider: options.provider,
    bucket: options.BUCKET_NAME,
    accessKeyId: options.ACCESS_KEY_ID,
    secretAccessKey: options.SECRET_ACCESS_KEY,
    endpoint: options.BUCKET_URL,
    region: options.awsRegion,
  };
}

/**
 * The original action-string API, kept working for already-published callers.
 *
 * @deprecated Use {@link StorageManager}. `manageStorage("upload", { key, body })`
 * becomes `new StorageManager().upload(key, body)` — same requests, but the
 * arguments each method needs are in its signature instead of an option bag
 * whose required fields change per action.
 *
 * @param action - `upload`, `download`, `delete`, `list`, `deleteAll`, `copy` or `rename`
 * @param options - The key, body, destination and credential overrides
 *
 * @example
 * // Deprecated:
 * await manageStorage("upload", { key: "a.txt", body: "hi" });
 * // Current:
 * await new StorageManager().upload("a.txt", "hi");
 */
export async function manageStorage(
  action: "upload",
  options: StorageOptions & { key: string; body: StorageBody },
): Promise<UploadResult>;
export async function manageStorage(
  action: "download",
  options: StorageOptions & { key: string },
): Promise<string>;
export async function manageStorage(
  action: "delete",
  options: StorageOptions & { key: string },
): Promise<DeleteResult>;
export async function manageStorage(
  action: "list",
  options?: StorageOptions,
): Promise<string[]>;
export async function manageStorage(
  action: "deleteAll",
  options?: StorageOptions,
): Promise<DeleteAllResult>;
export async function manageStorage(
  action: "copy",
  options: StorageOptions & { key: string; destinationKey: string },
): Promise<CopyResult>;
export async function manageStorage(
  action: "rename",
  options: StorageOptions & { key: string; destinationKey: string },
): Promise<RenameResult>;
export async function manageStorage(
  action: Action,
  options: StorageOptions = {},
): Promise<
  | UploadResult
  | string
  | DeleteResult
  | string[]
  | DeleteAllResult
  | CopyResult
  | RenameResult
> {
  const storage = new StorageManager(configFromOptions(options));
  const { key, body, destinationKey } = options;

  switch (action) {
    case "upload":
      return storage.upload(key as string, body as StorageBody);
    case "download":
      return storage.download(key as string);
    case "delete":
      return storage.delete(key as string);
    case "list":
      return storage.list();
    case "deleteAll":
      return storage.deleteAll();
    case "copy":
      if (!destinationKey) {
        throw new Error("destinationKey is required for copy operation");
      }
      return storage.copy(key as string, destinationKey);
    case "rename":
      if (!destinationKey) {
        throw new Error("destinationKey is required for rename operation");
      }
      return storage.rename(key as string, destinationKey);
    default:
      throw new Error(
        "Invalid action: upload, download, delete, list, deleteAll, copy, rename",
      );
  }
}

export default StorageManager;
