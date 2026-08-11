# verify-phone-sms API Reference

## HTTP endpoints

Auth applies to `/api/*`: `X-API-Key: <key>` or `Authorization: Bearer <key>`. Rate limit: 100 requests per IP per 15 minutes.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | no | Service info + endpoint index |
| `GET` | `/health` | no | Health check |
| `GET` | `/docs` | no | Swagger UI over the generated OpenAPI 3.0 doc |
| `POST` | `/api/send` | yes | Send a verification code |
| `POST` | `/api/verify` | yes | **Mock** — always returns `verified: true` |
| `POST` | `/api/sms` | yes | Send an arbitrary SMS |

### `POST /api/send`

```json
{
  "phoneNumber": "+1234567890",
  "code": "123456",
  "blockVoip": true,
  "senderId": "MyApp",
  "messageTemplate": "Your code is: {code}",
  "smsType": "Transactional"
}
```

Only `phoneNumber` is required; `code` is generated when omitted. Response: `{ success, message, messageId, code, phoneNumber, expiresIn }`.

### `POST /api/verify`

```json
{ "phoneNumber": "+1234567890", "code": "123456" }
```

Response: `{ success: true, message, verified: true }` — unconditionally, until you implement storage.

### `POST /api/sms`

```json
{ "phoneNumber": "+1234567890", "message": "Hello", "senderId": "MyApp", "smsType": "Transactional" }
```

Response: `{ success, message, messageId, phoneNumber }`.

### Errors

`{ success: false, error, details }` with `400` (bad input), `401` (bad key), `429` (rate limited), `500` (server).

## `verifyPhone(options)`

Default export of `src/verify-phone.ts`. Returns `Promise<VerifyPhoneResult>`.

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `phoneNumber` | `string` | required | E.164 recommended (`+1234567890`) |
| `code` | `string` | required | Sent as-is; not generated for you |
| `accessKeyId` | `string` | env | AWS access key |
| `secretAccessKey` | `string` | env | AWS secret |
| `awsRegion` | `string` | `us-east-1` | |
| `blockVoip` | `boolean` | `false` | Reject VoIP numbers |
| `voipDetectionMethod` | `"api" \| "libphonenumber"` | `"api"` | External lookup vs local heuristics |
| `useLibPhoneNumber` | `boolean` | `false` | Parse/format with libphonenumber-js |
| `metadataType` | `"minimal" \| "full"` | `"minimal"` | 75 KB heuristics vs 140 KB type detection |
| `senderId` | `string` | `"Verify"` | Max 11 chars |
| `smsType` | `"Transactional" \| "Promotional"` | `"Transactional"` | |
| `messageTemplate` | `string` | `"Your verification code is: {code}."` | `{code}` placeholder |

```ts
interface VerifyPhoneResult {
  success: boolean;
  message?: string;
  messageId?: string;
  code?: string;
  phoneNumber?: string;
  expiresIn?: number;
  error?: string;
  details?: string;
  isVoip?: boolean;
}
```

Also exported: `isPhoneNumberVoip(phone: string): Promise<boolean>`, and `createApp(env?)` / the default Hono `app` from `verify-phone-server.ts`.

## Environment variables

| Variable | Default | Required |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | — | yes |
| `AWS_SECRET_ACCESS_KEY` | — | yes |
| `AWS_REGION` | `us-east-1` | no |
| `API_KEY` | — | yes |
| `SMS_SENDER_ID` | `Verify` | no |

## Scripts

`dev` (wrangler dev) · `deploy` / `deploy:staging` / `deploy:production` · `deploy:docs*` · `deploy:all*` · `test` / `test:run` / `test:ui` (vitest) · `typecheck` · `scripts/deploy.sh [env] [api|docs]`.
