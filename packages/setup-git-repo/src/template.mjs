import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Every optional badge in the template README carries a `<!-- badge:NAME -->`
 * marker at the start of its line. A badge whose value the user did not supply
 * would render as a broken image pointing at a literal `{{DOI}}`, so its whole
 * line is dropped; a badge that is kept has only its marker removed.
 *
 * Maps marker name -> the placeholders that badge needs to be renderable.
 */
export const OPTIONAL_BADGES = {
  doi: ["DOI"],
  docs: ["DOCS_URL"],
  api: ["API_URL"],
  youtube: ["YOUTUBE_URL"],
  npm: ["PACKAGE"],
  uptime: ["UPTIME_ID"],
  discord: ["DISCORD_ID", "DISCORD_INVITE"],
};

const BADGE_MARKER = /<!--\s*badge:([a-z0-9-]+)\s*-->/i;

/** Badge names whose placeholders all have a non-empty value. */
export function configuredBadges(values) {
  return new Set(
    Object.entries(OPTIONAL_BADGES)
      .filter(([, keys]) => keys.every((k) => typeof values[k] === "string" && values[k].trim() !== ""))
      .map(([name]) => name),
  );
}

/**
 * Drop the lines of unconfigured badges and strip markers from the rest.
 *
 * Operates line by line, which is why the template keeps one `<a>` per line.
 */
export function applyBadges(content, values) {
  const keep = configuredBadges(values);
  const out = [];

  for (const line of content.split("\n")) {
    const match = line.match(BADGE_MARKER);
    if (!match) {
      out.push(line);
      continue;
    }
    if (!keep.has(match[1].toLowerCase())) continue;
    // Normalize indentation: the marker sits at column 0, but the badge
    // lines around it are indented, and the block is read by humans.
    out.push(`    ${line.replace(BADGE_MARKER, "").trimStart()}`);
  }

  return out.join("\n");
}

/**
 * Replace every `{{KEY}}` with its value.
 *
 * An unknown or empty key is left as-is rather than replaced with an empty
 * string: a visible `{{THING}}` in the output is a bug you notice, whereas a
 * silent blank in a URL is one you ship.
 */
export function substitute(content, values) {
  return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (whole, key) => {
    const value = values[key];
    return typeof value === "string" && value.trim() !== "" ? value : whole;
  });
}

/** Render one template file: badge pruning first, then placeholders. */
export function render(content, values) {
  return substitute(applyBadges(content, values), values);
}

/** Recursively list files under `dir`, as paths relative to it, sorted. */
export function collectFiles(dir) {
  const out = [];

  const walk = (current) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        // Nothing in the template needs these, and copying a stale build into a
        // fresh repo is worse than useless.
        if (entry === "node_modules" || entry === ".turbo" || entry === "dist") continue;
        walk(full);
        continue;
      }
      out.push(relative(dir, full).split(sep).join("/"));
    }
  };

  walk(dir);
  return out.sort();
}

/**
 * Decide what to do with each template file given what already exists.
 *
 * `only` narrows the run to a subset — the `--workflows-only` / `--badges-only`
 * flags — matched as path prefixes.
 */
export function planFiles(files, { exists, force = false, only = null }) {
  const plan = { write: [], overwrite: [], skip: [] };

  for (const file of files) {
    if (only && !only.some((prefix) => file === prefix || file.startsWith(`${prefix}/`))) {
      continue;
    }
    if (!exists(file)) {
      plan.write.push(file);
    } else if (force) {
      plan.overwrite.push(file);
    } else {
      plan.skip.push(file);
    }
  }

  return plan;
}

/**
 * Where a template file lands in the target repo.
 *
 * `gitignore` becomes `.gitignore`. It is stored without the dot because npm
 * strips `.gitignore` out of published tarballs — a template that carried one
 * would work from a checkout and silently lose the file when installed from the
 * registry.
 */
export function destinationFor(file) {
  if (file === "gitignore") return ".gitignore";
  return file;
}

/** Path prefixes selected by the `--*-only` flags. */
export const SUBSETS = {
  workflows: [".github"],
  badges: ["README.md"],
  docs: ["docs"],
  turbo: ["turbo.json", "package.json", "vitest.config.ts"],
};
