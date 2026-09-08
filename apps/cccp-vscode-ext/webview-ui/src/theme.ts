import type { Bootstrap } from "./protocol";

/**
 * VS Code stamps the active theme kind onto `<body>` (`vscode-dark`,
 * `vscode-light`, `vscode-high-contrast`, `vscode-high-contrast-light`). CCCP's
 * palette switches on a `dark` class instead, so this mirrors one onto the other
 * -- on `<html>` rather than `<body>`, because Radix portals mount outside the
 * React root and still need the dark ancestor.
 */
export function applyTheme(bootstrap: Bootstrap): () => void {
  const apply = () => {
    const dark = bootstrap.followVsCodeTheme
      ? document.body.classList.contains("vscode-dark") ||
        document.body.classList.contains("vscode-high-contrast")
      : true;

    document.documentElement.classList.toggle("dark", dark);
  };

  apply();

  const observer = new MutationObserver(apply);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  return () => observer.disconnect();
}
