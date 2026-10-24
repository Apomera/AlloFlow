// Tagged-PDF release gate (2026-10-19, Aaron). The MCP lane used to withhold the tagged PDF whenever
// the HTML verdict was "review", and IBM Equal Access raises "please check" items (potential/manual)
// on nearly every real document, so a veraPDF-compliant PDF never shipped. The PDF is now released
// when those checker items are the ONLY review reason; content-trust review, any known failure, an
// open AI issue, a language check or missing evidence still withhold it.
// Runs the BUILT module (loadAlloModule) and the driver's own gate block.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { sliceBetween } from './helpers/anchored_slice.js';

let pipeline;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });
  expect(typeof pipeline.taggedPdfReleaseGate).toBe('function');
});

// The Spanish family letter's final state on 10-19: every engine clean, Equal Access "please check" items only.
const base = () => ({
  verificationState: 'review-required',
  verificationReasons: ['equal-access-potential:6', 'equal-access-manual:1', 'axe-incomplete:2'],
  verificationAudit: { score: 100, issues: [] },
  axeAudit: { totalViolations: 0 }, secondEngineAudit: { failViolations: 0 },
  afterScore: 86, integrityCoverage: 100, fidelityNotes: [],
});
const gate = (r, opts) => pipeline.taggedPdfReleaseGate(r, opts || { targetScore: 90 });

describe('taggedPdfReleaseGate', () => {
  it('releases the PDF when checker "please look" items are the only review reason', () => {
    expect(pipeline.distributionVerdict(base(), { targetScore: 90 }).level).toBe('review');
    expect(gate(base())).toMatchObject({ ok: true, code: 'checker_review_items_only' });
  });
  it('releases a document the verdict already calls ready or caution', () => {
    expect(gate({ ...base(), verificationState: 'complete', verificationReasons: [], afterScore: 98 })).toMatchObject({ ok: true });
  });
  const blocked = {
    'an open AI audit issue': (r) => { r.verificationAudit.issues = [{ ruleId: 'alt-quality', issue: 'Alt text describes the wrong image.' }]; r.verificationReasons.push('ai-confirmed-issues:1'); },
    'an AI issue left for manual review': (r) => { r.verificationReasons.push('ai-manual-review:1'); },
    'an AI issue even when no reason was recorded': (r) => { r.verificationAudit.issues = [{ ruleId: 'heading-order', issue: 'A heading skips a level.' }]; },
    'an axe violation': (r) => { r.axeAudit.totalViolations = 1; r.verificationReasons.push('axe-confirmed-violations:1'); },
    'an Equal Access failure': (r) => { r.secondEngineAudit.failViolations = 2; r.verificationReasons.push('equal-access-confirmed-failures:2'); },
    'a language check for a person': (r) => { r.verificationReasons.push('document-language-needs-review'); },
    'content coverage below 90%': (r) => { r.integrityCoverage = 80; },
    'changed numbers': (r) => { r.fidelityNotes = [{ kind: 'numeric', msg: 'a value changed' }]; },
    'reordered source text': (r) => { r.fidelityNotes = [{ kind: 'sourceReadingOrder', msg: 'order differs' }]; },
    'expert review': (r) => { r.needsExpertReview = true; r.expertReviewReason = 'content-fidelity'; },
    'an engine that did not finish': (r) => { r.verificationState = 'partial'; },
    'missing verification reasons': (r) => { delete r.verificationReasons; },
    'missing AI audit evidence': (r) => { delete r.verificationAudit; },
    'missing axe evidence': (r) => { delete r.axeAudit; },
    'missing Equal Access evidence': (r) => { delete r.secondEngineAudit; },
  };
  for (const [name, mutate] of Object.entries(blocked)) {
    it('withholds the PDF for ' + name, () => {
      const r = base(); mutate(r);
      expect(gate(r).ok).toBe(false);
    });
  }
  it('withholds the PDF while a round is still running', () => {
    expect(gate(base(), { targetScore: 90, inProgress: true })).toMatchObject({ ok: false, code: 'distribution_in_progress' });
  });
  it('withholds the PDF when there is no result at all', () => {
    expect(gate(null)).toMatchObject({ ok: false, code: 'distribution_verdict_unavailable' });
  });
});

