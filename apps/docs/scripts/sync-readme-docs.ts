/**
 * Copies every core package / app README into the Fumadocs content tree so the
 * whole monorepo is documented at `/docs` instead of on an external docs host.
 *
 * READMEs are GitHub-flavoured markdown, which is not valid MDX: they carry raw
 * HTML badge blocks with unclosed `<p>` wrappers and non-self-closing `<img>` /
 * `<br>` tags. `convertReadmeToMdx` normalises those so the pages compile, and
 * leaves the prose untouched.
 *
 * Run with `bun run docs:sync` after editing a package README.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import * as path from 'node:path'

const DOCS_ROOT = path.resolve(import.meta.dirname, '..')
const REPO_ROOT = path.resolve(DOCS_ROOT, '../..')
const CONTENT_ROOT = path.join(DOCS_ROOT, 'content/docs/(index)')
const REPO_URL = 'https://github.com/OpenSourceAGI/dev-tools-starter-agent'
const DEFAULT_BRANCH = 'master'

interface Entry {
  /** Directory relative to the repo root. */
  dir: string
  /** Sidebar label. */
  title: string
  /** Lucide icon name, resolved by the docs `lucideIconsPlugin`. */
  icon: string
  /** Falls back to the package.json description when omitted. */
  description?: string
  /** Category separator rendered above this page in the sidebar. */
  category?: string
}

const PACKAGES: Entry[] = [
  {
    category: 'CLI Tools',
    dir: 'packages/about-system-info',
    title: 'about-system',
    icon: 'Cpu',
  },
  {
    dir: 'packages/api2ai-mcp-generator',
    title: 'api2ai',
    icon: 'Wand2',
  },
  {
    dir: 'packages/create-cloud-db',
    title: 'create-cloud-db',
    icon: 'Database',
  },
  {
    dir: 'packages/create-starter-app',
    title: 'create-starter-app',
    icon: 'Rocket',
  },
  {
    dir: 'packages/git0-repo-downloader',
    title: 'git0',
    icon: 'GitBranch',
  },
  {
    dir: 'packages/open-when-ready',
    title: 'open-ready',
    icon: 'Globe',
  },
  {
    dir: 'packages/server-shell-setup',
    title: 'server-shell-setup',
    icon: 'HardDrive',
    description:
      'One-command bootstrap for a modern dev environment: fish, nvim, nushell, bun, node, helix, starship, docker, and more.',
  },
  {
    category: 'Libraries',
    dir: 'packages/code-tree-graph',
    title: 'code-tree-graph',
    icon: 'Workflow',
  },
  {
    dir: 'packages/export-svg-icons-typescript',
    title: 'export-svg-typescript',
    icon: 'Image',
  },
  {
    dir: 'packages/manage-storage',
    title: 'manage-storage',
    icon: 'HardDrive',
  },
  {
    dir: 'packages/react-app-store-buttons',
    title: 'react-app-store-buttons',
    icon: 'Smartphone',
  },
  {
    dir: 'packages/shadcn-theme-menu',
    title: 'shadcn-theme-menu',
    icon: 'Palette',
  },
  {
    category: 'Infrastructure',
    dir: 'packages/cloudflare-to-claude-fix',
    title: 'cloudflare-to-claude-fix',
    icon: 'Zap',
    description:
      'Cloudflare Workers queue consumer that fires a Claude Code routine whenever a Workers build fails.',
  },
  {
    dir: 'packages/native-app-wrapper',
    title: 'native-app-wrapper',
    icon: 'MonitorSmartphone',
  },
  {
    dir: 'packages/verify-phone-sms',
    title: 'sms-verification-api',
    icon: 'Shield',
  },
  {
    dir: 'packages/web2mobile-wrapper',
    title: 'create-mobile-wrapper',
    icon: 'Smartphone',
    description:
      'Turn any website URL into a native iOS and Android app wrapper with push notifications.',
  },
]

