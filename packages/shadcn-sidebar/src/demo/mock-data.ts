/**
 * @fileoverview Mock data for the demo site, "ClipWire" — a place to watch
 * videos, clip news articles, organise both into collections and share them
 * with a team. Everything the sidebar draws (dock, sections, account menu,
 * colour themes) and everything the demo page lists comes from here.
 *
 * @module demo/mock-data
 */

import {
  Bell,
  Bookmark,
  BookOpen,
  Clapperboard,
  Clock,
  Compass,
  Flame,
  FolderClosed,
  FolderOpen,
  Globe,
  HardDriveDownload,
  Heart,
  History,
  Home,
  Inbox,
  Link2,
  ListVideo,
  Megaphone,
  Newspaper,
  Puzzle,
  Quote,
  Rss,
  Scissors,
  Search,
  Settings,
  Share2,
  Sparkles,
  Tags,
  Users,
  Zap,
} from "lucide-react"

import type { ColorTheme, DockNavItem, NavSection, SidebarUser, UserMenuItem } from "../lib/types"
import type { SidebarBrand, SidebarFooterLink } from "../components/app-sidebar"

export const DEMO_BRAND: SidebarBrand = {
  name: "ClipWire",
  tagline: "Watch · Clip · Share",
  icon: Scissors,
  href: "#/home",
}

/** Each dock button opens a section; `DEMO_DOCK_TARGETS` names the row it lands on. */
export const DEMO_DOCK_ITEMS: DockNavItem[] = [
  { id: "home", label: "Home", icon: Home, href: "#/home" },
  { id: "watch", label: "Videos", icon: Clapperboard, href: "#/watch-feed" },
  { id: "news", label: "News", icon: Newspaper, href: "#/news-top", badge: 12 },
  { id: "clips", label: "Clips", icon: Scissors, href: "#/clips-all" },
  { id: "collections", label: "Collections", icon: FolderOpen, href: "#/col-climate" },
  { id: "shared", label: "Shared", icon: Share2, href: "#/shared-inbox", badge: 3 },
  { id: "search", label: "Search", icon: Search, href: "#/search" },
]

export const DEMO_DOCK_TARGETS: Record<string, string> = {
  home: "home",
  watch: "watch-feed",
  news: "news-top",
  clips: "clips-all",
  collections: "col-climate",
  shared: "shared-inbox",
  search: "search",
}

