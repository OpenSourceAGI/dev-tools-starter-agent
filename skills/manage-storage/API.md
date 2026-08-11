# manage-storage API Reference

`manageStorage(action, options?)` — one overloaded function; the return type follows the action.

## Actions

| Action | Required options | Returns |
| --- | --- | --- |
| `upload` | `key`, `body` | `{ success: true, key, … }` |
| `download` | `key` | The object's content |
| `delete` | `key` | `{ success: true, key }` |
| `deleteAll` | — | `{ success: true, count }` |
| `list` | — | `string[]` of keys |
| `copy` | `key`, `destinationKey` | `{ success: true, sourceKey, destinationKey }` |
| `rename` | `key`, `destinationKey` | `{ success: true, oldKey, newKey }` |

## Options

| Option | Type | Notes |
| --- | --- | --- |
| `key` | `string` | Object key/path. Required except for `list` / `deleteAll`. |
| `destinationKey` | `string` | Target key for `copy` / `rename`. |
| `body` | `string \| Buffer \| Stream` | Upload payload. |
| `provider` | `"amazon" \| "cloudflare" \| "backblaze"` | Forces a provider; otherwise auto-detected from env. |
| `BUCKET_NAME` | `string` | Overrides `*_BUCKET_NAME`. |
| `ACCESS_KEY_ID` | `string` | Overrides `*_ACCESS_KEY_ID`. |
| `SECRET_ACCESS_KEY` | `string` | Overrides `*_SECRET_ACCESS_KEY`. |
| `BUCKET_URL` | `string` | Overrides `*_BUCKET_URL` (the S3 endpoint). |

## Environment variables

| Provider | Variables |
| --- | --- |
| Cloudflare R2 | `CLOUDFLARE_BUCKET_NAME`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_BUCKET_URL` |
| Backblaze B2 | `BACKBLAZE_BUCKET_NAME`, `BACKBLAZE_ACCESS_KEY_ID`, `BACKBLAZE_SECRET_ACCESS_KEY`, `BACKBLAZE_BUCKET_URL` |
| Amazon S3 | `AMAZON_BUCKET_NAME`, `AMAZON_ACCESS_KEY_ID`, `AMAZON_SECRET_ACCESS_KEY`, `AMAZON_BUCKET_URL`, `AMAZON_REGION` |

## Exported types

`Provider`, `Action`, `StorageOptions`, `UploadResult`, `DeleteResult`, `DeleteAllResult`, `CopyResult`, `RenameResult`.

## Provider notes

- **R2** — zero egress fees; endpoint is `https://<account_id>.r2.cloudflarestorage.com`; region is effectively `auto`.
- **B2** — cheapest storage; endpoint is region-numbered (`s3.us-west-004.backblazeb2.com`); use the *application key*, not the master key.
- **S3** — `AMAZON_REGION` must match the bucket's region or requests get a `PermanentRedirect`.
