<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/legal-terms-privacy-policy"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/legal-terms-privacy-policy"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/legal-terms"><img src="https://img.shields.io/npm/dm/legal-terms.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/legal-terms"><img src="https://img.shields.io/npm/v/legal-terms.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/legal-terms"><img src="https://img.shields.io/npm/dt/legal-terms.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/legal-terms"><img src="https://img.shields.io/npm/types/legal-terms" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=legal-terms"><img src="https://packagephobia.com/badge?p=legal-terms" alt="Install size" /></a>
    <a href="https://app.codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/flags"><img src="https://img.shields.io/codecov/c/github/OpenSourceAGI/dev-tools-starter-agent?flag=legal-terms-privacy-policy&label=legal-terms-privacy-policy%20coverage&logo=codecov&logoColor=white" alt="Coverage" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill legal-terms-privacy-policy` ([what it covers](../../skills/legal-terms-privacy-policy/SKILL.md))
<!-- skills:install:end -->

# legal-terms-privacy-policy

One combined **Terms of Service + Privacy Policy**, in two presentations of the same policy, with every section addable, removable and reorderable from config.

- **Summary** — the scannable card-and-icon layout published at [rights.institute/terms-privacy](https://rights.institute/terms-privacy).
- **Full text** — the long-form legal document published by QwkSearch, Debate AI and AI Broker.

Ship both and let readers switch between them, or pin a page to one. Nothing in the package needs editing to adopt it: the product name, contact address, dates, which clauses appear and in what order all come from props.

> Not legal advice. This is boilerplate to start from — have a lawyer review the text you publish.

## Install

```sh
npm install legal-terms-privacy-policy
```

The package ships TypeScript source rather than a build output, matching the other packages in this monorepo. In a Next.js app, add it to `transpilePackages`:

```js
// next.config.js
export default { transpilePackages: ['legal-terms-privacy-policy'] };
```

`react` and `lucide-react` are optional peers — needed only for the React page, not for the Markdown/HTML/text renderers or the CLI.

## React page

```tsx
import { LegalTermsPrivacyPolicy } from 'legal-terms-privacy-policy/react';

export default function TermsPage() {
  return (
    <LegalTermsPrivacyPolicy
      appName="QwkSearch"
      contactEmail="legal@qwksearch.com"
      lastRevisedDate="March 1, 2026"
      defaultVariant="full"
    />
  );
}
```

The component renders the whole page — back link, title, badges, revision date, the summary ⇄ full-text switch, section navigation and the body. It is Tailwind-styled and works in light and dark.

### Controlling the variant

Uncontrolled, the switch keeps its own state starting from `defaultVariant`. Pass `variant` and `onVariantChange` to drive it from the URL instead:

```tsx
'use client';
const [variant, setVariant] = useState<Variant>('summary');
<LegalTermsPrivacyPolicy variant={variant} onVariantChange={setVariant} appName="Acme" />;
```

To publish only one presentation, set `variant` and turn the switch off:

```tsx
<LegalTermsPrivacyPolicy appName="Acme" variant="full" features={{ variantSwitch: false }} />
```

## Configuration

Every option below works the same way in the React component, the renderers and the CLI.

### Values substituted into the text

The legal text carries `{{token}}` placeholders. Unknown tokens are left visible rather than blanked, so a typo shows up on the page instead of silently deleting a clause.

| Option | Default | Appears in |
| --- | --- | --- |
| `appName` | `"Our Service"` | Throughout |
| `companyName` | same as `appName` | Liability, contact, footer |
| `contactEmail` | `"legal@example.com"` | Accounts, retention, contact |
| `homeUrl` | `"/"` | "Back to Home" link |
| `lastRevisedDate` | `"January 1, 2025"` | Under the title |
| `effectiveDate` | same as `lastRevisedDate` | Under the title |
| `jurisdiction` | `"the United States"` | Introduction |
| `minimumAge` | `18` | Acceptance of Terms |
| `childrenAge` | `13` | Children's Privacy |
| `dataDeletionDays` | `30` | Data Security and Retention |
| `tokens` | `{}` | Extra placeholders for your own sections |

### Adding and removing parts

`parts` switches named groups of clauses on or off in one go:

```tsx
<LegalTermsPrivacyPolicy
  appName="Grab URL"
  parts={{ ai: false, california: false }}   // no model in the loop, no CA notice
