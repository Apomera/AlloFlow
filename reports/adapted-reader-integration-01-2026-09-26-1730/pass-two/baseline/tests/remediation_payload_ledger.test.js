// @vitest-environment jsdom
// Phase 2, Step 0 + Step 1 of the payload plan (~/.claude/plans/zesty-humming-lobster.md).
//
// Two things are pinned here, and the second is the important one.
//
// STEP 0 — the ledger. Canvas meters PAYLOAD VOLUME, and until this existed every proposal to
// "send less" was an intuition. The first version of the ledger had a real hole: the opening audit
// runs from the UI BEFORE fixAndVerifyPdf, which then replaces _pipelineStats with a fresh object —
// so the audit's whole-document uploads, potentially the largest bucket in the run, were counted
// and discarded.
//
// STEP 1 — the correctness bug the ledger work uncovered. Step 2 computed chunk page numbers from
// `pageCount`, which is the RANGE LENGTH on a partial run, while uploading the WHOLE document. A
// run over pages 6-10 of a 15-page PDF asked the model for "pages 1 through 3" and got the wrong
// pages, silently, into a document a teacher then hands out. The single-pass branch (<=8 pages,
// which a 5-page range satisfies) carried no page instruction at all, so it remediated all forty.
//
// The prompt-vs-payload agreement idea comes from the Phase-2 planning workflow: the pages a call
// NAMES must be the pages it SENDS. That is the check that catches this class, and it is the gate
// for any future slicing — a slice built from the wrong numbers is wrong twice.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('Step 0 — the ledger measures the whole run', () => {
  it('the opening audit opens a measurement window the run inherits', () => {
    // Without this the ledger reports the fix phases only. On a short document the audit is the
    // larger half, so every "we cut N MB" claim would have been measured against the wrong total.
    expect(dp).toContain('try { _alloCarriedAuditPayload = {}; _pipelineStats.payload = _alloCarriedAuditPayload; } catch (_) {}');
    expect(dp).toContain('payload: _alloCarriedAuditPayload || {},');
  });

  it('the window is consumed exactly once', () => {
    // A second Fix on the same audit must not re-count bytes that were already spent and reported.
    const i = dp.indexOf('payload: _alloCarriedAuditPayload || {},');
    const j = dp.indexOf('_alloCarriedAuditPayload = null;', i);
    expect(i).toBeGreaterThan(0);
    expect(j, 'the carry must be cleared right after it is adopted').toBeGreaterThan(i);
    expect(j - i).toBeLessThan(400);
  });

  it('both transform branches are attributable — the 8-page boundary decides which one runs', () => {
    // pageCount <= 8 takes the single-pass branch; the chunked TRANSFORM_PAGES loop is the else.
    // Lumping them together is how the planning review's first estimate went wrong: it attributed
    // ~8 MB to a chunked path the field-log document never entered.
    expect(dp).toContain("_alloWithPayloadPhase('transform'");
    expect(dp).toContain("_alloWithPayloadPhase('transform-chunk'");
    expect(dp).toContain("_alloWithPayloadPhase('transform-fallback'");
  });

  it('the ledger rides on the result, so bytes and quality can be compared together', () => {
    expect(dp).toContain('payload: _runStats.payload || {},');
    expect(dp).toContain('payloadSummary: _alloFormatPayloadLedger(_runStats.payload),');
  });

  it('every cut is behind a flag that defaults OFF', () => {
    // So a before/after is one build with a boolean flipped, not two git checkouts whose deltas
    // are polluted by unrelated drift.
    expect(dp).toContain('var _alloPayloadCut = function (name) {');
    expect(dp).toContain('return !!(flags && flags[name] === true);');
  });
});

describe('Step 1 — the pages a call NAMES are the pages it means', () => {
  let pipeline;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
    });
  });

  // The arithmetic under test, lifted from the source so the test cannot drift from it silently.
  // (A copy here would be a mirror — the thing this codebase keeps getting burned by — so the
  // structural pins below assert the SOURCE still computes it this way.)
  const chunkPages = (rangeStart, pageCount, i, PER = 3) => ({
    startPg: rangeStart + i * PER,
    endPg: Math.min(rangeStart + (i + 1) * PER - 1, rangeStart + pageCount - 1),
  });

  it('a WHOLE-document run is unchanged — chunk 0 still starts at page 1', () => {
    expect(chunkPages(1, 9, 0)).toEqual({ startPg: 1, endPg: 3 });
    expect(chunkPages(1, 9, 1)).toEqual({ startPg: 4, endPg: 6 });
    expect(chunkPages(1, 9, 2)).toEqual({ startPg: 7, endPg: 9 });
  });

  it('a PARTIAL run names ABSOLUTE pages — the bug', () => {
    // Pages 6-10 of a 15-page PDF: pageCount is 5, and the OLD code asked for "pages 1 through 3".
    expect(chunkPages(6, 5, 0)).toEqual({ startPg: 6, endPg: 8 });
    expect(chunkPages(6, 5, 1)).toEqual({ startPg: 9, endPg: 10 });
  });

  it('the last chunk never runs past the end of the range', () => {
    const last = chunkPages(6, 5, 1);
    expect(last.endPg, 'a chunk that names pages outside the range invites hallucination').toBe(10);
  });

  it('the source computes it from the range start, at BOTH chunk sites', () => {
    expect(dp).toContain('const _t2RangeStart = (_pageRange && _pageRange[0]) ? Math.max(1, _pageRange[0]) : 1;');
    expect(dp).toContain('const _t2LastPage = _t2RangeStart + pageCount - 1;');
    expect((dp.match(/const startPg = _t2RangeStart \+ \w+ \* TRANSFORM_PAGES;/g) || []).length).toBe(2);
    // The range-relative form must not come back.
    expect(dp).not.toMatch(/const startPg = \w+ \* TRANSFORM_PAGES \+ 1;/);
    expect(dp).not.toMatch(/const endPg = Math\.min\(\(\w+ \+ 1\) \* TRANSFORM_PAGES, pageCount\);/);
  });

  it('the SINGLE-PASS branch tells the model its scope — it used to say nothing', () => {
    // A 5-page range satisfies pageCount <= 8, so this is the branch a partial run most often
    // takes, and it was silently remediating the whole document.
    expect(dp).toContain('const _t2SinglePageScope = (_pageRange && _pageRange[0])');
    expect(dp).toContain('${_t2SinglePageScope}${_sourceHeadingsDirective}');
    const scope = dp.slice(dp.indexOf('const _t2SinglePageScope'), dp.indexOf('const jsonPrompt = '));
    expect(scope).toContain('extract ONLY pages');
    expect(scope).toContain('Ignore every other page');
  });

  it('a whole-document run adds no scope text — the common path is byte-identical', () => {
    const scope = dp.slice(dp.indexOf('const _t2SinglePageScope'), dp.indexOf('const jsonPrompt = '));
    expect(scope).toMatch(/:\s*''/);
  });

  it('the pipeline still builds with these changes', () => {
    expect(typeof pipeline.fixAndVerifyPdf).toBe('function');
  });
});
