/**
 * Minimal ESM resolve hook so `node cli.mjs` can load the package's
 * TypeScript sources directly.
 *
 * The sources use extensionless relative imports (`./resolve`) because that is
 * what Next, Vite and Vitest expect from a package that ships TS rather than a
 * build output. Node's own resolver requires an extension, so this hook retries
 * failed relative specifiers with `.ts`, `.tsx` and `/index.ts`.
 *
 * Node still does the type stripping — this only fixes resolution — so it needs
 * Node 22.6+ (type stripping on by default from 22.18).
 */
const CANDIDATES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('.') && !specifier.startsWith('file:')) {
    return nextResolve(specifier, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    for (const extension of CANDIDATES) {
      try {
        return await nextResolve(specifier + extension, context);
      } catch {
        // Try the next candidate; rethrow the original error if none resolve.
      }
    }
    throw error;
  }
}
