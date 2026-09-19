import { grab } from 'grab-api.js';
import chalk from 'chalk';
import gitUrlParse from 'git-url-parse';
import type { PlatformInfo, CategorizedRelease, SearchResult } from './types.js';
import { getCurrentPlatform } from './platform.js';
import { categorizeReleasesByPlatform, filterReleasesByPlatform } from './releases.js';
import { downloadRepo, downloadPackage } from './download.js';

/**
 * What the CLI was pointed at: a repository, and optionally one path inside it.
 */
export interface RepoTarget {
  /** Repository owner. */
  owner: string;
  /** Repository name. */
  name: string;
  /** Canonical `https://github.com/owner/name` URL. */
  href: string;
  /** Branch, tag or commit named by the URL, or `''`. */
  ref: string;
  /** Repository-relative path to limit the download to, or `''`. */
  subPath: string;
  /** `'blob'` when the path names a file, `'tree'` when a folder, `''` when unstated. */
  subPathType: string;
}

/**
 * Parses a GitHub reference — including one that points *into* a repository —
 * into the pieces a download needs.
 *
 * The deep forms are the ones people actually have in the clipboard. A link
 * copied out of the GitHub UI carries the branch and the path
 * (`/tree/main/packages/ui`, `/blob/main/src/index.ts`), and that is exactly
 * the scope the user is asking for, so it is read rather than thrown away and
 * the whole repository downloaded instead. The `owner/repo/path` shorthand is
 * handled separately from `git-url-parse`, which reads every leading segment of
 * a plain path as part of the owner.
 *
 * @param query - URL, shorthand, or an unrelated search string.
 * @returns A {@link RepoTarget}, or `false` when the input is not a GitHub
 *   reference (i.e. it should be treated as a search query).
 *
 * @example
 * parseTarget('https://github.com/debate/debate-ai.com/blob/master/.continue/agents/new-config.yaml');
 * // → { owner: 'debate', name: 'debate-ai.com', ref: 'master',
 * //     subPath: '.continue/agents/new-config.yaml', subPathType: 'blob', … }
 *
 * @example
 * parseTarget('facebook/react/packages/react-dom');
 * // → { owner: 'facebook', name: 'react', subPath: 'packages/react-dom', subPathType: '', … }
 *
 * parseTarget('react starter'); // → false
 */
export function parseTarget(query: string): RepoTarget | false {
  const looksLikeUrl =
    query.includes('github.com') ||
    query.startsWith('git@github.com:') ||
    query.startsWith('https://') ||
    query.startsWith('git://');

  if (!looksLikeUrl) {
    // `owner/repo`, optionally followed by a path into the repository.
    const shorthand = query.match(/^([\w-]+)\/([\w.-]+)(?:\/(.+))?$/);
    if (!shorthand) return false;

    const [, owner, name, subPath = ''] = shorthand;
    return {
      owner,
      name,
      href: `https://github.com/${owner}/${name}`,
      ref: '',
      subPath,
      subPathType: '',
    };
  }

  const parsed = gitUrlParse(query) as any;
  if (!parsed?.owner || !parsed?.name) return false;

  // Forks arrive with the fork chain in `owner`, e.g. "upstream/fork".
  const owner = parsed.owner.includes('/')
    ? parsed.owner.split('/').slice(-1)[0]
    : parsed.owner;

  return {
    owner,
    name: parsed.name,
    href: `https://github.com/${owner}/${parsed.name}`,
    ref: parsed.ref || '',
    subPath: parsed.filepath || '',
    subPathType: parsed.filepathtype || '',
  };
}

/**
 * GitHub API client for searching repositories, downloading source tarballs,
 * and fetching release assets.
 *
 * Internally uses a `grab` instance pre-configured with the GitHub base URL,
 * optional bearer token, and a 403 rate-limit handler.
 *
 * @example
 * const github = new GithubAPI({ token: process.env.GITHUB_TOKEN });
 * const repos  = await github.searchRepositories('nodejs template');
 * const dir    = await github.downloadRepo('facebook/react');
 */
class GithubAPI {
  /** Default number of repository search results returned per query. */
  static DEFAULT_RESULTS_PER_PAGE = 10;

