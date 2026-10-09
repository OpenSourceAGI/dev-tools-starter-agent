/**
 * @file line-diff.ts
 * @description Minimal line diff (LCS) for reviewing suggested page edits.
 */
export type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };

/** Above this many line pairs the LCS table is too large; the diff falls back to remove-all/add-all. */
const MAX_CELLS = 4_000_000;

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');

  // Trim the shared prefix and suffix so the table only covers the changed middle.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const head = a.slice(0, start).map((text) => ({ type: 'same' as const, text }));
  const tail = a.slice(endA).map((text) => ({ type: 'same' as const, text }));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  if (midA.length * midB.length > MAX_CELLS) {
    return [
      ...head,
      ...midA.map((text) => ({ type: 'remove' as const, text })),
      ...midB.map((text) => ({ type: 'add' as const, text })),
      ...tail,
    ];
  }

  const n = midA.length;
  const m = midB.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const middle: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (midA[i] === midB[j]) {
      middle.push({ type: 'same', text: midA[i++] });
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      middle.push({ type: 'remove', text: midA[i++] });
    } else {
      middle.push({ type: 'add', text: midB[j++] });
    }
  }
  while (i < n) middle.push({ type: 'remove', text: midA[i++] });
  while (j < m) middle.push({ type: 'add', text: midB[j++] });

  return [...head, ...middle, ...tail];
}
