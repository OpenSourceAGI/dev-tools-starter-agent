/**
 * @fileoverview Memory and disk probes. Every function branches on the host
 * platform, so `utils/platform` is mocked with live getters and each test
 * picks the OS it wants to impersonate.
 */
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

const fsMock = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

const osMock = vi.hoisted(() => ({
  totalmem: vi.fn(() => 16 * 1024 ** 3),
  freemem: vi.fn(() => 4 * 1024 ** 3),
  tmpdir: vi.fn(() => "/tmp"),
  platform: vi.fn(() => "linux"),
}));
vi.mock("os", () => ({ ...osMock, default: osMock }));

const m = await import("./memory");
import type { InfoContext } from "../types/internal-types";

const ctx = (cache: InfoContext["cache"] = {}): InfoContext => ({ cache });
const platform = (p: "linux" | "mac" | "windows") => {
  flags.linux = p === "linux";
  flags.mac = p === "mac";
  flags.windows = p === "windows";
};

const MEMINFO = [
  "MemTotal:       16777216 kB",
  "MemFree:         4194304 kB",
  "MemAvailable:    8388608 kB",
  "SwapTotal:       2097152 kB",
  "SwapFree:        1572864 kB",
].join("\n");

beforeEach(() => {
  platform("linux");
  execCommand.mockReset().mockReturnValue("");
  fsMock.readFileSync.mockReset().mockReturnValue(MEMINFO);
  osMock.totalmem.mockReturnValue(16 * 1024 ** 3);
  osMock.freemem.mockReturnValue(4 * 1024 ** 3);
});

describe("ram_used", () => {
  it("reads /proc/meminfo on Linux", () => {
    expect(m.ram_used(ctx())).toBe("12/16GB");
  });

  it("falls back to os.totalmem when /proc/meminfo is unreadable", () => {
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error("nope");
    });
    expect(m.ram_used(ctx())).toBe("12/16GB");
  });

  it("falls back to os.totalmem when meminfo lacks the keys", () => {
    fsMock.readFileSync.mockReturnValue("garbage");
    expect(m.ram_used(ctx())).toBe("12/16GB");
  });

  it("uses os memory on non-Linux hosts", () => {
    platform("mac");
    osMock.totalmem.mockReturnValue(8 * 1024 ** 3);
    osMock.freemem.mockReturnValue(2 * 1024 ** 3);
    expect(m.ram_used(ctx())).toBe("6/8GB");
    expect(fsMock.readFileSync).not.toHaveBeenCalled();
  });

  it("serves a cached value and stores a fresh one", () => {
    const cache = {};
    expect(m.ram_used(ctx(cache))).toBe("12/16GB");
    fsMock.readFileSync.mockReturnValue("MemTotal: 1 kB\nMemFree: 1 kB");
    expect(m.ram_used(ctx(cache))).toBe("12/16GB");
  });
});

describe("memory_available", () => {
  it("reads MemAvailable on Linux", () => {
    expect(m.memory_available()).toBe("8GB available");
  });

  it("returns empty when MemAvailable is missing or unreadable on Linux", () => {
    fsMock.readFileSync.mockReturnValue("MemTotal: 1 kB");
    expect(m.memory_available()).toBe("");
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error("x");
    });
    expect(m.memory_available()).toBe("");
  });

  it("derives free+inactive pages from vm_stat on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue(
      [
        "Mach Virtual Memory Statistics: (page size of 16384 bytes)",
        "Pages free:                               262144.",
        "Pages inactive:                           262144.",
      ].join("\n"),
    );
    // (262144 + 262144) * 16384 bytes = 8 GiB
    expect(m.memory_available()).toBe("8GB available");
    expect(execCommand).toHaveBeenCalledWith("vm_stat");
  });

  it("returns empty on macOS when vm_stat output is unparseable", () => {
    platform("mac");
    execCommand.mockReturnValue("nonsense");
    expect(m.memory_available()).toBe("");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(m.memory_available()).toBe("");
  });

  it("returns empty on Windows", () => {
    platform("windows");
    expect(m.memory_available()).toBe("");
  });
});

