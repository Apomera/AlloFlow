// S3 (deep dive 2026-07-02): GOLDEN characterization of the fix-loop decision policy.
// _alloLoopPolicy was extracted VERBATIM from fixAndVerifyPdf's pass loop; these tables pin
// the exact boundary semantics the loop has shipped with since the 2026-06-19 guard fix, so
// the policy can now be edited (or reused by another loop) against an explicit contract
// instead of by re-deriving intent from inline conditionals. If a case here needs to change,
// that is a POLICY change — make it deliberately and update the table.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

let policy;
beforeAll(() => {
  const root = path.resolve(__dirname, '..');
  const src = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
  const start = src.indexOf('var _alloLoopPolicy = {');
  expect(start).toBeGreaterThan(-1);
  // Evaluate just the object literal (self-contained, no free variables).
  const slice = src.slice(start, src.indexOf('// ── S7', start));
  // eslint-disable-next-line no-new-func
  policy = new Function(slice + '; return _alloLoopPolicy;')();
});

describe('shouldRevert — axe regression always reverts; AI drop reverts only without an axe gain', () => {
  it('axe worse beyond ±2 tolerance always reverts (even with AI gains)', () => {
    expect(policy.shouldRevert({ newAi: 99, bestAi: 80, newAxe: 5, bestAxe: 2 })).toBe(true);  // +3 > tol
    expect(policy.shouldRevert({ newAi: 99, bestAi: 80, newAxe: 4, bestAxe: 2 })).toBe(false); // +2 = within tol
  });
  it('AI drop > 5 without an axe improvement reverts (the 2026-06-19 fix)', () => {
    expect(policy.shouldRevert({ newAi: 78, bestAi: 89, newAxe: 3, bestAxe: 3 })).toBe(true);  // 89→78, axe flat
    expect(policy.shouldRevert({ newAi: 84, bestAi: 89, newAxe: 3, bestAxe: 3 })).toBe(false); // exactly -5 = tolerated
    expect(policy.shouldRevert({ newAi: 83, bestAi: 89, newAxe: 3, bestAxe: 3 })).toBe(true);  // -6 → revert
  });
  it('an AI drop IS tolerated when it bought a real axe gain', () => {
    expect(policy.shouldRevert({ newAi: 70, bestAi: 89, newAxe: 2, bestAxe: 3 })).toBe(false); // axeBetter excuses aiWorse
  });
  it('both flat → no revert', () => {
    expect(policy.shouldRevert({ newAi: 90, bestAi: 90, newAxe: 3, bestAxe: 3 })).toBe(false);
  });
});

describe('revertReason — the three historical strings', () => {
  it('axe-only regression names the new violation count', () => {
    expect(policy.revertReason({ newAi: 92, bestAi: 90, newAxe: 6, bestAxe: 2 }))
      .toBe('introduced 4 new axe/WCAG violation(s) despite AI gains');
  });
  it('AI-only drop names the score movement', () => {
    expect(policy.revertReason({ newAi: 78, bestAi: 89, newAxe: 3, bestAxe: 3 }))
      .toBe('AI rubric dropped 89→78 without fixing any axe violation');
  });
  it('both worse → generic', () => {
    expect(policy.revertReason({ newAi: 70, bestAi: 89, newAxe: 9, bestAxe: 3 }))
      .toBe('both scores got worse');
  });
});

describe('isBest — keep-best promotion', () => {
  it('higher AI promotes', () => {
    expect(policy.isBest({ newAi: 91, bestAi: 90, newAxe: 5, bestAxe: 3, partial: false })).toBe(true);
  });
  it('fewer axe violations promote when AI held within 5', () => {
    expect(policy.isBest({ newAi: 85, bestAi: 90, newAxe: 2, bestAxe: 3, partial: false })).toBe(true);  // -5 held
    expect(policy.isBest({ newAi: 84, bestAi: 90, newAxe: 2, bestAxe: 3, partial: false })).toBe(false); // -6 too far
  });
  it('flat pass does NOT promote (working state may drift, best must not)', () => {
    expect(policy.isBest({ newAi: 90, bestAi: 90, newAxe: 3, bestAxe: 3, partial: false })).toBe(false);
  });
  it('partial audit: ONLY a real axe gain promotes (AI score is inflated)', () => {
    expect(policy.isBest({ newAi: 99, bestAi: 80, newAxe: 3, bestAxe: 3, partial: true })).toBe(false);
    expect(policy.isBest({ newAi: 40, bestAi: 80, newAxe: 2, bestAxe: 3, partial: true })).toBe(true);
  });
});

describe('improved — plateau accounting with the minimum-detectable floor', () => {
  it('axe gain always counts', () => {
    expect(policy.improved({ newAi: 80, prevBestAi: 80, newAxe: 2, prevBestAxe: 3 })).toBe(true);
  });
  it('AI gain must exceed the floor (default 2)', () => {
    expect(policy.improved({ newAi: 82, prevBestAi: 80, newAxe: 3, prevBestAxe: 3 })).toBe(false); // +2 = at floor, not beyond
    expect(policy.improved({ newAi: 83, prevBestAi: 80, newAxe: 3, prevBestAxe: 3 })).toBe(true);  // +3 clears it
  });
  it('a larger explicit minDetectable raises the bar; a smaller one cannot lower it below 2', () => {
    expect(policy.improved({ newAi: 84, prevBestAi: 80, newAxe: 3, prevBestAxe: 3, minDetectable: 5 })).toBe(false);
    expect(policy.improved({ newAi: 86, prevBestAi: 80, newAxe: 3, prevBestAxe: 3, minDetectable: 5 })).toBe(true);
    expect(policy.improved({ newAi: 82, prevBestAi: 80, newAxe: 3, prevBestAxe: 3, minDetectable: 0 })).toBe(false); // floor 2 holds
  });
});

describe('anti-drift: the shipped loop consumes the policy (no re-inlined conditionals)', () => {
  it('main pass loop calls _alloLoopPolicy for revert, keep-best, and plateau', () => {
    const src = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'doc_pipeline_source.jsx'), 'utf8');
    expect(src).toMatch(/_alloLoopPolicy\.shouldRevert\(/);
    expect(src).toMatch(/_alloLoopPolicy\.revertReason\(/);
    expect(src).toMatch(/_alloLoopPolicy\.isBest\(/);
    expect(src).toMatch(/_alloLoopPolicy\.improved\(/);
  });
});
