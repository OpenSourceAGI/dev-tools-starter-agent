/**
 * Put the badge block into a README without destroying what is already there.
 *
 * Badges are the one part of a README that gets regenerated, so they live
 * between markers. Re-running the CLI replaces what is between them and touches
 * nothing else — which is what makes it safe to run again after publishing a
 * package or setting up Codecov.
 */

export const START_MARKER = '<!-- template-git-repo:badges:start -->';
export const END_MARKER = '<!-- template-git-repo:badges:end -->';

/**
 * Replace the marked block, or insert one.
 *
 * With no markers present, the block goes at the very top — above the title —
 * because that is where a badge row belongs and because inserting it anywhere
 * else would require guessing at the document's structure.
 *
 * An existing unmarked badge row (a `<p align="center">` full of shields.io
 * images at the top of the file) is left exactly where it is: silently deleting
 * hand-written badges would be worse than a duplicate the author can see and
 * remove.
 *
 * @param {string} readme current README text ('' for a new file)
 * @param {string} block the rendered badge markdown
 * @returns {{ content: string, action: 'replaced' | 'inserted' }}
 */
export function injectBadges(readme, block) {
  const marked = [START_MARKER, block, END_MARKER].join('\n');

  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);

  if (start !== -1 && end !== -1 && end > start) {
    return {
      content: readme.slice(0, start) + marked + readme.slice(end + END_MARKER.length),
      action: 'replaced',
    };
  }

  if (readme.trim() === '') {
    return { content: `${marked}\n`, action: 'inserted' };
  }

  return { content: `${marked}\n\n${readme.replace(/^\n+/, '')}`, action: 'inserted' };
}

/**
 * Whether a README already carries a badge row this CLI did not write.
 *
 * @param {string} readme
 * @returns {boolean}
 */
export function hasUnmarkedBadges(readme) {
  if (readme.includes(START_MARKER)) return false;

  const head = readme.slice(0, 4000);
  return /img\.shields\.io|badge\.svg/.test(head);
}
