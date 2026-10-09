"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Palette, Monitor } from "lucide-react"
import { Button } from "./components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu"
import { useTheme } from "next-themes"

export const themeNames = [
  // Base themes
  "dark",
  "light",
  "midnight",
  "ocean",
  "forest",
  "sunset",
  "rose",
  "amber",
  "violet",
  "slate",
  "emerald",
  "sky",
  "crimson",
  // App/Brand themes
  "vscode",
  "slack",
  "x",
  "githubdark",
  "githublight",
  "discord",
  "notion",
  "linear",
  "spotify",
  "dracula",
  "nord",
  "solarized",
  "monokai",
  "jiradark",
  "trellodark",
  "youtubedark",
  "googledark",
  "whatsappdark",
  // Designer themes
  "minimal",
  "luxury",
  "cyberpunk",
  "twitter",
  "mocha",
  "bubblegum",
  "amethyst",
  "lemonade",
  "notebook",
  "doom64",
  "catppuccin",
  "graphite",
  "perpetuity",
  "kodama",
  "cosmic",
  "tangerine",
  "quantum",
  "nature",
  "boldtech",
  "ambermin",
  "supabase",
  "brutalism",
  "solardusk",
  "claymorphism",
  "pastel",
  "cleanslate",
  "caffeine",
  "breeze",
  "retro",
  "bloom",
  "candyland",
  "aurora",
  "vintage",
  "horizon",
  "starry",
  "claude",
  "vercel",
  "mono",
];

export const themeDisplayNames: Record<string, string> = {
  // Base themes
  "dark": "Dark",
  "light": "Light",
  "midnight": "Midnight",
  "ocean": "Ocean",
  "forest": "Forest",
  "sunset": "Sunset",
  "rose": "Rose",
  "amber": "Amber",
  "violet": "Violet",
  "slate": "Slate",
  "emerald": "Emerald",
  "sky": "Sky",
  "crimson": "Crimson",
  // App/Brand themes
  "vscode": "VS Code",
  "slack": "Slack",
  "x": "X",
  "githubdark": "Github Dark",
  "githublight": "Github Light",
  "discord": "Discord",
  "notion": "Notion",
  "linear": "Linear",
  "spotify": "Spotify",
  "dracula": "Dracula",
  "nord": "Nord",
  "solarized": "Solarized",
  "monokai": "Monokai",
  "jiradark": "Jira Dark",
  "trellodark": "Trello Dark",
  "youtubedark": "YouTube Dark",
  "googledark": "Google Dark",
  "whatsappdark": "WhatsApp Dark",
  // Designer themes
  "minimal": "Minimal",
  "luxury": "Luxury",
  "cyberpunk": "Cyberpunk",
  "twitter": "Twitter",
  "mocha": "Mocha",
  "bubblegum": "Bubblegum",
  "amethyst": "Amethyst",
  "lemonade": "Lemonade",
  "notebook": "Notebook",
  "doom64": "Doom 64",
  "catppuccin": "Catppuccin",
  "graphite": "Graphite",
  "perpetuity": "Perpetuity",
  "kodama": "Kodama",
  "cosmic": "Cosmic",
  "tangerine": "Tangerine",
  "quantum": "Quantum",
  "nature": "Nature",
  "boldtech": "Bold Tech",
  "ambermin": "Amber Min",
  "supabase": "Supabase",
  "brutalism": "Brutalism",
  "solardusk": "Solar Dusk",
  "claymorphism": "Claymorphism",
  "pastel": "Pastel",
  "cleanslate": "Clean Slate",
  "caffeine": "Caffeine",
  "breeze": "Breeze",
  "retro": "Retro",
  "bloom": "Bloom",
  "candyland": "Candyland",
  "aurora": "Aurora",
  "vintage": "Vintage",
  "horizon": "Horizon",
  "starry": "Starry",
  "claude": "Claude",
  "vercel": "Vercel",
  "mono": "Mono",
};

