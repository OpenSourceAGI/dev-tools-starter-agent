#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { detectRepo } from "../src/git.mjs";
import { resolveTemplateDir } from "../src/resolve-template.mjs";
import {
  OPTIONAL_BADGES,
  SUBSETS,
  collectFiles,
  configuredBadges,
  destinationFor,
  planFiles,
  render,
} from "../src/template.mjs";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};
const bold = (s) => `${c.bold}${s}${c.reset}`;
const dim = (s) => `${c.dim}${s}${c.reset}`;
const green = (s) => `${c.green}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const cyan = (s) => `${c.cyan}${s}${c.reset}`;
const red = (s) => `${c.red}${s}${c.reset}`;

// ─── Flags ───────────────────────────────────────────────────────────────────
// Each flag maps to a placeholder in the template, except the behavioral ones.
const FLAGS = {
  owner: "OWNER",
  repo: "REPO",
  branch: "DEFAULT_BRANCH",
  description: "DESCRIPTION",
  package: "PACKAGE",
  doi: "DOI",
  docs: "DOCS_URL",
  api: "API_URL",
  youtube: "YOUTUBE_URL",
  uptime: "UPTIME_ID",
  "discord-id": "DISCORD_ID",
  "discord-invite": "DISCORD_INVITE",
};

function parseArgs(argv) {
  const opts = { values: {}, dir: ".", force: false, dryRun: false, yes: false, only: null, template: null };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const take = () => {
      const next = argv[++i];
      if (next === undefined) {
        console.error(red(`Missing value for ${arg}`));
        process.exit(2);
      }
      return next;
    };

    if (arg === "--help" || arg === "-h") return { help: true };
    else if (arg === "--version" || arg === "-v") return { version: true };
    else if (arg === "--force" || arg === "-f") opts.force = true;
    else if (arg === "--dry-run" || arg === "-n") opts.dryRun = true;
    else if (arg === "--yes" || arg === "-y") opts.yes = true;
    else if (arg === "--dir") opts.dir = take();
    else if (arg === "--template") opts.template = take();
    else if (arg.endsWith("-only") && arg.startsWith("--")) {
      const name = arg.slice(2, -5);
      if (!SUBSETS[name]) {
        console.error(red(`Unknown subset ${arg}. Try: ${Object.keys(SUBSETS).map((s) => `--${s}-only`).join(", ")}`));
        process.exit(2);
      }
      opts.only = [...(opts.only ?? []), ...SUBSETS[name]];
    } else if (arg.startsWith("--")) {
      const [flag, inline] = arg.slice(2).split(/=(.*)/s);
      const key = FLAGS[flag];
      if (!key) {
        console.error(red(`Unknown flag --${flag}. Run with --help.`));
        process.exit(2);
      }
      opts.values[key] = inline ?? take();
    } else {
      // A bare argument is the target directory: `setup-git-repo ./my-repo`.
      opts.dir = arg;
    }
  }

  return opts;
}

function help() {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  console.log(`
${bold("setup-git-repo")} ${dim(`v${pkg.version}`)}

  One command to give a repo the whole GitHub setup: Turborepo, the CI
  workflows, the README badge block, and the docs explaining each of them.

${bold("Usage")}

  ${cyan("bunx setup-git-repo")}                 ${dim("# set up the repo you are standing in")}
  ${cyan("bunx setup-git-repo ./my-repo")}       ${dim("# or one somewhere else")}
  ${cyan("bunx setup-git-repo --dry-run")}       ${dim("# show what would be written")}

${bold("Identity")} ${dim("(detected from git remote when omitted)")}

  --owner <name>            GitHub owner
  --repo <name>             Repository name
  --branch <name>           Default branch, used in workflow filters
  --description <text>      One-line description for the README

${bold("Optional badges")} ${dim("(a badge whose value is omitted is left out of the README)")}

  --package <name>          npm package, for the version + downloads badges
  --doi <10.5281/zenodo.N>  Zenodo DOI
  --docs <url>              Documentation link
  --api <url>               API reference link
  --youtube <url>           Demo video link
  --uptime <page-id>        UptimeRobot status page id
  --discord-id <id>         Discord server id ${dim("(both are needed for")}
  --discord-invite <url>    Discord invite link   ${dim("the Discord badge)")}

${bold("Behavior")}

  --dir <path>              Target directory (default: the current one)
  -f, --force               Overwrite files that already exist
  -n, --dry-run             Print the plan, write nothing
  -y, --yes                 Never prompt; use flags and git detection only
  --workflows-only          Only .github/
  --badges-only             Only README.md
  --docs-only               Only docs/
  --turbo-only              Only turbo.json, package.json, vitest.config.ts
  --template <path>         Use a template directory other than the bundled one

