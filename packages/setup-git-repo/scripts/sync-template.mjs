#!/usr/bin/env node
/**
 * Copy starter-templates/template-git-repo into this package as `template/`,
 * so the published tarball carries it.
 *
 * Runs from `prepack`. The monorepo copy stays the single source of truth; the
 * bundled one is build output and is gitignored.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(packageRoot, "..", "..", "starter-templates", "template-git-repo");
const destination = join(packageRoot, "template");

if (!existsSync(source)) {
  console.error(`sync-template: source not found at ${source}`);
  process.exit(1);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, {
  recursive: true,
  filter: (path) => !/(^|[\\/])(node_modules|\.turbo|dist)([\\/]|$)/.test(path),
});

console.log(`sync-template: copied ${source} -> ${destination}`);