export const themeColors: Record<string, { primary: string; secondary: string }> = {
  // Base themes
  "dark": { primary: "#7c6fe0", secondary: "#404040" },
  "light": { primary: "#7c6fe0", secondary: "#ebebeb" },
  "midnight": { primary: "#6b5fc5", secondary: "#252530" },
  "ocean": { primary: "#3a9dc4", secondary: "#253040" },
  "forest": { primary: "#2ea060", secondary: "#25342c" },
  "sunset": { primary: "#d06535", secondary: "#382e25" },
  "rose": { primary: "#c04868", secondary: "#33202c" },
  "amber": { primary: "#d28a30", secondary: "#332a1e" },
  "violet": { primary: "#8460dc", secondary: "#25203e" },
  "slate": { primary: "#65788a", secondary: "#2e3238" },
  "emerald": { primary: "#35b87a", secondary: "#283d33" },
  "sky": { primary: "#3d8fca", secondary: "#2b3540" },
  "crimson": { primary: "#c23c3c", secondary: "#321f1f" },
  // App/Brand themes
  "vscode": { primary: "#4b75b0", secondary: "#2d3035" },
  "slack": { primary: "#4268a5", secondary: "#36263e" },
  "x": { primary: "#3d8dc2", secondary: "#2a2a2a" },
  "githubdark": { primary: "#4d8ab8", secondary: "#2d3035" },
  "githublight": { primary: "#2e60a0", secondary: "#f0f0f0" },
  "discord": { primary: "#6958c8", secondary: "#38404c" },
  "notion": { primary: "#4575b0", secondary: "#ece8de" },
  "linear": { primary: "#6258b8", secondary: "#2d2d38" },
  "spotify": { primary: "#1db954", secondary: "#303030" },
  "dracula": { primary: "#9575e0", secondary: "#3c3a4e" },
  "nord": { primary: "#7898b8", secondary: "#3c4550" },
  "solarized": { primary: "#357ea8", secondary: "#e6e2ce" },
  "monokai": { primary: "#a6e22e", secondary: "#3b3b32" },
  "jiradark": { primary: "#3868c8", secondary: "#252c38" },
  "trellodark": { primary: "#4575a0", secondary: "#35404a" },
  "youtubedark": { primary: "#c52818", secondary: "#2d3035" },
  "googledark": { primary: "#4568c8", secondary: "#2a2a2a" },
  "whatsappdark": { primary: "#25d366", secondary: "#2b3a38" },
  // Designer themes
  "minimal": { primary: "#3b82f6", secondary: "#f3f4f6" },
  "luxury": { primary: "#9b2c2c", secondary: "#fdf2d6" },
  "cyberpunk": { primary: "#ff00c8", secondary: "#f0f0ff" },
  "twitter": { primary: "#1e9df1", secondary: "#0f1419" },
  "mocha": { primary: "#A37764", secondary: "#BAAB92" },
  "bubblegum": { primary: "#d04f99", secondary: "#8acfd1" },
  "amethyst": { primary: "#8a79ab", secondary: "#dfd9ec" },
  "lemonade": { primary: "#a84370", secondary: "#f1c4e6" },
  "notebook": { primary: "#606060", secondary: "#dedede" },
  "doom64": { primary: "#b71c1c", secondary: "#556b2f" },
  "catppuccin": { primary: "#8839ef", secondary: "#ccd0da" },
  "graphite": { primary: "#606060", secondary: "#e0e0e0" },
  "perpetuity": { primary: "#06858e", secondary: "#d9eaea" },
  "kodama": { primary: "#8d9d4f", secondary: "#decea0" },
  "cosmic": { primary: "#6e56cf", secondary: "#e4dfff" },
  "tangerine": { primary: "#e05d38", secondary: "#f3f4f6" },
  "quantum": { primary: "#e6067a", secondary: "#ffd6ff" },
  "nature": { primary: "#2e7d32", secondary: "#e8f5e9" },
  "boldtech": { primary: "#8b5cf6", secondary: "#f3f0ff" },
  "ambermin": { primary: "#f59e0b", secondary: "#f3f4f6" },
  "supabase": { primary: "#72e3ad", secondary: "#fdfdfd" },
  "brutalism": { primary: "#ff3333", secondary: "#ffff00" },
  "solardusk": { primary: "#B45309", secondary: "#E4C090" },
  "claymorphism": { primary: "#6366f1", secondary: "#d6d3d1" },
  "pastel": { primary: "#a78bfa", secondary: "#e9d8fd" },
  "cleanslate": { primary: "#6366f1", secondary: "#e5e7eb" },
  "caffeine": { primary: "#644a40", secondary: "#ffdfb5" },
  "breeze": { primary: "#22c55e", secondary: "#e0f2fe" },
  "retro": { primary: "#d33682", secondary: "#2aa198" },
  "bloom": { primary: "#6c5ce7", secondary: "#a1c9f2" },
  "candyland": { primary: "#ffc0cb", secondary: "#87ceeb" },
  "aurora": { primary: "#34a85a", secondary: "#6495ed" },
  "vintage": { primary: "#a67c52", secondary: "#e2d8c3" },
  "horizon": { primary: "#ff7e5f", secondary: "#feb47b" },
  "starry": { primary: "#3a5ba0", secondary: "#f7c873" },
  "claude": { primary: "#c96442", secondary: "#e9e6dc" },
  "vercel": { primary: "#000000", secondary: "#f5f5f5" },
  "mono": { primary: "#737373", secondary: "#f5f5f5" },
};

