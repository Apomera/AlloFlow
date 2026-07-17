// ChatGPT-review Phase 3 (2026-07-10) — cancellation, finalization honesty, telemetry identity,
// resource budgets, and the security pass. Goldens + pins.
//
// #3  — targeted cancellation: gate queue entries carry the run's abort signal (captured at
//   ENQUEUE); aborted waiters are dropped, never started under the NEXT run's signal. The slot is
//   held until the UNDERLYING transport settles (a timed-out fetch is still on the wire — early
//   release let true concurrency exceed the cap mid-storm). Aborted runs neither retry nor feed
//   the breaker.
// #6  — auto-continue rounds mutate accessibleHtml AFTER fixAndVerifyPdf measured fidelity; the
//   panel could keep reading "100% preserved" over a round that dropped text. A pure pipeline
//   helper re-measures coverage/placement per accepted round; the host merges the fields.
// #15 — per-run identity (history rows collapsed distinct runs of the same file), honest outcome
//   (success was HARD-CODED even when verifiers never completed), and honest counters (the old
//   `retries` incremented on TERMINAL failure, not on retries).
// #12 — batch intake budgets BEFORE any FileReader runs + sequential reads + byte-budgeted cache
//   eviction (200 entries of image-heavy HTML was still unbounded in bytes).
// #13 — ZIP export: collision-safe entry names + manifest + re-entry lock.
// #16 — audit-frame neutralization (frames are same-origin BY DESIGN), EA engine pinned, rawhtml
//   sanitizer FAILS CLOSED on execution-shaped content when DOMPurify is unavailable.
// #17 — OOXML decompression budgets on DECLARED sizes, before anything inflates.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// ── shared: the GeminiGate closure harness (same slice as gemini_pacing_stagger) ──
const _gs = dp.indexOf('var _GEMINI_MAX_CONCURRENT = 3;');
const _ge = dp.indexOf('var _pulsePipelineWatchdog');
const gateBlock = dp.slice(_gs, _ge);
function makeGate() {
  const timers = [];
  const fakeSetTimeout = (fn) => { const id = timers.length + 1; timers.push({ id, fn }); return id; };
  const fakeClearTimeout = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  const factory = new Function(
    'warnLog', '_pipelineStats', '_pipeLog', 'setTimeout', 'clearTimeout', 'Date', '_usesLocalTextBackend',
    gateBlock +
    '\nreturn { acquire: _acquireGeminiSlot, release: _releaseGeminiSlot, gate: _geminiGate,' +
    ' state: function(){ return { inFlight: _geminiInFlight, waiters: _geminiWaiters.length }; } };'
  );
  return { api: factory(() => {}, {}, () => {}, fakeSetTimeout, fakeClearTimeout, { now: () => 1000 }, () => false) };
}
const _flush = async (n) => { for (let i = 0; i < (n || 6); i++) await Promise.resolve(); };

