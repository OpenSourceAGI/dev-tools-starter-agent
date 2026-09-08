#!/usr/bin/env node
// Draws a complete, buildable icon set from the active profile's colors — no
// source artwork, no image library, no network. `tauri build` refuses to bundle
// without every icon in tauri.conf.json's bundle.icon list existing, so a fresh
// copy of this package would otherwise be un-buildable until someone supplies a
// logo. This fills that gap with a neutral mark; swap in real artwork later by
// pointing the profile's `iconSource` at it and running `npm run icons`.
//
// Every size is drawn at its own resolution rather than downscaled from one
// master, so the 16px entries stay legible instead of turning to mush.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  blend,
  coverage,
  encodeIcns,
  encodeIco,
  encodePng,
  hexToRgb,
  roundedRectDistance,
} from "./lib/png.mjs";
import { loadProfile, resolveProfileName } from "./profile.mjs";

/** Windows Store logo assets Tauri's MSIX/AppX metadata expects alongside the core sizes. */
const SQUARE_LOGOS = {
  "Square30x30Logo.png": 30,
  "Square44x44Logo.png": 44,
  "Square71x71Logo.png": 71,
  "Square89x89Logo.png": 89,
  "Square107x107Logo.png": 107,
  "Square142x142Logo.png": 142,
  "Square150x150Logo.png": 150,
  "Square284x284Logo.png": 284,
  "Square310x310Logo.png": 310,
  "StoreLogo.png": 50,
};

const PLAIN_PNGS = {
  "32x32.png": 32,
  "64x64.png": 64,
  "128x128.png": 128,
  "128x128@2x.png": 256,
  "icon.png": 1024,
};

const ICO_SIZES = [16, 32, 48, 64, 128, 256];

// OSType -> pixel size. These are the PNG-bearing ICNS entry types; the legacy
// uncompressed ones aren't needed by any macOS version Tauri supports.
const ICNS_TYPES = [
  ["icp4", 16],
  ["icp5", 32],
  ["icp6", 64],
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
];

/**
 * Renders the mark: a squircle in the profile's gradient with an outlined
 * "app window" on it — generic enough to read as an application icon for
 * anything this wrapper packages, and distinct per profile through its colors.
 */
function render(size, theme) {
  const rgba = Buffer.alloc(size * size * 4);
  const [topColor, bottomColor] = theme.background.map(hexToRgb);
  const accent = hexToRgb(theme.accent);

  const bgRadius = size * 0.2235; // Apple's squircle corner ratio, near enough
  const inset = size * 0.26;
  const windowRadius = Math.max(size * 0.045, 1);
  const stroke = Math.max(size * 0.05, 1);
  const halfStroke = stroke / 2;
  const titleBarY = inset + size * 0.12;
  // Below ~64px the title-bar dots are smaller than a pixel of ink and just
  // muddy the mark, so the small entries drop them.
  const showDots = size >= 64;
  const dotRadius = size * 0.018;
  // Centered in the strip between the window's top edge and the title bar rule.
  const dotCenterY = (inset + titleBarY) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const index = (y * size + x) * 4;

      const bg = coverage(roundedRectDistance(px, py, size / 2, size / 2, size / 2, size / 2, bgRadius));
      if (bg > 0) {
        const t = py / size;
        blend(
          rgba,
          index,
          [0, 1, 2].map((c) => Math.round(topColor[c] + (bottomColor[c] - topColor[c]) * t)),
          bg,
        );
      }

      const windowDistance = roundedRectDistance(
        px,
        py,
        size / 2,
        size / 2,
        size / 2 - inset,
        size / 2 - inset,
        windowRadius,
      );
      // |distance| - halfStroke turns the filled shape's SDF into its outline.
      blend(rgba, index, accent, coverage(Math.abs(windowDistance) - halfStroke));

      const onTitleBar =
        windowDistance < 0 && Math.abs(py - titleBarY) <= halfStroke ? 1 : 0;
      if (onTitleBar) blend(rgba, index, accent, 1);

      if (showDots) {
        for (let i = 0; i < 3; i++) {
          const cx = inset + size * 0.06 + i * size * 0.06;
          const distance = Math.hypot(px - cx, py - dotCenterY) - dotRadius;
          blend(rgba, index, accent, coverage(distance));
        }
      }
    }
  }

  return rgba;
}

/**
 * Draws the icon set into `<rootDir>/src-tauri/icons` and the 1024px master into
 * `<rootDir>/assets/icon-source.png`. The master is what the profile's
 * `iconSource` points at by default, so a copy of this package is
 * self-consistent — `npm run icons` works — before anyone supplies a logo.
 */
export function generatePlaceholderIcons(rootDir, theme) {
  const outDir = path.join(rootDir, "src-tauri", "icons");
  mkdirSync(outDir, { recursive: true });
  const cache = new Map();
  const png = (size) => {
    if (!cache.has(size)) cache.set(size, encodePng(render(size, theme), size));
    return cache.get(size);
  };

  const written = [];
  for (const [file, size] of Object.entries({ ...PLAIN_PNGS, ...SQUARE_LOGOS })) {
    writeFileSync(path.join(outDir, file), png(size));
    written.push(file);
  }

  writeFileSync(
    path.join(outDir, "icon.ico"),
    encodeIco(ICO_SIZES.map((size) => ({ size, png: png(size) }))),
  );
  written.push("icon.ico");

  writeFileSync(
    path.join(outDir, "icon.icns"),
    encodeIcns(ICNS_TYPES.map(([type, size]) => ({ type, png: png(size) }))),
  );
  written.push("icon.icns");

  const assetsDir = path.join(rootDir, "assets");
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(path.join(assetsDir, "icon-source.png"), png(1024));

  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const profile = loadProfile(rootDir, resolveProfileName(rootDir));
  const theme = {
    background: ["#1e293b", "#0b1220"],
    accent: "#f8fafc",
    ...profile.placeholderIcon,
  };

  const written = generatePlaceholderIcons(rootDir, theme);
  console.log(
    `[native-app-wrapper] drew ${written.length} placeholder icons for "${profile.name}" -> src-tauri/icons/`,
  );
  console.log("  wrote assets/icon-source.png (1024x1024 master)");
  console.log("  these are stand-ins — point the profile's iconSource at real artwork and run \"npm run icons\"");
}
