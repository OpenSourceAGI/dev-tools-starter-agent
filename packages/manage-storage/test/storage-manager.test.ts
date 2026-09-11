import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StorageManager,
  detectProvider,
  manageStorage,
  resolveConfig,
} from "../src/manage-storage";

/**
 * A stand-in for S3Client. Every method goes through `send`, so recording the
 * commands it receives is enough to assert what would have gone over the wire —
 * and the constructor's `client` option means no module mocking is needed.
 */
function fakeClient(responses: any[] = []) {
  const sent: any[] = [];
  const queue = [...responses];

  return {
    sent,
    client: {
      send: vi.fn(async (command: any) => {
        sent.push(command);
        const next = queue.shift();
        if (next instanceof Error) throw next;
        return next ?? {};
      }),
    } as any,
  };
}

/** The name of the command class, which is how the SDK distinguishes them. */
const names = (sent: any[]) => sent.map((command) => command.constructor.name);

const CLOUDFLARE_ENV = {
  CLOUDFLARE_BUCKET_NAME: "cf-bucket",
  CLOUDFLARE_ACCESS_KEY_ID: "cf-key",
  CLOUDFLARE_SECRET_ACCESS_KEY: "cf-secret",
  CLOUDFLARE_BUCKET_URL: "https://account.r2.cloudflarestorage.com",
};

const PROVIDER_VARS = Object.keys(CLOUDFLARE_ENV).concat(
  "BACKBLAZE_BUCKET_NAME",
  "BACKBLAZE_ACCESS_KEY_ID",
  "BACKBLAZE_SECRET_ACCESS_KEY",
  "BACKBLAZE_BUCKET_URL",
  "AMAZON_BUCKET_NAME",
  "AMAZON_ACCESS_KEY_ID",
  "AMAZON_SECRET_ACCESS_KEY",
  "AMAZON_BUCKET_URL",
  "AMAZON_REGION",
);

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  // A developer's own .env would otherwise decide which provider these tests
  // detect, so the whole set is cleared and restored around each one.
  for (const name of PROVIDER_VARS) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
});

