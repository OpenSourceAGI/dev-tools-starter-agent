import { createMDX } from 'fumadocs-mdx/next';
import { resolve } from 'path';

const withMDX = createMDX({
  // mdxOptions: {
  //   remarkImageOptions: {
  //     onError: "ignore", // or "hide"
  //   },
  // },
});

type MDXNextConfig = NonNullable<Parameters<typeof withMDX>[0]>;

export const config = {
  // output: 'export',
  // distDir: './dist',
  transpilePackages: ['code-graph'],
  serverExternalPackages: [],
  turbopack: {
    root: resolve(import.meta.dirname, '.'),
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
