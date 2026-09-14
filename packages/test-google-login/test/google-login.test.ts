import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ALLOW_REAL_LOGIN_ENV,
  BOOTSTRAP_HEADER,
  bootstrapAppSession,
  loadStorageStateFor,
  realGoogleLoginEnabled,
  requireStoredSession,
  signInWithGoogle,
} from "../src/google-login.js";
import { MissingStorageStateError, writeStorageState } from "../src/storage-state.js";
import { NOW_MS, NOW_SECONDS, sampleState } from "./fixtures.js";

let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "tgl-login-"));
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

/** A Playwright `context` that writes the state file the way Playwright does. */
function fakeContext(state: unknown = sampleState(), extra: Record<string, unknown> = {}) {
  const calls: { path?: string; indexedDB?: boolean }[] = [];

  return {
    calls,
    async storageState(options: { path?: string; indexedDB?: boolean } = {}) {
      calls.push(options);
      if (options.path) {
        fs.mkdirSync(path.dirname(options.path), { recursive: true });
        // Playwright writes 0644 and, with indexedDB: true, an extra top-level key.
        fs.writeFileSync(options.path, JSON.stringify({ ...(state as object), ...extra }), { mode: 0o644 });
        fs.chmodSync(options.path, 0o644);
      }
      return state;
    },
  };
}

function fakePage() {
  const visited: string[] = [];
  const clicks: unknown[] = [];
  const fills: [unknown, string][] = [];
  let current = "http://localhost:3000/login";

  const locator = (label: unknown) => ({
    async click() {
      clicks.push(label);
      // The app's button hands off to Google; Google hands back. Modelled so the
      // URL wait in signInWithGoogle has something real to observe.
      current = clicks.length === 1 ? "https://accounts.google.com/o/oauth2/auth" : current;
    },
    async fill(value: string) {
      fills.push([label, value]);
    },
  });

  return {
    visited,
    clicks,
    fills,
    waited: [] as (string | RegExp)[],
    async goto(url: string) {
      visited.push(url);
      current = url;
      return null;
    },
    url: () => current,
    async waitForURL(url: string | RegExp) {
      this.waited.push(url);
      current = "http://localhost:3000/dashboard";
    },
    getByRole: (_role: string, options?: { name?: string | RegExp }) => locator(options?.name),
    getByLabel: (text: string | RegExp) => locator(text),
  };
}

describe("requireStoredSession", () => {
  it("returns a summary for a usable session", () => {
    const file = path.join(cwd, "playwright/.auth/google-test-user.json");
    writeStorageState(file, sampleState());

    const summary = requireStoredSession({ cwd, file, now: NOW_MS });

    expect(summary.cookieCount).toBe(3);
    expect(summary.usable).toBe(true);
  });

  it("throws the codegen command when no session has been captured yet", () => {
    expect(() => requireStoredSession({ cwd, baseUrl: "http://localhost:5173" })).toThrow(
      MissingStorageStateError,
    );
    expect(() => requireStoredSession({ cwd, baseUrl: "http://localhost:5173" })).toThrow(
      /playwright codegen --save-storage=/,
    );
  });

  it("throws with the age of the lapse when the session has expired", () => {
    const file = path.join(cwd, "state.json");
    writeStorageState(file, {
      cookies: [{ ...sampleState().cookies[0], expires: NOW_SECONDS - 2 * 3600 }],
      origins: [],
    });

    expect(() => requireStoredSession({ cwd, file, now: NOW_MS })).toThrow(/expired 120 minutes ago/);
  });
});

describe("bootstrapAppSession", () => {
  const okResponse = { ok: () => true, status: () => 200, text: async () => "" };

  it("posts the secret in the documented header and never in the URL or body", async () => {
    const post = vi.fn(async () => okResponse);
    const page = fakePage();
    const context = fakeContext();
    const file = path.join(cwd, "playwright/.auth/state.json");

    await bootstrapAppSession({
      request: { post },
      page,
      context,
      cwd,
      file,
      secret: "super-secret",
    } as never);

    const [url, options] = post.mock.calls[0] as unknown as [string, { headers: Record<string, string>; data: unknown }];
    expect(url).toBe("/api/test-auth/google-user");
    expect(options.headers[BOOTSTRAP_HEADER]).toBe("super-secret");
    // A secret in a query string lands in access logs and in browser history.
    expect(url).not.toContain("super-secret");
    expect(JSON.stringify(options.data)).not.toContain("super-secret");
  });

  it("navigates the page so the app's origin is in the context before capturing", async () => {
    const page = fakePage();
    const context = fakeContext();

    await bootstrapAppSession({
      request: { post: async () => okResponse },
      page,
      context,
      cwd,
      file: path.join(cwd, "state.json"),
      secret: "s",
      landingPath: "/app/home",
    } as never);

    expect(page.visited).toEqual(["/app/home"]);
    expect(context.calls[0]).toMatchObject({ path: path.join(cwd, "state.json"), indexedDB: true });
  });

  it("leaves the file Playwright wrote intact but tightens it to 0600", async () => {
    const file = path.join(cwd, "state.json");
    const context = fakeContext(sampleState(), { indexedDB: [{ name: "keyval" }] });

    await bootstrapAppSession({
      request: { post: async () => okResponse },
      page: fakePage(),
      context,
      cwd,
      file,
      secret: "s",
    } as never);

    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    // Round-tripping through this package's own writer would have dropped this —
    // and with it whatever the auth library keeps in IndexedDB.
    expect(JSON.parse(fs.readFileSync(file, "utf8")).indexedDB).toEqual([{ name: "keyval" }]);
  });

  it("refuses to run without a secret rather than calling the endpoint open", async () => {
    const post = vi.fn(async () => okResponse);

    await expect(
      bootstrapAppSession({
        request: { post },
        page: fakePage(),
        context: fakeContext(),
        cwd,
      } as never),
    ).rejects.toThrow(/needs the shared secret/);

    expect(post).not.toHaveBeenCalled();
  });

  it("explains a 401 and a 404 differently, because they mean different things", async () => {
    for (const [status, expected] of [
      [401, /401/],
      [404, /404/],
    ] as const) {
      await expect(
        bootstrapAppSession({
          request: {
            post: async () => ({ ok: () => false, status: () => status, text: async () => "nope" }),
          },
          page: fakePage(),
          context: fakeContext(),
          cwd,
          secret: "s",
        } as never),
      ).rejects.toThrow(expected);
    }
  });

  it("includes the response body, truncated, so the failure is debuggable", async () => {
    await expect(
      bootstrapAppSession({
        request: {
          post: async () => ({ ok: () => false, status: () => 500, text: async () => "x".repeat(900) }),
        },
        page: fakePage(),
        context: fakeContext(),
        cwd,
        secret: "s",
      } as never),
    ).rejects.toThrow(/x{400}(?!x)/);
  });
});

