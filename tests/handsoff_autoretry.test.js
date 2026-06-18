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
  it('never re-runs a PERMANENT error (auth/quota/config) — re-running cannot help', () => {
    expect(onclick).toContain('_permanentErr');
    expect(onclick).toContain('!_permanentErr(_handsErr)');
    expect(onclick).toMatch(/quota|429|RECITATION/);
  });
  it('progress-gates the loop retry (stop the moment a retry stops improving) and resumes the loop', () => {
    expect(onclick).toContain('_s <= _prevScore');
    expect(onclick).toContain('await runAutoFixLoop(8)');
  });
  it('gates on the RESULT ref (robust to the dead-man clearing loading flags) + autosaves at the end', () => {
    expect(onclick).toContain('!pdfFixResultRef.current && _fixTries < _HANDSOFF_MAX');
    expect(onclick).toContain('if (pdfFixResultRef.current && pdfAutoSaveProject) { saveProjectToFile(true); }');
  });
  it('posts a visible "retrying" note for each attempt', () => {
    expect(onclick).toMatch(/🔁/);
    expect(onclick).toContain('handsoff_retry_fix');
    expect(onclick).toContain('handsoff_retry_loop');
  });
});
