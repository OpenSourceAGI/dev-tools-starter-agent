#!/usr/bin/env node
// Compiles the profile's sidecar CLI into src-tauri/binaries/<name>-<target triple>,
// which is where Tauri's `bundle.externalBin` looks for it.
//
// The triple is read from the installed Rust toolchain rather than mapped from
// process.platform: Tauri appends the *Rust* target triple, and getting it from
// the toolchain is the only way the name can't disagree with what the bundler
// then searches for. A mismatch shows up as "binary not found" at bundle time,
// after the whole Rust build has already run.

import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { loadProfile, resolveProfileName } from "./profile.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function hostTargetTriple() {
  const verbose = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
  const match = /^host:\s*(\S+)$/m.exec(verbose);
  if (!match) throw new Error("could not read the host target triple from `rustc -vV`");
  return match[1];
}

export function buildSidecar(rootDir, profile) {
  if (!profile.sidecar) {
    return { skipped: "the profile bundles no sidecar" };
  }
  if (!profile.sidecar.build) {
    throw new Error(
      `profiles/${profile.name}.json's sidecar has no "build" command, so there is nothing to ` +
        "compile. Add one (see docs/LOCAL_APPS.md) or drop the binary into src-tauri/binaries/ yourself.",
    );
  }

  const triple = hostTargetTriple();
  const suffix = triple.includes("windows") ? ".exe" : "";
  const outDir = path.join(rootDir, "src-tauri", "binaries");
  const outPath = path.join(outDir, `${profile.sidecar.name}-${triple}${suffix}`);
  mkdirSync(outDir, { recursive: true });

  // {out} is the only substitution: the build command owns everything else about
  // how the CLI is compiled, so this script never has to know the language or
  // bundler involved.
  const command = profile.sidecar.build.replaceAll("{out}", outPath);
  const cwd = path.resolve(rootDir, profile.sidecar.buildCwd ?? ".");

  console.log(`[native-app-wrapper] building sidecar for ${triple}`);
  console.log(`  ${command}`);
  console.log(`  (in ${cwd})`);

  const result = spawnSync(command, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    throw new Error(`sidecar build command failed with exit code ${result.status}`);
  }
  if (!existsSync(outPath)) {
    throw new Error(
      `sidecar build command succeeded but wrote nothing to ${outPath} — the command must honor {out}`,
    );
  }
  if (!suffix) chmodSync(outPath, 0o755);

  return { outPath: path.relative(rootDir, outPath), triple };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const profile = loadProfile(rootDir, resolveProfileName(rootDir));
  try {
    const result = buildSidecar(rootDir, profile);
    if (result.skipped) {
      console.log(`[native-app-wrapper] nothing to build: ${result.skipped}`);
    } else {
      console.log(`[native-app-wrapper] wrote ${result.outPath}`);
    }
  } catch (error) {
    console.error(`[native-app-wrapper] ${error.message}`);
    process.exit(1);
  }
}
