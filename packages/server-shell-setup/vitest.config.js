// No package.json here on purpose: server-shell-setup is not a workspace, so
// run this with `npx vitest@3 run` from this directory (see the workflow).
export default {
  test: {
    include: ['test/**/*.test.js'],
    testTimeout: 60_000,
    // The E2E suite installs every component once in beforeAll.
    hookTimeout: 45 * 60_000,
  },
}