/>
```

| Part | Covers |
| --- | --- |
| `core` | Introduction, changes, accounts, use, materials, feedback, warranties, termination, contact. Always on — switching it off is ignored. |
| `ai` | The Artificial Intelligence Ethical Use Policy and AI-specific clauses |
| `privacy` | Collection, use, disclosure and retention of personal data |
| `cookies` | Cookies, tracking technologies and Do Not Track |
| `california` | The CCPA/CPRA resident notice |
| `children` | The COPPA under-13 notice |
| `security` | Security measures and data retention |
| `thirdParty` | Third-party links and social features |

For finer control, work by section id — `include` keeps only what you name, `exclude` drops it, and both reach subsections:

```tsx
exclude={['social-features', 'california-selling']}
include={['introduction', 'privacy-policy', 'contact']}
```

Naming a parent in `include` keeps its whole subtree (`['ai-ethics']` is the section and its four sub-policies); naming only a child keeps the parent as its heading (`['california-rights']` renders under "California Residents"). `exclude` still applies inside an included parent.

Run `npx legal-terms-privacy-policy --list-sections` (add `--variant summary`) to see every id.

### Rewriting and adding sections

`replace` patches a section by id, merging over the built-in one — pass only the fields you are changing:

```tsx
replace={{
  contact: { blocks: [{ type: 'p', text: 'Write to {{companyName}}, 1 Main St.' }] },
  'california-selling': { title: 'We Do Not Sell Your Data' },
}}
```

`add` inserts your own sections, anchored to an existing one:

```tsx
add={[{
  after: 'termination',
  section: {
    id: 'arbitration',
    title: 'Arbitration and Governing Law',
    icon: 'Scale',
    accent: 'slate',
    blocks: [
      { type: 'p', text: 'Disputes with {{companyName}} are resolved by binding arbitration.' },
      { type: 'ul', lead: 'Exceptions:', items: ['Small claims court', 'Injunctive relief'] },
    ],
  },
}]}
```

Anchors are `after`, `before` or `at` (an index); with none of them, the section is appended. `order` puts named sections first, in the order given, and leaves the rest in place.

### Block types

Sections hold `blocks`, so caller-authored content renders in every format:

| Block | Shape |
| --- | --- |
| `p` | `{ type: 'p', text, strong? }` |
| `ol` / `ul` | `{ type: 'ol', lead?, items }` — items are strings or `{ text, items }` for one nested level |
| `cards` | `{ type: 'cards', columns?: 1-4, center?, items: [{ title, text?, items?, icon? }] }` |
| `note` | `{ type: 'note', title?, text?, items?, icon? }` |

Card and note blocks render as tinted tiles in the summary variant and flatten to headings and lists in the full-text variant, so you only write them once. `icon` names a [lucide](https://lucide.dev) icon; unknown names fall back to a document glyph, or pass your own components through the `icons` prop.

### Chrome

`features` toggles the page furniture: `backLink`, `sidebar`, `tableOfContents`, `copyButtons`, `badges`, `variantSwitch`, `footer`, `numbered`. `badges` (the array) sets the compliance pills — `['GDPR Compliant', 'CCPA Compliant', 'Cookie Policy']` by default; pass `[]` to drop them.

## Rendering without React

```ts
import { renderMarkdown, renderHtml, renderText, resolveLegalDoc } from 'legal-terms-privacy-policy';

const config = { appName: 'Acme', contactEmail: 'legal@acme.com', parts: { ai: false } };

renderMarkdown(config);                      // TERMS.md, MDX docs page
renderHtml(config, { standalone: true });    // complete styled page
renderText(config);                          // email, CLI, in-app agreement dialog
resolveLegalDoc(config).sections;            // the resolved tree, to render yourself
```

`LEGAL_CSS` is exported for pairing with the HTML fragment. Interpolated values are HTML-escaped, and emails and URLs in the text become links.

## CLI

```sh
npx legal-terms-privacy-policy --app-name Acme --variant full > TERMS.md

npx legal-terms-privacy-policy \
  --app-name Acme --contact-email legal@acme.com \
  --format html --standalone \
  --no-part california --exclude social-features > terms.html

npx legal-terms-privacy-policy --list-sections --variant summary
```

`--format` takes `markdown`, `html`, `text` or `json`. Run `--help` for the full list.

## Keeping the two variants honest

The summary is a plain-language restatement; the full text is what binds. If you edit one, edit the other — `src/content/summary.ts` and `src/content/full.ts` are the two files to keep in step. Publishing a summary whose claims the full text does not support is the failure mode this package is shaped to avoid, which is why the switch is on by default.

## Tests

```sh
npm test
```

Covers token substitution, part and id filtering, patching, insertion, ordering, and each renderer — including that neither variant ships an unsubstituted `{{token}}` and that interpolated values cannot inject markup.

## License

[PROSPER 1.0.0](https://rights.institute/prosper)
