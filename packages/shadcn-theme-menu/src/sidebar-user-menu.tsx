"use client"

import * as React from "react"
import {
  ChevronUp,
  User2,
  LogOut,
  CreditCard,
  Bell,
  Palette,
  Type
} from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./components/ui/sidebar"
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
} from "./components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar"
import CinematicThemeSwitcher from "./cinematic-theme-switcher"
import { themeNames, themeColors, formatThemeName } from "./themes"
import { applyColorTheme, COLOR_THEME_CHANGE_EVENT, getStoredColorTheme, setColorTheme as persistColorTheme } from "./color-theme"
import { FontMenuItems, useFontSwitcher } from "./font-switcher"
import { RandomizeMenuItems, useRandomizeTheme } from "./random-theme-button"
import { fontOptions, type FontOption } from "./fonts"

interface SettingsDialogProps {
  trigger: React.ReactNode;
}

function SettingsDialog({ trigger }: SettingsDialogProps) {
  return <>{trigger}</>;
}

interface SidebarUserMenuProps {
  user?: { name?: string | null; email?: string | null; image?: string | null }
  onSignOut?: () => void | Promise<void>
  /** Called after a color theme is chosen (not on hover previews). */
  onColorThemeChange?: (theme: string) => void
  /** Called after a font is chosen; `"theme"` means the override was cleared. */
  onFontChange?: (fontId: string) => void
  /** Fonts offered in the "Font" submenu. Defaults to `fontOptions`; keep it stable. */
  fonts?: FontOption[]
  /** Hide the "Font" submenu. */
  hideFontMenu?: boolean
  /** Hide "Randomize theme" and the auto-randomize settings in the Color Theme submenu. */
  hideRandomize?: boolean
}

export function SidebarUserMenu({
  user: userProp,
  onSignOut,
  onColorThemeChange,
  onFontChange,
  fonts = fontOptions,
  hideFontMenu = false,
  hideRandomize = false,
}: SidebarUserMenuProps = {}) {
  const user = userProp || { name: "Guest User", email: "guest@example.com", image: null }
  const [colorTheme, setColorTheme] = React.useState("minimal")
  const [mounted, setMounted] = React.useState(false)
  const [previewTheme, setPreviewTheme] = React.useState<string | null>(null)
  const fontMenu = useFontSwitcher(fonts, onFontChange)
  const randomizer = useRandomizeTheme(onColorThemeChange)

  React.useEffect(() => {
    setMounted(true)
    setColorTheme(getStoredColorTheme("minimal"))
    // Follow theme changes made by any other switcher on the page.
    const onChange = (event: Event) => setColorTheme((event as CustomEvent<string>).detail)
    window.addEventListener(COLOR_THEME_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(COLOR_THEME_CHANGE_EVENT, onChange)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    persistColorTheme(newTheme)
    setPreviewTheme(null)
    onColorThemeChange?.(newTheme)
  }

  const handleThemePreview = (themeName: string) => {
    setPreviewTheme(themeName)
    applyColorTheme(themeName)
  }

  const handlePreviewEnd = () => {
    if (previewTheme) {
      applyColorTheme(colorTheme)
      setPreviewTheme(null)
    }
  }

  const userInitials = user.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2) || "GU"

  // The stored color theme is only readable on the client, so — like every other
  // switcher in this package — hold the menu back until after mount rather than
  // render a checkmark the server could not have known about.
  if (!mounted) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={(open) => {
          if (!open) {
            handlePreviewEnd()
            fontMenu.endPreview()
          }
        }}>
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
                  Profile
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="mr-2 h-4 w-4" />
                <span>Color Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="max-h-[400px] overflow-y-auto">
                  {!hideRandomize && (
                    <>
                      <RandomizeMenuItems
                        mode={randomizer.mode}
                        onRandomize={() => randomizer.randomize()}
                        onModeChange={randomizer.setMode}
                      />
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <div className="px-2 py-1.5 flex items-center justify-center">
                    <CinematicThemeSwitcher />
                  </div>
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
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            {!hideFontMenu && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Type className="mr-2 h-4 w-4" />
                  <span>Font</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-60 max-h-[400px] overflow-y-auto">
                    <FontMenuItems
                      options={fonts}
                      font={fontMenu.font}
                      onSelect={fontMenu.choose}
                      onPreview={fontMenu.preview}
                      onPreviewEnd={fontMenu.endPreview}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
              await onSignOut?.()
            }}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