const APPS: Entry[] = [
  {
    dir: 'apps/Cloud-Computer-Control-Panel',
    title: 'Cloud Computer Control Panel',
    icon: 'Server',
  },
  {
    dir: 'apps/cccp-vscode-ext',
    title: 'CCCP for VS Code',
    icon: 'Cloud',
  },
  {
    dir: 'apps/vscode-cloud',
    title: 'vscode-cloud',
    icon: 'Code',
    description:
      'Per-user VS Code (code-server) instances on Cloudflare Containers, with SSO, isolated storage, and traffic routing.',
  },
]

const SECTIONS = [
  {
    slug: 'packages',
    title: 'Packages',
    icon: 'Package',
    description: 'Every published CLI, library, and service in the monorepo.',
    entries: PACKAGES,
  },
  {
    slug: 'apps',
    title: 'Apps',
    icon: 'AppWindow',
    description: 'Full applications shipped from this repository.',
    entries: APPS,
  },
] as const

/** Void elements must be self-closed to parse as JSX. */
const VOID_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]

/** HTML attributes React spells differently. */
const ATTRIBUTE_RENAMES: Record<string, string> = {
  allowfullscreen: 'allowFullScreen',
  autoplay: 'autoPlay',
  class: 'className',
  colspan: 'colSpan',
  crossorigin: 'crossOrigin',
  for: 'htmlFor',
  frameborder: 'frameBorder',
  maxlength: 'maxLength',
  readonly: 'readOnly',
  rowspan: 'rowSpan',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
}

/** Fence languages Shiki does not know, mapped to the closest one it does. */
const LANGUAGE_ALIASES: Record<string, string> = {
  env: 'dotenv',
}

const KNOWN_TAGS = new Set([
  ...VOID_TAGS,
  'a',
  'b',
  'blockquote',
  'center',
  'code',
  'details',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'kbd',
  'li',
  'ol',
  'p',
  'picture',
  'pre',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
  'video',
])

const README_NAMES = ['README.md', 'readme.md', 'Readme.md']

const OPEN_TOKEN = '\u0000CODE'
const CLOSE_TOKEN = '\u0000'

