import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveTemplateDir } from "../src/resolve-template.mjs";
import { detectRepo } from "../src/git.mjs";

describe("resolveTemplateDir", () => {
  it("finds the monorepo template when nothing is bundled", () => {
    // The published package carries `template/`; a checkout does not, and must
    // still resolve starter-templates/template-git-repo.
    const dir = resolveTemplateDir();
    expect(dir).toMatch(/template-git-repo$|[/\\]template$/);
  });

  it("honors an explicit override", () => {
    const dir = mkdtempSync(join(tmpdir(), "sgr-tpl-"));
    expect(resolveTemplateDir(dir)).toBe(dir);
  });

  it("throws a path-listing error for an override that does not exist", () => {
    expect(() => resolveTemplateDir("/no/such/template")).toThrow(/does not exist/);
  });
});

describe("detectRepo", () => {
  const git = (args, cwd) =>
    execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });

  it("reads owner, repo and branch out of a real checkout", () => {
    const dir = mkdtempSync(join(tmpdir(), "sgr-git-"));
    git(["init", "-q", "-b", "trunk", "."], dir);
    git(["remote", "add", "origin", "git@github.com:acme/widget.git"], dir);
    writeFileSync(join(dir, "f"), "");
    git(["add", "-A"], dir);
    git(["-c", "user.email=a@b", "-c", "user.name=t", "commit", "-qm", "init"], dir);

    // No origin/HEAD in a fresh repo, so it falls back to the current branch —
    // which is the branch the first push will create.
    expect(detectRepo(dir)).toEqual({
      owner: "acme",
      repo: "widget",
      defaultBranch: "trunk",
      isRepo: true,
    });
  });

  it("reports a plain directory as not a repo, without throwing", () => {
    const dir = mkdtempSync(join(tmpdir(), "sgr-nogit-"));
    mkdirSync(join(dir, "sub"));
    const detected = detectRepo(join(dir, "sub"));
    expect(detected.isRepo).toBe(false);
    expect(detected.owner).toBeNull();
    expect(detected.repo).toBeNull();
  });
});
