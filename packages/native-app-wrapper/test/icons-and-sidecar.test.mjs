import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generatePlaceholderIcons } from "../scripts/generate-placeholder-icons.mjs";
import { buildSidecar, hostTargetTriple } from "../scripts/build-sidecar.mjs";

let root;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "naw-icons-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const hasRustc = (() => {
  try {
    execFileSync("rustc", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("generatePlaceholderIcons", () => {
  const theme = { background: ["#1e293b", "#0b1220"], accent: "#f8fafc" };

  it("draws the full Tauri icon set plus a 1024px master", { timeout: 60_000 }, () => {
    const written = generatePlaceholderIcons(root, theme);
    const icons = path.join(root, "src-tauri", "icons");

    for (const file of [
      "32x32.png", "64x64.png", "128x128.png", "128x128@2x.png", "icon.png",
      "Square30x30Logo.png", "Square310x310Logo.png", "StoreLogo.png",
      "icon.ico", "icon.icns",
    ]) {
      expect(written).toContain(file);
      expect(fs.statSync(path.join(icons, file)).size).toBeGreaterThan(0);
    }
    expect(written).toHaveLength(17);
    expect(fs.existsSync(path.join(root, "assets", "icon-source.png"))).toBe(true);

    const png = fs.readFileSync(path.join(icons, "128x128.png"));
    expect(png.readUInt32BE(16)).toBe(128);
    expect(png.readUInt32BE(20)).toBe(128);

    const ico = fs.readFileSync(path.join(icons, "icon.ico"));
    expect(ico.readUInt16LE(4)).toBe(6);
    const icns = fs.readFileSync(path.join(icons, "icon.icns"));
    expect(icns.toString("ascii", 0, 4)).toBe("icns");
  });

  it("paints a rounded, gradient-filled tile with transparent corners", { timeout: 60_000 }, () => {
    generatePlaceholderIcons(root, theme);
    const png = fs.readFileSync(path.join(root, "src-tauri", "icons", "128x128.png"));
    // Locate IDAT and inflate it.
    let at = 8;
    let idat;
    while (at < png.length) {
      const len = png.readUInt32BE(at);
      if (png.toString("ascii", at + 4, at + 8) === "IDAT") idat = png.subarray(at + 8, at + 8 + len);
      at += 12 + len;
    }
    const raw = zlib.inflateSync(idat);
    const px = (x, y) => [...raw.subarray(y * (128 * 4 + 1) + 1 + x * 4).subarray(0, 4)];
    expect(px(0, 0)[3]).toBe(0); // rounded corner is transparent
    expect(px(64, 4)[3]).toBe(255); // top edge of the tile is opaque
    const top = px(64, 4);
    const bottom = px(64, 123);
    expect(top[0]).toBeGreaterThan(bottom[0]); // background gradient darkens downward
  });
});

describe("buildSidecar", () => {
  const profile = (sidecar) => ({ name: "p", sidecar });

  it("is skipped when the profile has no sidecar", () => {
    expect(buildSidecar(root, profile(null))).toEqual({ skipped: "the profile bundles no sidecar" });
  });

  it("requires a build command", () => {
    expect(() => buildSidecar(root, profile({ name: "x" }))).toThrow('has no "build" command');
  });

  it.skipIf(!hasRustc)("reports the host target triple", () => {
    expect(hostTargetTriple()).toMatch(/^[\w.-]+-[\w.-]+-[\w.-]+/);
  });

  it.skipIf(!hasRustc)("runs the build command with {out} substituted and marks it executable", () => {
    const result = buildSidecar(
      root,
      profile({ name: "tool", build: `node -e "require('fs').writeFileSync(process.argv[1], 'bin')" "{out}"` }),
    );
    expect(result.triple).toBe(hostTargetTriple());
    const out = path.join(root, result.outPath);
    expect(fs.readFileSync(out, "utf8")).toBe("bin");
    expect(result.outPath.startsWith(path.join("src-tauri", "binaries", "tool-"))).toBe(true);
    if (process.platform !== "win32") expect(fs.statSync(out).mode & 0o111).not.toBe(0);
  });

  it.skipIf(!hasRustc)("runs the build in buildCwd", () => {
    fs.mkdirSync(path.join(root, "sub"));
    const result = buildSidecar(
      root,
      profile({
        name: "tool",
        buildCwd: "sub",
        build: `node -e "require('fs').writeFileSync(process.argv[1], process.cwd())" "{out}"`,
      }),
    );
    expect(fs.realpathSync(fs.readFileSync(path.join(root, result.outPath), "utf8"))).toBe(
      fs.realpathSync(path.join(root, "sub")),
    );
  });

  it.skipIf(!hasRustc)("fails when the command fails or forgets to write {out}", () => {
    expect(() => buildSidecar(root, profile({ name: "t", build: "exit 3 # {out}" }))).toThrow(
      "sidecar build command failed with exit code 3",
    );
    expect(() => buildSidecar(root, profile({ name: "t", build: "true # {out}" }))).toThrow(
      "wrote nothing",
    );
  });
});
