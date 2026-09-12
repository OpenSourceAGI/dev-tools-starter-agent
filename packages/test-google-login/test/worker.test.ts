import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_HEADER } from "../src/secret.js";
import {
  GoogleLoginBrowser,
  handleRequest,
  setPuppeteer,
  type BrowserLike,
  type Env,
} from "../src/worker.js";
import { FakeBrowser, FakePage, FakeStorage, fakeElement, sampleState } from "./fixtures.js";

const SECRET = "a-long-random-shared-secret";

function request(url: string, init: RequestInit & { secret?: string | null } = {}) {
  const headers = new Headers(init.headers);
  if (init.secret !== null) headers.set(AUTH_HEADER, init.secret ?? SECRET);
  return new Request(`https://tgl.example.workers.dev${url}`, { ...init, headers });
}

function env(overrides: Partial<Env> = {}): Env {
  const stub = { fetch: vi.fn(async () => new Response("from the DO")) };

  return {
    BROWSER: { binding: true },
    BROWSER_SESSION: {
      idFromName: vi.fn((name: string) => ({ name })),
      get: vi.fn(() => stub),
    },
    TEST_AUTH_SECRET: SECRET,
    ...overrides,
  } as Env;
}

describe("handleRequest", () => {
  it("refuses every request when TEST_AUTH_SECRET is not configured", async () => {
    const response = await handleRequest(request("/health"), env({ TEST_AUTH_SECRET: undefined }));

    // The alternative is a Worker that serves an anonymous browser to anyone who
    // finds the URL, which is strictly worse than being broken.
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "not_configured" });
  });

  it("401s a missing or wrong secret, and says which header to use", async () => {
    for (const secret of [null, "wrong-secret"]) {
      const response = await handleRequest(request("/health", { secret }), env());

      expect(response.status).toBe(401);
      expect(response.headers.get("x-required-header")).toBe(AUTH_HEADER);
      // No hint about length, prefix, or which half was wrong.
      expect(await response.text()).toBe("Unauthorized");
    }
  });

  it("answers /health without waking a browser", async () => {
    const bindings = env();

    const response = await handleRequest(request("/health"), bindings);

    expect(await response.json()).toEqual({ ok: true });
    expect(bindings.BROWSER_SESSION.get).not.toHaveBeenCalled();
  });

  it("routes to the Durable Object named by ?session=", async () => {
    const bindings = env();

    await handleRequest(request("/check?session=signed-in", { method: "POST" }), bindings);

    expect(bindings.BROWSER_SESSION.idFromName).toHaveBeenCalledWith("signed-in");
  });

  it("defaults to one session named 'default'", async () => {
    const bindings = env();

    await handleRequest(request("/check", { method: "POST" }), bindings);

    expect(bindings.BROWSER_SESSION.idFromName).toHaveBeenCalledWith("default");
  });
});

