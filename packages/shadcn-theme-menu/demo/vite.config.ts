import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const pkgSrc = path.resolve(__dirname, '../src')

/**
 * The demo consumes the package from source, which sits outside this Vite root
 * and has no `node_modules` of its own. Node resolution therefore can't find the
 * bare imports that source makes — `next-themes`, `lucide-react`, `@radix-ui/*`
 * and friends — even though the demo installed every one of them.
 *
 * Re-resolve those specifiers as if they had been imported by the demo itself.
 * Doing it here rather than as a list of aliases means a new dependency in the
 * package needs nothing more than an entry in the demo's package.json.
 */
function resolvePackageImportsFromDemo(): Plugin {
  const demoRootImporter = path.resolve(__dirname, 'index.html')

  return {
    name: 'demo:resolve-package-imports',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !importer.startsWith(pkgSrc)) return null
      if (source.startsWith('.') || path.isAbsolute(source)) return null

      const resolved = await this.resolve(source, demoRootImporter, { ...options, skipSelf: true })
      return resolved ?? null
    },
  }
}

export default defineConfig({
  plugins: [resolvePackageImportsFromDemo(), react(), tailwindcss()],
  resolve: {
    // Array form: order matters, the `/themes.css` subpath has to win over the
    // bare-specifier entry below it.
    alias: [
      // Mirror the published `exports` map so every import in this demo reads
      // exactly like consumer code, while resolving to the local source.
      { find: 'shadcn-theme-menu/themes.css', replacement: path.join(pkgSrc, 'themes-shadcn.css') },
      { find: /^shadcn-theme-menu$/, replacement: path.join(pkgSrc, 'index.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3001,
  },
})
