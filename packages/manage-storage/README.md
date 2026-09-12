<p align="center">
    <img width="350px" src="https://i.imgur.com/qEdTwly.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/manage-storage"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/manage-storage"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/manage-storage"><img src="https://img.shields.io/npm/dm/manage-storage.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/manage-storage"><img src="https://img.shields.io/npm/v/manage-storage.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/manage-storage"><img src="https://img.shields.io/npm/dt/manage-storage.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/manage-storage"><img src="https://img.shields.io/npm/types/manage-storage" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=manage-storage"><img src="https://packagephobia.com/badge?p=manage-storage" alt="Install size" /></a>
    <a href="https://app.codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/flags"><img src="https://img.shields.io/codecov/c/github/OpenSourceAGI/dev-tools-starter-agent?flag=manage-storage&label=manage-storage%20coverage&logo=codecov&logoColor=white" alt="Coverage" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill manage-storage` ([what it covers](../../skills/manage-storage/SKILL.md))
<!-- skills:install:end -->

# Cloud Storage Manager

One class, `StorageManager`, for Amazon S3, Cloudflare R2 and Backblaze B2. It
resolves credentials once, from the environment or from what you pass it, then
exposes the bucket as methods: `.upload()`, `.download()`, `.list()`, `.copy()`,
`.rename()`, `.delete()`, `.deleteAll()`, `.exists()`. Built on the official AWS
SDK v3, written in TypeScript, and shipped with its declarations, so the key and
body an operation needs are in its signature rather than in a comment.

[**▶ Open the runnable example in StackBlitz**](https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/manage-storage)
— it boots this package with its dependencies installed; add your bucket's four
env vars in the StackBlitz shell and the snippets below run as written.

## Features

- **Multi-cloud**: the same calls against S3, R2 and B2 — only the endpoint differs
- **Auto-detection**: the provider is read from whichever credential prefix your environment has
- **Typed end to end**: `.upload(key, body)` and `.list(prefix)` are checked at the call site, not documented in prose
- **Paginated**: `list()` follows the continuation token and `deleteAll()` batches, so neither stops silently at 1000 keys
- **Edge-ready**: pass credentials in the constructor where there is no `process.env`; nothing touches the file system

## Installation

```bash
npm install manage-storage
```

```bash
bun i manage-storage
```

## Quick Start

```ts
import { StorageManager } from "manage-storage";

// Credentials come from the environment; the provider is detected from them.
const storage = new StorageManager();

await storage.upload("documents/report.pdf", fileContent);
const data: string = await storage.download("documents/report.pdf");
const keys: string[] = await storage.list();

await storage.copy("documents/report.pdf", "documents/report-backup.pdf");
await storage.rename("documents/old-name.pdf", "documents/new-name.pdf");
await storage.delete("documents/report.pdf");
```

## Configuration

Set environment variables for your preferred provider. The library detects which
provider to use from the first prefix whose four variables are all present:
Cloudflare, then Backblaze, then Amazon.

### Cloudflare R2

```env
CLOUDFLARE_BUCKET_NAME=my-bucket
CLOUDFLARE_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_BUCKET_URL=https://your-account-id.r2.cloudflarestorage.com
```

### Backblaze B2

```env
BACKBLAZE_BUCKET_NAME=my-bucket
BACKBLAZE_ACCESS_KEY_ID=your-key-id
BACKBLAZE_SECRET_ACCESS_KEY=your-application-key
BACKBLAZE_BUCKET_URL=https://s3.us-west-004.backblazeb2.com
```

B2's console calls these two the *application key id* and *application key*;
`BACKBLAZE_APPLICATION_KEY_ID` and `BACKBLAZE_APPLICATION_KEY` are read too.

### Amazon S3

```env
AMAZON_BUCKET_NAME=my-bucket
AMAZON_ACCESS_KEY_ID=your-access-key-id
AMAZON_SECRET_ACCESS_KEY=your-secret-access-key
AMAZON_BUCKET_URL=https://s3.amazonaws.com
AMAZON_REGION=us-east-1
```

Or pass any of it to the constructor, which wins over the environment — the only
option on an edge runtime, where there is no `process.env` to read:

```ts
import { StorageManager } from "manage-storage";

