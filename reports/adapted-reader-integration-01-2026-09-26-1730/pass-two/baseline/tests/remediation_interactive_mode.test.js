// @vitest-environment jsdom
// Audit finding H2 (2026-07-26): NO test anywhere executed fixAndVerifyPdf in INTERACTIVE mode.
//
// Every full-run test — unit and e2e alike — passes an `onProgress` callback, and `onProgress` is
// precisely what sets `_silentMode`. That one flag gates 28 teacher-facing branches: the loading
// flag, the step string, the result write, every toast in the completion ladder, the audio cues,
// and the multi-session auto-save. So the entire lane a teacher actually drives had zero executed
// coverage, while the suite looked well covered because the batch lane runs the same function.
//
// This file drives the interactive lane for real. It is deliberately NOT a happy-path test: a
// green-path run needs pdf.js, a canvas, Tesseract and live Gemini. What it pins is the LIFECYCLE
// contract that failed in the field — the flag is raised on entry and always released, the step is
// cleared, and the teacher is told something — plus the silent/interactive split itself, which is
// the reason the gap existed.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

import { vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 }); // an interactive run walks real extraction before it fails

// A minimal but VALID baseline audit: fixAndVerifyPdf refuses to start without one
// (BaselineAuditRequiredError), and that refusal happens before the loading flag is raised — so a
// test that forgot this would pass while proving nothing about the interactive lane.
const BASELINE_AUDIT = { score: 42, issues: [], pageCount: 1, isScanned: false };

// Not a real PDF. The run is expected to fail during extraction; what is under test is what the
// interactive lane does to the UI on the way in and on the way out.
const NOT_A_PDF = 'JVBERi0xLjQKJeLjz9MKdGhpcyBpcyBub3QgYSByZWFsIHBkZg==';

function makeHarness(overrides = {}) {
  const calls = { loading: [], step: [], result: [], toasts: [] };
  const noop = () => {};
  const bag = {
    pdfDocumentEpoch: 0,
    pendingPdfBase64: NOT_A_PDF,
    pendingPdfFile: { name: 'handout.pdf' },
    pdfAuditResult: BASELINE_AUDIT,
    pdfFixResult: null,
    pdfTargetScore: 90,
    pdfAutoFixPasses: 1,
    pdfPolishPasses: 0,
    pdfAuditorCount: 1,
    currentUiLanguage: 'English',
    setPdfFixLoading: (v) => calls.loading.push(v),
    setPdfFixStep: (v) => calls.step.push(v),
    setPdfFixResult: (v) => calls.result.push(v),
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
  // A PERMANENT error, not a transient one: the breaker never retries auth/quota/config failures,
  // so the run fails in milliseconds instead of walking a jittered backoff ladder. What is under
  // test is the interactive lane's UI contract, not the retry policy.
  const permanentFailure = async () => {
    const err = new Error('API_AUTH_FAILED (test stub — no AI service in jsdom)');
    err.isConfig = true;
    throw err;
  };
  const pipeline = window.AlloModules.createDocPipeline({
    callGemini: permanentFailure,
    callGeminiVision: permanentFailure,
    callImagen: async () => null,
    addToast: (msg, kind) => calls.toasts.push({ msg: String(msg), kind }),
    t: (k) => k,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: bag,
  });
  return { pipeline, calls, bag };
}

// The run WILL fail (no real PDF). Swallow the rejection — the assertions are about the side
// effects on the way through, not the return value.
async function runInteractive(pipeline, opts) {
  try { return await pipeline.fixAndVerifyPdf(opts); }
  catch (err) { return { _threw: err }; }
}

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  // The ownership tokens the host publishes. Without them the run is discarded as STALE before it
  // can reach the interactive branches — which is itself the guard working correctly, and is pinned
  // as its own case below.
  window.__alloPdfDocumentEpoch = 0;
  window.__alloPdfRunGen = 0;
  // jsdom has no CDN, so the real loaders sit on a 60s _withTimeout and the run never reaches the
  // branches under test. Stub them to fail IMMEDIATELY: extraction dies, the run takes its failure
  // path, and the interactive UI contract — raise, release, clear, tell the teacher — is exactly
  // what runs. A green-path interactive run needs pdf.js, a canvas, Tesseract and live Gemini, so
  // it belongs in the Playwright corpus, not here.
  window.pdfjsLib = {
    getDocument: () => ({ promise: Promise.reject(new Error('stub: pdf.js unavailable in jsdom')) }),
    GlobalWorkerOptions: {},
  };
  // Every CDN-loaded global needs a TRUTHY stub, not null: _loadCdnScript short-circuits on its
  // readiness predicate, but a falsy global sends it through three URLs at a 12s timeout each —
  // which is what made the first version of this file sit for 30s+ per case.
  window.Tesseract = { createWorker: async () => { throw new Error('stub: no Tesseract in jsdom'); } };
  window.PDFLib = { PDFDocument: { load: async () => { throw new Error('stub: no pdf-lib in jsdom'); } } };
  window.pako = { inflate: () => { throw new Error('stub'); } };
  window.fontkit = {};
  window.axe = { run: async () => { throw new Error('stub: no axe in jsdom'); } };
});

