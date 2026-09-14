/**
 * The badge catalog: the README badge row, as data.
 *
 * Modeled on the header of OpenSourceAGI/qwksearch-research-agent, which is
 * where this set was worked out. Each entry knows three things a hand-written
 * `<img>` tag does not:
 *
 *   needs   the context it cannot render without (an npm package name, a
 *           Discord server id, a DOI). A badge whose inputs are missing is
 *           left out instead of shipping a README with a broken image.
 *   setup   what a human has to do outside this repo to make it real, which is
 *           the part every badge README omits. `docs/BADGES.md` is generated
 *           from these strings, so the docs cannot drift from the catalog.
 *   group   which line of the badge block it belongs on. See `GROUPS` below
 *           for what each row carries and why the split falls where it does.
 *
 * Adding a badge means adding an entry here — nothing else in the package
 * needs to know about it.
 */

/**
 * Row order in the rendered block, and what each row is for.
 *
 * The split is by the question a reader is asking, not by where the badge is
 * hosted — which is why stars sits with the download counts rather than with
 * the PR queue, and why the sandbox buttons sit at the bottom next to the
 * stack chips instead of competing with the link to the live app.
 *
 *   identity   what this is and where to try it — DOI, wiki, app, docs, API,
 *              demo video, uptime, the one-click deploy button.
 *   quality    is it used and is it working — stars, npm downloads and version,
 *              install size, coverage, CI.
 *   community  is it alive and who is behind it — contributors, forks, issues,
 *              the PR queue, commit activity, chat.
 *   stack      run it yourself, and what it is built with — StackBlitz,
 *              Codespaces, PRs welcome, license, the tech chips.
 *
 * Row one earns the click, row two says whether the project is worth the
 * click, and the rest is for whoever is still reading. Twenty badges in one
 * run is a wall; four labelled rows reads.
 */
export const GROUPS = ['identity', 'quality', 'community', 'stack'];

/** @typedef {Record<string, string | undefined>} BadgeContext */

/**
 * `img.shields.io/badge/` takes its label, color and logo positionally, and
 * every literal `-` in a label has to be doubled. Getting that wrong produces a
 * badge that renders but says the wrong thing.
 *
 * @param {string} label
 * @param {string} color
 * @param {Record<string, string>} [params]
 * @returns {string}
 */
export function shieldsBadge(label, color, params = {}) {
  const encoded = encodeURIComponent(label.replaceAll('-', '--'));
  const query = new URLSearchParams(params).toString();
  return `https://img.shields.io/badge/${encoded}-${color}${query ? `?${query}` : ''}`;
}

