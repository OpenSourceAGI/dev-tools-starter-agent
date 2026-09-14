/**
 * The test-only endpoint `bootstrapAppSession` calls — the piece that lives in
 * *your* app, not in this package.
 *
 * Written for a Next.js route handler; the shape is the same anywhere. Four
 * things are not optional:
 *
 * 1. **It must not exist in production.** The 404 below is the floor, not the
 *    ceiling — prefer excluding the file from the production build entirely, and
 *    write a deployment test that asserts the route 404s in prod.
 * 2. **It must require a strong secret**, compared in constant time.
 * 3. **It must create the same session** a real Google callback creates: same
 *    format, same claims, same roles, same cookie attributes. A subtly different
 *    session turns your whole suite into a test of a code path that never ships.
 * 4. **It must not accept a user id from the request** beyond what you are
 *    willing to let any caller with the secret create.
 */
import { constantTimeEqual } from "test-google-login";

// Stand-ins for your app's own modules.
declare const db: {
  user: {
    upsert(args: Record<string, unknown>): Promise<{ id: string }>;
  };
};
declare function createSessionForUser(userId: string): Promise<{ id: string }>;
declare function buildSessionCookie(session: { id: string }): string;

export async function POST(request: Request): Promise<Response> {
  // Defence in depth. The real protection is this file not being in the bundle.
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  if (!constantTimeEqual(request.headers.get("x-e2e-auth-secret"), process.env.E2E_TEST_AUTH_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await db.user.upsert({
    where: { email: "google-e2e@example.test" },
    create: {
      email: "google-e2e@example.test",
      name: "Google E2E User",
      googleSubject: "google-e2e-subject-001",
      emailVerified: true,
    },
    update: {},
  });

  const session = await createSessionForUser(user.id);

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": buildSessionCookie(session),
    },
  });
}
