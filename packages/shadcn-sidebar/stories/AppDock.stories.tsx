import type { Meta, StoryObj } from "@storybook/react-vite"

import { AppDock, SidebarProvider, type AppDockPlacement } from "../src"
import { DEMO_DOCK_ITEMS } from "../src/demo"

function Frame({ placement, activeDockId }: { placement: AppDockPlacement; activeDockId: string }) {
  return (
    <SidebarProvider collapseMode="none" activeDockId={activeDockId} keyboardShortcut={false}>
      <div className="min-h-screen p-6">
        <div className={placement === "sidebar" ? "w-72 rounded-xl border border-border bg-sidebar p-3" : placement === "rail" ? "w-14 rounded-xl border border-border bg-sidebar py-3" : ""}>
          <AppDock items={DEMO_DOCK_ITEMS} placement={placement} onNavigate={() => {}} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Hover with a mouse to magnify. Badges come from each item&apos;s <code>badge</code>.
          {placement === "bottom" ? " The bottom bar only shows below the md breakpoint — switch the viewport to Phone." : ""}
          {placement === "floating" ? " The floating dock only shows at md and up." : ""}
        </p>
      </div>
    </SidebarProvider>
  )
}

/** The macOS-style app dock in each of its four placements. */
const meta = {
  title: "Parts/AppDock",
  component: Frame,
  args: { placement: "sidebar", activeDockId: "news" },
  argTypes: {
    placement: { control: "inline-radio", options: ["sidebar", "floating", "bottom", "rail"] },
    activeDockId: { control: "select", options: DEMO_DOCK_ITEMS.map((item) => item.id) },
  },
} satisfies Meta<typeof Frame>

export default meta
type Story = StoryObj<typeof meta>

export const InSidebar: Story = {}
export const Floating: Story = { args: { placement: "floating" } }
export const Rail: Story = { args: { placement: "rail" } }
export const BottomBar: Story = {
  args: { placement: "bottom" },
  globals: { viewport: { value: "phone", isRotated: false } },
}
