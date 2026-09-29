import { describe, expect, it } from "vitest";
import { formatBench, topPercent } from "./hardware";

describe("topPercent", () => {
  it("rounds up so the fastest entry reads top 1%", () => {
    expect(topPercent(1, 1000)).toBe(1);
    expect(topPercent(68, 1000)).toBe(7);
    expect(topPercent(50, 1000)).toBe(5);
  });

  it("stays within 1..100", () => {
    expect(topPercent(1000, 1000)).toBe(100);
    expect(topPercent(1200, 1000)).toBe(100);
    expect(topPercent(5, 0)).toBe(100);
  });
});

describe("formatBench", () => {
  it("rounds the score to whole thousands and appends the percentile", () => {
    expect(formatBench(37967, 1, 1000)).toBe("38k #1 top 1%");
    expect(formatBench(20512, 68, 1000)).toBe("21k #68 top 7%");
    expect(formatBench(386779, 5, 1026)).toBe("387k #5 top 1%");
  });

  it("never prints a decimal in the score", () => {
    expect(formatBench(19249, 91, 1000)).not.toMatch(/\d\.\d/);
  });
});
