import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { NavTree, SidebarProvider } from "../src"
import { DEMO_SECTIONS } from "../src/demo/mock-data"

function render(activeItemId: string, accordion: "single" | "multiple" = "single") {
  return renderToStaticMarkup(
    <SidebarProvider collapseMode="none" activeItemId={activeItemId}>
      <NavTree sections={DEMO_SECTIONS} accordion={accordion} />
    </SidebarProvider>,
  )
}

describe("NavTree", () => {
  it("opens only the active row's section in single mode", () => {
    const html = render("news-reading")
    expect(html).toContain("Reading List")
    expect(html).not.toContain("For You")
    expect(html).not.toContain("All Clips")
  })

  it("marks exactly the active row as the current page", () => {
    const html = render("news-reading")
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-current="page"[^>]*>.*Reading List/)
  })

  it("opens the nested groups around a deep active row", () => {
    const html = render("col-climate-energy")
    expect(html).toContain("Energy Transition")
    expect(html).toContain("COP Coverage")
    expect(html).toContain('aria-label="Collapse Climate Policy"')
  })

  it("keeps closed sub-groups closed", () => {
    const html = render("news-top")
    expect(html).toContain('aria-label="Expand Sources"')
    expect(html).not.toContain("Wire Services")
  })

  it("stacks open-by-default sections in multiple mode", () => {
    const html = render("watch-feed", "multiple")
    expect(html).toContain("For You")
    expect(html).toContain("Top Stories")
    // Tools is defaultCollapsed.
    expect(html).not.toContain("Import Bookmarks")
  })

  it("shortens counts and draws badges", () => {
    const html = render("watch-feed")
    expect(html).toContain("1.5k")
    expect(render("news-top")).toContain("Live")
  })

  it("renders headings with a page as anchors so modifier clicks can open them", () => {
    const html = render("watch-feed")
    expect(html).toMatch(/<a href="#\/news-top" aria-expanded="false"/)
    // Collections has no page: a plain button.
    expect(html).toMatch(/<button type="button" aria-expanded="false"[^>]*>.*?Collections/)
  })

  it("uses the provider's renderLink for rows", () => {
    const html = renderToStaticMarkup(
      <SidebarProvider
        collapseMode="none"
        activeItemId="watch-feed"
        renderLink={({ href, children }) => <a data-router href={href}>{children}</a>}
      >
        <NavTree sections={DEMO_SECTIONS} />
      </SidebarProvider>,
    )
    expect(html).toContain('data-router="true" href="#/watch-later"')
  })
})
