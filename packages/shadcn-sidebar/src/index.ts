/**
 * @fileoverview Public entry point of `shadcn-sidebar`.
 *
 * `AppSidebar` is the batteries-included sidebar; everything it is built
 * from is exported too, for hosts that need a different arrangement.
 * Mock data and the demo app live behind `shadcn-sidebar/demo`.
 */

export { AppSidebar, type AppSidebarProps, type SidebarBrand, type SidebarFooterLink } from "./components/app-sidebar"

export {
  SidebarProvider,
  useSidebar,
  defaultRenderLink,
  type SidebarProviderProps,
  type SidebarContextValue,
  type SidebarCollapseMode,
  type SidebarVariant,
} from "./components/layout/sidebar-context"
export {
  SidebarLayout,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_RAIL_WIDTH,
  type SidebarLayoutProps,
} from "./components/layout/sidebar-layout"
export { MobileSidebarDrawer, type MobileSidebarDrawerProps } from "./components/layout/mobile-sidebar-drawer"

export { AppDock, type AppDockProps, type AppDockPlacement } from "./components/dock/app-dock"
export { Dock, DockIcon, DockItem, DockLabel, dockVariants } from "./components/dock/dock"

export { NavTree, type NavTreeProps } from "./components/nav/nav-tree"
export {
  initialExpandedSections,
  withSectionExpanded,
  toggleExpandedSection,
  sectionForItem,
  ancestorGroupIds,
  type AccordionMode,
} from "./components/nav/section-expansion"

export { NavUser, type NavUserProps, type NavUserTheme } from "./components/user/nav-user"
export { useThemeMode, type ThemeState } from "./components/user/use-theme-mode"

export { persistentFlag, usePersistentFlag, type PersistentFlag } from "./state/persistent-flag"
export { useIsMobile, useMediaQuery, useFinePointer } from "./hooks/use-media-query"
export { cn, formatCount, opensElsewhere, isEditableTarget } from "./lib/utils"

export type {
  ColorTheme,
  DockNavItem,
  NavItem,
  NavSection,
  RenderLink,
  SidebarIcon,
  SidebarUser,
  ThemeMode,
  UserMenuItem,
} from "./lib/types"
