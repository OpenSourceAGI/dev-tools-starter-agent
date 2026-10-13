import { describe, expect, it } from "vitest"

import {
  DEMO_DOCK_ITEMS,
  DEMO_DOCK_TARGETS,
  DEMO_MEDIA,
  DEMO_SECTIONS,
  dockIdForRow,
  findDemoRow,
  mediaForRow,
} from "../src/demo/mock-data"
import type { NavItem } from "../src/lib/types"

const allRows = (items: NavItem[]): NavItem[] => items.flatMap((item) => [item, ...allRows(item.children ?? [])])
const rowIds = DEMO_SECTIONS.flatMap((section) => allRows(section.items)).map((row) => row.id)

describe("ClipWire mock data", () => {
  it("has unique row ids", () => {
    expect(new Set(rowIds).size).toBe(rowIds.length)
  })

  it("lands every dock button on a real row", () => {
    for (const item of DEMO_DOCK_ITEMS) {
      const target = DEMO_DOCK_TARGETS[item.id]
      expect(target, item.id).toBeDefined()
      if (target !== "home" && target !== "search") expect(findDemoRow(target), target).not.toBeNull()
      expect(dockIdForRow(target)).toBe(item.id)
    }
  })

  it("only lists media under rows that exist", () => {
    for (const media of DEMO_MEDIA) {
      for (const list of media.lists) expect(rowIds, `${media.id} → ${list}`).toContain(list)
    }
  })

  it("covers videos, articles and clips", () => {
    expect(new Set(DEMO_MEDIA.map((m) => m.kind))).toEqual(new Set(["video", "article", "clip"]))
  })

  it("filters a row's media by title, source or tag", () => {
    expect(mediaForRow("home")).toHaveLength(DEMO_MEDIA.length)
    expect(mediaForRow("col-ai").every((m) => m.lists.includes("col-ai"))).toBe(true)
    expect(mediaForRow("home", "quote").every((m) => m.tags.includes("quote"))).toBe(true)
    expect(mediaForRow("home", "harbor gazette")).toHaveLength(1)
  })
})
