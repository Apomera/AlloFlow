// Recovery "Option B" residual source (2026-06-22): make the Tier-B "Re-run with restoration" runnable
// ANY time after remediation, not only right after a Tagged-PDF export. _recoveryResidualSource prefers
// the tagged-PDF round-trip snapshot (tokens lost in PDF tagging) when it's fresh, otherwise falls back to
// a fresh source-vs-final-text diff (tokens lost in remediation) — so it survives the auto-continue loop
// (which never refreshes lastTaggedValidation). This extracts the pure helper and exercises both modes,
// plus anti-drift on the wiring + the re-tag-failure desync guard.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const _s = src.indexOf('const _recoveryResidualSource = (td, sourceText, finalText) => {');
const _e = src.indexOf('\n  };', _s) + 4;
if (_s === -1 || _e === -1) throw new Error('extraction markers for _recoveryResidualSource missing');
// Harness repair (2026-07-05): S7 single-sourced the token fold — _recoveryResidualSource now calls
// _normTokenForDiffShared (top-level in the view), a free variable the bare slice couldn't resolve, so
// every behavior test threw ReferenceError (red since S7 @34018900). Prepend the shared fold + its
// fallback from the same source; with AlloModules unloaded here it exercises the fallback fold, whose
// equality with the pipeline's canonical copy is sentinel-tested in tests/norm_token_drift.test.js.
const _sliceFn = (marker) => {
  const s0 = src.indexOf(marker);
  if (s0 === -1) throw new Error('extraction marker missing: ' + marker);
  const e0 = src.indexOf('\n}', s0) + 2;
  return src.slice(s0, e0);
};
const _recoveryResidualSource = new Function(
  _sliceFn('function _viewNormTokenFallback(s) {') + '\n'
  + _sliceFn('function _normTokenForDiffShared(s) {') + '\n'
  + src.slice(_s, _e) + '\nreturn _recoveryResidualSource;'
)();

describe('_recoveryResidualSource: prefers a fresh snapshot, else a fresh source-vs-final diff', () => {
  it('uses the tagged-PDF snapshot when it has a positive residual (PDF-tagging loss)', () => {
    const td = { residualMissingCount: 2, missingTokens: ['alpha', 'bravo'] };
    const r = _recoveryResidualSource(td, 'alpha bravo charlie', 'charlie only');
    expect(r.freshMode).toBe(false);
    expect(r.residual).toBe(2);
    expect(r.missingTokens).toEqual(['alpha', 'bravo']);
  });
  it('falls back to source-vs-final when the snapshot is ABSENT (e.g. after auto-continue)', () => {
    // source has "enrollment" + "graduation"; final dropped "graduation"
    const r = _recoveryResidualSource(null, 'Annual enrollment and graduation figures', 'Annual enrollment figures');
    expect(r.freshMode).toBe(true);
    expect(r.missingTokens.map((w) => w.toLowerCase())).toContain('graduation');
    expect(r.missingTokens.map((w) => w.toLowerCase())).not.toContain('enrollment'); // still present → not missing
    expect(r.residual).toBe(r.missingTokens.length);
  });
  it('falls back to fresh when the snapshot residual is 0/stale (the auto-continue staleness case)', () => {
    const staleTd = { residualMissingCount: 0, missingTokens: [] };
    const r = _recoveryResidualSource(staleTd, 'budget allocation summary appendix', 'budget summary');
    expect(r.freshMode).toBe(true);
    expect(r.missingTokens.map((w) => w.toLowerCase()).sort()).toEqual(['allocation', 'appendix']);
  });
  it('ignores short tokens (<3 chars) and de-dupes', () => {
    const r = _recoveryResidualSource(null, 'to be or not to be Hamlet Hamlet', 'to be or not to be');
    expect(r.missingTokens.map((w) => w.toLowerCase())).toEqual(['hamlet']); // "Hamlet" once, no short words
  });
  it('returns zero residual when nothing is missing (button stays hidden)', () => {
    const r = _recoveryResidualSource(null, 'same text here', 'same text here also more');
    expect(r.residual).toBe(0);
    expect(r.missingTokens).toEqual([]);
  });
  it('returns zero when there is no usable input at all', () => {
    expect(_recoveryResidualSource(null, '', '').residual).toBe(0);
    expect(_recoveryResidualSource(null, 'source only', '').residual).toBe(0); // no finalText → can't diff
  });
});

describe('anti-drift: Recovery wiring + the re-tag-failure desync guard', () => {
  it('the Tier-B gate sources its residual via _recoveryResidualSource (not the stale snapshot directly)', () => {
    expect(src).toMatch(/const _rs = _recoveryResidualSource\(td, sourceText, pdfFixResult\.finalText\)/);
    expect(src).toMatch(/const residualTokens = _rs\.missingTokens\.filter/);
    // the old hard dependency on td.missingTokens for the restore list is gone
    expect(src).not.toMatch(/const residualTokens = \(td\.missingTokens \|\| \[\]\)\.filter/);
  });
  it('restoration refreshes finalText so fresh-mode residuals reflect the restored words', () => {
    expect(src).toMatch(/accessibleHtml: html, htmlChars: html\.length, finalText: _restoredText/);
  });
  it('on re-tag failure it drops the stale cached bytes + flags validation stale (no display↔export divergence)', () => {
    expect(src).toMatch(/_lastTaggedBytesRef\.current = null/);
    expect(src).toMatch(/_staleAfterRestore: true/);
  });
  it('(2026-06-23; repointed 2026-07-05) the view-side folds are SINGLE-SOURCED, not hand-synced copies', () => {
    // Superseded premise: this test used to require TWO inline _normTokenForDiff copies kept in sync.
    // S7 (@34018900) replaced them with _normTokenForDiffShared → the pipeline's canonical
    // normTokenForDiff static (fold-equality sentinel: tests/norm_token_drift.test.js). Pin the
    // single-source wiring instead: no inline arrow copies remain, both use sites delegate, and the
    // load-order fallback still carries the enhanced folds (ligature + zero-width).
    expect((src.match(/const _normTokenForDiff = \(s\) =>/g) || []).length).toBe(0);          // hand-synced copies gone
    expect((src.match(/const _normTokenForDiff = _normTokenForDiffShared;/g) || []).length).toBeGreaterThanOrEqual(2); // both use sites delegate
    expect(src).toMatch(/window\.AlloModules\.createDocPipeline\.normTokenForDiff/);          // delegates to the canonical static
    expect(src).toMatch(/function _viewNormTokenFallback\(s\) \{/);
    expect(src).toMatch(/ﬁ/);                                                                  // ligature fold survives in the fallback
    expect(src).toMatch(/[​]/);                                                           // zero-width strip survives in the fallback
  });
});
