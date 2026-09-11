#!/usr/bin/env node
/**
 * One command that sets a repository up with the CI, publishing, badges and
 * Turborepo wiring worked out in OpenSourceAGI/qwksearch-research-agent.
 *
 *   bunx template-git-repo
 *
 * Everything it can detect, it detects — repo slug, default branch, package
 * manager, workspace layout, the package to advertise on npm — so the common
 * case takes no flags. What it cannot know (a DOI, a Discord server, a docs
 * URL) is passed in, and the badges that need those are skipped with a note
 * rather than rendered broken.
 *
 * Nothing existing is overwritten without `--force`, and `--dry-run` prints the
 * exact plan a real run would carry out.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildContext } from '../src/context.js';
import { renderBadgeBlock, BADGES } from '../src/badges.js';
import { injectBadges, hasUnmarkedBadges } from '../src/readme.js';
import { planFiles, applyPlan, wireTurbo } from '../src/apply.js';

const HELP = `
template-git-repo — set up a repo with the GitHub Actions, badges and Turborepo
config from the qwksearch reference setup.

Usage
  bunx template-git-repo [options]

What it writes
  .github/workflows/   tests, npm publish, auto-merge, hosted test reports
  scripts/*.mjs        the helpers those workflows call
  turbo.json           pipeline whose task names the workflows use
  codecov.yml          per-package flags with carryforward
  README.md            the badge block, between markers

Options
  --dry-run              Print the plan and change nothing
  --force                Overwrite files that already exist
  --actions-only         Only the workflows and their scripts
  --badges-only          Only the README badge block
  --no-turbo             Do not write turbo.json or touch the root package.json
  --yes, -y              Skip the confirmation prompt

Context (all optional — detected where possible)
  --repo <owner/repo>    Default: the origin remote
  --branch <name>        Default: the remote's HEAD branch
  --pm <bun|pnpm|yarn|npm>
  --npm-package <name>   Package for the npm version/downloads badges
  --workflow <file>      Workflow file for the CI badge (default tests.yml)

Badge inputs (each enables the badge that needs it)
  --doi <10.5281/...>        --docs <url>          --api <url>
  --youtube <url>            --uptime <url>        --test-report <url>
  --discord-id <id>          --discord-invite <url>
  --stack <A,B,C>            --cloudflare-deploy
  --stackblitz <url>         --codecov-flag <name>
  --exclude <id,id>          --only <id,id>

  Badge ids: ${BADGES.map((b) => b.id).join(', ')}

Docs
  docs/ACTIONS.md   what each workflow does and which secrets it needs
  docs/BADGES.md    how to set up each badge
`;

/**
 * A deliberately small parser: this CLI takes `--flag` and `--flag value` and
 * nothing else, so a dependency for it would cost more than it saves.
 *
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
export function parseArgs(argv) {
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('-')) continue;

    const key = arg.replace(/^--?/, '');
    const next = argv[i + 1];

    if (next && !next.startsWith('-')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }

  return flags;
}

/**
 * @param {Record<string, string | boolean>} flags
 * @returns {Record<string, string | undefined>}
 */
function overridesFrom(flags) {
  const text = (key) => (typeof flags[key] === 'string' ? flags[key] : undefined);

  return {
    repoSlug: text('repo'),
    defaultBranch: text('branch'),
    packageManager: text('pm'),
    npmPackage: text('npm-package'),
    workflowFile: text('workflow'),
    doi: text('doi'),
    docsUrl: text('docs'),
    apiUrl: text('api'),
    youtubeUrl: text('youtube'),
    uptimeUrl: text('uptime'),
    testReportUrl: text('test-report'),
    discordId: text('discord-id'),
    discordInvite: text('discord-invite'),
    stack: text('stack'),
    cloudflareDeploy: flags['cloudflare-deploy'] ? 'true' : undefined,
    stackblitzUrl: text('stackblitz'),
    codecovFlag: text('codecov-flag'),
  };
}

/**
 * @param {string[]} [argv]
 * @returns {Promise<number>} process exit code
 */
