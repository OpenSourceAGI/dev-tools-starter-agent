#!/usr/bin/env node
/**
 * Order the workspace's package directories so every package comes after each
 * sibling it depends on.
 *
 * The publish workflow used to walk `packages/*​/ apps/*​/`, i.e. shell-glob
 * (alphabetical) order, which has nothing to do with the dependency graph. Bun
 * and pnpm link workspace siblings into `node_modules` as symlinks, so a
 * sibling that has not been built yet has no `dist/`, and the `exports` ->
 * `types` entries in its package.json point at files that do not exist. The
 * package that sorts earlier then fails its declaration build with:
 *
 *   Cannot find module '<sibling>' or its corresponding type declarations.
 *
 * Dependency order also means a sibling's `workspace:*` pin is rewritten to the
 * version that sibling just published, rather than the one it had before its
 * own bump.
 *
 *   node .github/scripts/workspace-build-order.mjs [rootDir...]
 *
 * Prints one directory per line with a trailing slash, e.g. `packages/core/`.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

/**
 * Read every `<root>/<dir>/package.json` across the given roots.
 *
 * @param {string[]} roots
 * @returns {{ dir: string, pkg: Record<string, any> }[]}
 */
export function readWorkspacePackages(roots) {
  const packages = [];

  for (const root of roots) {
    if (!existsSync(root)) continue;

    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const manifest = join(root, entry.name, "package.json");
      if (!existsSync(manifest)) continue;

      try {
        const pkg = JSON.parse(readFileSync(manifest, "utf8"));
        if (pkg.name) packages.push({ dir: `${root}/${entry.name}`, pkg });
      } catch (error) {
        console.error(`Skipping ${manifest}: ${error.message}`);
      }
    }
  }

  return packages;
}

/**
 * Map each package directory to the sibling directories it depends on.
 *
 * Edges are keyed by package *name*, not by the version range: a workspace
 * sibling is linked whenever the name matches, so `"core": "^1.2.3"` resolves
 * to the local copy exactly as `"workspace:*"` does and needs building just the
 * same.
 *
 * @param {ReturnType<typeof readWorkspacePackages>} packages
 * @returns {Map<string, Set<string>>}
 */
export function localDependencyGraph(packages) {
  const dirByName = new Map(packages.map(({ dir, pkg }) => [pkg.name, dir]));
  const graph = new Map();

  for (const { dir, pkg } of packages) {
    const local = new Set();

    for (const field of DEPENDENCY_FIELDS) {
      for (const name of Object.keys(pkg[field] ?? {})) {
        const dependency = dirByName.get(name);
        if (dependency && dependency !== dir) local.add(dependency);
      }
    }

    graph.set(dir, local);
  }

  return graph;
}

/**
 * Topologically sort the workspace, alphabetically within each ready set so the
 * order is stable across runs.
 *
 * @param {string[]} [roots]
 * @returns {string[]} directories with a trailing slash
 */
export function workspaceBuildOrder(roots = ["packages", "apps"]) {
  const packages = readWorkspacePackages(roots);
  const dependencies = localDependencyGraph(packages);

  const pending = packages.map(({ dir }) => dir).sort();
  const built = new Set();
  const order = [];

  while (pending.length > 0) {
    const ready = pending.findIndex((dir) => [...dependencies.get(dir)].every((dep) => built.has(dep)));

    // A dependency cycle leaves nothing ready. No order can be right, so take
    // the alphabetically first entry and keep going: everything still gets
    // built and published, and the cycle is reported on stderr where it lands
    // in the job log.
    if (ready === -1) {
      console.error(`Dependency cycle involving ${pending[0]} — falling back to alphabetical order for it`);
    }

    const [dir] = pending.splice(ready === -1 ? 0 : ready, 1);
    built.add(dir);
    order.push(`${dir}/`);
  }

  return order;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const roots = process.argv.slice(2);
  console.log(workspaceBuildOrder(roots.length > 0 ? roots : undefined).join("\n"));
}
