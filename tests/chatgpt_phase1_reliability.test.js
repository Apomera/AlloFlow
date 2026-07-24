// ChatGPT-review Phase 1 (2026-07-10) — correctness blockers, goldens + anti-drift pins.
//
// Finding 1 — the audit cache used to snapshot `triangulated` BEFORE the deterministic axe/EA
//   baseline attached the weakest-layer score + _baseline* evidence; a cache hit replayed an
//   AI-only score and (via the early return) skipped the baseline entirely.
// Finding 4 — audit and fix each got a FULL 8-minute wall (fix's deadline minted after audit
//   finished) — the advertised per-file wall actually permitted ~16 minutes.
// Finding 8 — the batch treated EVERY quota/429 as "Daily quota reached" and froze the whole
//   batch on a per-minute blip; the global quota stash dropped the perDay/perMinute evidence.
// Finding 9 — cache identity omitted polish passes / OCR language / backend, and the version sat
//   at 20260524-1 through six weeks of scoring changes; polish silently capped at 1 while the UI
//   sold 0–3.
// Finding 10 — a resumed batch snapshotted the CURRENT sliders, mixing configurations in one
//   summary and breaking the Tier-4 done-skip.
// Finding 2 — fixAndVerifyPdf swallowed single-mode failures (resolved undefined), so the
//   hands-off wrapper's _handsErr never populated and permanent failures burned 3 full reruns.
//   (The disposition-table pins live in handsoff_autoretry.test.js; finding 6's clear-gate pin
//   lives in workflow_batch_fixes.test.js.)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const gem = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');

describe('finding 1 — audit cache finalization', () => {
  it('the PDF-path write happens AFTER the baseline, with the finalized marker', () => {
    // old site is now a comment, not a write:
    expect(dp).toContain('Cache write MOVED below (ChatGPT review 2026-07-10, finding 1)');
    // new site marks then writes, still excluding sliced audits:
    const at = dp.indexOf('triangulated._auditFinalized = true;');
    expect(at).toBeGreaterThan(-1);
    const after = dp.slice(at, at + 300);
    expect(after).toContain('if (_cacheKey && !_auditedViaSlices) { try { _writeAuditCache(_cacheKey, triangulated); } catch (_) {} }');
    // the write must come AFTER the _baselineAxeFailed disclosure site:
    expect(dp.indexOf('triangulated._baselineAxeFailed = true;')).toBeLessThan(at);
  });
  it('the Office/transcript result-object writes carry the marker too (or the read guard would orphan them)', () => {
    const marked = dp.match(/result\._auditFinalized = true;/g) || [];
    expect(marked.length).toBe(2);
  });
  it('BEHAVIORAL: the read guard rejects legacy unfinalized entries and serves finalized ones', async () => {
    const start = dp.indexOf('const _readAuditCache = async (key) => {');
    const end = dp.indexOf('};', dp.indexOf('return cached.audit;', start)) + 2;
    const store = new Map();
    const mk = new Function('storageDB', 'window', '_AUDIT_CACHE_TTL_MS',
      dp.slice(start, end) + '\nreturn _readAuditCache;');
    const read = mk({ get: async (k) => store.get(k) }, { idbKeyval: {} }, 7 * 24 * 3600 * 1000);
    store.set('k-legacy', { audit: { score: 92, summary: 'AI-only snapshot' }, savedAt: Date.now() });
    store.set('k-final', { audit: { score: 70, _auditFinalized: true, _baselineAxeAudit: { score: 70 } }, savedAt: Date.now() });
    expect(await read('k-legacy')).toBeNull();       // pre-fix bad snapshot: rejected
    const good = await read('k-final');
    expect(good && good.score).toBe(70);             // finalized entry: served with its evidence
    expect(good._baselineAxeAudit).toBeTruthy();
  });
});

describe('finding 4 — ONE absolute per-file wall', () => {
  it('the deadline is minted once at _processOne entry; both phases get only what remains', () => {
    expect(dp).toContain('const _deadlineAt = Date.now() + _PER_FILE_MS;');
    expect(dp).toContain("_remainingMs(), 'batch audit: ' + item.fileName);");
    expect(dp).toContain("}), _remainingMs(), 'batch fix: ' + item.fileName);");
    expect(dp).toContain('perFileDeadlineTs: _deadlineAt,');
    // no second full-budget mint remains:
    expect(dp).not.toContain('perFileDeadlineTs: Date.now() + _PER_FILE_MS');
  });
});

