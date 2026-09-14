// Loading + validation for profiles/<name>.json, shared by every script that
// needs one (configure, icon generation, the scaffolding CLI). Kept separate so
// there is exactly one definition of what a profile means and what a missing or
// contradictory field does — the scripts downstream can then assume a profile
// they were handed is already coherent.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** Profile fields every mode needs, whatever else the profile turns on. */
const ALWAYS_REQUIRED = ["appName", "identifier", "version"];

/**
 * Resolves which profile to use: an explicit `--profile <name>`, else
 * $WRAPPER_PROFILE, else the single profile in profiles/ if there is exactly
 * one, else an error naming the candidates. The "exactly one" case is what lets
 * a scaffolded copy (which has one profile, its own) skip the flag entirely.
 */
export function resolveProfileName(rootDir, argv = process.argv.slice(2)) {
  const flagIndex = argv.indexOf("--profile");
  if (flagIndex !== -1) {
    const name = argv[flagIndex + 1];
    if (!name || name.startsWith("--")) {
      throw new Error("--profile needs a profile name, e.g. --profile about-system");
    }
    return name;
  }
  if (process.env.WRAPPER_PROFILE) return process.env.WRAPPER_PROFILE;

  const profilesDir = path.join(rootDir, "profiles");
  const names = existsSync(profilesDir)
    ? readdirSync(profilesDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""))
        .filter((n) => n !== "example")
    : [];
  if (names.length === 1) return names[0];
  // A copy of this package that hasn't been given an identity yet still needs
  // to configure and build, so the untouched template is the last fallback.
  if (names.length === 0) {
    if (existsSync(path.join(profilesDir, "example.json"))) return "example";
    throw new Error(
      "no profile to use: profiles/ is empty. Copy example.json to " +
        "profiles/<your-app>.json and fill it in (see profiles/README.md).",
    );
  }
  throw new Error(
    `profiles/ has ${names.length} profiles (${names.join(", ")}) — pick one with ` +
      "--profile <name> or WRAPPER_PROFILE=<name>.",
  );
}

/** Reads and validates profiles/<name>.json, filling in every default. */
export function loadProfile(rootDir, profileName) {
  const profilePath = path.join(rootDir, "profiles", `${profileName}.json`);
  if (!existsSync(profilePath)) {
    throw new Error(`no such profile: ${path.relative(rootDir, profilePath)}`);
  }

  let profile;
  try {
    profile = JSON.parse(readFileSync(profilePath, "utf8"));
  } catch (cause) {
    throw new Error(`profiles/${profileName}.json is not valid JSON: ${cause.message}`);
  }

  for (const field of ALWAYS_REQUIRED) {
    if (!profile[field]) {
      throw new Error(`profiles/${profileName}.json is missing required field "${field}"`);
    }
  }

  const mode = profile.mode ?? "remote";
  if (mode !== "remote" && mode !== "local") {
    throw new Error(`profiles/${profileName}.json has unknown mode "${mode}" (expected "remote" or "local")`);
  }

  if (mode === "remote") {
    if (!profile.url) {
      throw new Error(`profiles/${profileName}.json is mode "remote" and needs a "url"`);
    }
    if (!/^https:\/\//.test(profile.url) && !/^http:\/\/localhost[:/]/.test(profile.url)) {
      throw new Error(
        `profiles/${profileName}.json's url must be https:// (http://localhost is allowed for local dev), got "${profile.url}"`,
      );
    }
  } else if (profile.url) {
    // A local-mode profile that also carries a url would silently ignore it,
    // which reads as "the app loads that site" to anyone skimming the profile.
    throw new Error(
      `profiles/${profileName}.json is mode "local" but also sets "url" — local mode loads ` +
        "the bundled frontend in dist/, so remove the url or switch the mode to \"remote\".",
    );
  }

  if (profile.sidecar && !profile.sidecar.name) {
    throw new Error(`profiles/${profileName}.json has a "sidecar" block with no "name"`);
  }
  if (profile.sidecar?.build && !profile.sidecar.build.includes("{out}")) {
    // Without the placeholder the command would write wherever it likes and the
    // bundler would then fail to find a binary under the name it expects.
    throw new Error(
      `profiles/${profileName}.json's sidecar.build must contain "{out}" — that's where ` +
        "scripts/build-sidecar.mjs substitutes the path Tauri looks for the binary at.",
    );
  }
  if (profile.updater && !(profile.updater.pubkey && profile.updater.endpoints?.length)) {
    // Half-configured updates are the failure mode worth catching early: the
    // plugin panics at startup without a pubkey, and polls nothing without an
    // endpoint.
    throw new Error(
      `profiles/${profileName}.json's "updater" needs both a "pubkey" (from ` +
        '`npx @tauri-apps/cli@2 signer generate`) and a non-empty "endpoints" list.',
    );
  }
  if (profile.sidecar && mode !== "local") {
    // The sidecar command is only reachable from locally bundled content (see
    // src-tauri/src/lib.rs's origin guard), so a remote-mode profile asking for
    // one has configured something it can never call.
    throw new Error(
      `profiles/${profileName}.json pairs a "sidecar" with mode "remote" — the sidecar is only ` +
        "callable from the bundled frontend, so it needs mode \"local\".",
    );
  }

  return {
    ...profile,
    name: profileName,
    path: profilePath,
    mode,
    productName: profile.productName ?? profile.appName,
    window: {
      width: 1280,
      height: 800,
      minWidth: 480,
      minHeight: 480,
      fullscreen: false,
      resizable: true,
      title: profile.appName,
      ...profile.window,
    },
    // No default args: what a CLI needs to be asked for is the app author's
    // call, and a guessed flag would be a runtime failure, not a config error.
    sidecar: profile.sidecar ? { args: [], ...profile.sidecar } : null,
    trustedOrigins: profile.trustedOrigins ?? [],
  };
}
