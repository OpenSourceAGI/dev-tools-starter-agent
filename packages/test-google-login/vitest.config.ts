/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

// Per-package Vitest setup. Coverage is written to this package's own
// ./coverage/lcov.info so Codecov can flag it under "test-google-login".
//
// The suite never launches a browser: every function that touches a Playwright
// or Puppeteer object takes it as an argument, so the tests drive fakes. That is
// what keeps this package's own CI free of a browser download.
export default defineConfig({
  test: {
    environment: "node",
    include: ["{test,tests,src}/**/*.{test,spec}.{js,mjs,ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: ["src/**/*.ts"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.{test,spec}.*",
      ],
    },
  },
});