describe('#3 — aborted waiters never start', () => {
  it('BEHAVIORAL: a signal aborted at enqueue rejects immediately with an AbortError shape', async () => {
    const g = makeGate();
    let err = null;
    await g.api.acquire({ aborted: true }, 'callGemini').catch((e) => { err = e; });
    expect(err).not.toBeNull();
    expect(err.isAbort).toBe(true);
    expect(err.name).toBe('AbortError');
    expect(g.api.state().inFlight).toBe(0);
  });
  it('BEHAVIORAL: a waiter whose signal aborts while QUEUED is pruned at the next pump — the next live waiter starts instead', async () => {
    const g = makeGate();
    // fill the default cap of 3
    for (let i = 0; i < 3; i++) g.api.acquire();
    const s4 = { aborted: false };
    let s4Err = null, s5Started = false;
    g.api.acquire(s4, 'file-A call').catch((e) => { s4Err = e; });
    g.api.acquire({ aborted: false }, 'file-B call').then(() => { s5Started = true; });
    expect(g.api.state().waiters).toBe(2);
    s4.aborted = true;          // file A's run dies while its call is still queued
    g.api.release();            // a slot frees → pump prunes s4, starts s5
    await _flush();
    expect(s4Err).not.toBeNull();
    expect(s4Err.isAbort).toBe(true);
    expect(s5Started).toBe(true);
    expect(g.api.state().waiters).toBe(0);
    expect(g.api.state().inFlight).toBe(3);
  });
  it('BEHAVIORAL: the {result, slotUntil} pair holds the slot after the result settles (timed-out transport keeps its slot)', async () => {
    const g = makeGate();
    let releaseHold;
    const hold = new Promise((r) => { releaseHold = r; });
    const result = await g.api.gate(() => ({ result: Promise.resolve('raced-out'), slotUntil: hold }), null, 'x');
    await _flush();
    expect(result).toBe('raced-out');
    expect(g.api.state().inFlight).toBe(1); // result settled, slot STILL held — the transport is on the wire
    releaseHold();
    await _flush();
    expect(g.api.state().inFlight).toBe(0);
  });
  it('wiring: the signal is captured at ENQUEUE, aborts short-circuit the retry ladder, and the slot rides the underlying call', () => {
    expect(dp).toContain("var _gateSignal = (typeof window !== 'undefined' && window.__alloPdfAbortSignal) ? window.__alloPdfAbortSignal : null;");
    expect(dp).toContain('if ((err && err.isAbort) || (_gateSignal && _gateSignal.aborted)) throw err;');
    expect(dp).toContain('return { result: _raced, slotUntil: _slotUntil };');
    expect(dp).toContain('(_geminiWaiters.shift()).resolve();');
    expect(dp).toContain('_pruneAbortedWaiters();');
  });
});

// ── #6: the recompute helper, extracted with its real normalizer + htmlToPlainText ──
const _fs = dp.indexOf('const htmlToPlainText = (html) => {');
const _fe = dp.indexOf('// acceptFixedHtmlDetailed: strict guard', _fs);
const { _recomputeContentFidelity } = new Function(dp.slice(_fs, _fe) + '\nreturn { _recomputeContentFidelity };')();

describe('#6 — content fidelity is re-measured after html mutations', () => {
  const SRC = 'The quick brown fox jumps over the lazy dog and the cow looks on. '.repeat(12).trim();
  const HALF = SRC.slice(0, Math.floor(SRC.length / 2));
  const REST = SRC.slice(Math.floor(SRC.length / 2));
  it('BEHAVIORAL: full coverage → 100, no warnings', () => {
    const r = _recomputeContentFidelity(SRC, '<article><p>' + SRC + '</p></article>');
    expect(r.integrityCoverage).toBe(100);
    expect(r.coverageWarning).toBeNull();
    expect(r.placementWarn).toBeNull();
  });
  it('BEHAVIORAL: a round that DROPS half the text is caught (coverage + missing warning)', () => {
    const r = _recomputeContentFidelity(SRC, '<p>' + HALF + '</p>');
    expect(r.integrityCoverage).toBeLessThan(97);
    expect(r.coverageWarning).toMatch(/may be missing/);
  });
  it('BEHAVIORAL: content routed to the preserved box reads as PLACEMENT, not loss', () => {
    const html = '<p>' + HALF + '</p><section data-source-preserved-block="true">' +
      '<div data-source-restored="true">' + REST + '</div><div data-source-restored="true">extra</div></section>';
    const r = _recomputeContentFidelity(SRC, html);
    expect(r.coverageWarning).toBeNull();      // present-anywhere refinement: the text IS there
    expect(r.orphanCount).toBe(2);
    expect(r.placementWarn).toMatch(/reading order needs review/);
  });
  it('BEHAVIORAL: no text-layer ground truth → null (caller keeps prior fields)', () => {
    expect(_recomputeContentFidelity('', '<p>x</p>')).toBeNull();
    expect(_recomputeContentFidelity(null, '<p>x</p>')).toBeNull();
  });
  it('wiring: exported, aliased into the primary pass, and merged per accepted auto-continue round', () => {
    expect(dp).toContain('recomputeContentFidelity: _wrap(_recomputeContentFidelity),');
    expect(dp).toContain('const _normIntegrity = _alloNormForCoverage;');
    // #6-full (2026-07-16): the per-round recompute + merge moved into the canonical reducer;
    // the host merges every accepted round through it.
    expect(dp).toContain('_roundFid = _recomputeContentFidelity(round.sourceText, html);');
    expect(dp).toContain('integrityCoverage: _nextIntegrityCoverage,');
    expect(anti).toContain('_mergedRound = await _finalizeRound(cur, {');
    // The accepted round is still one exact-HTML-bound snapshot: the reducer binds fidelity +
    // binding into the same assign, and the host routes that snapshot into rendered state.
    expect(dp).toMatch(/verificationHtmlBinding: _verificationHtmlBinding,[\s\S]{0,500}?integrityCoverage: _nextIntegrityCoverage,/);
    expect(anti).toMatch(/!attachVerificationHtmlProof\(cur, result\.html\)[\s\S]{0,500}?const snapshot = cur;[\s\S]{0,800}?setPdfFixResult\(snapshot\);/);
  });
});

