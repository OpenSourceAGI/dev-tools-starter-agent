---
name: manage-storage
description: Guide to manage-storage (packages/manage-storage), the unified S3 / Cloudflare R2 / Backblaze B2 client — the StorageManager class and its upload/download/list/exists/copy/rename/delete/deleteAll methods, provider auto-detection from env vars, constructor credentials for Workers and serverless, and the deprecated manageStorage(action, options) function. Use when working with manage-storage or troubleshooting it — "missing credentials", credentials that work locally but not on the edge, wrong bucket or region, 403/SignatureDoesNotMatch, downloads coming back as the wrong type, list returning nothing or stopping at 1000 keys, or migrating a caller off manageStorage().
---

# Working With manage-storage

The library in `packages/manage-storage`, published as **`manage-storage`**. One
class, `StorageManager`, built on `@aws-sdk/client-s3` and pointed at whichever
S3-compatible provider the environment configures. Exact signatures and return
shapes live in [API.md](API.md).

## Setup

Two pieces:

1. **Credentials**, per provider, as env vars — the provider is auto-detected
   from whichever prefix has all four set, checked Cloudflare → Backblaze → Amazon:

```env
CLOUDFLARE_BUCKET_NAME=…  CLOUDFLARE_ACCESS_KEY_ID=…  CLOUDFLARE_SECRET_ACCESS_KEY=…  CLOUDFLARE_BUCKET_URL=https://<account>.r2.cloudflarestorage.com
BACKBLAZE_BUCKET_NAME=…   BACKBLAZE_ACCESS_KEY_ID=…   BACKBLAZE_SECRET_ACCESS_KEY=…   BACKBLAZE_BUCKET_URL=https://s3.us-west-004.backblazeb2.com
AMAZON_BUCKET_NAME=…      AMAZON_ACCESS_KEY_ID=…      AMAZON_SECRET_ACCESS_KEY=…      AMAZON_BUCKET_URL=https://s3.amazonaws.com  AMAZON_REGION=us-east-1
```

2. **One manager** — `import { StorageManager } from "manage-storage"`, then
   `const storage = new StorageManager()`. ESM, TypeScript declarations bundled.
   Credentials resolve in the constructor but are only *checked* on the first
   operation, so constructing at module scope before `dotenv` runs is fine.

## Picking the right call

| You want | Call |
| --- | --- |
| Store bytes | `storage.upload(key, body)` — `body` is a string, `Buffer`, `Uint8Array` or stream; `{ contentType }` is the third argument |
| Read text back | `storage.download(key)` — UTF-8 string |
| Read bytes back | `storage.downloadBytes(key)` — `Uint8Array`, for anything not text |
| Every key | `storage.list()` — paginated to the end, not just the first 1000 |
| Keys in one "folder" | `storage.list("documents/")` — a prefix, filtered server-side |
| Check one key | `storage.exists(key)` — exact match, no download |
| Duplicate an object | `storage.copy(key, destinationKey)` |
| Move an object | `storage.rename(key, destinationKey)` — copy then delete |
| Remove one object | `storage.delete(key)` |
| Empty a bucket or prefix | `storage.deleteAll()` / `storage.deleteAll("temp/")` — irreversible |
| A specific provider when several are configured | `new StorageManager({ provider: "cloudflare" })` |
| Credentials that aren't in `process.env` | `new StorageManager({ bucket, accessKeyId, secretAccessKey, endpoint })` |
| Two buckets at once | Two managers. Each holds its own provider and bucket |
| To know what it resolved to | `storage.provider`, `storage.bucket`, `storage.config` |

## Recipes

**Edge and Workers runtimes** — there is no `process.env` to detect from, and
`env` only exists inside the handler, so build the manager per request:

```ts
const storage = new StorageManager({
  provider: "cloudflare",
  bucket: env.CLOUDFLARE_BUCKET_NAME,
  accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
  endpoint: env.CLOUDFLARE_BUCKET_URL,
});
await storage.upload(key, content);
```

