// 2026-07-26 — the remediation UI must never disagree with the pipeline's re-entry lock.
//
// Field regression (App-E, 8-page scanned PDF, Make Accessible): the run started normally and its
// pipeline log kept flowing for 78s, but the modal showed a plain, fully-interactive audit-results
// screen — no spinner, no progress bar, and an ARMED "Fix & Verify" button. Pressing it produced
// only `[fixAndVerifyPdf] Concurrent remediation start ignored`, because the pipeline's re-entry
// lock (not the UI) is what actually gates a second start.
//
// Root shape: two independent sources of truth for "a remediation is running".
//   * the pipeline lock `_activeSingleFixPromise` — authoritative, and correct that day;
//   * the host React boolean `pdfFixLoading` — written EXACTLY ONCE at run entry (~L20813),
//     with nothing re-asserting it and five unrelated call sites able to clear it.
// One lost write and the modal lied for the whole run.
//
// These pins hold the repair in place:
//   1. the lock is readable (isRemediationRunning / getActiveRemediationRun) so the UI can share
//      the pipeline's fact instead of mirroring it;
//   2. the probe agrees with the duplicate-start guard at the same instant — the exact disagreement
//      the field log captured;
//   3. the probe releases on generation invalidation, so an 8-min watchdog fire cannot pin the UI
//      busy forever (trading a stuck-idle bug for a stuck-busy one);
//   4. the busy flag is RE-ASSERTED on the progress heartbeat, not written once;
//   5. the modal's interactive surfaces read the combined signal, not bare pdfFixLoading.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// Every setter _bindState pulls off the state bag. Supplying all of them keeps a run's failure
// on its own merits (bad base64) instead of a TypeError on an undefined setter.
const makeStateBag = (overrides = {}) => {
  const calls = { pdfFixLoading: [], pdfFixStep: [], pdfFixResult: [] };
  const noop = () => {};
  const bag = {
    pdfDocumentEpoch: 0,
    pendingPdfBase64: null,
    pendingPdfFile: null,
    pdfAuditResult: null,
    pdfFixResult: null,
    pdfTargetScore: 90,
    pdfAutoFixPasses: 1,
    pdfPolishPasses: 0,
    pdfAuditorCount: 1,
    currentUiLanguage: 'English',
    setPdfFixLoading: (v) => calls.pdfFixLoading.push(v),
    setPdfFixStep: (v) => calls.pdfFixStep.push(v),
    setPdfFixResult: (v) => calls.pdfFixResult.push(v),
    setPdfAuditResult: noop,
    setPdfAuditLoading: noop,
    setPendingPdfBase64: noop,
    setPendingPdfFile: noop,
    setPdfBatchQueue: noop,
    setPdfBatchProcessing: noop,
    setPdfBatchCurrentIndex: noop,
    setPdfBatchStep: noop,
    setPdfBatchSummary: noop,
    setIsGeneratingStyle: noop,
    setCustomExportCSS: noop,
    setInputText: noop,
    setGenerationStep: noop,
    setIsExtracting: noop,
    setExportAuditLoading: noop,
    setExportAuditResult: noop,
    setError: noop,
    ...overrides,
  };
  return { bag, calls };
};

let pipeline;
let calls;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const made = makeStateBag();
  calls = made.calls;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => 'OK',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (k) => k,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: made.bag,
  });
});

const startOpts = () => ({ documentEpoch: 0, base64: 'QUFBQUFB', fileName: 'pin.pdf', auditResult: { score: 50, pageCount: 1 } });