describe("swap_used", () => {
  it("computes percent and MB on Linux", () => {
    // 2 GiB total, 0.5 GiB used
    expect(m.swap_used()).toBe("25% (512MB) swap");
  });

  it("returns empty when there is no swap or meminfo is bad", () => {
    fsMock.readFileSync.mockReturnValue("SwapTotal: 0 kB\nSwapFree: 0 kB");
    expect(m.swap_used()).toBe("");
    fsMock.readFileSync.mockReturnValue("nothing");
    expect(m.swap_used()).toBe("");
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error("x");
    });
    expect(m.swap_used()).toBe("");
  });

  it("parses sysctl vm.swapusage on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue("total = 2048.00M  used = 512.00M  free = 1536.00M  (encrypted)");
    expect(m.swap_used()).toBe("25% (512MB) swap");
  });

  it("reports zero swap on macOS when total is 0", () => {
    platform("mac");
    execCommand.mockReturnValue("total = 0.00M  used = 0.00M  free = 0.00M");
    expect(m.swap_used()).toBe("0% (0MB) swap");
  });

  it("returns empty on macOS with unparseable output, and on Windows", () => {
    platform("mac");
    execCommand.mockReturnValue("?");
    expect(m.swap_used()).toBe("");
    platform("windows");
    expect(m.swap_used()).toBe("");
  });
});

const DF_H = [
  "Filesystem      Size  Used Avail Use% Mounted on",
  "/dev/sda1       100G   45G   50G  47% /",
  "tmpfs           1.0G     0  1.0G   0% /dev/shm",
  "/dev/sdb1       500G  390G   80G  78% /mnt/data",
].join("\n");

describe("disk_used", () => {
  it("finds the root filesystem percentage", () => {
    execCommand.mockReturnValue(DF_H);
    expect(m.disk_used(ctx())).toBe("47%");
  });

  it("falls back to a regex when no line ends in ' /' with a % column", () => {
    execCommand.mockReturnValue("Filesystem Use% Mounted\nrootfs 33% /");
    expect(m.disk_used(ctx())).toBe("33%");
  });

  it("returns empty when nothing matches", () => {
    execCommand.mockReturnValue("Filesystem Size\nnone");
    expect(m.disk_used(ctx())).toBe("");
  });

  it("reads the emulated storage line on Android", () => {
    execCommand.mockReturnValue("/dev/fuse 100G 40G 60G 40% /storage/emulated");
    expect(m.disk_used(ctx())).toBe("40%");
    execCommand.mockReturnValue("/storage/emulated only");
    expect(m.disk_used(ctx())).toBe("");
  });

  it("is empty on Windows, and caches the result", () => {
    platform("windows");
    const cache = {};
    expect(m.disk_used(ctx(cache))).toBe("");
    platform("linux");
    execCommand.mockReturnValue(DF_H);
    expect(m.disk_used(ctx(cache))).toBe("");
  });

  it("returns empty when df throws inside the probe", () => {
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(m.disk_used(ctx())).toBe("");
  });
});

const GB = 1024 * 1024;
const dfK = (rows: string[]) =>
  ["Filesystem 1K-blocks Used Available Use% Mounted on", ...rows].join("\n");

