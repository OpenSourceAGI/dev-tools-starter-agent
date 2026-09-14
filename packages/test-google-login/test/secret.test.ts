import { describe, expect, it } from "vitest";

import { AUTH_HEADER, constantTimeEqual, isAuthorized } from "../src/secret.js";

describe("constantTimeEqual", () => {
  it("matches identical secrets", () => {
    expect(constantTimeEqual("s3cret-value", "s3cret-value")).toBe(true);
  });

  it.each([
    ["s3cret-valuE", "a single differing byte"],
    ["s3cret-valu", "a shorter value"],
    ["s3cret-value-more", "a longer value"],
    ["", "an empty value"],
  ])("rejects %j (%s)", (supplied) => {
    expect(constantTimeEqual(supplied, "s3cret-value")).toBe(false);
  });

  it.each([null, undefined])("rejects %s without throwing", (supplied) => {
    expect(constantTimeEqual(supplied, "s3cret-value")).toBe(false);
  });

  it.each([null, undefined, ""])("never matches when the expected secret is %j", (expected) => {
    // A Worker deployed without its secret set must refuse everything, including
    // a request that presents the empty string.
    expect(constantTimeEqual("", expected)).toBe(false);
    expect(constantTimeEqual("anything", expected)).toBe(false);
  });

  it("compares bytes, so a multi-byte character is not a partial match", () => {
    expect(constantTimeEqual("café", "café")).toBe(true);
    expect(constantTimeEqual("cafe", "café")).toBe(false);
  });
});

describe("isAuthorized", () => {
  const headers = (value?: string) => ({
    get: (name: string) => (name === AUTH_HEADER && value !== undefined ? value : null),
  });

  it("accepts the configured secret in the documented header", () => {
    expect(isAuthorized(headers("abc123"), "abc123")).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(isAuthorized(headers(), "abc123")).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(isAuthorized(headers("abc123"), undefined)).toBe(false);
  });
});
