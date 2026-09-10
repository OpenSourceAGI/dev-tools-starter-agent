---
name: manage-storage
description: Guide to manage-storage (packages/manage-storage), the unified S3 / Cloudflare R2 / Backblaze B2 client — provider auto-detection from env vars, the single manageStorage(action, options) call, upload/download/list/copy/rename/delete/deleteAll, runtime credential overrides for Workers and serverless, and return shapes. Use when working with manage-storage or troubleshooting it — "no provider configured", credentials that work locally but not on the edge, wrong bucket or region, 403/SignatureDoesNotMatch, downloads coming back as the wrong type, or list returning nothing.
---

# Working With manage-storage

The library in `packages/manage-storage`, published as **`manage-storage`**. One function, `manageStorage(action, options)`, built on `@aws-sdk/client-s3` and pointed at whichever S3-compatible provider your environment configures. Exact option and return types live in [API.md](API.md).

## Setup

Two pieces:

1. **Credentials**, per provider, as env vars — the provider is auto-detected from whichever prefix is present:

```env
CLOUDFLARE_BUCKET_NAME=…  CLOUDFLARE_ACCESS_KEY_ID=…  CLOUDFLARE_SECRET_ACCESS_KEY=…  CLOUDFLARE_BUCKET_URL=https://<account>.r2.cloudflarestorage.com
BACKBLAZE_BUCKET_NAME=…   BACKBLAZE_ACCESS_KEY_ID=…   BACKBLAZE_SECRET_ACCESS_KEY=…   BACKBLAZE_BUCKET_URL=https://s3.us-west-004.backblazeb2.com
AMAZON_BUCKET_NAME=…      AMAZON_ACCESS_KEY_ID=…      AMAZON_SECRET_ACCESS_KEY=…      AMAZON_BUCKET_URL=https://s3.amazonaws.com  AMAZON_REGION=us-east-1
```

2. **The import** — `import { manageStorage } from "manage-storage"` (also available as the default export). ESM, TypeScript types bundled.

## Picking the right call

| You want | Call |
| --- | --- |
| Store bytes | `manageStorage("upload", { key, body })` — `body` is a string, Buffer, or stream |
| Read bytes back | `manageStorage("download", { key })` — resolves to the content |
| Every key in the bucket | `manageStorage("list")` — returns `string[]`, no options needed |
| Duplicate an object | `manageStorage("copy", { key, destinationKey })` |
| Move an object | `manageStorage("rename", { key, destinationKey })` — copy then delete |
| Remove one object | `manageStorage("delete", { key })` |
| Empty the bucket | `manageStorage("deleteAll")` — returns `{ success, count }`; irreversible |
| A specific provider when several are configured | add `provider: "cloudflare" \| "amazon" \| "backblaze"` |
| Credentials that aren't in `process.env` | add `BUCKET_NAME`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `BUCKET_URL` to the options |

## Recipes

**Edge and Workers runtimes** — there is no `process.env` to detect from, so pass everything explicitly from the request's `env` binding:

```js
await manageStorage("upload", {
  key, body: content,
  provider: "cloudflare",
  BUCKET_NAME: env.CLOUDFLARE_BUCKET_NAME,
  ACCESS_KEY_ID: env.CLOUDFLARE_ACCESS_KEY_ID,
  SECRET_ACCESS_KEY: env.CLOUDFLARE_SECRET_ACCESS_KEY,
  BUCKET_URL: env.CLOUDFLARE_BUCKET_URL,
});
```

**Folders** — there are none. Keys are flat strings; `documents/report.pdf` just contains a slash. Filter client-side: `(await manageStorage("list")).filter(k => k.startsWith("documents/"))`.

**Batching** — the calls are independent promises, so `Promise.all(files.map(f => manageStorage("upload", f)))` is the whole story. Nothing is rate-limited internally.

**JSON round-trip** — upload `JSON.stringify(obj)`, parse what `download` returns. Nothing is serialized for you.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| "No storage provider configured" / provider undefined | None of the three env prefixes are fully set, or `.env` isn't loaded before the first call. Set all four vars for one provider, or pass `provider` + the runtime credential options. |
| Works locally, fails on Cloudflare Workers / Vercel Edge | Env-var auto-detection reads `process.env`, which edge runtimes don't populate. Pass credentials in the options object (see recipe above). |
| The wrong bucket or provider is used | Two providers are configured and detection picked the other one. Pass `provider` explicitly — it overrides detection. |
| `403` / `SignatureDoesNotMatch` | Key/secret mismatch, or `BUCKET_URL` points at the wrong account or region endpoint. R2's endpoint is account-scoped (`https://<account_id>.r2.cloudflarestorage.com`); B2's is region-scoped (`s3.us-west-004.…`). |
| `NoSuchBucket` | `*_BUCKET_NAME` is a bucket that doesn't exist in that account — the library doesn't create buckets. |
| `PermanentRedirect` / region errors on S3 | `AMAZON_REGION` doesn't match the bucket's region. Set it to the bucket's actual region. |
| Download returns something other than a string | The body is streamed from the SDK; treat the result as content to hand along (e.g. straight into a `Response`) rather than assuming a `string` in every runtime. Parse only after you've confirmed the shape. |
| `list` comes back empty on a non-empty bucket | The credentials point at a different bucket, or the key prefix you expect lives under another account. Also note `list` returns keys only — no sizes or timestamps. |
| `copy`/`rename` fails | `destinationKey` is missing, or the source key doesn't exist. `rename` is copy-then-delete and is not atomic — an interrupted call can leave both copies. |
| Bundler complains about `@aws-sdk/client-s3` size | It's a real dependency, not inlined. Keep it external in serverless bundles rather than trying to tree-shake the client away. |
