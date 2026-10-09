import { createAuthClient } from "better-auth/react";
import {
  oneTapClient,
  magicLinkClient,
  anonymousClient,
} from "better-auth/client/plugins";
import {
  NEXT_PUBLIC_BASE_URL,
} from "../constants";

export const authClient = createAuthClient({
  baseURL: NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  plugins: [
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      additionalOptions: {
        use_fedcm_for_prompt: false,
      },
    }),
    magicLinkClient(),
    anonymousClient(),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;
