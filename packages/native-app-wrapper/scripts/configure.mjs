#!/usr/bin/env node
// Regenerates everything that encodes an app's identity — src-tauri/tauri.conf.json,
// the Rust-side constants it implies, and the remote capability's origin scope —
// from a single JSON profile in profiles/. That indirection is what makes this
// package generic: swap the profile, re-run this script, and the wrapper is a
// different app. Nothing downstream (icons, CI, the OAuth handoff, the sidecar
// bridge) reads the profile directly, so there is exactly one place that
// understands the profile -> Tauri config mapping.

import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadProfile, resolveProfileName } from "./profile.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function configure(rootDir, profileName) {
  const profile = loadProfile(rootDir, profileName);
  const win = profile.window;

  const tauriConf = {
    $schema: "https://schema.tauri.app/config/2",
    productName: profile.productName,
    version: profile.version,
    identifier: profile.identifier,
    build: {
      frontendDist: "../dist",
    },
    app: {
      withGlobalTauri: true,
      windows: [
        {
          label: "main",
          title: win.title,
          // Remote mode points the window straight at the live site; local mode
          // leaves it on the bundled dist/ frontend Tauri serves itself.
          url: profile.mode === "remote" ? profile.url : "index.html",
          width: win.width,
          height: win.height,
          minWidth: win.minWidth,
          minHeight: win.minHeight,
          resizable: win.resizable,
          fullscreen: win.fullscreen,
          center: true,
        },
      ],
      security: {
        // A local-mode app has no remote content to scope, so it doesn't load
        // the remote capability at all (configure removes the file too).
        capabilities: profile.trustedOrigins.length > 0 ? ["default", "remote"] : ["default"],
      },
    },
    bundle: {
      active: true,
      targets: "all",
      publisher: profile.publisher ?? profile.copyright ?? profile.appName,
      copyright: profile.copyright ?? "",
      category: profile.category ?? "Productivity",
      shortDescription: profile.shortDescription ?? "",
      longDescription: profile.longDescription ?? profile.shortDescription ?? "",
      icon: [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico",
      ],
      windows: {
        nsis: {
          installMode: "currentUser",
        },
      },
      macOS: {
        minimumSystemVersion: profile.macos?.minimumSystemVersion ?? "10.15",
      },
      linux: {
        deb: { depends: [] },
      },
    },
    plugins: {},
  };

  // The updater plugin fails *initialization* without a `pubkey` — an
  // `{ "active": false }` block is not an off switch, it's a crash on launch.
  // So a profile that hasn't configured updates gets no updater config and no
  // registered plugin at all (see UPDATER_ENABLED below).
  if (profile.updater) {
    tauriConf.plugins.updater = {
      active: true,
      pubkey: profile.updater.pubkey,
      endpoints: profile.updater.endpoints,
    };
  }

  if (profile.deepLinkScheme) {
    tauriConf.plugins["deep-link"] = {
      desktop: {
        schemes: [profile.deepLinkScheme],
      },
      // Plain custom-scheme deep link (`<scheme>://...`), not a verified
      // Android App Link / iOS Universal Link — the latter needs the site to
      // host .well-known/assetlinks.json + apple-app-site-association, which is
      // unnecessary complexity for a login handoff scheme that's never shown to
      // the user as a clickable web link.
      mobile: [
        {
          scheme: [profile.deepLinkScheme],
          appLink: false,
        },
      ],
    };
  }

  if (profile.sidecar) {
    // Tauri resolves this to binaries/<name>-<target triple> at bundle time, so
    // the build fails loudly if scripts/build-sidecar.mjs hasn't produced one
    // for the platform being built.
    tauriConf.bundle.externalBin = [`binaries/${profile.sidecar.name}`];
  }

  if (profile.android) {
    tauriConf.bundle.android = {
      minSdkVersion: profile.android.minSdkVersion ?? 24,
    };
  }

  if (profile.ios) {
    tauriConf.bundle.iOS = {
      minimumSystemVersion: profile.ios.minimumSystemVersion ?? "14.0",
    };
  }

  const written = [];
  const write = (relPath, contents) => {
    const outPath = path.join(rootDir, relPath);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, contents, "utf8");
    written.push(relPath);
  };

  write("src-tauri/tauri.conf.json", `${JSON.stringify(tauriConf, null, 2)}\n`);

  // The same values the JSON config carries also have to exist on the Rust
  // side: the desktop single-instance argv parser matches on the deep-link
  // scheme, the OAuth handoff rebuilds an absolute callback URL from the app
  // URL, and the sidecar command needs the bundled binary's name. Generating
  // them into one const file is what keeps the two from drifting apart.
  const rustArgs = profile.sidecar
    ? `&[${profile.sidecar.args.map((a) => JSON.stringify(a)).join(", ")}]`
    : "&[]";
  write(
    "src-tauri/src/generated_config.rs",
    [
      `// Generated by scripts/configure.mjs from profiles/${profile.name}.json. Do not edit by hand.`,
      "",
      "/// Custom URL scheme registered with the OS for the OAuth handoff, or \"\"",
      "/// when the profile doesn't use one.",
      `pub const DEEP_LINK_SCHEME: &str = ${JSON.stringify(profile.deepLinkScheme ?? "")};`,
      "",
      "/// Origin the main window loads in remote mode, or \"\" in local mode.",
      `pub const APP_URL: &str = ${JSON.stringify(profile.url ?? "")};`,
      "",
      "/// Name of the bundled CLI exposed through the `sidecar_output` command,",
      "/// or \"\" when the profile bundles none.",
      `pub const SIDECAR_NAME: &str = ${JSON.stringify(profile.sidecar?.name ?? "")};`,
      "",
      "/// The fixed argument list that sidecar is always invoked with. Fixed, and",
      "/// not passed in from the frontend, so the webview can't turn the bundled",
      "/// binary into an arbitrary-argument process spawner.",
      `pub const SIDECAR_ARGS: &[&str] = ${rustArgs};`,
      "",
      "/// Whether the profile configured auto-updates. False means the updater",
      "/// plugin is never registered — registering it without a `pubkey` in",
      "/// tauri.conf.json panics at startup rather than staying inert.",
      `pub const UPDATER_ENABLED: bool = ${profile.updater ? "true" : "false"};`,
      "",
    ].join("\n"),
  );

  // capabilities/remote.json grants the wrapped site itself a narrow slice of
  // IPC. Its scope is the profile's trustedOrigins, so generating the file is
  // the only way that list can't drift from what the profile claims.
  const remoteCapabilityPath = path.join(rootDir, "src-tauri/capabilities/remote.json");
  if (profile.trustedOrigins.length > 0) {
    write(
      "src-tauri/capabilities/remote.json",
      `${JSON.stringify(
        {
          $schema: "../gen/schemas/remote-schema.json",
          identifier: "remote",
          description:
            "Scoped IPC access for the wrapped site itself (the profile's trustedOrigins), so its " +
            "login page can ask the wrapper to open the system browser for OAuth. Nothing else is " +
            "exposed to remote content.",
          windows: ["main"],
          remote: {
            urls: profile.trustedOrigins.map((origin) => `${origin.replace(/\/+$/, "")}/*`),
          },
          permissions: ["opener:allow-open-url"],
        },
        null,
        2,
      )}\n`,
    );
  } else if (existsSync(remoteCapabilityPath)) {
    rmSync(remoteCapabilityPath);
    written.push("src-tauri/capabilities/remote.json (removed — no trustedOrigins)");
  }

  return { profile, written };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = path.resolve(__dirname, "..");
  const profileName = resolveProfileName(rootDir);
  const { profile, written } = configure(rootDir, profileName);

  const target = profile.mode === "remote" ? profile.url : "bundled dist/ frontend";
  console.log(`[native-app-wrapper] configured profile "${profile.name}" (${profile.appName} -> ${target})`);
  for (const relPath of written) console.log(`  wrote ${relPath}`);
  console.log(`  run "npm run icons" if ${profile.name}'s iconSource changed`);
}
