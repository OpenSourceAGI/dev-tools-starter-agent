import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { NavTree, SidebarProvider, type NavItem } from "../src"
import { DEMO_SECTIONS } from "../src/demo"

function Frame({ accordion, initial }: { accordion: "single" | "multiple"; initial: string }) {
  const [active, setActive] = useState(initial)
  const renderLink = ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        if (!href.startsWith("#/")) return
        event.preventDefault()
        setActive(href.slice(2))
      }}
    >
      {children}
    </a>
  )
  return (
    <SidebarProvider collapseMode="none" activeItemId={active} renderLink={renderLink} keyboardShortcut={false}>
      <div className="flex min-h-screen gap-6 p-6">
        <div className="w-72 rounded-xl border border-border bg-sidebar p-3">
          <NavTree sections={DEMO_SECTIONS} accordion={accordion} onSelect={(item: NavItem) => setActive(item.id)} />
        </div>
        <p className="text-sm text-muted-foreground">
          Active row: <code>{active}</code>
        </p>
      </div>
    </SidebarProvider>
  )
}

/**
 * The collapsible tree on its own. Headings toggle their section (a
 * modifier-click opens the section's page); rows with children are nested
 * folders; counts shorten past a thousand.
 */
const meta = {
  title: "Parts/NavTree",
  component: Frame,
  args: { accordion: "single", initial: "watch-feed" },
  argTypes: { accordion: { control: "inline-radio", options: ["single", "multiple"] } },
} satisfies Meta<typeof Frame>

export default meta
type Story = StoryObj<typeof meta>

export const Accordion: Story = {}
export const Multiple: Story = { args: { accordion: "multiple" } }
export const NestedActive: Story = { args: { initial: "news-src-science" } }
