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
  networkInterfaces: vi.fn(),
  tmpdir: vi.fn(() => "/tmp"),
  platform: vi.fn(() => "linux"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const n = await import("./network");
import type { InfoContext } from "../types/internal-types";

const ctx = (extra: Partial<InfoContext> = {}): InfoContext => ({ cache: {}, ...extra });
const platform = (p: "linux" | "mac" | "windows") => {
  flags.linux = p === "linux";
  flags.mac = p === "mac";
  flags.windows = p === "windows";
};

const iface = (address: string, internal = false, family = "IPv4") => ({
  address,
  family,
  internal,
});

beforeEach(() => {
  platform("linux");
  execCommand.mockReset().mockReturnValue("");
  osMock.networkInterfaces.mockReset().mockReturnValue({});
});

describe("ipinfo-derived fields", () => {
  const info = { ip: "1.2.3.4", city: "Paris", hostname: "host.example", org: "AS123 Example Net Inc" };

  it("ip / city read from the context", () => {
    expect(n.ip(ctx({ ipInfo: info }))).toBe("1.2.3.4");
    expect(n.city(ctx({ ipInfo: info }))).toBe("Paris");
    expect(n.ip(ctx())).toBe("");
    expect(n.city(ctx())).toBe("");
  });

  it("domain prefixes http:// only when a hostname is known", () => {
    expect(n.domain(ctx({ ipInfo: info }))).toBe("http://host.example");
    expect(n.domain(ctx())).toBe("");
  });

  it("isp drops the leading AS number", () => {
    expect(n.isp(ctx({ ipInfo: info }))).toBe("Example Net Inc");
    expect(n.isp(ctx())).toBe("");
  });
});

describe("iplocal", () => {
  it("prefers the wlan0 address from ifconfig on Linux", () => {
    execCommand.mockReturnValue("eth0: flags\n  inet 10.0.0.2\nwlan0: flags\n  inet 192.168.1.50 netmask");
    expect(n.iplocal()).toBe("192.168.1.50");
  });

  it("falls back to `ip addr`, skipping loopback", () => {
    execCommand.mockImplementation((c: string) =>
      c.startsWith("ifconfig")
        ? ""
        : "inet 127.0.0.1/8 lo\ninet 10.0.0.5/24 eth0\ninet 172.16.0.9/16 eth1",
    );
    expect(n.iplocal()).toBe("10.0.0.5 172.16.0.9");
  });

  it("falls back to os.networkInterfaces when the shell tools find nothing", () => {
    osMock.networkInterfaces.mockReturnValue({
      lo: [iface("127.0.0.1", true)],
      eth0: [iface("10.1.1.1"), iface("fe80::1", false, "IPv6")],
      wl: undefined,
    });
    expect(n.iplocal()).toBe("10.1.1.1");
  });

  it("survives the shell helpers throwing", () => {
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    osMock.networkInterfaces.mockReturnValue({ en0: [iface("192.168.0.2")] });
    expect(n.iplocal()).toBe("192.168.0.2");
  });

  it("uses os.networkInterfaces directly on macOS", () => {
    platform("mac");
    osMock.networkInterfaces.mockReturnValue({ en0: [iface("192.168.0.9")] });
    expect(n.iplocal()).toBe("192.168.0.9");
    expect(execCommand).not.toHaveBeenCalled();
  });
});

describe("network_interfaces", () => {
  it("lists active non-loopback IPv4 interfaces", () => {
    osMock.networkInterfaces.mockReturnValue({
      lo: [iface("127.0.0.1", true)],
      eth0: [iface("10.0.0.1")],
      docker0: [iface("172.17.0.1", true)],
      wlan0: [iface("fe80::1", false, "IPv6"), iface("10.0.0.2")],
      empty: undefined,
    });
    expect(n.network_interfaces(ctx())).toBe("eth0 wlan0");
  });

  it("is empty on Windows", () => {
    platform("windows");
    expect(n.network_interfaces(ctx())).toBe("");
  });

  it("is empty when os.networkInterfaces throws", () => {
    osMock.networkInterfaces.mockImplementation(() => {
      throw new Error("x");
    });
    expect(n.network_interfaces(ctx())).toBe("");
  });

  it("serves from the cache", () => {
    const c = ctx();
    osMock.networkInterfaces.mockReturnValue({ eth0: [iface("10.0.0.1")] });
    expect(n.network_interfaces(c)).toBe("eth0");
    osMock.networkInterfaces.mockReturnValue({});
    expect(n.network_interfaces(c)).toBe("eth0");
  });
});

describe("ports", () => {
  const LSOF = [
    "COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME",
    "node 100 me 20u IPv4 0x1 0t0 TCP *:3000 (LISTEN)".replace("*:3000 (LISTEN)", "*:3000"),
    "nginx-wo 101 me 6u IPv6 0x2 0t0 TCP [::1]:8080",
    "node 102 me 21u IPv4 0x3 0t0 TCP *:3000",
    "short line",
    "weird 103 me 5u IPv4 0x4 0t0 TCP noport",
  ].join("\n");

  it("lists unique port+process pairs", () => {
    execCommand.mockReturnValue(LSOF);
    expect(n.ports(ctx())).toBe("3000node 8080ngin");
  });

  it("is empty on Windows and when lsof throws", () => {
    platform("windows");
    expect(n.ports(ctx())).toBe("");
    platform("linux");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(n.ports(ctx())).toBe("");
  });

  it("serves from the cache", () => {
    const c = ctx();
    execCommand.mockReturnValue(LSOF);
    n.ports(c);
    execCommand.mockReturnValue("");
    expect(n.ports(c)).toBe("3000node 8080ngin");
  });
});
