import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadProfile, resolveProfileName } from "../scripts/profile.mjs";

let root;
let origEnv;

const write = (name, profile) => {
  fs.mkdirSync(path.join(root, "profiles"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "profiles", `${name}.json`),
    typeof profile === "string" ? profile : JSON.stringify(profile),
  );
};

const base = { appName: "My App", identifier: "com.my.app", version: "1.2.3", url: "https://my.app" };

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "naw-profile-"));
  origEnv = process.env.WRAPPER_PROFILE;
  delete process.env.WRAPPER_PROFILE;
});

afterEach(() => {
  if (origEnv === undefined) delete process.env.WRAPPER_PROFILE;
  else process.env.WRAPPER_PROFILE = origEnv;
  fs.rmSync(root, { recursive: true, force: true });
});

describe("resolveProfileName", () => {
  it("takes --profile <name>", () => {
    expect(resolveProfileName(root, ["--profile", "foo"])).toBe("foo");
  });

  it("rejects --profile without a value", () => {
    expect(() => resolveProfileName(root, ["--profile"])).toThrow("--profile needs a profile name");
    expect(() => resolveProfileName(root, ["--profile", "--other"])).toThrow("--profile needs a profile name");
  });

  it("falls back to WRAPPER_PROFILE", () => {
    process.env.WRAPPER_PROFILE = "from-env";
    expect(resolveProfileName(root, [])).toBe("from-env");
  });

  it("uses the only non-example profile", () => {
    write("example", base);
    write("solo", base);
    expect(resolveProfileName(root, [])).toBe("solo");
  });

  it("uses example.json when it is the only one", () => {
    write("example", base);
    expect(resolveProfileName(root, [])).toBe("example");
  });

  it("explains an empty or missing profiles directory", () => {
    expect(() => resolveProfileName(root, [])).toThrow("no profile to use");
    fs.mkdirSync(path.join(root, "profiles"));
    expect(() => resolveProfileName(root, [])).toThrow("no profile to use");
  });

  it("asks for a choice when several profiles exist", () => {
    write("a", base);
    write("b", base);
    expect(() => resolveProfileName(root, [])).toThrow(/2 profiles \(a, b\)/);
  });
});

describe("loadProfile", () => {
  it("fills in defaults for a minimal remote profile", () => {
    write("min", base);
    const p = loadProfile(root, "min");
    expect(p).toMatchObject({
      name: "min",
      mode: "remote",
      productName: "My App",
      trustedOrigins: [],
      sidecar: null,
    });
    expect(p.path).toBe(path.join(root, "profiles", "min.json"));
    expect(p.window).toEqual({
      width: 1280,
      height: 800,
      minWidth: 480,
      minHeight: 480,
      fullscreen: false,
      resizable: true,
      title: "My App",
    });
  });

  it("lets the profile override window and product name", () => {
    write("custom", { ...base, productName: "Pretty", window: { width: 900, title: "Hello" } });
    const p = loadProfile(root, "custom");
    expect(p.productName).toBe("Pretty");
    expect(p.window.width).toBe(900);
    expect(p.window.title).toBe("Hello");
    expect(p.window.height).toBe(800);
  });

  it("accepts http://localhost for remote dev", () => {
    write("dev", { ...base, url: "http://localhost:3000" });
    expect(loadProfile(root, "dev").url).toBe("http://localhost:3000");
  });

  it("accepts a local profile with a sidecar", () => {
    write("local", {
      appName: "L",
      identifier: "com.l",
      version: "1",
      mode: "local",
      sidecar: { name: "tool", build: "make OUT={out}" },
    });
    const p = loadProfile(root, "local");
    expect(p.mode).toBe("local");
    expect(p.sidecar).toEqual({ args: [], name: "tool", build: "make OUT={out}" });
  });

  it("reports a missing profile", () => {
    expect(() => loadProfile(root, "ghost")).toThrow("no such profile: profiles/ghost.json");
  });

  it("reports invalid JSON", () => {
    write("bad", "{not json");
    expect(() => loadProfile(root, "bad")).toThrow(/bad.json is not valid JSON/);
  });

  it.each(["appName", "identifier", "version"])("requires %s", (field) => {
    write("p", { ...base, [field]: undefined });
    expect(() => loadProfile(root, "p")).toThrow(`missing required field "${field}"`);
  });

  it("rejects an unknown mode", () => {
    write("p", { ...base, mode: "hybrid" });
    expect(() => loadProfile(root, "p")).toThrow('unknown mode "hybrid"');
  });

  it("remote mode needs a url, and it must be https or localhost", () => {
    write("p", { ...base, url: undefined });
    expect(() => loadProfile(root, "p")).toThrow('needs a "url"');
    write("p", { ...base, url: "http://example.com" });
    expect(() => loadProfile(root, "p")).toThrow("must be https://");
  });

  it("local mode must not set a url", () => {
    write("p", { appName: "A", identifier: "i", version: "1", mode: "local", url: "https://x" });
    expect(() => loadProfile(root, "p")).toThrow('mode "local" but also sets "url"');
  });

  it("validates the sidecar block", () => {
    const local = { appName: "A", identifier: "i", version: "1", mode: "local" };
    write("p", { ...local, sidecar: {} });
    expect(() => loadProfile(root, "p")).toThrow('no "name"');
    write("p", { ...local, sidecar: { name: "x", build: "make" } });
    expect(() => loadProfile(root, "p")).toThrow('must contain "{out}"');
    write("p", { ...base, sidecar: { name: "x" } });
    expect(() => loadProfile(root, "p")).toThrow('pairs a "sidecar" with mode "remote"');
  });

  it("validates the updater block", () => {
    write("p", { ...base, updater: { pubkey: "k" } });
    expect(() => loadProfile(root, "p")).toThrow('"updater" needs both a "pubkey"');
    write("p", { ...base, updater: { pubkey: "k", endpoints: [] } });
    expect(() => loadProfile(root, "p")).toThrow('"updater" needs both');
    write("p", { ...base, updater: { pubkey: "k", endpoints: ["https://u"] } });
    expect(loadProfile(root, "p").updater.endpoints).toEqual(["https://u"]);
  });
});