function findReadme(dir: string): string | undefined {
  for (const name of README_NAMES) {
    const candidate = path.join(REPO_ROOT, dir, name)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

async function readDescription(dir: string): Promise<string | undefined> {
  const pkgPath = path.join(REPO_ROOT, dir, 'package.json')
  if (!existsSync(pkgPath)) return undefined
  try {
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    const description: string | undefined = pkg.description?.trim()
    if (!description) return undefined
    // package.json descriptions occasionally embed markdown links.
    return description.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  } catch {
    return undefined
  }
}

/** Replaces fenced and inline code with placeholders so transforms skip them. */
function protectCode(input: string): {
  text: string
  restore: (value: string) => string
} {
  const blocks: string[] = []
  const stash = (value: string) => {
    blocks.push(value)
    return `${OPEN_TOKEN}${blocks.length - 1}${CLOSE_TOKEN}`
  }

  let text = input.replace(
    /^([ \t]*)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)^[ \t]*\2[ \t]*$/gm,
    (_match, indent: string, fence: string, info: string, body: string) => {
      const [lang = '', ...rest] = info.trim().split(/\s+/)
      const alias = LANGUAGE_ALIASES[lang.toLowerCase()]
      const meta = [alias ?? lang, ...rest].filter(Boolean).join(' ')
      return stash(`${indent}${fence}${meta}\n${body}${indent}${fence}`)
    }
  )
  // An unterminated fence would otherwise swallow the rest of the transforms.
  text = text.replace(/^([ \t]*)(`{3,}|~{3,})([^\n]*)\n[\s\S]*$/m, (match) =>
    stash(match.trimEnd())
  )
  text = text.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, (match) => stash(match))

  const placeholder = new RegExp(`${OPEN_TOKEN}(\\d+)${CLOSE_TOKEN}`, 'g')

  return {
    text,
    // A stashed block can itself contain placeholders (an unterminated fence
    // swallows earlier ones), so keep expanding until none are left.
    restore: (value) => {
      let result = value
      while (placeholder.test(result)) {
        placeholder.lastIndex = 0
        result = result.replace(
          placeholder,
          (_m, index: string) => blocks[Number(index)]
        )
      }
      return result
    },
  }
}

function rewriteRelativeLinks(text: string, dir: string): string {
  const toAbsolute = (target: string) => {
    const [pathPart, hash = ''] = target.split('#')
    const resolved = path.posix
      .normalize(path.posix.join(dir, pathPart))
      .replace(/^\/+/, '')
    const kind = pathPart.endsWith('/') ? 'tree' : 'blob'
    const suffix = hash ? `#${hash}` : ''
    return `${REPO_URL}/${kind}/${DEFAULT_BRANCH}/${resolved}${suffix}`
  }

  return text
    .replace(
      /(\]\()(?!https?:|#|mailto:|\/\/|data:)([^)\s]+)(\))/g,
      (_m, open: string, target: string, close: string) =>
        `${open}${toAbsolute(target)}${close}`
    )
    .replace(
      /(<(?:a|img)\b[^>]*?\b(?:href|src)=")(?!https?:|#|mailto:|\/\/|data:)([^"]+)(")/g,
      (_m, open: string, target: string, close: string) =>
        `${open}${toAbsolute(target)}${close}`
    )
}

/**
 * Rewrites an HTML attribute list as JSX. Values keep their quoting so query
 * strings such as `?style=flat-square` are not mistaken for new attributes.
 */
function normaliseAttributes(raw: string): string {
  const pattern =
    /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  const attributes: string[] = []

  for (const match of raw.matchAll(pattern)) {
    const name = match[1]
    // `style="a: b"` is a string in HTML but must be an object in JSX.
    if (name.toLowerCase() === 'style') continue
    const jsxName = ATTRIBUTE_RENAMES[name.toLowerCase()] ?? name
    const value = match[2] ?? match[3] ?? match[4]
    attributes.push(
      value === undefined
        ? jsxName
        : `${jsxName}="${value.replace(/"/g, '&quot;')}"`
    )
  }

  return attributes.length ? ` ${attributes.join(' ')}` : ''
}

/** Rewrites a single raw HTML tag into JSX-safe form. */
function normaliseTag(tag: string): string {
  const match = tag.match(
    /^<\s*(\/?)\s*([A-Za-z][A-Za-z0-9-]*)([\s\S]*?)(\/?)>$/
  )
  if (!match) return tag

  const [, closing, rawName, rawAttrs, selfClosing] = match
  const name = rawName.toLowerCase()
  if (!KNOWN_TAGS.has(name)) return tag
  if (closing) return `</${name}>`

  const attrs = normaliseAttributes(rawAttrs)

  if (VOID_TAGS.includes(name)) return `<${name}${attrs} />`
  return `<${name}${attrs}${selfClosing ? ' /' : ''}>`
}

/**
 * Closes tags a README block left open and drops orphan closing tags, so each
 * markdown HTML block is balanced JSX.
 */
function balanceBlock(block: string): string {
  const stack: string[] = []
  let output = ''
  let index = 0

  for (const match of block.matchAll(
    /<\/?([A-Za-z][A-Za-z0-9-]*)[^>]*?\/?>/g
  )) {
    const tag = match[0]
    const name = match[1].toLowerCase()
    output += block.slice(index, match.index)
    index = match.index + tag.length

    if (
      !KNOWN_TAGS.has(name) ||
      VOID_TAGS.includes(name) ||
      tag.endsWith('/>')
    ) {
      output += tag
      continue
    }
    if (tag.startsWith('</')) {
      if (!stack.includes(name)) continue // orphan closer, drop it
      let open = stack.pop()
      while (open && open !== name) {
        output += `</${open}>`
        open = stack.pop()
      }
      output += tag
      continue
    }
    stack.push(name)
    output += tag
  }

  output += block.slice(index)
  while (stack.length) output += `\n</${stack.pop()}>`
  return output
}

function convertReadmeToMdx(raw: string, dir: string): string {
  const { text: protectedText, restore } = protectCode(
    raw.replace(/\r\n/g, '\n')
  )

  let text = protectedText
    // HTML comments are not valid MDX.
    .replace(/<!--[\s\S]*?-->/g, '')
    // The page title comes from frontmatter; drop the README's own H1.
    .replace(/^#\s+[^\n]*\n?/m, '')

  text = rewriteRelativeLinks(text, dir)

  // `<p>` badge wrappers routinely contain headings, which React refuses to
  // nest inside a paragraph. They are always layout wrappers here.
  text = text
    .replace(/<p(\s[^>]*)?>/gi, (_m, attrs) => `<div${attrs ?? ''}>`)
    .replace(/<\/p>/gi, '</div>')

  text = text.replace(/<\/?[A-Za-z][A-Za-z0-9-]*[^>]*?>/g, normaliseTag)

  // Anything left that looks like a tag but is not one (`<repo>`, `< 5`), plus
  // braces, which MDX would otherwise read as expressions.
  text = text
    .replace(/<(?!\/?[A-Za-z][A-Za-z0-9-]*[\s/>])/g, '&lt;')
    .replace(/<\/?([A-Za-z][A-Za-z0-9-]*)/g, (match, name: string) =>
      KNOWN_TAGS.has(name.toLowerCase()) ? match : `&lt;${match.slice(1)}`
    )
    .replace(/[{}]/g, (brace) => (brace === '{' ? '&#123;' : '&#125;'))

  text = text
    .split(/\n{2,}/)
    .map((block) => (block.includes('<') ? balanceBlock(block) : block))
    .join('\n\n')

  return restore(text).trim()
}

function yamlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

async function buildPage(entry: Entry): Promise<string | undefined> {
  const readmePath = findReadme(entry.dir)
  if (!readmePath) {
    console.warn(`[sync-readme-docs] no README found in ${entry.dir}`)
    return undefined
  }

  const raw = await readFile(readmePath, 'utf8')
  const description = entry.description ?? (await readDescription(entry.dir))
  const relative = path.relative(REPO_ROOT, readmePath)
  const source = `${REPO_URL}/blob/${DEFAULT_BRANCH}/${relative}`

  const frontmatter = [
    '---',
    `title: ${yamlString(entry.title)}`,
    ...(description ? [`description: ${yamlString(description)}`] : []),
    `icon: ${entry.icon}`,
    '---',
  ].join('\n')

  const banner = `{/* Generated from ${relative} by scripts/sync-readme-docs.ts. Edit the README, then run \`bun run docs:sync\`. */}`
  const footer = `---\n\nSource: [\`${relative}\`](${source})`

  return `${frontmatter}\n\n${banner}\n\n${convertReadmeToMdx(raw, entry.dir)}\n\n${footer}\n`
}

export async function syncReadmeDocs() {
  for (const section of SECTIONS) {
    const outDir = path.join(CONTENT_ROOT, section.slug)
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const pages: string[] = []
    let written = 0
    for (const entry of section.entries) {
      const page = await buildPage(entry)
      if (!page) continue
      const slug = path.basename(entry.dir)
      await writeFile(path.join(outDir, `${slug}.mdx`), page, 'utf8')
      if (entry.category) pages.push(`---${entry.category}---`)
      pages.push(slug)
      written += 1
    }

    await writeFile(
      path.join(outDir, 'meta.json'),
      `${JSON.stringify(
        {
          title: section.title,
          icon: section.icon,
          description: section.description,
          pages,
        },
        null,
        2
      )}\n`,
      'utf8'
    )

    console.log(
      `[sync-readme-docs] wrote ${written} pages to content/docs/(index)/${section.slug}/`
    )
  }
}

if (import.meta.main) {
  await syncReadmeDocs().catch((error) => {
    console.error('[sync-readme-docs] failed', error)
    process.exit(1)
  })
}
