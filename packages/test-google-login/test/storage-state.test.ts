import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  InvalidStorageStateError,
  MissingStorageStateError,
  SESSION_COOKIE_EXPIRES,
  assertStorageStateUsable,
  findExpiringCookies,
  hardenStorageStateFile,
  isGoogleDomain,
  normalizeStorageState,
  parseStorageState,
  readStorageState,
  redactStorageState,
  summarizeStorageState,
  writeStorageState,
} from "../src/storage-state.js";
import { HOUR, NOW_MS, NOW_SECONDS, sampleState } from "./fixtures.js";

let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "tgl-state-"));
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

describe("normalizeStorageState", () => {
  it("fills in the fields an older or hand-edited file may omit", () => {
    const state = normalizeStorageState({
      cookies: [{ name: "s", value: "v", domain: "app.test" }],
    });

    expect(state.cookies[0]).toMatchObject({
      path: "/",
      expires: SESSION_COOKIE_EXPIRES,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    });
    expect(state.origins).toEqual([]);
  });

  it("re-capitalises a lowercase sameSite rather than passing it to CDP", () => {
    const state = normalizeStorageState({
      cookies: [{ name: "s", value: "v", domain: "app.test", sameSite: "strict" }],
    });

    expect(state.cookies[0].sameSite).toBe("Strict");
  });

  it("falls back to Lax for a sameSite CDP does not accept", () => {
    const state = normalizeStorageState({
      cookies: [{ name: "s", value: "v", domain: "app.test", sameSite: "unspecified" }],
    });

    expect(state.cookies[0].sameSite).toBe("Lax");
  });

  it("drops malformed localStorage entries instead of failing the whole file", () => {
    const state = normalizeStorageState({
      origins: [{ origin: "https://app.test", localStorage: [{ name: "ok", value: "1" }, null, { value: "no name" }] }],
    });

    expect(state.origins[0].localStorage).toEqual([{ name: "ok", value: "1" }]);
  });

  it.each([
    [null, "top level is not an object"],
    [[], "top level is not an object"],
    [{}, "neither `cookies` nor `origins` is present"],
    [{ cookies: "nope" }, "`cookies` is present but not an array"],
    [{ origins: {} }, "`origins` is present but not an array"],
    [{ cookies: [{ name: "s" }] }, "cookies[0] has no name/value pair"],
    [{ cookies: [{ name: "s", value: "v" }] }, "cookies[0] (s) has no domain"],
    [{ origins: [{ localStorage: [] }] }, "origins[0] has no origin"],
  ])("rejects %j", (input, message) => {
    expect(() => normalizeStorageState(input)).toThrow(InvalidStorageStateError);
    expect(() => normalizeStorageState(input)).toThrow(message);
  });
});

describe("parseStorageState", () => {
  it("names JSON as the problem when the file is not JSON", () => {
    expect(() => parseStorageState("<html>login</html>")).toThrow(/not valid JSON/);
  });
});

