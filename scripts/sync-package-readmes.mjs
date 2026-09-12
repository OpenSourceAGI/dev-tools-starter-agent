#!/usr/bin/env node
/**
 * Write the generated header of every package README: a badge row that describes
 * *one package*, and the one-line command that installs that package's agent
 * skill.
 *
 * The root README's badge block is the repo's: stars, commit activity, the
 * monorepo's coverage. Pasting it into `packages/manage-storage/README.md` makes
 * the package look busier than it is and says nothing about the package — the
 * download count belongs to whichever package the root block happened to
 * advertise, and the coverage number mixes in sixteen others. So each package
 * gets its own row instead, built from its own manifest:
 *
 *   npm version / monthly / total downloads   its own npm name
 *   TypeScript types, install size            its own published tarball
 *   coverage                                  its own Codecov flag, if it has one
 *   Docs, Open in StackBlitz                  its own docs page and directory
 *
 * Badges whose inputs are missing are left out rather than rendered broken, so
 * a private package gets the two badges that still mean something and an
 * unflagged one gets no coverage badge at all. The catalog and the skipping
 * both come from `template-git-repo`, which is where the repo-level block comes
 * from too — one definition of what a badge is, used twice.
 *
 * The second half of the header is the skill line. Every package here ships an
 * agent skill under `skills/`, and the install command differs per package
 * (`--skill <name>`), so it is generated from the same pass rather than pasted —
 * pasted ones are how a README ends up telling you to install another package's
 * skill.
 *
 * Usage:
 *   node scripts/sync-package-readmes.mjs           # write
 *   node scripts/sync-package-readmes.mjs --check   # fail if anything is stale (CI)
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { renderBadgeBlock } from '../packages/template-git-repo/src/badges.js'
import { buildContext, detectStack } from '../packages/template-git-repo/src/context.js'
import {
  END_MARKER,
  START_MARKER,
  injectBadges,
} from '../packages/template-git-repo/src/readme.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Where the synced README pages are published. */
const DOCS_SITE = 'https://starterdocs.vtempest.workers.dev'

/**
 * Directories scanned, the docs section each lands in, and whether npm-publish.yml
 * publishes what is in it.
 *
 * `npm` is not read off the `private` field: the publish workflow loops over
 * `packages/*` and nothing else, so a non-private app — a Worker, an extension —
 * has a package.json name that is not on the registry. Rendering npm badges from
 * it produces five grey "invalid" images.
 */
const SECTIONS = [
  { dir: 'packages', docsSlug: 'packages', npm: true },
  { dir: 'apps', docsSlug: 'apps', npm: false },
]

/**
 * The badges this block carries, and the only ones it rewrites.
 *
 * Read as four rows, and the split between the second and third is the point:
 *
 *   row 2 (quality)   measures *this package* — its own npm name, its own
 *                     tarball, its own Codecov flag. Nothing here is affected
 *                     by the sixteen packages next to it.
 *   row 3 (community) measures *the repository* this package ships from —
 *                     stars, open issues, the PR queue. Those are repo-wide by
 *                     nature, which is exactly why they are on a separate row
 *                     and labelled rather than mixed into the package numbers.
 *
 * Neither row can stand for the other: a package with no downloads in a busy
 * repo and a popular package in a quiet one are different situations, and the
 * two rows together are what tells them apart.
 */
const PACKAGE_BADGES = [
  // identity
  'docs',
  'stackblitz',
  // quality — this package
  'npm-version',
  'npm-downloads',
  'npm-total-downloads',
  'npm-types',
  'install-size',
  'codecov-flag',
  // community — the repo it ships from
  'stars',
  'issues',
  'pull-requests',
  'prs-merged',
  'discussions',
  'last-commit',
  // stack — read off this package's own manifest
  'stack',
]

/**
 * Packages StackBlitz cannot boot, so they get no "Open in StackBlitz" badge.
 *
 * StackBlitz installs from the manifest at the path it is handed and runs it in
 * a browser WebContainer. That rules out anything whose point is to run
 * somewhere else: a Worker that only exists once deployed, a Tauri shell that
 * needs a native toolchain, a VS Code extension that needs an extension host.
 * A badge that opens an editor which cannot run the thing is worse than no
 * badge.
 */
