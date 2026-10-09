import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DownloadAppButton,
  OS,
  buildDeepLink,
  buildStoreUrl,
  getOS,
  platformMatchesOS,
  resolveHref,
  type Platform,
} from "../src";

const UAS = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  win: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  linux: "Mozilla/5.0 (X11; Linux x86_64)",
  other: "SomethingElse/1.0",
};

const withUA = (ua: string) => vi.stubGlobal("navigator", { userAgent: ua });

afterEach(() => vi.unstubAllGlobals());

describe("getOS", () => {
  it.each([
    [UAS.iphone, OS.iOS],
    [UAS.ipad, OS.iOS],
    [UAS.android, OS.Android],
    [UAS.mac, OS.macOS],
    [UAS.win, OS.Windows],
    [UAS.linux, OS.Linux],
    [UAS.other, OS.Unknown],
  ])("classifies %s", (ua, expected) => {
    withUA(ua);
    expect(getOS()).toBe(expected);
  });

  it("returns Unknown without a navigator (SSR)", () => {
    vi.stubGlobal("navigator", undefined);
    // `typeof undefined` is "undefined", matching the server-side guard.
    expect(getOS()).toBe(OS.Unknown);
  });
});

describe("platformMatchesOS", () => {
  const ext: Platform[] = ["chrome-extension", "chrome-extension-white"];

  it("matches native platforms to their own OS only", () => {
    expect(platformMatchesOS("ios", OS.iOS)).toBe(true);
    expect(platformMatchesOS("android", OS.iOS)).toBe(false);
    expect(platformMatchesOS("android", OS.Android)).toBe(true);
    expect(platformMatchesOS("macos", OS.macOS)).toBe(true);
    expect(platformMatchesOS("windows", OS.Windows)).toBe(true);
    expect(platformMatchesOS("linux", OS.Linux)).toBe(true);
    expect(platformMatchesOS("linux-snap", OS.Linux)).toBe(true);
    expect(platformMatchesOS("windows", OS.Linux)).toBe(false);
  });

  it("treats the Chrome extension as a match on desktop OSes only", () => {
    for (const p of ext) {
      expect(platformMatchesOS(p, OS.macOS)).toBe(true);
      expect(platformMatchesOS(p, OS.Windows)).toBe(true);
      expect(platformMatchesOS(p, OS.Linux)).toBe(true);
      expect(platformMatchesOS(p, OS.iOS)).toBe(false);
      expect(platformMatchesOS(p, OS.Android)).toBe(false);
    }
  });

  it("never matches an unknown OS", () => {
    expect(platformMatchesOS("ios", OS.Unknown)).toBe(false);
  });
});

describe("buildStoreUrl", () => {
  it("builds each platform URL", () => {
    expect(buildStoreUrl("ios", "123")).toBe("https://apps.apple.com/app/id123");
    expect(buildStoreUrl("macos", "com.x.app")).toBe("https://apps.apple.com/app/com.x.app");
    expect(buildStoreUrl("android", "com.x")).toBe("https://play.google.com/store/apps/details?id=com.x");
    expect(buildStoreUrl("chrome-extension", "abc")).toBe("https://chromewebstore.google.com/detail/abc");
    expect(buildStoreUrl("chrome-extension-white", "abc")).toBe("https://chromewebstore.google.com/detail/abc");
    expect(buildStoreUrl("windows", "9N")).toBe("https://apps.microsoft.com/detail/9N?rtc=1");
    expect(buildStoreUrl("linux-snap", "snappy")).toBe("https://snapcraft.io/snappy");
    expect(buildStoreUrl("linux", "x")).toBeNull();
  });
});

describe("buildDeepLink", () => {
  it("builds native deep links", () => {
    expect(buildDeepLink("ios", "123")).toBe("itms-apps://itunes.apple.com/app/id123");
    expect(buildDeepLink("ios", "com.x")).toBe("itms-apps://itunes.apple.com/app/com.x");
    expect(buildDeepLink("macos", "123")).toBe("macappstore://itunes.apple.com/app/id123");
    expect(buildDeepLink("macos", "com.x")).toBeNull();
    expect(buildDeepLink("android", "com.x")).toBe("market://details?id=com.x");
    expect(buildDeepLink("windows", "9N")).toBe("ms-windows-store://pdp/?productid=9N");
  });

  it("returns null where no deep link exists", () => {
    for (const p of ["chrome-extension", "chrome-extension-white", "linux-snap", "linux"] as Platform[]) {
      expect(buildDeepLink(p, "x")).toBeNull();
    }
  });
});

describe("resolveHref", () => {
  it("prefers the deep link on a matching OS", () => {
    expect(resolveHref("android", "com.x", OS.Android)).toBe("market://details?id=com.x");
  });

  it("falls back to the web URL on a different OS", () => {
    expect(resolveHref("android", "com.x", OS.Windows)).toBe("https://play.google.com/store/apps/details?id=com.x");
  });

  it("falls back to the web URL when the matching OS has no deep link", () => {
    expect(resolveHref("macos", "com.x", OS.macOS)).toBe("https://apps.apple.com/app/com.x");
  });

  it("returns '#' when there is no URL at all", () => {
    expect(resolveHref("linux", "x", OS.Linux)).toBe("#");
  });
});

describe("<DownloadAppButton />", () => {
  const render = (props: Record<string, unknown>) =>
    renderToStaticMarkup(createElement(DownloadAppButton, props as never));

  it("uses an explicit href and opens in a new tab by default", () => {
    withUA(UAS.other);
    const html = render({ platform: "ios", href: "https://example.com" });
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("height:56px");
  });

  it("resolves the href from appId and honours newTab/height/alt/className", () => {
    withUA(UAS.android);
    const html = render({
      platform: "android",
      appId: "com.x",
      newTab: false,
      height: 40,
      alt: "Get it",
      className: "extra",
    });
    expect(html).toContain('href="market://details?id=com.x"');
    expect(html).toContain('target="_self"');
    expect(html).not.toContain("noopener");
    expect(html).toContain("height:40px");
    expect(html).toContain('alt="Get it"');
    expect(html).toContain("extra");
  });

  it("falls back to '#' when neither href nor appId is supplied", () => {
    withUA(UAS.other);
    expect(render({ platform: "ios" })).toContain('href="#"');
  });

  it("highlights automatically only when the platform matches the OS", () => {
    withUA(UAS.android);
    expect(render({ platform: "android", appId: "a", autoHighlight: true })).toContain("ring-yellow-400");
    expect(render({ platform: "ios", appId: "1", autoHighlight: true })).not.toContain("ring-yellow-400");
    expect(render({ platform: "android", appId: "a" })).not.toContain("ring-yellow-400");
  });

  it("lets an explicit highlight override autoHighlight", () => {
    withUA(UAS.android);
    expect(render({ platform: "ios", appId: "1", highlight: true })).toContain("ring-yellow-400");
    expect(
      render({ platform: "android", appId: "a", autoHighlight: true, highlight: false }),
    ).not.toContain("ring-yellow-400");
  });
});
