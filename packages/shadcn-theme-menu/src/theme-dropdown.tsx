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
import { themeNames, themeColors, formatThemeName } from "./themes"
import { RandomizeMenuItems, useRandomizeTheme } from "./random-theme-button"
import { COLOR_THEME_CHANGE_EVENT, setColorTheme as persistColorTheme } from "./color-theme"

export { themeNames, themeDisplayNames, themeColors, formatThemeName } from "./themes"

interface ThemeDropdownProps {
  Button?: React.ComponentType<any>
  DropdownMenu?: any
  iconSrc?: string
  onColorThemeChange?: (theme: string) => void
  onModeChange?: (mode: string) => void
  /** Hide the "Randomize theme" button and auto-randomize settings at the top. */
  hideRandomize?: boolean
}

export function ThemeDropdown({
  Button: CustomButton,
  DropdownMenu: CustomDropdownMenu,
  iconSrc,
  onColorThemeChange,
  onModeChange,
  hideRandomize = false,
}: ThemeDropdownProps = {}) {
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState("minimal")
  const [mounted, setMounted] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)
  const randomizer = useRandomizeTheme(onColorThemeChange)

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
    // Follow theme changes made by any other switcher on the page (they all
    // announce themselves through `setColorTheme` in ./color-theme).
    const onChange = (event: Event) => setColorTheme((event as CustomEvent<string>).detail)
    window.addEventListener(COLOR_THEME_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(COLOR_THEME_CHANGE_EVENT, onChange)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    // Swap the class, persist to localStorage + cookie, announce the change.
    persistColorTheme(newTheme)

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
        {!hideRandomize && (
          <>
            <RandomizeMenuItems
              mode={randomizer.mode}
              onRandomize={() => randomizer.randomize()}
              onModeChange={randomizer.setMode}
              Item={Item}
              Label={Label}
              Separator={Separator}
            />
            <Separator />
          </>
        )}
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
