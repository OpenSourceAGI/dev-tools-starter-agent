import { describe, expect, it } from "vitest"

import { cn, formatCount, initialOf, opensElsewhere } from "../src/lib/utils"

const click = (over: Partial<Parameters<typeof opensElsewhere>[0]> = {}) => ({
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  button: 0,
  ...over,
})

describe("utils", () => {
  it("shortens thousands unless exact", () => {
    expect(formatCount(999)).toBe("999")
    expect(formatCount(1520)).toBe("1.5k")
    expect(formatCount(12000)).toBe("12k")
    expect(formatCount(1520, { exact: true })).toBe("1520")
  })

  it("hands modifier and non-primary clicks back to the browser", () => {
    expect(opensElsewhere(click())).toBe(false)
    expect(opensElsewhere(click({ metaKey: true }))).toBe(true)
    expect(opensElsewhere(click({ ctrlKey: true }))).toBe(true)
    expect(opensElsewhere(click({ shiftKey: true }))).toBe(true)
    expect(opensElsewhere(click({ button: 1 }))).toBe(true)
  })

  it("merges conflicting tailwind classes", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4")
  })

  it("takes an avatar initial", () => {
    expect(initialOf("rowan")).toBe("R")
    expect(initialOf("")).toBe("?")
    expect(initialOf(null)).toBe("?")
  })
})