describe("GoogleLoginBrowser", () => {
  let storage: FakeStorage;
  let browser: FakeBrowser;
  let page: FakePage;

  beforeEach(() => {
    storage = new FakeStorage();
    page = new FakePage();
    browser = new FakeBrowser(() => page);
    setPuppeteer({ launch: async () => browser as unknown as BrowserLike });
  });

  afterEach(() => {
    setPuppeteer(undefined);
  });

  const build = (overrides: Partial<Env> = {}) =>
    new GoogleLoginBrowser({ storage }, { ...env(overrides), ...overrides } as Env);

  const call = (object: GoogleLoginBrowser, url: string, init: RequestInit = {}) =>
    object.fetch(request(url, init));

  describe("POST /state", () => {
    it("validates on the way in and reports a summary, not the state", async () => {
      const response = await call(build(), "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body).toMatchObject({ stored: true });

      const serialized = JSON.stringify(body);
      for (const cookie of sampleState().cookies) expect(serialized).not.toContain(cookie.value);
    });

    it("rejects a malformed upload with the reason, not a CDP error later", async () => {
      const response = await call(build(), "/state", {
        method: "POST",
        body: JSON.stringify({ cookies: [{ name: "s", value: "v" }] }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ message: expect.stringContaining("has no domain") });
    });
  });

  describe("GET /state", () => {
    it("404s when nothing is stored", async () => {
      const response = await call(build(), "/state");

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ present: false });
    });

    it("never returns a live cookie value — only a redacted copy", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });

      const response = await call(object, "/state");
      const text = await response.text();

      // The single most important assertion in this file. There is no route that
      // reads the session back out, and adding one would turn this Worker into a
      // credential-exfiltration endpoint with a test-shaped name.
      for (const cookie of sampleState().cookies) expect(text).not.toContain(cookie.value);
      for (const entry of sampleState().origins[0].localStorage) expect(text).not.toContain(entry.value);

      expect(text).toContain("«redacted");
      expect(text).toContain("app_session");
    });
  });

  describe("DELETE /state", () => {
    it("removes the session and closes the browser with it", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      await call(object, "/check", {
        method: "POST",
        body: JSON.stringify({ url: "https://app.example.test/dashboard" }),
      });

      const response = await call(object, "/state", { method: "DELETE" });

      expect(await response.json()).toEqual({ cleared: true });
      expect(browser.closed).toBe(true);
      expect(await storage.get("storage-state")).toBeUndefined();
    });
  });

  describe("POST /check", () => {
    const checkBody = (extra: Record<string, unknown> = {}) =>
      JSON.stringify({ url: "https://app.example.test/dashboard", ...extra });

    it("requires a url", async () => {
      const response = await call(build(), "/check", { method: "POST", body: "{}" });

      expect(response.status).toBe(400);
    });

    it("409s with what to do when no session has been stored", async () => {
      const response = await call(build(), "/check", { method: "POST", body: checkBody() });

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: "no_state" });
    });

    it("replays the session, then reports where it landed", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });

      const response = await call(object, "/check", { method: "POST", body: checkBody() });
      const body = (await response.json()) as Record<string, unknown>;

      expect(body).toMatchObject({
        authenticated: true,
        status: 200,
        url: "https://app.example.test/dashboard",
        title: "Dashboard — Example",
      });
      expect(page.cookiesSet).toHaveLength(3);
    });

    it("calls a redirect to the login page what it is", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      page = new FakePage({ redirects: { "https://app.example.test/dashboard": "https://app.example.test/login" } });
      browser = new FakeBrowser(() => page);
      setPuppeteer({ launch: async () => browser as unknown as BrowserLike });

      const fresh = build();
      const response = await call(fresh, "/check", { method: "POST", body: checkBody({ rejectUrl: "/login" }) });

      // A 200 on the login page is the failure that otherwise reads as a pass.
      expect(await response.json()).toMatchObject({ authenticated: false, reason: expect.stringContaining("/login") });
    });

    it("checks the selector you name", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });

      const missing = await call(object, "/check", {
        method: "POST",
        body: checkBody({ expectSelector: "[data-testid=user-menu]" }),
      });
      expect(await missing.json()).toMatchObject({ authenticated: false });

      page.selectors.set("[data-testid=user-menu]", { tagName: "BUTTON" });
      const found = await call(object, "/check", {
        method: "POST",
        body: checkBody({ expectSelector: "[data-testid=user-menu]" }),
      });
      expect(await found.json()).toMatchObject({ authenticated: true, reason: expect.stringContaining("found") });
    });

    it("returns a screenshot only when asked", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });

      const without = (await (await call(object, "/check", { method: "POST", body: checkBody() })).json()) as Record<
        string,
        unknown
      >;
      expect(without).not.toHaveProperty("screenshot");

      const withShot = (await (
        await call(object, "/check", { method: "POST", body: checkBody({ screenshot: true }) })
      ).json()) as { screenshot: string };
      expect(withShot.screenshot).toBe("iVBORw==");
    });

    it("closes the page but keeps the browser — the whole point of the DO", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });

      await call(object, "/check", { method: "POST", body: checkBody() });
      await call(object, "/check", { method: "POST", body: checkBody() });

      expect(browser.closed).toBe(false);
      expect(page.callOrder.filter((method) => method === "close")).toHaveLength(2);
    });

    it("launches the browser once across several checks", async () => {
      const launch = vi.fn(async () => browser as unknown as BrowserLike);
      setPuppeteer({ launch });

      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      await call(object, "/check", { method: "POST", body: checkBody() });
      await call(object, "/check", { method: "POST", body: checkBody() });

      expect(launch).toHaveBeenCalledTimes(1);
    });

    it("pushes the idle alarm out after every check", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });

      await call(object, "/check", { method: "POST", body: checkBody() });
      const count = storage.alarms.length;
      await call(object, "/check", { method: "POST", body: checkBody() });

      expect(storage.alarms.length).toBeGreaterThan(count);
    });
  });

  describe("the idle alarm", () => {
    it("closes the browser, because an open session is billed", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      await call(object, "/check", {
        method: "POST",
        body: JSON.stringify({ url: "https://app.example.test/dashboard" }),
      });

      await object.alarm();

      expect(browser.closed).toBe(true);
    });

    it("is scheduled from BROWSER_IDLE_MINUTES", async () => {
      const object = new GoogleLoginBrowser({ storage }, { ...env(), BROWSER_IDLE_MINUTES: "10" } as Env);
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      await call(object, "/check", {
        method: "POST",
        body: JSON.stringify({ url: "https://app.example.test/dashboard" }),
      });

      expect(storage.alarms.at(-1)! - Date.now()).toBeGreaterThan(9 * 60_000);
    });

    it("falls back to 3 minutes for a nonsense value", async () => {
      const object = new GoogleLoginBrowser({ storage }, { ...env(), BROWSER_IDLE_MINUTES: "soon" } as Env);
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      await call(object, "/check", {
        method: "POST",
        body: JSON.stringify({ url: "https://app.example.test/dashboard" }),
      });

      const delay = storage.alarms.at(-1)! - Date.now();
      expect(delay).toBeGreaterThan(2.5 * 60_000);
      expect(delay).toBeLessThan(3.5 * 60_000);
    });

    it("survives a browser that is already gone", async () => {
      const object = build();
      await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
      await call(object, "/check", {
        method: "POST",
        body: JSON.stringify({ url: "https://app.example.test/dashboard" }),
      });
      browser.close = async () => {
        throw new Error("Browser session not found");
      };

      await expect(object.alarm()).resolves.toBeUndefined();
    });
  });

  describe("POST /login", () => {
    it("is disabled unless ALLOW_REAL_GOOGLE_LOGIN is exactly 'true'", async () => {
      for (const flag of [undefined, "1", "yes", "TRUE"]) {
        const response = await call(build({ ALLOW_REAL_GOOGLE_LOGIN: flag }), "/login", {
          method: "POST",
          body: JSON.stringify({ loginUrl: "https://app.example.test/login" }),
        });

        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ error: "disabled" });
      }
    });

    it("stays disabled with the flag on but no credentials", async () => {
      const response = await call(build({ ALLOW_REAL_GOOGLE_LOGIN: "true" }), "/login", {
        method: "POST",
        body: JSON.stringify({ loginUrl: "https://app.example.test/login" }),
      });

      expect(response.status).toBe(403);
    });

    it("never reveals the credentials it refuses to use", async () => {
      const response = await call(
        build({ ALLOW_REAL_GOOGLE_LOGIN: "false", GOOGLE_TEST_PASSWORD: "correct-horse" }),
        "/login",
        { method: "POST", body: JSON.stringify({ loginUrl: "https://app.example.test/login" }) },
      );

      expect(await response.text()).not.toContain("correct-horse");
    });
  });

  it("404s an unknown route with the method and path", async () => {
    const response = await call(build(), "/nope");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining("GET /nope") });
  });

  it("POST /close shuts the browser down on demand", async () => {
    const object = build();
    await call(object, "/state", { method: "POST", body: JSON.stringify(sampleState()) });
    await call(object, "/check", {
      method: "POST",
      body: JSON.stringify({ url: "https://app.example.test/dashboard" }),
    });

    expect(await (await call(object, "/close", { method: "POST" })).json()).toEqual({ closed: true });
    expect(browser.closed).toBe(true);
  });
});

