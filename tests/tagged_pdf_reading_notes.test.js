// Reading notes on a saved tagged PDF (2026-11-04). veraPDF and every validator rule passed RSU 57 budget_v5, whose tag
// tree read on past its last section: "u" bullets, page numbers, a second H1, undescribed clip art. Only reading the tree
// found it. PdfValidator.readingNotes reports these from the tree as advisory notes: they are 'warn' rows, are not
// counted as failures and cannot hold a PDF, and the connector report lists them as quick checks.
// ALLO_VALIDATOR_SOURCE / ALLO_VERIFICATION_MODULE point at private copies for mutation checks.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PDFLib = require('../desktop/mcp/vendor/pdf-lib.min.js');
const sandbox = { window: { PDFLib, AlloModules: {} }, console: { log() {} }, TextDecoder, Map, Uint8Array };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(process.env.ALLO_VALIDATOR_SOURCE || path.resolve('view_pdf_validator_module.js'), 'utf8'), sandbox);
const V = sandbox.window.AlloModules.PdfValidator;
const notes = (elems) => JSON.parse(JSON.stringify(V.readingNotes(elems)));
const Verification = require(process.env.ALLO_VERIFICATION_MODULE || '../desktop/mcp/remediation_verification.cjs');

const el = (role, page, text, extra) => Object.assign({ role, page, hasContent: true, actualText: text || '', altText: '' }, extra || {});
const fig = (page, alt) => el('Figure', page, '', { altText: alt });
const ids = (e) => notes(e).map((n) => n.id);
const CLEAN = [el('H1', 1, 'Budget'), el('P', 1, 'Intro paragraph.'), el('H2', 2, 'Enrollment'), fig(2, 'Line chart of enrollment.'), el('P', 3, 'Closing paragraph.')];

describe('readingNotes', () => {
  it('a tree that reads in order with one H1 has no notes', () => {
    expect(notes(CLEAN)).toEqual([]);
  });
  it('several top-level headings: counted and quoted', () => {
    const [n] = notes([el('H1', 1, 'Budget'), el('P', 1, 'x y z'), el('H1', 2, 'Projects')]);
    expect(n).toMatchObject({ id: 'several-h1', count: 2 });
    expect(n.detail).toContain('"Budget"');
    expect(n.detail).toContain('"Projects"');
  });
  it('a step back to an earlier page names both pages and the text', () => {
    const [n] = notes([el('H1', 1, 'Budget'), el('P', 25, 'Last section.'), el('P', 3, 'Stray page three text.')]);
    expect(n).toMatchObject({ id: 'goes-back', count: 1 });
    expect(n.detail).toContain('from page 25 to page 3');
    expect(n.detail).toContain('"Stray page three text."');
  });
  it('moving forward or staying on a page is not a step back; a paragraph with no text does not print a role name', () => {
    expect(ids([el('P', 1, 'a b c'), el('P', 1, 'd e f'), el('P', 4, 'g h i')])).toEqual([]);
    const [n] = notes([el('P', 11, 'End of document.'), el('P', 1, '')]);
    expect(n.detail).toContain('from page 11 to page 1.');
    expect(n.detail).not.toContain(' at "');
  });
  it('elements with no page or no content, and decoration, do not count as steps back', () => {
    expect(ids([el('P', 9, 'a b c'), el('P', null, 'd e f'), el('P', 3, 'g h i', { hasContent: false }), el('NonStruct', 2, ''), el('Lbl', 1, '•')])).toEqual([]);
  });
  it('stray fragments: a lone letter, number or glyph in a paragraph or heading', () => {
    for (const t of ['u', '7', '•', '24']) expect(ids([el('P', 1, t)]), t).toEqual(['stray-fragments']);
    const n = notes([el('P', 1, 'u'), el('P', 1, '3'), el('Caption', 2, '4'), el('H2', 2, '5'), el('P', 2, 'x')]).find((x) => x.id === 'stray-fragments');
    expect(n.count).toBe(5);
    expect(n.detail).toContain('"u", "3", "4", "5", …');
  });
  it('not fragments: table cells, list parts, real short text', () => {
    expect(ids([el('TD', 1, '7'), el('TH', 1, '2019'), el('Lbl', 1, '1.'), el('LBody', 1, 'u'), el('P', 1, 'Yes'), el('P', 1, 'FY24'), el('P', 1, '12345')])).toEqual([]);
  });
  it('a fragment with no linked content is not read from the page, so it is not a note', () => {
    expect(ids([el('P', 1, 'u', { hasContent: false })])).toEqual([]);
  });
  it('the placeholder description is reported with its pages; a real description is not', () => {
    const [n] = notes([fig(9, 'Image (description unavailable)'), fig(10, 'Image (description unavailable)'), fig(11, 'A real chart.')]);
    expect(n).toMatchObject({ id: 'placeholder-alt', count: 2 });
    expect(n.detail).toContain('pages 9, 10');
  });
  it('budget_v5: every problem found by reading the tree is flagged at once', () => {
    const junk = [el('H1', 1, 'Budget'), el('P', 25, 'Public questions.'), el('P', 2, '2'), el('Caption', 5, 'u'), fig(9, 'Image (description unavailable)'), el('H1', 18, 'Projects')];
    expect(ids(junk).sort()).toEqual(['goes-back', 'placeholder-alt', 'several-h1', 'stray-fragments']);
  });
});

