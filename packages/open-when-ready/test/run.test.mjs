import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Drives the real `run()` loop: a real child process prints to the log, the
 * poller reads it back, and `opener` / `wait-on` are mocked so nothing actually
 * opens a browser. Each case imports a fresh module because the CLI parses
 * `process.argv` once, at load time.
 */
const opener = vi.hoisted(() => vi.fn());
const waitOn = vi.hoisted(() => vi.fn());
vi.mock("opener", () => ({ default: opener }));
vi.mock("wait-on", () => ({ default: waitOn }));

let cwd;
let tmp;
let origArgv;
let sigintBefore;
let origTTY;
let origCI;

const printfArgs = (text) => ["printf", `'${text}'`];

async function load(args) {
  vi.resetModules();
  process.argv = ["node", "open-when-ready.mjs", ...args];
  return import("../open-when-ready.mjs");
}

async function until(check, ms = 3000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (check()) return true;
    await new Promise((r) => setTimeout(r, 15));
  }
  return check();
}

beforeEach(() => {
  cwd = process.cwd();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "owr-run-"));
  process.chdir(tmp);
  origArgv = process.argv;
  sigintBefore = process.listeners("SIGINT");
  origTTY = process.stdin.isTTY;
  origCI = process.env.CI;
  opener.mockReset();
  waitOn.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  process.chdir(cwd);
  process.argv = origArgv;
  for (const l of process.listeners("SIGINT")) {
    if (!sigintBefore.includes(l)) process.off("SIGINT", l);
  }
  process.stdin.isTTY = origTTY;
  if (origCI === undefined) delete process.env.CI;
  else process.env.CI = origCI;
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("run() — readiness", () => {
  it("opens the local URL once the server reports ready", async () => {
    const mod = await load([
      ...printfArgs("   Local:   http://localhost:4123\\n ✓ Ready in 50ms\\n"),
      "--pollDelay=20",
      "--noAi",
      "--no-portless",
    ]);
    await mod.run();
    expect(await until(() => opener.mock.calls.length > 0)).toBe(true);
    expect(opener).toHaveBeenCalledWith("http://localhost:4123");
    expect(waitOn).toHaveBeenCalledWith("http://localhost:4123", { timeout: 10000, http: true });
    expect(fs.readFileSync("open-when-ready.log", "utf8")).toContain("Ready in 50ms");
  });

  it("opens anyway when waiting on the port fails", async () => {
    waitOn.mockRejectedValue(new Error("timeout"));
    const mod = await load([
      ...printfArgs("Local: http://localhost:4200\\nReady in 5ms\\n"),
      "--pollDelay=20",
      "--noAi",
      "--no-portless",
    ]);
    await mod.run();
    expect(await until(() => opener.mock.calls.length > 0)).toBe(true);
    expect(opener).toHaveBeenCalledWith("http://localhost:4200");
  });

  it("does not open anything with --noOpen", async () => {
    const mod = await load([
      ...printfArgs("Local: http://localhost:4300\\nReady in 5ms\\n"),
      "--pollDelay=20",
      "--noAi",
      "--noOpen",
      "--no-portless",
    ]);
    await mod.run();
    await new Promise((r) => setTimeout(r, 300));
    expect(opener).not.toHaveBeenCalled();
    expect(waitOn).not.toHaveBeenCalled();
  });

  it("uses .next/port.log when a .next directory exists", async () => {
    fs.mkdirSync(".next");
    const mod = await load([
      ...printfArgs("Local: http://localhost:4400\\nReady in 5ms\\n"),
      "--pollDelay=20",
      "--noAi",
      "--no-portless",
    ]);
    await mod.run();
    expect(await until(() => opener.mock.calls.length > 0)).toBe(true);
    expect(fs.existsSync(path.join(".next", "port.log"))).toBe(true);
  });
});

