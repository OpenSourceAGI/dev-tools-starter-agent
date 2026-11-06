"use client"

import * as React from "react"
import { Type } from "lucide-react"
import { Button } from "./components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu"
import {
  applyFont,
  FONT_CHANGE_EVENT,
  type FontCategory,
  type FontOption,
  fontOptions,
  getStoredFont,
  getThemeFonts,
  loadFont,
  primaryFamily,
  setFont,
  THEME_FONT_ID,
} from "./fonts"

const categoryLabels: Record<FontCategory, string> = {
  sans: "Sans serif",
  serif: "Serif",
  mono: "Monospace",
  display: "Display",
}

const categoryOrder: FontCategory[] = ["sans", "serif", "mono", "display"]

/**
 * Shared state for every font picker: the chosen id, a hover preview that
 * reverts, and a subscription to `FONT_CHANGE_EVENT` so two pickers on one page
 * (say, a header `FontSwitcher` and the `SidebarUserMenu` submenu) stay in sync.
 */
export function useFontSwitcher(options: FontOption[] = fontOptions, onFontChange?: (id: string) => void) {
  const [font, setFontState] = React.useState(THEME_FONT_ID)
  const [mounted, setMounted] = React.useState(false)
  const previewing = React.useRef(false)
  const current = React.useRef(font)
  current.current = font

  React.useEffect(() => {
    const stored = getStoredFont()
    setFontState(stored)
    applyFont(stored, options)
    setMounted(true)
    const onChange = (event: Event) => setFontState((event as CustomEvent<string>).detail)
    window.addEventListener(FONT_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(FONT_CHANGE_EVENT, onChange)
    // `options` is expected to be a stable module-level list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = React.useCallback(
    (id: string) => {
      previewing.current = false
      setFontState(id)
      setFont(id, options)
      onFontChange?.(id)
    },
    [options, onFontChange],
  )

  const preview = React.useCallback(
    (id: string) => {
      previewing.current = true
      applyFont(id, options)
    },
    [options],
  )

  const endPreview = React.useCallback(() => {
    if (!previewing.current) return
    previewing.current = false
    applyFont(current.current, options)
  }, [options])

  return { font, mounted, choose, preview, endPreview }
}

/** Group options by category, in menu order. */
export function groupFonts(options: FontOption[] = fontOptions) {
  return categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category],
      fonts: options.filter((o) => o.category === category && o.id !== THEME_FONT_ID),
    }))
    .filter((group) => group.fonts.length > 0)
}

interface FontMenuItemsProps {
  options: FontOption[]
  font: string
  onSelect: (id: string) => void
  onPreview: (id: string) => void
  onPreviewEnd: () => void
  Item?: React.ComponentType<any>
  Label?: React.ComponentType<any>
  Separator?: React.ComponentType<any>
}

/**
 * The list of fonts as dropdown items — rendered by `FontSwitcher` and inside
 * the `SidebarUserMenu` "Font" submenu. Each label is set in its own face.
 */
export function FontMenuItems({
  options,
  font,
  onSelect,
  onPreview,
  onPreviewEnd,
  Item = DropdownMenuItem,
  Label = DropdownMenuLabel,
  Separator = DropdownMenuSeparator,
}: FontMenuItemsProps) {
  const themeFont = primaryFamily(getThemeFonts().sans)
  const hasThemeOption = options.some((o) => o.id === THEME_FONT_ID)

  return (
    <>
      {hasThemeOption && (
        <Item
          onClick={() => onSelect(THEME_FONT_ID)}
          onMouseEnter={() => onPreview(THEME_FONT_ID)}
          onMouseLeave={onPreviewEnd}
          className={`cursor-pointer ${font === THEME_FONT_ID ? "bg-accent" : ""}`}
        >
          <span className="flex-1">
            Theme default
            {themeFont && <span className="ml-1 text-xs text-muted-foreground">({themeFont})</span>}
          </span>
          {font === THEME_FONT_ID && <span className="ml-auto text-xs">✓</span>}
        </Item>
      )}
      {groupFonts(options).map((group) => (
        <React.Fragment key={group.category}>
          <Separator />
          <Label className="text-xs text-muted-foreground">{group.label}</Label>
          {group.fonts.map((option) => (
            <Item
              key={option.id}
              onClick={() => onSelect(option.id)}
              onMouseEnter={() => onPreview(option.id)}
              onMouseLeave={onPreviewEnd}
              // Start fetching on pointer-down too, so touch devices (no hover)
              // have the face on its way before the click lands.
              onPointerDown={() => void loadFont(option)}
              className={`cursor-pointer ${font === option.id ? "bg-accent" : ""}`}
            >
              <span className="flex-1 truncate" style={{ fontFamily: option.stack }}>
                {option.label}
              </span>
              {font === option.id && <span className="ml-auto text-xs">✓</span>}
            </Item>
          ))}
        </React.Fragment>
      ))}
    </>
  )
}

export interface FontSwitcherProps {
  /** Fonts to offer. Defaults to `fontOptions`; keep the array stable. */
  fonts?: FontOption[]
  Button?: React.ComponentType<any>
  onFontChange?: (id: string) => void
  /** Dropdown alignment relative to the trigger. */
  align?: "start" | "center" | "end"
}

/**
 * A dropdown that picks the page's font. Hover previews, click commits; the
 * choice persists and survives reloads. `"Theme default"` hands typography
 * back to the active color theme.
 */
export function FontSwitcher({ fonts = fontOptions, Button: CustomButton, onFontChange, align = "end" }: FontSwitcherProps = {}) {
  const { font, mounted, choose, preview, endPreview } = useFontSwitcher(fonts, onFontChange)
  const ButtonComp = CustomButton || Button

  // The stored font lives in localStorage, which the server cannot read.
  if (!mounted) return null

  return (
    <DropdownMenu onOpenChange={(open) => !open && endPreview()}>
      <DropdownMenuTrigger asChild>
        <ButtonComp variant="ghost" size="icon" aria-label="Choose font">
          <Type className="h-5 w-5" />
        </ButtonComp>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel>Font</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <FontMenuItems
          options={fonts}
          font={font}
          onSelect={choose}
          onPreview={preview}
          onPreviewEnd={endPreview}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