describe('notes never change a verdict', () => {
  it('the validator adds notes as warn rows, outside the pass and fail counts, and only when there are notes', () => {
    const src = fs.readFileSync(process.env.ALLO_VALIDATOR_SOURCE || path.resolve('view_pdf_validator_module.js'), 'utf8');
    expect(src.includes("_readingNotes.forEach(function (n) { checks.push({ rule: 'Reading order note (a person should look)', status: 'warn', detail: n.detail }); });"), 'warn row').toBe(true);
    expect(src.includes("var failCount = checks.filter(function (c) { return c.status === 'fail'; }).length;"), 'fail count').toBe(true);
  });
  it('a real validator run on an untagged PDF reports no notes and does not throw', async () => {
    const doc = await PDFLib.PDFDocument.create(); doc.addPage([612, 792]);
    const r = await V.validateExportedPdfBytes(await doc.save());
    expect(JSON.parse(JSON.stringify(r.readingNotes))).toEqual([]);
  });
  it('a summary with notes keeps its delivery state', () => {
    const s = { files: { taggedPdf: 'x.pdf' }, verdict: { level: 'ready' }, verificationState: 'complete', taggedPdfDelivery: { ok: true, code: 'verified' }, taggedPdfReadingNotes: ['A screen reader goes back to an earlier page 1 time.'] };
    Verification.applyPdfDeliveryEvidence(s, { status: 'passed' });
    expect(s).toMatchObject({ reviewRequired: false, deliveryStatus: 'complete-for-tested-scope' });
  });
});

describe('the connector report', () => {
  const ready = (extra) => Object.assign({ deliveryStatus: 'complete-for-tested-scope', verdictReasons: { review: [], cautions: [] }, files: { taggedPdf: 'x-tagged.pdf' } }, extra || {});
  const NOTE = 'The tagged PDF has 2 top-level headings ("Budget", "Projects").';
  it('lists notes as quick checks and says so in the headline; nothing becomes a must-do', () => {
    const ex = Verification.explainDelivery(ready({ taggedPdfReadingNotes: [NOTE] }));
    expect(ex.quickChecks).toEqual([NOTE]);
    expect(ex.needsAPerson).toEqual([]);
    expect(ex.items).toEqual([]);
    expect(ex.headline).toMatch(/^Automated checks passed for everything they can test\./);
    expect(ex.headline).toContain('reading-order notes');
  });
  it('without notes the report reads as before', () => {
    const ex = Verification.explainDelivery(ready({ taggedPdfReadingNotes: [] }));
    expect(ex.quickChecks).toEqual([]);
    expect(ex.headline).toBe('Automated checks passed for everything they can test. A person should still read it once before sharing.');
  });
  it('no delivered PDF: no notes about one', () => {
    const ex = Verification.explainDelivery(ready({ files: {}, taggedPdfReadingNotes: [NOTE] }));
    expect(ex.quickChecks).toEqual([]);
    expect(ex.headline).not.toContain('reading-order notes');
  });
  it('a note does not replace the named checker finding it would otherwise stand beside', () => {
    const ex = Verification.explainDelivery({ deliveryStatus: 'review-required', files: { taggedPdf: 'x.pdf' }, taggedPdfReadingNotes: [NOTE],
      verdictReasons: { review: ['WCAG verification is review-required; review the engine coverage and unresolved evidence before distribution'], cautions: [] } });
    expect(ex.needsAPerson).toEqual(['The automated accessibility checkers left items that a person needs to look at (see the review findings in this report).']);
    expect(ex.quickChecks).toEqual([NOTE]);
  });
  it('malformed notes are ignored', () => {
    expect(Verification.explainDelivery(ready({ taggedPdfReadingNotes: 'nope' })).quickChecks).toEqual([]);
    expect(Verification.explainDelivery(ready({ taggedPdfReadingNotes: [null, 7, '  ', NOTE] })).quickChecks).toEqual([NOTE]);
  });
  it('the connector passes bounded notes through and declares the field; the driver takes them only for a delivered PDF', () => {
    const stdio = fs.readFileSync(path.resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
    expect(stdio.includes('taggedPdfReadingNotes: safeTaggedPdfReadingNotes(out.taggedPdfReadingNotes),'), 'summary').toBe(true);
    expect(stdio.includes("taggedPdfReadingNotes: { type: 'array', items: S_STR,"), 'schema').toBe(true);
    const driver = fs.readFileSync(path.resolve('desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    const delivered = driver.indexOf('if (outBytes && outBytes.length && taggedPdfDelivery.ok) {'), took = driver.indexOf('tagged.postExportValidator.readingNotes;'), notDelivered = driver.indexOf("? 'tagged_pdf_delivery_unverified'");
    expect(delivered > 0 && took > delivered && took < notDelivered, 'inside the delivered branch').toBe(true);
  });
  it('the app shows each note as a warning in the results panel', () => {
    const view = fs.readFileSync(path.resolve('view_pdf_audit_source.jsx'), 'utf8');
    expect(view.includes("_rpt.push({ tone: 'warn', text: 'Reading order note: ' + n.detail })")).toBe(true);
  });
});