describe('#15 — run identity + honest outcome + honest counters', () => {
  it('every fix run gets a runId; the success outcome states EVIDENCE, not hope', () => {
    expect(dp).toContain("const _runId = 'run-' + _startTime.toString(36)");
    expect(dp).toContain('const _remediationOutcome = _alloRemediationOutcome({');
    expect(dp).toContain('outcome: _remediationOutcome.state,');
    expect(dp).not.toMatch(/outcome: 'success',\n/); // the hard-coded literal is gone
  });
  it('the counters finally measure what their names say', () => {
    // terminal give-ups no longer masquerade as retries…
    expect((dp.match(/_pipelineStats\.terminalFailures = \(_pipelineStats\.terminalFailures \|\| 0\) \+ 1;/g) || []).length).toBe(2);
    // …and real retry attempts are counted where they happen (throttle ladder + generic single retry)
    expect((dp.match(/_pipelineStats\.retries\+\+; _pipelineStats\.transportRetries = \(_pipelineStats\.transportRetries \|\| 0\) \+ 1;/g) || []).length).toBe(2);
    expect(dp).toContain('if (n > 0) _pipelineStats.recoveredRetries = (_pipelineStats.recoveredRetries || 0) + 1;');
    expect(dp).toContain('authThrottles: _pipelineStats.authThrottles || 0,'); // surfaced at last
  });
  it('history rows dedupe on RUN IDENTITY when present (filename+baseline collapsed distinct runs)', () => {
    expect(anti).toContain('runId: cur.runId || null,');
    expect(anti).toContain('const _sameRun = last && ((row.runId && last.runId) ? last.runId === row.runId');
    expect(anti).toContain('recoveredRetries: (_ps && _ps.recoveredRetries != null) ? _ps.recoveredRetries : null,');
  });
});

// ── #12: intake preflight, extracted from the view with a toast collector ──
const _ps2 = view.indexOf('const _BATCH_MAX_FILES = 60;');
const _pe2 = view.indexOf('// One file → one queue entry', _ps2);
function makePreflight() {
  const toasts = [];
  const fn = new Function('addToast', view.slice(_ps2, _pe2) + '\nreturn _alloBatchPreflight;')((m) => toasts.push(String(m)));
  return { fn, toasts };
}
const _mb = (n) => n * 1024 * 1024;