// The tagged PDF's title (2026-10-19): it was the FILE NAME ("ed-parent-guide-idea"). The driver's
// own block runs here as written, with a stub pdf-lib for the source PDF's title.
describe('MCP driver: tagged-PDF title', () => {
  const src = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
  const block = sliceBetween(src, "let _htmlTitle = '', _srcTitle = '';", "fileName.replace(/\\.pdf$/i, '')),",
    { file: 'desktop/mcp/remediation_headless_driver.cjs', includeEnd: true });
  const AsyncFn = Object.getPrototypeOf(async () => {}).constructor;
  const titleOf = (html, sourceTitle, fileName = 'ed-parent-guide-idea.pdf') => new AsyncFn('cur', 'bytes', 'fileName', 'window', block + '\n};\nreturn tagOptions.title;')(
    { accessibleHtml: html }, new Uint8Array(0), fileName,
    { PDFLib: { PDFDocument: { load: async () => ({ getTitle: () => sourceTitle }) } } });
  const page = (title) => '<!DOCTYPE html><html lang="en"><head><title>' + title + '</title></head><body><main><p>x</p></main></body></html>';
  it('uses the delivered HTML title (entities decoded)', async () => {
    expect(await titleOf(page('IEP Translation: OSEP Letter &amp; Statement of Interest'), 'Source title')).toBe('IEP Translation: OSEP Letter & Statement of Interest');
  });
  it('falls back to the source PDF title when the HTML title is the generic scaffold', async () => {
    expect(await titleOf(page('Accessible Document — ed-parent-guide-idea'), 'IEP Translation – Communication from OSEP')).toBe('IEP Translation – Communication from OSEP');
  });
  it('uses the file name only when there is no other title', async () => {
    expect(await titleOf(page('Accessible Document — ed-parent-guide-idea'), '')).toBe('ed-parent-guide-idea');
    expect(await titleOf('', undefined)).toBe('ed-parent-guide-idea');
  });
});

// The MCP driver's gate block, run as written against stub pipelines.
describe('MCP driver: tagged-PDF gate wiring', () => {
  const src = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
  const block = sliceBetween(src, 'let artifactVerdict = null, releaseGate = null;', "throw new Error('distribution_review_required');\n            }",
    { file: 'desktop/mcp/remediation_headless_driver.cjs', includeEnd: true });
  const run = (pipe) => {
    try { new Function('pipeline', 'cur', 'targetScore', 'let verdict = null;\n' + block + '\nreturn "build";')(pipe, {}, 90); return 'build'; } catch (e) { return e.message; }
  };
  it('the sliced block is the gate (asks the release gate)', () => {
    expect(block).toContain('pipeline.taggedPdfReleaseGate(cur, { targetScore })');
  });
  it('builds when the verdict is not review', () => {
    expect(run({ distributionVerdict: () => ({ level: 'caution' }), taggedPdfReleaseGate: () => ({ ok: false }) })).toBe('build');
  });
  it('builds on a review verdict the release gate clears', () => {
    expect(run({ distributionVerdict: () => ({ level: 'review' }), taggedPdfReleaseGate: () => ({ ok: true }) })).toBe('build');
  });
  it('withholds on a review verdict the release gate does not clear', () => {
    expect(run({ distributionVerdict: () => ({ level: 'review' }), taggedPdfReleaseGate: () => ({ ok: false }) })).toBe('distribution_review_required');
  });
  it('withholds on a review verdict when the module has no release gate (older build)', () => {
    expect(run({ distributionVerdict: () => ({ level: 'review' }) })).toBe('distribution_review_required');
  });
  it('withholds when the verdict is unavailable', () => {
    expect(run({ distributionVerdict: () => null, taggedPdfReleaseGate: () => ({ ok: true }) })).toBe('distribution_verdict_unavailable');
    expect(run({ distributionVerdict: () => { throw new Error('boom'); }, taggedPdfReleaseGate: () => ({ ok: true }) })).toBe('distribution_verdict_unavailable');
  });
});
