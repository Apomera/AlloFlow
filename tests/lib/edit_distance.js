// Reading-order normalized edit distance (2026-06-14).
//
// The deterministic reading-order metric for the table/reading-order golden-master
// harness: given the produced block order and the reference (ground-truth) order
// as sequences of comparable tokens (block ids/labels), return a normalized
// Levenshtein distance in [0,1] — 0 = identical order (best), 1 = maximally
// scrambled. Matches the "reading-order edit distance" the OmniDocBench / olmOCR
// literature reports. Pure JS; runs in vitest and plain Node.

// Levenshtein distance between two arrays of tokens (===-comparable).
export function sequenceEditDistance(a, b) {
  a = Array.isArray(a) ? a : [];
  b = Array.isArray(b) ? b : [];
  const n = a.length, m = b.length;
  if (!n) return m;
  if (!m) return n;
  const prev = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= m; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[m];
}

// Normalized to [0,1] by the longer sequence length. Lower is better.
export function readingOrderDistance(produced, reference) {
  const d = sequenceEditDistance(produced, reference);
  const denom = Math.max((produced || []).length, (reference || []).length, 1);
  return d / denom;
}

// Convenience: a 0..1 "score" where higher is better (1 - distance), so it reads
// the same direction as TEDS in a combined report.
export function readingOrderScore(produced, reference) {
  return 1 - readingOrderDistance(produced, reference);
}
