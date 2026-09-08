import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { cloudCredentials } from "@/lib/db/schema"
import { decryptSecret, encryptSecret, maskKey } from "@/lib/crypto"
import { getUserId } from "@/lib/auth/session"
import { DB_CREDENTIALS, DEFAULT_AWS_REGION, ENV_CREDENTIALS } from "@/lib/constants"

export type CredentialSource = "request" | "database" | "environment"

export interface ResolvedCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
  source: CredentialSource
}

export interface CredentialHints {
  /** Value the browser sent: a real key, "db", "env", or nothing. */
  accessKeyId?: string | null
  secretAccessKey?: string | null
  region?: string | null
}

function isSentinel(value: string | null | undefined): boolean {
  return !value || value === DB_CREDENTIALS || value === ENV_CREDENTIALS || value === "server-env"
}

/** The signed-in user's stored AWS credentials, decrypted. */
export async function getStoredCredentials(
  userId: string,
  provider = "aws",
): Promise<ResolvedCredentials | null> {
  const [row] = await db
    .select()
    .from(cloudCredentials)
    .where(and(eq(cloudCredentials.userId, userId), eq(cloudCredentials.provider, provider)))
    .limit(1)

  if (!row) return null

  return {
    accessKeyId: row.accessKeyId,
    secretAccessKey: await decryptSecret(row.secretAccessKeyEncrypted),
    region: row.region || DEFAULT_AWS_REGION,
    source: "database",
  }
}

/**
 * Work out which AWS credentials a request should run under, in priority order:
 *
 *   1. Real keys sent with the request (kept for backwards compatibility and
 *      for the "try before you save" flow).
 *   2. The signed-in user's keys, stored encrypted in the database. This is the
 *      normal path — the browser only ever sends the "db" sentinel.
 *   3. The server's own AWS_* environment variables, for single-tenant installs.
 *
 * Returns null when nothing is available, so callers can answer 401/400.
 */
export async function resolveAwsCredentials(
  hints: CredentialHints = {},
): Promise<ResolvedCredentials | null> {
  const region = hints.region || process.env.AWS_REGION || DEFAULT_AWS_REGION

  if (!isSentinel(hints.accessKeyId) && !isSentinel(hints.secretAccessKey)) {
    return {
      accessKeyId: hints.accessKeyId as string,
      secretAccessKey: hints.secretAccessKey as string,
      region,
      source: "request",
    }
  }

  if (hints.accessKeyId !== ENV_CREDENTIALS) {
    try {
      const userId = await getUserId()
      if (userId) {
        const stored = await getStoredCredentials(userId)
        if (stored) {
          // An explicit region on the request still wins over the saved one.
          return { ...stored, region: hints.region || stored.region }
        }
      }
    } catch (error) {
      console.error("[cccp] Failed to load stored credentials:", error)
    }
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region,
      source: "environment",
    }
  }

  return null
}

/** Same as resolveAwsCredentials, reading the x-aws-* headers some routes use. */
export async function resolveAwsCredentialsFromHeaders(
  headers: Headers,
  fallbackRegion?: string | null,
): Promise<ResolvedCredentials | null> {
  return resolveAwsCredentials({
    accessKeyId: headers.get("x-aws-access-key-id"),
    secretAccessKey: headers.get("x-aws-secret-access-key"),
    region: headers.get("x-aws-region") || fallbackRegion,
  })
}

/** Insert or replace the signed-in user's credentials for a provider. */
export async function saveCredentials(params: {
  userId: string
  accessKeyId: string
  secretAccessKey: string
  region?: string
  label?: string
  provider?: string
}) {
  const provider = params.provider || "aws"
  const now = new Date()
  const secretAccessKeyEncrypted = await encryptSecret(params.secretAccessKey)

  const [existing] = await db
    .select({ id: cloudCredentials.id })
    .from(cloudCredentials)
    .where(and(eq(cloudCredentials.userId, params.userId), eq(cloudCredentials.provider, provider)))
    .limit(1)

  const values = {
    accessKeyId: params.accessKeyId,
    secretAccessKeyEncrypted,
    region: params.region || DEFAULT_AWS_REGION,
    label: params.label || "Default",
    updatedAt: now,
  }

  if (existing) {
    await db.update(cloudCredentials).set(values).where(eq(cloudCredentials.id, existing.id))
    return existing.id
  }

  const id = crypto.randomUUID()
  await db.insert(cloudCredentials).values({
    id,
    userId: params.userId,
    provider,
    isDefault: true,
    createdAt: now,
    ...values,
  })

  return id
}

/** Delete the signed-in user's credentials for a provider. */
export async function deleteCredentials(userId: string, provider = "aws") {
  await db
    .delete(cloudCredentials)
    .where(and(eq(cloudCredentials.userId, userId), eq(cloudCredentials.provider, provider)))
}

/** What the browser is allowed to see: the key id, masked, and never the secret. */
export async function describeCredentials(userId: string, provider = "aws") {
  const [row] = await db
    .select()
    .from(cloudCredentials)
    .where(and(eq(cloudCredentials.userId, userId), eq(cloudCredentials.provider, provider)))
    .limit(1)

  if (!row) return null

  return {
    provider: row.provider,
    label: row.label,
    region: row.region,
    accessKeyIdMasked: maskKey(row.accessKeyId),
    lastVerifiedAt: row.lastVerifiedAt,
    updatedAt: row.updatedAt,
  }
}