describe('H2 — the interactive lane actually executes', () => {
  it('raises the loading flag on entry and ALWAYS releases it', () => {
    // The field regression this audit opened with was a modal that stayed busy — and separately,
    // one that stayed idle over a live run. Both are this contract.
    return (async () => {
      const { pipeline, calls } = makeHarness();
      await runInteractive(pipeline, { documentEpoch: 0, base64: NOT_A_PDF, fileName: 'handout.pdf', auditResult: BASELINE_AUDIT });
      expect(calls.loading.length, 'the interactive lane never touched pdfFixLoading — it was silent-moded').toBeGreaterThan(0);
      expect(calls.loading[0]).toBe(true);
      expect(calls.loading[calls.loading.length - 1], 'the loading flag was left raised after the run ended').toBe(false);
    })();
  });

  it('clears the step string on the way out', async () => {
    const { pipeline, calls } = makeHarness();
    await runInteractive(pipeline, { documentEpoch: 0, base64: NOT_A_PDF, fileName: 'handout.pdf', auditResult: BASELINE_AUDIT });
    // A stale step string renders under a fake progress bar — the exact cosmetic half of the
    // stuck-modal bug (H18).
    expect(calls.step.length).toBeGreaterThan(0);
    expect(calls.step[calls.step.length - 1]).toBe('');
  });

  it('tells the teacher something — a failed run is never silent', async () => {
    const { pipeline, calls } = makeHarness();
    await runInteractive(pipeline, { documentEpoch: 0, base64: NOT_A_PDF, fileName: 'handout.pdf', auditResult: BASELINE_AUDIT });
    expect(calls.toasts.length, 'the interactive run produced no toast at all').toBeGreaterThan(0);
  });

  it('a run WITH onProgress is silent-moded — the split that hid this lane', async () => {
    // This is the mechanism of the finding: supplying onProgress is what suppresses every
    // teacher-facing branch, and every other full-run test supplies it.
    const { pipeline, calls } = makeHarness();
    await runInteractive(pipeline, {
      documentEpoch: 0, base64: NOT_A_PDF, fileName: 'handout.pdf', auditResult: BASELINE_AUDIT,
      onProgress: () => {},
    });
    expect(calls.loading, 'onProgress should suppress the single-file loading flag').toEqual([]);
    expect(calls.result, 'onProgress should suppress the single-file result write').toEqual([]);
  });

  it('a pageRange run is NOT silent — partial remediation still owns the single-file UI', async () => {
    // The gate used to be `_isBatch` (any batchOverrides), which over-suppressed the UI whenever a
    // page range was set: the teacher saw no loading state, no result, and the multi-session
    // auto-save never fired.
    const { pipeline, calls } = makeHarness();
    await runInteractive(pipeline, {
      documentEpoch: 0, base64: NOT_A_PDF, fileName: 'handout.pdf', auditResult: BASELINE_AUDIT,
      pageRange: [1, 2],
    });
    expect(calls.loading.length).toBeGreaterThan(0);
    expect(calls.loading[0]).toBe(true);
  });

  it('refuses to start without a baseline audit, before raising the flag', async () => {
    // Order matters: raising the flag and then throwing would strand the modal busy.
    // Both sources have to be empty: the call's auditResult falls back to the state bag's
    // pdfAuditResult, so overriding only the argument proves nothing.
    const { pipeline, calls } = makeHarness({ pdfAuditResult: null });
    const out = await runInteractive(pipeline, { documentEpoch: 0, base64: NOT_A_PDF, fileName: 'handout.pdf', auditResult: null });
    expect(out && out._threw && out._threw.code).toBe('BASELINE_AUDIT_REQUIRED');
    expect(calls.loading, 'a pre-flight refusal must not touch the loading flag').toEqual([]);
  });
});
