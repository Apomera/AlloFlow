// Reliability-honesty fixes from the 2026-06-15 fresh review (fix-now-safe batch A).
// These live in async/closure-heavy regions (createTaggedPdf, the post-remediation toast
// block, auditOutputAccessibility's chunked branch), so we mirror the load-bearing pure
// logic and anti-drift-guard the shipped source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('PDF/UA §7.1 — DisplayDocTitle survives an indirect /ViewerPreferences', () => {
  it('resolves the ref before mutating and guards on a real dict (anti-drift)', () => {
    // get() returns a PDFRef for an indirect /ViewerPreferences; the old code called .set on it
    // and threw, leaving DisplayDocTitle unset while still claiming PDF/UA-1.
    expect(src).toContain('viewerPrefs = context.lookup(viewerPrefs) || viewerPrefs;');
    expect(src).toContain("if (viewerPrefs && typeof viewerPrefs.set === 'function') {");
  });
});

describe('post-remediation toast — never claim success when content integrity is in doubt', () => {
  // mirror of the shipped branch order
  const toastSeverity = (integrityWarning, score) => {
    if (integrityWarning && score !== null) return 'warning';
    if (score !== null && score >= 80) return 'success';
    if (score !== null) return 'info';
    return 'info';
  };
  it('a high score WITH an integrity warning is a warning, not green success', () => {
    expect(toastSeverity(true, 88)).toBe('warning');
    expect(toastSeverity(true, 60)).toBe('warning');
  });
  it('a clean high score is still success; a clean mid score is still info (no regression)', () => {
    expect(toastSeverity(false, 88)).toBe('success');
    expect(toastSeverity(false, 60)).toBe('info');
  });
  it('anti-drift: the integrity-warning branch precedes the success branch in source', () => {
    const iIntegrity = src.indexOf('if (integrityWarning && finalAfterScore !== null) {');
    const iSuccess = src.indexOf('✅ PDF remediated! Score:');
    expect(iIntegrity).toBeGreaterThan(0);
    expect(iIntegrity).toBeLessThan(iSuccess); // the gate fires first
    expect(src).toContain('some source text may be missing — review the Diff before distributing');
  });
});

describe('chunked output audit — honest about partial coverage when chunks fail', () => {
  // mirror of the shipped summary/count disclosure
  const auditCoverageSummary = (base, survivors, requested) => {
    const failed = requested - survivors;
    return base + (failed > 0
      ? ` (${survivors}/${requested} sections audited; ${failed} failed — score covers audited sections only)`
      : ` (${requested} sections audited)`);
  };
  it('discloses survivors/requested + failure count when some chunks failed', () => {
    const s = auditCoverageSummary('Doc', 1, 10);
    expect(s).toContain('1/10 sections audited; 9 failed');
    expect(s).toContain('score covers audited sections only');
  });
  it('full coverage keeps the original wording (byte-identical happy path)', () => {
    expect(auditCoverageSummary('Doc', 10, 10)).toBe('Doc (10 sections audited)');
  });
  it('anti-drift: the result reports actual survivors + partial flag (not the requested count)', () => {
    expect(src).toContain('chunksAudited: _auditedCount,');
    expect(src).toContain('chunksRequested: chunks.length,');
    expect(src).toContain('_partialAudit: _partialAudit');
  });
});

describe('multi-chunk text transform — failed chunks are auto-retried before placeholdering', () => {
  // mirror of the shipped retry loop structure
  async function retryFailed(results, attemptFn, maxRetries) {
    let idx = [];
    for (let i = 0; i < results.length; i++) if (!results[i]) idx.push(i);
    for (let att = 1; att <= maxRetries && idx.length > 0; att++) {
      const still = [];
      for (const i of idx) { const r = await attemptFn(i, att); if (r) results[i] = r; else still.push(i); }
      idx = still;
    }
    return { results, stillFailed: idx.length };
  }

  it('recovers a chunk that fails the batch but succeeds on a fresh retry (no dropped page)', async () => {
    const out = await retryFailed(['ok', null, 'ok'], (i, att) => (i === 1 ? 'recovered' : null), 2);
    expect(out.results[1]).toBe('recovered');
    expect(out.stillFailed).toBe(0);
  });
  it('recovers a chunk that only succeeds on the SECOND retry attempt', async () => {
    const out = await retryFailed(['ok', null], (i, att) => (att === 2 ? 'late' : null), 2);
    expect(out.results[1]).toBe('late');
    expect(out.stillFailed).toBe(0);
  });
  it('a persistently-failing chunk remains failed after 2 retries (→ placeholder + integrity warning)', async () => {
    const out = await retryFailed(['ok', null], () => null, 2);
    expect(out.stillFailed).toBe(1);
  });
  it('no failures → no retry work', async () => {
    let calls = 0;
    const out = await retryFailed(['a', 'b'], () => { calls++; return 'x'; }, 2);
    expect(calls).toBe(0);
    expect(out.stillFailed).toBe(0);
  });

  it('anti-drift: the retry pass + residual-failure record are live in source', () => {
    expect(src).toContain('Retry pass ${_att}: re-running');
    expect(src).toContain('window.__lastTransformFragmentFailures = _retryIdx.length');
  });
});