describe('the pipeline publishes its run-ownership fact — LIVE instance', () => {
  it('exports both the boolean probe and the run descriptor', () => {
    expect(typeof pipeline.isRemediationRunning).toBe('function');
    expect(typeof pipeline.getActiveRemediationRun).toBe('function');
  });

  it('reports idle when no run owns the pipeline', () => {
    expect(pipeline.isRemediationRunning()).toBe(false);
    expect(pipeline.getActiveRemediationRun()).toBe(null);
  });

  it('reports RUNNING at the same instant the duplicate-start guard rejects', async () => {
    // The lock is claimed synchronously, before the worker's first await — so a probe taken
    // immediately after the call must already agree. This is the exact disagreement the field
    // log captured: guard says "already running", UI said "idle, here is an armed button".
    const first = pipeline.fixAndVerifyPdf(startOpts());
    expect(pipeline.isRemediationRunning()).toBe(true);

    let duplicateError = null;
    await pipeline.fixAndVerifyPdf(startOpts()).catch((error) => { duplicateError = error; });
    expect(duplicateError).toBeTruthy();
    expect(duplicateError.isAlreadyRunning).toBe(true);
    // Still held — the rejected duplicate must not release the original owner's lock.
    expect(pipeline.isRemediationRunning()).toBe(true);

    await first.catch(() => {});
    expect(pipeline.isRemediationRunning()).toBe(false);
  });

  it('scopes by document epoch without ever claiming a foreign document', async () => {
    const first = pipeline.fixAndVerifyPdf(startOpts());
    const run = pipeline.getActiveRemediationRun();
    expect(run).toBeTruthy();
    // documentEpoch is null until the run clears its digest await and publishes the live slot.
    // Callers scoping by document must read that as "not yet attributable", never as "another doc" —
    // treating it as foreign would re-open the same armed-button hole for the first seconds of a run.
    expect(pipeline.isRemediationRunning(0)).toBe(true);
    expect(pipeline.isRemediationRunning(undefined)).toBe(true);
    await first.catch(() => {});
  });

  it('releases the probe when the run generation is invalidated (watchdog safety valve)', async () => {
    const first = pipeline.fixAndVerifyPdf(startOpts());
    expect(pipeline.isRemediationRunning()).toBe(true);
    // What the 8-min dead-man switch does when it gives up on a hung run. It cannot settle the
    // promise, so without this release the UI would stay disabled forever.
    window.__alloPdfRunGen = (window.__alloPdfRunGen || 0) + 1;
    expect(pipeline.isRemediationRunning()).toBe(false);
    await first.catch(() => {});
  });

  it('never claims the single-file UI for a managed batch', async () => {
    // Managed runs share the same serialized lock but own their own progress UI — the single-file
    // controls must stay live for them. base64:'' makes the worker bail on its first check, so this
    // pin cannot leave the shared lock held for the rest of the file.
    const managed = pipeline.fixAndVerifyPdf({ ...startOpts(), base64: '', onProgress: () => {} });
    expect(pipeline.isRemediationRunning()).toBe(false);
    await managed.catch(() => {});
  });
});

describe('the busy flag is re-asserted, not written once', () => {
  it('drives setPdfFixLoading(true) from the progress heartbeat as well as run entry', async () => {
    calls.pdfFixLoading.length = 0;
    // Publish the ownership epoch so this run clears its stale-document check and actually emits
    // progress. The pins above deliberately run WITHOUT it (the run bails in microseconds there,
    // which is all the lock lifecycle needs), so it is torn down again below.
    window.__alloPdfDocumentEpoch = 0;
    const run = pipeline.fixAndVerifyPdf(startOpts());
    run.catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 60));
    const trues = calls.pdfFixLoading.filter((v) => v === true);
    // Cancel it the way the dead-man switch does, so this pin never leaves a real extraction
    // grinding for the rest of the suite.
    window.__alloPdfRunGen = (window.__alloPdfRunGen || 0) + 1;
    delete window.__alloPdfDocumentEpoch;
    // >1 proves the heartbeat path is live. With only the one-shot entry write (the shipped
    // behaviour on the day of the field report), a single lost or clobbered write left the modal
    // interactive for the whole run with nothing to repair it.
    expect(trues.length).toBeGreaterThan(1);
  });

  it('re-asserts only for live, non-terminal states', () => {
    // Terminal states belong to the completion/failure paths, which clear the flag and write
    // pdfFixResult in the same tick — re-asserting there would resurrect a finished run's spinner.
    expect(dp).toContain("if ((next.status === 'running' || next.status === 'throttled')");
    expect(dp).toContain("&& typeof setPdfFixLoading === 'function' && _isRemediationRunning()) {");
  });
});

