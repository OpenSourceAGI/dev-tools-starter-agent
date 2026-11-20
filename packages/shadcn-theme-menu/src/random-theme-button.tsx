"use client"

import * as React from "react"
import { ChevronDown, Dices } from "lucide-react"
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
  getRandomizeSettings,
  RANDOMIZE_CHANGE_EVENT,
  randomizeColorTheme,
  randomizeModes,
  type RandomizeMode,
  type RandomizeSettings,
  setRandomizeMode,
  startRandomizeSchedule,
} from "./randomize"

/**
 * Randomize state for a component: the stored schedule (kept in sync across
 * the page), actions to randomize now or change the mode, and — while mounted —
 * the running schedule itself. Several components may use it at once; only one
 * timer runs.
 */
export function useRandomizeTheme(onRandomize?: (theme: string) => void) {
  const [settings, setSettings] = React.useState<RandomizeSettings>({ mode: "off", lastAt: 0 })

  React.useEffect(() => {
    setSettings(getRandomizeSettings())
    const onChange = (event: Event) => setSettings((event as CustomEvent<RandomizeSettings>).detail)
    window.addEventListener(RANDOMIZE_CHANGE_EVENT, onChange)
    const stop = startRandomizeSchedule()
    return () => {
      window.removeEventListener(RANDOMIZE_CHANGE_EVENT, onChange)
      stop()
    }
  }, [])

  const randomize = React.useCallback(() => {
    const theme = randomizeColorTheme()
    onRandomize?.(theme)
    return theme
  }, [onRandomize])

  const setMode = React.useCallback((mode: RandomizeMode) => {
    setRandomizeMode(mode)
  }, [])

  return { mode: settings.mode, lastAt: settings.lastAt, randomize, setMode }
}

interface RandomizeMenuItemsProps {
  mode: RandomizeMode
  onRandomize: () => void
  onModeChange: (mode: RandomizeMode) => void
  Item?: React.ComponentType<any>
  Label?: React.ComponentType<any>
  Separator?: React.ComponentType<any>
}

/**
 * "Randomize theme" plus the auto-randomize schedule, as dropdown items. The
 * menu stays open after each choice so you can roll again.
 */
export function RandomizeMenuItems({
  mode,
  onRandomize,
  onModeChange,
  Item = DropdownMenuItem,
  Label = DropdownMenuLabel,
  Separator = DropdownMenuSeparator,
}: RandomizeMenuItemsProps) {
  const keepOpen = (event: Event) => event.preventDefault()
  return (
    <>
      <Item onSelect={keepOpen} onClick={onRandomize} className="cursor-pointer font-medium">
        <Dices className="mr-2 h-4 w-4" />
        <span>Randomize theme</span>
      </Item>
      <Separator />
      <Label className="text-xs text-muted-foreground">Auto-randomize</Label>
      {randomizeModes.map((option) => (
        <Item
          key={option.mode}
          onSelect={keepOpen}
          onClick={() => onModeChange(option.mode)}
          className={`cursor-pointer py-1 h-7 ${mode === option.mode ? "bg-accent" : ""}`}
        >
          <span className="text-sm">{option.label}</span>
          {mode === option.mode && <span className="ml-auto text-xs">✓</span>}
        </Item>
      ))}
    </>
  )
}

export interface RandomThemeButtonProps {
  Button?: React.ComponentType<any>
  /** Show the dropdown of auto-randomize settings beside the dice. Default true. */
  showSchedule?: boolean
  /** Called with the theme picked, by the button or the schedule menu. */
  onRandomize?: (theme: string) => void
  /** Called when the auto-randomize mode changes. */
  onModeChange?: (mode: RandomizeMode) => void
}

/**
 * A dice button that applies a random color theme, with an optional dropdown
 * for when to do it automatically (every visit, session, hour, day or week).
 * Mounting it also runs the stored schedule.
 */
export function RandomThemeButton({
  Button: CustomButton,
  showSchedule = true,
  onRandomize,
  onModeChange,
}: RandomThemeButtonProps = {}) {
  const ButtonComp = CustomButton || Button
  const { mode, randomize, setMode } = useRandomizeTheme(onRandomize)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const changeMode = (next: RandomizeMode) => {
    setMode(next)
    onModeChange?.(next)
  }

  const label = mode === "off" ? "Randomize theme" : `Randomize theme (auto: ${randomizeModes.find((m) => m.mode === mode)?.label.toLowerCase()})`

  return (
    <div className="inline-flex items-center">
      <ButtonComp variant="ghost" size="icon" aria-label="Randomize theme" title={label} onClick={() => randomize()} className="relative">
        <Dices className="h-5 w-5" />
        {mode !== "off" && (
          <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
        )}
      </ButtonComp>
      {showSchedule && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonComp variant="ghost" size="icon" aria-label="Auto-randomize settings" className="w-5 px-0">
              <ChevronDown className="h-3.5 w-3.5" />
            </ButtonComp>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <RandomizeMenuItems mode={mode} onRandomize={() => randomize()} onModeChange={changeMode} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
