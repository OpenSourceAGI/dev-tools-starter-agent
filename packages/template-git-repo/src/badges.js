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
 *   group   which line of the badge block it belongs on. Twenty badges in one
 *           run is a wall; four rows of five reads.
 *
 * Adding a badge means adding an entry here — nothing else in the package
 * needs to know about it.
 */

/** Row order in the rendered block. */
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
    group: 'community',
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
    id: 'uptime',
    title: 'Uptime',
    group: 'quality',
    needs: ['uptimeUrl'],
    alt: 'Uptime Status',
    href: (c) => c.uptimeUrl,
    img: () => shieldsBadge('Uptime-Status', 'brightgreen', { logo: 'uptimerobot', logoColor: 'white' }),
    setup:
      'Create a monitor at uptimerobot.com, then a public status page, and link the status page here. This is a static badge — it says "brightgreen" even while you are down. For a live one use the UptimeRobot shields endpoint with a read-only API key.',
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
    id: 'prs-welcome',
    title: 'PRs welcome',
    group: 'community',
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
    group: 'community',
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

/** Brand colors for the stack chips, so the common ones look right by default. */
const STACK_COLORS = {
  claude: 'D97757',
  cloudflare: 'F38020',
  'next.js': 'black',
  react: '20232A',
  typescript: '3178C6',
  bun: '14151A',
  vite: '646CFF',
  vercel: 'black',
  postgresql: '4169E1',
  tailwindcss: '06B6D4',
};

/**
 * @param {string} name
 * @returns {string} an `<img>` chip for one stack entry
 */
export function stackChip(name) {
  const key = name.trim().toLowerCase();
  const color = STACK_COLORS[key] ?? '555555';
  const logo = key.replace(/[.\s]/g, '');
  return `<img src="${shieldsBadge(name.trim(), color, { logo, logoColor: 'white' })}" alt="${name.trim()}" />`;
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
