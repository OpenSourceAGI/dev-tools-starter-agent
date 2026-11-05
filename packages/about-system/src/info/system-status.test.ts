import { beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ linux: true, mac: false }));
vi.mock("../utils/platform", () => ({
  get IS_LINUX() {
    return flags.linux;
  },
  get IS_MAC() {
    return flags.mac;
  },
  IS_WINDOWS: false,
}));

const execCommand = vi.hoisted(() => vi.fn());
const commandExists = vi.hoisted(() => vi.fn());
vi.mock("../utils/command", () => ({ execCommand, commandExists }));

const files = vi.hoisted(() => ({ map: {} as Record<string, string> }));
const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn((p: string) => p in files.map),
  readFileSync: vi.fn((p: string) => {
    if (!(p in files.map)) throw new Error("ENOENT");
    return files.map[p];
  }),
  writeFileSync: vi.fn(),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

const osMock = vi.hoisted(() => ({
  loadavg: vi.fn(() => [0.5, 1.25, 2]),
  tmpdir: vi.fn(() => "/tmp"),
  platform: vi.fn(() => "linux"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const st = await import("./system-status");
import type { InfoContext } from "../types/internal-types";

const ctx = (): InfoContext => ({ cache: {} });
const platform = (v: "linux" | "mac" | "other") => {
  flags.linux = v === "linux";
  flags.mac = v === "mac";
};

beforeEach(() => {
  platform("linux");
  files.map = {};
  execCommand.mockReset().mockReturnValue("");
  commandExists.mockReset().mockReturnValue(false);
});

describe("load_average", () => {
  it("reads /proc/loadavg on Linux", () => {
    files.map["/proc/loadavg"] = "0.10 0.20 0.30 1/200 999";
    expect(st.load_average(ctx())).toBe("0.10 0.20 0.30");
  });

  it("is empty when /proc/loadavg is unreadable", () => {
    expect(st.load_average(ctx())).toBe("");
  });

  it("formats os.loadavg on macOS", () => {
    platform("mac");
    expect(st.load_average(ctx())).toBe("0.50 1.25 2.00");
  });

  it("is empty on other platforms", () => {
    platform("other");
    expect(st.load_average(ctx())).toBe("");
  });
});

describe("battery", () => {
  it("reads capacity/status from sysfs on Linux", () => {
    files.map["/sys/class/power_supply/BAT0/capacity"] = "87\n";
    files.map["/sys/class/power_supply/BAT0/status"] = "Charging\n";
    expect(st.battery(ctx())).toBe("87%+");
  });

  it("omits the + when discharging, or when status is unavailable", () => {
    files.map["/sys/class/power_supply/BAT0/capacity"] = "50";
    files.map["/sys/class/power_supply/BAT0/status"] = "Discharging";
    expect(st.battery(ctx())).toBe("50%");
    delete files.map["/sys/class/power_supply/BAT0/status"];
    expect(st.battery(ctx())).toBe("50%");
  });

  it("is empty with no battery", () => {
    expect(st.battery(ctx())).toBe("");
  });

  it("parses pmset on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue("Now drawing from 'AC Power'\n -InternalBattery-0 (id=1)\t64%; charging; 1:00 remaining");
    expect(st.battery(ctx())).toBe("64%+");
    execCommand.mockReturnValue("-InternalBattery-0\t64%; discharging; 3:00 remaining");
    expect(st.battery(ctx())).toBe("64%");
    execCommand.mockReturnValue("No batteries");
    expect(st.battery(ctx())).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(st.battery(ctx())).toBe("");
  });

  it("is empty on other platforms, and cached", () => {
    platform("other");
    const c = ctx();
    expect(st.battery(c)).toBe("");
    platform("linux");
    files.map["/sys/class/power_supply/BAT0/capacity"] = "10";
    expect(st.battery(c)).toBe("");
  });
});

describe("temperature", () => {
  it("reads the first plausible sysfs thermal source", () => {
    files.map["/sys/class/thermal/thermal_zone0/temp"] = "0";
    files.map["/sys/class/hwmon/hwmon0/temp1_input"] = "54321";
    expect(st.temperature(ctx())).toBe("54°C");
  });

  it("rejects implausible readings", () => {
    files.map["/sys/class/thermal/thermal_zone0/temp"] = "200000";
    expect(st.temperature(ctx())).toBe("");
  });

  it("is empty when no sensors exist", () => {
    expect(st.temperature(ctx())).toBe("");
  });

  it("uses osx-cpu-temp on macOS when installed", () => {
    platform("mac");
    commandExists.mockReturnValue(true);
    execCommand.mockReturnValue("61.7°C");
    expect(st.temperature(ctx())).toBe("62°C");
    execCommand.mockReturnValue("999.0°C");
    expect(st.temperature(ctx())).toBe("");
    execCommand.mockReturnValue("no temp");
    expect(st.temperature(ctx())).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(st.temperature(ctx())).toBe("");
  });

  it("is empty on macOS without osx-cpu-temp and on other platforms", () => {
    platform("mac");
    expect(st.temperature(ctx())).toBe("");
    platform("other");
    expect(st.temperature(ctx())).toBe("");
  });

  it("serves from the cache", () => {
    const c = ctx();
    files.map["/sys/class/thermal/thermal_zone0/temp"] = "40000";
    expect(st.temperature(c)).toBe("40°C");
    files.map["/sys/class/thermal/thermal_zone0/temp"] = "90000";
    expect(st.temperature(c)).toBe("40°C");
  });
});

describe("services_running", () => {
  it("counts running units via systemctl", () => {
    commandExists.mockImplementation((c: string) => c === "systemctl");
    execCommand.mockReturnValue("a.service loaded active running A\nb.service loaded active running B\nfooter");
    expect(st.services_running(ctx())).toBe("2 services");
  });

  it("falls back to `service --status-all`", () => {
    commandExists.mockImplementation((c: string) => c === "service");
    execCommand.mockReturnValue(" [ + ]  cron\n [ - ]  nginx\n [ + ]  ssh");
    expect(st.services_running(ctx())).toBe("2 services");
  });

  it("is empty with no service manager, zero services, or on error", () => {
    expect(st.services_running(ctx())).toBe("");
    commandExists.mockReturnValue(true);
    execCommand.mockReturnValue("");
    expect(st.services_running(ctx())).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(st.services_running(ctx())).toBe("");
  });

  it("counts launchctl entries on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue("PID Status Label\n1 0 com.a\n- 0 com.b\n\n");
    expect(st.services_running(ctx())).toBe("2 services");
    execCommand.mockReturnValue("PID Status Label");
    expect(st.services_running(ctx())).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(st.services_running(ctx())).toBe("");
  });

  it("is empty on other platforms, and cached", () => {
    platform("other");
    const c = ctx();
    expect(st.services_running(c)).toBe("");
    platform("mac");
    execCommand.mockReturnValue("PID\n1 0 a");
    expect(st.services_running(c)).toBe("");
  });
});
