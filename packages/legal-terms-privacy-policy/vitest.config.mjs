import { defineConfig } from 'vitest/config';

// Coverage is written to this package's own ./coverage/lcov.info so Codecov
// can flag it under "legal-terms-privacy-policy".
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
