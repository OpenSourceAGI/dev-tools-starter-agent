/**
 * @file customize-docs.ts
 * @description Documentation configuration object and types.
 */
export const docsConfig: DocsConfig = {
  title: "git0",
  description: "Download Git Repo on Step Zero — search GitHub, download source & releases, install and open in your editor.",
  github: "https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/git0-repo-downloader",
  githubPackages: "https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages",
  githubDocs:
    "https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/git0-repo-downloader/docs/content/docs",
  favicon: "/favicon.ico",
  topLinks: [
    {
      text: "Docs",
      url: "/docs",
    },
    {
      text: "GitHub",
      url: "https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/git0-repo-downloader",
      external: true,
    },
  ],
};

export interface DocsConfig {
  /** The title of the documentation site */
  title?: string;
  /** A short description of the project */
  description?: string;
  /** URL to the GitHub repository */
  github?: string;
  /** Base URL for editing the docs pages on GitHub */
  githubDocs?: string;
  /** Base URL for the packages directory on GitHub */
  githubPackages?: string;
  /** Path to the favicon */
  favicon?: string;
  /** Path to the OpenAPI specification file */
  apiDocsPath?: string;
  /** Links to be displayed in the navigation bar */
  topLinks?: {
    text: string;
    url: string;
    external?: boolean;
  }[];
}