export const formatThemeName = (name: string) => {
  return themeDisplayNames[name] ?? name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}


interface ThemeDropdownProps {
  Button?: React.ComponentType<any>
  DropdownMenu?: any
  iconSrc?: string
  onColorThemeChange?: (theme: string) => void
  onModeChange?: (mode: string) => void
}

export function ThemeDropdown({
  Button: CustomButton,
  DropdownMenu: CustomDropdownMenu,
  iconSrc,
  onColorThemeChange,
  onModeChange
}: ThemeDropdownProps = {}) {
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState("minimal")
  const [mounted, setMounted] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  const ButtonComp = CustomButton || Button
  const MenuComp = CustomDropdownMenu || {
    Root: DropdownMenu,
    Trigger: DropdownMenuTrigger,
    Content: DropdownMenuContent,
    Item: DropdownMenuItem,
    Label: DropdownMenuLabel,
    Separator: DropdownMenuSeparator
  }

  useEffect(() => {
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
    onColorThemeChange?.(newTheme)
  }

  const handleModeChange = (mode: string) => {
    setTheme(mode)
    onModeChange?.(mode)
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

  if (!mounted) {
    return null
  }

  const Root = MenuComp.Root || MenuComp
  const Trigger = MenuComp.Trigger || DropdownMenuTrigger
  const Content = MenuComp.Content || DropdownMenuContent
  const Item = MenuComp.Item || DropdownMenuItem
  const Label = MenuComp.Label || DropdownMenuLabel
  const Separator = MenuComp.Separator || DropdownMenuSeparator

  return (
    <Root onOpenChange={(open: boolean) => !open && handlePreviewEnd()}>
      <Trigger asChild>
        <ButtonComp variant="ghost" size="icon" className="relative">
          {iconSrc ? (
            <img src={iconSrc} alt="Themes" width={32} height={32} />
          ) : (
            <Palette className="h-5 w-5" />
          )}
        </ButtonComp>
      </Trigger>
      <Content align="end" className="w-56 max-h-[400px] overflow-y-auto">
        <Label>Appearance</Label>
        <Separator />
        <Item onClick={() => handleModeChange("light")} className="cursor-pointer py-1 h-7">
          <Sun className="mr-2 h-3.5 w-3.5" />
          <span className="text-sm">Light</span>
          {theme === "light" && <span className="ml-auto text-xs">✓</span>}
        </Item>
        <Item onClick={() => handleModeChange("dark")} className="cursor-pointer py-1 h-7">
          <Moon className="mr-2 h-3.5 w-3.5" />
          <span className="text-sm">Dark</span>
          {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
        </Item>
        <Item onClick={() => handleModeChange("system")} className="cursor-pointer py-1 h-7">
          <Monitor className="mr-2 h-3.5 w-3.5" />
          <span className="text-sm">System</span>
          {theme === "system" && <span className="ml-auto text-xs">✓</span>}
        </Item>
        <Separator />
        <Label>Color Theme</Label>
        <div className="text-xs text-muted-foreground px-2 py-1.5">
          Current: {formatThemeName(colorTheme)}
        </div>
        <Separator />
        {themeNames.map((themeName) => {
          const colors = themeColors[themeName];
          return (
            <Item
              key={themeName}
              onClick={() => handleThemeChange(themeName)}
              onMouseEnter={() => handleThemePreview(themeName)}
              onMouseLeave={handlePreviewEnd}
              className={`cursor-pointer ${colorTheme === themeName ? "bg-accent" : ""
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {colors && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: colors.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: colors.secondary }}
                      />
                    </div>
                  )}
                  <span>{formatThemeName(themeName)}</span>
                </div>
                {colorTheme === themeName && (
                  <span className="text-xs">✓</span>
                )}
              </div>
            </Item>
          );
        })}
      </Content>
    </Root>
  )
}
