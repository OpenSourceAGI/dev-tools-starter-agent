#!/usr/bin/env node
// native-app-wrapper CLI.
//
//   init <dir> [--profile <name> | --profile-file <path>]
//       Copy this wrapper into <dir> as a self-contained app, configured for
//       one profile. The copy owns its profile from then on — nothing links
//       back here — which is the point: a wrapped app's identity, icons, and
//       build docs live next to the thing being wrapped, not in this package.
//
//   configure [--profile <name>]
//       Regenerate the Tauri config, Rust constants, and remote capability
//       from a profile, in place. Run by the pre* npm scripts.
//
//   icons [--profile <name>]
//       Draw the dependency-free placeholder icon set (see
//       scripts/generate-placeholder-icons.mjs); `npm run icons` instead
//       generates a real set from the profile's iconSource via the Tauri CLI.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { configure } from "../scripts/configure.mjs";
import { generatePlaceholderIcons } from "../scripts/generate-placeholder-icons.mjs";
import { loadProfile, resolveProfileName } from "../scripts/profile.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// What a scaffolded copy is made of. Generated artifacts (tauri.conf.json,
// generated_config.rs, src-tauri/icons/) are deliberately absent: `init`
// regenerates them for the new profile instead of copying this package's, so a
// copy can never inherit another app's identity by accident. Cargo.lock is
// absent for the same reason — it names this package's crate, and a copy that
// inherited it would fail its first build on a package/lock mismatch.
const SCAFFOLD_SOURCES = [
  "bin",
  "scripts",
  "src-tauri/Cargo.toml",
  "src-tauri/build.rs",
  "src-tauri/src/lib.rs",
  "src-tauri/src/main.rs",
  "src-tauri/capabilities/default.json",
  "dist",
  ".gitignore",
];

// Which docs a copy gets depends on what its profile actually does — an
// offline CLI app shipping a guide to browser OAuth handoffs is noise that
// reads as unimplemented functionality.
function docsFor(profile) {
  const docs = ["docs/BUILDING.md", "docs/APP_STORES.md"];
  if (profile.mode === "local") docs.push("docs/LOCAL_APPS.md");
  if (profile.deepLinkScheme) docs.push("docs/OAUTH.md");
  if (profile.android || profile.ios) docs.push("docs/MOBILE.md");
  return docs;
}

// Same idea for the npm scripts: a desktop-only profile's package.json
// shouldn't offer android:build.
function scriptsFor(profile, template) {
  const scripts = { ...template };
  if (!profile.android && !profile.ios) {
    for (const key of Object.keys(scripts)) {
      if (/^(pre)?(android|ios):/.test(key)) delete scripts[key];
    }
  }
  if (profile.sidecar) {
    // The bundler fails outright when no sidecar binary exists for the target
    // triple, so building it is part of running or building the app, not a
    // step to remember.
    scripts["build:sidecar"] = "node scripts/build-sidecar.mjs";
    scripts.predev = "node bin/cli.js configure && node scripts/build-sidecar.mjs";
    scripts["prebuild:desktop"] = "node bin/cli.js configure && node scripts/build-sidecar.mjs";
  } else {
    delete scripts["build:sidecar"];
  }
  delete scripts.init;
  return scripts;
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
  return value;
}

function fail(message) {
  console.error(`[native-app-wrapper] ${message}`);
  process.exit(1);
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Splits argv into positionals and flags, treating `--profile`/`--profile-file` as value flags. */
function positionals(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--profile" || argv[i] === "--profile-file") {
      i++; // skip the flag's value
    } else if (!argv[i].startsWith("--")) {
      out.push(argv[i]);
    }
  }
  return out;
}