/** @type {ReadonlyArray<{ id: string, title: string, group: string, needs: string[], alt: string, href: (c: BadgeContext) => string, img: (c: BadgeContext) => string, setup: string, height?: string }>} */
export const BADGES = [
  {
    id: 'doi',
    title: 'Zenodo DOI',
    group: 'identity',
    needs: ['doi'],
    alt: 'DOI',
    href: (c) => `https://doi.org/${c.doi}`,
    img: (c) => `https://zenodo.org/badge/DOI/${c.doi}.svg`,
    setup:
      'Sign in to zenodo.org with GitHub, flip this repository on under Account → GitHub, then publish a GitHub Release. Zenodo archives the release and mints a DOI. Use the *concept* DOI (the one that always resolves to the newest version), not the per-release DOI.',
  },
  {
    id: 'deepwiki',
    title: 'Ask DeepWiki',
    group: 'identity',
    needs: [],
    alt: 'Ask DeepWiki',
    href: (c) => `https://deepwiki.com/${c.repoSlug}`,
    img: () => 'https://deepwiki.com/badge.svg',
    setup:
      'Nothing to configure for a public repo — visit deepwiki.com/<owner>/<repo> once to trigger the first index. Private repos need the DeepWiki GitHub App installed.',
  },
  {
    id: 'website',
    title: 'Live app',
    group: 'identity',
    needs: ['websiteUrl'],
    alt: 'Website',
    href: (c) => c.websiteUrl,
    img: () =>
      shieldsBadge('App', 'blueviolet', { style: 'for-the-badge', logo: 'googlechrome', logoColor: 'white' }),
    setup:
      'The deployed thing, not the repo. It is first in the row on purpose: a visitor who can click through to a running app decides in seconds whether to read the rest. Static badge — nothing checks that the URL is up, which is what the uptime badge is for.',
    height: '20px',
  },
  {
    id: 'docs',
    title: 'Documentation',
    group: 'identity',
    needs: ['docsUrl'],
    alt: 'Documentation',
    href: (c) => c.docsUrl,
    img: () => shieldsBadge('Docs', 'blue', { logo: 'ReadTheDocs', logoColor: 'white' }),
    setup:
      'Point this at wherever your docs are actually hosted. This is a static shields.io badge — it says "Docs" whether or not the link works, so it is on you to keep the URL alive.',
  },
  {
    id: 'api',
    title: 'API reference',
    group: 'identity',
    needs: ['apiUrl'],
    alt: 'API',
    href: (c) => c.apiUrl,
    img: () => shieldsBadge('API', 'blue', { logo: 'fastapi', logoColor: 'white' }),
    setup: 'Point this at your OpenAPI / Swagger page. Static badge, same caveat as Docs.',
  },
  {
    id: 'youtube',
    title: 'YouTube demo',
    group: 'identity',
    needs: ['youtubeUrl'],
    alt: 'YouTube',
    href: (c) => c.youtubeUrl,
    img: () => shieldsBadge('YouTube', 'red', { style: 'for-the-badge', logo: 'youtube', logoColor: 'white' }),
    setup: 'A demo video does more for a README than three paragraphs. Any YouTube URL works.',
    height: '20px',
  },
  {
    id: 'uptime',
    title: 'Uptime',
    group: 'identity',
    needs: ['uptimeUrl'],
    alt: 'Uptime Status',
    href: (c) => c.uptimeUrl,
    img: () => shieldsBadge('Uptime-Status', 'brightgreen', { logo: 'uptimerobot', logoColor: 'white' }),
    setup:
      'Create a monitor at uptimerobot.com, then a public status page, and link the status page here. This is a static badge — it says "brightgreen" even while you are down. For a live one use the UptimeRobot shields endpoint with a read-only API key.',
  },
  {
    id: 'deploy-cloudflare',
    title: 'Deploy to Cloudflare Workers',
    group: 'identity',
    needs: ['cloudflareDeploy'],
    alt: 'Deploy to Cloudflare Workers',
    href: (c) => `https://deploy.workers.cloudflare.com/?url=https://github.com/${c.repoSlug}`,
    img: () => 'https://deploy.workers.cloudflare.com/button',
    setup:
      'The repo must contain a wrangler.toml (or wrangler.jsonc) at the path the button clones. Cloudflare forks the repo into the visitor\'s account and runs the build, so anything the build needs must come from `[vars]` or be prompted for — a build that requires a secret fails for every visitor.',
    height: '24px',
  },
  {
    id: 'stars',
    title: 'GitHub stars',
    group: 'quality',
    needs: [],
    alt: 'GitHub Stars',
    href: (c) => `https://github.com/${c.repoSlug}/stargazers`,
    img: (c) => `https://img.shields.io/github/stars/${c.repoSlug}`,
    setup: 'Nothing to configure. Public repos only — shields.io cannot read a private repo.',
  },
  {
    id: 'npm-downloads',
    title: 'npm monthly downloads',
    group: 'quality',
    needs: ['npmPackage'],
    alt: 'NPM Monthly Downloads',
    href: (c) => `https://www.npmjs.com/package/${c.npmPackage}`,
    img: (c) => `https://img.shields.io/npm/dm/${c.npmPackage}.svg`,
    setup:
      'Requires at least one published version. In a monorepo pick the package you want to advertise — the badge counts one package, not the workspace.',
  },
  {
    id: 'npm-version',
    title: 'npm version',
    group: 'quality',
    needs: ['npmPackage'],
    alt: 'npm version',
    href: (c) => `https://www.npmjs.com/package/${c.npmPackage}`,
    img: (c) => `https://img.shields.io/npm/v/${c.npmPackage}.svg`,
    setup: 'Shows the `latest` dist-tag. Publishing under a different tag will not move it.',
  },
  {
    id: 'npm-total-downloads',
    title: 'npm total downloads',
    group: 'quality',
    needs: ['npmPackage'],
    alt: 'NPM Total Downloads',
    href: (c) => `https://www.npmjs.com/package/${c.npmPackage}`,
    img: (c) => `https://img.shields.io/npm/dt/${c.npmPackage}.svg`,
    setup:
      'All-time downloads for one package. Worth pairing with the monthly count rather than showing alone: a large total and a flat month say different things, and only the monthly number tells you the project is still being installed.',
  },
  {
    id: 'npm-types',
    title: 'TypeScript types',
    group: 'quality',
    needs: ['npmPackage'],
    alt: 'TypeScript types',
    href: (c) => `https://www.npmjs.com/package/${c.npmPackage}`,
    img: (c) => `https://img.shields.io/npm/types/${c.npmPackage}`,
    setup:
      'Reads the published tarball: it says "TypeScript" when the manifest has a `types`/`typings` field pointing at a real `.d.ts`, and stays grey when the declarations were left out of `files`. Publish once and check it — this is the badge that catches a build that shipped JS without its types.',
  },
  {
    id: 'install-size',
    title: 'Install size',
    group: 'quality',
    needs: ['npmPackage'],
    alt: 'Install size',
    href: (c) => `https://packagephobia.com/result?p=${c.npmPackage}`,
    img: (c) => `https://packagephobia.com/badge?p=${c.npmPackage}`,
    setup:
      'Nothing to configure, but read what it measures: packagephobia reports what `npm install` writes to disk, dependencies included — not the bundled browser size. A package whose one dependency is an AWS SDK client looks enormous here and tree-shakes to very little in a bundler.',
  },
  {
    id: 'codecov',
    title: 'Code coverage',
    group: 'quality',
    needs: [],
    alt: 'Coverage',
    href: (c) => `https://codecov.io/gh/${c.repoSlug}`,
    img: (c) => `https://codecov.io/gh/${c.repoSlug}/graph/badge.svg`,
    setup:
      'Add the repo at codecov.io, copy its upload token into a CODECOV_TOKEN repository secret, and make sure a workflow uploads `coverage/lcov.info` (tests.yml does). Until the first successful upload the badge reads "unknown", which looks identical to a broken badge — check the Codecov dashboard, not the badge, when debugging.',
  },
  {
    id: 'codecov-flag',
    title: 'Coverage for one package',
    group: 'quality',
    needs: ['codecovFlag'],
    alt: 'Coverage',
    href: (c) => `https://app.codecov.io/gh/${c.repoSlug}/flags`,
    img: (c) =>
      `https://img.shields.io/codecov/c/github/${c.repoSlug}?flag=${encodeURIComponent(
        String(c.codecovFlag),
      )}&label=${encodeURIComponent(`${c.codecovFlag} coverage`)}&logo=codecov&logoColor=white`,
    setup:
      'The repo-wide number is the wrong one to put on a package README in a monorepo — it mixes in every other package. This one narrows to a single Codecov flag, so it needs that flag to exist: an entry under `flag_management.individual_flags` in codecov.yml, and an upload that passes `flags: <name>` (tests.yml does, from its matrix). The flag name has to match both exactly, or the badge reads "unknown" while the repo-wide badge looks fine.',
  },
  {
    id: 'workflow',
    title: 'CI status',
    group: 'quality',
    needs: ['workflowFile'],
    alt: 'CI status',
    href: (c) => `https://github.com/${c.repoSlug}/actions/workflows/${c.workflowFile}`,
    img: (c) =>
      `https://github.com/${c.repoSlug}/actions/workflows/${c.workflowFile}/badge.svg?branch=${c.defaultBranch}`,
    setup:
      'The filename must match the workflow file exactly, and `?branch=` must name your default branch — without it the badge shows the most recent run on *any* branch, so a failing feature branch reads as a broken main.',
  },
  {
    id: 'test-report',
    title: 'Hosted test report',
    group: 'quality',
    needs: ['testReportUrl'],
    alt: 'Test Report',
    href: (c) => c.testReportUrl,
    img: () => shieldsBadge('Test Report', 'brightgreen', { logo: 'vitest', logoColor: 'white' }),
    setup:
      'Backed by `.github/workflows/deploy-test-reports.yml`, which publishes the Vitest HTML reporter output to Cloudflare Workers on every push to the default branch. Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets.',
  },
  {
    id: 'contributors',
    title: 'Contributors',
    group: 'community',
    needs: [],
    alt: 'Contributors',
    href: (c) => `https://github.com/${c.repoSlug}/graphs/contributors`,
    img: (c) => `https://img.shields.io/github/contributors/${c.repoSlug}`,
    setup:
      'Nothing to configure, but it counts commit authors GitHub could match to an account — commits made with an unregistered email are attributed to nobody and do not appear here. Use `contributors-anon` instead if your history has many of those.',
  },
  {
    id: 'forks',
    title: 'GitHub forks',
    group: 'community',
    needs: [],
    alt: 'GitHub Forks',
    href: (c) => `https://github.com/${c.repoSlug}/forks`,
    img: (c) => `https://img.shields.io/github/forks/${c.repoSlug}`,
    setup:
      'Nothing to configure. Counts direct forks only, not forks of forks, so it undercounts a repo that has been forked along a chain. Public repos only.',
  },
  {
    id: 'issues',
    title: 'Open issues',
    group: 'community',
    needs: [],
    alt: 'GitHub Issues',
    href: (c) => `https://github.com/${c.repoSlug}/issues`,
    img: (c) => `https://img.shields.io/github/issues/${c.repoSlug}?logo=github`,
    setup:
      'Nothing to configure beyond having Issues enabled (Settings → Features). Read it as a work-in-flight number, not a defect count: shields.io asks GitHub Search, which counts pull requests as issues unless the badge path excludes them — this one uses the `/issues/` path, which already does.',
  },
  {
    id: 'pull-requests',
    title: 'Open pull requests',
    group: 'community',
    needs: [],
    alt: 'Open Pull Requests',
    href: (c) => `https://github.com/${c.repoSlug}/pulls`,
    img: (c) => `https://img.shields.io/github/issues-pr/${c.repoSlug}?logo=github&label=PRs`,
    setup:
      'Nothing to configure. Counts open PRs including drafts. Pair it with the merged count below — an open count alone reads the same whether the queue moves in a day or has been stuck for a year.',
  },
  {
    id: 'prs-merged',
    title: 'Merged pull requests',
    group: 'community',
    needs: [],
    alt: 'Merged Pull Requests',
    href: (c) => `https://github.com/${c.repoSlug}/pulls?q=is%3Apr+is%3Aclosed`,
    img: (c) =>
      `https://img.shields.io/github/issues-pr-closed/${c.repoSlug}?logo=github&label=PRs%20merged&color=8957e5`,
    setup:
      'Nothing to configure. shields.io has no "merged" endpoint — `issues-pr-closed` counts every PR that is no longer open, so PRs closed without merging are in this number too. On a repo that closes a lot of stale PRs, label it "PRs closed" instead of overstating what landed.',
  },
  {
    id: 'discussions',
    title: 'GitHub Discussions',
    group: 'community',
    needs: [],
    alt: 'GitHub Discussions',
    href: (c) => `https://github.com/${c.repoSlug}/discussions`,
    img: (c) => `https://img.shields.io/github/discussions/${c.repoSlug}`,
    setup:
      'Discussions has to be turned on (Settings → Features → Discussions) or the badge reads "repo not found" — which looks identical to a private repo. Turn it on before adding the badge, not after.',
  },
  {
    id: 'commit-activity',
    title: 'Commit activity',
    group: 'community',
    needs: [],
    alt: 'Commit activity',
    href: (c) => `https://github.com/${c.repoSlug}/graphs/contributors`,
    img: (c) => `https://img.shields.io/github/commit-activity/m/${c.repoSlug}`,
    setup: 'Nothing to configure. Commits per month — a quiet month reads as an abandoned project, which is worth knowing before you add it.',
  },
  {
    id: 'last-commit',
    title: 'Last commit',
    group: 'community',
    needs: [],
    alt: 'GitHub last commit',
    href: (c) => `https://github.com/${c.repoSlug}/commits/${c.defaultBranch}/`,
    img: (c) => `https://img.shields.io/github/last-commit/${c.repoSlug}.svg`,
    setup: 'Nothing to configure. Same caveat as commit activity.',
  },
  {
    id: 'discord',
    title: 'Discord',
    group: 'community',
    needs: ['discordId', 'discordInvite'],
    alt: 'Join Discord',
    href: (c) => c.discordInvite,
    img: (c) =>
      `https://img.shields.io/discord/${c.discordId}.svg?label=Chat&logo=Discord&colorB=7289da&style=flat`,
    setup:
      'Two different values: the numeric server id drives the online-member count (Server Settings → Widget → Enable Server Widget, then copy the Server ID), and the invite link is where the badge points. Without the widget enabled the badge reads "invite" instead of a count.',
  },
  {
    id: 'stackblitz',
    title: 'Open in StackBlitz',
    group: 'stack',
    needs: ['stackblitzUrl'],
    alt: 'Open in StackBlitz',
    href: (c) => c.stackblitzUrl,
    img: () => 'https://developer.stackblitz.com/img/open_in_stackblitz.svg',
    setup:
      'Nothing to configure — StackBlitz imports a public repo straight from a URL: `https://stackblitz.com/github/<owner>/<repo>/tree/<branch>/<path>`. Point it at a directory that boots on its own (a package with its own package.json, or an `examples/` folder), because StackBlitz installs from the manifest at that path and a bare monorepo root will not run. Node APIs need the WebContainer runtime, which means the directory must be ESM and its deps must be installable from npm.',
    height: '20px',
  },
  {
    id: 'codespaces',
    title: 'Open in GitHub Codespaces',
    group: 'stack',
    needs: [],
    alt: 'Open in GitHub Codespaces',
    href: (c) => `https://codespaces.new/${c.repoSlug}`,
    img: () => 'https://github.com/codespaces/badge.svg',
    setup:
      'Nothing to configure — the link boots the repo in a default container. Add a `.devcontainer/devcontainer.json` if the default image is missing something your install needs, because the visitor sees the failure, not you. Codespaces bills the visitor\'s own free hours, so the button costs you nothing.',
    height: '20px',
  },
  {
    id: 'prs-welcome',
    title: 'PRs welcome',
    group: 'stack',
    needs: [],
    alt: 'PRs Welcome',
    href: () =>
      'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request',
    img: () => shieldsBadge('PRs-welcome', 'brightgreen'),
    setup: 'Static. Worth backing with a CONTRIBUTING.md so the badge is not the only thing that says it.',
  },
  {
    id: 'license',
    title: 'License',
    group: 'stack',
    needs: [],
    alt: 'License',
    href: (c) => `https://github.com/${c.repoSlug}/blob/${c.defaultBranch}/LICENSE.md`,
    img: (c) => `https://img.shields.io/github/license/${c.repoSlug}`,
    setup:
      'Reads the license GitHub detected, which comes from a recognized LICENSE file at the repo root. A custom or modified license shows as "unknown" no matter what the file says.',
  },
  {
    id: 'stack',
    title: 'Tech stack chips',
    group: 'stack',
    needs: ['stack'],
    alt: 'Tech stack',
    href: () => '',
    img: () => '',
    setup:
      'Plain static shields with a simple-icons logo — `?logo=<slug>` accepts any slug from simpleicons.org. Purely decorative: they say what the project is built with at a glance. Pass a comma-separated list (e.g. `--stack Claude,Cloudflare,Next.js`).',
  },
];

