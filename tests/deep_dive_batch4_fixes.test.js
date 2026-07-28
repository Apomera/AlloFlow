// Deep dive 2026-07-09, batch 4 (M3/M5/M7/M8/M9/M10/M21/M22/M25) — anti-drift pins.
// (M4's behavioral golden lives in gemini_pacing_stagger.test.js — the localBackend gate case.)
//
// M3  — the run-entry breaker reset is SKIPPED while the gate is busy (an overlapping run's live
//       storm state must not be zeroed under it).
// M5  — the published "estimated minimum" derives from full-coverage AI readings only; a
//       partial-inflated bestAiScore can no longer wear the "last successful AI audit" label.
// M7  — the 12-min auto-continue dead-man re-arms on pipeline heartbeats (it killed slow-but-ALIVE
//       chunked rounds in exactly the storm regime wait-not-stop protects).
// M8  — the main fix loop breaks at pass boundaries once the run generation goes stale (an
//       invalidated run stops burning quota, not just discards its result).
// M9  — a STALE run's failure/exit never stomps the fresh run's UI (pipeline catch + host finally).
// M10 — settings-lock disclosure shown during a run + the Target Score label matches the real
//       default (95 since 2026-06-23; the label said 90 for 2+ weeks).
// M21 — the fidelity panel's lead sentence no longer frames quality-only notes as text loss.
// M22 — Fix-Remaining's fidelityLimited recompute keeps the coverage<90 half.
// M25 — a silently-skipped auto-veraPDF renders an amber line instead of an absent badge.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(resolve(process.cwd(), f), 'utf8')).join('\n');

describe('M3 — busy gate keeps its earned storm state at run entry', () => {
  it('the reset is gated on an idle gate; idle runs still reset (CB-1 preserved)', () => {
    expect(dp).toContain('if (_geminiInFlight > 0 || _geminiWaiters.length > 0) {');
    expect(dp).toContain('Run-entry breaker reset SKIPPED');
    const at = dp.indexOf('Run-entry breaker reset SKIPPED');
    const after = dp.slice(at, at + 400);
    expect(after).toContain('_resetGeminiBreaker();'); // the else branch still resets
  });
});

describe('M5 — estimated-minimum provenance is partial-inflation-free', () => {
  it('the loop tracks the latest FULL-coverage AI reading and returns it', () => {
    expect(dp).toContain('const _initialAiUsable = _alloUsableCompleteAiAudit(verification);');
    expect(dp).toContain('let _lastFullCoverageAiScore = _initialAiUsable ? bestAiScore : null;');
    expect(dp).toContain('if (_reAiUsable) _lastFullCoverageAiScore = Math.round(newAiScore);');
    expect(dp).toContain('lastFullCoverageAiScore: _lastFullCoverageAiScore };');
  });
  it('_lastSuccessfulAiScore rejects partial scores in BOTH branches (primary + fallback)', () => {
    expect(dp).toContain('const _lastSuccessfulAiScore = _alloUsableCompleteAiAudit(verification)');
    expect(dp).toContain(': (Number.isFinite(_lastFullCoverageAiScore) ? Math.round(_lastFullCoverageAiScore) : null);');
    // the old fallback to the possibly-partial-inflated bestAiScore is gone
    expect(dp).not.toContain(': (Number.isFinite(bestAiScore) ? Math.round(bestAiScore) : null);');
  });
});

describe('M8 — the fix loop stops grinding when superseded', () => {
  it('fixAndVerifyPdf builds a run-scope staleness probe and threads it into the loop ctx', () => {
    expect(dp).toContain('const _runAbortSignal =');
    expect(dp).toContain('const _runGenStale = () => !!(_runAbortSignal && _runAbortSignal.aborted)');
    expect(dp).toContain('genStale: _runGenStale, signal: _runAbortSignal, owner: _runTelemetry');
  });
  it('the pass loop breaks on staleness at each boundary', () => {
    expect(dp).toContain('const _shouldAbort = () => {');
    expect(dp).toContain('if (_shouldAbort()) {');
    expect(dp).toContain('Run superseded (generation bump) — ending the fix loop');
  });
});

