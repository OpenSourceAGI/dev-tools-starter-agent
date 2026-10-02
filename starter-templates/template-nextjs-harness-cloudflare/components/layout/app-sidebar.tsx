"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  Target,
  Copy,
  Shield,
  Settings,
  HelpCircle,
  ChevronUp,
  User2,
  LogOut,
  Sparkles,
  CreditCard,
  Search,
  Bell,
  BarChart3,
  Palette,
  Moon,
  Sun
} from 'lucide-react'
import { useSession, signOut } from "@/lib/auth-client"
import { useTheme } from "next-themes"
import { APP_NAME } from "@/lib/constants"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Theme names
const themeNames = [
  "modern-minimal",
  "twitter",
  "mocha-mousse",
  "bubblegum",
  "amethyst-haze",
  "notebook",
  "doom-64",
  "catppuccin",
  "graphite",
  "perpetuity",
  "kodama-grove",
  "cosmic-night",
  "tangerine",
  "quantum-rose",
  "nature",
  "bold-tech",
  "elegant-luxury",
  "amber-minimal",
  "supabase",
  "neo-brutalism",
  "solar-dusk",
  "claymorphism",
  "cyberpunk",
  "pink-lemonade",
  "pastel-dreams"
]

const themeColors: Record<string, { primary: string; secondary: string }> = {
  "modern-minimal": { primary: "#3b82f6", secondary: "#f3f4f6" },
  "pink-lemonade": { primary: "#a84370", secondary: "#f1c4e6" },
  "twitter": { primary: "#1e9df1", secondary: "#0f1419" },
  "mocha-mousse": { primary: "#A37764", secondary: "#BAAB92" },
  "bubblegum": { primary: "#d04f99", secondary: "#8acfd1" },
  "amethyst-haze": { primary: "#8a79ab", secondary: "#dfd9ec" },
  "notebook": { primary: "#606060", secondary: "#dedede" },
  "doom-64": { primary: "#b71c1c", secondary: "#556b2f" },
  "catppuccin": { primary: "#8839ef", secondary: "#ccd0da" },
  "graphite": { primary: "#606060", secondary: "#e0e0e0" },
  "perpetuity": { primary: "#06858e", secondary: "#d9eaea" },
  "kodama-grove": { primary: "#8d9d4f", secondary: "#decea0" },
  "cosmic-night": { primary: "#6e56cf", secondary: "#e4dfff" },
  "tangerine": { primary: "#e05d38", secondary: "#f3f4f6" },
  "quantum-rose": { primary: "#e6067a", secondary: "#ffd6ff" },
  "nature": { primary: "#2e7d32", secondary: "#e8f5e9" },
  "bold-tech": { primary: "#8b5cf6", secondary: "#f3f0ff" },
  "elegant-luxury": { primary: "#9b2c2c", secondary: "#fdf2d6" },
  "amber-minimal": { primary: "#f59e0b", secondary: "#f3f4f6" },
  "supabase": { primary: "#72e3ad", secondary: "#fdfdfd" },
  "neo-brutalism": { primary: "#ff3333", secondary: "#ffff00" },
  "solar-dusk": { primary: "#B45309", secondary: "#E4C090" },
  "claymorphism": { primary: "#6366f1", secondary: "#d6d3d1" },
  "cyberpunk": { primary: "#ff00c8", secondary: "#f0f0ff" },
  "pastel-dreams": { primary: "#a78bfa", secondary: "#e9d8fd" }
}

