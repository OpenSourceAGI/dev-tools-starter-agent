/**
 * The setup project. Pick one of the two bodies below.
 *
 * **Verify a hand-captured session** (the default, and what a laptop should do):
 * no credentials anywhere, no Google traffic, and a sub-millisecond check.
 *
 * **Mint your app's own session** (what CI should do): your app creates the same
 * session a successful Google callback creates, so the run holds one secret of
 * yours instead of a Google password.
 */
import { test as setup } from "@playwright/test";
import { bootstrapAppSession, requireStoredSession } from "test-google-login";

const SECRET = process.env.E2E_TEST_AUTH_SECRET;

setup("an authenticated session is available", async ({ page, context, request }) => {
  if (SECRET) {
    // CI path. Regenerates state every run, so nothing persists between jobs.
    const file = await bootstrapAppSession({
      request,
      page,
      context,
      secret: SECRET,
      endpoint: process.env.E2E_TEST_AUTH_ENDPOINT ?? "/api/test-auth/google-user",
      landingPath: "/dashboard",
    });

    console.log(`minted a fresh app session → ${file}`);
    return;
  }

  // Local path. Throws with the exact `playwright codegen` command on the first
  // run, which is the whole onboarding story for a new contributor.
  const summary = requireStoredSession({ baseUrl: process.env.E2E_BASE_URL });

  console.log(
    `session ok — ${summary.cookieCount} cookies across ${summary.domains.join(", ")}` +
      (summary.expiresInSeconds === null
        ? " (no expiry; dies with the browser)"
        : `, earliest expiry in ${Math.round(summary.expiresInSeconds / 60)} min`),
  );
});
