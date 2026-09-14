/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

// Per-package Vitest setup. Coverage is written to this package's own
// ./coverage/lcov.info so Codecov can flag it under "verify-phone-sms".
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["{test,tests,src}/**/*.{test,spec}.{js,mjs,ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./test/setup.ts"],
    mockReset: true,
    // Infrastructure is in place before every package has a suite.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: [
        "src/**/*.ts",
      ],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/coverage/**",
        "**/demo/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.{test,spec}.*",
        "**/*.template.*",
      ],
    },
  },
});
