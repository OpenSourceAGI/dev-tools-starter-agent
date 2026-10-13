import type { Meta, StoryObj } from "@storybook/react-vite"

import { NavUser, SidebarProvider, useThemeMode } from "../src"
import { DEMO_COLOR_THEMES, DEMO_USER, DEMO_USER_MENU } from "../src/demo"

function Frame({ state }: { state: "signed-in" | "signed-out" | "loading" }) {
  const theme = useThemeMode({ storageKey: "story-nav-user-theme", defaultColorTheme: "default" })
  return (
    <SidebarProvider collapseMode="none" keyboardShortcut={false}>
      <div className="flex min-h-screen items-end p-6">
        <div className="w-72 rounded-xl border border-border bg-sidebar p-2">
          <NavUser
            user={state === "signed-in" ? DEMO_USER : null}
            loading={state === "loading"}
            menuItems={DEMO_USER_MENU}
            onSignIn={() => alert("Sign in")}
            onSignOut={() => alert("Sign out")}
            theme={{
              mode: theme.mode,
              onModeChange: theme.setMode,
              colorThemes: DEMO_COLOR_THEMES,
              colorTheme: theme.colorTheme,
              onColorThemeChange: theme.setColorTheme,
              onColorThemePreview: theme.previewColorTheme,
            }}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}

/**
 * The account row and its menu: the host's rows, a Theme submenu (mode plus
 * colour themes, previewed on hover) and Sign out.
 */
const meta = {
  title: "Parts/NavUser",
  component: Frame,
  args: { state: "signed-in" },
  argTypes: { state: { control: "inline-radio", options: ["signed-in", "signed-out", "loading"] } },
} satisfies Meta<typeof Frame>

export default meta
type Story = StoryObj<typeof meta>

export const SignedIn: Story = {}
export const SignedOut: Story = { args: { state: "signed-out" } }
export const Loading: Story = { args: { state: "loading" } }
