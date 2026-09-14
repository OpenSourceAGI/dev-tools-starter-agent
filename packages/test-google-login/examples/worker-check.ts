/**
 * Driving the Durable Object from a test, so one captured session can be checked
 * against a deployed environment from Cloudflare's network.
 *
 * Worth doing when "does the session work?" depends on where the request comes
 * from — geo-routed auth, Cloudflare Access in front of the app, a WAF rule that
 * treats your CI runner's IP differently from a real visitor.
 */
import { AUTH_HEADER, loadStorageStateFor } from "test-google-login";

const WORKER = process.env.TGL_WORKER_URL ?? "https://test-google-login.example.workers.dev";
const SECRET = process.env.TGL_WORKER_SECRET;

if (!SECRET) throw new Error("TGL_WORKER_SECRET is required.");

async function worker(path: string, body?: unknown) {
  const response = await fetch(`${WORKER}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { [AUTH_HEADER]: SECRET!, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`${path} → ${response.status}: ${await response.text()}`);
  return response.json();
}

// Upload the session captured locally. This is the one request that carries live
// cookies, so it goes over HTTPS to a Worker that only accepts the shared secret —
// and there is deliberately no route that reads them back out.
await worker("/state?session=signed-in", loadStorageStateFor());

const result = (await worker("/check?session=signed-in", {
  url: "https://app.example.test/dashboard",
  expectSelector: "[data-testid=user-menu]",
  rejectUrl: "/login",
  // Narrow the origins: restoring accounts.google.com storage means navigating a
  // datacentre browser to Google, which is slow and trips its risk checks.
  origins: ["https://app.example.test"],
  screenshot: true,
})) as { authenticated: boolean; reason: string; screenshot?: string };

console.log(result.authenticated ? `signed in — ${result.reason}` : `NOT signed in — ${result.reason}`);

// GET /state returns a redacted summary, never the values. Safe to log in CI.
console.log(await worker("/state?session=signed-in"));

// Close the browser rather than waiting for the idle alarm: an open Browser
// Rendering session is billed.
await worker("/close?session=signed-in", {});
