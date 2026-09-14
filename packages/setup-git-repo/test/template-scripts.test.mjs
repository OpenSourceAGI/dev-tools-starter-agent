/**
 * The template's `.github/scripts/*.mjs` run in a *consumer's* CI, with no
 * install step behind them and nobody watching. A bug there surfaces as a
 * failed workflow in someone else's repo, which is why they were pulled out of
 * the inline `node -e` heredocs they used to be and are tested here.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { testPackages, workspaceDirectories, formatOutput } from "../../../starter-templates/template-git-repo/.github/scripts/list-test-packages.mjs";
import { localDependencyGraph, readWorkspacePackages, workspaceBuildOrder } from "../../../starter-templates/template-git-repo/.github/scripts/workspace-build-order.mjs";
import { pinWorkspaceDeps, readSiblings } from "../../../starter-templates/template-git-repo/.github/scripts/pin-workspace-deps.mjs";
import { patchVersion, restore } from "../../../starter-templates/template-git-repo/.github/scripts/restore-pinned-deps.mjs";

const scratchDirectories = [];

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "tgr-scripts-"));
  scratchDirectories.push(dir);
  return dir;
}

/** Write `<root>/<dir>/package.json`. */
function writePackage(root, dir, manifest) {
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, "package.json"), JSON.stringify(manifest, null, 2));
}

afterEach(() => {
  while (scratchDirectories.length > 0) {
    rmSync(scratchDirectories.pop(), { recursive: true, force: true });
  }
});

describe("list-test-packages", () => {
  it("reads the workspaces globs rather than assuming packages/ and apps/", () => {
    // The inline version this replaced hardcoded ["packages", "apps"], so a
    // repo laid out as libs/* got an empty matrix and no error.
    const root = scratch();
    writeFileSync(join(root, "package.json"), JSON.stringify({ workspaces: ["libs/*"] }));
    writePackage(root, "libs/core", { name: "core", scripts: { "test:ci": "vitest run" } });

    expect(testPackages(root)).toEqual([
      { name: "core", dir: "libs/core", flag: "core", script: "test:ci" },
    ]);
  });

  it("accepts the object form of workspaces", () => {
    const root = scratch();
    writeFileSync(join(root, "package.json"), JSON.stringify({ workspaces: { packages: ["mods/*"] } }));
    writePackage(root, "mods/a", { name: "a" });

    expect(workspaceDirectories(root)).toEqual(["mods/a"]);
  });

  it("falls back to packages/ and apps/ when there is no workspaces field", () => {
    const root = scratch();
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "solo" }));
    writePackage(root, "packages/a", { name: "a" });
    writePackage(root, "apps/web", { name: "web" });

    expect(workspaceDirectories(root)).toEqual(["apps/web", "packages/a"]);
  });

  it("prefers test:ci, and still picks up a package that only has test", () => {
    const root = scratch();
    writeFileSync(join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    writePackage(root, "packages/full", { name: "full", scripts: { test: "x", "test:ci": "y" } });
    writePackage(root, "packages/plain", { name: "plain", scripts: { test: "x" } });
    writePackage(root, "packages/none", { name: "none" });

    expect(testPackages(root).map((p) => [p.name, p.script])).toEqual([
      ["full", "test:ci"],
      ["plain", "test"],
    ]);
  });

  it("skips a package whose manifest is unreadable instead of dying", () => {
    const root = scratch();
    writeFileSync(join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    mkdirSync(join(root, "packages", "broken"), { recursive: true });
    writeFileSync(join(root, "packages", "broken", "package.json"), "{ not json");

    expect(testPackages(root)).toEqual([]);
  });

  it("flags an empty matrix, which GitHub would otherwise fail the job over", () => {
    expect(formatOutput([])).toBe("packages=[]\nany=false\n");
    expect(formatOutput([{ name: "a" }])).toContain("any=true");
  });
});

