// @vitest-environment jsdom
// Fixes from the 2026-07-27 regression deep dive (22-agent workflow, adversarially verified).
//
// Every pin here is BEHAVIOURAL where the code allows it. The deep dive's own headline lesson —
// carried over from the M15 breaker regression — is that a pin asserting a construct EXISTS will
// stay green through a total failure of what that construct DECIDES.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// H9 rewrite — inline anchors, matched as opener+closer pairs.
// ─────────────────────────────────────────────────────────────────────────────
describe('H9 — inline anchors survive real hrefs and stay balanced', () => {
  let render;
  beforeAll(() => {
    loadAlloModule('doc_builder_renderer_module.js');
    render = window.AlloModules.DocBuilderRenderer.createRenderer({
      docStyle: {}, _accessibleHeaderColors: () => ({}), _alloCellRichText: (s) => s,
      _emitAccessibleTableHtml: () => '', _pipeLog: () => {}, _sanitizeRawHtmlBlock: (s) => s,
      _validateTableGrid: (t) => t, renderWordArtHtml: () => '', warnLog: () => {},
    });
  });
  const p = (text) => render([{ type: 'paragraph', text }]);
  const counts = (html) => ({ open: (html.match(/<a\s/g) || []).length, close: (html.match(/<\/a>/g) || []).length });

  it('a QUERY-STRING href becomes a real link — the defect that made H9 near-useless', () => {
    // escapeTextField escapes & to &amp; first, and the old capture was [^&]*?, which cannot span
    // it. Every district-portal / Google / utm-tagged link shipped as visible literal markup.
    const out = p('See <a href="https://maine.gov/doe?topic=iep&lang=en">the DOE page</a>.');
    expect(out).toContain('<a href="https://maine.gov/doe?topic=iep&lang=en">');
    expect(out).toContain('the DOE page</a>');
    expect(out).not.toMatch(/&lt;a\s/);
  });

  it('a bare href still works', () => {
    expect(p('See <a href="https://maine.gov/doe">the DOE page</a>.')).toContain('<a href="https://maine.gov/doe">');
  });

  it('a FAILING anchor beside a passing one leaves both balanced', () => {
    // The old count-and-replay assigned </a> in document order while the counter only knew HOW MANY
    // openers succeeded — so the closer belonging to the still-escaped anchor was consumed, leaving
    // an orphan </a> and a real link that never closed.
    const out = p('See <a href="https://x.org" onclick="steal()">bad</a> and <a href=\'https://y.org\'>good</a>.');
    const c = counts(out);
    expect(c.open, 'unbalanced anchors reach PDF/UA and axe as real defects').toBe(c.close);
    expect(out).toContain('<a href="https://y.org">');
    // The rejected anchor stays escaped, so the literal text "onclick" is still visible in the
    // paragraph — that is the intended, safe outcome. What must not exist is a LIVE onclick
    // attribute on a real element.
    expect(out).not.toMatch(/<a[^>]*onclick/i);
    expect(out).toContain('&lt;a href=');
  });

  it('an anchor with any extra attribute stays fully escaped — the security property', () => {
    const out = p('See <a href="https://x.org" target="_blank">x</a>.');
    expect(out).not.toMatch(/<a\s/);
    expect(counts(out).open).toBe(counts(out).close);
  });

  it('a javascript: href is neutralised, not emitted', () => {
    const out = p('See <a href="javascript:alert(1)">bad</a>.');
    expect(out).not.toContain('javascript:');
    expect(counts(out).open).toBe(counts(out).close);
  });

  it('text with no anchors is untouched and balanced', () => {
    const out = p('No links here at all.');
    expect(counts(out)).toEqual({ open: 0, close: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The "Fix Remaining" lane — never filter a kind you do not recompute.
// ─────────────────────────────────────────────────────────────────────────────
describe('Fix Remaining recomputes and filters the SAME set', () => {
  let pipeline;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
    });
  });

  it('the lane set excludes placement — the lane has no orphan scan', () => {
    const lane = pipeline.refixLaneRecomputedFidelityKinds;
    expect(lane).toBeTruthy();
    expect(lane.placement, 'filtering placement without recomputing it deletes the preserved-source-box disclosure').toBeFalsy();
    expect(lane).toMatchObject({ links: 1, tables: 1, refusal: 1, numeric: 1, 'reading-order': 1 });
  });

  it('the reducer set DOES include placement — the two lanes are deliberately different', () => {
    expect(pipeline.refixRecomputedFidelityKinds.placement).toBe(1);
  });

  it('merging with the lane set preserves a placement note', () => {
    const prev = [
      { kind: 'placement', msg: '4 source passages could not be placed…' },
      { kind: 'lowOcrAccuracy', msg: 'durable' },
      { kind: 'numeric', msg: 'STALE numeric' },
    ];
    const out = pipeline.mergeFidelityNotes(prev, [], pipeline.refixLaneRecomputedFidelityKinds);
    expect(out.some((n) => n.kind === 'placement'), 'the re-fix deleted a disclosure it never regenerates').toBe(true);
    expect(out.some((n) => n.kind === 'lowOcrAccuracy')).toBe(true);
    expect(out.some((n) => n.kind === 'numeric'), 'numeric IS recomputed by this lane, so a clean pass clears it').toBe(false);
  });

  it('the M12 link baseline is reachable from every lane through one accessor', () => {
    window.__alloSourceLinkCount = 14;
    expect(pipeline.sourceLinkCount()).toBe(14);
    window.__alloSourceLinkCount = 0;
    expect(pipeline.sourceLinkCount(), '0 means "nothing measured", not "measured zero"').toBeNull();
  });

  it('the link net fires on a pdf.js source text once the baseline is supplied', () => {
    // The whole point of M12: pdf.js text contains no markdown, so without the measured baseline
    // the net reads 0 source links and can never fire.
    const src = 'Homework Portal Grades Attendance Library Catalog Family Handbook. Visit the portal.';
    const htmlNoLinks = '<main><h1>Resources</h1><p>' + src + '</p></main>';
    expect(pipeline.computeStructuralFidelityNotes(src, htmlNoLinks).some((n) => n.kind === 'links')).toBe(false);
    expect(pipeline.computeStructuralFidelityNotes(src, htmlNoLinks, { links: 14 }).some((n) => n.kind === 'links')).toBe(true);
  });

  it('the view lane passes both the baseline and its own kind set', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain('_docPipeline.computeStructuralFidelityNotes(_srcRaw, bestHtml, _srcLinks ? { links: _srcLinks } : null)');
    expect(view).toContain('_docPipeline.mergeFidelityNotes(_fixRemainingSource.fidelityNotes, _notes, _laneKinds)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L7 — a storm signal must be EARNED by the current run.
// ─────────────────────────────────────────────────────────────────────────────
describe('the breaker reset clears every storm signal', () => {
  it('recentlyThrottled does not survive a run-entry reset', async () => {
    loadAlloModule('doc_pipeline_module.js');
    const throttle = async () => { const e = new Error('API_AUTH_FAILED'); e.canvasTransientAuth = true; throw e; };
    const p = window.AlloModules.createDocPipeline({
      callGemini: throttle, callGeminiVision: throttle, callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
    });
    for (let i = 0; i < 2; i++) {
      try { await p.auditOutputAccessibility('<main><h1>x</h1><p>y</p></main>'); } catch (_) {}
    }
    expect(p.geminiThrottleInfo().recentlyThrottled, 'a real storm should set it').toBe(true);
    p.resetGeminiBreaker();
    // Document B must not inherit A's storm — recentlyThrottled is what the final-audit sites use
    // to blame a rate limit for a coverage shortfall.
    expect(p.geminiThrottleInfo().recentlyThrottled, 'document B inherited document A storm').toBe(false);
    expect(p.geminiThrottleInfo().storming).toBe(false);
  }, 60000);

  it('the reset clears the field, not just the streaks', () => {
    const fn = dp.slice(dp.indexOf('var _resetGeminiBreaker = function()'));
    const body = fn.slice(0, fn.indexOf('_usesLocalTextBackend()'));
    expect(body).toContain('_geminiLastStormTripAt = 0;');
    expect(body).toContain('_geminiOffRouteOkStreak = 0;');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A batch must not be graded more loosely than one file run by hand.
// ─────────────────────────────────────────────────────────────────────────────
describe('batch "fully verified" respects needsExpertReview', () => {
  it('the count and the toast use one predicate that reads needsExpertReview', () => {
    // verificationState comes ONLY from engine statuses — _alloDeriveVerificationState never sees
    // needsExpertReview or the fidelity notes — so a document that lost hyperlinks comes back
    // 'complete' and was counted as fully verified in the summary, toast, CSV and report.
    expect(dp).toContain("const _batchFullyVerified = (q) => _batchVerificationFor(q.result).verificationState === 'complete' && !(q.result && q.result.needsExpertReview);");
    expect(dp).toContain('const fullyVerifiedItems = done.filter(_batchFullyVerified);');
    expect(dp).toContain('const _verifiedDone = done.filter(_batchFullyVerified).length;');
    expect(dp).not.toContain("done.filter(q => _batchVerificationFor(q.result).verificationState === 'complete')");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M17 — a failed recovery download must not suppress the next attempt's save.
// ─────────────────────────────────────────────────────────────────────────────
describe('the recovery-save latch is earned by a successful save', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  it('latches only after a save that returned true', () => {
    // saveProjectToFile returns false without throwing when the Blob/download fails, and that
    // payload is tens of megabytes for the scanned document this feature exists for.
    expect(anti).toContain('if (_saved && _incDocKey && ');
    const i = anti.indexOf('const _saved = saveProjectToFile(false, _inc);');
    const j = anti.indexOf('if (_saved && _incDocKey && ');
    expect(i).toBeGreaterThan(0);
    expect(j, 'the latch must come AFTER the save it reports').toBeGreaterThan(i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H16 — the batch lock, driven rather than described.
//
// H16 shipped with six pins, all structural: the claim ordering, the error shape, the managed flag,
// the release, the handover, the stale-lock release. Delete `_activeSingleFixPromise = token;` from
// _claimRemediationLockForBatch and every one of them stays green while the batch holds nothing —
// which is exactly the state H16 exists to prevent, because two runs then share _pipelineStats and
// cross-stamp each other's runId onto every log line and watchdog heartbeat.
// ─────────────────────────────────────────────────────────────────────────────
describe('H16 — a batch actually holds the lock', () => {
  let pipeline;
  const noop = () => {};
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    window.__alloPdfDocumentEpoch = 0;
    window.__alloPdfRunGen = 0;
    // Every CDN-loaded global needs a TRUTHY stub: _loadCdnScript short-circuits on its readiness
    // predicate, but a falsy global sends it through three URLs at a 12s timeout each. Without
    // these the batch sits for a minute instead of failing fast on a fake PDF.
    window.pdfjsLib = { getDocument: () => ({ promise: Promise.reject(new Error('stub: no pdf.js in jsdom')) }), GlobalWorkerOptions: {} };
    window.Tesseract = { createWorker: async () => { throw new Error('stub'); } };
    window.PDFLib = { PDFDocument: { load: async () => { throw new Error('stub'); } } };
    window.pako = {}; window.fontkit = {}; window.axe = { run: async () => { throw new Error('stub'); } };
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '', callImagen: async () => null,
      addToast: noop, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: noop, getDefaultTitle: () => 'Document',
      state: {
        pdfDocumentEpoch: 0, pendingPdfBase64: null, pendingPdfFile: null,
        pdfAuditResult: { score: 40, issues: [], pageCount: 1 }, pdfTargetScore: 90,
        pdfAutoFixPasses: 1, pdfPolishPasses: 0, pdfAuditorCount: 1, currentUiLanguage: 'English',
        setPdfFixLoading: noop, setPdfFixStep: noop, setPdfFixResult: noop,
        setPdfAuditResult: noop, setPdfAuditLoading: noop, setPendingPdfBase64: noop,
        setPendingPdfFile: noop, setPdfBatchQueue: noop, setPdfBatchProcessing: noop,
        setPdfBatchCurrentIndex: noop, setPdfBatchStep: noop, setPdfBatchSummary: noop,
        setIsGeneratingStyle: noop, setCustomExportCSS: noop, setInputText: noop,
        setGenerationStep: noop, setIsExtracting: noop, setExportAuditLoading: noop,
        setExportAuditResult: noop, setError: noop,
      },
    });
  });

  it('a live batch REFUSES a concurrent single-file start', async () => {
    // The batch itself will fail fast (no real files); what matters is that while it is in flight
    // the lock is held, so the second start is rejected rather than running alongside it.
    const batch = pipeline.runPdfBatchRemediation({ queue: [{ fileName: 'a.pdf', base64: 'JVBERi0=' }] }).catch(() => null);
    const err = await pipeline.fixAndVerifyPdf({
      documentEpoch: 0, base64: 'JVBERi0=', fileName: 'b.pdf', auditResult: { score: 40, issues: [] },
    }).then(() => null, (e) => e);
    expect(err, 'a single-file start over a live batch was NOT refused — both runs would share _pipelineStats').toBeTruthy();
    expect(err.name).toBe('RemediationAlreadyRunningError');
    await batch;
  }, 60000);

  it('the claim is MANAGED, so the busy probe stays quiet and the single-file controls stay live', async () => {
    const batch = pipeline.runPdfBatchRemediation({ queue: [{ fileName: 'a.pdf', base64: 'JVBERi0=' }] }).catch(() => null);
    // A batch owns its own progress UI. If this ever reported true, every single-file control would
    // grey out for the length of an overnight batch.
    expect(pipeline.isRemediationRunning()).toBe(false);
    expect(pipeline.getActiveRemediationRun()).toBeNull();
    await batch;
  }, 60000);

  it('the lock is released when the batch ends, so the next single-file run can start', async () => {
    await pipeline.runPdfBatchRemediation({ queue: [{ fileName: 'a.pdf', base64: 'JVBERi0=' }] }).catch(() => null);
    const err = await pipeline.fixAndVerifyPdf({
      documentEpoch: 0, base64: 'JVBERi0=', fileName: 'b.pdf', auditResult: { score: 40, issues: [] },
    }).then(() => null, (e) => e);
    // It will fail for its own reasons (not a real PDF) — but NOT because the lock is still held.
    expect(err && err.name, 'the batch stranded the lock — no further remediation is possible').not.toBe('RemediationAlreadyRunningError');
  }, 60000);
});

// ─────────────────────────────────────────────────────────────────────────────
// A disclosure that cries wolf is worse than none — it teaches the teacher to
// ignore the amber banner. These are the false-positive guards on the M12 net.
// ─────────────────────────────────────────────────────────────────────────────
describe('the link baseline does not cry wolf', () => {
  it('counts DISTINCT EXTERNAL urls, not annotation objects', () => {
    // Three over-counts, all systematic: internal dest/action navigation (TOC, cross-references,
    // and every footnote reference/back-reference PAIR), one hyperlink spanning two rendered lines
    // as two rects, and the same footer URL repeated on every page.
    expect(dp).toContain("if (!_a || _a.subtype !== 'Link') continue;");
    expect(dp).toContain('const _srcLinkUrls = new Set();');
    expect(dp).toContain('const _srcLinkAnnotations = _srcLinkUrls.size;');
  });

  it('a page-range run refuses the whole-document baseline in BOTH lanes', () => {
    // 30 source links compared against a 10-page output is a guaranteed false warning.
    expect(dp).toContain('const _sliceRun = !!(_pageRange && (_pageRange[0] || _pageRange[1]));');
    expect(dp).toContain('if (!_sliceRun && Number.isFinite(_lc) && _lc > 0) _srcStructCounts = { links: _lc };');
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain('const _sliceRun = !!(pdfPageRange && (pdfPageRange.start || pdfPageRange.end));');
    expect(view).toContain('const _srcLinks = (!_sliceRun && typeof _docPipeline.sourceLinkCount === \'function\')');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FERPA — a fidelity note is for the teacher; the copyable log is not.
// ─────────────────────────────────────────────────────────────────────────────
describe('FERPA: raw document values never reach the diagnostics log', () => {
  let redact;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    redact = window.AlloModules.createDocPipeline.logSafeFidelityMsg;
  });

  it('strips the numeric VALUE SAMPLE but keeps the count', () => {
    // On a psychoeducational report those tokens are standard scores, percentiles and dates of
    // testing — and warnLog feeds the panel a teacher copies into a bug report.
    const msg = '8 source numeric value(s) not found unchanged in the output (76, 112, 04/17/2019, 98). A remediation should never change numbers — review the Diff.';
    const out = redact(msg);
    expect(out).toContain('8 source numeric value(s)');
    expect(out).not.toContain('04/17/2019');
    expect(out).not.toContain('112');
    expect(out).toContain('FERPA');
  });

  it('strips leaked folio page numbers', () => {
    const out = redact('Page number(s) 194, 195 from the scanned pages appear inline in the output text.');
    expect(out).not.toContain('194');
    expect(out).toContain('FERPA');
  });

  it('leaves a value-free message alone', () => {
    const msg = 'Links: some hyperlinks from the source may have been dropped. Check the Diff.';
    expect(redact(msg)).toBe(msg);
  });

  it('every fidelity log site routes through it', () => {
    expect(dp).toContain("warnLog('[Integrity] VALUE-FIDELITY — ' + _alloLogSafeFidelityMsg(_valWarn))");
    expect(dp).toContain("warnLog('[Fidelity] ' + _alloLogSafeFidelityMsg(n.msg))");
    expect(dp).toContain("warnLog('[Integrity] FOLIO-LEAK — ' + _alloLogSafeFidelityMsg(_folioLeakWarn))");
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain("warnLog('[Fix Remaining] fidelity: ' + _logSafe(n.msg))");
  });

  it('the teacher-facing note is NOT redacted — the values are what make it actionable', () => {
    // The toast, the fidelity panel and the exported statement all keep the values; only warnLog
    // is redacted. Pin the toast so a future "consistent" change does not blind the teacher.
    expect(dp).toContain("addToast('⚠ ' + _valWarn, 'warning')");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H15 — the drain's own reserve, not the calm default's.
// ─────────────────────────────────────────────────────────────────────────────
describe('H15 — the drain does not spend its budget on nothing', () => {
  it('the calm wait inside the drain reserves the DRAIN reserve', () => {
    // The guard trips at deadline-60s while the wait was clamped to deadline-30s, so the drain
    // could pause for its whole clamped budget and then revisit ZERO chunks.
    expect(dp).toContain('_alloCalmBudgetMs(90000, _control && _control.perFileDeadlineTs, _DRAIN_RESERVE_MS)');
  });

  it('probe telemetry actually reaches the snapshots', () => {
    // L6 claimed probe traffic was "counted in run telemetry", but the snapshot builders enumerate
    // a fixed field list and the three probe fields were not in it.
    expect((dp.match(/probeCalls: /g) || []).length).toBeGreaterThanOrEqual(3);
    expect((dp.match(/probeMs: /g) || []).length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Background-tab resilience (field log 2026-07-27).
//
// A hidden tab keeps running fetch but SUSPENDS canvas rasterization, so pdf.js page.render stalls
// while its timeout keeps counting — and both rungs of the scale-retry ladder fail identically,
// because the scale was never the problem. The log showed a 20s render timeout taking ~136s of
// wall clock to fire (background timer clamping), both image pages lost; the same document
// foreground cropped both in about a second.
// ─────────────────────────────────────────────────────────────────────────────
describe('canvas work waits for a visible tab', () => {
  let waitForVisibleTab;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    waitForVisibleTab = window.AlloModules.createDocPipeline.waitForVisibleTab;
  });

  const setHidden = (hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  };

  it('resolves immediately when the tab is already visible', async () => {
    setHidden(false);
    const t0 = Date.now();
    await expect(waitForVisibleTab(5000, 'test')).resolves.toBe('visible');
    expect(Date.now() - t0).toBeLessThan(200);
  });

  it('resolves as soon as the tab comes back', async () => {
    setHidden(true);
    const p = waitForVisibleTab(10000, 'test');
    setTimeout(() => { setHidden(false); document.dispatchEvent(new Event('visibilitychange')); }, 30);
    await expect(p).resolves.toBe('became-visible');
  });

  it('is BOUNDED — a tab left hidden all run still finishes', async () => {
    // Otherwise a teacher who backgrounds the tab and walks away would hang the pipeline, which is
    // worse than the degraded behaviour this replaces.
    setHidden(true);
    await expect(waitForVisibleTab(60, 'test')).resolves.toBe('still-hidden');
    setHidden(false);
  });

  it('never rejects — the caller keeps its own timeout ladder for real failures', async () => {
    setHidden(true);
    await expect(waitForVisibleTab(30, 'test')).resolves.toBeTruthy();
    setHidden(false);
    await expect(waitForVisibleTab(0, 'test')).resolves.toBeTruthy();
  });

  it('the image render actually waits on it', () => {
    expect(dp).toContain("await _awaitImageWork(_alloWaitForVisibleTab(45000, 'page.render p' + pg));");
    const i = dp.indexOf("_alloWaitForVisibleTab(45000, 'page.render p' + pg)");
    const j = dp.indexOf('for (const _sc of [1.5, 1.0]) {', i);
    expect(i).toBeGreaterThan(0);
    expect(j, 'the wait must come BEFORE the scale ladder, not inside it').toBeGreaterThan(i);
  });
});

describe('a watchdog for a document that is gone retires instead of relogging', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

  it('a stale DOCUMENT ends the watchdog; a stale RUN re-arms', () => {
    // watchdogEpoch is captured once, so a stale document can never become valid again — M7's
    // re-arm turned that into a permanent every-8-minute log loop (three instances visible in the
    // 2026-07-27 field log, all stamped documentEpoch: 0 while the run was epoch 1).
    const stale = anti.slice(anti.indexOf('if (_staleDocument) {'), anti.indexOf('if (_otherRunOwnsHost || _otherAbortOwner) {'));
    expect(stale).toContain('Retiring a remediation watchdog');
    expect(stale, 'a document-stale watchdog must NOT re-arm').not.toContain('arm();');
    const otherRun = anti.slice(anti.indexOf('if (_otherRunOwnsHost || _otherAbortOwner) {'), anti.indexOf('if (!liveOwner) {'));
    expect(otherRun, 'a run-stale watchdog SHOULD re-arm — that one can resolve').toContain('arm();');
  });
});