const storage = new StorageManager({
  provider: "cloudflare",
  bucket: "my-bucket",
  accessKeyId: "runtime-key-id",
  secretAccessKey: "runtime-secret",
  endpoint: "https://account-id.r2.cloudflarestorage.com",
});
```

## API Reference

### `new StorageManager(config?)`

| Option            | Type                                     | Falls back to                                              |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `provider`        | `"amazon" \| "cloudflare" \| "backblaze"` | Auto-detected from the environment                         |
| `bucket`          | `string`                                 | `<PROVIDER>_BUCKET_NAME`                                   |
| `accessKeyId`     | `string`                                 | `<PROVIDER>_ACCESS_KEY_ID`                                 |
| `secretAccessKey` | `string`                                 | `<PROVIDER>_SECRET_ACCESS_KEY`                             |
| `endpoint`        | `string`                                 | `<PROVIDER>_BUCKET_URL`                                    |
| `region`          | `string`                                 | `AMAZON_REGION`, else `us-east-1`; R2 and B2 are `auto`     |
| `client`          | `S3Client`                               | A client built from the above — pass one to supply your own |

Credentials are checked on the first operation, not in the constructor, so a
manager can be created at module scope before `dotenv` has run. `storage.provider`
and `storage.bucket` report what it resolved to.

### Methods

| Method                                    | Returns             | Notes                                                            |
| ----------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `.upload(key, body, options?)`            | `UploadResult`      | `body` is a string, `Buffer`, `Uint8Array` or stream; `options.contentType` sets the stored MIME type |
| `.download(key)`                          | `string`            | UTF-8 text. Throws if the key does not exist                     |
| `.downloadBytes(key)`                     | `Uint8Array`        | For anything that is not text                                    |
| `.list(prefix?)`                          | `string[]`          | Every key, paginated to the end                                  |
| `.exists(key)`                            | `boolean`           | Exact key match, no download                                     |
| `.copy(key, destinationKey)`              | `CopyResult`        |                                                                  |
| `.rename(key, destinationKey)`            | `RenameResult`      | Copy then delete; not atomic                                     |
| `.delete(key)`                            | `DeleteResult`      | Deleting a missing key succeeds, as it does in S3                |
| `.deleteAll(prefix?)`                     | `DeleteAllResult`   | Irreversible. Batches of 1000                                    |

Also exported: `detectProvider()`, `resolveConfig(config)`, and the types
`Provider`, `StorageBody`, `StorageConfig`, `ResolvedConfig`, `UploadResult`,
`DeleteResult`, `DeleteAllResult`, `CopyResult`, `RenameResult`.

## Usage Examples

### 1. Upload Files

```ts
import { StorageManager } from "manage-storage";

const storage = new StorageManager();

// Text
await storage.upload("notes/memo.txt", "Hello, World!", {
  contentType: "text/plain",
});

// Buffer
const buffer: Buffer = Buffer.from("File contents");
await storage.upload("data/file.bin", buffer);

// JSON
await storage.upload("config/settings.json", JSON.stringify({ theme: "dark" }), {
  contentType: "application/json",
});
```

### 2. Download Files

```ts
const text: string = await storage.download("notes/memo.txt");
console.log(text); // "Hello, World!"

interface Settings {
  theme: "dark" | "light";
  lang: string;
}

const settings: Settings = JSON.parse(await storage.download("config/settings.json"));
console.log(settings.theme); // "dark"

// Binary stays binary.
const png: Uint8Array = await storage.downloadBytes("images/logo.png");
```

### 3. List Files

```ts
// Every key in the bucket, across as many pages as it takes.
const keys: string[] = await storage.list();

