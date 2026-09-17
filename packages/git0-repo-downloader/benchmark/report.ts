/**
 * One measured run of one strategy against one repository.
 */
export interface Measurement {
  /** Strategy label, e.g. `'git clone'` or `'git0 --history'`. */
  strategy: string;
  /** `owner/repo` that was fetched. */
  repo: string;
  /**
   * Milliseconds until the source tree was on disk — the moment `bun install`
   * could start and therefore the moment the clock that matters stops.
   */
  timeToFiles: number;
  /**
   * Milliseconds until the full commit history was available, or `null` for a
   * strategy that never produces one (a tarball, a shallow clone).
   */
  timeToHistory: number | null;
  /** Bytes written to disk, when the runner measured it. */
  bytesOnDisk?: number;
  /** Set when the run failed; the other numbers are then meaningless. */
  error?: string;
}

/**
 * Formats a duration the way a benchmark reader wants to read it: milliseconds
 * while they are small enough to compare at a glance, seconds after that.
 *
 * @param ms - Duration in milliseconds, or `null` for "never happened".
 * @returns A short human-readable string.
 *
 * @example
 * formatDuration(842);   // → '842ms'
 * formatDuration(12400); // → '12.40s'
 * formatDuration(null);  // → '—'
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Formats a byte count in binary units.
 *
 * @param bytes - Size in bytes, or `undefined` when it was not measured.
 * @returns A short human-readable string.
 *
 * @example
 * formatBytes(1536);      // → '1.5 KiB'
 * formatBytes(undefined); // → '—'
 */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return '—';

  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

/**
 * How much sooner a strategy got to a usable working tree than the baseline.
 *
 * Expressed against `git clone` because that is the command git0 replaces, and
 * as a ratio because the absolute numbers are dominated by the repository's
 * size and the network between you and GitHub.
 *
 * @param measurements - Every run for one repository.
 * @param baseline - Strategy to compare against.
 * @returns Map of strategy to speedup (`2` means "half the time"), skipping the
 *   baseline itself and any run that failed.
 *
 * @example
 * speedups([
 *   { strategy: 'git clone', repo: 'a/b', timeToFiles: 8000, timeToHistory: 8000 },
 *   { strategy: 'git0',      repo: 'a/b', timeToFiles: 2000, timeToHistory: null },
 * ]);
 * // → Map { 'git0' => 4 }
 */
export function speedups(
  measurements: Measurement[],
  baseline = 'git clone'
): Map<string, number> {
  const reference = measurements.find(m => m.strategy === baseline && !m.error);
  const result = new Map<string, number>();
  if (!reference || reference.timeToFiles <= 0) return result;

  for (const measurement of measurements) {
    if (measurement.error || measurement.strategy === baseline) continue;
    if (measurement.timeToFiles <= 0) continue;
    result.set(measurement.strategy, reference.timeToFiles / measurement.timeToFiles);
  }

  return result;
}

/**
 * Renders the measurements as a GitHub-flavoured markdown table.
 *
 * Markdown rather than aligned columns so a run can be pasted straight into an
 * issue or a PR, which is where benchmark numbers are actually argued about.
 *
 * @param measurements - Runs to render, in the order they should appear.
 * @returns The table, without a trailing newline.
 *
 * @example
 * console.log(formatTable(results));
 */
export function formatTable(measurements: Measurement[]): string {
  const gains = speedups(measurements);

  const rows = measurements.map(measurement => {
    if (measurement.error) {
      return `| ${measurement.strategy} | ${measurement.repo} | failed: ${measurement.error} | | | |`;
    }

    const gain = gains.get(measurement.strategy);

    return [
      '',
      measurement.strategy,
      measurement.repo,
      formatDuration(measurement.timeToFiles),
      formatDuration(measurement.timeToHistory),
      formatBytes(measurement.bytesOnDisk),
      gain ? `${gain.toFixed(2)}×` : '—',
      '',
    ].join(' | ').trim();
  });

  return [
    '| strategy | repo | time to files | time to history | on disk | vs git clone |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}
