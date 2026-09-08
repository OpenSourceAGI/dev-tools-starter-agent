/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Per-package Vitest setup. Coverage is written to this package's own
// ./coverage/lcov.info so Codecov can flag it under "shadcn-theme-menu".
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["{test,tests,src}/**/*.{test,spec}.{js,mjs,ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Infrastructure is in place before every package has a suite.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: [
        "src/**/*.{ts,tsx}",
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