const NO_STACKBLITZ = new Set([
  'cccp-vscode-ext',
  'cloudflare-to-claude-fix',
  'native-app-wrapper',
  'vscode-cloud',
  'web2mobile-wrapper',
])

/** Markers for the skill-install line, which this script owns end to end. */
const SKILL_START = '<!-- skills:install:start -->'
const SKILL_END = '<!-- skills:install:end -->'

/** The repo the `skills` CLI installs from. */
const SKILLS_SOURCE = 'https://github.com/OpenSourceAGI/dev-tools-starter-agent'

/**
 * Which skill (or skills) document each package, as listed in `skills/README.md`.
 *
 * Written out rather than derived: a skill directory is not named after its
 * package (`open-when-ready` is documented by `open-ready`), two packages have
 * two skills each, and the ones that do mention a `packages/…` path in their body
 * mention example paths too. Wrong here means a README that tells you to install
 * something else, so the mapping is explicit and `validateSkills` fails the run
 * if a name does not exist on disk.
 */
const SKILLS_BY_PACKAGE = {
  'about-system-info': ['about-system'],
  'api2ai-mcp-generator': ['api2ai'],
  'cloudflare-to-claude-fix': ['cloudflare-to-claude-fix'],
  'code-tree-graph': ['code-tree-graph'],
  'create-cloud-db': ['create-cloud-db'],
  'create-starter-app': ['create-starter-app'],
  'export-svg-icons-typescript': ['export-svg-typescript'],
  'git0-repo-downloader': ['git0'],
  'legal-terms-privacy-policy': ['legal-terms-privacy-policy'],
  'manage-storage': ['manage-storage'],
  'native-app-wrapper': ['native-app-wrapper'],
  'open-when-ready': ['open-ready'],
  'react-app-store-buttons': ['app-store-buttons'],
  'server-shell-setup': ['server-shell-setup'],
  'setup-git-repo': ['github-actions-setup', 'git-badges'],
  'template-git-repo': ['template-git-repo', 'repo-badges'],
  'verify-phone-sms': ['verify-phone-sms'],
  'web2mobile-wrapper': ['web2mobile'],
}

const README_NAMES = ['README.md', 'readme.md', 'Readme.md']

/**
 * @param {string} dir absolute directory
 * @returns {string | undefined} the README in it, whatever case it was spelled
 */
