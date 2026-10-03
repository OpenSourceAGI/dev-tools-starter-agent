/**
 * @fileoverview End-to-end tests for the CLI entry: argument routing, the
 * settings sub-commands, output formatting/wrapping, the shell-greeting
 * installer and the web mode. `main()` runs on import, so each case sets
 * `process.argv`, imports a fresh module and waits for it to settle.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSystemInfo = vi.hoisted(() => vi.fn());
vi.mock("./system-info-api", () => ({ getSystemInfo }));

const startWebServer = vi.hoisted(() => vi.fn());
vi.mock("./web-server", () => ({
  startWebServer,
  DEFAULT_WEB_PORT: 7777,
  DEFAULT_WEB_HOST: "127.0.0.1",
}));

const settingsIO = vi.hoisted(() => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));
vi.mock("./info/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./info/settings")>();
  return {
    ...actual,
    loadSettings: settingsIO.loadSettings,
    saveSettings: settingsIO.saveSettings,
  };
});

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  chmodSync: vi.fn(),
  appendFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

const osState = vi.hoisted(() => ({ platform: "linux" }));
vi.mock("os", () => {
  const api = {
    platform: () => osState.platform,
    homedir: () => "/home/ada",
    tmpdir: () => "/tmp",
  };
  return { ...api, default: api };
});

import { DEFAULT_SETTINGS } from "./info/settings";

let out: string[];
let errs: string[];
let exitCode: number | undefined;
let origArgv: string[];
let origEnvPort: string | undefined;

const fresh = () => JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
// eslint-disable-next-line no-control-regex
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

async function run(args: string[], platform = "linux") {
  osState.platform = platform;
  process.argv = ["node", "about-system", ...args];
  vi.resetModules();
  const mod = await import("./about-system-cli");
  await new Promise((r) => setTimeout(r, 15));
  return mod;
}

beforeEach(() => {
  out = [];
  errs = [];
  exitCode = undefined;
  origArgv = process.argv;
  origEnvPort = process.env.PORT;
  delete process.env.PORT;
  for (const f of Object.values(fsMock)) f.mockReset();
  fsMock.existsSync.mockReturnValue(false);
  fsMock.readFileSync.mockReturnValue("");
  settingsIO.loadSettings.mockReset().mockImplementation(() => fresh());
  settingsIO.saveSettings.mockReset().mockReturnValue(true);
  getSystemInfo.mockReset().mockResolvedValue({
    user: "ada",
    hostname: "box",
    cpu: "Ryzen",
    battery: "80%+",
  });
  startWebServer.mockReset().mockResolvedValue({ url: "http://127.0.0.1:7777" });
  vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));
  vi.spyOn(console, "error").mockImplementation((...a) => void errs.push(a.join(" ")));
  vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    exitCode = code;
  }) as never);
});

afterEach(() => {
  process.argv = origArgv;
  if (origEnvPort === undefined) delete process.env.PORT;
  else process.env.PORT = origEnvPort;
  vi.restoreAllMocks();
});

describe("settings sub-commands", () => {
  it("--settings-init writes the defaults", async () => {
    await run(["--settings-init"]);
    expect(settingsIO.saveSettings).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    expect(out.join("\n")).toContain("Settings initialized with defaults");
    expect(getSystemInfo).not.toHaveBeenCalled();
  });

  it("--settings-init / --settings-reset report a failed save", async () => {
    settingsIO.saveSettings.mockReturnValue(false);
    await run(["--settings-init"]);
    expect(out.join("\n")).toContain("Failed to initialize settings");
    out.length = 0;
    await run(["--settings-reset"]);
    expect(out.join("\n")).toContain("Failed to reset settings");
  });

  it("--settings-reset restores the defaults", async () => {
    await run(["--settings-reset"]);
    expect(out.join("\n")).toContain("Settings reset to defaults");
  });

  it("--settings-show prints the current settings as JSON", async () => {
    await run(["--settings-show"]);
    expect(out[0]).toBe("Current settings:");
    expect(JSON.parse(out[1]).labels.user).toBe("User");
  });

  it("--refresh deletes the cache file when present", async () => {
    fsMock.existsSync.mockReturnValue(true);
    await run(["--refresh"]);
    expect(fsMock.unlinkSync).toHaveBeenCalled();
    expect(out.join("\n")).toContain("Cache cleared");
  });

  it("--refresh is quiet when there is no cache, and reports unlink errors", async () => {
    await run(["--refresh"]);
    expect(fsMock.unlinkSync).not.toHaveBeenCalled();
    fsMock.existsSync.mockReturnValue(true);
    fsMock.unlinkSync.mockImplementation(() => {
      throw new Error("EPERM");
    });
    await run(["--refresh"]);
    expect(errs.join("\n")).toContain("Error clearing cache: EPERM");
  });

  it("--set coerces booleans, JSON and strings and supports dotted keys", async () => {
    await run(["--set", "display.show_emojis", "false"]);
    expect(settingsIO.saveSettings.mock.calls[0][0].display.show_emojis).toBe(false);
    expect(out.join("\n")).toContain("Setting display.show_emojis = false");

    await run(["--set", "display.single_line", "true"]);
    expect(settingsIO.saveSettings.mock.calls[1][0].display.single_line).toBe(true);

    await run(["--set", "colors.user", "blue"]);
    expect(settingsIO.saveSettings.mock.calls[2][0].colors.user).toBe("blue");

    await run(["--set", "display_order", '[["user"],["cpu"]]']);
    expect(settingsIO.saveSettings.mock.calls[3][0].display_order).toEqual([["user"], ["cpu"]]);
  });

  it("--set creates missing intermediate objects", async () => {
    await run(["--set", "brand.new.key", "v"]);
    expect(settingsIO.saveSettings.mock.calls[0][0].brand.new.key).toBe("v");
  });

  it("--set reports a failed save and invalid JSON", async () => {
    settingsIO.saveSettings.mockReturnValue(false);
    await run(["--set", "labels.cpu", "Processor"]);
    expect(out.join("\n")).toContain("Failed to save settings");
    await run(["--set", "labels.cpu", "{broken"]);
    expect(errs.join("\n")).toContain("Error setting value");
  });

  it("--set without a value falls through to normal display", async () => {
    await run(["--set", "only-key"]);
    expect(settingsIO.saveSettings).not.toHaveBeenCalled();
  });
});

describe("help", () => {
  it.each([
    ["linux", "Linux"],
    ["darwin", "macOS"],
    ["win32", "Windows"],
    ["freebsd", "Unknown"],
  ])("--help names the platform (%s)", async (plat, label) => {
    await run(["--help"], plat);
    const text = out.join("\n");
    expect(text).toContain("System Info Script");
    expect(text).toContain(`Platform: ${label}`);
    expect(text).toContain("http://127.0.0.1:7777");
  });

  it("-h is an alias", async () => {
    await run(["-h"]);
    expect(out.join("\n")).toContain("Usage:");
  });
});

describe("display", () => {
  it("prints one formatted line by default", async () => {
    await run([]);
    expect(out).toHaveLength(1);
    const text = strip(out[0]);
    expect(text).toContain("ada");
    expect(text).toContain("Ryzen");
    expect(getSystemInfo).toHaveBeenCalledWith(
      expect.objectContaining({ keys: expect.arrayContaining(["user", "cpu"]) }),
    );
  });

  it("CLI mode shows just the requested parts (comma list)", async () => {
    await run(["user,cpu, "]);
    expect(getSystemInfo.mock.calls[0][0].keys).toEqual(["user", "cpu"]);
    expect(strip(out[0])).toBe("👤 ada 📈 Ryzen");
  });

  it("CLI mode accepts a single part and ignores flags and key=value", async () => {
    await run(["--verbose", "a=b", "hostname"]);
    expect(getSystemInfo.mock.calls[0][0].keys).toEqual(["hostname"]);
  });

  it("omits emojis and backgrounds when disabled", async () => {
    settingsIO.loadSettings.mockImplementation(() => {
      const s = fresh();
      s.display.show_emojis = false;
      s.display.show_backgrounds = false;
      return s;
    });
    await run(["user"]);
    expect(out[0]).not.toContain("👤");
    expect(out[0]).not.toContain("\x1b[48;");
  });

  it("swaps the battery emoji for charging state", async () => {
    await run(["battery"]);
    expect(strip(out[0])).toBe("🔌 80%+");
    getSystemInfo.mockResolvedValue({ battery: "40%" });
    await run(["battery"]);
    expect(strip(out[1])).toBe("🔋 40%");
  });

  it("renders multicolor ports with backgrounds, or plain colors without", async () => {
    getSystemInfo.mockResolvedValue({ ports: "3000node 8080ngin 22ssh 53dns 80web 443web 9000x" });
    await run(["ports"]);
    expect(out[0]).toContain("\x1b[41m\x1b[97m3000node");
    expect(out[0]).toContain("9000x");

    settingsIO.loadSettings.mockImplementation(() => {
      const s = fresh();
      s.display.show_backgrounds = false;
      return s;
    });
    out.length = 0;
    await run(["ports"]);
    expect(out[0]).toContain("\x1b[31m3000node\x1b[0m");
  });

  it("renders multicolor pacman values", async () => {
    getSystemInfo.mockResolvedValue({ pacman: "apt npm" });
    await run(["pacman"]);
    expect(strip(out[0])).toBe("🚀 apt npm");
  });

  it("skips blank values and prints nothing when everything is blank", async () => {
    getSystemInfo.mockResolvedValue({ user: "  ", cpu: "" });
    await run(["user,cpu"]);
    expect(out).toEqual([]);
  });

  it("wraps long output to line_wrap_length when single_line is off", async () => {
    settingsIO.loadSettings.mockImplementation(() => {
      const s = fresh();
      s.display.single_line = false;
      s.display.line_wrap_length = 10;
      return s;
    });
    getSystemInfo.mockResolvedValue({ user: "abcdefghijklmnopqrstuvwxyz" });
    await run(["user"]);
    expect(out.length).toBeGreaterThan(2);
    for (const line of out) expect(strip(line).length).toBeLessThanOrEqual(10);
    expect(strip(out.join(""))).toContain("abcdefghijklmnopqrstuvwxyz".slice(0, 5));
  });

  it("re-applies the active color on each wrapped line and handles emoji width", async () => {
    settingsIO.loadSettings.mockImplementation(() => {
      const s = fresh();
      s.display.single_line = false;
      s.display.line_wrap_length = 6;
      return s;
    });
    getSystemInfo.mockResolvedValue({ user: "aaaaaaaaaaaa" });
    await run(["user"]);
    expect(out.length).toBeGreaterThan(1);
    // The continuation line starts with the style that was active at the break.
    expect(out[1].startsWith("\x1b[")).toBe(true);
  });

  it("does not wrap when line_wrap_length is non-positive", async () => {
    settingsIO.loadSettings.mockImplementation(() => {
      const s = fresh();
      s.display.single_line = false;
      s.display.line_wrap_length = 0;
      return s;
    });
    await run(["user"]);
    expect(out).toHaveLength(1);
  });

  it("prints a debug message when wrapping yields nothing", async () => {
    settingsIO.loadSettings.mockImplementation(() => {
      const s = fresh();
      s.display.single_line = false;
      s.advanced.debug = true;
      return s;
    });
    getSystemInfo.mockResolvedValue({});
    await run(["user"]);
    expect(out.join("\n")).toContain("No system information could be displayed");
  });

  it("--json prints the raw info object", async () => {
    await run(["--json"]);
    expect(JSON.parse(out[0])).toMatchObject({ user: "ada", cpu: "Ryzen" });
    expect(getSystemInfo.mock.calls[0][0].keys).toBeUndefined();
  });

  it("reports unexpected failures and exits 1", async () => {
    getSystemInfo.mockRejectedValue(new Error("probe exploded"));
    await run([]);
    expect(errs.join("\n")).toContain("Error: probe exploded");
    expect(exitCode).toBe(1);
  });
});

describe("interactive key handling", () => {
  const stdin = process.stdin as unknown as Record<string, unknown>;
  let handlers: Record<string, (b: Buffer) => void>;
  const saved: Record<string, unknown> = {};

  beforeEach(() => {
    handlers = {};
    for (const k of ["isTTY", "setRawMode", "on", "off", "resume", "pause"]) saved[k] = stdin[k];
    stdin.isTTY = true;
    stdin.setRawMode = vi.fn();
    stdin.on = vi.fn((ev: string, fn: (b: Buffer) => void) => {
      handlers[ev] = fn;
      return stdin;
    });
    stdin.off = vi.fn();
    stdin.resume = vi.fn();
    stdin.pause = vi.fn();
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) stdin[k] = v;
  });

  it("puts a TTY stdin into raw mode while collecting and restores it", async () => {
    await run([]);
    expect(stdin.setRawMode).toHaveBeenCalledWith(true);
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.pause).toHaveBeenCalled();
  });

  it("Esc aborts the collection; Ctrl+C exits 130", async () => {
    let signal: AbortSignal | undefined;
    getSystemInfo.mockImplementation(async (opts: { signal: AbortSignal }) => {
      signal = opts.signal;
      handlers.data(Buffer.from([0x1b]));
      return { user: "partial" };
    });
    await run(["user"]);
    expect(signal?.aborted).toBe(true);

    getSystemInfo.mockImplementation(async () => {
      handlers.data(Buffer.from([0x03]));
      return { user: "x" };
    });
    await run(["user"]);
    expect(exitCode).toBe(130);
  });

  it("ignores other keys", async () => {
    let signal: AbortSignal | undefined;
    getSystemInfo.mockImplementation(async (opts: { signal: AbortSignal }) => {
      signal = opts.signal;
      handlers.data(Buffer.from("a"));
      return { user: "x" };
    });
    await run(["user"]);
    expect(signal?.aborted).toBe(false);
    expect(exitCode).toBeUndefined();
  });
});

describe("web mode", () => {
  it("starts on the defaults and says it is localhost-only", async () => {
    await run(["web"]);
    expect(startWebServer).toHaveBeenCalledWith({ port: 7777, host: "127.0.0.1" });
    const text = out.join("\n");
    expect(text).toContain("About System web UI running at http://127.0.0.1:7777");
    expect(text).toContain("localhost only");
    expect(text).toContain("Press Ctrl+C");
  });

  it("honours --port/--host (both spellings) and warns on a public bind", async () => {
    await run(["web", "--port", "8080", "--host=0.0.0.0"]);
    expect(startWebServer).toHaveBeenCalledWith({ port: 8080, host: "0.0.0.0" });
    expect(out.join("\n")).toContain("Warning: system details");
  });

  it("--web works anywhere and PORT env is used as a fallback", async () => {
    process.env.PORT = "9090";
    await run(["--web"]);
    expect(startWebServer).toHaveBeenCalledWith({ port: 9090, host: "127.0.0.1" });
  });

  it.each(["abc", "-1", "70000", "1.5"])("rejects the invalid port %s", async (bad) => {
    await run(["web", `--port=${bad}`]);
    expect(errs.join("\n")).toContain(`Invalid port: ${bad}`);
    expect(exitCode).toBe(1);
    expect(startWebServer).not.toHaveBeenCalled();
    errs.length = 0;
  });
});

describe("--install (shell greeting)", () => {
  const written = () => fsMock.writeFileSync.mock.calls.map((c) => String(c[0]));
  const appended = () => fsMock.appendFileSync.mock.calls.map((c) => String(c[0]));

  it("copies the script, hushes login and creates .bashrc when missing", async () => {
    await run(["--install"]);
    expect(fsMock.mkdirSync).toHaveBeenCalledWith("/home/ada/.config", { recursive: true });
    expect(fsMock.copyFileSync).toHaveBeenCalled();
    expect(fsMock.chmodSync).toHaveBeenCalledWith("/home/ada/.config/systeminfo", "755");
    expect(written()).toContain("/home/ada/.hushlogin");
    expect(fsMock.writeFileSync).toHaveBeenCalledWith(
      "/home/ada/.bashrc",
      "node /home/ada/.config/systeminfo\n",
    );
    expect(out.join("\n")).toContain("Shell greeting installation completed!");
  });

  it("appends to existing rc files that don't mention systeminfo yet", async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue("# my rc\n");
    await run(["--install"]);
    const files = appended();
    expect(files).toContain("/home/ada/.bashrc");
    expect(files).toContain("/home/ada/.zshrc");
    expect(files).toContain("/home/ada/.config/fish/config.fish");
    expect(files).toContain("/home/ada/.config/nushell/config.nu");
    const fish = fsMock.appendFileSync.mock.calls.find((c) => String(c[0]).includes("fish"));
    expect(String(fish?.[1])).toContain('set -U fish_greeting ""');
    const nu = fsMock.appendFileSync.mock.calls.find((c) => String(c[0]).includes("nushell"));
    expect(String(nu?.[1])).toContain("show_banner = false");
    expect(fsMock.mkdirSync).not.toHaveBeenCalled();
  });

  it("is idempotent when the rc files already call systeminfo", async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue("node ~/.config/systeminfo\n");
    await run(["--install"]);
    expect(fsMock.appendFileSync).not.toHaveBeenCalled();
  });

  it("tolerates a failing .hushlogin write", async () => {
    fsMock.writeFileSync.mockImplementation((p: string) => {
      if (String(p).endsWith(".hushlogin")) throw new Error("EACCES");
    });
    await run(["--install"]);
    expect(out.join("\n")).toContain("installation completed");
  });

  it("prints PowerShell instructions and writes a startup batch file on Windows", async () => {
    await run(["--install"], "win32");
    const text = out.join("\n");
    expect(text).toContain("Windows installation:");
    expect(text).toContain("Add-Content $PROFILE");
    expect(written().some((p) => p.endsWith("systeminfo-startup.bat"))).toBe(true);
    expect(fsMock.chmodSync).not.toHaveBeenCalled();
  });

  it("reports install errors and exits 1", async () => {
    fsMock.copyFileSync.mockImplementation(() => {
      throw new Error("disk full");
    });
    await run(["--install"]);
    expect(errs.join("\n")).toContain("Error installing shell greeting: disk full");
    expect(exitCode).toBe(1);
  });
});

describe("exports", () => {
  it("exposes displaySystemInfo and installShellGreeting", async () => {
    const mod = await run(["--settings-show"]);
    expect(typeof mod.displaySystemInfo).toBe("function");
    expect(typeof mod.installShellGreeting).toBe("function");
  });
});
