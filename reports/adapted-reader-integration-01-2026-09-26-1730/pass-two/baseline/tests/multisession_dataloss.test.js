// Multi-session merge data-loss fix (2026-06-20) — from the pipeline-enhancement workflow.
// A multi-day, multi-range IEP/report workflow was handed a BLANK document while being told
// progress was saved. Two independent bugs compounded: (1) save stores the range under `html`
// but the merge read `remediatedHtml` (never written) → every section merged empty; (2) the
// save-side fingerprint used a base64-length size ESTIMATE + the RANGE-length pageCount while
// the load-side keyed on real File.size + the FULL-doc pageCount → a different sessionId, so the
// saved range was orphaned. This pins both fixes + (anti-drift) that doc_pipeline ships them.
// @vitest-environment jsdom
//
// L1 (audit 2026-07-26): this file used to test HAND-WRITTEN COPIES of the two functions. The real
// `mergeRangesToFullHtml` — the function whose bug handed a teacher a blank multi-day IEP, the
// entire reason this file exists — had ZERO invocations anywhere in the suite. A mirror cannot
// catch a regression in the thing it mirrors; it only proves the mirror agrees with itself. The
// merge is now driven for real, and the fingerprint mirror is kept ONLY as a documented contract
// note next to a real-export assertion.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

let merge;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  merge = window.AlloModules.createDocPipeline({
    callGemini: async () => 'OK', callGeminiVision: async () => '', callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  }).mergeRangesToFullHtml;
});

// ── Mirror of _multiSessionId (the stable doc fingerprint) ──
// Kept deliberately: _multiSessionId is not exported, and the property under test is a CONTRACT
// (v2 keys only on the content digest), not an implementation. The anti-drift block below pins the
// real call sites so this mirror cannot silently diverge from them.
const multiSessionId = (filename, fileSize, pageCount, documentDigest) => {
  const digest = String(documentDigest || '').toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) return null;
  return 'msdoc_v2_' + digest.slice(7);
};

const digestA = 'sha256:' + 'a'.repeat(64);
const digestB = 'sha256:' + 'b'.repeat(64);
describe('fingerprint: save and load now agree (no more orphaned ranges)', () => {
  const fileName = 'IEP_report.pdf';
  const realSize = 524288;     // pendingPdfFile.size — what the load side uses
  const fullPages = 30;        // pdfAuditResult.pageCount — what the load side uses
  const base64Estimate = Math.round((realSize / 0.75) * 0.75); // the old save-side estimate basis
  const rangePages = 5;        // the range length (e.g. pages 1-5) — the OLD save-side pageCount

  const loadId = multiSessionId(fileName, realSize, fullPages, digestA);
  const saveIdFixed = multiSessionId(fileName, realSize, fullPages, digestA);
  const saveIdOld = multiSessionId(fileName, base64Estimate, rangePages);

  it('the FIXED save fingerprint equals the load fingerprint', () => {
    expect(saveIdFixed).toBe(loadId);
  });
  it('refuses legacy metadata-only identities because they are collision-prone', () => {
    expect(saveIdOld).toBeNull();
  });
  it('keys only on exact content: metadata changes do not fork it, content changes do', () => {
    expect(multiSessionId('renamed.pdf', 1, 1, digestA)).toBe(loadId);
    expect(multiSessionId(fileName, realSize, fullPages, digestB)).not.toBe(loadId);
    expect(multiSessionId(fileName, realSize, fullPages, 'invalid')).toBeNull();
  });
});

// ── The REAL merge ──────────────────────────────────────────────────────────
const doc = (body) => '<!DOCTYPE html><html lang="en"><head><title>t</title></head><body><main id="main-content" role="main">' + body + '</main></body></html>';