function findReadme(dir) {
  for (const name of README_NAMES) {
    const candidate = path.join(dir, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return undefined
}

/**
 * @param {string} file
 * @returns {Record<string, any> | null}
 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Which Codecov flag covers a directory, read straight out of `codecov.yml`.
 *
 * Deliberately a scanner and not a YAML parse: the one shape it has to read is
 * `flag_management.individual_flags[].{name,paths}`, the file is ours, and a
 * root-level dependency for eight lines of indentation is a bad trade. Anything
 * it cannot make sense of yields no flag, which costs a badge rather than
 * producing a wrong one.
 *
 * @param {string} root
 * @returns {Map<string, string>} package directory (`packages/foo/`) -> flag name
 */
export function readCodecovFlags(root) {
  const flags = new Map()
  const file = path.join(root, 'codecov.yml')
  if (!fs.existsSync(file)) return flags

  let inFlags = false
  let current

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (/^\s*individual_flags:\s*$/.test(line)) {
      inFlags = true
      continue
    }
    if (!inFlags) continue

    // Any key back at column 0 ends the block.
    if (/^\S/.test(line)) break

    const name = line.match(/^\s*-\s*name:\s*(\S+)\s*$/)
    if (name) {
      current = name[1]
      continue
    }

    const entry = line.match(/^\s*-\s*(\S+)\s*$/)
    if (entry && current) flags.set(entry[1].replace(/\/?$/, '/'), current)
  }

  return flags
}

/**
 * Every package/app with a README, and the badge context that describes it.
 *
 * @param {Record<string, any>} repoContext the repo-level context (slug, branch)
 * @returns {{ dir: string, slug: string, readme: string, overrides: Record<string, string | undefined> }[]}
 */
export function collectEntries(repoContext) {
  const codecovFlags = readCodecovFlags(repoContext.root)
  const entries = []

  for (const { dir, docsSlug, npm } of SECTIONS) {
    const parent = path.join(repoContext.root, dir)
    if (!fs.existsSync(parent)) continue

    for (const child of fs
      .readdirSync(parent, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = `${dir}/${child.name}`
      const readme = findReadme(path.join(parent, child.name))
      if (!readme) continue

      const manifest = readJson(path.join(parent, child.name, 'package.json'))
      // A private package has no npm page, no download count and no published
      // tarball to measure, so the npm badges are skipped for it — as they are
      // for anything outside the directory the publish workflow covers.
      const published =
        npm && manifest?.name && !manifest.private ? manifest.name : undefined

      entries.push({
        dir: relative,
        slug: child.name,
        readme,
        overrides: {
          npmPackage: published,
          codecovFlag: codecovFlags.get(`${relative}/`),
          docsUrl: `${DOCS_SITE}/docs/${docsSlug}/${child.name}`,
          // Not gated on `published`: StackBlitz boots from the manifest at the
          // path, not from the registry, so a private package or an app runs
          // there just as well as a published one. What it needs is a
          // package.json at that path and a runtime it can host — hence the
          // manifest check and the NO_STACKBLITZ list.
          stackblitzUrl:
            manifest && !NO_STACKBLITZ.has(child.name)
              ? `https://stackblitz.com/github/${repoContext.repoSlug}/tree/${repoContext.defaultBranch}/${relative}`
              : undefined,
          // Read off this package's own dependencies, not the repo's. The
          // catalog shares one install, so a repo-wide stack row would put
          // Next.js on a README for a CLI that has never seen React.
          stack: detectStack(manifest, { packageManager: repoContext.packageManager }),
        },
      })
    }
  }

  return entries
}

/**
 * Fail loudly on a skill name that does not exist, in either direction.
 *
 * A typo'd name produces a command that installs nothing, which nobody notices
 * from reading the README — and a skill that no package points at is invisible to
 * anyone browsing packages, which is the other half of the same mistake.
 *
 * @param {string} root
 * @returns {string[]} skills that exist but no package cites
 */
export function validateSkills(root) {
  const cited = new Set(Object.values(SKILLS_BY_PACKAGE).flat());

  for (const name of cited) {
    if (!fs.existsSync(path.join(root, 'skills', name, 'SKILL.md'))) {
      throw new Error(
        `SKILLS_BY_PACKAGE points at skills/${name}/SKILL.md, which does not exist. ` +
          'Fix the name, or add the skill.',
      )
    }
  }

  const onDisk = fs.existsSync(path.join(root, 'skills'))
    ? fs
        .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : []

  return onDisk.filter(
    (name) => !cited.has(name) && fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')),
  )
}

/**
 * The install line(s) for a package's agent skill.
 *
 * Deliberately one line per skill and no heading: it sits above the README's own
 * title, where a section heading would read as the document's first section.
 *
 * @param {string} slug package directory name
 * @param {string} dir package directory relative to the repo root
 * @returns {string} markdown, or '' for a package with no skill
 */
export function renderSkillInstall(slug, dir) {
  const skills = SKILLS_BY_PACKAGE[slug]
  if (!skills || skills.length === 0) return ''

  // Relative so it resolves on GitHub, in an editor, and in the docs sync (which
  // rewrites it to an absolute blob URL).
  const up = '../'.repeat(dir.split('/').length)

  const commands = skills.map(
    (name) =>
      `\`npx skills@latest add ${SKILLS_SOURCE} --skill ${name}\`` +
      ` ([what it covers](${up}skills/${name}/SKILL.md))`,
  )

  // One skill reads as a sentence; two want a label of their own, or the label
  // repeats down the page.
  return commands.length === 1
    ? `**🤖 Agent skill** — ${commands[0]}`
    : ['**🤖 Agent skills**', ...commands].join('\n<br />\n')
}

/**
 * Where a generated block goes in a README that has no markers yet.
 *
 * Above everything is wrong here: most of these READMEs open with a centered
 * hero image, and shoving a badge row above it buries the one thing that tells
 * you what the package is. So the block goes directly after that image block if
 * there is one, and at the top otherwise.
 *
 * @param {string} readme
 * @param {string} block
 * @returns {{ content: string, action: 'replaced' | 'inserted' }}
 */
export function placeBlock(readme, block) {
  if (readme.includes(START_MARKER) && readme.includes(END_MARKER)) {
    return injectBadges(readme, block)
  }

  // A leading `<p align="center">…</p>` (or `<div>`) carrying an image.
  const hero = readme.match(/^\s*<(p|div)\b[^>]*>[\s\S]*?<\/\1>\s*/)
  if (hero && /<img\b/i.test(hero[0])) {
    const marked = [START_MARKER, block, END_MARKER].join('\n')
    return {
      content: `${hero[0].replace(/\s*$/, '\n\n')}${marked}\n\n${readme.slice(hero[0].length).replace(/^\n+/, '')}`,
      action: 'inserted',
    }
  }

  return injectBadges(readme, block)
}

/**
 * Put the skill line under the badge block, replacing the previous one.
 *
 * @param {string} readme
 * @param {string} block rendered skill markdown ('' to remove the section)
 * @returns {string}
 */
export function placeSkillBlock(readme, block) {
  const marked = block ? [SKILL_START, block, SKILL_END].join('\n') : ''

  const start = readme.indexOf(SKILL_START)
  const end = readme.indexOf(SKILL_END)

  if (start !== -1 && end !== -1 && end > start) {
    const after = readme.slice(end + SKILL_END.length)
    return readme.slice(0, start) + marked + (marked ? after : after.replace(/^\n+/, '\n'))
  }

  if (!block) return readme

  // Directly after the badge row, which placeBlock has already put in place.
  const badgesEnd = readme.indexOf(END_MARKER)
  if (badgesEnd !== -1) {
    const cut = badgesEnd + END_MARKER.length
    return `${readme.slice(0, cut)}\n\n${marked}${readme.slice(cut)}`
  }

  return `${marked}\n\n${readme.replace(/^\n+/, '')}`
}

/**
 * @param {{ check?: boolean }} [options]
 * @returns {{ changed: string[], skipped: { dir: string, ids: string[] }[] }}
 */
export function syncPackageBadges(options = {}) {
  const { check = false } = options
  const repoContext = buildContext({ cwd: ROOT })
  const orphanSkills = validateSkills(ROOT)

  if (!repoContext.repoSlug) {
    throw new Error(
      'Could not work out the GitHub slug for this repo — every badge URL needs it. Is the `origin` remote set?',
    )
  }

  const changed = []
  const skippedByEntry = []

  for (const entry of collectEntries(repoContext)) {
    const context = { ...repoContext, ...entry.overrides }
    const { markdown, skipped } = renderBadgeBlock(context, { only: PACKAGE_BADGES })

    const existing = fs.readFileSync(entry.readme, 'utf8')
    const { content: withBadges } = placeBlock(existing, markdown)
    const content = placeSkillBlock(
      withBadges,
      renderSkillInstall(entry.slug, entry.dir),
    )

    const relative = path.relative(repoContext.root, entry.readme)
    if (content !== existing) {
      if (!check) fs.writeFileSync(entry.readme, content)
      changed.push(relative)
    }

    const ids = skipped.map((item) => item.id).filter((id) => PACKAGE_BADGES.includes(id))
    if (ids.length > 0) skippedByEntry.push({ dir: entry.dir, ids })
  }

  return { changed, skipped: skippedByEntry, orphanSkills }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check')
  const { changed, skipped, orphanSkills } = syncPackageBadges({ check })

  for (const file of changed) console.log(`  ${check ? '!' : '~'} ${file}`)

  if (skipped.length > 0) {
    console.log('\n  Badges left out (nothing to point them at):')
    for (const { dir, ids } of skipped) console.log(`    ${dir.padEnd(38)} ${ids.join(', ')}`)
  }

  if (orphanSkills.length > 0) {
    console.log(
      `\n  Skills no package README links to: ${orphanSkills.join(', ')}` +
        '\n    → add them to SKILLS_BY_PACKAGE, or retire them',
    )
  }

  if (check && changed.length > 0) {
    console.error(
      `\n${changed.length} README header(s) are out of date — run: bun run readmes\n`,
    )
    process.exit(1)
  }

  console.log(
    check
      ? '\nEvery package README header is up to date.\n'
      : `\n${changed.length === 0 ? 'Already up to date' : `Updated ${changed.length} README(s)`}.\n`,
  )
}
