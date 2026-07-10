// Hands-off auto-retry + chunk-error resilience (2026-06-18). User ask: when the pipeline bails in the
// unattended "Make Accessible" path, retry and keep going without intervention, with a visible note —
// bounded, progress-gated, and never re-running a permanent (auth/quota/config) error. Plus B18: a single
// transient chunk-fix error must not kill ALL remaining fix passes. These are wired into UI onClick /
// pipeline-loop code that can't be unit-executed here, so we pin the load-bearing structure by source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const doc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('B18 — a transient chunk-fix error skips the pass; a persistent one (2 consecutive) bails', () => {
  it('the fix loop uses a consecutive-error counter (continue on the 1st, break on the 2nd) + resets on success', () => {
    expect(doc).toContain('let _consecFixErrors = 0; // B18');
    expect(doc).toContain('if (++_consecFixErrors >= 2) {');
    expect(doc).toContain('continue;');
    expect(doc).toContain('_consecFixErrors = 0;'); // reset after a successful aiFixChunked pass
    // the OLD bare unconditional break-on-first-error is gone
    expect(doc).not.toContain('warnLog(`[Auto-fix] Pass ${fixPass + 1} AI fix failed:`, fixErr);\n            break;\n          }');
  });
});

describe('hands-off auto-retry — Make Accessible retries bounded, progress-gated, skips permanent errors', () => {
  const onclick = view.slice(view.indexOf('Hands-off auto-retry'), view.indexOf('className="w-full px-8 py-4'));
  it('bounds BOTH the fix re-run and the loop re-run at max 3', () => {
    expect(onclick).toContain('const _HANDSOFF_MAX = 3;');
    expect(onclick).toContain('_fixTries < _HANDSOFF_MAX');
    expect(onclick).toContain('_loopTries < _HANDSOFF_MAX');
  });
  it('classification-aware dispositions replace the regex (finding 2/8, 2026-07-10): permanent never retries, daily quota pauses, bursts wait', () => {
    // fixAndVerifyPdf now RETHROWS single-mode failures carrying the Gemini classification —
    // the old _permanentErr regex (which treated EVERY quota/429 as permanent) is retired in
    // favor of a structured disposition table; the regex survives only as the unclassified fallback.
    expect(onclick).toContain('const _handsDisposition = (e) => {');
    expect(onclick).toContain("if (e.isAuth && !e.canvasTransientAuth) return 'never';");
    expect(onclick).toContain("if (e.isQuota) return (e.classification && e.classification.perDay) ? 'pause-daily' : 'wait-retry';");
    expect(onclick).toContain("if (e.canvasTransientAuth) return 'wait-retry';");
    expect(onclick).toContain("if (_disp === 'never' || _disp === 'stop-silent') break;");
    expect(onclick).toContain("if (_disp === 'pause-daily') {");
    expect(onclick).toContain('waitForGeminiCalm');           // burst → breaker-aware wait, not a blind sleep
    expect(onclick).toMatch(/offline|cdn|mirror|failed to|load timeout/); // A3-MED fallback regex retained
    // …and a FAILED run can no longer adopt a stale pdfFixResultRef as instant success:
    expect(onclick).toContain('if (!_handsErr) { for (let _w = 0;');
  });
  it('honors the user STOP across the retry boundary (A3-HIGH — must not relaunch the loop after Stop)', () => {
    expect(onclick).toContain('const _stopped = () => !!(pdfAutoContinueAbortRef && pdfAutoContinueAbortRef.current);');
    expect(onclick).toContain('&& !_stopped()'); // in the while conditions
    expect(onclick).toContain('if (_stopped()) break;'); // after the await
  });
  it('progress-gates the loop retry (stop the moment a retry stops improving) and resumes the loop', () => {
    expect(onclick).toContain('_s <= _prevScore');
    expect(onclick).toContain('await runAutoFixLoop(8)');
  });
  it('captures the fix return value + polls for the result (A3-MED — no single-250ms ref-timing race) + autosaves', () => {
    expect(onclick).toContain('_res = await fixAndVerifyPdf(');
    expect(onclick).toContain('!(_res || pdfFixResultRef.current)'); // the poll condition
    expect(onclick).toContain('while (!_res && _fixTries < _HANDSOFF_MAX'); // gates the fix re-run on the captured result
    expect(onclick).toContain('if (pdfFixResultRef.current && pdfAutoSaveProject) { saveProjectToFile(true); }');
  });
  it('posts a visible "retrying" note for each attempt', () => {
    expect(onclick).toMatch(/🔁/);
    expect(onclick).toContain('handsoff_retry_fix');
    expect(onclick).toContain('handsoff_retry_loop');
  });
});