  private callGithub: ReturnType<typeof grab.instance>;

  /**
   * Creates a new GithubAPI instance and initialises the underlying HTTP client.
   *
   * When no `token` is supplied the constructor falls back to the
   * `GITHUB_TOKEN` environment variable. Unauthenticated requests are
   * limited to 60/hour by GitHub; a token raises this to 5 000/hour.
   *
   * @param options.token   - GitHub personal access token.
   * @param options.debug   - Pass `true` to enable `grab` request logging.
   * @param options.baseURL - Override the GitHub REST API base URL
   *   (useful for GitHub Enterprise).
   */
  constructor(options: { token?: string; debug?: boolean; baseURL?: string } = {}) {
    const token = options.token || process.env.GITHUB_TOKEN;
    const debug = options.debug ?? false;
    const baseURL = options.baseURL || 'https://api.github.com';

    this.callGithub = grab.instance({
      debug,
      baseURL,
      timeout: 500,
      headers: token ? { Authorization: `token ${token}` } : {},
      onError: (error: string) => {
        if (error.includes('403')) {
          console.log(chalk.red(
            'Rate limit exceeded. Set the GITHUB_TOKEN env var.\n' +
            'Create a token at https://github.com/settings/personal-access-tokens/new'
          ));
          process.exit(1);
        }
      },
    });
  }

  /**
   * Downloads a GitHub repository as a tarball and extracts it locally.
   *
   * Delegates to {@link downloadRepo} in `download.ts`.
   * Falls back from the `master` branch to `main` when the first attempt fails.
   *
   * @param repo      - Full GitHub URL or `owner/repo` shorthand.
   * @param targetDir - Optional extraction folder name; defaults to the repo name.
   * @param options   - `subPath` / `subPathType` / `ref`, as produced by
   *   {@link parseTarget}, to download one folder of the repository.
   * @returns Absolute path of the extracted project directory.
   *
   * @example
   * const dir = await github.downloadRepo('https://github.com/vitejs/vite');
   * // → '/current/working/dir/vite'
   */
  async downloadRepo(
    repo: string,
    targetDir: string | null = null,
    options: { subPath?: string | null; subPathType?: string; ref?: string } = {}
  ): Promise<string> {
    return downloadRepo(this.callGithub, repo, targetDir, options);
  }

  /**
   * Searches GitHub repositories by name and enriches each result with
   * release availability information.
   *
   * Results are sorted by stars descending by default. When `getReleaseInfo`
   * is true (the default), the function fires one extra API request per result
   * to fetch release data — all requests run concurrently via `Promise.all`.
   *
   * @param query               - Search string matched against repository names.
   * @param options.perPage     - Maximum results (default {@link DEFAULT_RESULTS_PER_PAGE}).
   * @param options.sort        - GitHub sort field: `'stars'` | `'forks'` | `'updated'`.
   * @param options.order       - Sort direction: `'asc'` | `'desc'`.
   * @param options.getReleaseInfo - When `false`, skips the per-repo release fetch.
   * @returns Array of {@link SearchResult} objects ordered by `sort`/`order`.
   * @throws Re-throws any network or API error after logging it.
   *
   * @example
   * const repos = await github.searchRepositories('react starter');
   * repos.forEach(r => console.log(r.full_name, r.hasCompatibleReleases));
   */
  async searchRepositories(
    query: string,
    options: { perPage?: number; sort?: string; order?: string; getReleaseInfo?: boolean } = {}
  ): Promise<SearchResult[]> {
    const {
      perPage = GithubAPI.DEFAULT_RESULTS_PER_PAGE,
      sort = 'stars',
      order = 'desc',
      getReleaseInfo = true,
    } = options;

    try {
      const response = await this.callGithub('/search/repositories', {
        q: `${query} in:name`,
        sort,
        order,
        per_page: perPage,
      });

      if (response.error || !response.items) {
        console.log('No response');
        return [];
      }

      if (!getReleaseInfo) return response.items;

      return Promise.all(
        response.items.map(async (repo: SearchResult) => {
          const releases = await this.callGithub(
            `/repos/${repo.owner.login}/${repo.name}/releases`
          );
          const platform = getCurrentPlatform();

          return {
            ...repo,
            hasReleases: releases?.length > 0,
            hasCompatibleReleases: filterReleasesByPlatform(releases, platform).length > 0,
            releases: filterReleasesByPlatform(releases, platform),
            allReleases: categorizeReleasesByPlatform(releases),
          };
        })
      );
    } catch (error: any) {
      console.error(chalk.red('Search failed:'), error.message);
      throw error;
    }
  }

