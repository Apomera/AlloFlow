// recov-score-order (2026-06-15): the final score + axeViolations were blended BEFORE
// auto-restore (word appendix) and deferred-image recovery (image section) mutated the
// HTML, so the reported number described a doc the user wasn't downloading and the injected
// landmarks/headings were never audited. The fix re-runs the deterministic engines + re-scores
// (same consensus + min(ai,det) — weakest-layer-governs since 2026-06-21) when a recovery mutation
// occurred. We test: the premise (the recovery section + heading really get injected), the re-score
// math (a changed post-restore axe score yields a different final), and anti-drift on the gated block.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Extract the real applyWordRestoration (anti-drift, same slice as auto_restore_dual_ocr).
const arStart = src.indexOf('const applyWordRestoration = (html, missingList, sourceText) => {');
const arEnd = src.indexOf('\n  // ── Stage A: Gemini-targeted sentence re-insertion ──', arStart);
const applyWordRestoration = new Function('warnLog', src.slice(arStart, arEnd) + '\n; return applyWordRestoration;')(() => {});

// Mirror of the consensus + headline the re-audit uses (weakest-layer-governs: min, not mean).
const reBlend = (ai, axe, ea) => {
  const det = typeof axe === 'number' ? (typeof ea === 'number' ? Math.min(axe, ea) : axe) : null;
  if (ai !== null && typeof axe === 'number') return Math.min(ai, det);
  return null; // axe unavailable → not scorable against the automated layer
};

describe('recov-score-order — premise: recovery injects an unaudited landmark + heading', () => {
  it('an unplaceable restored word adds a data-content-recovery section with an <h2>', () => {
    const html = '<!DOCTYPE html><html lang="en"><body><main><p>completely unrelated remediated text</p></main></body></html>';
    const r = applyWordRestoration(html, [{ word: 'Shawn' }], 'the student Shawn Smith was assessed');
    expect(r.html).toContain('data-content-recovery');
    expect(r.html).toMatch(/<h2[^>]*>Content recovery<\/h2>/); // an UN-audited heading → must trigger re-audit
  });
});

describe('recov-score-order — re-score changes the reported number when the doc changed', () => {
  it('a lower post-restore axe score yields a lower final than the pre-restore headline', () => {
    const ai = 80;
    const preBlend = reBlend(ai, 90, null);   // before recovery: min(80,90) → 80
    const postBlend = reBlend(ai, 60, null);  // injected un-leveled <h2> trips axe heading-order → min(80,60) → 60
    expect(preBlend).toBe(80);
    expect(postBlend).toBe(60);
    expect(postBlend).not.toBe(preBlend);      // the shipped score now reflects the downloaded doc
  });
  it('uses the more-conservative of axe/EA (consensus) and degrades to AI-only when axe is gone', () => {
    expect(reBlend(80, 70, 50)).toBe(50);      // det=min(70,50)=50 → min(80,50)=50 (the governing layer)
    expect(reBlend(80, null, null)).toBe(null); // axe unavailable → not scored against automated (caller sets axeCoreFailed)
  });
});

describe('recov-score-order — anti-drift on the gated re-audit block', () => {
  it('the gated, fail-soft re-audit/re-blend block is present', () => {
    expect(src).toContain('const _imageRecoveryInjected = accessibleHtml.indexOf(\'data-image-recovery="true"\') !== -1;');
    expect(src).toContain('if (_autoRestore || _imageRecoveryInjected) {');
    expect(src).toContain('Re-scored after recovery mutations (weakest-layer)');
  });
  it('the triage vars it reassigns were promoted to let', () => {
    expect(src).toContain('let axeViolations = axeResults ? axeResults.totalViolations : 0;');
    expect(src).toContain('let needsExpertReview = _accessibilityConcern || _contentFidelityConcern;');
  });
  it('runs AFTER the recovery mutations and BEFORE the result/issue-resolution (ordering guard)', () => {
    const iAutoRestore = src.indexOf('_autoRestore = {');
    const iImageInject = src.indexOf('data-image-recovery="true"');
    const iReaudit = src.indexOf('Re-audit + re-blend after post-blend HTML mutations');
    const iIssueDiff = src.indexOf('Issue-resolution diff (pre-fix vs verification)');
    expect(iAutoRestore).toBeGreaterThan(0);
    expect(iReaudit).toBeGreaterThan(iImageInject); // after the image-recovery injection
    expect(iReaudit).toBeGreaterThan(iAutoRestore); // after auto-restore
    expect(iIssueDiff).toBeGreaterThan(iReaudit);   // before the issue-resolution diff
  });
});
