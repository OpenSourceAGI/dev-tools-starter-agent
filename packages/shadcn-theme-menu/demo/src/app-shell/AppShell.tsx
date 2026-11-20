/**
 * A bare app shell with shadcn-theme-menu built in — the starting point to copy
 * into a new app, and nothing more: a collapsible sidebar (an off-canvas sheet on
 * phones), a sticky header carrying the theme, mode and font switchers, and an
 * empty content area. The pages exist only to explain how the shell works.
 *
 * Everything theme-related comes from the package; everything layout-related is
 * the stock shadcn `sidebar` block in ../components/ui.
 */
import { useEffect, useState, type ReactNode } from 'react'
import {
  ThemeProvider,
  ThemeToggle,
  ThemeDropdown,
  FontSwitcher,
  RandomThemeButton,
  SidebarUserMenu,
  themeColors,
  formatThemeName,
  fontOptions,
  groupFonts,
  setColorTheme,
  setFont,
  getStoredColorTheme,
  getStoredFont,
  restoreFont,
  primaryFamily,
  getThemeFonts,
  COLOR_THEME_CHANGE_EVENT,
  FONT_CHANGE_EVENT,
  THEME_FONT_ID,
} from 'shadcn-theme-menu'
import {
  BookOpenIcon,
  HomeIcon,
  LayoutTemplateIcon,
  PaletteIcon,
  SmartphoneIcon,
  TypeIcon,
} from 'lucide-react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { readStyledThemes } from '@/lib/theme-catalog'

type PageId = 'home' | 'themes' | 'fonts' | 'mobile'

const pages: { id: PageId; title: string; icon: ReactNode }[] = [
  { id: 'home', title: 'Overview', icon: <HomeIcon /> },
  { id: 'themes', title: 'Themes', icon: <PaletteIcon /> },
  { id: 'fonts', title: 'Fonts', icon: <TypeIcon /> },
  { id: 'mobile', title: 'Mobile', icon: <SmartphoneIcon /> },
]

const pageFromHash = (): PageId => {
  const id = window.location.hash.slice(1)
  return pages.some((p) => p.id === id) ? (id as PageId) : 'home'
}

export default function AppShell() {
  return (
    // `attribute="class"` puts `light` / `dark` on <html>; the color theme is a
    // second class beside it (`theme-nord`). The stylesheet keys off the pair.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Shell />
      </TooltipProvider>
    </ThemeProvider>
  )
}