function init(argv) {
  const [targetArg] = positionals(argv);
  if (!targetArg) fail("init needs a target directory: init <dir> [--profile-file <path>]");

  const targetDir = path.resolve(process.cwd(), targetArg);
  if (existsSync(targetDir) && readdirSync(targetDir).length > 0 && !argv.includes("--force")) {
    fail(`${targetDir} already exists and is not empty — pass --force to overwrite its wrapper files`);
  }

  const profileFile = flag(argv, "--profile-file");
  const profileName = profileFile
    ? path.basename(profileFile).replace(/\.json$/, "")
    : (flag(argv, "--profile") ?? "example");

  if (!profileFile && !existsSync(path.join(packageRoot, "profiles", `${profileName}.json`))) {
    fail(`no profile named "${profileName}" in ${path.join(packageRoot, "profiles")}`);
  }

  const stagedProfilePath = profileFile
    ? path.resolve(process.cwd(), profileFile)
    : path.join(packageRoot, "profiles", `${profileName}.json`);

  mkdirSync(targetDir, { recursive: true });
  for (const entry of SCAFFOLD_SOURCES) {
    const from = path.join(packageRoot, entry);
    if (!existsSync(from)) continue;
    const to = path.join(targetDir, entry);
    mkdirSync(path.dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
  }

  // The copy gets exactly one profile — its own — so its scripts resolve it
  // with no --profile flag and no ambiguity about which app this tree is.
  mkdirSync(path.join(targetDir, "profiles"), { recursive: true });
  cpSync(stagedProfilePath, path.join(targetDir, "profiles", `${profileName}.json`));
  cpSync(path.join(packageRoot, "profiles", "README.md"), path.join(targetDir, "profiles", "README.md"));

  const profile = loadProfile(targetDir, profileName);

  for (const doc of docsFor(profile)) {
    const to = path.join(targetDir, doc);
    mkdirSync(path.dirname(to), { recursive: true });
    cpSync(path.join(packageRoot, doc), to);
  }

  // package.json is rewritten rather than copied: the copy is a distinct app
  // with its own name and version, and it must not carry this package's.
  const template = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  writeFileSync(
    path.join(targetDir, "package.json"),
    `${JSON.stringify(
      {
        ...template,
        name: `${slug(profile.appName)}-native`,
        version: profile.version,
        description: `${profile.appName} packaged as a native desktop app (scaffolded from native-app-wrapper)`,
        private: true,
        bin: undefined,
        scripts: scriptsFor(profile, template.scripts),
      },
      null,
      2,
    )}\n`,
  );

  const { written } = configure(targetDir, profileName);
  const icons = generatePlaceholderIcons(targetDir, {
    background: ["#1e293b", "#0b1220"],
    accent: "#f8fafc",
    ...profile.placeholderIcon,
  });

  // src-tauri/Cargo.toml's crate name is what `tauri build` names the binary,
  // so it has to follow the copy rather than stay "native-app-wrapper".
  const crateName = `${slug(profile.appName)}-native`;
  const cargoPath = path.join(targetDir, "src-tauri", "Cargo.toml");
  writeFileSync(
    cargoPath,
    readFileSync(cargoPath, "utf8")
      .replace(/^name = "native-app-wrapper"$/m, `name = "${crateName}"`)
      .replace(/^name = "native_app_wrapper_lib"$/m, `name = "${crateName.replace(/-/g, "_")}_lib"`)
      .replace(/^description = ".*"$/m, `description = "${profile.appName} packaged as a native app"`),
    "utf8",
  );
  const mainPath = path.join(targetDir, "src-tauri", "src", "main.rs");
  writeFileSync(
    mainPath,
    readFileSync(mainPath, "utf8").replace("native_app_wrapper_lib::run()", `${crateName.replace(/-/g, "_")}_lib::run()`),
    "utf8",
  );
  const rel = path.relative(process.cwd(), targetDir) || ".";
  console.log(`[native-app-wrapper] scaffolded ${profile.appName} into ${rel}/`);
  for (const entry of written) console.log(`  wrote ${entry}`);
  console.log(`  wrote ${icons.length} placeholder icons into src-tauri/icons/`);
  console.log(`\nNext: cd ${rel} && npm install && npm run dev`);
}

const [command, ...argv] = process.argv.slice(2);

try {
  if (command === "init") {
    init(argv);
  } else if (command === "configure") {
    const rootDir = packageRoot;
    const { profile, written } = configure(rootDir, resolveProfileName(rootDir, argv));
    const target = profile.mode === "remote" ? profile.url : "bundled dist/ frontend";
    console.log(`[native-app-wrapper] configured "${profile.name}" (${profile.appName} -> ${target})`);
    for (const entry of written) console.log(`  wrote ${entry}`);
  } else if (command === "icons") {
    const profile = loadProfile(packageRoot, resolveProfileName(packageRoot, argv));
    const written = generatePlaceholderIcons(packageRoot, {
      background: ["#1e293b", "#0b1220"],
      accent: "#f8fafc",
      ...profile.placeholderIcon,
    });
    console.log(`[native-app-wrapper] drew ${written.length} placeholder icons for "${profile.name}"`);
  } else {
    console.log(
      [
        "native-app-wrapper",
        "",
        "  init <dir> [--profile <name>] [--profile-file <path>] [--force]",
        "      Copy this wrapper into <dir> as a standalone app for one profile.",
        "",
        "  configure [--profile <name>]",
        "      Regenerate tauri.conf.json, the Rust constants, and the remote capability.",
        "",
        "  icons [--profile <name>]",
        "      Draw the placeholder icon set (no dependencies, no artwork needed).",
      ].join("\n"),
    );
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  fail(error.message);
}