${bold("After it runs")} it prints the secrets and repo settings the workflows
need. ${dim("docs/SECRETS.md")} has the same list with where each value comes from.
`);
}

async function prompt(rl, label, fallback) {
  const suffix = fallback ? dim(` (${fallback})`) : dim(" (skip)");
  const answer = (await rl.question(`  ${label}${suffix}: `)).trim();
  return answer || fallback || "";
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) return help();
  if (opts.version) {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return console.log(pkg.version);
  }

  const target = resolve(opts.dir);
  const templateDir = resolveTemplateDir(opts.template);

  console.log(`\n${bold("setup-git-repo")} → ${cyan(target)}\n`);

  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
    console.log(dim(`  created ${target}`));
  }

  // ── Identity: flags win, then git, then the directory name ────────────────
  const detected = detectRepo(target);
  const values = {
    OWNER: opts.values.OWNER ?? detected.owner ?? "",
    REPO: opts.values.REPO ?? detected.repo ?? target.split("/").pop(),
    DEFAULT_BRANCH: opts.values.DEFAULT_BRANCH ?? detected.defaultBranch ?? "main",
    DESCRIPTION: opts.values.DESCRIPTION ?? "",
    ...opts.values,
  };

  if (!detected.isRepo) {
    console.log(yellow("  Not a git repository — owner and branch cannot be detected."));
  }

  const interactive = !opts.yes && stdin.isTTY && stdout.isTTY;

  if (interactive) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      console.log(bold("  Repository"));
      values.OWNER = await prompt(rl, "GitHub owner", values.OWNER);
      values.REPO = await prompt(rl, "Repository name", values.REPO);
      values.DEFAULT_BRANCH = await prompt(rl, "Default branch", values.DEFAULT_BRANCH);
      values.DESCRIPTION = await prompt(rl, "One-line description", values.DESCRIPTION);

      console.log(`\n${bold("  Optional badges")} ${dim("— press Enter to leave one out")}`);
      values.PACKAGE = await prompt(rl, "npm package name", values.PACKAGE);
      values.DOI = await prompt(rl, "Zenodo DOI", values.DOI);
      values.DOCS_URL = await prompt(rl, "Docs URL", values.DOCS_URL);
      values.API_URL = await prompt(rl, "API URL", values.API_URL);
      values.YOUTUBE_URL = await prompt(rl, "YouTube URL", values.YOUTUBE_URL);
      values.UPTIME_ID = await prompt(rl, "UptimeRobot status page id", values.UPTIME_ID);
      values.DISCORD_ID = await prompt(rl, "Discord server id", values.DISCORD_ID);
      values.DISCORD_INVITE = await prompt(rl, "Discord invite URL", values.DISCORD_INVITE);
      console.log("");
    } finally {
      rl.close();
    }
  }

  if (!values.OWNER || !values.REPO) {
    console.error(red("\n  Owner and repo are required. Pass --owner and --repo, or run inside a git repo with an origin remote.\n"));
    process.exit(1);
  }
  if (!values.DESCRIPTION) values.DESCRIPTION = `${values.REPO} — a Turborepo monorepo.`;

  // ── Plan ──────────────────────────────────────────────────────────────────
  const files = collectFiles(templateDir);
  const plan = planFiles(files, {
    exists: (file) => existsSync(join(target, destinationFor(file))),
    force: opts.force,
    only: opts.only,
  });

  const report = (label, list, color) => {
    if (!list.length) return;
    console.log(`  ${color(label)} ${dim(`(${list.length})`)}`);
    for (const file of list) console.log(`    ${destinationFor(file)}`);
  };

  report(opts.dryRun ? "would write" : "write", plan.write, green);
  report(opts.dryRun ? "would overwrite" : "overwrite", plan.overwrite, yellow);
  report("skip, already present", plan.skip, dim);

  if (plan.skip.length && !opts.force) {
    console.log(dim("\n  Re-run with --force to overwrite the skipped files."));
  }

  if (opts.dryRun) {
    console.log(dim("\n  --dry-run: nothing was written.\n"));
    return;
  }

  for (const file of [...plan.write, ...plan.overwrite]) {
    const destination = join(target, destinationFor(file));
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, render(readFileSync(join(templateDir, file), "utf8"), values));
  }

  // ── What is still on the human ────────────────────────────────────────────
  const badges = configuredBadges(values);
  const omitted = Object.keys(OPTIONAL_BADGES).filter((b) => !badges.has(b));

  console.log(`\n${green("✓")} ${bold(`${plan.write.length + plan.overwrite.length} files written`)}\n`);

  if (omitted.length) {
    console.log(`${bold("Badges left out")} ${dim("(no value given)")}: ${omitted.join(", ")}`);
    console.log(dim("  docs/BADGES.md has the snippet and setup steps for each.\n"));
  }

  console.log(bold("Next: the secrets these workflows need"));
  console.log(dim("  Settings → Secrets and variables → Actions → New repository secret"));
  console.log(`
  ${cyan("CODECOV_TOKEN")}          coverage + test analytics ${dim("(tests.yml)")}
  ${cyan("NPM_TOKEN")}              npm publishing ${dim("(npm-publish.yml — or set up trusted publishing instead)")}
  ${cyan("CLOUDFLARE_API_TOKEN")}   test report deploys ${dim("(deploy-test-reports.yml)")}
  ${cyan("CLOUDFLARE_ACCOUNT_ID")}  test report deploys ${dim("(deploy-test-reports.yml)")}
  ${cyan("GIT_TOKEN")}              auto-merge ${dim("(a PAT: GITHUB_TOKEN's merges do not trigger other workflows)")}
`);

  console.log(bold("Next: the repository settings they need"));
  console.log(`
  Settings → General → Pull Requests → ${cyan("Allow auto-merge")}
  Settings → Branches → branch protection with ${cyan("at least one required check")}
  ${dim("without both, --auto is rejected and the fallback merges without waiting for CI")}
  Settings → Actions → General → ${cyan("Read and write permissions")} ${dim("(for the version-bump commit)")}
  Settings → Actions → General → ${cyan("Allow Actions to create pull requests")}
`);

  console.log(`${bold("Then")}\n`);
  console.log(`  ${cyan("bun install")}`);
  console.log(`  ${cyan("bun run build")}   ${dim("# turbo fans out across packages/ and apps/")}`);
  console.log(`\n  Read ${cyan("docs/BADGES.md")}, ${cyan("docs/WORKFLOWS.md")} and ${cyan("docs/SECRETS.md")} for the details.\n`);
}

main().catch((error) => {
  console.error(red(`\n${error.message}\n`));
  process.exit(1);
});
