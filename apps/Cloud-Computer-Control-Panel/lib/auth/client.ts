import { createAuthClient } from "better-auth/react"
import { oneTapClient, magicLinkClient, anonymousClient } from "better-auth/client/plugins"
import { NEXT_PUBLIC_BASE_URL } from "../constants"

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export const authClient = createAuthClient({
  baseURL: NEXT_PUBLIC_BASE_URL,
  plugins: [
    // One Tap only works with a configured Google client, so it is registered
    // conditionally — otherwise it throws on mount.
    ...(googleClientId
      ? [
          oneTapClient({
            clientId: googleClientId,
            additionalOptions: {
              use_fedcm_for_prompt: false,
            },
          }),
        ]
      : []),
    magicLinkClient(),
    anonymousClient(),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient

export const hasGoogleSignIn = Boolean(googleClientId)
