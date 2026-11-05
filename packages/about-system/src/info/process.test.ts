import { beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ linux: true, mac: false, windows: false }));
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
vi.mock("../utils/command", () => ({ execCommand, commandExists: vi.fn() }));

const osMock = vi.hoisted(() => ({
  uptime: vi.fn(() => 0),
  tmpdir: vi.fn(() => "/tmp"),
  platform: vi.fn(() => "linux"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const p = await import("./process");
import type { InfoContext } from "../types/internal-types";

const ctx = (): InfoContext => ({ cache: {} });
const platform = (v: "linux" | "mac" | "windows") => {
  flags.linux = v === "linux";
  flags.mac = v === "mac";
  flags.windows = v === "windows";
};

beforeEach(() => {
  platform("linux");
  execCommand.mockReset().mockReturnValue("");
});

describe("top_process", () => {
  it("reports the busiest process on Linux with a single percent sign", () => {
    execCommand.mockReturnValue(" 12.5 /usr/bin/node\n  3.0 bash");
    expect(p.top_process(ctx())).toBe("12% node");
  });

  it("is empty when ps output cannot be parsed on Linux", () => {
    execCommand.mockReturnValue("");
    expect(p.top_process(ctx())).toBe("");
  });

  it("parses `ps -r` output on macOS and rounds the CPU value", () => {
    platform("mac");
    execCommand.mockReturnValue("%CPU COMM\n 37.6 Google Chrome\n 2.0 Finder");
    expect(p.top_process(ctx())).toBe("38% Google Chrome");
  });

  it("is empty on macOS when there is no data row or it is malformed", () => {
    platform("mac");
    execCommand.mockReturnValue("%CPU COMM");
    expect(p.top_process(ctx())).toBe("");
    execCommand.mockReturnValue("%CPU COMM\nabc");
    expect(p.top_process(ctx())).toBe("");
  });

  it("is empty on Windows", () => {
    platform("windows");
    expect(p.top_process(ctx())).toBe("");
  });

  it("serves from the cache", () => {
    const c = ctx();
    execCommand.mockReturnValue("5.1 node");
    expect(p.top_process(c)).toBe("5% node");
    execCommand.mockReturnValue("99.9 other");
    expect(p.top_process(c)).toBe("5% node");
  });
});

describe("uptime", () => {
  it.each([
    [0, "0d 0h 0m"],
    [59, "0d 0h 0m"],
    [3_660, "0d 1h 1m"],
    [90_061, "1d 1h 1m"],
    [86_400 * 10 + 7_200 + 1_800, "10d 2h 30m"],
  ])("formats %i seconds", (secs, expected) => {
    osMock.uptime.mockReturnValue(secs);
    expect(p.uptime()).toBe(expected);
  });
});

describe("users_logged_in", () => {
  it("counts non-blank `who` lines", () => {
    execCommand.mockReturnValue("a tty1\n\nb pts/0\n");
    expect(p.users_logged_in()).toBe("2 users");
  });

  it("is empty with nobody logged in or on Windows", () => {
    execCommand.mockReturnValue("");
    expect(p.users_logged_in()).toBe("");
    platform("windows");
    expect(p.users_logged_in()).toBe("");
  });

  it("is empty when the command throws", () => {
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(p.users_logged_in()).toBe("");
  });
});
