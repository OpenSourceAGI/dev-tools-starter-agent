import { execFileSync } from "node:child_process";

/**
 * Parse an `owner/repo` pair out of a git remote URL.
 *
 * Handles the four shapes a remote realistically takes:
 *   https://github.com/owner/repo.git
 *   git@github.com:owner/repo.git
 *   ssh://git@github.com/owner/repo
 *   https://user:token@github.com/owner/repo.git   (credentials in the URL)
 *
 * Returns null rather than throwing, so a repo with an unusual remote falls
 * back to prompting instead of failing the run.
 */
export function parseRemote(url) {
  if (typeof url !== "string" || !url.trim()) return null;

  let rest = url.trim().replace(/\.git$/, "");

  // scp-style: git@host:owner/repo
  const scp = rest.match(/^[^/]+@[^:/]+:(.+)$/);
  if (scp) {
    rest = scp[1];
  } else {
    // Any URL scheme, with or without embedded credentials.
    const withScheme = rest.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]+@)?[^/]+\/(.+)$/i);
    if (withScheme) rest = withScheme[1];
  }

  const parts = rest.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  // Take the last two segments: enterprise hosts prefix paths with more.
  const [owner, repo] = parts.slice(-2);
  if (!owner || !repo) return null;
  return { owner, repo };
}

/** Run a git command, returning trimmed stdout or null if git fails. */
function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Best-effort detection of owner, repo and default branch for a checkout.
 *
 * The default branch is read from origin's HEAD ref, which is only present once
 * something has fetched it. When it is missing, fall back to the current branch
 * — in a fresh `git init` that is the branch the first push will create.
 */
export function detectRepo(cwd = process.cwd()) {
  const remote = git(["remote", "get-url", "origin"], cwd);
  const parsed = parseRemote(remote);

  let defaultBranch = null;
  const originHead = git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], cwd);
  if (originHead) defaultBranch = originHead.replace(/^origin\//, "");
  if (!defaultBranch) defaultBranch = git(["branch", "--show-current"], cwd);

  return {
    owner: parsed?.owner ?? null,
    repo: parsed?.repo ?? null,
    defaultBranch: defaultBranch || null,
    isRepo: git(["rev-parse", "--is-inside-work-tree"], cwd) === "true",
  };
}
