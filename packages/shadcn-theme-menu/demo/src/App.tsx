import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ThemeProvider,
  ThemeToggle,
  ThemeDropdown,
  CinematicThemeSwitcher,
  SidebarUserMenu,
  themeColors,
  formatThemeName,
} from 'shadcn-theme-menu'
import { useTheme } from 'next-themes'
import { Check, Palette, Terminal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SectionCards } from '@/components/section-cards'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { DataTable } from '@/components/data-table'
import { radixDropdownPrimitives } from '@/components/radix-dropdown-primitives'
import {
  applyColorTheme,
  partitionThemes,
  readStoredTheme,
  readStyledThemes,
} from '@/lib/theme-catalog'
import data from '@/app/dashboard/data.json'

const DEFAULT_THEME = 'minimal'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Demo />
      </TooltipProvider>
    </ThemeProvider>
  )
}

function Demo() {
  const [mounted, setMounted] = useState(false)
  const [colorTheme, setColorTheme] = useState(DEFAULT_THEME)
  const [styledThemes, setStyledThemes] = useState<Set<string>>(() => new Set())
  const [events, setEvents] = useState<DemoEvent[]>([])

  // The package's menus read `localStorage` once, on mount. When this page
  // changes the theme from the outside — a swatch click — the menus have no way
  // to hear about it, so we remount them by bumping this key. Their own callbacks
  // deliberately do *not* bump it: remounting an open menu would close it.
  const [externalChangeKey, setExternalChangeKey] = useState(0)

  const log = useCallback((source: string, detail: string) => {
    setEvents((prev) => [{ id: nextEventId(), source, detail, at: new Date() }, ...prev].slice(0, 8))
  }, [])

  useEffect(() => {
    const stored = readStoredTheme(DEFAULT_THEME)
    setColorTheme(stored)
    applyColorTheme(stored)
    setStyledThemes(readStyledThemes())
    setMounted(true)
  }, [])

  const selectTheme = useCallback(
    (name: string) => {
      setColorTheme(name)
      applyColorTheme(name)
      setExternalChangeKey((n) => n + 1)
      log('swatch', `applyColorTheme("${name}")`)
    },
    [log],
  )

  const { styled, unstyled } = useMemo(() => partitionThemes(styledThemes), [styledThemes])

  // `next-themes` can't know the stored theme during SSR/first paint, so every
  // switcher below renders only once mounted — the same guard a real app needs.
  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Palette className="size-6 text-primary" />
            <span className="text-lg font-bold">shadcn-theme-menu</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle onThemeChange={(mode) => log('ThemeToggle', `onThemeChange("${mode}")`)} />
            <ThemeDropdown
              key={`header-${externalChangeKey}`}
              onColorThemeChange={(theme) => {
                setColorTheme(theme)
                log('ThemeDropdown', `onColorThemeChange("${theme}")`)
              }}
              onModeChange={(mode) => log('ThemeDropdown', `onModeChange("${mode}")`)}
            />
            <CinematicThemeSwitcher />
          </div>
        </div>
      </header>

      <Hero colorTheme={colorTheme} styledCount={styled.length} />

      <ThemeGallery
        themes={styled}
        unstyled={unstyled}
        activeTheme={colorTheme}
        onSelect={selectTheme}
      />

      <TypographySection />

      <ComponentPlayground
        externalChangeKey={externalChangeKey}
        events={events}
        onLog={log}
        onColorThemeChange={setColorTheme}
      />

      <DashboardPreview />

      <Footer colorTheme={colorTheme} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Hero({ colorTheme, styledCount }: { colorTheme: string; styledCount: number }) {
  const { theme, resolvedTheme } = useTheme()

  return (
    <section className="container mx-auto px-4 py-16 text-center">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Theme menus for <span className="text-primary">shadcn/ui</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          {styledCount} color themes in OKLCH, each with its own typeface, layered on top of{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">next-themes</code>{' '}
          light/dark mode. Everything on this page is the real package, imported from source.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <code className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 font-mono text-sm">
            <Terminal className="size-4 shrink-0 text-muted-foreground" />
            pnpm add shadcn-theme-menu
          </code>
        </div>
        <dl className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-4 text-sm">
          <Stat label="Color theme" value={formatThemeName(colorTheme)} />
          <Stat label="Mode" value={theme === 'system' ? `system → ${resolvedTheme}` : String(theme)} />
        </dl>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function ThemeGallery({
  themes,
  unstyled,
  activeTheme,
  onSelect,
}: {
  themes: string[]
  unstyled: string[]
  activeTheme: string
  onSelect: (name: string) => void
}) {
  return (
    <Section
      title="Every theme"
      description="Click a swatch to apply it. The choice is written to the color-theme localStorage key, so it survives a reload."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {themes.map((name) => (
          <ThemeSwatch
            key={name}
            name={name}
            isActive={activeTheme === name}
            onClick={() => onSelect(name)}
          />
        ))}
      </div>

      {unstyled.length > 0 && (
        <details className="mt-8 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            {unstyled.length} more themes are listed by the menus but have no stylesheet
          </summary>
          <p className="mt-3 text-muted-foreground">
            These names are exported in <code className="font-mono">themeNames</code>, so the
            package's own menus offer them — but no matching{' '}
            <code className="font-mono">.theme-*</code> rule ships in{' '}
            <code className="font-mono">themes.css</code>, so picking one leaves the page on the
            previous colors. This list is read live from the CSSOM; it empties itself once the rules
            land.
          </p>
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {unstyled.join(', ')}
          </p>
        </details>
      )}
    </Section>
  )
}

function ThemeSwatch({
  name,
  isActive,
  onClick,
}: {
  name: string
  isActive: boolean
  onClick: () => void
}) {
  const colors = themeColors[name]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`group relative flex items-center gap-2.5 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
    >
      <span className="flex shrink-0 items-center -space-x-1.5">
        <span
          className="size-5 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: colors?.primary }}
        />
        <span
          className="size-5 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: colors?.secondary }}
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-card-foreground">
        {formatThemeName(name)}
      </span>
      {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
    </button>
  )
}

/* -------------------------------------------------------------------------- */

function TypographySection() {
  const [families, setFamilies] = useState({ sans: '', serif: '', mono: '' })
  const serifRef = useRef<HTMLParagraphElement>(null)
  const monoRef = useRef<HTMLPreElement>(null)

  // The theme class lives on <html>, and so does the font. Watching the class
  // attribute means this readout also tracks the menus' hover preview, which
  // swaps the theme without any callback firing.
  useEffect(() => {
    const read = () =>
      setFamilies({
        sans: firstFamily(getComputedStyle(document.body).fontFamily),
        serif: serifRef.current ? firstFamily(getComputedStyle(serifRef.current).fontFamily) : '',
        mono: monoRef.current ? firstFamily(getComputedStyle(monoRef.current).fontFamily) : '',
      })

    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Section
      title="A theme is a typeface too"
      description="Each theme declares --font-sans / --font-serif / --font-mono next to its colors. Hover a theme in any menu above and this section re-typesets under the cursor."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <FontCard label="Body — applied globally" family={families.sans} utility="(automatic)">
          <p className="text-lg">
            The quick brown fox jumps over the lazy dog.
          </p>
        </FontCard>

        <FontCard label="Serif — opt in" family={families.serif} utility=".font-theme-serif">
          <p ref={serifRef} className="font-theme-serif text-lg">
            The quick brown fox jumps over the lazy dog.
          </p>
        </FontCard>

        <FontCard label="Mono — opt in" family={families.mono} utility=".font-theme-mono">
          <pre ref={monoRef} className="font-theme-mono text-lg">
            npm i shadcn-theme-menu
          </pre>
        </FontCard>
      </div>
    </Section>
  )
}

function FontCard({
  label,
  family,
  utility,
  children,
}: {
  label: string
  family: string
  utility: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <code className="font-mono text-[11px] text-muted-foreground">{utility}</code>
      </div>
      <div className="text-card-foreground">{children}</div>
      <p className="mt-3 truncate font-mono text-xs text-primary" title={family}>
        {family || '—'}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function ComponentPlayground({
  externalChangeKey,
  events,
  onLog,
  onColorThemeChange,
}: {
  externalChangeKey: number
  events: DemoEvent[]
  onLog: (source: string, detail: string) => void
  onColorThemeChange: (theme: string) => void
}) {
  return (
    <Section
      title="The components"
      description="Every switcher the package exports, wired to the callbacks it accepts. Interact with any of them and watch the log."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <DemoCard
          title="ThemeToggle"
          code={`<ThemeToggle mode="light-dark-system" />`}
          note="Light / dark / system only. Pass mode=&quot;light-dark&quot; to drop the system entry."
        >
          <div className="flex items-center gap-6">
            <Labeled label="light-dark-system">
              <ThemeToggle onThemeChange={(m) => onLog('ThemeToggle', `onThemeChange("${m}")`)} />
            </Labeled>
            <Labeled label="light-dark">
              <ThemeToggle
                mode="light-dark"
                onThemeChange={(m) => onLog('ThemeToggle', `onThemeChange("${m}")`)}
              />
            </Labeled>
          </div>
        </DemoCard>

        <DemoCard
          title="ThemeDropdown"
          code={`<ThemeDropdown Button={Button} DropdownMenu={…} />`}
          note="The right-hand menu is the same component rendered through the demo's own Button and a hand-styled Radix menu."
        >
          <div className="flex items-center gap-6">
            <Labeled label="bundled primitives">
              <ThemeDropdown
                key={`bundled-${externalChangeKey}`}
                onColorThemeChange={(t) => {
                  onColorThemeChange(t)
                  onLog('ThemeDropdown', `onColorThemeChange("${t}")`)
                }}
                onModeChange={(m) => onLog('ThemeDropdown', `onModeChange("${m}")`)}
              />
            </Labeled>
            <Labeled label="injected primitives">
              <ThemeDropdown
                key={`injected-${externalChangeKey}`}
                Button={Button}
                DropdownMenu={radixDropdownPrimitives}
                onColorThemeChange={(t) => {
                  onColorThemeChange(t)
                  onLog('ThemeDropdown (custom)', `onColorThemeChange("${t}")`)
                }}
                onModeChange={(m) => onLog('ThemeDropdown (custom)', `onModeChange("${m}")`)}
              />
            </Labeled>
          </div>
        </DemoCard>

        <DemoCard
          title="CinematicThemeSwitcher"
          code={`<CinematicThemeSwitcher />`}
          note="Animated light/dark toggle with particle effects. Needs framer-motion."
        >
          <CinematicThemeSwitcher />
        </DemoCard>

        <DemoCard
          title="SidebarUserMenu"
          code={`<SidebarUserMenu user={user} onSignOut={…} />`}
          note="Account menu with the full palette nested in a submenu — built for a sidebar footer. It also appears in the dashboard below."
          className="lg:col-span-2"
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-sidebar p-2">
            <SidebarUserMenu
              user={{ name: 'Ada Lovelace', email: 'ada@example.com' }}
              onSignOut={() => onLog('SidebarUserMenu', 'onSignOut()')}
            />
          </div>
        </DemoCard>

        <EventLog events={events} />
      </div>
    </Section>
  )
}

function DemoCard({
  title,
  code,
  note,
  children,
  className = '',
}: {
  title: string
  code: string
  note: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col rounded-lg border border-border bg-card p-5 ${className}`}>
      <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      <code className="mt-1 block truncate font-mono text-xs text-primary" title={code}>
        {code}
      </code>
      <div className="my-5 flex flex-1 items-center gap-4">{children}</div>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

function EventLog({ events }: { events: DemoEvent[] }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-5">
      <h3 className="text-base font-semibold text-card-foreground">Callbacks</h3>
      <code className="mt-1 block font-mono text-xs text-primary">onThemeChange / onModeChange</code>
      <ol className="mt-5 flex-1 space-y-1.5 font-mono text-xs">
        {events.length === 0 && (
          <li className="text-muted-foreground">No events yet — try a switcher.</li>
        )}
        {events.map((event) => (
          <li key={event.id} className="flex gap-2">
            <span className="shrink-0 text-muted-foreground">
              {event.at.toLocaleTimeString([], { hour12: false })}
            </span>
            <span className="min-w-0 truncate">
              <span className="text-primary">{event.source}</span> {event.detail}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function DashboardPreview() {
  return (
    <Section
      title="On a real surface"
      description="The shadcn dashboard block, unmodified apart from the sidebar footer — that's SidebarUserMenu. Switch themes and watch charts, tables and sidebar follow."
    >
      {/*
        The shadcn sidebar is `position: fixed`, which would otherwise pin it to
        the viewport and let it cover the rest of this page. A transform on the
        wrapper makes *this* box the containing block for it, so the whole block
        behaves like an app viewport embedded in the page — hence the svh height,
        which is exactly what the sidebar sizes itself to.
      */}
      <div
        className="relative h-svh overflow-auto rounded-lg border border-border"
        style={{ transform: 'translate(0)' }}
      >
        <SidebarProvider className="!min-h-0">
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <div className="@container/main flex flex-1 flex-col gap-4 py-4">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </Section>
  )
}

function Footer({ colorTheme }: { colorTheme: string }) {
  return (
    <footer className="mt-16 border-t border-border bg-muted/50">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>
          Current theme:{' '}
          <span className="font-semibold text-foreground">{formatThemeName(colorTheme)}</span>{' '}
          <code className="font-mono text-xs">(html.theme-{colorTheme})</code>
        </p>
        <p className="mt-2">
          Source:{' '}
          <code className="font-mono text-xs">packages/shadcn-theme-menu</code>
        </p>
      </div>
    </footer>
  )
}

/* -------------------------------------------------------------------------- */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

interface DemoEvent {
  id: number
  source: string
  detail: string
  at: Date
}

let eventCounter = 0
const nextEventId = () => ++eventCounter

/** `font-family` is a stack; only its head tells you which theme face won. */
function firstFamily(stack: string) {
  return stack.split(',')[0]?.replace(/["']/g, '').trim() ?? ''
}