const formatThemeName = (name: string) => {
  return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

// Helper component for Search
function SidebarSearch() {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<{ symbol: string, name: string }[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { state, toggleSidebar } = useSidebar()

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])


  if (state === "collapsed") {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-2" onClick={() => toggleSidebar()}>
        <Search className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div ref={wrapperRef} className="relative w-full px-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search..."
          className="pl-8 h-8 bg-sidebar-accent/50 border-sidebar-border"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-2 right-2 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-60 overflow-y-auto">
          {results.map((item) => (
            <div
              key={item.symbol}
              className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
            >

              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="font-bold text-xs">{item.symbol}</span>
                <span className="text-muted-foreground truncate max-w-[100px] text-xs ml-1">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Navigation Configuration
const navigationGroups = [
  {
    title: "Market",
    items: [
      { name: "Analyze Strategy", tab: "strategies", icon: Zap },
      { name: "Market Scanner", tab: "scanner", icon: BarChart3 },
    ],
  },
  {
    title: "Risk & Portfolio",
    items: [
      { name: "Overview", tab: "overview", icon: LayoutDashboard },
      { name: "Risk Management", tab: "risk", icon: Shield },
    ],
  },
]

function AppSidebarContent({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'overview'
  const { data: session } = useSession()
  const user = session?.user || { name: "Guest User", email: "guest@example.com", image: null }
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = React.useState("modern-minimal")
  const [mounted, setMounted] = React.useState(false)
  const [previewTheme, setPreviewTheme] = React.useState<string | null>(null)

  React.useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("color-theme")
    if (saved && themeNames.includes(saved)) {
      setColorTheme(saved)
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    localStorage.setItem("color-theme", newTheme)
    document.cookie = `color-theme=${newTheme}; path=/; max-age=31536000`

    // Remove all theme classes
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    // Add new theme class
    document.documentElement.classList.add(`theme-${newTheme}`)

    setPreviewTheme(null)
  }

  const handleThemePreview = (themeName: string) => {
    setPreviewTheme(themeName)
    // Remove all theme classes
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    // Add preview theme class
    document.documentElement.classList.add(`theme-${themeName}`)
  }

  const handlePreviewEnd = () => {
    if (previewTheme) {
      // Restore the actual selected theme
      themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
      document.documentElement.classList.add(`theme-${colorTheme}`)
      setPreviewTheme(null)
    }
  }

  const toggleLightDark = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Helper to determine active state
  const isActive = (tab?: string, href?: string) => {
    if (href) return pathname === href
    if (tab) return pathname === '/dashboard' && currentTab === tab
    return false
  }

  const userInitials = user.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2) || "GU"

  // Determine logo link based on current page
  const logoHref = pathname.startsWith('/docs') ? '/dashboard' : '/'

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={logoHref}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <Image
                    src="/apple-touch-icon.png"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="size-4 object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">{APP_NAME}</span>
                  {/* <span className="truncate text-xs">v1.0.0</span> */}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSearch />
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.tab)}
                      tooltip={item.name}
                    >
                      <Link href={`/dashboard?tab=${item.tab}`}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SettingsDialog
                  trigger={
                    <SidebarMenuButton tooltip="Settings">
                      <Settings />
                      <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/docs'}
                  tooltip="Documentation"
                >
                  <Link href="/docs">
                    <HelpCircle />
                    <span className="group-data-[collapsible=icon]:hidden">Documentation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu onOpenChange={(open) => !open && handlePreviewEnd()}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{user.name || "Guest"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  {/* <div className="relative group-data-[collapsible=icon]:hidden">
                    <Bell className="h-4 w-4 ml-auto text-muted-foreground" />
                     <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border border-sidebar-accent" />
                  </div> */}
                  <ChevronUp className="ml-2 size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name || "Guest"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <SettingsDialog
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <User2 className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade
                </DropdownMenuItem>
                {/* <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="max-h-[400px] overflow-y-auto">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        toggleLightDark()
                      }}>
                        {theme === "dark" ? (
                          <Sun className="mr-2 h-4 w-4" />
                        ) : (
                          <Moon className="mr-2 h-4 w-4" />
                        )}
                        Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {themeNames.map((themeName) => {
                        const colors = themeColors[themeName];
                        return (
                          <DropdownMenuItem
                            key={themeName}
                            onClick={() => handleThemeChange(themeName)}
                            onMouseEnter={() => handleThemePreview(themeName)}
                            onMouseLeave={handlePreviewEnd}
                            className={colorTheme === themeName ? "bg-accent" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-3 h-3 rounded-full border border-black/10"
                                    style={{ backgroundColor: colors.primary }}
                                  />
                                  <div
                                    className="w-3 h-3 rounded-full border border-black/10"
                                    style={{ backgroundColor: colors.secondary }}
                                  />
                                </div>
                                <span>{formatThemeName(themeName)}</span>
                              </div>
                              {colorTheme === themeName && (
                                <span className="text-xs">✓</span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  await signOut()
                  router.push("/")
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Suspense fallback={<Sidebar collapsible="icon" {...props} />}>
      <AppSidebarContent {...props} />
    </Suspense>
  )
}