export const DEMO_SECTIONS: NavSection[] = [
  {
    id: "watch",
    title: "Watch",
    icon: Clapperboard,
    href: "#/watch-feed",
    items: [
      { id: "watch-feed", title: "For You", icon: Sparkles, href: "#/watch-feed", count: 248 },
      { id: "watch-subscriptions", title: "Subscriptions", icon: Rss, href: "#/watch-subscriptions", count: 37 },
      { id: "watch-trending", title: "Trending", icon: Flame, href: "#/watch-trending", count: 1520 },
      { id: "watch-later", title: "Watch Later", icon: Clock, href: "#/watch-later", count: 14 },
      { id: "watch-liked", title: "Liked", icon: Heart, href: "#/watch-liked", count: 92 },
      { id: "watch-history", title: "History", icon: History, href: "#/watch-history", count: 1034 },
    ],
  },
  {
    id: "news",
    title: "News",
    icon: Newspaper,
    href: "#/news-top",
    items: [
      { id: "news-top", title: "Top Stories", icon: Megaphone, href: "#/news-top", count: 12, badge: "Live" },
      { id: "news-following", title: "Following", icon: Rss, href: "#/news-following", count: 58 },
      { id: "news-reading", title: "Reading List", icon: BookOpen, href: "#/news-reading", count: 21 },
      { id: "news-saved", title: "Saved Articles", icon: Bookmark, href: "#/news-saved", count: 340 },
      {
        id: "news-sources",
        title: "Sources",
        icon: Globe,
        children: [
          { id: "news-src-wire", title: "Wire Services", href: "#/news-src-wire", count: 4 },
          { id: "news-src-local", title: "Local Papers", href: "#/news-src-local", count: 11 },
          { id: "news-src-science", title: "Science Journals", href: "#/news-src-science", count: 6 },
        ],
      },
    ],
  },
  {
    id: "clips",
    title: "Clips",
    icon: Scissors,
    href: "#/clips-all",
    items: [
      { id: "clips-all", title: "All Clips", icon: Scissors, href: "#/clips-all", count: 186 },
      { id: "clips-video", title: "Video Moments", icon: ListVideo, href: "#/clips-video", count: 74 },
      { id: "clips-quotes", title: "Quotes & Highlights", icon: Quote, href: "#/clips-quotes", count: 112 },
      { id: "clips-tags", title: "Tags", icon: Tags, href: "#/clips-tags", badge: "New" },
    ],
  },
  {
    id: "collections",
    title: "Collections",
    icon: FolderOpen,
    items: [
      {
        id: "col-climate",
        title: "Climate Policy",
        icon: FolderClosed,
        href: "#/col-climate",
        count: 42,
        children: [
          { id: "col-climate-energy", title: "Energy Transition", href: "#/col-climate-energy", count: 18 },
          { id: "col-climate-cop", title: "COP Coverage", href: "#/col-climate-cop", count: 9 },
        ],
      },
      { id: "col-ai", title: "AI Regulation", icon: FolderClosed, href: "#/col-ai", count: 63 },
      { id: "col-elections", title: "Elections 2026", icon: FolderClosed, href: "#/col-elections", count: 128 },
      { id: "col-space", title: "Space & Science", icon: FolderClosed, href: "#/col-space", count: 27 },
    ],
  },
  {
    id: "shared",
    title: "Shared",
    icon: Share2,
    href: "#/shared-inbox",
    items: [
      { id: "shared-inbox", title: "Shared with me", icon: Inbox, href: "#/shared-inbox", count: 3, badge: 3 },
      { id: "shared-team", title: "Team Boards", icon: Users, href: "#/shared-team", count: 8 },
      { id: "shared-links", title: "Public Links", icon: Link2, href: "#/shared-links", count: 15 },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    icon: Zap,
    defaultCollapsed: true,
    items: [
      { id: "tools-discover", title: "Discover", icon: Compass, href: "#/tools-discover" },
      { id: "tools-extension", title: "Browser Clipper", icon: Puzzle, href: "https://example.com/clipper", external: true },
      { id: "tools-import", title: "Import Bookmarks", icon: HardDriveDownload, href: "#/tools-import" },
    ],
  },
]

export const DEMO_USER: SidebarUser = {
  name: "Rowan Patel",
  email: "rowan@clipwire.example",
  image: null,
}

export const DEMO_USER_MENU: UserMenuItem[] = [
  { id: "settings", label: "Settings", icon: Settings, href: "#/settings" },
  { id: "notifications", label: "Notifications", icon: Bell, href: "#/notifications", badge: 5 },
  { id: "team", label: "Team & sharing", icon: Users, href: "#/shared-team" },
]

export const DEMO_COLOR_THEMES: ColorTheme[] = [
  { name: "default", label: "Graphite", primary: "#262626", secondary: "#f5f5f5" },
  { name: "ocean", label: "Ocean", primary: "#1d6fd1", secondary: "#dbeafe" },
  { name: "sunset", label: "Sunset", primary: "#e8642c", secondary: "#ffedd5" },
  { name: "forest", label: "Forest", primary: "#2f8f5b", secondary: "#dcfce7" },
  { name: "grape", label: "Grape", primary: "#8b3fd9", secondary: "#f3e8ff" },
]

export const DEMO_FOOTER_LINKS: SidebarFooterLink[] = [
  { id: "about", label: "About", href: "#/about" },
  { id: "privacy", label: "Privacy", href: "#/privacy" },
  { id: "help", label: "Help", href: "#/help" },
]

export type MediaKind = "video" | "article" | "clip"

export interface MediaItem {
  id: string
  kind: MediaKind
  title: string
  source: string
  /** "12:04" for videos and clips, "6 min read" for articles. */
  length: string
  excerpt: string
  tags: string[]
  /** Tree rows this item is listed under. */
  lists: string[]
  /** Two colours for the placeholder thumbnail's gradient. */
  palette: [string, string]
  publishedAt: string
  sharedBy?: string
}

export const DEMO_MEDIA: MediaItem[] = [
  {
    id: "m1",
    kind: "video",
    title: "How grid batteries are changing the evening peak",
    source: "Energy Explained",
    length: "14:32",
    excerpt: "A field visit to three utility-scale battery sites and what their dispatch data shows.",
    tags: ["energy", "climate"],
    lists: ["watch-feed", "watch-later", "col-climate", "col-climate-energy", "clips-video"],
    palette: ["#0ea5e9", "#22c55e"],
    publishedAt: "2026-10-05",
  },
  {
    id: "m2",
    kind: "article",
    title: "Lawmakers draft the first audit rules for frontier AI models",
    source: "The Wire Desk",
    length: "7 min read",
    excerpt: "The proposal would require third-party evaluations before deployment above a compute threshold.",
    tags: ["ai", "policy"],
    lists: ["news-top", "news-saved", "col-ai", "news-src-wire"],
    palette: ["#6366f1", "#a855f7"],
    publishedAt: "2026-10-06",
  },
  {
    id: "m3",
    kind: "clip",
    title: "“Storage is the bridge between cheap solar and reliable power.”",
    source: "Clipped from Energy Explained · 06:12–06:41",
    length: "0:29",
    excerpt: "Highlight saved with a note: use for the transition explainer.",
    tags: ["quote", "energy"],
    lists: ["clips-all", "clips-quotes", "clips-video", "col-climate-energy"],
    palette: ["#f59e0b", "#ef4444"],
    publishedAt: "2026-10-05",
  },
  {
    id: "m4",
    kind: "article",
    title: "Turnout models for the midterms, explained in five charts",
    source: "Civic Data Weekly",
    length: "9 min read",
    excerpt: "Why early-vote numbers are a weaker signal this cycle, and what to watch instead.",
    tags: ["elections", "data"],
    lists: ["news-following", "news-reading", "col-elections", "shared-inbox"],
    palette: ["#14b8a6", "#0f766e"],
    publishedAt: "2026-10-04",
    sharedBy: "Maya L.",
  },
  {
    id: "m5",
    kind: "video",
    title: "Inside the delegates' room: a COP negotiation timeline",
    source: "Global Desk",
    length: "22:10",
    excerpt: "Two weeks of talks compressed into the moments that moved the final text.",
    tags: ["climate", "diplomacy"],
    lists: ["watch-subscriptions", "watch-trending", "col-climate", "col-climate-cop", "shared-team"],
    palette: ["#84cc16", "#15803d"],
    publishedAt: "2026-10-02",
    sharedBy: "Team Climate",
  },
  {
    id: "m6",
    kind: "article",
    title: "A new exoplanet survey doubles the count of temperate worlds",
    source: "Science Journal Digest",
    length: "5 min read",
    excerpt: "The survey's methods, its caveats, and the three planets astronomers want to look at next.",
    tags: ["space", "science"],
    lists: ["news-top", "col-space", "news-src-science", "shared-links"],
    palette: ["#1e3a8a", "#7c3aed"],
    publishedAt: "2026-10-06",
  },
  {
    id: "m7",
    kind: "clip",
    title: "“Audits only work if the auditors can see the weights.”",
    source: "Clipped from The Wire Desk",
    length: "Quote",
    excerpt: "Pulled quote with source link, tagged for the AI regulation board.",
    tags: ["quote", "ai"],
    lists: ["clips-all", "clips-quotes", "col-ai", "shared-inbox"],
    palette: ["#f43f5e", "#a855f7"],
    publishedAt: "2026-10-06",
    sharedBy: "Jonah K.",
  },
  {
    id: "m8",
    kind: "video",
    title: "City council livestream: transit budget hearing (highlights)",
    source: "Metro Public Access",
    length: "38:47",
    excerpt: "The bus-lane vote, the public comment that changed it, and the final tally.",
    tags: ["local", "transit"],
    lists: ["watch-history", "watch-liked", "news-src-local", "col-elections"],
    palette: ["#f97316", "#facc15"],
    publishedAt: "2026-09-30",
  },
  {
    id: "m9",
    kind: "article",
    title: "Local paper roundup: housing, schools and a new ferry route",
    source: "Harbor Gazette",
    length: "4 min read",
    excerpt: "This week's three biggest local stories, with links to the full coverage.",
    tags: ["local"],
    lists: ["news-following", "news-src-local", "shared-inbox"],
    palette: ["#64748b", "#0ea5e9"],
    publishedAt: "2026-10-03",
    sharedBy: "Ana R.",
  },
]

/** Every tree row by id, flattened, with the section it sits in. */
export function findDemoRow(id: string): { sectionTitle: string; title: string } | null {
  const walk = (items: NavSection["items"], sectionTitle: string): { sectionTitle: string; title: string } | null => {
    for (const item of items) {
      if (item.id === id) return { sectionTitle, title: item.title }
      if (item.children) {
        const found = walk(item.children, sectionTitle)
        if (found) return found
      }
    }
    return null
  }
  for (const section of DEMO_SECTIONS) {
    const found = walk(section.items, section.title)
    if (found) return found
  }
  return null
}

/** The items listed under a tree row; "home" and "search" list everything. */
export function mediaForRow(id: string, query = ""): MediaItem[] {
  const base = id === "home" || id === "search" ? DEMO_MEDIA : DEMO_MEDIA.filter((item) => item.lists.includes(id))
  const q = query.trim().toLowerCase()
  if (!q) return base
  return base.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.includes(q)),
  )
}

/** The dock button that owns a tree row, so the dock lights up with the tree. */
export function dockIdForRow(id: string): string | undefined {
  if (id === "home" || id === "search") return id
  const prefix = id.split("-")[0]
  return (
    {
      watch: "watch",
      news: "news",
      clips: "clips",
      col: "collections",
      shared: "shared",
    } as Record<string, string>
  )[prefix]
}
