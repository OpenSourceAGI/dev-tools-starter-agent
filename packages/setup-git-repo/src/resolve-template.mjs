import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Find the template directory.
 *
 * Two locations, in order, because the package has to work both ways:
 *
 *   1. `template/` inside the package — what the published tarball ships.
 *      `scripts/sync-template.mjs` copies it in at pack time.
 *   2. `starter-templates/template-git-repo/` up in the monorepo — what a
 *      checkout has, and the single source of truth the copy is made from.
 *
 * Checking the bundled copy first matters: a CLI that only climbs out of its
 * own package works in the repo and breaks the moment it is installed from npm,
 * which is exactly the trap `create-starter-app` fell into.
 */
export function resolveTemplateDir(override = null) {
  if (override) {
    const abs = resolve(override);
    if (!existsSync(abs)) {
      throw new Error(`--template path does not exist: ${abs}`);
    }
    return abs;
  }

  const candidates = [
    join(here, "..", "template"),
    join(here, "..", "..", "..", "starter-templates", "template-git-repo"),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "package.json"))) return resolve(candidate);
  }

  throw new Error(
    "Could not find the template. Looked in:\n" +
      candidates.map((c) => `  ${resolve(c)}`).join("\n") +
      "\nPass --template <path> to point at it explicitly.",
  );
}
