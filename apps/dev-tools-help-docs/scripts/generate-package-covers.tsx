/**
 * Generates one cover image per package for the homepage — the thumbnails in
 * the hero parallax and on the package cards — into `public/packages/`.
 *
 * Each cover is a self-contained SVG built from `packages-data.ts`: the
 * package's Lucide icon, name, category, short description and a terminal
 * window showing its commands. No network, no fonts to load, so the images
 * render identically everywhere and cost a few KB each.
 *
 * Run with `bun ./scripts/generate-package-covers.tsx` after editing a
 * package's name, description, icon or commands, and commit the output.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import {
  BookOpen,
  Cloud,
  Code,
  Cpu,
  Database,
  FileText,
  GitBranch,
  Globe,
  HardDrive,
  Image,
  Layers,
  type LucideIcon,
  MonitorSmartphone,
  Package,
  Rocket,
  Server,
  Shield,
  Smartphone,
  Wand2,
  Zap,
} from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { categories } from '../src/app/(home)/packages-data'

const OUT_DIR = path.resolve(import.meta.dirname, '../public/packages')

const W = 960
const H = 768

const icons: Record<string, LucideIcon> = {
  BookOpen,
  Cloud,
  Code,
  Cpu,
  Database,
  FileText,
  GitBranch,
  Globe,
  HardDrive,
  Image,
  Layers,
  MonitorSmartphone,
  Rocket,
  Server,
  Shield,
  Smartphone,
  Wand2,
  Zap,
}

/** The homepage's brand / teal / ember accents, as concrete colours. */
const accents: Record<string, { main: string; soft: string }> = {
  brand: { main: '#a78bfa', soft: '#7c3aed' },
  teal: { main: '#2dd4bf', soft: '#0d9488' },
  ember: { main: '#fb923c', soft: '#ea580c' },
}

const SANS =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Greedy word wrap by character count; the last line gets an ellipsis. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (next.length <= maxChars) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && lines.join(' ').length < text.length) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] =
      `${last.slice(0, maxChars - 1).replace(/[\s.,;:—-]+$/, '')}…`
  }
  return lines
}

/** Keeps the tail of a long repo path so it never runs off the cover. */
function shortPath(p: string, max = 52) {
  const clean = p.replace(/\/$/, '')
  return clean.length > max ? `…${clean.slice(clean.length - max + 1)}` : clean
}

function icon(name: string, color: string, size: number, strokeWidth = 1.75) {
  const Icon = icons[name] ?? Package
  return renderToStaticMarkup(
    <Icon color={color} size={size} strokeWidth={strokeWidth} />
  )
}

function cover(
  pkg: (typeof categories)[number]['packages'][number],
  category: (typeof categories)[number]
) {
  const { main, soft } = accents[category.color] ?? accents.brand
  const nameSize = pkg.name.length > 26 ? 44 : pkg.name.length > 18 ? 52 : 60
  const nameLines = wrap(pkg.name, Math.floor(1500 / nameSize), 2)
  const descLines = wrap(pkg.description, 58, 3)
  const nameTop = 250
  const descTop = nameTop + nameLines.length * nameSize * 1.1 + 20
  const termTop = 480
  const commands = pkg.commands.slice(0, 2)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(pkg.name)}">
  <title>${escapeXml(pkg.name)}</title>
  <defs>
    <radialGradient id="glow" cx="0.12" cy="0.05" r="0.9">
      <stop offset="0" stop-color="${soft}" stop-opacity="0.55"/>
      <stop offset="0.55" stop-color="${soft}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${soft}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#09090b" stop-opacity="0"/>
      <stop offset="1" stop-color="#09090b" stop-opacity="0.9"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#09090b"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g transform="translate(${W - 380} 40)" opacity="0.07">${icon(pkg.icon, main, 360, 1.25)}</g>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>

  <g transform="translate(64 64)">
    <rect width="104" height="104" rx="24" fill="${main}" fill-opacity="0.12" stroke="${main}" stroke-opacity="0.35" stroke-width="2"/>
    <g transform="translate(24 24)">${icon(pkg.icon, main, 56)}</g>
  </g>
  <text x="196" y="108" font-family="${SANS}" font-size="20" font-weight="600" letter-spacing="3" fill="${main}">${escapeXml(category.name.toUpperCase())}</text>
  <text x="196" y="144" font-family="${MONO}" font-size="20" fill="#a1a1aa">${escapeXml(shortPath(pkg.path))}</text>

  ${nameLines
    .map(
      (line, i) =>
        `<text x="64" y="${nameTop + i * nameSize * 1.1}" font-family="${SANS}" font-size="${nameSize}" font-weight="800" letter-spacing="-1" fill="#fafafa">${escapeXml(line)}</text>`
    )
    .join('\n  ')}
  ${descLines
    .map(
      (line, i) =>
        `<text x="64" y="${descTop + i * 36}" font-family="${SANS}" font-size="26" fill="#d4d4d8">${escapeXml(line)}</text>`
    )
    .join('\n  ')}

  <g transform="translate(64 ${termTop})">
    <rect width="${W - 128}" height="${H - termTop - 56}" rx="18" fill="#18181b" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
    <circle cx="32" cy="30" r="7" fill="#f87171"/>
    <circle cx="56" cy="30" r="7" fill="#fbbf24"/>
    <circle cx="80" cy="30" r="7" fill="#4ade80"/>
    <line x1="0" y1="58" x2="${W - 128}" y2="58" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
    ${commands
      .map((cmd, i) => {
        const text = cmd.length > 50 ? `${cmd.slice(0, 49)}…` : cmd
        return `<text x="32" y="${108 + i * 50}" font-family="${MONO}" font-size="26"><tspan fill="${main}">$ </tspan><tspan fill="#e4e4e7">${escapeXml(text)}</tspan></text>`
      })
      .join('\n    ')}
    <text x="32" y="${108 + commands.length * 50}" font-family="${MONO}" font-size="26" fill="${main}">$</text>
    <rect x="62" y="${86 + commands.length * 50}" width="14" height="28" fill="${main}" fill-opacity="0.8"/>
  </g>
</svg>
`
}

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })

let count = 0
for (const category of categories) {
  for (const pkg of category.packages) {
    const file = path.join(OUT_DIR, path.basename(pkg.image))
    await writeFile(file, cover(pkg, category))
    count++
  }
}
console.log(
  `Wrote ${count} package covers to ${path.relative(process.cwd(), OUT_DIR)}`
)
