import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildCommand,
  extractPortlessUrl,
  extractUrl,
  findPortless,
  inferAppName,
  sanitizeAppName,
} from "../open-when-ready.mjs";

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "open-ready-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("sanitizeAppName", () => {
  it("drops the npm scope and lowercases", () => {
    expect(sanitizeAppName("@MyOrg/Web-App")).toBe("web-app");
  });
  it("collapses invalid characters into single hyphens", () => {
    expect(sanitizeAppName("my_cool..app!")).toBe("my-cool-app");
  });
  it("returns empty string for unusable input", () => {
    expect(sanitizeAppName("___")).toBe("");
    expect(sanitizeAppName(undefined)).toBe("");
  });
  it("caps the length at one DNS label", () => {
    expect(sanitizeAppName("a".repeat(100))).toHaveLength(63);
  });
});

describe("inferAppName", () => {
  it("uses the package.json name", () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "@acme/dashboard" }),
    );
    expect(inferAppName(tmp)).toBe("dashboard");
  });
  it("falls back to the directory name", () => {
    const dir = path.join(tmp, "My Project");
    fs.mkdirSync(dir);
    expect(inferAppName(dir)).toBe("my-project");
  });
});

describe("findPortless", () => {
  it("finds a local node_modules/.bin binary walking up", () => {
    const bin = path.join(tmp, "node_modules", ".bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, "portless"), "");
    const nested = path.join(tmp, "apps", "web");
    fs.mkdirSync(nested, { recursive: true });
    expect(findPortless(nested, "")).toBe(path.join(bin, "portless"));
  });
  it("falls back to PATH", () => {
    const pathDir = path.join(tmp, "bin");
    fs.mkdirSync(pathDir);
    fs.writeFileSync(path.join(pathDir, "portless"), "");
    const cwd = path.join(tmp, "app");
    fs.mkdirSync(cwd);
    expect(findPortless(cwd, pathDir)).toBe(path.join(pathDir, "portless"));
  });
  it("returns null when not installed", () => {
    expect(findPortless(tmp, "")).toBeNull();
  });
});

describe("buildCommand", () => {
  it("runs the command as-is without portless", () => {
    expect(buildCommand(["next", "dev"])).toBe("next dev");
  });
  it("wraps the command with portless run --name", () => {
    expect(
      buildCommand(["next", "dev"], {
        portlessBin: "/usr/bin/portless",
        appName: "myapp",
      }),
    ).toBe('"/usr/bin/portless" run --name myapp next dev');
  });
});

describe("extractPortlessUrl", () => {
  it("reads the URL portless prints", () => {
    const log = "Starting proxy...\n\n  -> https://myapp.localhost\n\nRunning: PORT=4123 next dev\n";
    expect(extractPortlessUrl(log)).toBe("https://myapp.localhost");
  });
  it("ignores ANSI color codes", () => {
    const log = "\x1b[36m\x1b[1m\n  -> https://fix-ui.myapp.localhost:1355\n\x1b[22m\x1b[39m";
    expect(extractPortlessUrl(log)).toBe("https://fix-ui.myapp.localhost:1355");
  });
  it("returns null without a portless line", () => {
    expect(extractPortlessUrl("  - Local: http://localhost:3000")).toBeNull();
  });
  it("coexists with the framework's own localhost URL", () => {
    const log = "  -> https://myapp.localhost\n  - Local: http://localhost:4123\n ✓ Ready in 900ms";
    expect(extractPortlessUrl(log)).toBe("https://myapp.localhost");
    expect(extractUrl(log)).toBe("http://localhost:4123");
  });
});
