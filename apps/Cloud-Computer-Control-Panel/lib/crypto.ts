/**
 * Envelope encryption for secrets kept in the database (cloud provider secret
 * keys, third-party API keys).
 *
 * Uses WebCrypto AES-256-GCM so the same code runs under Node and on Cloudflare
 * Workers. The key is derived from CREDENTIALS_ENCRYPTION_KEY (falling back to
 * BETTER_AUTH_SECRET) — rotate either one and previously stored secrets can no
 * longer be read, so users must re-enter them.
 */

const VERSION = "v1"

function getSecretMaterial(): string {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET

  if (!secret) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY (or BETTER_AUTH_SECRET) must be set to store cloud credentials. " +
        "Generate one with: openssl rand -base64 32",
    )
  }

  return secret
}

/** True when the server is configured to store secrets at all. */
export function canEncrypt(): boolean {
  return Boolean(process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET)
}

let keyPromise: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const material = new TextEncoder().encode(getSecretMaterial())
      // AES-256 needs exactly 32 bytes; hash whatever length the secret is.
      const digest = await crypto.subtle.digest("SHA-256", material)
      return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
      ])
    })()
  }
  return keyPromise
}

function toBase64(bytes: Uint8Array<ArrayBufferLike>): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Seal a plaintext secret into a "v1.<iv>.<ciphertext>" string. */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  )

  return [VERSION, toBase64(iv), toBase64(new Uint8Array(ciphertext))].join(".")
}

/** Unseal a value produced by encryptSecret. Throws if the key changed. */
export async function decryptSecret(sealed: string): Promise<string> {
  const [version, ivB64, ciphertextB64] = sealed.split(".")

  if (version !== VERSION || !ivB64 || !ciphertextB64) {
    throw new Error("Stored secret is not in a recognized format")
  }

  const key = await getKey()
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    key,
    fromBase64(ciphertextB64),
  )

  return new TextDecoder().decode(plaintext)
}

/** "AKIAIOSFODNN7EXAMPLE" -> "AKIA••••••••••AMPLE" — safe to send to a browser. */
export function maskKey(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length)
  return `${value.slice(0, 4)}${"•".repeat(Math.max(4, value.length - 9))}${value.slice(-5)}`
}