describe("summarizeStorageState", () => {
  it("describes the state without exposing a single value", () => {
    const state = sampleState();
    const summary = summarizeStorageState(state, { now: NOW_MS });

    const serialized = JSON.stringify(summary);
    for (const cookie of state.cookies) expect(serialized).not.toContain(cookie.value);
    for (const entry of state.origins[0].localStorage) expect(serialized).not.toContain(entry.value);
  });

  it("counts session cookies separately and reports the earliest real expiry", () => {
    const summary = summarizeStorageState(sampleState(), { now: NOW_MS });

    expect(summary.cookieCount).toBe(3);
    expect(summary.sessionCookies).toBe(1);
    expect(summary.earliestExpiry).toBe(NOW_SECONDS + 12 * HOUR);
    expect(summary.expiresInSeconds).toBe(12 * HOUR);
    expect(summary.expired).toBe(false);
    expect(summary.usable).toBe(true);
  });

  it("lists domains, cookie names and localStorage keys, sorted", () => {
    const summary = summarizeStorageState(sampleState(), { now: NOW_MS });

    expect(summary.domains).toEqual([".google.com", "app.example.test"]);
    expect(summary.cookieNames).toEqual(["SID", "app_session", "csrf"]);
    expect(summary.localStorageKeys).toEqual({ "https://app.example.test": ["access_token", "theme"] });
  });

  it("spots Google cookies", () => {
    expect(summarizeStorageState(sampleState(), { now: NOW_MS }).hasGoogleCookies).toBe(true);

    const appOnly = sampleState({ cookies: sampleState().cookies.filter((c) => c.domain !== ".google.com") });
    expect(summarizeStorageState(appOnly, { now: NOW_MS }).hasGoogleCookies).toBe(false);
  });

  it("reports expired once every cookie with an expiry has passed it", () => {
    const stale = sampleState({
      cookies: sampleState().cookies.map((cookie) =>
        cookie.expires > 0 ? { ...cookie, expires: NOW_SECONDS - HOUR } : cookie,
      ),
    });

    const summary = summarizeStorageState(stale, { now: NOW_MS });

    expect(summary.expired).toBe(true);
    expect(summary.expiresInSeconds).toBe(-HOUR);
    // The session-only cookie survives, so something is still sendable — but the
    // state is expired all the same, and `expired` is what callers gate on.
    expect(summary.usable).toBe(true);
  });

  it("does not call a session-only state expired — it has no expiry to have passed", () => {
    const sessionOnly = sampleState({
      cookies: [{ ...sampleState().cookies[2] }],
      origins: [],
    });

    const summary = summarizeStorageState(sessionOnly, { now: NOW_MS });

    expect(summary.expired).toBe(false);
    expect(summary.earliestExpiry).toBeNull();
    expect(summary.expiresInSeconds).toBeNull();
    expect(summary.usable).toBe(true);
  });

  it("is unusable when there are no cookies at all", () => {
    expect(summarizeStorageState({ cookies: [], origins: [] }, { now: NOW_MS }).usable).toBe(false);
  });
});

describe("findExpiringCookies", () => {
  it("warns before the failure rather than after it", () => {
    const state = sampleState({
      cookies: [{ ...sampleState().cookies[0], name: "soon", expires: NOW_SECONDS + 30 * 60 }],
    });

    const soon = findExpiringCookies(state, { now: NOW_MS, withinMs: 60 * 60 * 1000 });

    expect(soon.map((cookie) => cookie.name)).toEqual(["soon"]);
  });

  it("never reports a session cookie, which has no expiry to be near", () => {
    const sessionOnly = sampleState({ cookies: [sampleState().cookies[2]] });

    expect(findExpiringCookies(sessionOnly, { now: NOW_MS, withinMs: 10 ** 12 })).toEqual([]);
  });

  it("defaults to a one-hour window", () => {
    const state = sampleState({
      cookies: [{ ...sampleState().cookies[0], expires: Math.floor(Date.now() / 1000) + 20 * 60 }],
    });

    expect(findExpiringCookies(state)).toHaveLength(1);
  });
});

describe("redactStorageState", () => {
  it("keeps the shape and loses every secret", () => {
    const state = sampleState();
    const redacted = redactStorageState(state);
    const serialized = JSON.stringify(redacted);

    expect(redacted.cookies.map((c) => c.name)).toEqual(state.cookies.map((c) => c.name));
    expect(redacted.cookies[0].domain).toBe(state.cookies[0].domain);
    expect(redacted.cookies[0].expires).toBe(state.cookies[0].expires);

    for (const cookie of state.cookies) expect(serialized).not.toContain(cookie.value);
    for (const entry of state.origins[0].localStorage) expect(serialized).not.toContain(entry.value);
  });

  it("says how long each value was, which is all you need to tell two apart", () => {
    const redacted = redactStorageState(sampleState());

    expect(redacted.cookies[0].value).toBe("«redacted 21 chars»");
    expect(redacted.origins[0].localStorage[0].value).toBe("«redacted 20 chars»");
  });

  it("does not mutate the state it was given", () => {
    const state = sampleState();
    redactStorageState(state);

    expect(state.cookies[0].value).toBe("sess_abcdef0123456789");
  });
});

