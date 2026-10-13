/** @vitest-environment jsdom */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ClipWireDemo } from "../src/demo"

// React 19 wants this for act() outside a test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom has no ResizeObserver; react-resizable-panels measures with one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  document.body.innerHTML = ""
})

const aside = () => container.querySelector("aside[data-sidebar=column]")!

function mount(ui: React.ReactNode) {
  act(() => root.render(ui))
}

describe("AppSidebar (ClipWire demo)", () => {
  it("server-renders expanded, with the brand, dock, tree and account row", () => {
    const html = renderToString(<ClipWireDemo storageKey="ssr" />)
    expect(html).toContain("ClipWire")
    expect(html).toContain('data-sidebar-dock="sidebar"')
    expect(html).toContain('aria-label="Collections"')
    expect(html).toContain("Rowan Patel")
    expect(html).not.toContain("data-collapsed")
  })

  it("Ctrl+B hides the column, remembers it, and floats the dock", () => {
    mount(<ClipWireDemo storageKey="kb" />)
    expect(aside().hasAttribute("data-collapsed")).toBe(false)

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }))
    })
    expect(aside().hasAttribute("data-collapsed")).toBe(true)
    expect(localStorage.getItem("kb-collapsed")).toBe("1")
    expect(container.querySelector("[data-sidebar-dock=floating]")).not.toBeNull()
    expect(container.querySelector('button[aria-label="Show sidebar"]')).not.toBeNull()

    act(() => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Show sidebar"]')!.click()
    })
    expect(aside().hasAttribute("data-collapsed")).toBe(false)
    expect(localStorage.getItem("kb-collapsed")).toBeNull()
  })

  it("leaves Ctrl+B alone inside text fields", () => {
    mount(<ClipWireDemo storageKey="kb-input" />)
    const input = container.querySelector("input")!
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }))
    })
    expect(aside().hasAttribute("data-collapsed")).toBe(false)
  })

  it("collapses to an icon rail in icon mode", () => {
    mount(<ClipWireDemo storageKey="rail" collapseMode="icon" />)
    act(() => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')!.click()
    })
    expect(aside().hasAttribute("data-rail")).toBe(true)
    expect(container.querySelector("[data-sidebar-dock=floating]")).toBeNull()
    // Labels are gone; section buttons remain, and one expands the column.
    expect(aside().textContent).not.toContain("Subscriptions")
    act(() => {
      aside().querySelector<HTMLButtonElement>('button[title="Shared"]')!.click()
    })
    expect(aside().hasAttribute("data-rail")).toBe(false)
    expect(aside().textContent).toContain("Shared with me")
  })

  it("starts collapsed when asked and nothing is stored", () => {
    mount(<ClipWireDemo storageKey="seed" defaultCollapsed />)
    expect(aside().hasAttribute("data-collapsed")).toBe(true)
  })

  it("navigates through the tree and the dock, keeping both highlighted", () => {
    mount(<ClipWireDemo storageKey="nav" />)
    act(() => {
      aside().querySelector<HTMLButtonElement>('a[href="#/news-top"][aria-expanded]')!.click()
    })
    act(() => {
      aside().querySelector<HTMLAnchorElement>('a[href="#/news-reading"]')!.click()
    })
    expect(container.querySelector("h1")!.textContent).toBe("Reading List")
    expect(aside().querySelector('[data-sidebar-dock=sidebar] [data-active]')!.getAttribute("aria-label")).toBe("News")

    act(() => {
      aside().querySelector<HTMLAnchorElement>('[data-sidebar-dock=sidebar] a[aria-label="Shared"]')!.click()
    })
    expect(container.querySelector("h1")!.textContent).toBe("Shared with me")
    expect(aside().querySelector('nav[aria-label="Navigation"] a[aria-current="page"]')!.textContent).toContain("Shared with me")
  })

  it("toggles a section heading without navigating", () => {
    mount(<ClipWireDemo storageKey="toggle" />)
    const heading = () => aside().querySelector<HTMLAnchorElement>('a[href="#/watch-feed"][aria-expanded]')!
    expect(heading().getAttribute("aria-expanded")).toBe("true")
    act(() => heading().click())
    expect(heading().getAttribute("aria-expanded")).toBe("false")
    expect(container.querySelector("h1")!.textContent).toBe("Home")
  })

  it("shows Sign in when signed out, and signs in from it", () => {
    mount(<ClipWireDemo storageKey="auth" signedOut />)
    const signIn = [...aside().querySelectorAll("button")].find((b) => b.textContent === "Sign in")!
    expect(signIn).toBeDefined()
    act(() => signIn.click())
    expect(aside().textContent).toContain("Rowan Patel")
  })
})