function Shell() {
  const [page, setPage] = useState<PageId>('home')

  useEffect(() => {
    // The inline script in app-shell.html already put the stored theme class
    // (and font) on <html> before first paint; this moves the font onto <body>
    // too and drops the pre-paint <style>.
    restoreFont()
    setPage(pageFromHash())
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const current = pages.find((p) => p.id === page)!

  return (
    <SidebarProvider>
      <ShellSidebar page={page} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />
          <h1 className="truncate text-base font-medium">{current.title}</h1>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <RandomThemeButton />
            <FontSwitcher />
            <ThemeDropdown />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          {page === 'home' && <OverviewPage />}
          {page === 'themes' && <ThemesPage />}
          {page === 'fonts' && <FontsPage />}
          {page === 'mobile' && <MobilePage />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ShellSidebar({ page }: { page: PageId }) {
  const { isMobile, setOpenMobile } = useSidebar()
  // On a phone the sidebar is a sheet over the page; close it once a link is
  // followed so the user lands on the page they asked for.
  const follow = () => isMobile && setOpenMobile(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="#home" onClick={follow} />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutTemplateIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">App Shell</span>
                <span className="truncate text-xs text-muted-foreground">shadcn-theme-menu</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Guide</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pages.map((p) => (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton
                    tooltip={p.title}
                    isActive={page === p.id}
                    render={<a href={`#${p.id}`} onClick={follow} />}
                  >
                    {p.icon}
                    <span>{p.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Full demo" render={<a href="./" />}>
                  <BookOpenIcon />
                  <span>Full component demo</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* Account menu with Color Theme and Font submenus. */}
        <SidebarUserMenu user={{ name: 'Ada Lovelace', email: 'ada@example.com' }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/* -------------------------------------------------------------------------- */

/** Re-render whenever any switcher on the page changes the theme or font. */
function useThemeState() {
  const read = () => ({
    theme: getStoredColorTheme(),
    font: getStoredFont(),
    // Computed styles: only meaningful once the light/dark class is on <html>,
    // hence read in an effect rather than during the first render.
    themeFont: primaryFamily(getThemeFonts().sans),
  })
  const [state, setState] = useState(() => ({ theme: getStoredColorTheme(), font: getStoredFont(), themeFont: '' }))
  useEffect(() => {
    const sync = () => setState(read())
    // Child effects run before ThemeProvider's, which is what adds light/dark;
    // wait a frame so the theme's variables actually resolve.
    const frame = requestAnimationFrame(sync)
    window.addEventListener(COLOR_THEME_CHANGE_EVENT, sync)
    window.addEventListener(FONT_CHANGE_EVENT, sync)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener(COLOR_THEME_CHANGE_EVENT, sync)
      window.removeEventListener(FONT_CHANGE_EVENT, sync)
    }
  }, [])
  return state
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  )
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em] text-foreground">{children}</code>
)

function OverviewPage() {
  const { theme, font, themeFont } = useThemeState()
  return (
    <>
      <div className="rounded-xl border bg-gradient-to-br from-primary/15 via-card to-card p-5 sm:p-8">
        <p className="text-sm text-muted-foreground">Active theme</p>
        <p className="mt-1 text-2xl font-bold sm:text-3xl">{formatThemeName(theme)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Font: {font === THEME_FONT_ID ? `theme default (${themeFont || 'inherited from the app'})` : font}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['primary', 'secondary', 'accent', 'muted', 'destructive'].map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            >
              <span className="size-3 rounded-full border" style={{ background: `var(--${token})` }} />
              --{token}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="1 · A theme is a class on <html>">
          <p>
            Picking a color theme swaps one class: <Code>{'<html class="theme-nord dark">'}</Code>. The
            stylesheet defines every shadcn token for each pair, e.g. <Code>.theme-nord.dark</Code>.
          </p>
        </Card>
        <Card title="2 · Mode is independent">
          <p>
            <Code>next-themes</Code> owns <Code>light</Code> / <Code>dark</Code> /
            system. The color theme sits beside it, so any palette works in either mode.
          </p>
        </Card>
        <Card title="3 · Components read tokens">
          <p>
            shadcn components only use <Code>bg-background</Code>, <Code>text-primary</Code> and friends.
            Tailwind maps those to <Code>var(--background)</Code>, so nothing re-renders — the CSS
            cascade does the switching.
          </p>
        </Card>
        <Card title="4 · Remembered">
          <p>
            The choice is saved to <Code>localStorage["color-theme"]</Code> and a cookie of the same
            name; the font to <Code>font-family</Code>. A server can read the cookies to render the
            right class on the first response.
          </p>
        </Card>
        <Card title="5 · No flash on reload">
          <p>
            This page inlines <Code>themeInitScript()</Code> in its <Code>{'<head>'}</Code>, so the
            stored theme and font are applied before the first paint, before React loads.
          </p>
        </Card>
        <Card title="6 · Switchers stay in sync">
          <p>
            Every switcher announces changes with a window event. Change the theme from the header,
            and the sidebar menu's checkmark follows.
          </p>
        </Card>
      </div>
    </>
  )
}

function ThemesPage() {
  const { theme } = useThemeState()
  const [styled, setStyled] = useState<Set<string>>(() => new Set())
  useEffect(() => setStyled(readStyledThemes()), [])
  const names = Object.keys(themeColors).filter((name) => styled.size === 0 || styled.has(name))

  return (
    <>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Tap a theme to apply it with <Code>setColorTheme(name)</Code>. On desktop, hovering one in the
        header palette menu previews it across the whole shell.
      </p>
      <p className="max-w-2xl text-sm text-muted-foreground">
        The dice in the header picks a random theme (<Code>randomizeColorTheme()</Code>); its arrow sets
        when to do it automatically — every visit, session, hour, day or week. The setting lives in{' '}
        <Code>localStorage["color-theme-randomize"]</Code>, and the inline init script applies a due
        pick before the first paint.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {names.map((name) => {
          const colors = themeColors[name]
          const active = name === theme
          return (
            <button
              key={name}
              type="button"
              onClick={() => setColorTheme(name)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors hover:bg-accent ${
                active ? 'border-primary ring-2 ring-primary/40' : ''
              }`}
            >
              <span className="flex shrink-0 -space-x-1">
                <span className="size-4 rounded-full border" style={{ background: colors.primary }} />
                <span className="size-4 rounded-full border" style={{ background: colors.secondary }} />
              </span>
              <span className="truncate">{formatThemeName(name)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function FontsPage() {
  const { font } = useThemeState()
  return (
    <>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Each theme brings a sans, serif and mono face. A user font overrides the sans face for the
        whole page with <Code>setFont(id)</Code>; Google families are fetched the first time they are
        used. "Theme default" hands typography back to the theme.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Sans (body)">
          <p className="text-base text-foreground">The quick brown fox jumps over the lazy dog.</p>
        </Card>
        <Card title="Serif · .font-theme-serif">
          <p className="font-theme-serif text-base text-foreground">The quick brown fox jumps over the lazy dog.</p>
        </Card>
        <Card title="Mono · .font-theme-mono">
          <p className="font-theme-mono text-base text-foreground">const fox = jump(dog)</p>
        </Card>
      </div>
      <div className="space-y-4">
        <FontChip id={THEME_FONT_ID} label="Theme default" active={font === THEME_FONT_ID} />
        {groupFonts(fontOptions).map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</h3>
            <div className="flex flex-wrap gap-2">
              {group.fonts.map((option) => (
                <FontChip
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  stack={option.stack}
                  active={font === option.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function FontChip({ id, label, stack, active }: { id: string; label: string; stack?: string; active: boolean }) {
  return (
    <button
      type="button"
      onClick={() => setFont(id)}
      aria-pressed={active}
      style={stack ? { fontFamily: stack } : undefined}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
        active ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : ''
      }`}
    >
      {label}
    </button>
  )
}

function MobilePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Below 768px the sidebar becomes a sheet">
        <p>
          <Code>SidebarProvider</Code> watches <Code>(max-width: 767px)</Code>. On a phone the sidebar
          renders as an off-canvas sheet opened by the header button, and closes itself when you pick
          a page.
        </p>
      </Card>
      <Card title="Desktop: collapse to icons">
        <p>
          With <Code>collapsible="icon"</Code> the sidebar folds to a 3rem rail on larger screens —
          use the header button, the rail on its edge, or <Code>Ctrl/⌘ + B</Code>. Tooltips label the
          icons while collapsed.
        </p>
      </Card>
      <Card title="Touch has no hover">
        <p>
          Hover previews in the theme and font menus are a desktop nicety. On touch a tap commits the
          choice straight away, and fonts start downloading on pointer-down so the face is on its way
          before the menu closes.
        </p>
      </Card>
      <Card title="The header stays put">
        <p>
          The header is <Code>sticky</Code> with a translucent, blurred background, keeps its three
          switchers at icon size, and truncates the page title instead of wrapping.
        </p>
      </Card>
    </div>
  )
}
