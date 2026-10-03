/**
 * @fileoverview The four Geekbench lookups share a table format
 * (`[name, score, rank][]`) and a fuzzy matcher, so they're driven here with a
 * small fixture rather than the multi-megabyte real tables.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/platform", () => ({ IS_LINUX: true, IS_MAC: false, IS_WINDOWS: false }));

const execCommand = vi.hoisted(() => vi.fn());
vi.mock("../utils/command", () => ({ execCommand, commandExists: vi.fn() }));

const files = vi.hoisted(() => ({
  existing: new Set<string>(),
  data: {} as Record<string, string>,
}));
const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn((p: string) => files.existing.has(p)),
  readFileSync: vi.fn((p: string) => {
    if (!(p in files.data)) throw new Error("ENOENT");
    return files.data[p];
  }),
  writeFileSync: vi.fn(),
}));
vi.mock("fs", () => ({ ...fsMock, default: fsMock }));

vi.mock("os", () => {
  const api = { tmpdir: () => "/tmp", cpus: () => [], platform: () => "linux" };
  return { ...api, default: api };
});

const h = await import("./hardware");
import type { InfoContext } from "../types/internal-types";

const CPU_TABLE = {
  scores: [
    ["AMD Ryzen 9 7950X", 3000, 1],
    ["Intel Core i9-13900K", 2900, 2],
    ["Apple M2 Pro", 2700, 3],
    ["Qualcomm Snapdragon X Elite", 2500, 4],
    ["AMD EPYC 7763", 2400, 5],
    ["Mystery Chip 9000", 1000, 6],
  ],
};
const GPU_TABLE = {
  scores: [
    ["NVIDIA GeForce RTX 4090", 300000, 1],
    ["AMD Radeon RX 7900 XTX", 200000, 2],
    ["Intel Arc A770", 100000, 3],
    ["Obscure Accelerator", 50000, 4],
  ],
};

const ctx = (cache: InfoContext["cache"] = {}): InfoContext => ({ cache });

/** Make `cpu()`/`gpu()` resolve to a name via the (mocked) shell tools. */
const resolveCpu = (name: string) =>
  execCommand.mockImplementation((c: string) => (c === "lscpu" ? `Model name: ${name}` : ""));
const resolveGpu = (name: string) =>
  execCommand.mockImplementation((c: string) =>
    c === "lspci" ? `01:00.0 VGA compatible controller: NVIDIA [${name}]` : "",
  );

beforeEach(() => {
  files.existing = new Set(["cpu-geekbench.json", "gpu-geekbench.json"]);
  files.data = {
    "cpu-geekbench.json": JSON.stringify(CPU_TABLE),
    "gpu-geekbench.json": JSON.stringify(GPU_TABLE),
  };
  execCommand.mockReset().mockReturnValue("");
});

describe("bench (CPU)", () => {
  it("formats score, rank and percentile for the fuzzy-matched CPU", () => {
    resolveCpu("AMD Ryzen 9 7950X");
    expect(h.bench(ctx())).toBe("3k #1 Top 1%");
  });

  it("is empty with no CPU name or no fuzzy match", () => {
    expect(h.bench(ctx())).toBe("");
    resolveCpu("zzzzzzzzzzzz qqqqqqqq");
    expect(h.bench(ctx())).toBe("");
  });

  it("is empty when the benchmark file is unreadable or malformed", () => {
    resolveCpu("AMD Ryzen 9 7950X");
    files.data["cpu-geekbench.json"] = "{not json";
    expect(h.bench(ctx())).toBe("");
  });

  it("finds the table under src/bench or ./bench when not in the cwd", () => {
    resolveCpu("AMD Ryzen 9 7950X");
    files.existing = new Set(["src/bench/cpu-geekbench.json"]);
    files.data = { "src/bench/cpu-geekbench.json": JSON.stringify(CPU_TABLE) };
    expect(h.bench(ctx())).toBe("3k #1 Top 1%");

    files.existing = new Set(["./bench/cpu-geekbench.json"]);
    files.data = { "./bench/cpu-geekbench.json": JSON.stringify(CPU_TABLE) };
    expect(h.bench(ctx())).toBe("3k #1 Top 1%");
  });

  it("falls back to the module-relative path when no known location exists", () => {
    resolveCpu("AMD Ryzen 9 7950X");
    files.existing = new Set();
    files.data = {};
    // Nothing readable anywhere → swallowed, cached as empty.
    expect(h.bench(ctx())).toBe("");
  });

  it("serves from the cache", () => {
    const c = ctx({ bench: { value: "cached", timestamp: Date.now() } });
    expect(h.bench(c)).toBe("cached");
  });
});

