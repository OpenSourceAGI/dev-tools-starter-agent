# manage-storage API Reference

`new StorageManager(config?)` — one bucket, one object, a method per operation.

## Constructor

| Option | Type | Falls back to |
| --- | --- | --- |
| `provider` | `"amazon" \| "cloudflare" \| "backblaze"` | Auto-detected: the first prefix with all four vars set, checked Cloudflare → Backblaze → Amazon. |
| `bucket` | `string` | `<PROVIDER>_BUCKET_NAME` |
| `accessKeyId` | `string` | `<PROVIDER>_ACCESS_KEY_ID`, then `<PROVIDER>_APPLICATION_KEY_ID` |
| `secretAccessKey` | `string` | `<PROVIDER>_SECRET_ACCESS_KEY`, then `<PROVIDER>_APPLICATION_KEY` |
| `endpoint` | `string` | `<PROVIDER>_BUCKET_URL` (the S3 endpoint) |
| `region` | `string` | `AMAZON_REGION`, else `us-east-1`. R2 and B2 are always `auto` |
| `client` | `S3Client` | A client built from the above. Pass one for tests, or for retry / credential-provider options this class does not expose |

Credentials are resolved here and checked on the first operation, so constructing
before `dotenv` has run is safe. Properties: `provider`, `bucket`, `config`
(the resolved `ResolvedConfig`).

## Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `upload(key, body, options?)` | `UploadResult` | `body`: `string \| Buffer \| Uint8Array \| ReadableStream`. `options.contentType` sets the stored MIME type. |
| `download(key)` | `string` | UTF-8. Throws if the key is absent; `""` if the object is empty. |
| `downloadBytes(key)` | `Uint8Array` | For non-text objects. |
| `list(prefix?)` | `string[]` | Follows the continuation token, so it is not capped at 1000 keys. |
| `exists(key)` | `boolean` | Exact key match (a prefix hit on a longer key is not a match). |
| `copy(key, destinationKey)` | `CopyResult` | |
| `rename(key, destinationKey)` | `RenameResult` | Copy then delete, in that order. Not atomic. |
| `delete(key)` | `DeleteResult` | Deleting a missing key succeeds, as in S3. |
| `deleteAll(prefix?)` | `DeleteAllResult` | Irreversible. Lists, then deletes in batches of 1000. |

## Return shapes

| Type | Shape |
| --- | --- |
| `UploadResult` | `{ success: true, key, …provider metadata }` |
| `DeleteResult` | `{ success: true, key, …provider metadata }` |
| `DeleteAllResult` | `{ success: true, count }` |
| `CopyResult` | `{ success: true, sourceKey, destinationKey }` |
| `RenameResult` | `{ success: true, oldKey, newKey }` |

## Errors

Every failure is rethrown as
`manage-storage <operation> failed on <provider> bucket "<bucket>": <reason>`,
with the SDK's error kept as `cause`. Missing credentials throw
`Missing credentials for <provider>: <the env vars it could not find>`.

## Functions and types

`detectProvider()` — the provider the environment configures.
`resolveConfig(config?)` — the merged `ResolvedConfig` without building a client.

Types: `Provider`, `StorageBody`, `StorageConfig`, `ResolvedConfig`,
`UploadResult`, `DeleteResult`, `DeleteAllResult`, `CopyResult`, `RenameResult`.

## Environment variables

| Provider | Variables |
| --- | --- |
| Cloudflare R2 | `CLOUDFLARE_BUCKET_NAME`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_BUCKET_URL` |
| Backblaze B2 | `BACKBLAZE_BUCKET_NAME`, `BACKBLAZE_ACCESS_KEY_ID`, `BACKBLAZE_SECRET_ACCESS_KEY`, `BACKBLAZE_BUCKET_URL` |
| Amazon S3 | `AMAZON_BUCKET_NAME`, `AMAZON_ACCESS_KEY_ID`, `AMAZON_SECRET_ACCESS_KEY`, `AMAZON_BUCKET_URL`, `AMAZON_REGION` |

## Deprecated: `manageStorage(action, options?)`

Still exported and still working; it constructs a `StorageManager` per call.
The **default export is now the class**, so `import manageStorage from
"manage-storage"` must become `import { manageStorage } from "manage-storage"`.

| Action | Required options | Replacement |
| --- | --- | --- |
| `upload` | `key`, `body` | `storage.upload(key, body)` |
| `download` | `key` | `storage.download(key)` |
| `delete` | `key` | `storage.delete(key)` |
| `deleteAll` | — | `storage.deleteAll()` |
| `list` | — | `storage.list()` |
| `copy` | `key`, `destinationKey` | `storage.copy(key, destinationKey)` |
| `rename` | `key`, `destinationKey` | `storage.rename(key, destinationKey)` |

Its credential options (`BUCKET_NAME`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`,
`BUCKET_URL`, `awsRegion`, `provider`) map to the constructor's `bucket`,
`accessKeyId`, `secretAccessKey`, `endpoint`, `region`, `provider` — passed once
instead of on every call.

## Provider notes

- **R2** — zero egress fees; endpoint is `https://<account_id>.r2.cloudflarestorage.com`; region is effectively `auto`.
- **B2** — cheapest storage; endpoint is region-numbered (`s3.us-west-004.backblazeb2.com`); use the *application key*, not the master key.
- **S3** — `region` must match the bucket's region or requests get a `PermanentRedirect`.