describe('#12 — batch intake budgets run BEFORE any read', () => {
  it('BEHAVIORAL: the 61st file is rejected with a visible explanation', () => {
    const { fn, toasts } = makePreflight();
    const files = Array.from({ length: 61 }, (_, i) => ({ name: 'f' + i + '.pdf', size: 1024 }));
    const accepted = fn(files, []);
    expect(accepted.length).toBe(60);
    expect(toasts.join(' ')).toMatch(/60 files/);
  });
  it('BEHAVIORAL: a file over the per-file cap never reaches a FileReader', () => {
    const { fn, toasts } = makePreflight();
    const accepted = fn([{ name: 'huge.pdf', size: _mb(201) }, { name: 'ok.pdf', size: _mb(1) }], []);
    expect(accepted.map((f) => f.name)).toEqual(['ok.pdf']);
    expect(toasts.join(' ')).toMatch(/per-file limit/);
  });
  it('BEHAVIORAL: the aggregate budget counts the EXISTING queue too', () => {
    const { fn, toasts } = makePreflight();
    const queue = [{ fileSize: _mb(250) }];
    const accepted = fn([{ name: 'a.pdf', size: _mb(40) }, { name: 'b.pdf', size: _mb(40) }], queue);
    expect(accepted.length).toBe(1); // 250 + 40 = 290 ok; +40 more would cross 300
    expect(toasts.join(' ')).toMatch(/memory budget/);
  });
  it('wiring: reads are SEQUENTIAL and the cache eviction is byte-budgeted', () => {
    expect(view).toContain('accepted.reduce((chain, f) => chain.then(() => _alloEnqueueBatchFile(f)), Promise.resolve());');
    expect(dp).toContain('const _PDF_CACHE_MAX_BYTES = 150 * 1024 * 1024;');
    expect(dp).toContain('while (i < survivors.length && (survivors.length - i > _PDF_CACHE_MAX_ENTRIES || _totalBytes > _PDF_CACHE_MAX_BYTES))');
  });
});

describe('#13 — ZIP export: collision-safe names + ownership lock', () => {
  it('names are claimed once per file; collisions get a numeric suffix; the manifest records the mapping', () => {
    expect(dp).toContain("_zipNameFor.set(f.id, n === 1 ? base : base + '-' + n);");
    expect(dp).toContain('zipName: _zipNameFor.get(f.id) || null,');
    expect(dp).not.toMatch(/const safeName = f\.fileName\.replace\(\/\\\.\(pdf\|docx\|pptx\)\$\/i/); // per-loop re-sanitization is gone
  });
  it('a second click cannot start a duplicate export while one is running', () => {
    expect(dp).toContain('let _batchZipRunning = false;');
    expect(dp).toContain('if (_batchZipRunning) {');
    expect(dp).toContain('} finally { _batchZipRunning = false; } // #13: release the export lock on EVERY exit');
  });
});

// ── #16: neutralizer (node exercises the DOMParser-unavailable fallback) + fail-closed sanitizer ──
const _ns = dp.indexOf('const _neutralizeForAuditFrame = (html) => {');
const _ne = dp.indexOf('// ── axe-core Accessibility Checker', _ns);
const _neutralize = new Function(dp.slice(_ns, _ne) + '\nreturn _neutralizeForAuditFrame;')();
const _ss = dp.indexOf('const _RAWHTML_PURIFY_CFG = {');
const _se = dp.indexOf('// Best-effort warm-up at module init', _ss);
const _sanitize = new Function('_ensureDOMPurify', dp.slice(_ss, _se) + '\nreturn _sanitizeRawHtmlBlock;')(() => Promise.resolve(null));

describe('#16 — audit-frame neutralization + pinned engines + fail-closed sanitizer', () => {
  it('BEHAVIORAL (fallback path): paired AND unclosed <script> tags are removed', () => {
    expect(_neutralize('<script>evil()</script><p>keep</p>')).not.toMatch(/<script/i);
    expect(_neutralize('<script src="https://x/y.js"><p>keep</p>')).not.toMatch(/<script/i);
    expect(_neutralize('<p>keep</p>')).toContain('keep');
  });
  it('the DOMParser path disarms handlers, schemes, nested frames, meta-refresh, and blocks external loads via CSP', () => {
    expect(dp).toContain("if (/^on/i.test(n)) { try { el.setAttribute('data-allo-neutralized-' + n, attr.value); } catch (_) {} el.removeAttribute(n); }");
    expect(dp).toMatch(/\(javascript\|vbscript\)\\s\*:\/i\.test\(attr\.value \|\| ''\)\) el\.setAttribute\(n, 'about:blank#neutralized'\)/);
    expect(dp).toContain("if (tag === 'iframe' || tag === 'frame' || tag === 'embed' || tag === 'object') {");
    expect(dp).toContain("default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:;");
    expect(dp).toContain('const _safeHtml = _neutralizeForAuditFrame(htmlContent);');
    expect(dp).toContain('doc.write(_neutralizeForAuditFrame(htmlContent)); doc.close();');
  });
  it('the Equal Access engine is PINNED (a floating @3 changed the rule set under the score)', () => {
    expect(dp).toContain('https://cdn.jsdelivr.net/npm/accessibility-checker-engine@3.1.83/ace.js');
    expect(dp).not.toContain('accessibility-checker-engine@3/ace.js');
    expect(dp).toContain("const _PIPELINE_PROMPT_VERSION = '20260711-1';"); // scores can shift → cache identity moved
  });
  it('BEHAVIORAL: without DOMPurify, execution-shaped rawhtml is WITHHELD, benign rawhtml still sanitizes', () => {
    expect(_sanitize('<script>alert(1)</script><p>hi</p>')).toContain('data-allo-rawhtml-withheld');
    expect(_sanitize('<p onclick="x()">hi</p>')).toContain('data-allo-rawhtml-withheld');
    expect(_sanitize('<a href="javascript:x()">y</a>')).toContain('data-allo-rawhtml-withheld');
    const benign = _sanitize('<p>plain content</p><style>p{color:red}</style><input value="q">');
    expect(benign).toContain('plain content');
    expect(benign).not.toContain('data-allo-rawhtml-withheld');
    expect(benign).not.toMatch(/<style|<input/i);
  });
});

