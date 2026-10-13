import { describe, expect, it } from "vitest"

import {
  ancestorGroupIds,
  initialExpandedSections,
  sectionForItem,
  toggleExpandedSection,
  withSectionExpanded,
} from "../src/components/nav/section-expansion"
import type { NavSection } from "../src/lib/types"

const sections: NavSection[] = [
  { id: "a", title: "A", items: [{ id: "a1", title: "A1" }] },
  {
    id: "b",
    title: "B",
    items: [{ id: "b1", title: "B1", children: [{ id: "b1x", title: "B1x", children: [{ id: "b1xy", title: "deep" }] }] }],
  },
  { id: "c", title: "C", defaultCollapsed: true, items: [{ id: "c1", title: "C1" }] },
]

describe("initialExpandedSections", () => {
  it("opens only the active section in single mode", () => {
    expect(initialExpandedSections(sections, "single", "b")).toEqual(["b"])
  })
  it("falls back to the first open-by-default section in single mode", () => {
    expect(initialExpandedSections(sections, "single", null)).toEqual(["a"])
  })
  it("opens every section not marked defaultCollapsed in multiple mode, plus the active one", () => {
    expect(initialExpandedSections(sections, "multiple", null)).toEqual(["a", "b"])
    expect(initialExpandedSections(sections, "multiple", "c")).toEqual(["a", "b", "c"])
  })
})

describe("withSectionExpanded", () => {
  it("replaces the open section in single mode", () => {
    expect(withSectionExpanded(["a"], "b", "single")).toEqual(["b"])
  })
  it("returns the same array when nothing changes", () => {
    const current = ["a"]
    expect(withSectionExpanded(current, "a", "single")).toBe(current)
    expect(withSectionExpanded(current, "a", "multiple")).toBe(current)
  })
  it("adds to the open sections in multiple mode", () => {
    expect(withSectionExpanded(["a"], "b", "multiple")).toEqual(["a", "b"])
  })
})

describe("toggleExpandedSection", () => {
  it("closes an open section in either mode", () => {
    expect(toggleExpandedSection(["a", "b"], "a", "multiple")).toEqual(["b"])
    expect(toggleExpandedSection(["a"], "a", "single")).toEqual([])
  })
  it("opening one closes the rest in single mode only", () => {
    expect(toggleExpandedSection(["a"], "b", "single")).toEqual(["b"])
    expect(toggleExpandedSection(["a"], "b", "multiple")).toEqual(["a", "b"])
  })
})

describe("sectionForItem / ancestorGroupIds", () => {
  it("finds the section holding a row at any depth", () => {
    expect(sectionForItem(sections, "a1")).toBe("a")
    expect(sectionForItem(sections, "b1xy")).toBe("b")
    expect(sectionForItem(sections, "missing")).toBeNull()
    expect(sectionForItem(sections, undefined)).toBeNull()
  })
  it("lists the nested groups around a row, outermost first", () => {
    expect(ancestorGroupIds(sections[1].items, "b1xy")).toEqual(["b1", "b1x"])
    expect(ancestorGroupIds(sections[1].items, "b1x")).toEqual(["b1"])
    expect(ancestorGroupIds(sections[1].items, "b1")).toEqual([])
  })
})
