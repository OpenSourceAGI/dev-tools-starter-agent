import { describe, expect, it } from "vitest";

import {
  applyLocalStorage,
  applyStorageState,
  extractStorageState,
  fromPuppeteerCookies,
  storageStateOrigins,
  toPuppeteerCookies,
} from "../src/puppeteer-state.js";
import { SESSION_COOKIE_EXPIRES } from "../src/state-core.js";
import type { PageLike } from "../src/types.js";
import { FakePage, NOW_SECONDS, sampleState } from "./fixtures.js";

const asPage = (page: FakePage) => page as unknown as PageLike;

describe("toPuppeteerCookies", () => {
  it("omits the expiry of a session cookie instead of sending -1", () => {
    const converted = toPuppeteerCookies(sampleState());
    const session = converted.find((cookie) => cookie.name === "csrf");

    // CDP reads `expires: -1` as an expiry in 1969 and silently drops the cookie.
    // The key must be absent, not negative.
    expect(session).not.toHaveProperty("expires");
    expect(Object.keys(session!)).not.toContain("expires");
  });

  it("keeps a real expiry", () => {
    const converted = toPuppeteerCookies(sampleState());

    expect(converted.find((cookie) => cookie.name === "app_session")!.expires).toBe(NOW_SECONDS + 12 * 3600);
  });

  it("carries domain, path, flags and sameSite through unchanged", () => {
    const converted = toPuppeteerCookies(sampleState());

    expect(converted.find((cookie) => cookie.name === "SID")).toMatchObject({
      domain: ".google.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
  });
});

describe("fromPuppeteerCookies", () => {
  it("turns a session cookie back into -1", () => {
    const [cookie] = fromPuppeteerCookies([
      { name: "csrf", value: "v", domain: "app.test", path: "/", httpOnly: false, secure: true, session: true },
    ]);

    expect(cookie.expires).toBe(SESSION_COOKIE_EXPIRES);
  });

  it("treats a missing expiry as a session cookie", () => {
    const [cookie] = fromPuppeteerCookies([
      { name: "csrf", value: "v", domain: "app.test", path: "/", httpOnly: false, secure: false },
    ]);

    expect(cookie.expires).toBe(SESSION_COOKIE_EXPIRES);
  });

  it("normalises the sameSite values CDP actually returns", () => {
    const cookies = fromPuppeteerCookies([
      { name: "a", value: "v", domain: "d", path: "/", httpOnly: false, secure: false, sameSite: "lax" as never },
      {
        name: "b",
        value: "v",
        domain: "d",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "unspecified" as never,
      },
      { name: "c", value: "v", domain: "d", path: "/", httpOnly: false, secure: false },
    ]);

    expect(cookies.map((cookie) => cookie.sameSite)).toEqual(["Lax", "Lax", "Lax"]);
  });

  it("defaults an empty path to /", () => {
    const [cookie] = fromPuppeteerCookies([
      { name: "a", value: "v", domain: "d", path: "", httpOnly: false, secure: false },
    ]);

    expect(cookie.path).toBe("/");
  });

  it("round-trips a whole state without losing anything", () => {
    const state = sampleState();

    expect(fromPuppeteerCookies(toPuppeteerCookies(state))).toEqual(state.cookies);
  });
});

describe("storageStateOrigins", () => {
  it("lists the origins in file order", () => {
    expect(storageStateOrigins(sampleState())).toEqual(["https://app.example.test"]);
  });
});

describe("applyStorageState", () => {
  it("sets every cookie in one call, before any navigation", async () => {
    const page = new FakePage();

    await applyStorageState(asPage(page), sampleState());

    // One round trip, not three — and cookies first, or the first navigation
    // happens signed out and the app may respond with a redirect chain.
    expect(page.callOrder).toEqual(["setCookie", "goto", "evaluate"]);
    expect(page.calls.filter((call) => call.method === "setCookie")).toHaveLength(1);
    expect(page.cookiesSet).toHaveLength(3);
  });

  it("restores localStorage for the origin that owns it", async () => {
    const page = new FakePage();

    const result = await applyStorageState(asPage(page), sampleState());

    expect(result.originsRestored).toEqual(["https://app.example.test"]);
    expect(page.localStorageFor("https://app.example.test")).toEqual({
      access_token: "ya29.a0AfH6SMB-token",
      theme: "dark",
    });
  });

  it("navigates only as far as a document, not a full load", async () => {
    const page = new FakePage();

    await applyStorageState(asPage(page), sampleState());

    const goto = page.calls.find((call) => call.method === "goto");
    expect(goto!.args[1]).toMatchObject({ waitUntil: "domcontentloaded" });
  });

  it("costs no navigation when the state is cookies only", async () => {
    const page = new FakePage();

    await applyStorageState(asPage(page), sampleState({ origins: [] }));

    expect(page.callOrder).toEqual(["setCookie"]);
  });

  it("restores only the origins asked for", async () => {
    const page = new FakePage();
    const state = sampleState({
      origins: [
        ...sampleState().origins,
        { origin: "https://accounts.google.com", localStorage: [{ name: "g", value: "1" }] },
      ],
    });

    const result = await applyStorageState(asPage(page), state, { origins: ["https://app.example.test"] });

    // Navigating a test browser to accounts.google.com is slow and is exactly the
    // traffic that trips Google's own bot checks. Narrowing must actually narrow.
    expect(result.originsRestored).toEqual(["https://app.example.test"]);
    expect(page.calls.filter((call) => call.method === "goto").map((call) => call.args[0])).toEqual([
      "https://app.example.test",
    ]);
  });

  it("keeps the cookies it already set when one origin is unreachable", async () => {
    const page = new FakePage({ failOn: ["https://app.example.test"] });

    const result = await applyStorageState(asPage(page), sampleState());

    expect(result.cookiesSet).toBe(3);
    expect(result.originsRestored).toEqual([]);
    expect(result.skipped[0]).toMatchObject({ origin: "https://app.example.test" });
    expect(result.skipped[0].reason).toMatch(/ERR_CONNECTION_REFUSED/);
  });

  it("skips an origin with nothing stored for it, without navigating", async () => {
    const page = new FakePage();

    const result = await applyStorageState(asPage(page), {
      cookies: [],
      origins: [{ origin: "https://app.example.test", localStorage: [] }],
    });

    expect(result.skipped).toEqual([{ origin: "https://app.example.test", reason: "no localStorage entries" }]);
    expect(page.callOrder).toEqual([]);
  });

  it("explains the Puppeteer 23 cookie API move rather than failing obscurely", async () => {
    const page = new FakePage();
    const withoutSetCookie = { ...asPage(page), setCookie: undefined } as unknown as PageLike;

    await expect(applyStorageState(withoutSetCookie, sampleState())).rejects.toThrow(
      /browserContext\.setCookie/,
    );
  });
});

describe("applyLocalStorage", () => {
  it("does nothing at all for an empty list", async () => {
    const page = new FakePage();

    await applyLocalStorage(asPage(page), []);

    expect(page.callOrder).toEqual([]);
  });

  it("surfaces the SecurityError from writing storage on about:blank", async () => {
    const page = new FakePage();

    await expect(applyLocalStorage(asPage(page), [{ name: "a", value: "1" }])).rejects.toThrow(/SecurityError/);
  });
});

describe("extractStorageState", () => {
  it("captures cookies and the current origin's localStorage", async () => {
    const page = new FakePage();
    await applyStorageState(asPage(page), sampleState());

    const captured = await extractStorageState(asPage(page));

    expect(captured.cookies).toEqual(sampleState().cookies);
    expect(captured.origins).toEqual([
      {
        origin: "https://app.example.test",
        localStorage: [
          { name: "access_token", value: "ya29.a0AfH6SMB-token" },
          { name: "theme", value: "dark" },
        ],
      },
    ]);
  });

  it("captures no origin when the page never left about:blank", async () => {
    const page = new FakePage();

    const captured = await extractStorageState(asPage(page));

    expect(captured.origins).toEqual([]);
  });

  it("does not re-navigate when already on the requested origin", async () => {
    const page = new FakePage();
    await page.goto("https://app.example.test/dashboard");
    const before = page.calls.filter((call) => call.method === "goto").length;

    await extractStorageState(asPage(page), { origins: ["https://app.example.test"] });

    expect(page.calls.filter((call) => call.method === "goto")).toHaveLength(before);
  });

  it("still returns the cookies when an origin cannot be reached", async () => {
    const page = new FakePage({ failOn: ["https://gone.example.test"], cookies: toPuppeteerCookies(sampleState()) });

    const captured = await extractStorageState(asPage(page), { origins: ["https://gone.example.test"] });

    expect(captured.cookies).toHaveLength(3);
    expect(captured.origins).toEqual([]);
  });

  it("refuses a page that cannot read cookies", async () => {
    const page = new FakePage();
    const withoutCookies = { ...asPage(page), cookies: undefined } as unknown as PageLike;

    await expect(extractStorageState(withoutCookies)).rejects.toThrow(/cannot read cookies/);
  });
});

describe("a state captured by Playwright, replayed by Puppeteer", () => {
  it("survives the whole round trip unchanged", async () => {
    const original = sampleState();

    const first = new FakePage();
    await applyStorageState(asPage(first), original);

    const captured = await extractStorageState(asPage(first));

    const second = new FakePage();
    await applyStorageState(asPage(second), captured);

    expect(await extractStorageState(asPage(second))).toEqual(captured);
    expect(captured.cookies).toEqual(original.cookies);
  });
});
