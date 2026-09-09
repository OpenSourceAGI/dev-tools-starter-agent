/**
 * @fileoverview Covers the platform facts `about-system` opens its readout
 * with: user, hostname, OS name, kernel and device model.
 *
 * Each of these shells out to a different tool per platform and parses its
 * output, so the tests drive the Linux path (the one CI runs on) end to end and
 * pin the two behaviours that hold everywhere: the cache is consulted before
 * any command runs, and a missing tool degrades to a fallback rather than
 * throwing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These modules bind their imports by name, so the dependencies have to be
// mocked outright rather than spied on through a namespace object.
const execCommand = vi.hoisted(() => vi.fn());
const commandExists = vi.hoisted(() => vi.fn());
vi.mock("../utils/command", () => ({ execCommand, commandExists }));

const osMock = vi.hoisted(() => ({
  platform: vi.fn(() => "linux"),
  release: vi.fn(() => "6.1.0-generic"),
  hostname: vi.fn(() => "workstation"),
  userInfo: vi.fn(() => ({ username: "ada" })),
  // cache-config resolves the cache file under the temp directory at import time.
  tmpdir: vi.fn(() => "/tmp"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

const { device, hostname, kernel, os_info, user } = await import("./platform");
const { IS_LINUX } = await import("../utils/platform");
import type { InfoContext } from "../types/internal-types";

const context = (): InfoContext => ({ cache: {} });

beforeEach(() => {
  execCommand.mockReturnValue("");
  commandExists.mockReturnValue(false);
  fsMock.existsSync.mockReturnValue(false);
  fsMock.readFileSync.mockReturnValue("");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("user and hostname", () => {
  it("reads the current username", () => {
    expect(user()).toBe("ada");
  });

  it("reads the machine's network name", () => {
    expect(hostname()).toBe("workstation");
  });
});

describe("kernel", () => {
  it("reports the kernel release", () => {
    expect(kernel(context())).toBe("6.1.0-generic");
  });

  it("caches the result", () => {
    const ctx = context();
    kernel(ctx);
    expect(ctx.cache.kernel?.value).toBe("6.1.0-generic");
  });

  it("serves a cached kernel without asking the OS again", () => {
    const ctx = context();
    ctx.cache.kernel = { value: "cached-kernel", timestamp: Date.now() };

    expect(kernel(ctx)).toBe("cached-kernel");
    expect(osMock.release).not.toHaveBeenCalled();
  });
});

describe("os_info", () => {
  it("serves a cached value without running any command", () => {
    const ctx = context();
    ctx.cache.os = { value: "Cached OS 1.0", timestamp: Date.now() };

    expect(os_info(ctx)).toBe("Cached OS 1.0");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("caches whatever it resolves", () => {
    const ctx = context();
    const resolved = os_info(ctx);
    expect(ctx.cache.os?.value).toBe(resolved);
  });

  it("never returns an empty string, whatever the platform", () => {
    expect(os_info(context())).toBeTruthy();
  });

  it.runIf(IS_LINUX)("reads the distribution from /etc/os-release", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(
      'NAME="Ubuntu"\nVERSION_ID="22.04"\nID=ubuntu\n',
    );

    expect(os_info(context())).toBe("Ubuntu 22.04");
  });

  it.runIf(IS_LINUX)("uses the name alone when there is no version id", () => {
    fsMock.readFileSync.mockReturnValue('NAME="Arch Linux"\n');
    expect(os_info(context())).toBe("Arch Linux");
  });

  it.runIf(IS_LINUX)("falls back to the kernel release with no os-release file", () => {
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(os_info(context())).toBe("Linux 6.1.0-generic");
  });

  it.runIf(IS_LINUX)("falls back to a bare Linux when the file has no NAME", () => {
    fsMock.readFileSync.mockReturnValue("ID=unknown\n");
    expect(os_info(context())).toBe("Linux");
  });
});

describe("device", () => {
  it("serves a cached model without probing", () => {
    const ctx = context();
    ctx.cache.device = { value: "Cached Box", timestamp: Date.now() };

    expect(device(ctx)).toBe("Cached Box");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("caches an empty result too, so the probe is not repeated", () => {
    const ctx = context();
    device(ctx);
    expect(ctx.cache.device).toBeDefined();
  });

  it("returns an empty string when nothing identifies the machine", () => {
    expect(device(context())).toBe("");
  });

  it.runIf(IS_LINUX)("reads the model from the DMI product name", () => {
    fsMock.existsSync.mockImplementation(
      (path: string) => path === "/sys/devices/virtual/dmi/id/product_name",
    );
    fsMock.readFileSync.mockReturnValue("OptiPlex 7090\n");

    expect(device(context())).toBe("OptiPlex 7090");
  });

  it.runIf(IS_LINUX)("prefers Android's getprop when it is available", () => {
    commandExists.mockImplementation((cmd: string) => cmd === "getprop");
    execCommand.mockReturnValue("Pixel 8");

    expect(device(context())).toBe("Pixel 8");
    expect(execCommand).toHaveBeenCalledWith("getprop ro.product.model");
  });

  it.runIf(IS_LINUX)("falls through to DMI when getprop answers nothing", () => {
    commandExists.mockImplementation((cmd: string) => cmd === "getprop");
    execCommand.mockReturnValue("");
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue("Steam Deck\n");

    expect(device(context())).toBe("Steam Deck");
  });

  it.runIf(IS_LINUX)("ignores a blank DMI product name", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue("   \n");

    expect(device(context())).toBe("");
  });

  it.runIf(IS_LINUX)("survives an unreadable DMI file", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error("EACCES");
    });

    expect(device(context())).toBe("");
  });
});