/**
 * Brand colors for the stack chips, so the common ones look right by default.
 *
 * Keyed by the lowercased chip name. Anything not listed falls back to a
 * neutral grey, which is a perfectly good chip — this map is a nicety, not a
 * gate on what you can name.
 */
const STACK_COLORS = {
  claude: 'D97757',
  cloudflare: 'F38020',
  'cloudflare workers': 'F38020',
  d1: 'F38020',
  r2: 'F38020',
  wrangler: 'F38020',
  'next.js': 'black',
  react: '20232A',
  svelte: 'FF3E00',
  'vue.js': '4FC08D',
  typescript: '3178C6',
  javascript: 'F7DF1E',
  'node.js': '5FA04E',
  bun: '14151A',
  npm: 'CB3837',
  pnpm: 'F69220',
  turborepo: 'EF4444',
  vite: '646CFF',
  vitest: '6E9F18',
  jest: 'C21325',
  playwright: '2EAD33',
  biome: '60A5FA',
  vercel: 'black',
  postgresql: '4169E1',
  sqlite: '003B57',
  'drizzle orm': 'C5F74F',
  tailwindcss: '06B6D4',
  'tailwind css': '06B6D4',
  'shadcn/ui': '000000',
  'radix ui': '161618',
  'better-auth': '000000',
  hono: 'E36002',
  stripe: '635BFF',
  zod: '3E67B1',
  tauri: '24C8D8',
  electron: '47848F',
  prosemirror: '000000',
  tiptap: '000000',
  fumadocs: '000000',
  mcp: '000000',
  'vercel ai sdk': 'black',
  openai: '412991',
  python: '3776AB',
  docker: '2496ED',
  'github actions': '2088FF',
};

