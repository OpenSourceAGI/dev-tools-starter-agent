import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configure } from "../scripts/configure.mjs";

let root;

const profile = (name, data) => {
  fs.mkdirSync(path.join(root, "profiles"), { recursive: true });
  fs.writeFileSync(path.join(root, "profiles", `${name}.json`), JSON.stringify(data));
};
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const conf = () => JSON.parse(read("src-tauri/tauri.conf.json"));

const remote = {
  appName: "Remote App",
  identifier: "com.remote.app",
  version: "2.0.0",
  url: "https://remote.example",
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "naw-configure-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("configure — remote profile", () => {
  it("writes tauri.conf.json pointing the window at the url", () => {
    profile("r", remote);
    const { profile: p, written } = configure(root, "r");

    expect(p.name).toBe("r");
    expect(written).toEqual(["src-tauri/tauri.conf.json", "src-tauri/src/generated_config.rs"]);
    const c = conf();
    expect(c).toMatchObject({
      productName: "Remote App",
      version: "2.0.0",
      identifier: "com.remote.app",
      build: { frontendDist: "../dist" },
    });
    expect(c.app.windows[0]).toMatchObject({ label: "main", url: "https://remote.example", center: true });
    expect(c.app.security.capabilities).toEqual(["default"]);
    expect(c.bundle).toMatchObject({
      publisher: "Remote App",
      copyright: "",
      category: "Productivity",
      shortDescription: "",
      longDescription: "",
    });
    expect(c.bundle.macOS.minimumSystemVersion).toBe("10.15");
    expect(c.bundle.icon).toHaveLength(5);
    expect(c.bundle.externalBin).toBeUndefined();
    expect(c.plugins).toEqual({});
  });

  it("generates the Rust constants", () => {
    profile("r", { ...remote, deepLinkScheme: "remoteapp" });
    configure(root, "r");
    const rs = read("src-tauri/src/generated_config.rs");
    expect(rs).toContain('pub const DEEP_LINK_SCHEME: &str = "remoteapp";');
    expect(rs).toContain('pub const APP_URL: &str = "https://remote.example";');
    expect(rs).toContain('pub const SIDECAR_NAME: &str = "";');
    expect(rs).toContain("pub const SIDECAR_ARGS: &[&str] = &[];");
    expect(rs).toContain("pub const UPDATER_ENABLED: bool = false;");
    expect(rs).toContain("profiles/r.json");
  });

  it("includes updater, deep-link, android and ios settings when configured", () => {
    profile("full", {
      ...remote,
      publisher: "Pub",
      copyright: "© Me",
      category: "Utilities",
      shortDescription: "short",
      longDescription: "long",
      macos: { minimumSystemVersion: "12.0" },
      updater: { pubkey: "PK", endpoints: ["https://u.example/latest.json"] },
      deepLinkScheme: "fullapp",
      android: { minSdkVersion: 26 },
      ios: { minimumSystemVersion: "16.0" },
    });
    configure(root, "full");
    const c = conf();
    expect(c.bundle).toMatchObject({
      publisher: "Pub",
      copyright: "© Me",
      category: "Utilities",
      shortDescription: "short",
      longDescription: "long",
      macOS: { minimumSystemVersion: "12.0" },
      android: { minSdkVersion: 26 },
      iOS: { minimumSystemVersion: "16.0" },
    });
    expect(c.plugins.updater).toEqual({ active: true, pubkey: "PK", endpoints: ["https://u.example/latest.json"] });
    expect(c.plugins["deep-link"]).toEqual({
      desktop: { schemes: ["fullapp"] },
      mobile: [{ scheme: ["fullapp"], appLink: false }],
    });
    expect(read("src-tauri/src/generated_config.rs")).toContain("UPDATER_ENABLED: bool = true;");
  });

  it("defaults android/ios minimums and falls back publisher → copyright → app name", () => {
    profile("d", { ...remote, copyright: "C", android: {}, ios: {} });
    configure(root, "d");
    const c = conf();
    expect(c.bundle.publisher).toBe("C");
    expect(c.bundle.android.minSdkVersion).toBe(24);
    expect(c.bundle.iOS.minimumSystemVersion).toBe("14.0");
  });

  it("writes a remote capability scoped to the trusted origins", () => {
    profile("t", { ...remote, trustedOrigins: ["https://remote.example/", "https://*.remote.example"] });
    const { written } = configure(root, "t");
    expect(written).toContain("src-tauri/capabilities/remote.json");
    expect(conf().app.security.capabilities).toEqual(["default", "remote"]);
    const cap = JSON.parse(read("src-tauri/capabilities/remote.json"));
    expect(cap).toMatchObject({
      identifier: "remote",
      windows: ["main"],
      permissions: ["opener:allow-open-url"],
    });
    expect(cap.remote.urls).toEqual(["https://remote.example/*", "https://*.remote.example/*"]);
  });

  it("removes a stale remote capability when no origins are trusted", () => {
    profile("t", { ...remote, trustedOrigins: ["https://remote.example"] });
    configure(root, "t");
    expect(fs.existsSync(path.join(root, "src-tauri/capabilities/remote.json"))).toBe(true);

    profile("t", remote);
    const { written } = configure(root, "t");
    expect(fs.existsSync(path.join(root, "src-tauri/capabilities/remote.json"))).toBe(false);
    expect(written).toContain("src-tauri/capabilities/remote.json (removed — no trustedOrigins)");
  });
});

describe("configure — local profile with a sidecar", () => {
  it("loads index.html, bundles the binary and passes fixed args to Rust", () => {
    profile("l", {
      appName: "Local App",
      identifier: "com.local.app",
      version: "1.0.0",
      mode: "local",
      sidecar: { name: "mytool", args: ["--json", "a b"], build: "make {out}" },
    });
    configure(root, "l");
    const c = conf();
    expect(c.app.windows[0].url).toBe("index.html");
    expect(c.bundle.externalBin).toEqual(["binaries/mytool"]);
    const rs = read("src-tauri/src/generated_config.rs");
    expect(rs).toContain('pub const SIDECAR_NAME: &str = "mytool";');
    expect(rs).toContain('pub const SIDECAR_ARGS: &[&str] = &["--json", "a b"];');
    expect(rs).toContain('pub const APP_URL: &str = "";');
  });

  it("propagates profile errors", () => {
    expect(() => configure(root, "missing")).toThrow("no such profile");
  });
});
