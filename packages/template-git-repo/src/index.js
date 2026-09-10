/**
 * Public entry point. The CLI is the intended interface; these exports exist so
 * the pieces can be scripted (generating a badge row for a docs site, checking
 * a repo's workflows in a test) without shelling out.
 */
export {
  BADGES,
  GROUPS,
  renderBadge,
  renderBadgeBlock,
  selectBadges,
  shieldsBadge,
  stackChip,
} from './badges.js';

export {
  buildContext,
  detectDefaultBranch,
  detectNpmPackage,
  detectPackageManager,
  detectPackagesDir,
  findRepoRoot,
  parseRepoSlug,
  substitute,
} from './context.js';

export { END_MARKER, START_MARKER, hasUnmarkedBadges, injectBadges } from './readme.js';

export { planFiles, applyPlan } from './apply.js';