/**
 * simple-icons slugs for chips whose name does not reduce to one.
 *
 * `?logo=` takes a simpleicons.org slug, and the derivation below (lowercase,
 * drop dots, spaces and slashes) gets most of them right — `Next.js` really is
 * `nextjs`. It gets a handful wrong, and a wrong slug renders a chip with a
 * blank square where the logo should be, so those are written out.
 *
 * A name with no icon at all (`better-auth`, `MCP`) maps to the empty string:
 * the chip renders as plain text rather than carrying someone else's logo.
 */
const STACK_LOGOS = {
  'cloudflare workers': 'cloudflareworkers',
  d1: 'cloudflare',
  r2: 'cloudflare',
  'drizzle orm': 'drizzle',
  'tailwind css': 'tailwindcss',
  'vue.js': 'vuedotjs',
  'node.js': 'nodedotjs',
  'next.js': 'nextdotjs',
  'radix ui': 'radixui',
  'github actions': 'githubactions',
  'vercel ai sdk': 'vercel',
  claude: 'claude',
  'better-auth': '',
  mcp: '',
  prosemirror: '',
  fumadocs: '',
  zod: 'zod',
};

/**
 * @param {string} name
 * @returns {string} an `<img>` chip for one stack entry
 */
export function stackChip(name) {
  const label = name.trim();
  const key = label.toLowerCase();
  const color = STACK_COLORS[key] ?? '555555';
  const logo = STACK_LOGOS[key] ?? key.replace(/[.\s/]/g, '');

  const params = logo ? { logo, logoColor: 'white' } : {};
  return `<img src="${shieldsBadge(label, color, params)}" alt="${label}" />`;
}

