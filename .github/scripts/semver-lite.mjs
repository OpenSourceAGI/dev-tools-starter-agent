/**
 * The small slice of semver the publish workflow needs, with no dependencies —
 * the workflow resolves versions before it has installed anything, so pulling
 * in `semver` would mean an install per package just to read a number.
 *
 * Handles `major.minor.patch` with an optional dot-separated prerelease and an
 * ignored build suffix, which is everything the packages here use. Anything it
 * cannot parse is reported as invalid rather than guessed at.
 */

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/** @returns {{major: number, minor: number, patch: number, prerelease: string[]} | null} */
export function parse(version) {
  const match = VERSION_RE.exec(String(version ?? '').trim());
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

export function isValid(version) {
  return parse(version) !== null;
}

/** Numeric identifiers compare numerically and rank below alphanumeric ones. */
function comparePrereleaseIds(a, b) {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);

  if (aNumeric && bNumeric) return Math.sign(Number(a) - Number(b));
  if (aNumeric) return -1;
  if (bNumeric) return 1;

  return a < b ? -1 : a > b ? 1 : 0;
}

/** @returns {-1 | 0 | 1} */
export function compare(a, b) {
  const left = parse(a);
  const right = parse(b);

  if (!left) throw new TypeError(`Not a version: ${a}`);
  if (!right) throw new TypeError(`Not a version: ${b}`);

  for (const part of ['major', 'minor', 'patch']) {
    if (left[part] !== right[part]) return left[part] < right[part] ? -1 : 1;
  }

  // A prerelease sorts below the release it leads up to: 1.0.0-rc.1 < 1.0.0.
  if (left.prerelease.length === 0 && right.prerelease.length > 0) return 1;
  if (left.prerelease.length > 0 && right.prerelease.length === 0) return -1;

  const shared = Math.min(left.prerelease.length, right.prerelease.length);
  for (let i = 0; i < shared; i += 1) {
    const order = comparePrereleaseIds(left.prerelease[i], right.prerelease[i]);
    if (order !== 0) return order;
  }

  return Math.sign(left.prerelease.length - right.prerelease.length);
}

export function gt(a, b) {
  return compare(a, b) > 0;
}

export function isPrerelease(version) {
  const parsed = parse(version);
  return parsed !== null && parsed.prerelease.length > 0;
}

/**
 * Next patch release. A prerelease drops its tag rather than incrementing —
 * 1.2.3-rc.1 becomes 1.2.3 — matching `semver.inc(v, 'patch')`.
 */
export function incPatch(version) {
  const parsed = parse(version);
  if (!parsed) throw new TypeError(`Not a version: ${version}`);

  const patch = parsed.prerelease.length > 0 ? parsed.patch : parsed.patch + 1;
  return `${parsed.major}.${parsed.minor}.${patch}`;
}

/** Highest of the given versions, ignoring any that do not parse. @returns {string | null} */
export function maxVersion(versions) {
  let highest = null;

  for (const version of versions) {
    if (!isValid(version)) continue;
    if (highest === null || gt(version, highest)) highest = version;
  }

  return highest;
}
