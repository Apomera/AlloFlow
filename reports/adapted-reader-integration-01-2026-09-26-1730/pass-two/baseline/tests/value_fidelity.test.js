// P1 numeric/value-fidelity gate (2026-06-20). A remediation must NEVER silently change a NUMBER —
// a swapped score, date, or percentage in an assessment report is the worst case for this tool. The
// bulk char-coverage gate misses it (a number barely moves the char count) and the word-SET integrity
// check can't see it (47% vs 74% overlap as word sets). This pins the multiset detector's behavior +
// (anti-drift) that doc_pipeline ships it and the integrity gate calls it on the final output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of the shipped helpers (kept in sync via the anti-drift block below).
const extractNumericTokens = (text) => {
  const m = String(text || '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
  const counts = new Map();
  for (const tok of m) {
    const norm = tok.replace(/,/g, '');
    if (norm.replace(/\./g, '').length < 2) continue; // skip single digits (list markers / "page 1")
    counts.set(norm, (counts.get(norm) || 0) + 1);
  }
  return counts;
};
const numericFidelityLosses = (srcText, outText) => {
  const src = extractNumericTokens(srcText), out = extractNumericTokens(outText), lost = [];
  src.forEach((cnt, val) => { if ((out.get(val) || 0) < cnt) lost.push(val); });
  return lost;
};

describe('numeric/value-fidelity detector', () => {
  it('flags a substituted number (the 47% → 74% worst case)', () => {
    expect(numericFidelityLosses('score 47% in 2026', 'score 74% in 2026')).toEqual(['47']);
  });
  it('flags a dropped value', () => {
    expect(numericFidelityLosses('scores: 85, 92, 110', 'scores: 85, 110')).toEqual(['92']);
  });
  it('passes when all values are preserved even if REORDERED (reflow-robust)', () => {
    expect(numericFidelityLosses('85 then 92 then 110', '110, 85, 92')).toEqual([]);
  });
  it('tolerates thousands-comma reformatting (1,000 ↔ 1000)', () => {
    expect(numericFidelityLosses('total 1,000 items', 'total 1000 items')).toEqual([]);
  });
  it('does NOT flag values ADDED by remediation (alt text, "Figure 12")', () => {
    expect(numericFidelityLosses('the chart', 'Figure 12: the chart (3 bars)')).toEqual([]);
  });
  it('ignores single-digit noise (list markers, "page 1")', () => {
    expect(numericFidelityLosses('1. first 2. second', 'first; second')).toEqual([]);
  });
  it('keeps decimals (3.5 ≠ 3.6)', () => {
    expect(numericFidelityLosses('GPA 3.5', 'GPA 3.6')).toEqual(['3.5']);
  });
  it('empty source → no false flag', () => {
    expect(numericFidelityLosses('', 'anything 42')).toEqual([]);
  });
  it('known blind spot: pure transposition of equal values is NOT caught (multiset unchanged)', () => {
    // documents the limitation honestly — two scores swapped preserves the multiset
    expect(numericFidelityLosses('Alice 80 Bob 90', 'Alice 90 Bob 80')).toEqual([]);
  });
});

describe('anti-drift: doc_pipeline ships the detector + the gate calls it', () => {
  it('defines _extractNumericTokens + _numericFidelityLosses', () => {
    expect(pipeSrc).toMatch(/_extractNumericTokens\s*=\s*function/);
    expect(pipeSrc).toMatch(/_numericFidelityLosses\s*=\s*function/);
  });
  it('the integrity gate calls it on the FINAL output (covers transform + fix paths)', () => {
    expect(pipeSrc).toMatch(/_numericFidelityLosses\(_srcRaw,\s*htmlToPlainText\(_finalForIntegrity\)\)/);
  });
  it('the detector uses the number-token regex + strips commas + skips single digits', () => {
    expect(pipeSrc).toMatch(/\\d\[\\d,\]\*/);            // the token matcher \d[\d,]*
    expect(pipeSrc).toMatch(/replace\(\/,\/g, ''\)/);   // thousands-comma normalization
    expect(pipeSrc).toMatch(/skip single digits/);       // the single-digit-noise guard
  });
});
