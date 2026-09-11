---
name: legal-terms-privacy-policy
description: Guide to packages/legal-terms-privacy-policy — the configurable Terms of Service + Privacy Policy page with two presentations of the same policy (a scannable card summary and the full legal text) and a switch between them. Covers the token substitutions, turning named parts on and off (AI clauses, CCPA, COPPA, cookies), adding/removing/reordering/rewriting sections, the block types, the React props, the Markdown/HTML/text renderers, the CLI, and wiring it into a Next.js app. Use when adding or editing a terms or privacy page, replacing a hand-written legal page, changing which clauses a product publishes, or troubleshooting one — a `{{token}}` showing through, a section that won't disappear, cards rendering as plain text, or a Next build that can't parse the package.
---

# Working With legal-terms-privacy-policy

One legal document, two presentations, everything configurable. `packages/legal-terms-privacy-policy` replaces the hand-written terms pages that used to be copy-pasted between apps — QwkSearch, Debate AI, AI Broker, Grab URL and Rights Institute all render from it now.

**The two variants are the same policy at different depths:**

- `summary` — the card-and-icon layout from [rights.institute/terms-privacy](https://rights.institute/terms-privacy). Plain language, scannable, 13 sections.
- `full` — the long-form legal text from the QwkSearch and Debate AI pages. 18 sections with numbered subsections, the CCPA notice, the AI Ethical Use Policy.

Default is `full` in the renderers and `summary` in the React component (the switch is right there, so readers who want the binding text are one click away).

## Setup

```tsx
import { LegalTermsPrivacyPolicy } from 'legal-terms-privacy-policy/react';

export default function TermsPage() {
  return (
    <LegalTermsPrivacyPolicy
      appName="QwkSearch"
      contactEmail="legal@qwksearch.com"
      lastRevisedDate="March 1, 2026"
      homeUrl="/"
      defaultVariant="full"
    />
  );
}
```

Two things that bite on first install:

1. **The package ships TypeScript source**, like the rest of this monorepo. A Next.js app needs it in `transpilePackages` or the build fails parsing JSX in `node_modules`:
   ```js
   // next.config.js
   export default { transpilePackages: ['legal-terms-privacy-policy'] };
   ```
2. **Import the React page from `/react`**, not the package root. The root export is deliberately free of `react` and `lucide-react` so a worker, a build script or the CLI can render the policy without pulling in a UI framework.

`react` and `lucide-react` are optional peers. The component is Tailwind-styled and already handles dark mode; it needs no wrapper, provider or stylesheet.

## Picking the right knob

| You want | Use |
| --- | --- |
| The product's name, email, dates in the text | Token props: `appName`, `contactEmail`, `lastRevisedDate`, … |
| No AI clauses at all (product has no model) | `parts={{ ai: false }}` |
| No California / COPPA / cookie notice | `parts={{ california: false, children: false, cookies: false }}` |
| Drop one specific clause | `exclude={['social-features']}` |
| Publish a cut-down page with only a few clauses | `include={['introduction', 'privacy-policy', 'contact']}` |
| Rewrite one section's body, keep its title and icon | `replace={{ contact: { blocks: [...] } }}` |
| Add your own clause (arbitration, broker disclosures) | `add={[{ after: 'termination', section: {...} }]}` |
| A different section order | `order={['introduction', 'privacy-policy', ...]}` |
| Only one presentation, no switch | `variant="full"` + `features={{ variantSwitch: false }}` |
| The variant in the URL | `variant` + `onVariantChange` (controlled) |
| No React at all | `renderMarkdown` / `renderHtml` / `renderText` from the root |

## Tokens

The legal text carries `{{token}}` placeholders, filled by props of the same name.

| Token | Default | Where it shows |
| --- | --- | --- |
| `appName` | `"Our Service"` | Throughout |
| `companyName` | falls back to `appName` | Liability, contact, footer |
| `contactEmail` | `"legal@example.com"` | Accounts, retention, contact |
| `homeUrl` | `"/"` | The "Back to Home" link |
| `lastRevisedDate` | `"January 1, 2025"` | Under the title |
| `effectiveDate` | falls back to `lastRevisedDate` | Under the title, when it differs |
| `jurisdiction` | `"the United States"` | Introduction |
| `minimumAge` | `18` | Acceptance of Terms (summary) |
| `childrenAge` | `13` | Children's Privacy |
| `dataDeletionDays` | `30` | Data Security and Retention |

Custom placeholders for your own sections go in `tokens={{ brokerName: 'Alpaca' }}`.

**An unknown token is left visible** — `{{appNmae}}` renders as `{{appNmae}}` rather than an empty string. That is deliberate: a typo in a token should be obvious on the page, not silently delete a clause. If you see braces on a published page, a token name is wrong.

## Parts vs. section ids

Two levels of granularity, and they compose — `parts` first, then `include`, then `exclude`.

`parts` switches a named group of clauses:

| Part | Covers |
| --- | --- |
| `core` | Introduction, changes, accounts, use, materials, feedback, warranties, termination, contact |
| `ai` | The Artificial Intelligence Ethical Use Policy and its four sub-policies |
| `privacy` | Collection, use and disclosure of personal data |
| `cookies` | Cookies, tracking technologies, Do Not Track |
| `california` | The CCPA/CPRA resident notice and its three subsections |
| `children` | The COPPA under-13 notice |
| `security` | Security measures and data retention |
| `thirdParty` | Third-party links and social features |

**`core` cannot be switched off.** `parts={{ core: false }}` is ignored rather than erroring — a document without it is not a document.

`include` and `exclude` work by section id and reach subsections:

- Naming a **parent** keeps its whole subtree — `include={['ai-ethics']}` is the section *and* its four sub-policies, not an empty heading.
- Naming only a **child** keeps the parent as its heading — `include={['california-rights']}` renders that subsection under "California Residents" rather than orphaning it.
- `exclude` still applies inside an included parent, so the two compose.

To see the ids for either variant:

```sh
npx legal-terms-privacy-policy --list-sections --variant full
```

## Writing your own sections

A section is data, not JSX, so it renders in every format:

```tsx
add={[{
  after: 'termination',
  section: {
    id: 'arbitration',
    title: 'Arbitration and Governing Law',
    icon: 'Scale',            // any lucide name
    accent: 'slate',          // tints the summary card
    blocks: [
      { type: 'p', text: 'Disputes with {{companyName}} are resolved by binding arbitration.' },
      { type: 'ul', lead: 'Exceptions:', items: ['Small claims court', 'Injunctive relief'] },
    ],
  },
}]}
```

| Block | Shape | Summary variant | Full variant |
| --- | --- | --- | --- |
| `p` | `{ type: 'p', text, strong? }` | paragraph | paragraph |
| `ol` / `ul` | `{ type, lead?, items }` | list | list |
| `cards` | `{ type: 'cards', columns?: 1-4, center?, items: [{ title, text?, items?, icon? }] }` | tinted tile grid | headings + lists |
| `note` | `{ type: 'note', title?, text?, items?, icon? }` | callout box | heading + body |

List items are strings, or `{ text, items }` for one nested level (the `a. b. c.` sub-lists in the CCPA "Right to Know" clause).

Caller text is interpolated too, so `{{appName}}` works in your own sections. Anchors: `after`, `before`, or `at` (an index); with none of them the section is appended.

## Rendering without React

```ts
import { renderMarkdown, renderHtml, renderText, resolveLegalDoc, LEGAL_CSS }
  from 'legal-terms-privacy-policy';

renderMarkdown({ appName: 'Acme' });                   // TERMS.md, an MDX docs page
renderHtml({ appName: 'Acme' }, { standalone: true }); // complete styled page
renderText({ appName: 'Acme' });                       // email, in-app agreement dialog
resolveLegalDoc({ appName: 'Acme' }).sections;         // the resolved tree, render it yourself
```

The HTML renderer escapes interpolated values and links bare emails and URLs. `LEGAL_CSS` is exported for pairing with the non-standalone fragment.

## CLI

```sh
# Generate a repo's TERMS.md
npx legal-terms-privacy-policy --app-name Acme --variant full > TERMS.md

# A static page with the AI and California clauses dropped
npx legal-terms-privacy-policy --app-name Acme --contact-email legal@acme.com \
  --format html --standalone --no-part ai --no-part california > terms.html

# What changed when I flipped a config?
npx legal-terms-privacy-policy --app-name Acme --format json | jq '.sections[].id'
```

`--format` takes `markdown`, `html`, `text`, `json`. `--no-part`/`--part`, `--include`, `--exclude` are repeatable. `--help` lists everything.

The bin runs under plain `node` (22.6+) — `cli.mjs` registers `ts-loader.mjs`, a resolve hook that retries extensionless relative imports as `.ts`, and Node strips the types itself.

## Keeping the two variants honest

The summary restates; the full text binds. **Edit one, edit the other** — `src/content/summary.ts` and `src/content/full.ts`. A summary claiming something the full text does not support is the specific failure this package is shaped to avoid, which is why `variantSwitch` defaults on and both variants ship together.

When a product's policy genuinely differs from the boilerplate (a broker's disclosures, a data processor's subprocessor list), put it in `add`/`replace` in that app rather than editing the shared content — the shared files are what every other app renders.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Next build fails parsing JSX inside `node_modules` | Package ships TS source | Add `transpilePackages: ['legal-terms-privacy-policy']` to `next.config.js` |
| `{{someToken}}` visible on the page | Token name doesn't match a prop | Check spelling against the token table; custom ones go in `tokens={{ … }}` |
| A section won't disappear | Its `part` is `core`, or you named a `part` where an id was needed | `core` is unremovable; use `exclude={['id']}` for a single section |
| `include` drops a subsection's parent heading | Only the child was named — this is intended | Nothing to fix; name the parent too if you want its intro blocks |
| Cards render as plain headings and lists | Full-text variant flattens card blocks by design | Use `variant="summary"`, or write the content as `p`/`ol` blocks |
| Icon missing or wrong glyph | Unknown lucide name — falls back to a document icon | Check the name at lucide.dev, or pass a component via `icons={{ MyIcon }}` |
| `useState`/`useEffect` error in a Server Component | The page is interactive | The component already carries `'use client'`; make sure your route isn't re-exporting it through a server-only boundary |
| Clipboard button does nothing | Clipboard API blocked in an iframe or insecure origin | Expected; the email is still selectable. `features={{ copyButtons: false }}` to hide it |
| Dates disagree between apps | Each app passes its own `lastRevisedDate` | Update the prop where the page lives, not the package |

## Where it's wired

| Repo | Page |
| --- | --- |
| `rights-institute` | `app/terms-privacy/page.tsx` — both variants, switch on |
| `qwksearch-research-agent` | `apps/qwksearch-web/app/legal/privacy/page.tsx` |
| `debate-ai.com` | `apps/debate-ai.com/app/legal/privacy/page.tsx`, and the practice-vs-AI frontend's `TermsOfService`/`PrivacyPolicy` pages |
| `ai-broker-investing-agent` | `apps/ai-broker-web/app/legal/{terms,privacy}/page.tsx` |
| `GRAB-URL` | `grab-help-docs/app/(home)/legal/terms-privacy/page.tsx` — AI clauses off |

Change the shared text and every one of them moves. That is the point — and the reason to think twice before editing `src/content/*`.