  /**
   * Downloads a single release asset binary to disk.
   *
   * Delegates to {@link downloadPackage} in `download.ts`.
   *
   * @param packageURL   - Direct HTTPS download URL for the asset.
   * @param downloadPath - Absolute local path to write the file to.
   * @returns The `downloadPath` on success.
   * @throws When the download request fails.
   */
  async downloadPackage(packageURL: string, downloadPath: string): Promise<string> {
    return downloadPackage(this.callGithub, packageURL, downloadPath);
  }

  /**
   * Parses a GitHub URL or `owner/repo` shorthand into a structured URL object.
   *
   * Accepts:
   * - Full HTTPS URLs: `https://github.com/owner/repo`
   * - SSH URLs: `git@github.com:owner/repo`
   * - Git protocol: `git://github.com/owner/repo`
   * - Shorthand: `owner/repo`
   *
   * @param query - The string to parse.
   * @returns A `git-url-parse` result object, or `false` when the input does
   *   not look like a GitHub reference.
   *
   * @example
   * github.parseURL('facebook/react');
   * // → { owner: 'facebook', name: 'react', href: 'https://github.com/facebook/react', … }
   *
   * github.parseURL('just a search query'); // → false
   */
  /**
   * Parses a GitHub reference into owner, repo, ref and sub-path.
   *
   * Delegates to {@link parseTarget}. Prefer this over {@link parseURL} for
   * anything that downloads — it is the one that understands `/tree/` and
   * `/blob/` links.
   *
   * @param query - URL, `owner/repo[/path]` shorthand, or a search string.
   * @returns A {@link RepoTarget}, or `false` for a search string.
   */
  parseTarget(query: string): RepoTarget | false {
    return parseTarget(query);
  }

  parseURL(query: string): ReturnType<typeof gitUrlParse> | false {
    if (
      query.includes('github.com') ||
      query.startsWith('git@github.com:') ||
      query.startsWith('https://') ||
      query.startsWith('git://')
    ) {
      return gitUrlParse(query);
    }
    if (/^[\w-]+\/[\w.-]+$/.test(query)) {
      return gitUrlParse(`https://github.com/${query}`);
    }
    return false;
  }

  /**
   * Returns normalized OS and CPU architecture for the current machine.
   *
   * Delegates to {@link getCurrentPlatform} from `platform.ts`.
   *
   * @returns {@link PlatformInfo} with canonical OS/arch strings.
   */
  getCurrentPlatform(): PlatformInfo {
    return getCurrentPlatform();
  }

  /**
   * Fetches all releases for a repo and categorizes their assets by platform.
   *
   * @param owner - GitHub username or organisation name.
   * @param repo  - Repository name.
   * @returns Array of {@link CategorizedRelease} objects, one per release that
   *   has at least one downloadable asset.
   *
   * @example
   * const releases = await github.getReleases('microsoft', 'vscode');
   */
  async getReleases(owner: string, repo: string): Promise<CategorizedRelease[]> {
    const releases = await this.callGithub(`/repos/${owner}/${repo}/releases`);
    return categorizeReleasesByPlatform(releases);
  }

  /**
   * Fetches releases that have at least one asset compatible with the current
   * operating system.
   *
   * @param owner - GitHub username or organisation name.
   * @param repo  - Repository name.
   * @returns Subset of {@link CategorizedRelease} objects compatible with the
   *   current platform (including `universal` assets).
   */
  async getCompatibleReleases(owner: string, repo: string): Promise<CategorizedRelease[]> {
    const releases = await this.callGithub(`/repos/${owner}/${repo}/releases`);
    return filterReleasesByPlatform(releases, getCurrentPlatform());
  }
}

export default GithubAPI;
