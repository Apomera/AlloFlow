// The tagged-PDF active-content gate (desktop/mcp/remediation_headless_driver.cjs), run from the real
// source: a finding the scan DID make decides the reason even when another part of the PDF could not be
// walked (2026-10-28, IRS i1040 instructions: an embedded file in a nested name tree was reported as
// "scan unavailable, no active content"). The PDF is withheld either way; only the reason changes.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
const body = sliceBetween(SRC, 'const activeScan = cur && cur.activeContent;', 'if(contentCoverage.reviewRequired)', { file: 'remediation_headless_driver.cjs', includeStart: true });
const gate = new Function('cur', 'let activeContentDetected = false, activeContentScanVerified = false;\ntry {\n' + body
  + '\nreturn { ok: true, activeContentDetected, activeContentScanVerified };\n} catch (e) { return { error: e.message, activeContentDetected, activeContentScanVerified }; }');
const scan = (o) => ({ activeContent: Object.assign({ schema: 1, complete: true, pageScanFailures: 0, unexaminedStructures: 0, any: false, findings: [], externalLinks: 3 }, o) });
const EMBEDDED = [{ type: 'embedded-files', count: 1, label: 'embedded file attachment(s)' }];

describe('active-content gate', () => {
  it('an incomplete scan that found an embedded file reports the file, not "unavailable"', () => {
    expect(gate(scan({ complete: false, unexaminedStructures: 1, any: true, findings: EMBEDDED })))
      .toEqual({ error: 'active_content_requires_review', activeContentDetected: true, activeContentScanVerified: false });
  });
  it('an incomplete scan with nothing found is still unavailable (not evidence of a clean file)', () => {
    expect(gate(scan({ complete: false, unexaminedStructures: 1 }))).toMatchObject({ error: 'active_content_scan_unavailable', activeContentDetected: false });
  });
  it('a malformed finding never counts as a finding', () => {
    expect(gate(scan({ complete: false, unexaminedStructures: 1, any: true, findings: [{ type: 'embedded-files', count: 0, label: 'x' }] })))
      .toMatchObject({ error: 'active_content_scan_unavailable' });
    expect(gate(scan({ complete: false, unexaminedStructures: 1, any: true, findings: [{ type: 'mystery', count: 1, label: 'x' }] })))
      .toMatchObject({ error: 'active_content_scan_unavailable' });
  });
  it('a complete scan is unchanged: clean passes verified, a finding requires review', () => {
    expect(gate(scan({}))).toEqual({ ok: true, activeContentDetected: false, activeContentScanVerified: true });
    expect(gate(scan({ any: true, findings: EMBEDDED }))).toMatchObject({ error: 'active_content_requires_review', activeContentDetected: true });
  });
});

// (2026-10-28, NIST CSF pages 8-11 of 32) a page-range run makes no tagged PDF, and says why.
const rangeBody = sliceBetween(SRC, '// (2026-10-28) A page-range run has HTML', 'const activeScan = cur && cur.activeContent;', { file: 'remediation_headless_driver.cjs' });
const rangeGate = (pageRange, audit) => { try { new Function('pageRange', 'audit', rangeBody)(pageRange, audit); return 'continues'; } catch (e) { return e.message; } };
describe('page-range runs and the tagged PDF', () => {
  it('a slice is refused with its own reason', () => {
    expect(rangeGate([8, 11], { pageCount: 32 })).toBe('page_range_tagged_pdf_unsupported');
    expect(rangeGate([1, 4], { pageCount: 32 })).toBe('page_range_tagged_pdf_unsupported');
    expect(rangeGate([2, 32], { pageCount: 32 })).toBe('page_range_tagged_pdf_unsupported');
    expect(rangeGate([1, 4], null)).toBe('page_range_tagged_pdf_unsupported'); // total unknown: not provably whole
  });
  it('no range, or a range that covers every page, goes on to the tagged PDF', () => {
    expect(rangeGate(null, { pageCount: 32 })).toBe('continues');
    expect(rangeGate(undefined, null)).toBe('continues');
    expect(rangeGate([1, 32], { pageCount: 32 })).toBe('continues');
    expect(rangeGate([1, 40], { pageCount: 32 })).toBe('continues');
  });
  it('the report explains it in plain words', async () => {
    const { createRequire } = await import('node:module');
    const V = createRequire(import.meta.url)('../desktop/mcp/remediation_verification.cjs');
    const item = V.explainDelivery({ files: {}, taggedPdfError: 'page_range_tagged_pdf_unsupported' }).items[0];
    expect(item.meaning).toBe('This run made an accessible version of some pages only. A tagged PDF has to cover the whole document, so none was made.');
    expect(item.nextStep).toBe('Share the accessible HTML for these pages, or run the whole document to get a tagged PDF.');
  });
});

// (2026-10-28, NSF 9-12) the auto-continue round sends every section's instance of a merged finding.
const instrLine = sliceBetween(SRC, '                const _instr = ', '\n                let _fixedHtml', { file: 'remediation_headless_driver.cjs', includeStart: true });
const instr = (aiIssues) => new Function('_aiIssues', '_eaLines', instrLine + '\nreturn _instr;')(aiIssues, []);
describe('auto-continue fix instructions', () => {
  it('one line per instance of a merged finding, one line otherwise', () => {
    expect(instr([{ issue: 'Figure 1 caption hidden', instances: [{ issue: 'Figure 1 caption hidden' }, { issue: 'Figure 5 caption hidden' }] }, { issue: 'Link text vague' }, 'bare finding']))
      .toBe('AI-FLAGGED: Figure 1 caption hidden\nAI-FLAGGED: Figure 5 caption hidden\nAI-FLAGGED: Link text vague\nAI-FLAGGED: bare finding');
  });
});

// (2026-10-28, NASA slice) the headline also says when a finding needs a person, not only the PDF reason.
describe('delivery headline', () => {
  it('names both the withheld PDF and the findings for a person', async () => {
    const { createRequire } = await import('node:module');
    const V = createRequire(import.meta.url)('../desktop/mcp/remediation_verification.cjs');
    const both = V.explainDelivery({ files: {}, taggedPdfError: 'page_range_tagged_pdf_unsupported', verdictReasons: { review: ['numbers may have changed between source and output — verify scores, dates, and percentages before anyone reads this'], cautions: [] } });
    expect(both.headline).toBe('No tagged PDF was made for this file. The reason and what to do instead are below. Separately, 1 finding needs a person before sharing.');
    const onlyPdf = V.explainDelivery({ files: {}, taggedPdfError: 'page_range_tagged_pdf_unsupported', verdictReasons: { review: [], cautions: [] } });
    expect(onlyPdf.headline).toBe('No tagged PDF was made for this file. The reason and what to do instead are below.');
  });
});
