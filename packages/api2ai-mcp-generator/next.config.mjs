import { createMDX } from 'fumadocs-mdx/next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['indicatorts'],
  serverExternalPackages: [
    'dukascopy-node',
    'fastest-validator',
    'ts-morph',
    'typescript',
    'oxc-transform',
    'twoslash',
    'twoslash-protocol',
    'shiki',
  ],
  reactStrictMode: true,
  // Next 16 builds with Turbopack by default and reads this at the top level;
  // `experimental.turbo` is no longer a recognised key and is ignored with a
  // warning, which would have dropped the alias below on every build.
  turbopack: {
    resolveAlias: {
      'fumadocs-mdx:collections/server': path.resolve(__dirname, '.source/server.ts'),
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'fumadocs-mdx:collections/server': path.resolve(__dirname, '.source/server.ts'),
      }
    }
    return config
  },
}

export default withMDX(nextConfig)
