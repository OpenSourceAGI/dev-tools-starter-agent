import { describe, expect, it } from "vitest";
import { hasSessionToken, mergeCookies, setCookiesOf } from "../src/cookies";

describe("mergeCookies", () => {
  it("keeps only the name=value pair, dropping attributes", () => {
    const cookie = mergeCookies(undefined, [
      "better-auth.session_token=abc123; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800",
    ]);

    expect(cookie).toBe("better-auth.session_token=abc123");
  });

  it("merges new cookies into an existing jar, newest winning", () => {
    const cookie = mergeCookies("better-auth.session_token=old; other=keep", [
      "better-auth.session_token=new; Path=/",
    ]);

    expect(cookie).toBe("better-auth.session_token=new; other=keep");
  });

  it("removes a cookie the server expires with Max-Age=0", () => {
    const cookie = mergeCookies("better-auth.session_token=abc; other=keep", [
      "better-auth.session_token=; Path=/; Max-Age=0",
    ]);

    expect(cookie).toBe("other=keep");
  });

  it("removes a cookie whose Expires is in the past", () => {
    const cookie = mergeCookies("better-auth.session_token=abc", [
      "better-auth.session_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ]);

    expect(cookie).toBe("");
  });

  it("ignores malformed Set-Cookie values", () => {
    expect(mergeCookies("a=1", ["", "   ", "novalue"])).toBe("a=1");
  });
});

describe("hasSessionToken", () => {
  it("recognises better-auth's token under either cookie prefix", () => {
    expect(hasSessionToken("better-auth.session_token=abc")).toBe(true);
    expect(hasSessionToken("other=1; __Secure-better-auth.session_token=abc")).toBe(true);
  });

  it("is false for an empty jar or one without a session", () => {
    expect(hasSessionToken(undefined)).toBe(false);
    expect(hasSessionToken("")).toBe(false);
    expect(hasSessionToken("csrf=abc")).toBe(false);
    expect(hasSessionToken("better-auth.session_token=")).toBe(false);
  });
});

describe("setCookiesOf", () => {
  it("reads every Set-Cookie header the response carries", () => {
    const headers = new Headers();
    headers.append("set-cookie", "a=1");
    headers.append("set-cookie", "b=2");

    expect(setCookiesOf(headers).length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to the single joined header when getSetCookie is missing", () => {
    const headers = { get: (name: string) => (name === "set-cookie" ? "a=1" : null) } as unknown as Headers;

    expect(setCookiesOf(headers)).toEqual(["a=1"]);
  });

  it("returns nothing when the response set no cookies", () => {
    expect(setCookiesOf(new Headers())).toEqual([]);
  });
});
