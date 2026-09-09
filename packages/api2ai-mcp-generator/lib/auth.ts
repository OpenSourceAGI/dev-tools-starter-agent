import { betterAuth } from "better-auth";
import { siwe } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import { randomBytes } from "crypto";
import { verifyMessage } from "ethers";
import { SiweMessage } from "siwe";

import { stripe } from "@better-auth/stripe"
import Stripe from "stripe"
import { plans, type Plan } from "./payments/plans";
import { headers } from "next/headers";

// Lazy Stripe client initialization to avoid build-time errors
let _stripeClient: Stripe | null = null
function getStripeClient() {
  if (!_stripeClient) {
    _stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || 'placeholder', {
      typescript: true
    })
  }
  return _stripeClient
}

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL?.split("//")[1] || "localhost:3000";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  // basePath: "/api/auth", // better-auth defaults to this, but keeping it explicit if user wants
  // better-auth rejects a secret shorter than 32 characters, and the previous
  // 15-character placeholder tripped that on every build with no secret set —
  // including CI, where it turned static generation into a page of errors.
  // Set BETTER_AUTH_SECRET (`openssl rand -base64 32`) anywhere real; this
  // value only exists so a local run without one still boots.
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "development-only-insecure-secret-do-not-use-in-production",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      walletAddress: schema.walletAddresses,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }
  },
  plugins: [
    siwe({
      // Enable anonymous mode so email is not required
      // Users can sign in with just their Ethereum wallet
      anonymous: true,
      domain: APP_DOMAIN,
      getNonce: async () => {
        // Generate a cryptographically secure random nonce
        return randomBytes(32).toString("hex");
      },
      verifyMessage: async ({ message, signature }) => {
        try {
          // Parse the SIWE message
          const siweMessage = new SiweMessage(message);

          // Verify the signature and get the recovered address
          const recoveredAddress = verifyMessage(message, signature);

          // Check if the recovered address matches the address in the SIWE message
          const isValid = recoveredAddress.toLowerCase() === siweMessage.address.toLowerCase();

          if (!isValid) {
            console.error("Address mismatch:", {
              recovered: recoveredAddress,
              expected: siweMessage.address
            });
          }

          return isValid;
        } catch (error) {
          console.error("Message verification failed:", error);
          return false;
        }
      },
    }),

    stripe({
      get stripeClient() {
        return getStripeClient()
      },
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: plans,
        getCheckoutSessionParams: async ({ user, plan }) => {
          const checkoutSession: {
            params: {
              subscription_data?: {
                trial_period_days: number
              }
            }
          } = {
            params: {}
          }

          if (user.trialAllowed) {
            checkoutSession.params.subscription_data = {
              trial_period_days: (plan as Plan).trialDays
            }
          }

          return checkoutSession
        },
        onSubscriptionComplete: async ({ event }) => {
          const eventDataObject = event.data.object as Stripe.Checkout.Session
          // const userId = eventDataObject.metadata?.userId // Example usage
        }
      }
    })

  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 days
    updateAge: 60 * 60 * 24 * 3, // 1 day
  },
});

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user



export async function getActiveSubscription() {
  const nextHeaders = await headers()
  const subscriptions = await auth.api.listActiveSubscriptions({
    headers: nextHeaders
  })
  return subscriptions.find((s) => s.status === "active")
}
