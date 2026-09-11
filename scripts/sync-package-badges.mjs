#!/usr/bin/env node
/**
 * Put a badge row that describes *one package* at the top of that package's
 * README.
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
 * Usage:
 *   node scripts/sync-package-badges.mjs           # write
 *   node scripts/sync-package-badges.mjs --check   # fail if anything is stale (CI)
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { renderBadgeBlock } from '../packages/template-git-repo/src/badges.js'
import { buildContext } from '../packages/template-git-repo/src/context.js'
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

/** The badges this block carries, and the only ones it rewrites. */
const PACKAGE_BADGES = [
  'docs',
  'stackblitz',
  'npm-version',
  'npm-downloads',
  'npm-total-downloads',
  'npm-types',
  'install-size',
  'codecov-flag',
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
          stackblitzUrl:
            published && !NO_STACKBLITZ.has(child.name)
              ? `https://stackblitz.com/github/${repoContext.repoSlug}/tree/${repoContext.defaultBranch}/${relative}`
              : undefined,
        },
      })
    }
  }

  return entries
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
 * @param {{ check?: boolean }} [options]
 * @returns {{ changed: string[], skipped: { dir: string, ids: string[] }[] }}
 */
export function syncPackageBadges(options = {}) {
  const { check = false } = options
  const repoContext = buildContext({ cwd: ROOT })

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
    const { content } = placeBlock(existing, markdown)

    const relative = path.relative(repoContext.root, entry.readme)
    if (content !== existing) {
      if (!check) fs.writeFileSync(entry.readme, content)
      changed.push(relative)
    }

    const ids = skipped.map((item) => item.id).filter((id) => PACKAGE_BADGES.includes(id))
    if (ids.length > 0) skippedByEntry.push({ dir: entry.dir, ids })
  }

  return { changed, skipped: skippedByEntry }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check')
  const { changed, skipped } = syncPackageBadges({ check })

  for (const file of changed) console.log(`  ${check ? '!' : '~'} ${file}`)

  if (skipped.length > 0) {
    console.log('\n  Badges left out (nothing to point them at):')
    for (const { dir, ids } of skipped) console.log(`    ${dir.padEnd(38)} ${ids.join(', ')}`)
  }

  if (check && changed.length > 0) {
    console.error(
      `\n${changed.length} README badge block(s) are out of date — run: bun run badges\n`,
    )
    process.exit(1)
  }

  console.log(
    check
      ? '\nEvery package README badge block is up to date.\n'
      : `\n${changed.length === 0 ? 'Already up to date' : `Updated ${changed.length} README(s)`}.\n`,
  )
}