// Keys are flat strings — "notes/" is a prefix, not a folder — so filter server-side.
const notes: string[] = await storage.list("notes/");

if (await storage.exists("notes/memo.txt")) {
  // …
}
```

### 4. Copy, Rename and Delete

```ts
await storage.copy("documents/report.pdf", "documents/backup/report-2024.pdf");

// Rename is a copy followed by a delete, in that order: a failed copy leaves
// the original alone.
await storage.rename("temp/draft.md", "published/article.md");

await storage.delete("notes/memo.txt");

// Everything under a prefix. Irreversible.
const { count } = await storage.deleteAll("temp/");
console.log(`Deleted ${count} files`);
```

### 5. Two Providers at Once

Each manager holds its own bucket, so mirroring is two objects rather than a
flag on every call:

```ts
import { StorageManager } from "manage-storage";

const r2 = new StorageManager({ provider: "cloudflare" });
const b2 = new StorageManager({ provider: "backblaze" });

const key = "documents/report.pdf";
await b2.upload(key, await r2.downloadBytes(key));
```

### 6. Batch Operations

The methods are ordinary promises and nothing is rate-limited internally:

```ts
const files = [
  { key: "docs/file1.txt", content: "Content 1" },
  { key: "docs/file2.txt", content: "Content 2" },
];

await Promise.all(files.map((file) => storage.upload(file.key, file.content)));

const contents: string[] = await Promise.all(
  files.map((file) => storage.download(file.key)),
);
```

## Advanced Examples

### Next.js API Route

```ts
// app/api/upload/route.ts
import { StorageManager } from "manage-storage";

const storage = new StorageManager();

export async function POST(req: Request): Promise<Response> {
  const { fileName, fileContent } = (await req.json()) as {
    fileName: string;
    fileContent: string;
  };

  return Response.json(await storage.upload(`uploads/${fileName}`, fileContent));
}

