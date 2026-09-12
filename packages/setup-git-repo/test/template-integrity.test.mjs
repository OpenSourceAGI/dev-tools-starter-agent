/**
 * The template and the CLI that applies it are coupled in ways nothing else
 * checks: the CLI drops a badge line by matching a marker name against
 * OPTIONAL_BADGES, and substitutes `{{PLACEHOLDER}}` tokens it knows by name.
 * A badge added to the template README with a marker the CLI does not know
 * ships to a user's repo as a broken image pointing at a literal `{{DOI}}` —
 * and nothing fails until someone looks at the rendered README.
 *
 * These are the invariants that keep the two halves honest.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { OPTIONAL_BADGES } from "../src/template.mjs";

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "starter-templates", "template-git-repo");

const readmeText = readFileSync(join(TEMPLATE, "README.md"), "utf8");
const badgeDocs = readFileSync(join(TEMPLATE, "docs", "BADGES.md"), "utf8");

/** Badge marker names actually present in the template README. */
const markers = [...readmeText.matchAll(/<!--\s*badge:([a-z0-9-]+)\s*-->/gi)].map((m) => m[1].toLowerCase());

/** Placeholders the CLI knows how to fill, from its flag table. */
const KNOWN_PLACEHOLDERS = new Set([
  "OWNER",
  "REPO",
  "DEFAULT_BRANCH",
  "DESCRIPTION",
  "PACKAGE",
  "DOI",
  "WEBSITE_URL",
  "DOCS_URL",
  "API_URL",
  "YOUTUBE_URL",
  "UPTIME_ID",
  "DISCORD_ID",
  "DISCORD_INVITE",
  "PACKAGE_MANAGER",
]);

describe("badge markers", () => {
  it("every marker in the README is one the CLI knows how to drop", () => {
    for (const name of markers) {
      expect(OPTIONAL_BADGES, `<!-- badge:${name} --> has no OPTIONAL_BADGES entry`).toHaveProperty(name);
    }
  });

  it("every OPTIONAL_BADGES entry has a marker to act on", () => {
    for (const name of Object.keys(OPTIONAL_BADGES)) {
      expect(markers, `OPTIONAL_BADGES.${name} matches no marker in the README`).toContain(name);
    }
  });

  it("every badge is documented in BADGES.md", () => {
    for (const name of markers) {
      expect(badgeDocs.toLowerCase(), `badge "${name}" is not mentioned in docs/BADGES.md`).toContain(name);
    }
  });

  it("each optional badge's line carries the placeholders that badge needs", () => {
    // Otherwise the badge survives the drop and renders a literal {{DOI}}.
    for (const [name, placeholders] of Object.entries(OPTIONAL_BADGES)) {
      const line = readmeText.split("\n").find((l) => new RegExp(`<!--\\s*badge:${name}\\s*-->`, "i").test(l));
      expect(line, `no README line for badge ${name}`).toBeTruthy();

      for (const placeholder of placeholders) {
        expect(line, `badge ${name} does not use {{${placeholder}}}`).toContain(`{{${placeholder}}}`);
      }
    }
  });
});

describe("placeholders", () => {
  /** Every `{{TOKEN}}` used anywhere in the template tree. */
  function templateFiles(dir) {
    const files = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...templateFiles(full));
      else files.push(full);
    }
    return files;
  }

  it("the template only uses placeholders the CLI can fill", () => {
    for (const file of templateFiles(TEMPLATE)) {
      const text = readFileSync(file, "utf8");
      for (const [, token] of text.matchAll(/\{\{([A-Z_]+)\}\}/g)) {
        expect(KNOWN_PLACEHOLDERS, `${file} uses {{${token}}}, which the CLI never fills`).toContain(token);
      }
    }
  });
});

describe("workflows", () => {
  const workflowsDir = join(TEMPLATE, ".github", "workflows");
  const workflows = readdirSync(workflowsDir).filter((f) => f.endsWith(".yml"));

  /** Substituted the way the CLI would, so `branches: [{{...}}]` parses. */
  function load(file) {
    let text = readFileSync(join(workflowsDir, file), "utf8");
    for (const token of KNOWN_PLACEHOLDERS) text = text.replaceAll(`{{${token}}}`, "main");
    return parse(text);
  }

  it("there is at least one workflow to check", () => {
    expect(workflows.length).toBeGreaterThan(0);
  });

  it.each(workflows)("%s is valid YAML once substituted", (file) => {
    // Shipping a workflow GitHub cannot parse is the failure this package must
    // never have: it lands in someone's repo and fails there.
    expect(() => load(file)).not.toThrow();
  });

  it.each(workflows)("%s has a name, a trigger and at least one job", (file) => {
    const workflow = load(file);

    expect(workflow.name).toBeTruthy();
    // `on:` is YAML 1.1's boolean true, which is why this reads oddly.
    expect(workflow.on ?? workflow[true]).toBeTruthy();
    expect(Object.keys(workflow.jobs ?? {}).length).toBeGreaterThan(0);
  });

  it.each(workflows)("%s pins every action to a version", (file) => {
    for (const [job, definition] of Object.entries(load(file).jobs)) {
      expect(definition["runs-on"], `${file}:${job}`).toBeTruthy();

      for (const step of definition.steps ?? []) {
        // A floating `uses: actions/checkout` follows the default branch of
        // someone else's repository into your CI.
        if (step.uses) expect(step.uses, `${file}:${job}`).toMatch(/@v?\d/);
      }
    }
  });

  it("every .github/scripts file a workflow calls exists", () => {
    const shipped = new Set(readdirSync(join(TEMPLATE, ".github", "scripts")));
    const referenced = new Set();

    for (const file of workflows) {
      const text = readFileSync(join(workflowsDir, file), "utf8");
      for (const [, script] of text.matchAll(/\.github\/scripts\/([\w-]+\.mjs)/g)) referenced.add(script);
    }

    expect(referenced.size).toBeGreaterThan(0);
    for (const script of referenced) {
      expect(shipped, `a workflow calls ${script}, which is not shipped`).toContain(script);
    }
  });

  it("guards the workflows that push or deploy with a concurrency group", () => {
    // Two publish runs racing is how a half-staged version gets reserved.
    for (const file of ["npm-publish.yml", "deploy-test-reports.yml"]) {
      expect(load(file).concurrency?.group, file).toBeTruthy();
    }
  });

  it("never lets one matrix entry cancel the others", () => {
    expect(load("tests.yml").jobs.test.strategy["fail-fast"]).toBe(false);
  });
});