describe('finding 8 — batch quota policy honors the per-day/per-minute split', () => {
  it('only an EXPLICIT per-day quota stops the whole batch; bursts wait for calm and continue', () => {
    expect(dp).toContain("const _dailyQuota = (err && err.isQuota && _cls && _cls.perDay === true) || (_gqFresh && _gq.perDay === true);");
    expect(dp).toContain('const _burstQuotaFail = !_dailyQuota && ((err && err.isQuota) || (_gqFresh && !_gq.perDay));');
    expect(dp).toContain('failed on a rate-limit BURST (not daily quota)');
    expect(dp).toContain('await waitForGeminiCalm({ maxWaitMs: 120000, shouldAbort: () => _batchAbortCtrl.signal.aborted });');
  });
  it('the global quota stash carries the evidence instead of dropping it', () => {
    expect(gem).toContain('perDay: !!classification.perDay,');
    expect(gem).toContain('perMinute: !!classification.perMinute,');
  });
});

describe('finding 9 — cache identity and the polish-pass contract', () => {
  it('the pipeline version was finally bumped and both keys carry the backend id', () => {
    // Repointed 2026-07-10 (Phase 3): pin the FORMAT + a floor, not the exact value — the whole
    // point of the finding was that this constant must move when behavior moves.
    const _vm = dp.match(/const _PIPELINE_PROMPT_VERSION = '(\d{8})-(\d+)';/);
    expect(_vm).not.toBeNull();
    expect(Number(_vm[1])).toBeGreaterThanOrEqual(20260710);
    expect(dp).toContain('const _cacheBackendId = () => {');
    expect(dp).toMatch(/pdf_audit_\$\{_PIPELINE_PROMPT_VERSION\}_\$\{_cacheBackendId\(\)\}/);
    expect(dp).toMatch(/pdf_remed_\$\{_PIPELINE_PROMPT_VERSION\}_\$\{_cacheBackendId\(\)\}/);
  });
  it('the remediation key includes polish passes and OCR language', () => {
    expect(dp).toContain('_pp${_x.polishPasses || 0}_ocr${ocr}');
    expect(dp).toContain('{ polishPasses: _batchSettings.pdfPolishPasses, ocrLanguage: _batchSettings.pdfOcrLanguage }');
  });
  it('polish honors the advertised 0–3 count with a convergence early-exit (was: silent cap at 1)', () => {
    expect(dp).toContain('const _maxPolishPasses = Math.min(3, Math.max(1, Number(_polishPasses) || 1));');
    expect(dp).toContain('Converged after pass');
    expect(dp).not.toContain('const _maxPolishPasses = 1;');
    // the progress line now reports the REAL denominator:
    expect(dp).toContain('`Polish pass ${polishIdx + 1}/${_maxPolishPasses} (style + table unification)...`');
  });
});

describe('finding 10 — resumed batches run under their SAVED settings', () => {
  it('runPdfBatchRemediation prefers resumeSettings over the live sliders', () => {
    expect(dp).toContain("const _saved = (opts && opts.resumeSettings && typeof opts.resumeSettings === 'object') ? opts.resumeSettings : null;");
    expect(dp).toContain('pdfAuditorCount: _saved.pdfAuditorCount ?? _run.auditorCount,');
    expect(dp).toContain("Resuming with the batch\\'s ORIGINAL settings"); // source escapes the apostrophe
  });
  it('the Resume button passes the persisted settings and tells the teacher', () => {
    expect(view).toContain('runPdfBatchRemediation({ resumeQueue, resumeSettings: resumableBatch.settings || null, resumeBatchId: resumableBatch.batchId || null })');
    expect(view).toContain("const checkpointBatchId = typeof resumableBatch.batchId === 'string' ? resumableBatch.batchId.trim() : '';");
    expect(view).toContain('discardResumableBatch(checkpointBatchId)');
    expect(view).toContain('Resuming with the batch’s original settings');
  });
});

describe('finding 2 — single-mode failures propagate (typed contract, phase 1)', () => {
  it('fixAndVerifyPdf rethrows after its UI handling instead of resolving undefined', () => {
    const at = dp.indexOf('Failure contract (ChatGPT review 2026-07-10, finding 2)');
    expect(at).toBeGreaterThan(-1);
    expect(dp.slice(at, at + 700)).toContain('throw err;');
  });
  it('every fire-and-forget caller attaches rejection hygiene (the pipeline already toasted)', () => {
    const wrapped = view.match(/fixAndVerifyPdf\(\{[^}]*\}\)\.catch\(\(\) => \{\}\)/g) || [];
    expect(wrapped.length).toBe(4);
  });
});