describe('the real mergeRangesToFullHtml — the blank-document bug', () => {
  it('is exported and callable', () => {
    expect(typeof merge).toBe('function');
  });

  it('reads the `html` field save actually writes — every section survives', () => {
    // THE bug: the merge read `remediatedHtml`, which save never wrote, so every section merged
    // empty and the teacher was handed a blank document while being told progress was saved.
    const out = merge([
      { pages: [1, 5], html: doc('<p>SECTION ONE</p>') },
      { pages: [6, 10], html: doc('<p>SECTION TWO</p>') },
    ], 10);
    expect(out).toContain('SECTION ONE');
    expect(out).toContain('SECTION TWO');
  });

  it('falls back to `remediatedHtml` for a legacy or foreign record', () => {
    const out = merge([{ pages: [1, 5], remediatedHtml: doc('<p>LEGACY BODY</p>') }], 5);
    expect(out).toContain('LEGACY BODY');
  });

  it('sorts out-of-order ranges by first page', () => {
    const out = merge([
      { pages: [11, 15], html: doc('<p>LATER</p>') },
      { pages: [1, 5], html: doc('<p>EARLIER</p>') },
    ], 15);
    expect(out.indexOf('EARLIER')).toBeLessThan(out.indexOf('LATER'));
  });

  it('marks the gap between non-adjacent ranges so it is not read as continuous prose', () => {
    const out = merge([
      { pages: [1, 5], html: doc('<p>A</p>') },
      { pages: [11, 15], html: doc('<p>B</p>') },
    ], 20);
    expect(out).toContain('data-multi-session-gap="6-10"');
    expect(out).toContain('Pages 6–10 have not yet been remediated');
  });

  it('does not invent a gap between adjacent ranges', () => {
    const out = merge([
      { pages: [1, 5], html: doc('<p>A</p>') },
      { pages: [6, 10], html: doc('<p>B</p>') },
    ], 10);
    expect(out).not.toContain('data-multi-session-gap=');
    expect(out).toContain('data-multi-session-boundary=');
  });

  it('says so when the document is not finished', () => {
    const out = merge([{ pages: [1, 5], html: doc('<p>A</p>') }], 30);
    expect(out).toContain('data-multi-session-gap="6-30"');
    expect(out).toContain('remain to be remediated');
  });

  it('emits a whole document, not a fragment', () => {
    const out = merge([{ pages: [1, 5], html: doc('<p>A</p>') }], 5);
    expect(out).toMatch(/^<!DOCTYPE html>/i);
    expect(out).toContain('</html>');
    expect(out).toContain('data-page-range="1-5"');
  });

  it('empty or non-array input yields an empty string, not a throw', () => {
    expect(merge([], 10)).toBe('');
    expect(merge(null, 10)).toBe('');
    expect(merge(undefined)).toBe('');
  });

  // ── The L1 guard: metadata damage must never cost the teacher content ──
  it('a record with NO pages keeps its content instead of throwing the merge away', () => {
    // This is the last step of a multi-day workflow. Before the guard, one malformed record threw
    // a TypeError out of the merge and took every other session's work with it.
    let out;
    expect(() => { out = merge([
      { pages: [1, 5], html: doc('<p>GOOD</p>') },
      { html: doc('<p>ORPHANED BUT REAL</p>') },
    ], 10); }).not.toThrow();
    expect(out).toContain('GOOD');
    expect(out).toContain('ORPHANED BUT REAL');
    expect(out).toContain('data-page-range-unknown="true"');
    expect(out).not.toContain('undefined');
  });

  it('survives every shape a hand-edited or half-written project file can hold', () => {
    const shapes = [
      { pages: null, html: doc('<p>X1</p>') },
      { pages: [], html: doc('<p>X2</p>') },
      { pages: ['a', 'b'], html: doc('<p>X3</p>') },
      { pages: [3], html: doc('<p>X4</p>') },
      { pages: [9, 4], html: doc('<p>X5</p>') },   // reversed
    ];
    let out;
    expect(() => { out = merge(shapes, 20); }).not.toThrow();
    for (const tag of ['X1', 'X2', 'X3', 'X4', 'X5']) {
      expect(out, tag + ' was dropped').toContain(tag);
    }
  });

  it('a range whose html is missing entirely still yields a section, not a crash', () => {
    let out;
    expect(() => { out = merge([{ pages: [1, 5] }, { pages: [6, 10], html: doc('<p>REAL</p>') }], 10); }).not.toThrow();
    expect(out).toContain('REAL');
  });
});

describe('anti-drift: doc_pipeline ships both fixes', () => {
  it('the merge uses the html-or-remediatedHtml accessor', () => {
    expect(pipeSrc).toMatch(/const _rangeHtml = \(rg\) => \(rg && \(rg\.html \|\| rg\.remediatedHtml\)\)/);
    expect(pipeSrc).toMatch(/_extractBodyContent\(_rangeHtml\(r\)\)/);
  });
  it('the save/load path requires the same exact document digest', () => {
    // Harness repair (2026-07-09): S1 snapshotted the size at run entry (_runFileSize = the real
    // pendingPdfFile.size captured before any concurrent upload can swap the bound var) — the
    // fingerprint still keys on REAL bytes, just via the snapshot.
    expect(pipeSrc).toContain('_multiSessionId(_msMeta.fileName, _msMeta.fileSize, _msMeta.pageCount, _documentKey)');
    expect(pipeSrc).toContain('documentDigest: _documentKey');
    expect(pipeSrc).toContain('return loadMultiSession(sid, digest);');
    expect(pipeSrc).toContain('var _MULTI_SESSION_SCHEMA = 2;');
  });
});