export async function GET(req: Request): Promise<Response> {
  const fileName = new URL(req.url).searchParams.get("file");
  if (!fileName) return new Response("file is required", { status: 400 });

  const bytes = await storage.downloadBytes(`uploads/${fileName}`);

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
```

### Express.js Endpoint

```ts
import express, { type Request, type Response } from "express";
import { StorageManager } from "manage-storage";

const app = express();
const storage = new StorageManager();
app.use(express.json());

app.post("/api/files", async (req: Request, res: Response) => {
  try {
    const { key, content } = req.body as { key: string; content: string };
    res.json(await storage.upload(key, content));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/api/files", async (_req: Request, res: Response) => {
  res.json({ files: await storage.list() });
});

app.get("/api/files/:key", async (req: Request, res: Response) => {
  res.send(await storage.download(req.params.key));
});

app.delete("/api/files/:key", async (req: Request, res: Response) => {
  res.json(await storage.delete(req.params.key));
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Cloudflare Workers

A Worker has no `process.env`, so the bindings go to the constructor. Build the
manager per request — `env` is only available there:

```ts
import { StorageManager } from "manage-storage";

interface Env {
  CLOUDFLARE_BUCKET_NAME: string;
  CLOUDFLARE_ACCESS_KEY_ID: string;
  CLOUDFLARE_SECRET_ACCESS_KEY: string;
  CLOUDFLARE_BUCKET_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const storage = new StorageManager({
      provider: "cloudflare",
      bucket: env.CLOUDFLARE_BUCKET_NAME,
      accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
      endpoint: env.CLOUDFLARE_BUCKET_URL,
    });

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/upload") {
      const { key, content } = (await request.json()) as {
        key: string;
        content: string;
      };
      return Response.json(await storage.upload(key, content));
    }

    return new Response("Not found", { status: 404 });
  },
};
```

## Return Values

```ts
// upload / delete
{ success: true, key: "path/to/file.txt" }      // plus provider metadata (ETag, …)

// download
"File contents here..."

// list
["folder/file1.txt", "folder/file2.txt"]

// deleteAll
{ success: true, count: 42 }

// copy
{ success: true, sourceKey: "a.pdf", destinationKey: "b.pdf" }

// rename
{ success: true, oldKey: "old.txt", newKey: "new.txt" }
```

## Migrating from `manageStorage()`

The action-string function still ships and still works, so nothing breaks on
upgrade — it is deprecated, and delegates to `StorageManager`. The one breaking
change is the **default export**, which is now the class: `import manageStorage
from "manage-storage"` becomes `import { manageStorage } from "manage-storage"`.

| Before                                                       | After                                       |
| ------------------------------------------------------------ | ------------------------------------------- |
| `manageStorage("upload", { key, body })`                      | `storage.upload(key, body)`                 |
| `manageStorage("download", { key })`                          | `storage.download(key)`                     |
| `manageStorage("list")`                                       | `storage.list()`                            |
| `manageStorage("copy", { key, destinationKey })`              | `storage.copy(key, destinationKey)`         |
| `manageStorage("rename", { key, destinationKey })`            | `storage.rename(key, destinationKey)`       |
| `manageStorage("delete", { key })`                            | `storage.delete(key)`                       |
| `manageStorage("deleteAll")`                                  | `storage.deleteAll()`                       |
| `{ provider, BUCKET_NAME, ACCESS_KEY_ID, … }` on every call   | `new StorageManager({ provider, bucket, accessKeyId, … })` once |

What the class fixes rather than renames:

- **Credentials are resolved once.** The old function rebuilt a client on every
  call, which is why every call had to repeat the credentials.
- **`list()` and `deleteAll()` finish.** The old versions issued one request and
  returned the first 1000 keys, which looked like success on a larger bucket.
- **Required arguments are in the signature.** `upload` cannot be called without
  a body, and `copy` cannot be called without a destination, at compile time
  rather than as a runtime throw.

## Why AWS SDK v3?

This library uses the official [@aws-sdk/client-s3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/) because:

- **Modern Architecture**: Modular SDK with tree-shakable imports
- **Command Pattern**: Clean, consistent API design
- **S3-Compatible**: Works with S3, R2, B2, and any S3-compatible service
- **Official Support**: Direct support from AWS with regular updates
- **Production Ready**: Battle-tested in enterprise environments
- **Minified Output**: Terser minification reduces bundle size

# Cloud Object Storage Comparison

| Service                                                         | Storage price (/TB-month)      | Egress to internet                                                                        | API ops (Class A/B per 1K, approx)                                                 | Minimum duration                                            | Notes                                                              |
| --------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| [Backblaze B2](https://www.backblaze.com/cloud-storage/pricing) | **$6**                         | [Free up to 3x stored/mo](https://www.backblaze.com/cloud-storage/pricing), then $0.01/GB | [Free quotas](https://www.backblaze.com/cloud-storage/pricing); then ~$0.004/10K B | [None](https://www.backblaze.com/cloud-storage/pricing)     | Lowest storage; generous egress.                                   |
| [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/)  | **$15**                        | [**Zero**](https://www.cloudflare.com/pg-cloudflare-r2-vs-aws-s3/)                        | [~$4.50/M A; $0.36/M B](https://developers.cloudflare.com/r2/pricing/)             | None                                                        | No bandwidth bills.                                                |
| [AWS S3 Standard](https://aws.amazon.com/s3/pricing/)           | **$23**                        | [Tiered ~$0.09/GB first 10TB](https://www.nops.io/blog/aws-s3-pricing/)                   | [~$5/M A; $0.4/M B](https://aws.amazon.com/s3/pricing/)                            | None                                                        | Ecosystem premium.                                                 |
| [Google GCS Standard](https://cloud.google.com/storage/pricing) | **$20-26** (region/dual/multi) | [Tiered ~$0.08-0.12/GB worldwide](https://cloud.google.com/storage/pricing)               | [$5/1K A; $0.4/1K B (Standard)](https://cloud.google.com/storage/pricing)          | [None (Standard)](https://cloud.google.com/storage/pricing) | Multi-region ~$26; cheaper classes available (Nearline $10, etc.). |

## Feature comparison

| Aspect               | Backblaze B2                                                                            | Cloudflare R2                                                                                   | AWS S3                                                                | Google GCS                                                                        |
| -------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Ecosystem**        | [Standalone; partners (Fastly, Vultr)](https://www.backblaze.com/cloud-storage/pricing) | [Cloudflare Workers/CDN/Zero Trust](https://www.cloudflare.com/developer-platform/products/r2/) | [Full AWS (Lambda, EC2, Athena)](https://aws.amazon.com/s3/pricing/)  | [Full GCP (GKE, BigQuery, AI/ML)](https://cloud.google.com/storage/pricing)       |
| **Storage classes**  | [Single hot](https://www.backblaze.com/cloud-storage/pricing)                           | [Single](https://developers.cloudflare.com/r2/pricing/)                                         | [Many (IA, Glacier, Intelligent)](https://aws.amazon.com/s3/pricing/) | [Standard, Nearline, Coldline, Archive](https://cloud.google.com/storage/pricing) |
| **S3 compatibility** | [Strong](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2)                         | [Excellent (99% ops)](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2)                    | [Native](https://aws.amazon.com/s3/pricing/)                          | [Strong](https://cloud.google.com/storage/pricing)                                |
| **Lifecycle mgmt**   | [Basic rules](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2)                    | [Basic expiration](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2)                       | [Advanced](https://aws.amazon.com/s3/pricing/)                        | [Advanced, Autoclass](https://cloud.google.com/storage/pricing)                   |
| **Object Lock**      | [Yes (compliance/gov)](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2)           | [Limited](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2)                                | [Yes](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2)          | [Yes (via retention)](https://cloud.google.com/storage/pricing)                   |
| **Free tier**        | [First 10GB](https://www.backblaze.com/cloud-storage/pricing)                           | [10GB storage, 1M Class A/mo](https://developers.cloudflare.com/r2/pricing/)                    | [Limited](https://aws.amazon.com/s3/pricing/)                         | 5GB-months Standard                                                               |

## Core use-case fit

- **[Backblaze B2](https://www.backblaze.com/cloud-storage)**: [Cheapest for bulk/hot storage](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2) with moderate egress (backups, media archives); simple, [no vendor lock-in](https://www.backblaze.com/cloud-storage).
- **[Cloudflare R2](https://developers.cloudflare.com/r2/pricing/)**: [Public-facing assets/images/APIs](https://www.cloudflare.com/pg-cloudflare-r2-vs-aws-s3/) with high traffic; [zero egress](https://www.cloudflare.com/developer-platform/products/r2/) saves big on [web delivery](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2).
- **[AWS S3](https://aws.amazon.com/s3/pricing/)**: [AWS-centric apps](https://www.nops.io/blog/aws-s3-pricing/) needing [advanced analytics, replication, compliance](https://cloudian.com/blog/5-components-of-aws-s3-storage-pricing/); [pay for features/ecosystem](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2).
- **[Google GCS](https://cloud.google.com/storage/pricing)**: [GCP workloads](https://cloud.google.com/storage/pricing) (BigQuery, AI, Kubernetes); [multi-region needs](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2) or tiered classes for cost optimization.

Backblaze wins on raw storage cost, R2 on bandwidth-heavy apps, while AWS/GCS suit enterprise ecosystems with richer tools. For exact costs, use [calculators](https://r2-calculator.cloudflare.com) with your workload (e.g., [TB stored](https://www.backblaze.com/cloud-storage/pricing), [TB egress](https://onidel.com/blog/cloudflare-r2-vs-backblaze-b2), [ops volume](https://aws.amazon.com/s3/pricing/)).

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
