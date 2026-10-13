"use client"

/**
 * @fileoverview The account row pinned at the sidebar's foot.
 *
 * Signed in, it opens the account menu: the host's rows (settings,
 * notifications, …), a Theme submenu — light/dark/system, then the colour
 * themes with their swatches, previewed on hover — and Sign out. Signed out,
 * the row itself is the sign-in button. While the session loads it is a
 * disabled placeholder, so the column doesn't jump when it resolves.
 *
 * In the icon rail it shrinks to the avatar; the menu opens beside it.
 *
 * @module components/user/nav-user
 */

import { Fragment } from "react"
import { Check, ChevronsUpDown, LogIn, LogOut, Monitor, Moon, Palette, Sun } from "lucide-react"

import { cn, formatCount } from "../../lib/utils"
import type { ColorTheme, SidebarUser, ThemeMode, UserMenuItem } from "../../lib/types"
import { Avatar } from "../../primitives/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu"
import { useSidebar } from "../layout/sidebar-context"

export interface NavUserTheme {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
  colorThemes?: ColorTheme[]
  colorTheme?: string
  onColorThemeChange?: (name: string) => void
  /** Hover preview; called with `null` when the pointer leaves. */
  onColorThemePreview?: (name: string | null) => void
}

export interface NavUserProps {
  /** `null` when signed out. */
  user: SidebarUser | null
  loading?: boolean
  menuItems?: UserMenuItem[]
  /** Adds the Theme submenu. */
  theme?: NavUserTheme
  onSignIn?: () => void
  /** Adds the Sign out row. */
  onSignOut?: () => void
  signInLabel?: string
  className?: string
}

const ROW =
  "flex h-12 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"

/** Sizes and spaces every icon in the menu, which the primitive leaves alone. */
const ITEM = "cursor-pointer gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"

const MODES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const

function ThemeSubmenu({ theme }: { theme: NavUserTheme }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={ITEM}>
        <Palette />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-56 overflow-y-auto rounded-lg">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Mode</DropdownMenuLabel>
        {MODES.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            className={ITEM}
            onSelect={(event) => {
              event.preventDefault()
              theme.onModeChange(value)
            }}
          >
            <Icon />
            {label}
            {theme.mode === value ? <Check className="ml-auto !text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
        {theme.colorThemes && theme.colorThemes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Colour</DropdownMenuLabel>
            {theme.colorThemes.map((color) => {
              const active = theme.colorTheme === color.name
              return (
                <DropdownMenuItem
                  key={color.name}
                  className={cn(ITEM, active && "bg-accent/60")}
                  onSelect={(event) => {
                    event.preventDefault()
                    theme.onColorThemeChange?.(color.name)
                  }}
                  onMouseEnter={() => theme.onColorThemePreview?.(color.name)}
                  onMouseLeave={() => theme.onColorThemePreview?.(null)}
                >
                  <span className="flex shrink-0 -space-x-1" aria-hidden>
                    <span className="size-3.5 rounded-full border border-border" style={{ backgroundColor: color.primary }} />
                    <span className="size-3.5 rounded-full border border-border" style={{ backgroundColor: color.secondary }} />
                  </span>
                  <span className="truncate">{color.label ?? color.name}</span>
                  {active ? <Check className="ml-auto !text-foreground" /> : null}
                </DropdownMenuItem>
              )
            })}
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

function Identity({ user }: { user: SidebarUser }) {
  return (
    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.name}</span>
      {user.subtitle || user.email ? (
        <span className="truncate text-xs text-muted-foreground">{user.subtitle ?? user.email}</span>
      ) : null}
    </div>
  )
}

export function NavUser({
  user,
  loading = false,
  menuItems = [],
  theme,
  onSignIn,
  onSignOut,
  signInLabel = "Sign in",
  className,
}: NavUserProps) {
  const { rail, isMobile, renderLink } = useSidebar()
  const row = cn(ROW, rail && "size-10 justify-center p-0", className)

  if (loading) {
    return (
      <button type="button" className={row} disabled aria-busy>
        <span className="size-8 shrink-0 animate-pulse rounded-lg bg-accent" />
        {!rail && <span className="truncate text-muted-foreground">Checking session…</span>}
      </button>
    )
  }

  if (!user) {
    return (
      <button type="button" className={row} onClick={onSignIn} title={rail ? signInLabel : undefined}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
          <LogIn className="size-4" />
        </span>
        {!rail && <span className="truncate font-medium">{signInLabel}</span>}
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(row, "data-[state=open]:bg-accent")}
          aria-label={rail ? `Account: ${user.name}` : undefined}
        >
          <Avatar image={user.image} name={user.name} />
          {!rail && (
            <>
              <Identity user={user} />
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn("min-w-56 rounded-lg", !rail && "w-(--radix-dropdown-menu-trigger-width)")}
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <Avatar image={user.image} name={user.name} />
            <Identity user={user} />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {menuItems.map((item) => {
            const Icon = item.icon
            const body = (
              <>
                {Icon ? <Icon /> : null}
                <span className="truncate">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {formatCount(item.badge)}
                  </span>
                ) : null}
              </>
            )
            const itemClass = cn(ITEM, item.destructive && "text-destructive focus:text-destructive")
            return (
              <Fragment key={item.id}>
                {item.separatorBefore && <DropdownMenuSeparator />}
                {item.href ? (
                  <DropdownMenuItem asChild className={itemClass} onSelect={item.onSelect}>
                    {renderLink({ href: item.href, children: body })}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className={itemClass} onSelect={item.onSelect}>
                    {body}
                  </DropdownMenuItem>
                )}
              </Fragment>
            )
          })}
          {theme && <ThemeSubmenu theme={theme} />}
        </DropdownMenuGroup>
        {onSignOut && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={ITEM} onSelect={onSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
