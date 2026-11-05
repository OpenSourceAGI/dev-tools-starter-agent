#!/usr/bin/env node
// Generates the full platform icon set (Windows .ico, macOS .icns, Linux/
// Android/iOS PNGs at every required size) from the active profile's single
// `iconSource` PNG, using the Tauri CLI's own icon generator so the output
// always matches what the installed @tauri-apps/cli version expects.
//
// This is the "I have real artwork" path. `node bin/cli.js icons` is the other
// one: it draws a neutral placeholder set with no artwork, no dependencies, and
// no Rust toolchain, so a freshly scaffolded copy builds before anyone has a
// logo. Run this once you do.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadProfile, resolveProfileName } from "./profile.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = loadProfile(rootDir, resolveProfileName(rootDir));

if (!profile.iconSource) {
  throw new Error(`profiles/${profile.name}.json has no "iconSource"`);
}

const iconSource = path.resolve(path.dirname(profile.path), profile.iconSource);
if (!existsSync(iconSource)) {
  throw new Error(
    `profiles/${profile.name}.json's iconSource does not exist: ${iconSource}\n` +
      "(run `node bin/cli.js icons` to draw a placeholder set instead)",
  );
}

const outDir = path.join(rootDir, "src-tauri", "icons");
console.log(`[native-app-wrapper] generating icons from ${path.relative(rootDir, iconSource)} -> src-tauri/icons/`);

const result = spawnSync("npx", ["--yes", "@tauri-apps/cli@2", "icon", iconSource, "-o", outDir], {
  cwd: rootDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error(
    "[native-app-wrapper] icon generation failed. Make sure iconSource points at a square PNG " +
      "(1024x1024 recommended) and that the Rust toolchain is installed (the Tauri CLI's icon " +
      "command shells out to it).",
  );
  process.exit(result.status ?? 1);
}

console.log(
  "[native-app-wrapper] icons written. Android/iOS project icons are re-derived from these the " +
    "next time `npm run android:init` / `npm run ios:init` regenerates gen/android or gen/apple.",
);
