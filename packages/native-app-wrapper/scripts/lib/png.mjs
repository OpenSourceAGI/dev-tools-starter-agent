// Minimal RGBA PNG / ICO / ICNS writers, plus the tiny bit of rasterization
// the placeholder icon needs. Dependency-free on purpose: generating a
// buildable icon set is a prerequisite for `tauri build`, so it can't be the
// step that makes a fresh clone need npm install, a native image library, or a
// network round trip first.

import zlib from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** Encodes a `size * size * 4` RGBA buffer as an 8-bit RGBA PNG. */
export function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  // 10..12 stay 0: deflate compression, adaptive filtering, no interlace.

  // Filter type 0 ("none") on every scanline — the shapes here are flat enough
  // that deflate handles them fine without per-row prediction.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Packs PNGs into a Windows .ico. Every entry is stored PNG-compressed rather
 * than as a BMP bitmap — supported since Vista, and the only way a 256x256
 * entry stays a reasonable size.
 */
export function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;
  entries.forEach((entry, i) => {
    const at = i * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size; // 0 means 256
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 2] = 0; // palette size (0 = truecolor)
    directory[at + 3] = 0; // reserved
    directory.writeUInt16LE(1, at + 4); // color planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(entry.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((e) => e.png)]);
}

/**
 * Packs PNGs into a macOS .icns. `type` is the four-character OSType that
 * declares the entry's pixel size (icp4 = 16pt, ic07 = 128pt, ...); the
 * PNG-bearing types used here are the ones macOS reads without a legacy
 * uncompressed bitmap fallback.
 */
export function encodeIcns(entries) {
  const blocks = entries.map(({ type, png }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(png.length + 8, 4); // length includes this header
    return Buffer.concat([head, png]);
  });
  const body = Buffer.concat(blocks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

/** Signed distance from `(x, y)` to a rounded rectangle, negative inside. */
export function roundedRectDistance(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

/** Antialiased coverage for a signed distance, in device pixels. */
export function coverage(distance) {
  return Math.min(Math.max(0.5 - distance, 0), 1);
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb color: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Alpha-composites `[r, g, b]` at `alpha` over the pixel at `index`. */
export function blend(rgba, index, [r, g, b], alpha) {
  if (alpha <= 0) return;
  const a = Math.min(alpha, 1);
  const dstA = rgba[index + 3] / 255;
  const outA = a + dstA * (1 - a);
  if (outA <= 0) return;
  for (let c = 0; c < 3; c++) {
    const src = [r, g, b][c];
    rgba[index + c] = Math.round((src * a + rgba[index + c] * dstA * (1 - a)) / outA);
  }
  rgba[index + 3] = Math.round(outA * 255);
}
