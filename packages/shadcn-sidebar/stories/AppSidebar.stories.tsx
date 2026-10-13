import type { Meta, StoryObj } from "@storybook/react-vite"

import { ClipWireDemo } from "../src/demo"

/**
 * The full sidebar around the ClipWire demo — a site for watching videos,
 * clipping news articles, organising them into collections and sharing them.
 * Every story keeps its own stored state (`storageKey`), so collapsing one
 * does not collapse the next.
 */
const meta = {
  title: "AppSidebar/ClipWire demo",
  component: ClipWireDemo,
  args: {
    collapseMode: "offcanvas",
    variant: "sidebar",
    accordion: "single",
    signedOut: false,
    loadingSession: false,
    defaultCollapsed: false,
    initialRowId: "home",
  },
  argTypes: {
    collapseMode: { control: "inline-radio", options: ["offcanvas", "icon", "none"] },
    variant: { control: "inline-radio", options: ["sidebar", "floating", "inset"] },
    accordion: { control: "inline-radio", options: ["single", "multiple"] },
    initialRowId: {
      control: "select",
      options: ["home", "watch-feed", "news-top", "news-src-local", "clips-quotes", "col-climate-energy", "shared-inbox"],
    },
  },
} satisfies Meta<typeof ClipWireDemo>

export default meta
type Story = StoryObj<typeof meta>

/** Resizable column, dock on top, one tree section open at a time. Drag the edge; Ctrl/Cmd+B hides it. */
export const Default: Story = {
  args: { storageKey: "story-default" },
}

/** Collapses to an icon rail instead of disappearing: dock, sections and avatar stay reachable. */
export const IconRail: Story = {
  args: { storageKey: "story-icon-rail", collapseMode: "icon", defaultCollapsed: true },
}

/** Starts hidden: the dock floats top-left and a tab on the left edge brings the column back. */
export const OffcanvasHidden: Story = {
  args: { storageKey: "story-offcanvas-hidden", collapseMode: "offcanvas", defaultCollapsed: true },
}

/** The column can't be hidden — no hide button, no shortcut. */
export const AlwaysOpen: Story = {
  args: { storageKey: "story-always-open", collapseMode: "none" },
}

/** The column as a rounded, shadowed card. */
export const Floating: Story = {
  args: { storageKey: "story-floating", variant: "floating" },
}

/** The page as a rounded card beside a borderless column. */
export const Inset: Story = {
  args: { storageKey: "story-inset", variant: "inset", collapseMode: "icon" },
}

/** Sections open and close independently instead of as an accordion. */
export const MultipleSectionsOpen: Story = {
  args: { storageKey: "story-multiple", accordion: "multiple" },
}

/** Deep-linked into a nested collection: its section and parent folder open around it. */
export const NestedCollection: Story = {
  args: { storageKey: "story-nested", initialRowId: "col-climate-energy" },
}

/** The footer as a Sign in button; signing in swaps it for the account menu. */
export const SignedOut: Story = {
  args: { storageKey: "story-signed-out", signedOut: true },
}

/** The account row's placeholder while the session resolves. */
export const LoadingSession: Story = {
  args: { storageKey: "story-loading", loadingSession: true },
}

/** Phone width: no column, a bottom dock whose first button opens the drawer. */
export const Mobile: Story = {
  args: { storageKey: "story-mobile", initialRowId: "news-top" },
  globals: { viewport: { value: "phone", isRotated: false } },
}