describe("workspace-build-order", () => {
  it("puts a package after every sibling it depends on", () => {
    const root = scratch();
    mkdirSync(join(root, "packages"), { recursive: true });
    writePackage(root, "packages/ui", { name: "ui", dependencies: { core: "workspace:*" } });
    writePackage(root, "packages/core", { name: "core" });

    const order = workspaceBuildOrder([join(root, "packages")]);

    expect(order.findIndex((d) => d.endsWith("core/"))).toBeLessThan(
      order.findIndex((d) => d.endsWith("ui/")),
    );
  });

  it("treats a plain semver range on a sibling as a local edge too", () => {
    // A workspace sibling is linked whenever the *name* matches, so "^1.2.3"
    // resolves to the local copy exactly as "workspace:*" does.
    const root = scratch();
    mkdirSync(join(root, "packages"), { recursive: true });
    writePackage(root, "packages/ui", { name: "ui", dependencies: { core: "^1.2.3" } });
    writePackage(root, "packages/core", { name: "core", version: "1.2.3" });

    const packages = readWorkspacePackages([join(root, "packages")]);
    const graph = localDependencyGraph(packages);

    expect([...graph.get(`${join(root, "packages")}/ui`)]).toContain(`${join(root, "packages")}/core`);
  });

  it("spans several roots", () => {
    const root = scratch();
    writePackage(root, "packages/core", { name: "core" });
    writePackage(root, "apps/web", { name: "web", dependencies: { core: "workspace:*" } });

    const order = workspaceBuildOrder([join(root, "packages"), join(root, "apps")]);

    expect(order).toHaveLength(2);
    expect(order[0]).toContain("core");
  });

  it("still returns every package when there is a cycle", () => {
    const root = scratch();
    mkdirSync(join(root, "packages"), { recursive: true });
    writePackage(root, "packages/a", { name: "a", dependencies: { b: "workspace:*" } });
    writePackage(root, "packages/b", { name: "b", dependencies: { a: "workspace:*" } });

    expect(workspaceBuildOrder([join(root, "packages")])).toHaveLength(2);
  });

  it("ignores a directory with no package.json", () => {
    const root = scratch();
    mkdirSync(join(root, "packages", "not-a-package"), { recursive: true });

    expect(workspaceBuildOrder([join(root, "packages")])).toEqual([]);
  });
});

describe("pin-workspace-deps", () => {
  const siblings = new Map([
    ["core", { version: "1.2.3", private: false }],
    ["internal", { version: "0.0.1", private: true }],
  ]);

  it("replaces workspace:* with a real range and leaves registry deps alone", () => {
    const pkg = { dependencies: { core: "workspace:*", lodash: "^4.0.0" } };

    pinWorkspaceDeps(pkg, siblings);

    expect(pkg.dependencies).toEqual({ core: "^1.2.3", lodash: "^4.0.0" });
  });

  it("drops a dependency on a private sibling, which is never published", () => {
    const pkg = { dependencies: { internal: "workspace:*" } };
    pinWorkspaceDeps(pkg, siblings);
    expect(pkg.dependencies.internal).toBeUndefined();
  });

  it("drops a dependency on a package that is not in the workspace at all", () => {
    const pkg = { dependencies: { ghost: "workspace:*" } };
    pinWorkspaceDeps(pkg, siblings);
    expect(pkg.dependencies.ghost).toBeUndefined();
  });

  it("keeps an explicit range the author wrote", () => {
    // workspace:^1.0.0 means "^1.0.0"; overwriting it with the sibling's
    // current version silently narrows what consumers can install.
    const pkg = { dependencies: { core: "workspace:^1.0.0" }, peerDependencies: { core: "workspace:1.0.0" } };

    pinWorkspaceDeps(pkg, siblings);

    expect(pkg.dependencies.core).toBe("^1.0.0");
    expect(pkg.peerDependencies.core).toBe("1.0.0");
  });

  it("covers optionalDependencies as well", () => {
    const pkg = { optionalDependencies: { core: "workspace:*" } };
    pinWorkspaceDeps(pkg, siblings);
    expect(pkg.optionalDependencies.core).toBe("^1.2.3");
  });

  it("reads sibling versions and privacy off disk, across roots", () => {
    const root = scratch();
    writePackage(root, "packages/core", { name: "core", version: "2.0.0" });
    writePackage(root, "apps/web", { name: "web", version: "1.0.0", private: true });

    const found = readSiblings([join(root, "packages"), join(root, "apps")]);

    expect(found.get("core")).toEqual({ version: "2.0.0", private: false });
    expect(found.get("web")).toEqual({ version: "1.0.0", private: true });
  });
});

