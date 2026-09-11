#!/usr/bin/env node
/**
 * Print a configured Terms of Service + Privacy Policy as Markdown, HTML or
 * plain text — for a repo's `TERMS.md`, a static page, or a diff of what a
 * config change does to the policy text.
 *
 * @example
 * ```sh
 * npx legal-terms-privacy-policy --app-name Acme --variant full > TERMS.md
 * npx legal-terms-privacy-policy --app-name Acme --format html --standalone \
 *   --no-part california --exclude social-features > terms.html
 * ```
 */
import { register } from 'node:module';

register('./ts-loader.mjs', import.meta.url);

const { renderMarkdown, renderHtml, renderText, resolveLegalDoc } = await import(
  new URL('./src/index.ts', import.meta.url).href
);

const USAGE = `
legal-terms-privacy-policy — print a configurable Terms of Service + Privacy Policy

Usage:
  legal-terms-privacy-policy [options]

Document:
  --variant <summary|full>    Which presentation to print (default: full)
  --format <markdown|html|text|json>
                              Output format (default: markdown)
  --standalone                For --format html, emit a full page with styles

Values substituted into the text:
  --app-name <name>           Product name (default: Our Service)
  --company-name <name>       Legal entity (default: same as --app-name)
  --contact-email <email>     Address for legal and privacy requests
  --home-url <url>            Target of the "Back to Home" link
  --last-revised <date>       Revision date shown under the title
  --effective-date <date>     Effective date (default: same as --last-revised)
  --jurisdiction <region>     Region the Services are offered in
  --minimum-age <n>           Minimum age to hold an account
  --children-age <n>          COPPA age threshold
  --deletion-days <n>         Days to purge data after account deletion

Choosing what appears:
  --no-part <id>              Drop a named part; repeatable. One of:
                              ai, privacy, cookies, california, children,
                              security, thirdParty
  --part <id>                 Force a part back on; repeatable
  --include <id>              Keep only these section ids; repeatable
  --exclude <id>              Drop these section ids; repeatable
  --order <id,id,...>         Put these sections first, in this order
  --no-numbers                Do not number the full-text sections
  --title <text>              Override the document title

  --list-sections             Print the section ids of the chosen variant
  -h, --help                  Show this help
`.trim();

const PART_IDS = new Set([
  'ai',
  'privacy',
  'cookies',
  'california',
  'children',
  'security',
  'thirdParty',
]);

function parseArgs(argv) {
  const options = { parts: {}, include: [], exclude: [] };
  let format = 'markdown';
  let standalone = false;
  let listSections = false;

  /** Flags that take the next argv entry as their value. */
  const valueFlags = {
    '--variant': 'variant',
    '--app-name': 'appName',
    '--company-name': 'companyName',
    '--contact-email': 'contactEmail',
    '--home-url': 'homeUrl',
    '--last-revised': 'lastRevisedDate',
    '--effective-date': 'effectiveDate',
    '--jurisdiction': 'jurisdiction',
    '--minimum-age': 'minimumAge',
    '--children-age': 'childrenAge',
    '--deletion-days': 'dataDeletionDays',
    '--title': 'title',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    } else if (arg === '--list-sections') {
      listSections = true;
    } else if (arg === '--standalone') {
      standalone = true;
    } else if (arg === '--no-numbers') {
      options.features = { ...options.features, numbered: false };
    } else if (arg === '--format') {
      format = argv[++i];
    } else if (arg === '--no-part' || arg === '--part') {
      const id = argv[++i];
      if (!PART_IDS.has(id)) {
        console.error(`Unknown part "${id}". Expected one of: ${[...PART_IDS].join(', ')}`);
        process.exit(1);
      }
      options.parts[id] = arg === '--part';
    } else if (arg === '--include') {
      options.include.push(argv[++i]);
    } else if (arg === '--exclude') {
      options.exclude.push(argv[++i]);
    } else if (arg === '--order') {
      options.order = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (valueFlags[arg]) {
      options[valueFlags[arg]] = argv[++i];
    } else {
      console.error(`Unknown option "${arg}". Run with --help for usage.`);
      process.exit(1);
    }
  }
  return { options, format, standalone, listSections };
}

const { options, format, standalone, listSections } = parseArgs(process.argv.slice(2));

if (listSections) {
  const doc = resolveLegalDoc(options);
  for (const section of doc.sections) {
    console.log(section.id);
    for (const sub of section.subsections ?? []) console.log(`  ${sub.id}`);
  }
  process.exit(0);
}

switch (format) {
  case 'markdown':
  case 'md':
    process.stdout.write(renderMarkdown(options));
    break;
  case 'html':
    process.stdout.write(renderHtml(options, { standalone }) + '\n');
    break;
  case 'text':
  case 'txt':
    process.stdout.write(renderText(options));
    break;
  case 'json':
    process.stdout.write(JSON.stringify(resolveLegalDoc(options), null, 2) + '\n');
    break;
  default:
    console.error(`Unknown format "${format}". Expected markdown, html, text or json.`);
    process.exit(1);
}
