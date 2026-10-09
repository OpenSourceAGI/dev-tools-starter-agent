import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `bin/cli.js` runs on import, reading `process.argv`. Only the subcommands that
 * write somewhere other than the package itself are exercised in-process: `init`
 * scaffolds into a temp directory, while `configure` and `icons` would rewrite
 * this package's own tracked `src-tauri/` files.
 */
let tmp;
let out;
let errs;
let exits;
let origArgv;
let origCwd;

class Exit extends Error {}

async function cli(...args) {
  vi.resetModules();
  process.argv = ["node", "cli.js", ...args];
  await import("../bin/cli.js");
}

const read = (...p) => fs.readFileSync(path.join(tmp, ...p), "utf8");

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "naw-cli-"));
  out = [];
  errs = [];
  exits = [];
  origArgv = process.argv;
  origCwd = process.cwd();
  process.chdir(tmp);
  vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));
  vi.spyOn(console, "error").mockImplementation((...a) => void errs.push(a.join(" ")));
  vi.spyOn(process, "exit").mockImplementation((code) => {
    exits.push(code);
    throw new Exit(`exit ${code}`);
  });
});

afterEach(() => {
  process.chdir(origCwd);
  process.argv = origArgv;
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("help", () => {
  it("prints usage and exits 0 with no command", async () => {
    await cli().catch(() => {});
    expect(out.join("\n")).toContain("init <dir>");
    expect(out.join("\n")).toContain("configure [--profile <name>]");
    expect(out.join("\n")).toContain("icons [--profile <name>]");
    expect(exits[0]).toBe(0);
  });

  it("prints usage and exits 1 for an unknown command", async () => {
    await cli("bogus").catch(() => {});
    expect(out.join("\n")).toContain("native-app-wrapper");
    expect(exits[0]).toBe(1);
  });
});

describe("init", () => {
  it("requires a target directory", async () => {
    await cli("init").catch(() => {});
    expect(errs.join("\n")).toContain("init needs a target directory");
    expect(exits[0]).toBe(1);
  });

  it("rejects an unknown profile name", async () => {
    await cli("init", "app", "--profile", "nope").catch(() => {});
    expect(errs.join("\n")).toContain('no profile named "nope"');
    expect(exits[0]).toBe(1);
  });

  it("rejects a flag with no value", async () => {
    await cli("init", "app", "--profile").catch(() => {});
    expect(errs.join("\n")).toContain("--profile needs a value");
  });

  it("refuses a non-empty target without --force", async () => {
    fs.mkdirSync("busy");
    fs.writeFileSync(path.join("busy", "keep.txt"), "x");
    await cli("init", "busy").catch(() => {});
    expect(errs.join("\n")).toContain("already exists and is not empty");
    expect(exits[0]).toBe(1);
  });

  it("scaffolds a standalone wrapper from the example profile", { timeout: 120_000 }, async () => {
    await cli("init", "myapp");

    expect(exits).toEqual([]);
    const pkg = JSON.parse(read("myapp", "package.json"));
    expect(pkg.name).toBe("example-app-native");
    expect(pkg.private).toBe(true);
    expect(pkg.version).toBe("0.1.0");
    expect(pkg.bin).toBeUndefined();
    expect(pkg.scripts.init).toBeUndefined();
    expect(pkg.scripts["android:dev"]).toBeDefined(); // example profile enables mobile

    const conf = JSON.parse(read("myapp", "src-tauri", "tauri.conf.json"));
    expect(conf.productName).toBe("Example App");
    expect(read("myapp", "src-tauri", "Cargo.toml")).toContain('name = "example-app-native"');
    expect(read("myapp", "src-tauri", "Cargo.toml")).toContain('name = "example_app_native_lib"');
    expect(read("myapp", "src-tauri", "src", "main.rs")).toContain("example_app_native_lib::run()");

    expect(fs.existsSync(path.join(tmp, "myapp", "profiles", "example.json"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "myapp", "bin", "cli.js"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "myapp", "src-tauri", "icons", "icon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "myapp", "docs", "BUILDING.md"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "myapp", "docs", "MOBILE.md"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "myapp", "docs", "OAUTH.md"))).toBe(true);

    const log = out.join("\n");
    expect(log).toContain("scaffolded Example App into myapp/");
    expect(log).toContain("wrote src-tauri/tauri.conf.json");
    expect(log).toContain("Next: cd myapp && npm install && npm run dev");
  });

  it("scaffolds from a custom --profile-file (local mode with a sidecar, no mobile)", { timeout: 120_000 }, async () => {
    fs.writeFileSync(
      "tool.json",
      JSON.stringify({
        appName: "Local Tool",
        identifier: "com.local.tool",
        version: "3.1.4",
        mode: "local",
        sidecar: { name: "tool", build: "make {out}" },
        placeholderIcon: { accent: "#ff0000" },
      }),
    );
    fs.mkdirSync("dest");

    await cli("init", "dest", "--profile-file", "tool.json", "--force");

    const pkg = JSON.parse(read("dest", "package.json"));
    expect(pkg.name).toBe("local-tool-native");
    expect(pkg.version).toBe("3.1.4");
    expect(pkg.scripts["build:sidecar"]).toBe("node scripts/build-sidecar.mjs");
    expect(pkg.scripts.predev).toContain("build-sidecar");
    expect(Object.keys(pkg.scripts).some((k) => /^(pre)?(android|ios):/.test(k))).toBe(false);
    expect(fs.existsSync(path.join(tmp, "dest", "docs", "LOCAL_APPS.md"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "dest", "docs", "MOBILE.md"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, "dest", "docs", "OAUTH.md"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, "dest", "profiles", "tool.json"))).toBe(true);
    expect(read("dest", "src-tauri", "src", "generated_config.rs")).toContain('SIDECAR_NAME: &str = "tool"');
  });

  it("allows an existing empty target directory", { timeout: 120_000 }, async () => {
    fs.mkdirSync("empty");
    await cli("init", "empty");
    expect(fs.existsSync(path.join(tmp, "empty", "package.json"))).toBe(true);
  });
});