describe("restore-pinned-deps", () => {
  it("rewrites the version whatever spacing the manifest uses", () => {
    // The inline version this replaced matched a literal '"version": "x"', so
    // a manifest without the space silently lost its bump.
    expect(patchVersion('{"version":"1.0.0"}', "1.0.0", "1.0.1")).toBe('{"version":"1.0.1"}');
    expect(patchVersion('{\n\t"version" : "1.0.0"\n}', "1.0.0", "1.0.1")).toContain('"1.0.1"');
  });

  it("keeps the file's original formatting", () => {
    const committed = '{\n    "name": "x",\n    "version": "1.0.0"\n}\n';
    expect(patchVersion(committed, "1.0.0", "1.0.1")).toBe('{\n    "name": "x",\n    "version": "1.0.1"\n}\n');
  });

  it("throws rather than silently doing nothing when the field is not found", () => {
    expect(() => patchVersion('{"name":"x"}', "1.0.0", "1.0.1")).toThrow(/could not find/);
  });

  it("restores the pinned deps but keeps the bump", () => {
    const root = scratch();
    const committed = JSON.stringify({ name: "a", version: "1.0.0", dependencies: { core: "workspace:*" } }, null, 2);
    writePackage(root, "pkgs/a", { name: "a", version: "1.0.1", dependencies: { core: "^2.0.0" } });

    const { messages, failures } = restore([join(root, "pkgs")], () => committed);

    const result = JSON.parse(readFileSync(join(root, "pkgs", "a", "package.json"), "utf8"));
    expect(result.version).toBe("1.0.1");
    expect(result.dependencies.core).toBe("workspace:*");
    expect(messages).toEqual(["Keeping version bump for a -> 1.0.1"]);
    expect(failures).toEqual([]);
  });

  it("reports a lost bump instead of aborting the rest of the workspace", () => {
    // Losing the bump silently means the next run republishes the same content
    // forever, so this has to be loud — but one bad file must not leave every
    // later package still carrying its pinned dependencies.
    const root = scratch();
    writePackage(root, "pkgs/broken", { name: "broken", version: "2.0.0" });
    writePackage(root, "pkgs/fine", { name: "fine", version: "1.0.1", dependencies: { core: "^2.0.0" } });

    const { failures } = restore([join(root, "pkgs")], (file) =>
      file.includes("broken")
        ? '{"name":"broken"}'
        : JSON.stringify({ name: "fine", version: "1.0.0", dependencies: { core: "workspace:*" } }, null, 2),
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("Version bump lost");
    // The healthy package was still restored.
    const fine = JSON.parse(readFileSync(join(root, "pkgs", "fine", "package.json"), "utf8"));
    expect(fine.dependencies.core).toBe("workspace:*");
  });

  it("leaves an untracked package alone", () => {
    const root = scratch();
    writePackage(root, "pkgs/new", { name: "new", version: "0.1.0" });

    restore([join(root, "pkgs")], () => {
      throw new Error("fatal: path does not exist in HEAD");
    });

    expect(JSON.parse(readFileSync(join(root, "pkgs", "new", "package.json"), "utf8")).version).toBe("0.1.0");
  });
});
