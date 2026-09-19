import { describe, test, expect } from 'vitest';
import {
  formatDuration,
  formatBytes,
  speedups,
  formatTable,
  type Measurement,
} from '../benchmark/report.ts';

/** A measured run, with the fields a test does not care about filled in. */
function run(partial: Partial<Measurement> & { strategy: string }): Measurement {
  return { repo: 'owner/repo', timeToFiles: 0, timeToHistory: null, ...partial };
}

describe('formatDuration', () => {
  test('keeps sub-second times in milliseconds', () => {
    expect(formatDuration(842)).toBe('842ms');
    expect(formatDuration(999.4)).toBe('999ms');
  });

  test('switches to seconds at a second', () => {
    expect(formatDuration(1000)).toBe('1.00s');
    expect(formatDuration(12400)).toBe('12.40s');
  });

  test('renders "never happened" rather than zero', () => {
    expect(formatDuration(null)).toBe('—');
  });
});

describe('formatBytes', () => {
  test('scales through binary units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KiB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MiB');
  });

  test('renders an unmeasured size as a dash', () => {
    expect(formatBytes(undefined)).toBe('—');
  });
});

describe('speedups', () => {
  test('measures time-to-files against the clone baseline', () => {
    const gains = speedups([
      run({ strategy: 'git clone', timeToFiles: 8000, timeToHistory: 8000 }),
      run({ strategy: 'git0', timeToFiles: 2000 }),
      run({ strategy: 'git0 --history', timeToFiles: 2000, timeToHistory: 9000 }),
    ]);

    expect(gains.get('git0')).toBe(4);
    expect(gains.get('git0 --history')).toBe(4);
    expect(gains.has('git clone')).toBe(false);
  });

  test('reports nothing when the baseline itself failed', () => {
    const gains = speedups([
      run({ strategy: 'git clone', error: 'network down' }),
      run({ strategy: 'git0', timeToFiles: 2000 }),
    ]);

    expect(gains.size).toBe(0);
  });

  test('skips runs that failed', () => {
    const gains = speedups([
      run({ strategy: 'git clone', timeToFiles: 8000, timeToHistory: 8000 }),
      run({ strategy: 'git0', error: 'rate limited' }),
    ]);

    expect(gains.has('git0')).toBe(false);
  });
});

describe('formatTable', () => {
  const rows = [
    run({ strategy: 'git clone', timeToFiles: 8000, timeToHistory: 8000, bytesOnDisk: 40 * 1024 * 1024 }),
    run({ strategy: 'git0', timeToFiles: 2000, bytesOnDisk: 4 * 1024 * 1024 }),
  ];

  test('emits a markdown table with one row per measurement', () => {
    const lines = formatTable(rows).split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('time to files');
    expect(lines[1]).toMatch(/^\| --- \|/);
  });

  test('shows the speedup against the baseline', () => {
    expect(formatTable(rows)).toContain('4.00×');
  });

  test('marks a strategy that produces no history', () => {
    const git0Row = formatTable(rows).split('\n')[3];
    expect(git0Row).toContain('—');
  });

  test('says so when a run failed rather than printing zeros', () => {
    const table = formatTable([run({ strategy: 'git0', error: 'rate limited' })]);
    expect(table).toContain('failed: rate limited');
    expect(table).not.toContain('0ms');
  });
});