afterEach(() => {
  for (const name of PROVIDER_VARS) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

describe("detectProvider", () => {
  it("picks the provider whose credentials are all present", () => {
    Object.assign(process.env, {
      BACKBLAZE_BUCKET_NAME: "b2",
      BACKBLAZE_ACCESS_KEY_ID: "id",
      BACKBLAZE_SECRET_ACCESS_KEY: "secret",
      BACKBLAZE_BUCKET_URL: "https://s3.us-west-004.backblazeb2.com",
    });

    expect(detectProvider()).toBe("backblaze");
  });

  it("ignores a provider that is only half configured", () => {
    // Half-configured is the common state of a .env mid-setup; detecting it
    // would fail later with a credentials error against the wrong provider.
    process.env.AMAZON_BUCKET_NAME = "s3-bucket";
    Object.assign(process.env, CLOUDFLARE_ENV);

    expect(detectProvider()).toBe("cloudflare");
  });
});

describe("resolveConfig", () => {
  it("lets explicit config win over the environment", () => {
    Object.assign(process.env, CLOUDFLARE_ENV);

    expect(resolveConfig({ bucket: "override" }).bucket).toBe("override");
    expect(resolveConfig().bucket).toBe("cf-bucket");
  });

  it("reads B2's application-key spelling of the same two credentials", () => {
    const config = resolveConfig({
      provider: "backblaze",
      bucket: "b2",
      endpoint: "https://s3.us-west-004.backblazeb2.com",
    });
    expect(config.accessKeyId).toBe("");

    process.env.BACKBLAZE_APPLICATION_KEY_ID = "app-key-id";
    process.env.BACKBLAZE_APPLICATION_KEY = "app-key";
    const withKeys = resolveConfig({ provider: "backblaze" });

    expect(withKeys.accessKeyId).toBe("app-key-id");
    expect(withKeys.secretAccessKey).toBe("app-key");

    delete process.env.BACKBLAZE_APPLICATION_KEY_ID;
    delete process.env.BACKBLAZE_APPLICATION_KEY;
  });

  it("only gives S3 a real region", () => {
    expect(resolveConfig({ provider: "cloudflare" }).region).toBe("auto");
    expect(resolveConfig({ provider: "amazon" }).region).toBe("us-east-1");
    expect(resolveConfig({ provider: "amazon", region: "eu-west-2" }).region).toBe(
      "eu-west-2",
    );
  });
});

describe("StorageManager", () => {
  /** A manager wired to a fake client, with credentials already resolved. */
  function manager(responses: any[] = []) {
    const { client, sent } = fakeClient(responses);
    return {
      sent,
      storage: new StorageManager({
        provider: "cloudflare",
        bucket: "cf-bucket",
        accessKeyId: "key",
        secretAccessKey: "secret",
        endpoint: "https://account.r2.cloudflarestorage.com",
        client,
      }),
    };
  }

  it("uploads to the configured bucket, with an optional content type", async () => {
    const { storage, sent } = manager([{ ETag: '"abc"' }]);

    const result = await storage.upload("notes/memo.txt", "Hello, World!", {
      contentType: "text/plain",
    });

    expect(names(sent)).toEqual(["PutObjectCommand"]);
    expect(sent[0].input).toMatchObject({
      Bucket: "cf-bucket",
      Key: "notes/memo.txt",
      Body: "Hello, World!",
      ContentType: "text/plain",
    });
    expect(result).toMatchObject({ success: true, key: "notes/memo.txt", ETag: '"abc"' });
  });

  it("downloads as text and as bytes", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const { storage } = manager([
      { Body: { transformToString: async () => "contents" } },
      { Body: { transformToByteArray: async () => bytes } },
    ]);

    expect(await storage.download("a.txt")).toBe("contents");
    expect(await storage.downloadBytes("a.bin")).toBe(bytes);
  });

  it("returns an empty result rather than undefined for an empty body", async () => {
    const { storage } = manager([{}, {}]);

    expect(await storage.download("a.txt")).toBe("");
    expect(await storage.downloadBytes("a.bin")).toEqual(new Uint8Array());
  });

  it("follows the continuation token so list is not capped at one page", async () => {
    // The API returns at most 1000 keys per response. Returning only the first
    // page is the bug this exists to prevent: it looks like success.
    const { storage, sent } = manager([
      {
        Contents: [{ Key: "a" }, { Key: "b" }],
        IsTruncated: true,
        NextContinuationToken: "token-1",
      },
      { Contents: [{ Key: "c" }], IsTruncated: false },
    ]);

    expect(await storage.list()).toEqual(["a", "b", "c"]);
    expect(sent[0].input.ContinuationToken).toBeUndefined();
    expect(sent[1].input.ContinuationToken).toBe("token-1");
  });

  it("lists under a prefix", async () => {
    const { storage, sent } = manager([{ Contents: [{ Key: "notes/memo.txt" }] }]);

    expect(await storage.list("notes/")).toEqual(["notes/memo.txt"]);
    expect(sent[0].input.Prefix).toBe("notes/");
  });

  it("skips entries the API returns without a key", async () => {
    const { storage } = manager([{ Contents: [{ Key: "a" }, {}] }]);
    expect(await storage.list()).toEqual(["a"]);
  });

  it("treats exists as an exact match, not a prefix match", async () => {
    const { storage, sent } = manager([
      { Contents: [{ Key: "notes/memo.txt.bak" }] },
      { Contents: [{ Key: "notes/memo.txt" }] },
    ]);

    expect(await storage.exists("notes/memo.txt")).toBe(false);
    expect(await storage.exists("notes/memo.txt")).toBe(true);
    expect(sent[0].input.MaxKeys).toBe(1);
  });

  it("copies with a bucket-qualified source", async () => {
    const { storage, sent } = manager([{}]);

    const result = await storage.copy("a.txt", "b.txt");

    expect(sent[0].input).toMatchObject({
      Bucket: "cf-bucket",
      CopySource: "cf-bucket/a.txt",
      Key: "b.txt",
    });
    expect(result).toMatchObject({
      success: true,
      sourceKey: "a.txt",
      destinationKey: "b.txt",
    });
  });

  it("renames by copying then deleting", async () => {
    const { storage, sent } = manager([{}, {}]);

    const result = await storage.rename("old.txt", "new.txt");

    expect(names(sent)).toEqual(["CopyObjectCommand", "DeleteObjectCommand"]);
    expect(sent[1].input.Key).toBe("old.txt");
    expect(result).toEqual({ success: true, oldKey: "old.txt", newKey: "new.txt" });
  });

  it("does not delete the source when the copy fails", async () => {
    // Rename is not atomic, so the ordering is the only safety there is: losing
    // the original to a failed copy would be data loss.
    const { storage, sent } = manager([new Error("AccessDenied")]);

    await expect(storage.rename("old.txt", "new.txt")).rejects.toThrow(/AccessDenied/);
    expect(names(sent)).toEqual(["CopyObjectCommand"]);
  });

  it("deletes everything in batches of 1000", async () => {
    const keys = Array.from({ length: 1001 }, (_, index) => `file-${index}`);
    const { storage, sent } = manager([
      { Contents: keys.map((Key) => ({ Key })), IsTruncated: false },
      {},
      {},
    ]);

    const result = await storage.deleteAll();

    // One list, then two deletes: DeleteObjects rejects more than 1000 keys.
    expect(names(sent)).toEqual([
      "ListObjectsV2Command",
      "DeleteObjectsCommand",
      "DeleteObjectsCommand",
    ]);
    expect(sent[1].input.Delete.Objects).toHaveLength(1000);
    expect(sent[2].input.Delete.Objects).toHaveLength(1);
    expect(result).toEqual({ success: true, count: 1001 });
  });

  it("sends no delete for an empty bucket", async () => {
    const { storage, sent } = manager([{ Contents: [] }]);

    expect(await storage.deleteAll()).toEqual({ success: true, count: 0 });
    expect(names(sent)).toEqual(["ListObjectsV2Command"]);
  });

  it("restricts deleteAll to a prefix when given one", async () => {
    const { storage, sent } = manager([{ Contents: [{ Key: "temp/a" }] }, {}]);

    await storage.deleteAll("temp/");

    expect(sent[0].input.Prefix).toBe("temp/");
  });

  it("names the provider and bucket in a failure", async () => {
    // The SDK's own message says what went wrong but not where, which is the
    // first thing you need when two providers are configured.
    const { storage } = manager([new Error("SignatureDoesNotMatch")]);

    await expect(storage.download("a.txt")).rejects.toThrow(
      /manage-storage download failed on cloudflare bucket "cf-bucket": SignatureDoesNotMatch/,
    );
  });

  it("keeps the original error as the cause", async () => {
    const original = new Error("NoSuchBucket");
    const { storage } = manager([original]);

    await expect(storage.upload("a.txt", "x")).rejects.toMatchObject({ cause: original });
  });

  it("exposes which provider and bucket it resolved to", () => {
    Object.assign(process.env, CLOUDFLARE_ENV);
    const storage = new StorageManager();

    expect(storage.provider).toBe("cloudflare");
    expect(storage.bucket).toBe("cf-bucket");
  });

  it("constructs without credentials and fails only when used", async () => {
    // dotenv is often loaded after the module graph, so throwing in the
    // constructor would break `new StorageManager()` at module scope.
    const storage = new StorageManager({ provider: "amazon" });

    await expect(storage.list()).rejects.toThrow(
      /Missing credentials for amazon: AMAZON_BUCKET_NAME, AMAZON_ACCESS_KEY_ID, AMAZON_SECRET_ACCESS_KEY/,
    );
  });
});

describe("manageStorage (deprecated)", () => {
  /** Published callers pass credentials as flat SHOUT_CASE options. */
  const credentials = {
    provider: "cloudflare" as const,
    BUCKET_NAME: "legacy-bucket",
    ACCESS_KEY_ID: "key",
    SECRET_ACCESS_KEY: "secret",
    BUCKET_URL: "https://account.r2.cloudflarestorage.com",
  };

  it("still uploads, with the runtime credentials it was given", async () => {
    const sent: any[] = [];
    const send = vi
      .spyOn(StorageManager.prototype as any, "send")
      .mockImplementation(async (_operation: any, command: any) => {
        sent.push(command);
        return {};
      });

    const result = await manageStorage("upload", {
      ...credentials,
      key: "a.txt",
      body: "hi",
    });

    expect(result).toMatchObject({ success: true, key: "a.txt" });
    expect(sent[0].input).toMatchObject({ Bucket: "legacy-bucket", Key: "a.txt" });
    send.mockRestore();
  });

  it("maps every action onto a StorageManager method", async () => {
    const calls: string[] = [];
    const stub = (name: string, value: any) =>
      vi
        .spyOn(StorageManager.prototype, name as any)
        .mockImplementation(async () => {
          calls.push(name);
          return value;
        });

    const spies = [
      stub("download", "text"),
      stub("delete", { success: true, key: "a.txt" }),
      stub("list", ["a.txt"]),
      stub("deleteAll", { success: true, count: 1 }),
      stub("copy", { success: true, sourceKey: "a.txt", destinationKey: "b.txt" }),
      stub("rename", { success: true, oldKey: "a.txt", newKey: "b.txt" }),
    ];

    expect(await manageStorage("download", { ...credentials, key: "a.txt" })).toBe("text");
    await manageStorage("delete", { ...credentials, key: "a.txt" });
    expect(await manageStorage("list", credentials)).toEqual(["a.txt"]);
    await manageStorage("deleteAll", credentials);
    await manageStorage("copy", { ...credentials, key: "a.txt", destinationKey: "b.txt" });
    await manageStorage("rename", { ...credentials, key: "a.txt", destinationKey: "b.txt" });

    expect(calls).toEqual(["download", "delete", "list", "deleteAll", "copy", "rename"]);
    for (const spy of spies) spy.mockRestore();
  });

  it("rejects copy and rename without a destination, before sending anything", async () => {
    await expect(
      manageStorage("copy", { ...credentials, key: "a.txt" } as any),
    ).rejects.toThrow(/destinationKey is required/);
    await expect(
      manageStorage("rename", { ...credentials, key: "a.txt" } as any),
    ).rejects.toThrow(/destinationKey is required/);
  });

  it("rejects an unknown action", async () => {
    await expect(manageStorage("sync" as any, credentials)).rejects.toThrow(
      /Invalid action/,
    );
  });
});
