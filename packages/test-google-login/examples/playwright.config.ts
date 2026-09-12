/**
 * The setup-project layout: capture (or verify) the session once, then every
 * browser project starts signed in.
 *
 * Copy this next to your tests. The two projects matter — `chromium` declares
 * `dependencies: ["auth-setup"]`, so Playwright runs the setup once per run
 * rather than once per test file, and a failure there fails fast with a message
 * that says what to do instead of timing out on a login form.
 */
import { defineConfig, devices } from "@playwright/test";
import { DEFAULT_AUTH_FILE } from "test-google-login";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "auth-setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        // Imported rather than written out, so the config and the CLI cannot
        // drift onto different paths — which looks exactly like an expired session.
        storageState: DEFAULT_AUTH_FILE,
      },
    },
  ],
});