/**
 * Which badges can render with the context available, and which cannot.
 *
 * Reporting the skipped ones is the point: a badge silently missing from the
 * README is indistinguishable from one you forgot to ask for.
 *
 * @param {BadgeContext} context
 * @param {{ only?: string[], exclude?: string[] }} [options]
 * @returns {{ included: typeof BADGES, skipped: { id: string, missing: string[] }[] }}
 */
export function selectBadges(context, options = {}) {
  const { only, exclude = [] } = options;

  const included = [];
  const skipped = [];

  for (const badge of BADGES) {
    if (only && !only.includes(badge.id)) continue;
    if (exclude.includes(badge.id)) continue;

    const missing = badge.needs.filter((key) => !context[key]);
    if (missing.length > 0) {
      skipped.push({ id: badge.id, missing });
      continue;
    }

    included.push(badge);
  }

  return { included, skipped };
}

/**
 * Render one badge as the `<a><img></a>` pair it becomes in the README.
 *
 * @param {typeof BADGES[number]} badge
 * @param {BadgeContext} context
 * @returns {string}
 */
export function renderBadge(badge, context) {
  if (badge.id === 'stack') {
    return String(context.stack)
      .split(',')
      .filter(Boolean)
      .map(stackChip)
      .join(' ');
  }

  const height = badge.height ? ` height="${badge.height}"` : '';
  const img = `<img${height} src="${badge.img(context)}" alt="${badge.alt}" />`;

  const href = badge.href(context);
  return href ? `<a href="${href}">${img}</a>` : img;
}

/**
 * The whole badge block, grouped one row per `GROUPS` entry.
 *
 * @param {BadgeContext} context
 * @param {{ only?: string[], exclude?: string[] }} [options]
 * @returns {{ markdown: string, skipped: { id: string, missing: string[] }[] }}
 */
export function renderBadgeBlock(context, options = {}) {
  const { included, skipped } = selectBadges(context, options);

  const rows = GROUPS.map((group) =>
    included
      .filter((badge) => badge.group === group)
      .map((badge) => `    ${renderBadge(badge, context)}`)
      .join('\n'),
  ).filter(Boolean);

  const markdown = ['<p align="center">', rows.join('\n    <br />\n'), '</p>'].join('\n');

  return { markdown, skipped };
}