describe("run() — failures", () => {
  it("opens an AI prompt about the error", async () => {
    const mod = await load([
      ...printfArgs("compiling...\\nError: Cannot find module foo\\n"),
      "--pollDelay=20",
      "--ai-base=https://ai.example/?q=",
      "--no-portless",
    ]);
    await mod.run();
    expect(await until(() => opener.mock.calls.length > 0)).toBe(true);
    const url = opener.mock.calls[0][0];
    expect(url.startsWith("https://ai.example/?q=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Explain what the error is");
    expect(url).toContain("next.js+");
    expect(url).toContain("Cannot%20find%20module%20foo");
    // Only once, however many polls see the error.
    await new Promise((r) => setTimeout(r, 150));
    expect(opener).toHaveBeenCalledTimes(1);
  });

  it("stays quiet about errors with --noAi", async () => {
    const mod = await load([
      ...printfArgs("Error: boom\\n"),
      "--pollDelay=20",
      "--noAi",
      "--no-portless",
    ]);
    await mod.run();
    await new Promise((r) => setTimeout(r, 200));
    expect(opener).not.toHaveBeenCalled();
  });

  it("stops polling once the log has stopped changing", async () => {
    const mod = await load([
      ...printfArgs("x".repeat(200)),
      "--pollDelay=15",
      "--noAi",
      "--no-portless",
    ]);
    const spy = vi.spyOn(globalThis, "clearInterval");
    await mod.run();
    expect(await until(() => spy.mock.calls.length > 0, 2000)).toBe(true);
  });

  it("clears the poll and exits on SIGINT", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined);
    const mod = await load([...printfArgs("hello\\n"), "--pollDelay=500", "--noAi", "--no-portless"]);
    await mod.run();
    const handler = process.listeners("SIGINT").find((l) => !sigintBefore.includes(l));
    handler();
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe("portless integration", () => {
  /** A stub `portless`: `proxy start` succeeds/fails; `run --name N cmd…` runs cmd. */
  function installPortlessStub({ proxyOk = true } = {}) {
    const bin = path.join(tmp, "node_modules", ".bin");
    fs.mkdirSync(bin, { recursive: true });
    const stub = path.join(bin, "portless");
    fs.writeFileSync(
      stub,
      `#!/bin/sh
if [ "$1" = "proxy" ]; then exit ${proxyOk ? 0 : 1}; fi
shift 3
exec "$@"
`,
    );
    fs.chmodSync(stub, 0o755);
    return stub;
  }

  it("wraps the command and opens the portless URL when --portless is given", async () => {
    installPortlessStub();
    const mod = await load([
      ...printfArgs("Local: http://localhost:4500\\n   -> https://myapp.localhost\\nReady in 5ms\\n"),
      "--pollDelay=20",
      "--noAi",
      "--portless",
      "--name=MyApp",
    ]);
    await mod.run();
    expect(await until(() => opener.mock.calls.length > 0)).toBe(true);
    expect(opener).toHaveBeenCalledWith("https://myapp.localhost");
    expect(waitOn).toHaveBeenCalledWith("http://localhost:4500", expect.any(Object));
  });

  it("resolvePortless reports the binary and a sanitized name", async () => {
    const stub = installPortlessStub();
    const mod = await load(["echo", "hi", "--portless", "--name=My App"]);
    expect(mod.resolvePortless()).toEqual({ portlessBin: fs.realpathSync(stub) === stub ? stub : stub, appName: "my-app" });
  });

  it("warns and runs without portless when --portless is given but it is missing", async () => {
    process.env.PATH = "/usr/bin:/bin";
    const mod = await load(["echo", "hi", "--portless"]);
    expect(mod.resolvePortless().portlessBin).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("--portless given but portless is not installed"));
  });

  it("skips portless when not interactive and not forced", async () => {
    installPortlessStub();
    const mod = await load(["echo", "hi"]);
    expect(mod.resolvePortless().portlessBin).toBeNull();
  });

  it("skips portless with --no-portless even when forced by a TTY", async () => {
    installPortlessStub();
    process.stdin.isTTY = true;
    delete process.env.CI;
    const mod = await load(["echo", "hi", "--no-portless"]);
    expect(mod.resolvePortless().portlessBin).toBeNull();
  });

  it("starts the proxy in an interactive session", async () => {
    const stub = installPortlessStub({ proxyOk: true });
    process.stdin.isTTY = true;
    delete process.env.CI;
    const mod = await load(["echo", "hi"]);
    expect(mod.resolvePortless().portlessBin).toBe(stub);
  });

  it("falls back when the proxy cannot start", async () => {
    installPortlessStub({ proxyOk: false });
    process.stdin.isTTY = true;
    delete process.env.CI;
    const mod = await load(["echo", "hi"]);
    expect(mod.resolvePortless().portlessBin).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Could not start the portless proxy"));
  });

  it("falls back to the directory name when --name is not given", async () => {
    const mod = await load(["echo", "hi"]);
    expect(mod.resolvePortless().appName).toBe(path.basename(tmp).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, ""));
  });
});

describe("getErrorContext", () => {
  it("returns an encoded excerpt around the first error line", async () => {
    const mod = await load(["echo"]);
    const log = ["a", "b", "c", "SyntaxError: bad thing (x.js:1)", "d", "e"].join("\n");
    const ctx = mod.getErrorContext(log);
    expect(ctx).toContain("SyntaxError");
    expect(ctx).toContain("%20");
    expect(ctx).not.toMatch(/[()]/);
  });

  it("returns an empty string when nothing looks like an error", async () => {
    const mod = await load(["echo"]);
    expect(mod.getErrorContext("all good\nready")).toBe("");
  });

  it("caps the excerpt length", async () => {
    const mod = await load(["echo"]);
    const log = "error " + "word ".repeat(2000);
    expect(mod.getErrorContext(log).length).toBeLessThanOrEqual(1000 + 2000);
  });
});
