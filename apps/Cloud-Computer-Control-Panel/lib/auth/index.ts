import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { BetterAuthPlugin } from "better-auth"
import { oneTap, openAPI, magicLink, anonymous } from "better-auth/plugins"
import { db } from "../db"
import * as schema from "../db/schema"
import { APP_NAME, APP_EMAIL, NEXT_PUBLIC_BASE_URL } from "../constants"

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.AUTH_RESEND_KEY
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

/** Magic links need an email sender; without a Resend key the plugin is left off
 *  so sign-in falls back to email + password and Google. */
function magicLinkPlugin(): BetterAuthPlugin[] {
  if (!RESEND_API_KEY) return []

  return [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Imported lazily so the app runs without the optional email dependency configured.
        const { Resend } = await import("resend")
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: `${APP_NAME} <${APP_EMAIL || "noreply@example.com"}>`,
          to: email,
          subject: `Sign in to ${APP_NAME}`,
          html: `<p>Click the link below to sign in to ${APP_NAME}:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes.</p>`,
        })
      },
      expiresIn: 300,
      disableSignUp: false,
    }),
  ]
}

async function authBuilder() {
  return betterAuth({
    baseURL: NEXT_PUBLIC_BASE_URL,
    // Extra origins allowed to post to the auth endpoints, e.g. behind a proxy.
    trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      // Our tables are `users`/`sessions`/`accounts`/`verifications`;
      // better-auth looks for the singular names unless told otherwise.
      usePlural: true,
    }),
    // Works with no third-party configuration - the default way into a
    // self-hosted control panel.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    socialProviders: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
    },
    plugins: [
      ...(GOOGLE_CLIENT_ID ? [oneTap()] : []),
      openAPI(),
      anonymous(),
      ...magicLinkPlugin(),
    ],
  })
}

type AuthInstance = Awaited<ReturnType<typeof authBuilder>>

let authInstance: AuthInstance | null = null

export async function initAuth(): Promise<AuthInstance> {
  if (!authInstance) {
    authInstance = await authBuilder()
  }
  return authInstance
}

// Lazy proxy — auth is not initialized at module load (safe for CF Workers).
// Supports auth.handler(req) and auth.api.method(...) call patterns.
export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  has() {
    return true
  },
  get(_, prop) {
    const key = prop as string
    return new Proxy(
      async (...args: unknown[]) => {
        const instance = await initAuth()
        return (instance as any)[key](...args)
      },
      {
        has() {
          return true
        },
        get(_, subProp) {
          const sub = subProp as string
          if (sub === "then" || sub === "catch" || sub === "finally") return undefined
          return async (...args: unknown[]) => {
            const instance = await initAuth()
            return (instance as any)[key][sub](...args)
          }
        },
      },
    )
  },
})
