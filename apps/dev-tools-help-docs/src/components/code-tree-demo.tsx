/**
 * Live demo of the `code-tree-graph` package, rendered from this monorepo's
 * own source at build time.
 *
 * The components are imported from the package source (not `dist`) so Next.js
 * sees their `"use client"` boundaries. Scanning happens while the page is
 * statically generated, so the deployed site never needs the source files.
 */
import fs from 'node:fs'
import path from 'node:path'
import { FileTreeView } from '@code-tree-graph/components/code-tree/filetree-view'
import { DependencyGraph } from '@code-tree-graph/components/codegraph/dependency-graph'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'

const GH_TREE =
  'https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master'

/** Folders that only add noise to the demo graph. */
const IGNORE = ['test', 'tests', 'benchmark', 'docs', 'coverage', 'web']

export const DEMO_PACKAGES = [
  { name: 'code-tree-graph', dir: 'packages/code-tree-graph' },
  { name: 'git0', dir: 'packages/git0-repo-downloader/src' },
  { name: 'about-system', dir: 'packages/about-system-info/src' },
  { name: 'manage-storage', dir: 'packages/manage-storage/src' },
] as const

/**
 * Find the monorepo root by walking up from the cwd. `next build` runs from
 * the app directory locally and on Vercel, but don't depend on that.
 */
function repoRoot(): string {
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'turbo.json'))) return dir
    dir = path.dirname(dir)
  }
  return path.resolve(process.cwd(), '../..')
}

/** Relative paths of `*.test.*` / `*.spec.*` files, which sit beside the source in some packages. */
function testFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })
  return entries
    .map((e) => e.replace(/\\/g, '/'))
    .filter(
      (e) =>
        !e.includes('node_modules') && /\.(test|spec)\.[cm]?[jt]sx?$/.test(e)
    )
}

export function CodeTreeDemo() {
  const root = repoRoot()

  return (
    <Tabs items={DEMO_PACKAGES.map((p) => p.name)} persist={false}>
      {DEMO_PACKAGES.map((pkg) => {
        const abs = path.join(root, pkg.dir)
        const ghBase = `${GH_TREE}/${pkg.dir}`
        const ignore = [...IGNORE, ...testFiles(abs)]
        return (
          <Tab key={pkg.name} value={pkg.name}>
            <p className='text-fd-muted-foreground text-sm'>
              Scanned from{' '}
              <a href={ghBase} target='_blank' rel='noreferrer'>
                <code>{pkg.dir}</code>
              </a>
            </p>
            <DependencyGraph paths={[abs]} ignore={ignore} />
            <FileTreeView
              paths={[abs]}
              ghBase={ghBase}
              ignore={ignore}
              defaultCollapseDepth={1}
            />
          </Tab>
        )
      })}
    </Tabs>
  )
}
