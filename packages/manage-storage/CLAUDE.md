# CLAUDE.md — `manage-storage`

**skill:** [`skills/manage-storage`](../../skills/manage-storage/SKILL.md)
· **runner:** Vitest · **build:** Vite (`dist/manage-storage.js`)

One `StorageManager` API over **AWS S3, Backblaze B2 and Cloudflare R2**, with
provider detection and edge-friendly credentials.

## Rules

- **The three providers are not interchangeable in the details.** Endpoint
  style, multipart thresholds, presigned-URL expiry limits and error shapes all
  differ. A change that only exercises S3 is a third of a change — say in the PR
  which providers you actually verified.
- **Credentials are the whole risk surface.** Never log a key, never put one in
  a fixture, never widen the scope of a presigned URL to make a test pass.
- It must keep working on edge runtimes (no Node `fs`, no long-lived
  credentials assumed).

```bash
cd packages/manage-storage && bun run test && bun run build
```
