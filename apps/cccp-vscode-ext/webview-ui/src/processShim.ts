/**
 * CCCP's `lib/constants` reads `process?.env?.NEXT_PUBLIC_*` for its defaults.
 * Optional chaining does not save a bare, undeclared `process` from throwing a
 * ReferenceError, so a stub is planted before anything imports that module.
 *
 * This file must be imported first in `main.tsx`.
 */
const globalScope = globalThis as Record<string, unknown>;

if (!globalScope.process) {
  globalScope.process = { env: {} };
}

export {};
