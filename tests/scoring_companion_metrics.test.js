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
const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

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

// ── #1 Trend (delta vs the prior audit of this file) ──
const trendDelta = (prior, cur) => ({ resolved: prior.count - cur.count, dedDelta: prior.ded - cur.ded });

describe('#1 trend — progress is legible even when both runs floor at 0', () => {
  it('47 issues / ded 210 → 18 / ded 140 reads as "29 resolved" though both score 0', () => {
    const d = trendDelta({ count: 47, ded: 210 }, { count: 18, ded: 140 });
    expect(d.resolved).toBe(29);
    expect(d.dedDelta).toBe(70);
    expect(Math.max(0, 100 - 210)).toBe(0);
    expect(Math.max(0, 100 - 140)).toBe(0); // both floored — the score can't show it, the trend can
  });
  it('a regression (more issues) reads negative', () => {
    const d = trendDelta({ count: 10, ded: 40 }, { count: 14, ded: 60 });
    expect(d.resolved).toBe(-4);
    expect(d.dedDelta).toBeLessThan(0);
  });
  it('the view persists + reads the trend keyed per file (name|size|pageCount), display-only', () => {
    expect(viewSrc).toMatch(/'alloflow_score_trend_' \+ \(pendingPdfFile\.name \|\| 'doc'\)/);
    expect(viewSrc).toMatch(/_setScoreTrend\(\(_prior && \(_prior\.ded !== _cur\.ded \|\| _prior\.count !== _cur\.count\)\) \? \{ prior: _prior, cur: _cur \} : null\)/);
  });
});

// ── #3 Structural foundations (live engine fn) ──
async function liveFoundations() {
  globalThis.window = globalThis.window || globalThis;
  await import(resolve(process.cwd(), 'doc_pipeline_module.js'));
  return window.AlloModules && window.AlloModules.createDocPipeline && window.AlloModules.createDocPipeline.structuralFoundations;
}

describe('#3 structural foundations — length-independent checks on their own axis', () => {
  it('the live module exposes structuralFoundations', async () => {
    expect(typeof (await liveFoundations())).toBe('function');
  });
  it('a well-structured doc detects many foundations; checked is the fixed denominator', async () => {
    const fn = await liveFoundations();
    const html = '<html lang="en"><head><title>Report</title></head><body><main><nav></nav><h1>Title</h1><h2>Section</h2><ul><li>a</li></ul><table><th scope="col">H</th></table><img alt="a chart"><label>Name</label></main></body></html>';
    const f = fn(html);
    expect(f.checked).toBe(18);
    expect(f.present).toContain('HTML lang attribute is present');
    expect(f.present).toContain('A <main> landmark defines the primary content area');
    expect(f.present.length).toBeGreaterThanOrEqual(8);
  });
  it('a bare doc detects (almost) none', async () => {
    const fn = await liveFoundations();
    const f = fn('<html><body><p>hi</p></body></html>');
    expect(f.present.length).toBeLessThanOrEqual(1);
  });
  it('honesty: presence only — the alt-text foundation says correctness is NOT verified', async () => {
    const fn = await liveFoundations();
    const f = fn('<img alt="x">');
    expect(f.present.some((p) => /alt attribute/.test(p) && /not verified/.test(p))).toBe(true);
  });
});

describe('anti-drift: structural foundations are single-sourced + wired (never a conformance score)', () => {
  it('the engine defines the fn and the chunked-audit pass list uses it (one regex set)', () => {
    expect(pipeSrc).toMatch(/var _alloStructuralFoundations = function \(html\) \{/);
    expect(pipeSrc).toMatch(/const structuralPasses = _alloStructuralFoundations\(htmlContent\)\.present;/);
    // the old inline 18-regex block is gone (no longer building structuralPasses by hand)
    expect(pipeSrc).not.toMatch(/const structuralPasses = \[\];\s*\n\s*const lc = htmlContent\.toLowerCase\(\);/);
  });
  it('the view renders the foundations chip from _docPipeline.structuralFoundations (maps to the export)', () => {
    expect(viewSrc).toMatch(/const _fn = _docPipeline && _docPipeline\.structuralFoundations;/);
    expect(viewSrc).toMatch(/_structuralFoundations\.present\.length/);
  });
  it('the foundations chip is labeled presence-only and separate from the content score', () => {
    expect(viewSrc).toMatch(/presence only/);
    expect(viewSrc).toMatch(/separate from the per-issue content score/);
  });
});
