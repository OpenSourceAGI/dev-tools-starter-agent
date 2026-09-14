#!/usr/bin/env node
/**
 * Print the next version of a package that the registry has not already spent.
 *
 * Bumping one patch above the `latest` dist-tag is not enough. `latest` lags
 * any version that an interrupted publish staged, and npm answers a PUT for one
 * of those with `E409 ... Cannot publish over previously staged version`. Those
 * numbers show up in the full version list and in the release timeline, so both
 * are consulted here.
 *
 *   node .github/scripts/next-free-version.mjs <package-name> <current-version>
 */
import { execFileSync } from "node:child_process";

const [, , name, current] = process.argv;

if (!name || !current) {
  console.error("usage: next-free-version.mjs <package-name> <current-version>");
  process.exit(2);
}

/** Run `npm view` and parse JSON, treating any failure as "no data". */
function npmView(field) {
  try {
    const out = execFileSync("npm", ["view", name, field, "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

const taken = new Set();

const versions = npmView("versions");
if (Array.isArray(versions)) for (const v of versions) taken.add(v);
else if (typeof versions === "string") taken.add(versions);

// `time` carries every version the registry has a timestamp for, including ones
// that were unpublished or staged and never completed.
const time = npmView("time");
if (time && typeof time === "object") {
  for (const key of Object.keys(time)) {
    if (key !== "created" && key !== "modified") taken.add(key);
  }
}

const parse = (v) => {
  const [core] = String(v).split(/[-+]/);
  const parts = core.split(".").map((n) => Number.parseInt(n, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
};

// Start from the highest number the registry knows about, not from `current`:
// a local version behind the registry would otherwise propose versions that are
// all taken, one refused publish at a time.
let [major, minor, patch] = parse(current);
for (const v of taken) {
  const [ma, mi, pa] = parse(v);
  if (ma > major || (ma === major && (mi > minor || (mi === minor && pa > patch)))) {
    [major, minor, patch] = [ma, mi, pa];
  }
}

let next;
do {
  patch += 1;
  next = `${major}.${minor}.${patch}`;
} while (taken.has(next));

console.log(next);
