/**
 * Turn the template directory into a list of file operations, then (separately)
 * carry them out.
 *
 * The split is what makes `--dry-run` honest: the same plan is printed and
 * applied, so what the dry run shows is exactly what a real run does, rather
 * than a second implementation that can drift from the first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { substitute } from './context.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The shipped template tree. */
export const TEMPLATE_DIR = path.join(HERE, '..', 'template');

/**
 * Every file under `dir`, relative to it, depth-first and sorted.
 *
 * @param {string} dir
 * @param {string} [prefix]
 * @returns {string[]}
 */
export function walk(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];

  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...walk(path.join(dir, entry.name), relative));
    } else {
      files.push(relative);
    }
  }

  return files;
}

/**
 * Decide what happens to each template file.
 *
 * Existing files are skipped rather than overwritten unless `force` is set.
 * A repo that already has a `turbo.json` has it for a reason, and clobbering a
 * tuned workflow with a generic one is the kind of "help" that costs an
 * afternoon.
 *
 * @param {object} options
 * @param {Record<string, any>} options.context
 * @param {string} [options.templateDir]
 * @param {boolean} [options.force]
 * @param {string[]} [options.include] relative template paths to consider; all by default
 * @returns {{ path: string, absolute: string, content: string, action: 'create' | 'overwrite' | 'skip' }[]}
 */
export function planFiles({ context, templateDir = TEMPLATE_DIR, force = false, include }) {
  const plan = [];

  for (const relative of walk(templateDir)) {
    if (include && !include.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) {
      continue;
    }

    const absolute = path.join(context.root, relative);
    const content = substitute(fs.readFileSync(path.join(templateDir, relative), 'utf8'), context);

    let action = 'create';
    if (fs.existsSync(absolute)) {
      const existing = fs.readFileSync(absolute, 'utf8');
      // An identical file is a skip whatever `force` says — reporting it as an
      // overwrite would make a no-op run look like it changed something.
      action = existing === content ? 'skip' : force ? 'overwrite' : 'skip';
    }

    plan.push({ path: relative, absolute, content, action });
  }

  return plan;
}

/**
 * @param {ReturnType<typeof planFiles>} plan
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ written: string[], skipped: string[] }}
 */
export function applyPlan(plan, options = {}) {
  const { dryRun = false } = options;

  const written = [];
  const skipped = [];

  for (const entry of plan) {
    if (entry.action === 'skip') {
      skipped.push(entry.path);
      continue;
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(entry.absolute), { recursive: true });
      fs.writeFileSync(entry.absolute, entry.content);
      // The workflows call these directly; a script that is not executable
      // fails at the least convenient moment.
      if (entry.path.endsWith('.mjs')) fs.chmodSync(entry.absolute, 0o755);
    }

    written.push(entry.path);
  }

  return { written, skipped };
}

/**
 * The turbo scripts and devDependency the template's workflows assume.
 *
 * Merged into the root package.json rather than written over it: an existing
 * script keeps its definition, since a repo's own `build` almost certainly does
 * something this template cannot know about.
 */
export const TURBO_SCRIPTS = {
  build: 'turbo run build',
  dev: 'turbo run dev',
  lint: 'turbo run lint',
  typecheck: 'turbo run typecheck',
  test: 'turbo run test',
  'test:coverage': 'turbo run test:coverage',
  'test:watch': 'turbo run test:watch',
  clean: 'turbo run clean && rm -rf .turbo node_modules',
};

/**
 * @param {Record<string, any>} manifest parsed root package.json
 * @param {{ packagesDir?: string, turboVersion?: string }} [options]
 * @returns {{ manifest: Record<string, any>, changes: string[] }}
 */
export function wireTurbo(manifest, options = {}) {
  const { packagesDir = 'packages', turboVersion = '^2.10.12' } = options;

  const next = structuredClone(manifest);
  const changes = [];

  next.scripts ??= {};
  for (const [name, command] of Object.entries(TURBO_SCRIPTS)) {
    if (next.scripts[name]) continue;
    next.scripts[name] = command;
    changes.push(`scripts.${name}`);
  }

  next.devDependencies ??= {};
  if (!next.devDependencies.turbo) {
    next.devDependencies.turbo = turboVersion;
    changes.push('devDependencies.turbo');
  }

  // Turbo needs to know what the workspace is; without `workspaces` it treats
  // the repo as a single package and every `--filter` silently matches nothing.
  if (!next.workspaces) {
    next.workspaces = [`${packagesDir}/*`, 'apps/*'];
    changes.push('workspaces');
  }

  return { manifest: next, changes };
}
