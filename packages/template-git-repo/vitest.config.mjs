import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    // junit.xml is what Codecov Test Analytics ingests; lcov is the coverage
    // half. tests.yml uploads both from every package.
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js', 'bin/**/*.js'],
    },
  },
});
