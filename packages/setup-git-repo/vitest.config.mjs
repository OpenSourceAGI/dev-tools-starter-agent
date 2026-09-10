import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      // bin/ is the interactive shell around src/; the logic worth covering
      // lives in src/ and is exercised directly.
      include: ["src/**/*.mjs"],
    },
  },
});
