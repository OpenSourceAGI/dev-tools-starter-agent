import { defineConfig } from 'vitest/config';

/**
 * Root Vitest project registry.
 *
 * Vitest 4 dropped support for `vitest.workspace.ts`; if you still have one it
 * is silently ignored and a root `vitest run` falls back to globbing every test
 * file with no per-package settings. Declare projects here instead.
 *
 * The globs pick up any workspace package that has its own `vitest.config.*`,
 * which owns that package's environment, include globs and coverage scope. A
 * package on a different runner (bun test, jest, pytest) simply has no vitest
 * config and is left to its own `test:ci` script.
 */

/**
 * Vitest's HTML reporter ignores `outputFile` and writes `<outputDir>/index.html`
 * plus its UI bundle, where `outputDir` is a *reporter option* defaulting to
 * `.vitest`. A reporter named on the command line (`--reporter=html`) is
 * constructed without options and silently keeps that default — which is how a
 * deploy step comes to find `apps/test-reports/dist` missing. So the reporter
 * and its destination both have to be declared here.
 *
 * The report stays opt-in so a plain `vitest run` does not pay for copying the
 * UI bundle; `test:report` sets this to the directory Wrangler deploys.
 */
const htmlReportDir = process.env.VITEST_HTML_REPORT_DIR;

export default defineConfig({
  test: {
    reporters: htmlReportDir
      ? ['default', ['html', { outputDir: htmlReportDir }]]
      : ['default'],
    projects: ['packages/*', 'apps/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/.output/**',
        '**/coverage/**',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
});
