// Companion metrics (2026-06-21): the headline score stays an honest deduction floored at 0, so a long
// good-faith document and a hopeless one can both read "0". The audit card now also shows labeled
// COMPANIONS — the underlying confirmed-issue count + deduction (which keep moving as you remediate even
// while a floored score sits at 0) and a per-PAGE density (so a long doc isn't judged like a short one) —
// restoring resolution at the bad end WITHOUT inflating the score. This pins the math + the wiring +
// the honesty guard (never labeled "score").
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── mirror of the companion computation ──
const companion = (r) => {
  const total = (r.critical || []).length + (r.serious || []).length + (r.moderate || []).length + (r.minor || []).length;
  const ded = r._consolidatedDeductions;
  const pages = r.pageCount;
  if (total === 0 && typeof ded !== 'number') return null;
  const perPage = (typeof ded === 'number' && typeof pages === 'number' && pages > 0) ? (ded / pages) : null;
  return { total, ded, pages, perPage };
};

describe('companion metrics — density + underlying numbers, honest 0', () => {
  it('a long doc and a short doc with the same deduction get DIFFERENT density (the whole point)', () => {
    const short = companion({ critical: [{}, {}], _consolidatedDeductions: 60, pageCount: 2 });
    const long = companion({ critical: [{}, {}], _consolidatedDeductions: 60, pageCount: 120 });
    expect(short.perPage).toBe(30);     // 60 / 2 — pervasive
    expect(long.perPage).toBe(0.5);     // 60 / 120 — sparse
    // both would floor the headline at 0 (deduction 60 ... or worse) yet read very differently here
    expect(long.perPage).toBeLessThan(short.perPage);
  });

  it('the underlying numbers stay visible even when the floored score is 0 (progress is legible)', () => {
    // deduction 210 → score floors at 0; deduction 140 → STILL floors at 0; the companion shows 47 vs 18 issues
    const before = companion({ critical: Array(47).fill({}), _consolidatedDeductions: 210, pageCount: 120 });
    const after = companion({ critical: Array(18).fill({}), _consolidatedDeductions: 140, pageCount: 120 });
    expect(Math.max(0, 100 - before.ded)).toBe(0); // headline floored
    expect(Math.max(0, 100 - after.ded)).toBe(0);  // STILL floored — score can't show the progress
    expect(before.total).toBe(47);                 // ...but the companion can
    expect(after.total).toBe(18);
    expect(after.ded).toBeLessThan(before.ded);    // deduction moved 210 → 140 (visible progress at a floored 0)
  });

  it('counts issues across all four severities', () => {
    const c = companion({ critical: [{}], serious: [{}, {}], moderate: [{}], minor: [{}, {}, {}] });
    expect(c.total).toBe(7);
  });

  it('no per-page figure when pageCount is unknown (never divide by a guessed 1)', () => {
    const c = companion({ critical: [{}], _consolidatedDeductions: 15 });
    expect(c.perPage).toBeNull();
  });

  it('a perfectly clean audit (no issues, no deduction) shows no companion line', () => {
    expect(companion({ critical: [], serious: [], moderate: [], minor: [] })).toBeNull();
  });
});

describe('anti-drift: the companion is wired into the audit card and never called a "score"', () => {
  it('the audit card computes the companion from the consolidated deduction + pageCount', () => {
    expect(viewSrc).toMatch(/const _ded = pdfAuditResult\._consolidatedDeductions;/);
    expect(viewSrc).toMatch(/const _perPage = \(typeof _ded === 'number' && typeof _pages === 'number' && _pages > 0\) \? \(_ded \/ _pages\) : null;/);
    expect(viewSrc).toMatch(/confirmed_issues/);
  });
  it('the companion tooltip explicitly disclaims it is NOT the score', () => {
    expect(viewSrc).toMatch(/This is NOT the score/);
  });
});
