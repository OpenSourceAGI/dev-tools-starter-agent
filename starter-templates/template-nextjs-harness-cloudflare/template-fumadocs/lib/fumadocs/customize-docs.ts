/**
 * @file customize-docs.ts
 * @description Documentation configuration object and types.
 */
export const docsConfig: DocsConfig = {
  title: "GRAB-URL",
  description: "📥 Generate Request to API from Browser",
  github: "https://github.com/vtempest/grab-url",
  githubPackages: "https://github.com/vtempest/grab-url/tree/master/packages",
  githubDocs:
    "https://github.com/vtempest/GRAB-URL/tree/master/docs/content/docs",
  favicon: "/favicon.ico",
  topLinks: [
    {
      text: "Docs",
      url: "/docs",
    },
    {
      text: "GitHub",
      url: "https://github.com/vtempest/grab-url",
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
  /** Base URL for document editing on GitHub */
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
