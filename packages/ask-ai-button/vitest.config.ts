/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Per-package Vitest setup. Coverage is written to this package's own
// ./coverage/lcov.info so Codecov can flag it under "ask-ai-button".
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["{test,tests,src}/**/*.{test,spec}.{js,mjs,ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/*.config.*", "**/*.{test,spec}.*"],
    },
  },
});
