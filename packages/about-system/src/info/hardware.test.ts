import { describe, expect, it } from "vitest";
import { formatBench, topPercent } from "./hardware";

/** Builds a table of `count` entries at each score, highest first. */
function table(groups: [score: number, count: number][]): number[] {
  return groups.flatMap(([score, count]) => Array<number>(count).fill(score));
}

describe("topPercent", () => {
  // 1,000 entries: 4 at 100, 18 at 99, 35 at 98, 80 at 97, rest at 50
  const scores = table([[100, 4], [99, 18], [98, 35], [97, 80], [50, 863]]);

  it("grades by how many score strictly higher, so ties share a bucket", () => {
    expect(topPercent(100, scores)).toBe(1);
    expect(topPercent(99, scores)).toBe(1);
    expect(topPercent(98, scores)).toBe(3);
    expect(topPercent(97, scores)).toBe(6);
  });

  it("keeps a large tie together instead of splitting it by rank", () => {
    const tied = table([[100, 50], [90, 950]]);
    expect(topPercent(100, tied)).toBe(1);
    expect(topPercent(90, tied)).toBe(5);
  });

  it("stays within 1..100", () => {
    expect(topPercent(1, table([[10, 999], [1, 1]]))).toBe(100);
    expect(topPercent(5, [])).toBe(100);
  });
});

describe("formatBench", () => {
  const scores = table([[37967, 1], [30000, 66], [20512, 1], [10000, 932]]);

  it("rounds the score to whole thousands and appends the Top percentile", () => {
    expect(formatBench(37967, 1, scores)).toBe("38k #1 Top 1%");
    expect(formatBench(20512, 68, scores)).toBe("21k #68 Top 7%");
  });

  it("never prints a decimal in the score", () => {
    expect(formatBench(19249, 91, scores)).not.toMatch(/\d\.\d/);
  });
});
