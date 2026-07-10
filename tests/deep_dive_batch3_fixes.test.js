// Deep dive 2026-07-09, batch 3 pipeline chunk (M16/M17/M1/M2/M6) — goldens + anti-drift pins.
//
// M16 — the Vision chunk post-process un-escaped `\n`/`\"`/`\t` on EVERY chunk, stripped or not,
//       corrupting literal backslash sequences in plain-text chunks (LaTeX `\theta` → TAB+"heta",
//       Windows paths) in the OCR ground truth. _safeStripJsonWrapper now reports { text, stripped }
//       and the rewrites run only when a JSON wrapper was actually stripped.
// M17 — the fresh-spawn Tesseract fallback passed { blocks: true } as a 4th arg the v5 STATIC
//       recognize API ignores, silently losing word boxes exactly when the shared worker failed.
//       Attempts now spawn a real worker (worker.recognize output form) and terminate it either way.
// M1  — the circle-back re-audit also covers a NULL/thrown final audit under a storm (used to ship
//       degraded immediately with the whole 10-min wait budget unused).
// M2  — the circle-back's wait and each re-audit are _withTimeout-clamped to the remaining budget so
//       they can never push a FINISHED remediation past the batch per-file wall.
// M6  — the circle-back ticks the visible status (updateProgress) instead of freezing the last
//       pass-4 message for up to 10 minutes, and stops spending when the run generation goes stale.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('M16 — un-escape only after a REAL JSON unwrap (behavioral slice)', () => {
  const start = dp.indexOf('const _safeStripJsonWrapper = (chunkStr, chunkIdx) => {');
  const end = dp.indexOf('// Determine chunk strategy based on page count', start);
  expect(start).toBeGreaterThan(-1);
  const wrapper = new Function('window', dp.slice(start, end) + '\nreturn _safeStripJsonWrapper;')({ __lastVisionStripTrail: [] });

  it('a plain-text chunk reports stripped:false and its text byte-identical (backslashes intact)', () => {
    const plain = 'The angle \\theta satisfies a \\neq b.\nSee C:\\temp\\notes.txt for details.';
    const r = wrapper(plain, 0);
    expect(r.stripped).toBe(false);
    expect(r.text).toBe(plain);
  });
  it('a real leading JSON header reports stripped:true with the extracted body', () => {
    // the helper strips a LEADING metadata object (<50% of the chunk) — the b0d24ae3 shape
    const trailing = 'The rest of the page continues here with plenty of plain prose after the header object.';
    const r = wrapper('{"text": "Recovered page text."}\n' + trailing, 1);
    expect(r.stripped).toBe(true);
    expect(r.text).toBe('Recovered page text.');
  });
  it('a text-looking chunk that merely STARTS with { still refuses (b0d24ae3 posture preserved)', () => {
    const odd = '{not json at all — a brace-led paragraph';
    const r = wrapper(odd, 2);
    expect(r.stripped).toBe(false);
    expect(r.text).toBe(odd);
  });
  it('both call sites gate the un-escape on stripped', () => {
    const gated = dp.match(/if \(!unwrapped\.stripped\) return unwrapped\.text;/g) || [];
    expect(gated.length).toBe(2);
    // and no call site un-escapes a bare string anymore
    expect(dp).not.toContain('return unwrapped\n');
  });
});

describe('M17 — fresh-spawn OCR fallback keeps word boxes', () => {
  it('attempts spawn a real worker and use the worker-API output form (blocks + text)', () => {
    expect(dp).toContain('_wk = await window.Tesseract.createWorker(a.l);');
    expect(dp).toContain("return _wk.recognize(canvas, undefined, a.b ? { blocks: true, text: true } : { text: true });");
  });
  it('the broken static 4-arg call is gone', () => {
    expect(dp).not.toContain('window.Tesseract.recognize(canvas, a.l, undefined,');
  });
  it('every attempt terminates its worker (finally), including a boot that outlives the timeout', () => {
    expect(dp).toContain('finally { _cancelled = true; if (_w) { try { await _w.terminate(); } catch (_) {} } }');
    expect(dp).toContain("if (_cancelled) { try { _wk.terminate(); } catch (_) {} throw new Error('fresh-spawn attempt superseded'); }");
  });
});

describe('M1/M2/M6 — circle-back covers null audits, respects the wall, and keeps the status honest', () => {
  it('M1: the re-audit gate fires for absent-under-throttle, not only partial', () => {
    expect(dp).toContain('const _reAuditNeeded = (verification && verification._partialAudit)');
    expect(dp).toContain('|| (_finalAuditThrottled && !_finalAuditHadUsableScore);');
  });
  it('M2: wait + re-audit are individually budget-clamped (abandon, never let the wall discard)', () => {
    expect(dp).toContain("}), Math.max(1000, _deferHardStop - Date.now() + 5000), 'deferred re-audit wait');");
    expect(dp).toContain("Math.max(5000, _deferHardStop - Date.now()), 'deferred re-audit round ' + _roundNow");
  });
  it('M6: the wait ticks the visible step and a gen bump stops the spend', () => {
    expect(dp).toContain("const _genStale = () => (!_silentMode && typeof window !== 'undefined' && (window.__alloPdfRunGen || 0) !== _myRunGen);");
    expect(dp).toContain("onTick: (w) => { try { updateProgress(4, 'AI re-reading '");
    expect(dp).toContain("if (Date.now() >= _deferHardStop || _genStale()) break;");
  });
});
