/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest"

import { persistentFlag, readStoredNumber, writeStoredNumber } from "../src/state/persistent-flag"

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("persistentFlag", () => {
  it("stores true as '1' and false as absent", () => {
    const flag = persistentFlag("test-flag-a")
    expect(flag.get()).toBe(false)
    flag.set(true)
    expect(localStorage.getItem("test-flag-a")).toBe("1")
    expect(flag.get()).toBe(true)
    flag.toggle()
    expect(localStorage.getItem("test-flag-a")).toBeNull()
    expect(flag.get()).toBe(false)
  })

  it("is one store per key", () => {
    expect(persistentFlag("test-flag-b")).toBe(persistentFlag("test-flag-b"))
  })

  it("notifies subscribers on change, and only on change", () => {
    const flag = persistentFlag("test-flag-c")
    const listener = vi.fn()
    const unsubscribe = flag.subscribe(listener)
    flag.set(true)
    flag.set(true)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    flag.set(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("follows other tabs through the storage event", () => {
    const flag = persistentFlag("test-flag-d")
    const listener = vi.fn()
    flag.subscribe(listener)
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }))
    expect(listener).not.toHaveBeenCalled()
    window.dispatchEvent(new StorageEvent("storage", { key: "test-flag-d" }))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("keeps the choice in memory when storage is blocked", () => {
    const flag = persistentFlag("test-flag-e")
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    flag.set(true)
    expect(flag.get()).toBe(true)
  })
})

describe("stored widths", () => {
  it("round-trips a pixel width and ignores junk", () => {
    expect(readStoredNumber("w")).toBeNull()
    writeStoredNumber("w", 287.6)
    expect(readStoredNumber("w")).toBe(288)
    localStorage.setItem("w", "nope")
    expect(readStoredNumber("w")).toBeNull()
  })
})