describe("disk_size", () => {
  it("reports a single real disk without its mount point", () => {
    execCommand.mockReturnValue(
      dfK([
        `/dev/sda1 ${100 * GB} ${45 * GB} ${50 * GB} 47% /`,
        `tmpfs ${100 * GB} 0 ${100 * GB} 0% /run`,
        `/dev/sda2 ${100 * GB} ${1 * GB} ${99 * GB} 1% /boot`,
        `/dev/small 1000 10 990 1% /small`,
        "short row",
        `/dev/bad abc def 1 1% /bad`,
      ]),
    );
    expect(m.disk_size(ctx())).toBe("45/100GB");
  });

  it("labels each disk by mount point when several are found", () => {
    execCommand.mockReturnValue(
      dfK([
        `/dev/sda1 ${100 * GB} ${45 * GB} ${50 * GB} 47% /`,
        `/dev/sdb1 ${500 * GB} ${390 * GB} ${80 * GB} 78% /mnt/data`,
        `devtmpfs ${50 * GB} 0 ${50 * GB} 0% /dev`,
        `overlay ${50 * GB} 0 ${50 * GB} 0% /var/lib/docker`,
        `proc ${50 * GB} 0 ${50 * GB} 0% /proc`,
        `sysfs ${50 * GB} 0 ${50 * GB} 0% /sys`,
      ]),
    );
    expect(m.disk_size(ctx())).toBe("/(45/100GB) /mnt/data(390/500GB)");
  });

  it("returns empty when no disk qualifies", () => {
    execCommand.mockReturnValue(dfK([`tmpfs ${100 * GB} 0 ${100 * GB} 0% /run`]));
    expect(m.disk_size(ctx())).toBe("");
  });

  it("only counts / and /Volumes/* on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue(
      dfK([
        `/dev/disk3s1 ${500 * GB} ${200 * GB} ${300 * GB} 40% /`,
        `/dev/disk3s5 ${500 * GB} ${200 * GB} ${300 * GB} 40% /System/Volumes/Data`,
        `/dev/disk4s1 ${1000 * GB} ${900 * GB} ${100 * GB} 90% /Volumes/Backup`,
      ]),
    );
    expect(m.disk_size(ctx())).toBe("/(200/500GB) /Volumes/Backup(900/1000GB)");
  });

  it("is empty on Windows and when df throws", () => {
    platform("windows");
    expect(m.disk_size(ctx())).toBe("");
    platform("linux");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(m.disk_size(ctx())).toBe("");
  });

  it("serves the cached value", () => {
    const cache = {};
    execCommand.mockReturnValue(dfK([`/dev/sda1 ${100 * GB} ${45 * GB} 1 47% /`]));
    expect(m.disk_size(ctx(cache))).toBe("45/100GB");
    execCommand.mockReturnValue("");
    expect(m.disk_size(ctx(cache))).toBe("45/100GB");
  });
});

describe("mount_points", () => {
  it("lists non-system mounts with usage on Linux (max 3)", () => {
    execCommand.mockReturnValue(
      [
        "Filesystem Size Used Avail Use% Mounted on",
        "/dev/sda1 100G 45G 50G 47% /",
        "tmpfs 1G 0 1G 0% /dev/shm",
        "/dev/sdb1 500G 390G 80G 78% /mnt/data",
        "/dev/sdc1 500G 100G 80G 20% /home",
        "/dev/sdd1 500G 100G 80G 21% /srv",
        "/dev/sde1 500G 100G 80G 22% /opt",
        "weird 1G",
        "nopercent mount",
        "/dev/x 1G 1G 0 1% /System/Volumes/Data",
      ].join("\n"),
    );
    expect(m.mount_points(ctx())).toBe("/mnt/data(78%) /home(20%) /srv(21%)");
  });

  it("reports only /Volumes mounts on macOS", () => {
    platform("mac");
    execCommand.mockReturnValue(
      [
        "Filesystem Size Used Avail Capacity Mounted on",
        "/dev/disk3s1 500G 200G 300G 40% /",
        "/dev/disk4s1 1T 900G 100G 90% /Volumes/Backup",
        "/dev/disk3s5 500G 200G 300G 40% /System/Volumes/Data",
      ].join("\n"),
    );
    expect(m.mount_points(ctx())).toBe("/Volumes/Backup(90%)");
  });

  it("is empty on Windows and when df throws", () => {
    platform("windows");
    expect(m.mount_points(ctx())).toBe("");
    platform("linux");
    execCommand.mockImplementation(() => {
      throw new Error("x");
    });
    expect(m.mount_points(ctx())).toBe("");
  });

  it("serves the cached value", () => {
    const cache = {};
    execCommand.mockReturnValue(
      "h\n/dev/a 1G 1G 0 5% /mnt/a",
    );
    expect(m.mount_points(ctx(cache))).toBe("/mnt/a(5%)");
    execCommand.mockReturnValue("");
    expect(m.mount_points(ctx(cache))).toBe("/mnt/a(5%)");
  });
});