describe('the audit modal reads the combined signal', () => {
  it('defines _remediationBusy as the OR of the host flag and the live-run mirror', () => {
    expect(view).toContain('const _remediationBusy = pdfFixLoading || pipelineRunActive;');
    expect(view).toContain("typeof _docPipeline.isRemediationRunning === 'function'");
  });

  it('keeps a polling backstop, because progress events share the gate that hid the run', () => {
    // The documentEpoch/runId gates on alloflow:remediation-progress are themselves a way a run
    // goes invisible — a listener-only mirror would inherit the same blind spot, and a settled
    // lock emits no release event at all.
    expect(view).toContain('const id = setInterval(sync, 1000);');
  });

  it('gates the start controls and the progress panel on the combined signal', () => {
    expect(view).toContain('disabled={_remediationBusy || remediationReady === false}');
    expect(view).toContain('{_remediationBusy && (');
    // The one-click guard now reports the exact owner that blocked the start. Its helper
    // inlines _remediationBusy into the host flag + authoritative pipeline probe so the
    // diagnostic remains specific without weakening the original OR contract.
    expect(view).toContain('const _gateBlockers = _oneClickGateBlockers();');
    expect(view).toContain('if (_gateBlockers.length) {');
    expect(view).toContain('if (_oneClickRemediationBusyRef.current) blockers.push(');
    expect(view).toContain('if (pdfAuditLoading) blockers.push(');
    expect(view).toContain('if (pdfFixLoading) blockers.push(');
    expect(view).toContain('if (pipelineRunActive) blockers.push(');
    expect(view).toContain('if (pdfAutoContinueRunning) blockers.push(');
    // The destructive "Start New Audit" control must not be reachable over a live run either.
    expect(view).toContain('disabled={_remediationBusy}');
  });

  it('no longer arms Fix & Verify from the one-shot flag alone', () => {
    expect(view).not.toContain('disabled={pdfFixLoading || remediationReady === false}');
  });
});

// ── Two adjacent "silent failure" shapes found while tracing the same bug ──

describe('a companion job cannot clear another operation\'s spinner', () => {
  it('_finishPdfRemediationOperation honors the ownsPdfFixLoading flag it records', () => {
    // _beginRemediationOperation has always stored ownsPdfFixLoading (false for translation,
    // palette, preview-audit, smart-table…), and the finisher ignored it. Latent — those callers
    // exit through _completeRemediationOperation — but one refactor away from the same class of
    // bug: a background job's completion turning off a live run's busy state.
    expect(view).toContain('ownsPdfFixLoading: ownsPdfFixLoading !== false,');
    expect(view).toContain("if (!ticket || !ticket.metadata || ticket.metadata.ownsPdfFixLoading !== false) {");
  });
});

describe('the progress-event epoch gate reports itself', () => {
  it('the pipeline exposes a host diagnostics sink that reaches the in-app Log panel', () => {
    expect(typeof pipeline.logHostDiagnostic).toBe('function');
    const before = (window._alloflowPipelineWarnings || []).length;
    pipeline.logHostDiagnostic('EpochGate', 'pin', { runId: 'r1', documentEpoch: 7 });
    const entries = window._alloflowPipelineWarnings || [];
    expect(entries.length).toBe(before + 1);
    // Same buffer + shape as pipeline entries, so the panel renders it with no special-casing.
    expect(entries[entries.length - 1]).toMatchObject({ tag: 'EpochGate', msg: 'pin', runId: 'r1' });
  });

  it('never throws back into its caller', () => {
    expect(() => pipeline.logHostDiagnostic()).not.toThrow();
    expect(() => pipeline.logHostDiagnostic(null, null, null)).not.toThrow();
  });

  it('the view reports a documentEpoch mismatch once per run instead of dropping in silence', () => {
    expect(view).toContain('&& !(opts && opts.hydration)) _noteEpochMismatch(e.detail);');
    expect(view).toContain('if (_mismatchReported.has(runKey)) return;');
    expect(view).toContain("_docPipeline.logHostDiagnostic('EpochGate', note, {");
    // The gate must still DROP the event — reporting is not permission to render another
    // document's trace.
    expect(view).toContain('if (!_eventIsForCurrentDocument(e) || e.detail.version !== 1) return;');
  });

  it('does NOT report the mount-time hydration replay (audit finding L8)', () => {
    // window.__alloRemediationProgress is written by the pipeline and never cleared, and the view
    // replays it on every documentEpoch change to avoid a blank panel. After the teacher switches
    // documents that replay is ALWAYS the previous document's last event — so reporting it would
    // fire a false "progress events dropped" alarm on a healthy session and poison the very triage
    // signal the report exists to provide.
    expect(view).toContain("if (latest) onProgress({ detail: latest }, { hydration: true });");
    expect(view).toContain('const onProgress = (e, opts) => {');
  });
});