**Folders** — there are none. Keys are flat strings; `documents/report.pdf` just
contains a slash. `list("documents/")` filters by prefix at the API rather than
pulling every key down first.

**Batching** — the methods are independent promises, so
`Promise.all(files.map(f => storage.upload(f.key, f.body)))` is the whole story.
Nothing is rate-limited internally.

**JSON round-trip** — upload `JSON.stringify(obj)`, parse what `download`
returns. Nothing is serialized for you.

**Mirroring providers** — one manager each, and `downloadBytes` between them:
`await b2.upload(key, await r2.downloadBytes(key))`.

**Injecting a client** — `new StorageManager({ client })` takes a pre-built
`S3Client`, which is how the test suite asserts the commands sent without hitting
a network, and how you supply retry or credential-provider options this class
does not expose.

## Migrating a caller off `manageStorage()`

The function is deprecated but still exported and still delegates to the class,
so nothing breaks on upgrade. Rewrite call sites as:
`manageStorage("upload", { key, body })` → `storage.upload(key, body)`, with the
credentials that were repeated in every option bag moving into one constructor.
The one breaking change is the default export, now the class — a caller doing
`import manageStorage from "manage-storage"` must switch to the named import.

Worth knowing when you migrate: the class fixed two things the function got
wrong rather than just renaming them. `list` and `deleteAll` now paginate (the
function returned the first 1000 keys and reported success), and required
arguments are in the signatures instead of being runtime throws.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `Missing credentials for <provider>: …` | The error names the exact env vars it could not find. Either none of the three prefixes is fully set, or `.env` is loaded after the first operation. Set all four for one provider, or pass them to the constructor. |
| Works locally, fails on Cloudflare Workers / Vercel Edge | Auto-detection reads `process.env`, which edge runtimes don't populate. Pass credentials to the constructor (see recipe above). |
| The wrong bucket or provider is used | Two providers are configured and detection picked the first complete one (Cloudflare, then Backblaze, then Amazon). Pass `provider` explicitly. `storage.provider` and `storage.bucket` say what it chose. |
| `403` / `SignatureDoesNotMatch` | Key/secret mismatch, or `endpoint` points at the wrong account or region. R2's endpoint is account-scoped (`https://<account_id>.r2.cloudflarestorage.com`); B2's is region-scoped (`s3.us-west-004.…`). The thrown message names the provider and bucket it failed against. |
| B2 credentials look right and still fail | B2's console labels them *application key id* and *application key*. Both spellings are read (`BACKBLAZE_APPLICATION_KEY_ID` / `BACKBLAZE_APPLICATION_KEY`) — but use the app key, not the master key. |
| `NoSuchBucket` | The bucket doesn't exist in that account — the library doesn't create buckets. |
| `PermanentRedirect` / region errors on S3 | `AMAZON_REGION` (or `region`) doesn't match the bucket's region. Only S3 uses it; R2 and B2 are always `auto`. |
| `download` returns mangled text | It decodes as UTF-8. For images, archives or anything binary use `downloadBytes`, which returns the `Uint8Array` unchanged. |
| `list` comes back empty on a non-empty bucket | The credentials point at a different bucket, or the prefix doesn't match — prefixes are exact string matches, so `"documents"` and `"documents/"` differ. `list` returns keys only, no sizes or timestamps. |
| `list` looks like it's missing files | It shouldn't any more: it follows the continuation token. If you are on an older release, `manageStorage("list")` stopped at the first 1000 keys. |
| `rename` left both copies | It is copy-then-delete and not atomic, so an interrupted call can. Nothing is deleted unless the copy succeeded, so the original is never the half that's lost. |
| `deleteAll` deleted more than expected | With no prefix it empties the whole bucket. Pass a prefix, and remember it is irreversible. |
| Bundler complains about `@aws-sdk/client-s3` size | It's a real dependency, not inlined. Keep it external in serverless bundles rather than trying to tree-shake the client away. |
