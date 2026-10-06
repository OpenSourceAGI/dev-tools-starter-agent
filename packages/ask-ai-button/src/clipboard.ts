/**
 * @file clipboard.ts
 * @description Fetching a page's Markdown and copying text, with the fallbacks
 * older browsers and insecure origins need.
 */

const markdownCache = new Map<string, Promise<string>>();

/**
 * Fetch a page's raw Markdown once and reuse it. A failed fetch is evicted so
 * the next call retries.
 */
export function fetchMarkdown(url: string): Promise<string> {
  const cached = markdownCache.get(url);
  if (cached) return cached;
  const request = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
  });
  markdownCache.set(url, request);
  request.catch(() => markdownCache.delete(url));
  return request;
}

/** Forget every fetched page. Mostly for tests. */
export function clearMarkdownCache(): void {
  markdownCache.clear();
}

/**
 * Copy text to the clipboard. Uses the async Clipboard API where available and
 * falls back to a hidden textarea + `execCommand("copy")`.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context — try the legacy path.
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * Copy text that is still being fetched. Safari drops clipboard permission once
 * a click handler awaits, so where `ClipboardItem` exists the pending promise is
 * handed to the clipboard directly; elsewhere it is awaited and then copied.
 */
export async function copyPendingText(text: Promise<string>): Promise<boolean> {
  if (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.clipboard?.write
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })),
        }),
      ]);
      return true;
    } catch {
      // Fall through — the fetch itself may have failed, which rethrows below.
    }
  }
  return copyText(await text);
}
