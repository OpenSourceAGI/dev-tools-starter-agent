import { createMDX } from 'fumadocs-mdx/next';
import { resolve } from 'path';

const withMDX = createMDX({});

type MDXNextConfig = NonNullable<Parameters<typeof withMDX>[0]>;

export const config = {
  // output: 'export',
  // distDir: './dist',
  transpilePackages: ['code-graph'],
  serverExternalPackages: [],
  turbopack: {
    root: resolve(import.meta.dirname, '.'),
    resolveAlias: {
      // react-reason-editor's voice dictation dependency can't be bundled; see the stub.
      '@moonshine-ai/moonshine-js': './lib/doc-edits/moonshine-stub.ts',
    },
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/docs/llms.mdx/docs/:path*',
      },
    ];
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
    unoptimized: true,
  },
} satisfies MDXNextConfig;
export default withMDX(config);