// ── #17: the archive guard, driven with fake central directories ──
const _os = dp.indexOf('const _ooxmlDeclaredSize = (f) =>');
const _oe = dp.indexOf('const _officeMediaFromPart', _os);
const { _ooxmlGuardArchive } = new Function(dp.slice(_os, _oe) + '\nreturn { _ooxmlGuardArchive };')();
const fakeZip = (entries) => ({ forEach: (cb) => entries.forEach((e, i) => cb('part' + i, { _data: { uncompressedSize: e } })) });

describe('#17 — OOXML decompression budgets on DECLARED sizes', () => {
  it('BEHAVIORAL: a normal document passes', () => {
    expect(() => _ooxmlGuardArchive(fakeZip([_mb(1), _mb(4), 50_000]), _mb(2), 'Word')).not.toThrow();
  });
  it('BEHAVIORAL: entry-count, single-entry, total, and ratio bombs all throw TYPED errors', () => {
    const many = fakeZip(Array.from({ length: 9000 }, () => 10));
    expect(() => _ooxmlGuardArchive(many, _mb(1), 'Word')).toThrow(/decompression safety limits/);
    try { _ooxmlGuardArchive(many, _mb(1), 'Word'); } catch (e) { expect(e.isArchiveLimit).toBe(true); }
    expect(() => _ooxmlGuardArchive(fakeZip([_mb(400)]), _mb(2), 'Word')).toThrow(/single internal entry/);
    expect(() => _ooxmlGuardArchive(fakeZip(Array.from({ length: 8 }, () => _mb(150))), _mb(100), 'PowerPoint')).toThrow(/in total/);
    expect(() => _ooxmlGuardArchive(fakeZip([_mb(250)]), _mb(1), 'Word')).toThrow(/zip-bomb shaped/);
  });
  it('wiring: both extractors guard BEFORE inflating; media checks declared size before decoding', () => {
    expect(dp).toContain("_ooxmlGuardArchive(await window.JSZip.loadAsync(_gBytes), _gBytes.length, 'Word');");
    expect(dp).toContain("_ooxmlGuardArchive(zip, bytes.length, 'PowerPoint');");
    expect(dp).toContain('const _declared = _ooxmlDeclaredSize(f);');
  });
});