describe("POST /login, with the flag on", () => {
  let storage: FakeStorage;
  let page: FakePage;
  let browser: FakeBrowser;

  const enabled = {
    ALLOW_REAL_GOOGLE_LOGIN: "true",
    GOOGLE_TEST_EMAIL: "e2e@example.test",
    GOOGLE_TEST_PASSWORD: "correct-horse-battery-staple",
  };

  const loginBody = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ loginUrl: "https://app.example.test/login", expectUrl: "/dashboard", ...extra });

  beforeEach(() => {
    storage = new FakeStorage();
    page = new FakePage();

    // Google's form, modelled just enough for the page functions to run: the
    // app's button hands off, and the final Next lands back on our own origin.
    page.selectors.set('a[href*="google"], button[data-provider="google"]', fakeElement());
    page.selectors.set("input[type=email]", fakeElement());
    page.selectors.set('input[type="email"]', fakeElement());
    page.selectors.set('input[type="password"]', fakeElement());
    page.selectors.set("#identifierNext button, #identifierNext", fakeElement());
    page.selectors.set(
      "#passwordNext button, #passwordNext",
      fakeElement(() => {
        void page.goto("https://app.example.test/dashboard");
      }),
    );

    browser = new FakeBrowser(() => page);
    setPuppeteer({ launch: async () => browser as unknown as BrowserLike });
  });

  afterEach(() => setPuppeteer(undefined));

  const object = () => new GoogleLoginBrowser({ storage }, { ...env(), ...enabled } as Env);

  it("requires a loginUrl", async () => {
    const response = await object().fetch(request("/login", { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
  });

  it("requires an expectUrl, and says why it is not defaulted", async () => {
    const response = await object().fetch(
      request("/login", { method: "POST", body: JSON.stringify({ loginUrl: "https://app.example.test/login" }) }),
    );

    // Defaulting it to the login page's origin would make every login "succeed":
    // the flow starts on that origin.
    expect(response.status).toBe(400);
    expect(await response.text()).toMatch(/login page is on that origin too/);
  });

  it("signs in, captures the session and stores it", async () => {
    const response = await object().fetch(request("/login", { method: "POST", body: loginBody() }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ stored: true });
    expect(await storage.get("storage-state")).toBeTruthy();
  });

  it("types the password through the element rather than into evaluate's source", async () => {
    await object().fetch(request("/login", { method: "POST", body: loginBody() }));

    // A password interpolated into a `page.evaluate` source string ends up in CDP
    // logs and in a trace. It must travel as an argument.
    const sources = page.calls
      .filter((call) => call.method === "evaluate")
      .map((call) => JSON.stringify(call.args));
    expect(sources.some((source) => source.includes(enabled.GOOGLE_TEST_PASSWORD))).toBe(true);

    const password = page.selectors.get('input[type="password"]') as { value: string; events: string[] };
    expect(password.value).toBe(enabled.GOOGLE_TEST_PASSWORD);
    // Frameworks that bind the field need these, or the form submits empty.
    expect(password.events).toEqual(["input", "change"]);
  });

  it("closes the page and pushes the alarm out even when the flow fails", async () => {
    page.selectors.delete('input[type="password"]');

    const response = await object().fetch(request("/login", { method: "POST", body: loginBody() }));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining("No element matched") });
    expect(page.callOrder).toContain("close");
    expect(storage.alarms).not.toHaveLength(0);
  });

  it("times out rather than clicking through a consent screen", async () => {
    page.selectors.set("#passwordNext button, #passwordNext", fakeElement());

    const response = await object().fetch(
      request("/login", { method: "POST", body: loginBody({ timeoutMs: 250 }) }),
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { message: string };
    expect(body.message).toMatch(/Timed out waiting for a URL containing/);
    expect(body.message).toMatch(/capture the session by hand/);
  });

  it("never leaks the password into the timeout message", async () => {
    page.selectors.set("#passwordNext button, #passwordNext", fakeElement());

    const response = await object().fetch(
      request("/login", { method: "POST", body: loginBody({ timeoutMs: 250 }) }),
    );

    expect(await response.text()).not.toContain(enabled.GOOGLE_TEST_PASSWORD);
  });
});