describe("cpu_bench_info", () => {
  it.each([
    ["AMD Ryzen 9 7950X", "Geekbench 6: 3k (Rank #1, Top 1%) - AMD"],
    ["Intel Core i9-13900K", "Geekbench 6: 3k (Rank #2, Top 17%) - Intel"],
    ["Apple M2 Pro", "Geekbench 6: 3k (Rank #3, Top 34%) - ARM"],
    ["Qualcomm Snapdragon X Elite", "Geekbench 6: 3k (Rank #4, Top 50%) - ARM"],
    ["AMD EPYC 7763", "Geekbench 6: 2k (Rank #5, Top 67%) - AMD"],
    ["Mystery Chip 9000", "Geekbench 6: 1k (Rank #6, Top 84%) - Unknown"],
  ])("labels %s with its architecture", (name, expected) => {
    resolveCpu(name);
    expect(h.cpu_bench_info(ctx())).toBe(expected);
  });

  it("is empty with no CPU, no match, or a bad table; and serves cache", () => {
    expect(h.cpu_bench_info(ctx())).toBe("");
    resolveCpu("zzzzzzzzzzzz qqqqqqqq");
    expect(h.cpu_bench_info(ctx())).toBe("");
    resolveCpu("AMD Ryzen 9 7950X");
    files.data["cpu-geekbench.json"] = "oops";
    expect(h.cpu_bench_info(ctx())).toBe("");
    expect(
      h.cpu_bench_info(ctx({ cpu_bench_info: { value: "cached", timestamp: Date.now() } })),
    ).toBe("cached");
  });

  it("locates the table at the alternate paths", () => {
    resolveCpu("AMD Ryzen 9 7950X");
    files.existing = new Set(["src/bench/cpu-geekbench.json"]);
    files.data = { "src/bench/cpu-geekbench.json": JSON.stringify(CPU_TABLE) };
    expect(h.cpu_bench_info(ctx())).toContain("AMD");
    files.existing = new Set(["./bench/cpu-geekbench.json"]);
    files.data = { "./bench/cpu-geekbench.json": JSON.stringify(CPU_TABLE) };
    expect(h.cpu_bench_info(ctx())).toContain("AMD");
    files.existing = new Set();
    files.data = {};
    expect(h.cpu_bench_info(ctx())).toBe("");
  });
});

describe("gpu_bench", () => {
  it("formats the fuzzy-matched GPU", () => {
    resolveGpu("GeForce RTX 4090");
    expect(h.gpu_bench(ctx())).toBe("300k #1 Top 1%");
  });

  it("is empty with no GPU, no match, or a bad table; serves cache", () => {
    expect(h.gpu_bench(ctx())).toBe("");
    resolveGpu("zzzzzzzzzzzz qqqqqqqq");
    expect(h.gpu_bench(ctx())).toBe("");
    resolveGpu("GeForce RTX 4090");
    files.data["gpu-geekbench.json"] = "oops";
    expect(h.gpu_bench(ctx())).toBe("");
    expect(h.gpu_bench(ctx({ gpu_bench: { value: "c", timestamp: Date.now() } }))).toBe("c");
  });

  it("locates the table at the alternate paths", () => {
    resolveGpu("GeForce RTX 4090");
    files.existing = new Set(["src/bench/gpu-geekbench.json"]);
    files.data = { "src/bench/gpu-geekbench.json": JSON.stringify(GPU_TABLE) };
    expect(h.gpu_bench(ctx())).toBe("300k #1 Top 1%");
    files.existing = new Set(["./bench/gpu-geekbench.json"]);
    files.data = { "./bench/gpu-geekbench.json": JSON.stringify(GPU_TABLE) };
    expect(h.gpu_bench(ctx())).toBe("300k #1 Top 1%");
    files.existing = new Set();
    files.data = {};
    expect(h.gpu_bench(ctx())).toBe("");
  });
});

describe("gpu_bench_info", () => {
  it.each([
    ["GeForce RTX 4090", "Geekbench 6: 300k (Rank #1, Top 1%) - NVIDIA"],
    ["Radeon RX 7900 XTX", "Geekbench 6: 200k (Rank #2, Top 25%) - AMD"],
    ["Intel Arc A770", "Geekbench 6: 100k (Rank #3, Top 50%) - Intel"],
    ["Obscure Accelerator", "Geekbench 6: 50k (Rank #4, Top 75%) - Unknown"],
  ])("labels %s with its vendor", (name, expected) => {
    resolveGpu(name);
    expect(h.gpu_bench_info(ctx())).toBe(expected);
  });

  it("is empty with no GPU, no match, or a bad table; serves cache", () => {
    expect(h.gpu_bench_info(ctx())).toBe("");
    resolveGpu("zzzzzzzzzzzz qqqqqqqq");
    expect(h.gpu_bench_info(ctx())).toBe("");
    resolveGpu("GeForce RTX 4090");
    files.data["gpu-geekbench.json"] = "oops";
    expect(h.gpu_bench_info(ctx())).toBe("");
    expect(
      h.gpu_bench_info(ctx({ gpu_bench_info: { value: "c", timestamp: Date.now() } })),
    ).toBe("c");
  });

  it("locates the table at the alternate paths", () => {
    resolveGpu("GeForce RTX 4090");
    files.existing = new Set(["src/bench/gpu-geekbench.json"]);
    files.data = { "src/bench/gpu-geekbench.json": JSON.stringify(GPU_TABLE) };
    expect(h.gpu_bench_info(ctx())).toContain("NVIDIA");
    files.existing = new Set(["./bench/gpu-geekbench.json"]);
    files.data = { "./bench/gpu-geekbench.json": JSON.stringify(GPU_TABLE) };
    expect(h.gpu_bench_info(ctx())).toContain("NVIDIA");
    files.existing = new Set();
    files.data = {};
    expect(h.gpu_bench_info(ctx())).toBe("");
  });
});
