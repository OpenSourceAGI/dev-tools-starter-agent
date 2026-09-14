/**
 * test-google-login — persist a Google sign-in once, reuse it everywhere.
 *
 * The Node/Playwright half of the package. The Cloudflare Workers half is a
 * separate entry point, `test-google-login/worker`, so that importing this one
 * never drags a Worker runtime into your test process (and vice versa).
 *
 * Start with {@link requireStoredSession} in a Playwright setup project, or
 * {@link bootstrapAppSession} if your app can mint its own test sessions — which
 * is the one to use in CI.
 *
 * @see README.md for the security boundary around the state file. It is short,
 *      and it is the most important part of this package.
 */
export type {
  ApplyStorageStateOptions,
  ApplyStorageStateResult,
} from "./puppeteer-state.js";
export type {
  PageLike,
  PuppeteerCookie,
  SameSite,
  StorageState,
  StorageStateCookie,
  StorageStateOrigin,
  StorageStateSummary,
} from "./types.js";
export type {
  BootstrapAppSessionOptions,
  ContextLike,
  GoogleSignInOptions,
  LocatorLike,
  PlaywrightPageLike,
  RequestLike,
  StoredSessionOptions,
} from "./google-login.js";
export type { CliIo } from "./cli.js";
export type { GitignoreResult, AuthFileOptions } from "./auth-file.js";

export {
  DEFAULT_AUTH_DIR,
  DEFAULT_AUTH_FILE,
  GITIGNORE_LINES,
  STATE_PATH_ENV,
  codegenCommand,
  ensureAuthDir,
  ensureGitignored,
  isIgnored,
  resolveAuthFile,
  writeAuthDirGitignore,
} from "./auth-file.js";

export {
  InvalidStorageStateError,
  MissingStorageStateError,
  SESSION_COOKIE_EXPIRES,
  assertStorageStateUsable,
  findExpiringCookies,
  hardenStorageStateFile,
  isGoogleDomain,
  normalizeStorageState,
  parseStorageState,
  readStorageState,
  redactStorageState,
  summarizeStorageState,
  writeStorageState,
} from "./storage-state.js";

export {
  ALLOW_REAL_LOGIN_ENV,
  BOOTSTRAP_HEADER,
  bootstrapAppSession,
  loadStorageStateFor,
  realGoogleLoginEnabled,
  requireStoredSession,
  signInWithGoogle,
} from "./google-login.js";

export {
  applyLocalStorage,
  applyStorageState,
  extractStorageState,
  fromPuppeteerCookies,
  storageStateOrigins,
  toPuppeteerCookies,
} from "./puppeteer-state.js";

export { AUTH_HEADER, constantTimeEqual, isAuthorized } from "./secret.js";

export { parseArgs, runCli } from "./cli.js";