describe("realGoogleLoginEnabled", () => {
  const credentials = { GOOGLE_TEST_EMAIL: "e2e@example.test", GOOGLE_TEST_PASSWORD: "pw" };

  it.each(["1", "true", "TRUE"])("is on for %j with credentials present", (flag) => {
    expect(realGoogleLoginEnabled({ [ALLOW_REAL_LOGIN_ENV]: flag, ...credentials })).toBe(true);
  });

  it.each(["0", "false", "yes", ""])("stays off for %j", (flag) => {
    expect(realGoogleLoginEnabled({ [ALLOW_REAL_LOGIN_ENV]: flag, ...credentials })).toBe(false);
  });

  it("stays off when the flag is set but credentials are missing", () => {
    expect(realGoogleLoginEnabled({ [ALLOW_REAL_LOGIN_ENV]: "1" })).toBe(false);
    expect(realGoogleLoginEnabled({ [ALLOW_REAL_LOGIN_ENV]: "1", GOOGLE_TEST_EMAIL: "e@x.test" })).toBe(false);
  });

  it("stays off for an empty environment", () => {
    expect(realGoogleLoginEnabled({})).toBe(false);
  });
});

describe("signInWithGoogle", () => {
  const env = {
    [ALLOW_REAL_LOGIN_ENV]: "1",
    GOOGLE_TEST_EMAIL: "e2e@example.test",
    GOOGLE_TEST_PASSWORD: "correct horse battery staple",
  };

  it("refuses without the opt-in, and points at the safer path", async () => {
    await expect(
      signInWithGoogle({ page: fakePage(), context: fakeContext(), env: {}, cwd } as never),
    ).rejects.toThrow(/not enabled/);

    await expect(
      signInWithGoogle({ page: fakePage(), context: fakeContext(), env: {}, cwd } as never),
    ).rejects.toThrow(/playwright codegen/);
  });

  it("does not touch the page when it refuses", async () => {
    const page = fakePage();

    await expect(
      signInWithGoogle({ page, context: fakeContext(), env: {}, cwd } as never),
    ).rejects.toThrow();

    expect(page.visited).toEqual([]);
    expect(page.clicks).toEqual([]);
  });

  it("drives the flow and captures the state when opted in", async () => {
    const page = fakePage();
    const context = fakeContext();
    const file = path.join(cwd, "state.json");

    const written = await signInWithGoogle({ page, context, env, cwd, file } as never);

    expect(written).toBe(file);
    expect(page.visited).toEqual(["/login"]);
    // app sign-in button, then Next twice.
    expect(page.clicks).toHaveLength(3);
    expect(page.fills.map(([, value]) => value)).toEqual([env.GOOGLE_TEST_EMAIL, env.GOOGLE_TEST_PASSWORD]);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it("waits for its own origin rather than clicking through a consent screen", async () => {
    const page = fakePage();

    await signInWithGoogle({
      page,
      context: fakeContext(),
      env,
      cwd,
      file: path.join(cwd, "state.json"),
      expectUrl: /my-app/,
    } as never);

    expect(page.waited).toEqual([/my-app/]);
  });

  it("lets Google's labels be overridden, because Google changes them", async () => {
    const page = fakePage();

    await signInWithGoogle({
      page,
      context: fakeContext(),
      env,
      cwd,
      file: path.join(cwd, "state.json"),
      googleSelectors: { email: /correo/i, password: /contraseña/i, next: /siguiente/i },
    } as never);

    expect(page.fills.map(([label]) => String(label))).toEqual(["/correo/i", "/contraseña/i"]);
  });
});

describe("loadStorageStateFor", () => {
  it("reads the state for passing to browser.newContext", () => {
    const file = path.join(cwd, "state.json");
    writeStorageState(file, sampleState());

    expect(loadStorageStateFor({ cwd, file })).toEqual(sampleState());
  });
});
