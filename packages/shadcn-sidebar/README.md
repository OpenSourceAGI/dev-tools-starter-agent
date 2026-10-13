![img](https://i.imgur.com/tsV6aLJ.png)


# shadcn-sidebar

A data-driven, [shadcn/ui](https://ui.shadcn.com)-style app sidebar for React and
Tailwind CSS v4.

- **Resizable column.** Drag the edge; the width is remembered. Double-click the handle
  to reset it.
- **Three collapse modes.** `offcanvas` slides the column away, with a tab on the left
  edge to bring it back. `icon` shrinks it to a rail of icons. `none` keeps it open.
  The hide button, **Ctrl/Cmd+B** (except inside text fields) and dragging the edge
  all collapse it. The choice is saved, shared across pages and kept in step across tabs.
- **Three variants.** `sidebar`, `floating` and `inset`.
- **App dock.** A macOS-style dock that magnifies toward the cursor and shows badges.
  It sits at the top of the column, becomes a vertical stack in the rail, floats while
  the column is hidden, and turns into a bottom bar on phones.
- **Collapsible nav tree.** Sections work as an accordion, either `single` or `multiple`.
  Rows can nest, show counts (1.5k) and carry badges. The section and folders around the
  active row open on their own. A modifier-click on a section heading opens its page in
  a new tab.
- **Account menu.** Your own rows, a Theme submenu (light, dark or system, plus colour
  themes with hover preview) and Sign out. While the session loads it shows a placeholder;
  when signed out it shows a Sign in button.
- **Mobile drawer.** On phones the same contents open in a left drawer, which closes
  when you follow a link.

## Install

```bash
bun add shadcn-sidebar
```

Peer dependencies: `react` and `react-dom` 18 or 19. Styling uses Tailwind v4 utilities
against the standard shadcn tokens (`--background`, `--accent`, `--sidebar`, …).

If your app already defines those tokens, have Tailwind scan the package:

```css
@import "tailwindcss";
@source "../node_modules/shadcn-sidebar/src";
```

If it doesn't, import the default tokens instead:

```css
@import "tailwindcss";
@import "shadcn-sidebar/styles.css";
```

## Usage

```tsx
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Newspaper, Settings } from "lucide-react"
import { AppSidebar } from "shadcn-sidebar"

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AppSidebar
      collapseMode="icon"
      brand={{ name: "Acme", icon: Home, href: "/" }}
      dockItems={[
        { id: "home", label: "Home", icon: Home, href: "/" },
        { id: "news", label: "News", icon: Newspaper, href: "/news", badge: 4 },
      ]}
      sections={[
        {
          id: "news",
          title: "News",
          icon: Newspaper,
          items: [
            { id: "/news", title: "Top stories", href: "/news", count: 12 },
            { id: "/news/saved", title: "Saved", href: "/news/saved" },
          ],
        },
      ]}
      activeItemId={pathname}
      renderLink={({ href, children, ...props }) => (
        <Link href={href} {...props}>
          {children}
        </Link>
      )}
      user={{
        user: { name: "Rowan", email: "rowan@example.com" },
        menuItems: [{ id: "settings", label: "Settings", icon: Settings, href: "/settings" }],
        onSignOut: () => signOut(),
      }}
    >
      {children}
    </AppSidebar>
  )
}
```

### Building your own arrangement

Every piece is also exported on its own:

| Export | What it is |
| --- | --- |
| `SidebarProvider` / `useSidebar` | Collapse state (persisted or controlled), mode, variant, mobile drawer state, active ids, `renderLink`, Ctrl/Cmd+B |
| `SidebarLayout` | The resizable column and the page beside it |
| `AppDock` (`Dock`, `DockItem`, `DockIcon`, `DockLabel`) | The dock in the `sidebar`, `rail`, `floating` or `bottom` placement |
| `NavTree` | The collapsible tree; the pure accordion rules are exported too |
| `NavUser` / `useThemeMode` | The account row and menu, plus a small theme store for hosts that don't have one |
| `MobileSidebarDrawer` | The phone drawer |
| `persistentFlag` | The localStorage-backed boolean behind the collapse state |

## Demo and Storybook

`shadcn-sidebar/demo` exports `ClipWireDemo` and its mock data. ClipWire is a pretend site
for watching videos, clipping news articles, sorting both into collections and sharing
them with a team.

```bash
bun run storybook        # http://localhost:6006
bun run build-storybook  # static build in storybook-static/
```

Stories:

- **AppSidebar / ClipWire demo** — Default, IconRail, OffcanvasHidden, AlwaysOpen,
  Floating, Inset, MultipleSectionsOpen, NestedCollection, SignedOut, LoadingSession
  and Mobile.
- **Parts** — `NavTree`, `AppDock` (all four placements) and `NavUser`.

## License

MIT
