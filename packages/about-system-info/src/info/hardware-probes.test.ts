import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
  writeFileSync: vi.fn(),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

const osMock = vi.hoisted(() => ({
  cpus: vi.fn(() => [] as { model: string }[]),
  tmpdir: vi.fn(() => "/tmp"),
  platform: vi.fn(() => "linux"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const h = await import("./hardware");
import type { InfoContext } from "../types/internal-types";

const ctx = (): InfoContext => ({ cache: {} });
const platform = (k: "linux" | "mac" | "windows" | "other") => {
  flags.linux = k === "linux";
  flags.mac = k === "mac";
  flags.windows = k === "windows";
};

beforeEach(() => {
  platform("linux");
  execCommand.mockReset().mockReturnValue("");
  fsMock.readFileSync.mockReset().mockReturnValue("");
  osMock.cpus.mockReset().mockReturnValue([]);
});

afterEach(() => {
  delete process.env.DISPLAY;
});

describe("cpu", () => {
  it("reads the model from lscpu on Linux and trims `with ...` suffixes", () => {
    execCommand.mockReturnValue("Architecture: x86_64\nModel name:  AMD Ryzen 7 5800X with Radeon\nFlags: a");
    expect(h.cpu(ctx())).toBe("AMD Ryzen 7 5800X");
  });

  it("stops the lscpu model at a comma", () => {
    execCommand.mockReturnValue("Model name: Intel(R) Core(TM) i7, 8 cores");
    expect(h.cpu(ctx())).toBe("Intel(R) Core(TM) i7");
  });

  it("falls back to /proc/cpuinfo model name, then Hardware", () => {
    fsMock.readFileSync.mockReturnValue("processor : 0\nmodel name : Fancy CPU\n");
    expect(h.cpu(ctx())).toBe("Fancy CPU");
    fsMock.readFileSync.mockReturnValue("Hardware : BCM2711\n");
    expect(h.cpu(ctx())).toBe("BCM2711");
  });

  it("is empty when Linux offers no CPU name", () => {
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error("x");
    });
    expect(h.cpu(ctx())).toBe("");
    fsMock.readFileSync.mockReturnValue("nothing useful");
    expect(h.cpu(ctx())).toBe("");
  });

  it("uses wmic on Windows, then PowerShell", () => {
    platform("windows");
    execCommand.mockReturnValue("Name=Intel(R) Core(TM) i9-9900K CPU @ 3.60GHz\r\n");
    expect(h.cpu(ctx())).toBe("Intel(R) Core(TM) i9-9900K CPU @ 3.60GHz");
    execCommand.mockImplementation((c: string) => (c.startsWith("wmic") ? "" : "Ryzen 5 3600\r\n"));
    expect(h.cpu(ctx())).toBe("Ryzen 5 3600");
    execCommand.mockReturnValue("");
    expect(h.cpu(ctx())).toBe("");
  });

  it("uses os.cpus elsewhere (macOS)", () => {
    platform("mac");
    osMock.cpus.mockReturnValue([{ model: "Apple M2\r\nPro " }]);
    expect(h.cpu(ctx())).toBe("Apple M2 Pro");
    osMock.cpus.mockReturnValue([]);
    expect(h.cpu(ctx())).toBe("");
  });

  it("serves from the cache", () => {
    const c = ctx();
    execCommand.mockReturnValue("Model name: Cached CPU");
    h.cpu(c);
    execCommand.mockReturnValue("Model name: Other");
    expect(h.cpu(c)).toBe("Cached CPU");
  });
});

describe("gpu", () => {
  it("lists display-class lspci devices using the bracketed marketing name", () => {
    execCommand.mockReturnValue(
      [
        "00:02.0 VGA compatible controller: Intel Corporation UHD Graphics 630 [UHD Graphics 630]",
        "01:00.0 VGA compatible controller: NVIDIA Corporation GA104 [GeForce RTX 3070] (rev a1)",
        "01:00.1 Audio device: NVIDIA Corporation GA104 High Definition Audio",
        "02:00.0 Ethernet controller: Realtek",
        "03:00.0 3D controller: NVIDIA Corporation GA104 [GeForce RTX 3070]",
      ].join("\n"),
    );
    expect(h.gpu(ctx())).toBe("UHD Graphics 630, GeForce RTX 3070");
  });

  it("strips the class prefix and revision when there are no brackets", () => {
    execCommand.mockReturnValue("00:02.0 VGA compatible controller: Intel Corporation HD Graphics (rev 09)");
    expect(h.gpu(ctx())).toBe("Intel Corporation HD Graphics");
  });

  it("is empty when no GPU is found, or lspci fails", () => {
    execCommand.mockReturnValue("00:1f.0 ISA bridge: Intel");
    expect(h.gpu(ctx())).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(h.gpu(ctx())).toBe("");
  });

  it("lists wmic adapters on Windows, ignoring Microsoft Basic", () => {
    platform("windows");
    execCommand.mockReturnValue("Name=NVIDIA GeForce RTX 4090\r\nName=Microsoft Basic Display Adapter\r\nName=Intel UHD\r\n");
    expect(h.gpu(ctx())).toBe("NVIDIA GeForce RTX 4090, Intel UHD");
  });

  it("falls back to PowerShell on Windows", () => {
    platform("windows");
    execCommand.mockImplementation((c: string) =>
      c.startsWith("wmic") ? "" : "AMD Radeon RX 7900\r\nMicrosoft Basic Render\r\n\r\n",
    );
    expect(h.gpu(ctx())).toBe("AMD Radeon RX 7900");
    execCommand.mockReturnValue("");
    expect(h.gpu(ctx())).toBe("");
  });

  it("lists chipset models on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue("Graphics:\n  Chipset Model: Apple M2 Pro\n  Chipset Model: AMD Radeon Pro");
    expect(h.gpu(ctx())).toBe("Apple M2 Pro, AMD Radeon Pro");
    execCommand.mockReturnValue("none");
    expect(h.gpu(ctx())).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(h.gpu(ctx())).toBe("");
  });

  it("is empty on unknown platforms and serves from the cache", () => {
    platform("other");
    const c = ctx();
    expect(h.gpu(c)).toBe("");
    platform("linux");
    execCommand.mockReturnValue("00:02.0 VGA compatible controller: Intel UHD Graphics [UHD]");
    expect(h.gpu(c)).toBe("");
  });
});

describe("screen_resolution", () => {
  it("parses the xrandr geometry on Linux when DISPLAY is set", () => {
    process.env.DISPLAY = ":0";
    execCommand.mockReturnValue("Screen 0: minimum 8 x 8\nHDMI-1 connected primary 2560x1440+0+0");
    expect(h.screen_resolution()).toBe("2560x1440");
  });

  it("is empty without DISPLAY, without a match, or when xrandr throws", () => {
    expect(h.screen_resolution()).toBe("");
    process.env.DISPLAY = ":0";
    execCommand.mockReturnValue("nothing");
    expect(h.screen_resolution()).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(h.screen_resolution()).toBe("");
  });

  it("parses the system_profiler resolution on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue("Resolution: 3024 x 1964 Retina");
    expect(h.screen_resolution()).toBe("3024x1964");
    execCommand.mockReturnValue("nope");
    expect(h.screen_resolution()).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(h.screen_resolution()).toBe("");
  });

  it("is empty on other platforms", () => {
    platform("windows");
    expect(h.screen_resolution()).toBe("");
  });
});