export async function main(argv = process.argv.slice(2)) {
  const flags = parseArgs(argv);

  if (flags.help || flags.h) {
    console.log(HELP);
    return 0;
  }

  const dryRun = Boolean(flags['dry-run']);
  const force = Boolean(flags.force);
  const badgesOnly = Boolean(flags['badges-only']);
  const actionsOnly = Boolean(flags['actions-only']);
  const skipTurbo = Boolean(flags['no-turbo']) || badgesOnly;

  const context = buildContext({ overrides: overridesFrom(flags) });

  if (!context.repoSlug) {
    console.error(
      'Could not work out which GitHub repo this is: no `origin` remote, or one that is not on github.com.\n' +
        'Pass it explicitly:  bunx template-git-repo --repo owner/repo',
    );
    return 1;
  }

  console.log(`\n📦 ${context.repoSlug}  (${context.defaultBranch}, ${context.packageManager})`);
  console.log(`   ${context.root}\n`);

  let changed = 0;

  // ── Workflows, scripts, turbo.json, codecov.yml ───────────────────────────
  if (!badgesOnly) {
    const include = actionsOnly ? ['.github', 'scripts'] : undefined;
    const filePlan = planFiles({ context, force, include }).filter(
      (entry) => !(skipTurbo && entry.path === 'turbo.json'),
    );

    for (const entry of filePlan) {
      const mark = entry.action === 'skip' ? '·' : entry.action === 'overwrite' ? '~' : '+';
      console.log(`  ${mark} ${entry.path}${entry.action === 'skip' ? '  (exists — use --force to replace)' : ''}`);
    }

    const { written } = applyPlan(filePlan, { dryRun });
    changed += written.length;
    console.log('');
  }

  // ── Root package.json: turbo scripts and devDependency ────────────────────
  if (!skipTurbo && !actionsOnly) {
    const manifestPath = path.join(context.root, 'package.json');

    if (!fs.existsSync(manifestPath)) {
      console.log('  · package.json not found at the repo root — skipping the Turborepo wiring\n');
    } else {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const { manifest: next, changes } = wireTurbo(manifest, { packagesDir: context.packagesDir });

      if (changes.length === 0) {
        console.log('  · package.json already has the turbo wiring\n');
      } else {
        console.log(`  ~ package.json  (${changes.join(', ')})\n`);
        if (!dryRun) fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
        changed++;
      }
    }
  }

  // ── README badges ─────────────────────────────────────────────────────────
  if (!actionsOnly) {
    const readmePath = ['README.md', 'readme.md', 'Readme.md']
      .map((name) => path.join(context.root, name))
      .find((candidate) => fs.existsSync(candidate)) ?? path.join(context.root, 'README.md');

    const existing = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '';

    const { markdown, skipped } = renderBadgeBlock(context, {
      only: typeof flags.only === 'string' ? flags.only.split(',') : undefined,
      exclude: typeof flags.exclude === 'string' ? flags.exclude.split(',') : [],
    });

    const { content, action } = injectBadges(existing, markdown);

    if (content === existing) {
      console.log('  · README.md badges already up to date\n');
    } else {
      console.log(`  ~ ${path.basename(readmePath)}  (badge block ${action})`);
      if (hasUnmarkedBadges(existing)) {
        console.log('    ⚠ the README already had badges of its own — they were left in place, remove the duplicates by hand');
      }
      if (!dryRun) fs.writeFileSync(readmePath, content);
      changed++;
      console.log('');
    }

    if (skipped.length > 0) {
      console.log('  Badges not included (nothing to point them at):');
      for (const { id, missing } of skipped) {
        console.log(`    ${id.padEnd(20)} needs ${missing.join(', ')}`);
      }
      console.log('    → see docs/BADGES.md, then re-run with the matching flag\n');
    }
  }

  // ── What the human still has to do ────────────────────────────────────────
  if (!badgesOnly) {
    console.log('  Repository secrets the workflows expect:');
    console.log('    CODECOV_TOKEN            coverage + test analytics uploads');
    console.log('    NPM_TOKEN                only if you are not using npm trusted publishing');
    console.log('    GIT_TOKEN                a PAT for auto-merge (GITHUB_TOKEN merges do not trigger workflows)');
    console.log('    CLOUDFLARE_API_TOKEN     hosted test reports');
    console.log('    CLOUDFLARE_ACCOUNT_ID    hosted test reports');
    console.log('    → docs/ACTIONS.md explains each one\n');
  }

  if (dryRun) {
    console.log(`Dry run — nothing was written (${changed} file(s) would change).\n`);
  } else {
    console.log(changed === 0 ? 'Already set up — nothing to do.\n' : `Done — ${changed} file(s) changed.\n`);
  }

  return 0;
}

// Only run when invoked as a program, so the module can be imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
