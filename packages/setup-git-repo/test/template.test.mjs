import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPTIONAL_BADGES,
  applyBadges,
  collectFiles,
  configuredBadges,
  destinationFor,
  planFiles,
  render,
  substitute,
} from "../src/template.mjs";

describe("substitute", () => {
  it("replaces known placeholders", () => {
    expect(substitute("https://github.com/{{OWNER}}/{{REPO}}", { OWNER: "acme", REPO: "widget" })).toBe(
      "https://github.com/acme/widget",
    );
  });

  it("leaves a placeholder visible when its value is missing or blank", () => {
    // A visible {{DOI}} is a bug you notice; a silent blank in a URL is one you ship.
    expect(substitute("doi/{{DOI}}", {})).toBe("doi/{{DOI}}");
    expect(substitute("doi/{{DOI}}", { DOI: "   " })).toBe("doi/{{DOI}}");
  });

  it("replaces every occurrence", () => {
    expect(substitute("{{REPO}}-{{REPO}}", { REPO: "x" })).toBe("x-x");
  });
});

describe("configuredBadges", () => {
  it("requires every placeholder a badge needs", () => {
    // Discord needs both the server id and the invite; one alone is not enough.
    expect(configuredBadges({ DISCORD_ID: "123" }).has("discord")).toBe(false);
    expect(configuredBadges({ DISCORD_ID: "123", DISCORD_INVITE: "https://discord.gg/x" }).has("discord")).toBe(true);
  });

  it("treats whitespace as unset", () => {
    expect(configuredBadges({ DOI: "  " }).has("doi")).toBe(false);
  });

  it("covers every optional badge the template declares", () => {
    const all = Object.fromEntries(
      Object.values(OPTIONAL_BADGES).flat().map((key) => [key, "value"]),
    );
    expect(configuredBadges(all).size).toBe(Object.keys(OPTIONAL_BADGES).length);
  });
});

describe("applyBadges", () => {
  const readme = [
    "<p align=\"center\">",
    "<!-- badge:doi --><a href=\"https://doi.org/{{DOI}}\">doi</a>",
    "    <a href=\"stars\">stars</a>",
    "<!-- badge:npm --><a href=\"npm/{{PACKAGE}}\">npm</a>",
    "</p>",
  ].join("\n");

  it("drops the whole line of an unconfigured badge", () => {
    const out = applyBadges(readme, { PACKAGE: "widget" });
    expect(out).not.toContain("doi.org");
    expect(out).toContain("npm/{{PACKAGE}}");
  });

  it("strips the marker from badges it keeps", () => {
    const out = applyBadges(readme, { PACKAGE: "widget", DOI: "10.5281/zenodo.1" });
    expect(out).not.toContain("<!-- badge:");
    expect(out).toContain("doi.org");
  });

  it("indents a kept badge to match its unmarked neighbors", () => {
    const out = applyBadges(readme, { PACKAGE: "widget", DOI: "10.5281/zenodo.1" });
    for (const line of out.split("\n").filter((l) => l.includes("<a "))) {
      expect(line).toMatch(/^ {4}</);
    }
  });

  it("leaves unmarked lines untouched", () => {
    expect(applyBadges(readme, {})).toContain('    <a href="stars">stars</a>');
  });

  it("renders a README with no optional badges configured", () => {
    const out = applyBadges(readme, {});
    expect(out.split("\n")).toEqual(['<p align="center">', '    <a href="stars">stars</a>', "</p>"]);
  });
});

describe("render", () => {
  it("prunes badges before substituting, so a dropped badge never leaks a value", () => {
    const out = render('<!-- badge:doi --><a href="{{DOI}}">d</a>\n<span>{{REPO}}</span>', { REPO: "widget" });
    expect(out).toBe("<span>widget</span>");
  });
});

describe("destinationFor", () => {
  it("restores the dot on gitignore", () => {
    // Stored undotted because npm strips .gitignore from published tarballs.
    expect(destinationFor("gitignore")).toBe(".gitignore");
  });

  it("passes everything else through unchanged", () => {
    expect(destinationFor(".github/workflows/tests.yml")).toBe(".github/workflows/tests.yml");
  });
});

describe("planFiles", () => {
  const files = ["README.md", "turbo.json", ".github/workflows/tests.yml", "docs/BADGES.md"];

  it("writes files that do not exist and skips those that do", () => {
    const plan = planFiles(files, { exists: (f) => f === "README.md" });
    expect(plan.write).toEqual(["turbo.json", ".github/workflows/tests.yml", "docs/BADGES.md"]);
    expect(plan.skip).toEqual(["README.md"]);
    expect(plan.overwrite).toEqual([]);
  });

  it("moves existing files to overwrite under --force", () => {
    const plan = planFiles(files, { exists: () => true, force: true });
    expect(plan.overwrite).toEqual(files);
    expect(plan.skip).toEqual([]);
  });

  it("narrows to a subset by path prefix", () => {
    const plan = planFiles(files, { exists: () => false, only: [".github"] });
    expect(plan.write).toEqual([".github/workflows/tests.yml"]);
  });

  it("matches an exact file as a subset, not just a directory", () => {
    const plan = planFiles(files, { exists: () => false, only: ["README.md"] });
    expect(plan.write).toEqual(["README.md"]);
  });

  it("does not treat a prefix as matching a longer sibling name", () => {
    const plan = planFiles(["docs/BADGES.md", "docs-old/x.md"], { exists: () => false, only: ["docs"] });
    expect(plan.write).toEqual(["docs/BADGES.md"]);
  });
});

describe("collectFiles", () => {
  it("lists files recursively, relative and sorted, skipping build output", () => {
    const dir = mkdtempSync(join(tmpdir(), "sgr-"));
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    mkdirSync(join(dir, "node_modules", "x"), { recursive: true });
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "README.md"), "");
    writeFileSync(join(dir, ".github", "workflows", "tests.yml"), "");
    writeFileSync(join(dir, "node_modules", "x", "index.js"), "");
    writeFileSync(join(dir, "dist", "bundle.js"), "");

    expect(collectFiles(dir)).toEqual([".github/workflows/tests.yml", "README.md"]);
  });
});