describe("writeStorageState", () => {
  it("writes owner-read-write only", () => {
    const file = path.join(cwd, "playwright/.auth/state.json");
    writeStorageState(file, sampleState());

    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it("tightens a file that already existed as 0644", () => {
    const file = path.join(cwd, "state.json");
    fs.writeFileSync(file, "{}", { mode: 0o644 });
    fs.chmodSync(file, 0o644);

    writeStorageState(file, sampleState());

    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it("round-trips through readStorageState", () => {
    const file = path.join(cwd, "state.json");
    writeStorageState(file, sampleState());

    expect(readStorageState(file)).toEqual(sampleState());
  });
});

describe("readStorageState", () => {
  it("tells you how to create the file it could not find", () => {
    const file = path.join(cwd, "playwright/.auth/google-test-user.json");

    try {
      readStorageState(file, { cwd, baseUrl: "http://localhost:4000" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingStorageStateError);
      expect((error as Error).message).toContain("playwright codegen --save-storage=");
      expect((error as Error).message).toContain("http://localhost:4000");
      expect((error as MissingStorageStateError).file).toBe(file);
    }
  });

  it("propagates a non-ENOENT read failure rather than blaming a missing file", () => {
    const dir = path.join(cwd, "a-directory");
    fs.mkdirSync(dir);

    expect(() => readStorageState(dir)).toThrow(/EISDIR|illegal operation/i);
  });
});

describe("hardenStorageStateFile", () => {
  it("chmods a file Playwright wrote and reports what is in it", () => {
    const file = path.join(cwd, "state.json");
    // What `context.storageState({ path, indexedDB: true })` leaves behind: an
    // extra key this package has no type for, which must survive untouched.
    fs.writeFileSync(file, JSON.stringify({ ...sampleState(), indexedDB: [{ name: "db" }] }), { mode: 0o644 });
    fs.chmodSync(file, 0o644);

    const summary = hardenStorageStateFile(file);

    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(summary.cookieCount).toBe(3);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).indexedDB).toEqual([{ name: "db" }]);
  });

  it("throws on a file that is not a storage state", () => {
    const file = path.join(cwd, "state.json");
    fs.writeFileSync(file, '{"hello":"world"}');

    expect(() => hardenStorageStateFile(file)).toThrow(InvalidStorageStateError);
  });
});

describe("assertStorageStateUsable", () => {
  it("returns the summary when the session is good", () => {
    expect(assertStorageStateUsable(sampleState(), { now: NOW_MS, cwd }).cookieCount).toBe(3);
  });

  it("explains how long ago it lapsed, and how to fix it", () => {
    const stale = sampleState({
      cookies: [{ ...sampleState().cookies[0], expires: NOW_SECONDS - 90 * 60 }],
      origins: [],
    });

    expect(() => assertStorageStateUsable(stale, { now: NOW_MS, cwd })).toThrow(/expired 90 minutes ago/);
    expect(() => assertStorageStateUsable(stale, { now: NOW_MS, cwd })).toThrow(/playwright codegen/);
  });

  it("rejects a state with nothing in it", () => {
    expect(() => assertStorageStateUsable({ cookies: [], origins: [] }, { now: NOW_MS, cwd })).toThrow(
      /no usable cookie/,
    );
  });
});

describe("isGoogleDomain", () => {
  it.each([
    [".google.com", true],
    ["accounts.google.com", true],
    ["lh3.googleusercontent.com", true],
    ["app.example.test", false],
    ["notgoogle.com", false],
    ["google.com.evil.test", false],
  ])("%s → %s", (domain, expected) => {
    expect(isGoogleDomain(domain)).toBe(expected);
  });
});
