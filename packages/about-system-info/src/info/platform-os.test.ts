/**
 * @fileoverview The Windows and macOS branches of the platform facts, which
 * the Linux-only suite in platform.test.ts cannot reach.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ linux: false, mac: false, windows: false }));
vi.mock("../utils/platform", () => ({
  get IS_LINUX() {
    return flags.linux;
  },
  get IS_MAC() {
    return flags.mac;
  },
  get IS_WINDOWS() {
    return flags.windows;
  },
}));

const execCommand = vi.hoisted(() => vi.fn());
const commandExists = vi.hoisted(() => vi.fn());
vi.mock("../utils/command", () => ({ execCommand, commandExists }));

const osMock = vi.hoisted(() => ({
  platform: vi.fn(() => "freebsd"),
  release: vi.fn(() => "14.0"),
  hostname: vi.fn(() => "h"),
  userInfo: vi.fn(() => ({ username: "u" })),
  tmpdir: vi.fn(() => "/tmp"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

const p = await import("./platform");
import type { InfoContext } from "../types/internal-types";

const ctx = (): InfoContext => ({ cache: {} });
const only = (k: "linux" | "mac" | "windows" | "none") => {
  flags.linux = k === "linux";
  flags.mac = k === "mac";
  flags.windows = k === "windows";
};

beforeEach(() => {
  only("none");
  execCommand.mockReset().mockReturnValue("");
  commandExists.mockReset().mockReturnValue(false);
});

describe("os_info off Linux", () => {
  it("falls back to '<platform> <release>' on an unknown OS", () => {
    expect(p.os_info(ctx())).toBe("freebsd 14.0");
  });

  it("combines the macOS product name and version from sw_vers", () => {
    only("mac");
    execCommand.mockImplementation((c: string) =>
      c.endsWith("productName") ? "macOS" : "14.4.1",
    );
    expect(p.os_info(ctx())).toBe("macOS 14.4.1");
  });

  it("falls back to 'macOS <release>' when sw_vers is silent", () => {
    only("mac");
    expect(p.os_info(ctx())).toBe("macOS 14.0");
  });

  it("parses the Windows version from `ver`", () => {
    only("windows");
    execCommand.mockReturnValue("Microsoft Windows [Version 10.0.22631.3447]");
    expect(p.os_info(ctx())).toBe("Windows 10.0.22631.3447");
  });

  it("falls back to the kernel release when `ver` is unparseable or throws", () => {
    only("windows");
    execCommand.mockReturnValue("garbage");
    expect(p.os_info(ctx())).toBe("Windows 14.0");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(p.os_info(ctx())).toBe("Windows 14.0");
  });
});

describe("device off Linux", () => {
  it("reads the Windows model from wmic", () => {
    only("windows");
    execCommand.mockReturnValue("Name=Surface Laptop 5\r\n");
    expect(p.device(ctx())).toBe("Surface Laptop 5");
  });

  it("falls back to PowerShell on Windows when wmic gives nothing", () => {
    only("windows");
    execCommand.mockImplementation((c: string) =>
      c.startsWith("wmic") ? "" : "ThinkPad X1\r\n",
    );
    expect(p.device(ctx())).toBe("ThinkPad X1");
  });

  it("is empty on Windows when neither tool answers", () => {
    only("windows");
    expect(p.device(ctx())).toBe("");
  });

  it("reads the macOS model name from system_profiler", () => {
    only("mac");
    execCommand.mockReturnValue("Hardware:\n  Model Name: MacBook Pro\n  Chip: M3");
    expect(p.device(ctx())).toBe("MacBook Pro");
  });

  it("is empty on macOS when system_profiler has no model line", () => {
    only("mac");
    execCommand.mockReturnValue("nothing");
    expect(p.device(ctx())).toBe("");
  });
});
