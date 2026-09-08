import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      include: ["src/**/*.ts", "webview-ui/src/bridge.ts", "webview-ui/src/protocol.ts"],
      // The vscode-facing modules need the editor host to exercise; the pure
      // transport and session logic under test is what can break silently.
      exclude: ["src/extension.ts", "src/panel.ts", "src/config.ts", "src/auth.ts"],
    },
  },
});
