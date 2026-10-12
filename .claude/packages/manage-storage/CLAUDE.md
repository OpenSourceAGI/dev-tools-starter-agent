# CLAUDE.md — `manage-storage`

**skill:** [`skills/manage-storage`](../../../skills/manage-storage/SKILL.md)
· **runner:** Vitest · **build:** Vite (`dist/manage-storage.js`)

One `StorageManager` API over **AWS S3, Backblaze B2, Cloudflare R2 and Google
Cloud Storage** (via its S3-compatible XML API and HMAC keys), with
provider detection and edge-friendly credentials.

## Rules

- **The four providers are not interchangeable in the details.** Endpoint
  style, multipart thresholds, presigned-URL expiry limits and error shapes all
  differ. GCS has no multi-object delete and rejects the SDK's default checksum headers.
  A change that only exercises S3 is a quarter of a change — say in the PR
  which providers you actually verified.
- **Credentials are the whole risk surface.** Never log a key, never put one in
  a fixture, never widen the scope of a presigned URL to make a test pass.
- It must keep working on edge runtimes (no Node `fs`, no long-lived
  credentials assumed).

- `demo/` is the live demo (`bun run dev`): shadcn/ui settings panel, with
  every operation run by a server route — `demo/server/storage-api.ts`, served
  by Vite middleware locally and `api/storage.ts` on Vercel. Not published.

```bash
cd packages/manage-storage && bun run test && bun run build
bun run typecheck:demo && bun run build:demo
```
