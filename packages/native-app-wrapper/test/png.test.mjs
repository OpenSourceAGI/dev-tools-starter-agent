import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  blend,
  coverage,
  encodeIcns,
  encodeIco,
  encodePng,
  hexToRgb,
  roundedRectDistance,
} from "../scripts/lib/png.mjs";

const solid = (size, [r, g, b, a]) => {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) buf.set([r, g, b, a], i * 4);
  return buf;
};

/** Parse a PNG's chunks, checking each CRC. */
function chunks(png) {
  const out = [];
  let at = 8;
  while (at < png.length) {
    const len = png.readUInt32BE(at);
    const type = png.toString("ascii", at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + len);
    out.push({ type, data });
    at += 12 + len;
  }
  return out;
}

describe("encodePng", () => {
  it("writes a valid PNG that decodes back to the same pixels", () => {
    const rgba = solid(4, [10, 20, 30, 255]);
    rgba.set([255, 0, 0, 128], 0);
    const png = encodePng(rgba, 4);

    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const parts = chunks(png);
    expect(parts.map((c) => c.type)).toEqual(["IHDR", "IDAT", "IEND"]);

    const ihdr = parts[0].data;
    expect(ihdr.readUInt32BE(0)).toBe(4);
    expect(ihdr.readUInt32BE(4)).toBe(4);
    expect(ihdr[8]).toBe(8);
    expect(ihdr[9]).toBe(6);

    const raw = zlib.inflateSync(parts[1].data);
    expect(raw.length).toBe(4 * (4 * 4 + 1));
    // Each scanline starts with filter byte 0, followed by its RGBA pixels.
    expect(raw[0]).toBe(0);
    expect([...raw.subarray(1, 5)]).toEqual([255, 0, 0, 128]);
    expect([...raw.subarray(5, 9)]).toEqual([10, 20, 30, 255]);
    expect(raw[17]).toBe(0);
  });

  it("checksums each chunk with CRC-32", () => {
    const png = encodePng(solid(2, [1, 2, 3, 4]), 2);
    let at = 8;
    while (at < png.length) {
      const len = png.readUInt32BE(at);
      const body = png.subarray(at + 4, at + 8 + len);
      const stored = png.readUInt32BE(at + 8 + len);
      expect(stored).toBe(zlib.crc32(body));
      at += 12 + len;
    }
  });
});

describe("encodeIco", () => {
  it("writes a directory entry per image and stores the PNGs verbatim", () => {
    const small = encodePng(solid(16, [0, 0, 0, 255]), 16);
    const big = encodePng(solid(2, [0, 0, 0, 255]), 2);
    const ico = encodeIco([
      { size: 16, png: small },
      { size: 256, png: big },
    ]);

    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);

    const entry = (i) => 6 + i * 16;
    expect(ico[entry(0)]).toBe(16);
    expect(ico[entry(1)]).toBe(0); // 256 is encoded as 0
    expect(ico[entry(1) + 1]).toBe(0);
    expect(ico.readUInt16LE(entry(0) + 4)).toBe(1);
    expect(ico.readUInt16LE(entry(0) + 6)).toBe(32);
    expect(ico.readUInt32LE(entry(0) + 8)).toBe(small.length);

    const firstOffset = ico.readUInt32LE(entry(0) + 12);
    expect(firstOffset).toBe(6 + 32);
    expect(ico.subarray(firstOffset, firstOffset + small.length).equals(small)).toBe(true);
    const secondOffset = ico.readUInt32LE(entry(1) + 12);
    expect(secondOffset).toBe(firstOffset + small.length);
    expect(ico.subarray(secondOffset).equals(big)).toBe(true);
  });
});

describe("encodeIcns", () => {
  it("wraps each PNG in a typed block under an icns header", () => {
    const a = Buffer.from("AAAA");
    const b = Buffer.from("BBBBBB");
    const icns = encodeIcns([
      { type: "icp4", png: a },
      { type: "ic07", png: b },
    ]);
    expect(icns.toString("ascii", 0, 4)).toBe("icns");
    expect(icns.readUInt32BE(4)).toBe(icns.length);

    expect(icns.toString("ascii", 8, 12)).toBe("icp4");
    expect(icns.readUInt32BE(12)).toBe(a.length + 8);
    expect(icns.subarray(16, 20).equals(a)).toBe(true);
    expect(icns.toString("ascii", 20, 24)).toBe("ic07");
    expect(icns.readUInt32BE(24)).toBe(b.length + 8);
  });
});

describe("rasterization helpers", () => {
  it("roundedRectDistance is negative inside, zero on the edge, positive outside", () => {
    expect(roundedRectDistance(50, 50, 50, 50, 40, 40, 10)).toBeLessThan(0);
    expect(roundedRectDistance(90, 50, 50, 50, 40, 40, 10)).toBeCloseTo(0, 5);
    expect(roundedRectDistance(100, 50, 50, 50, 40, 40, 10)).toBeGreaterThan(0);
  });

  it("rounds the corners: the corner point is farther out than the straight edge", () => {
    const edge = roundedRectDistance(90, 50, 50, 50, 40, 40, 10);
    const corner = roundedRectDistance(90, 90, 50, 50, 40, 40, 10);
    expect(corner).toBeGreaterThan(edge);
  });

  it("coverage maps signed distance to a clamped 0..1 alpha", () => {
    expect(coverage(-5)).toBe(1);
    expect(coverage(-0.5)).toBe(1);
    expect(coverage(0)).toBe(0.5);
    expect(coverage(0.5)).toBe(0);
    expect(coverage(9)).toBe(0);
  });

  it("hexToRgb parses with or without #, any case", () => {
    expect(hexToRgb("#ff8000")).toEqual([255, 128, 0]);
    expect(hexToRgb("0B1220")).toEqual([11, 18, 32]);
  });

  it.each(["#fff", "red", "#12345", "#gggggg", ""])("hexToRgb rejects %j", (bad) => {
    expect(() => hexToRgb(bad)).toThrow(/not a #rrggbb color/);
  });
});

describe("blend", () => {
  it("ignores non-positive alpha", () => {
    const px = Buffer.from([1, 2, 3, 4]);
    blend(px, 0, [255, 255, 255], 0);
    blend(px, 0, [255, 255, 255], -1);
    expect([...px]).toEqual([1, 2, 3, 4]);
  });

  it("writes the source color over a transparent pixel", () => {
    const px = Buffer.alloc(4);
    blend(px, 0, [200, 100, 50], 1);
    expect([...px]).toEqual([200, 100, 50, 255]);
  });

  it("mixes with what is underneath, weighted by alpha", () => {
    const px = Buffer.from([0, 0, 0, 255]);
    blend(px, 0, [200, 100, 50], 0.5);
    expect([...px]).toEqual([100, 50, 25, 255]);
  });

  it("caps alpha at 1 and tracks resulting opacity over a partly transparent pixel", () => {
    const px = Buffer.from([0, 0, 0, 0]);
    blend(px, 0, [255, 0, 0], 5);
    expect(px[3]).toBe(255);
    const half = Buffer.from([0, 0, 0, 0]);
    blend(half, 0, [255, 0, 0], 0.5);
    expect(half[3]).toBe(128);
    expect(half[0]).toBe(255);
  });

  it("respects the pixel index offset", () => {
    const px = Buffer.alloc(8);
    blend(px, 4, [9, 8, 7], 1);
    expect([...px]).toEqual([0, 0, 0, 0, 9, 8, 7, 255]);
  });
});