describe('M9 — a stale run never stomps the fresh run\'s UI', () => {
  it('pipeline: the failure catch is gen-guarded like the success path', () => {
    expect(dp).toContain('Stale run failed (gen ');
    const at = dp.indexOf('Stale run failed (gen ');
    // the guard must come BEFORE the UI writes + toast in the catch
    const after = dp.slice(at, at + 600);
    expect(after).toContain('return null;');
  });
  it('host: runAutoFixLoop\'s finally guards the spinner/status and clears the running flag on OWNERSHIP', () => {
    expect(anti).toContain("warnLog('[AutoContinue] Stale loop exiting (gen bump) — leaving the fresh run\\'s UI untouched.');");
    expect(anti).toContain('const _ownsExit = pdfAutoContinueAbortCtrlRef.current === _abortCtrl;');
    expect(anti).toContain('if (!_staleAtExit && _ownsExit) {');
    expect(anti).toContain('if (_ownsExit) {');
    expect(view).toContain("selectChunkVersion?.(chunk.index, 'original'");
    expect(view).toContain("selectChunkVersion?.(chunk.index, 'fixed'");
    expect(view).not.toContain('cs.fixedChunks[chunk.index] =');
    expect(anti).toContain('const selectChunkVersion = _docPipeline ? _docPipeline.selectChunkVersion');
  });
});

describe('M7 — the 12-min dead-man is heartbeat-aware', () => {
  it('re-arms on alloflow:pipeline-warn and fires only after 12 SILENT minutes', () => {
    const at = anti.indexOf('pdfAutoContinueRunning stuck on');
    expect(at).toBeGreaterThan(-1);
    // Widened from +1600: onActivity grew a run-identity check, which pushed the
    // listener registration past the old window and made this read as "the
    // listener is gone" when it had only moved down.
    const block = anti.slice(at - 2200, at + 3200);
    expect(block).toContain("window.addEventListener('alloflow:pipeline-warn', onActivity);");
    // The heartbeat must belong to THIS run before it re-arms. Previously any
    // pipeline-warn re-armed the watchdog, so a superseded or unrelated run's
    // heartbeat kept a genuinely stuck run's dead-man switch from ever firing.
    expect(block).toMatch(/if \(!detail \|\| detail\.documentEpoch !== watchdogEpoch \|\| !detail\.runId\) return;/);
    expect(block).toMatch(/if \(detail\.runId !== watchdogRunId\) return;/);
    expect(block).toContain('const arm = () => { if (id) clearTimeout(id); id = setTimeout(fire, 12 * 60 * 1000); };');
    expect(block).toContain('no pipeline heartbeat');
  });
});

describe('M10 — settings honesty', () => {
  it('the Target Score label matches the real default (95)', () => {
    expect(view).toContain('<span>95 (default)</span>');
    expect(view).not.toContain('<span>90 (default)</span>');
  });
  it('the settings-lock disclosure renders while a run is active', () => {
    expect(view).toContain('(pdfFixLoading || pdfAutoContinueRunning) && (');
    expect(view).toContain('changes here apply to the NEXT run; the current run keeps the settings it started with');
  });
});

describe('M21/M22 — fidelity panel honesty', () => {
  it('M21: quality-only notes get a quality lead, not a text-loss warning', () => {
    // 2026-07-13: ocrColumnOrder joined the quality set (column-aware OCR reorders are
    // quality flags, not text loss) — the pin tracks the current list.
    expect(view).toContain('const _qualityKinds = { altQuality: 1, activeContent: 1, lowOcrAccuracy: 1, lowOcrConfidence: 1, ocrDupeCollapse: 1, pageEdge: 1, ocrColumnOrder: 1 };');
    expect(view).toContain('the notes below are QUALITY flags');
    // text-loss concern still uses the original warning copy
    expect(view).toContain('some source text may not have carried over');
  });
  it('M22: Fix-Remaining keeps the coverage<90 half of fidelityLimited', () => {
    expect(view).toContain('const fidelityLimited = _refixNotes.length > 0');
    expect(view).toContain("_fixRemainingSource.integrityCoverage < 90");
    expect(view).toContain('fidelityLimited,');
  });
});

describe('M25 — a skipped auto-veraPDF is disclosed, not silent', () => {
  it('records WHY it was skipped (transport blocked vs validation failed) and clears at run entry', () => {
    expect(view).toContain("if (pdfAutoVeraPdf && _isPdfSkip) setVeraPdfAutoSkipped('transport-blocked');");
    expect(view).toContain("if (!_validated && _attemptCurrent) { try { setVeraPdfAutoSkipped('validation-failed'); } catch (_) {} }");
    expect(view).toContain('setLastTaggedValidation(null); setVeraPdfResult(null); setVeraPdfAutoSkipped(null); _selectTaggedArtifact(null);');
  });
  it('renders one amber line where the badge would be', () => {
    expect(view).toContain('if (!_ltv && veraPdfAutoSkipped) return (');
    expect(view).toContain('PDF/UA validation could not run (pop-up blocked / validator still starting)');
  });
});
