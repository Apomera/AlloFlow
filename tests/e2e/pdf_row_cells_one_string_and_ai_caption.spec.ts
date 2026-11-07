// FDA letter (2026-11-05): two text pieces stayed unlinked, holding the whole tagged PDF.
//  - Row "1." | "Final Protocol Submission*" prints as ONE string, so neither cell could claim it. Adjacent unlinked cells of
//    a row whose joined text is exactly one unclaimed block: the longest takes it and reads all their words, the rest are empty.
//  - The AI's table caption borrowed its words from the paragraph above and is printed nowhere. A caption, like a heading,
//    is printed only as a line of its own; otherwise it leaves this PDF's tree and stays in the HTML.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

async function tag(page, lines: string[], html: string) {
  return page.evaluate(async ({ lines, html }) => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const p = src.addPage([612, 792]);
    lines.forEach((t: string, i: number) => { p.drawText(t, { x: 72, y: 720 - i * 22, size: 11, font }); });
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Table', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Table' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const leaves: any[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const mcrs = kids.map(look).filter((d: any) => d instanceof PDFDict && d.get(PDFName.of('MCID')));
      const S = String(n.get(PDFName.of('S'))).slice(1), at = n.get(PDFName.of('ActualText'));
      if (at || mcrs.length || S === 'TH' || S === 'TD') leaves.push({ role: S, text: at ? at.decodeText() : '', linked: mcrs.length > 0 });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    return { leaves, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail) };
  }, { lines, html });
}

const SHELL = (b: string) => '<!doctype html><html lang="en"><head><title>Table</title></head><body><main><h1>Study timelines</h1>' + b + '</main></body></html>';
const TABLE = (cap: string, row1: [string, string]) => (cap ? '' : '') + '<table>' + (cap ? '<caption>' + cap + '</caption>' : '')
  + '<thead><tr><th>Number</th><th>Study</th><th>Date</th></tr></thead><tbody>'
  + '<tr><th>' + row1[0] + '</th><td>' + row1[1] + '</td><td>July 2020</td></tr>'
  + '<tr><th>2.</th><td>Study Initiation</td><td>November 2020</td></tr></tbody></table>';
const PAGE = ['Study timelines', 'Number', 'Study', 'Date', '1. Final Protocol Submission', 'July 2020', '2.', 'Study Initiation', 'November 2020', 'Thanks for reading this table of dates.'];

test.describe('row cells drawn as one string, and an AI caption', () => {
  test.beforeEach(async ({ page }) => { await boot(page); });

  test('the longest cell takes the block and reads both cells; the other stays an empty cell', async ({ page }) => {
    const r = await tag(page, PAGE, SHELL(TABLE('', ['1.', 'Final Protocol Submission*']) + '<p>Thanks for reading this table of dates.</p>'));
    const row = r.leaves.filter((x: any) => /Final Protocol/.test(x.text));
    expect(row).toEqual([expect.objectContaining({ role: 'TD', text: '1. Final Protocol Submission*', linked: true })]);
    const ths = r.leaves.filter((x: any) => x.role === 'TH');
    expect(ths.map((x: any) => x.text)).toEqual(['Number', 'Study', 'Date', '', '2.']);
    expect(r.leaves.filter((x: any) => x.role === 'TD' && !x.linked && x.text)).toEqual([]);
    expect(r.fails).toEqual([]);
  });

  // (2026-11-06) The real FDA drawing: one text object, the label, a pen move along the line, then the cell.
  test('a row label a pen move before its cell, in one text object, is its own header cell', async ({ page }) => {
    const r = await page.evaluate(async (html: string) => {
      const W: any = window; const L = W.PDFLib;
      const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = L;
      const src = await PDFDocument.create();
      const font = await src.embedFont(StandardFonts.Helvetica);
      const p = src.addPage([612, 792]);
      ['Study timelines', 'Number', 'Study', 'Date'].forEach((t, i) => p.drawText(t, { x: 72, y: 720 - i * 22, size: 11, font }));
      p.setFont(font);
      p.pushOperators(L.beginText(), L.setFontAndSize((p as any).fontKey, 12),
        L.setTextMatrix(1, 0, 0, 1, 72, 620), L.showText(font.encodeText('1.')),
        L.setTextMatrix(1, 0, 0, 1, 103, 620), L.showText(font.encodeText('Final Protocol Submission')), L.endText());
      ['July 2020', '2.', 'Study Initiation', 'November 2020', 'Thanks for reading this table of dates.'].forEach((t, i) => p.drawText(t, { x: 72, y: 590 - i * 22, size: 11, font }));
      const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Table', state: {} });
      const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Table' });
      const bytes = tagged.bytes || tagged;
      const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
      const doc = await PDFDocument.load(bytes); const c = doc.context;
      const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
      const cells: any[] = [];
      const walk = (x: any) => {
        const n = look(x);
        if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
        if (!(n instanceof PDFDict)) return;
        const K = n.get(PDFName.of('K')); const S = String(n.get(PDFName.of('S'))).slice(1); const at = n.get(PDFName.of('ActualText'));
        const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
        if (S === 'TH' || S === 'TD') cells.push({ role: S, text: at ? at.decodeText() : '', linked: kids.map(look).some((d: any) => d instanceof PDFDict && d.get(PDFName.of('MCID'))) });
        if (K != null) walk(K);
      };
      walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
      return { cells, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail) };
    }, SHELL(TABLE('', ['1.', 'Final Protocol Submission']) + '<p>Thanks for reading this table of dates.</p>'));
    expect(r.cells.find((x: any) => x.text === '1.')).toEqual({ role: 'TH', text: '1.', linked: true });
    expect(r.cells.find((x: any) => /Final Protocol/.test(x.text))).toEqual({ role: 'TD', text: 'Final Protocol Submission', linked: true });
    expect(r.fails).toEqual([]);
  });

  test('cells printed separately keep their own text', async ({ page }) => {
    const lines = ['Study timelines', 'Number', 'Study', 'Date', '1.', 'Final Protocol Submission', 'July 2020', '2.', 'Study Initiation', 'November 2020'];
    const r = await tag(page, lines, SHELL(TABLE('', ['1.', 'Final Protocol Submission'])));
    expect(r.leaves.filter((x: any) => x.role === 'TH').map((x: any) => x.text)).toEqual(['Number', 'Study', 'Date', '1.', '2.']);
    expect(r.leaves.find((x: any) => /Final Protocol/.test(x.text)).text).toBe('Final Protocol Submission');
  });

  test('joined text that is not exactly one block is left alone: no cell takes a block that holds more', async ({ page }) => {
    const lines = ['Study timelines', 'Number', 'Study', 'Date', '1. Final Protocol Submission and other things', 'July 2020', '2.', 'Study Initiation', 'November 2020'];
    const r = await tag(page, lines, SHELL(TABLE('', ['1.', 'Final Protocol Submission'])));
    expect(r.leaves.find((x: any) => x.role === 'TD' && x.text === '1. Final Protocol Submission')).toBeUndefined();
  });

  test('a caption built from a paragraph\'s words leaves the tree; the paragraph stays', async ({ page }) => {
    const p1 = 'The sponsor, based on the approach proposed by the agency in April to fulfil the';
    const p2 = 'maintenance portion of the requirement, proposes new timelines, for the Maintenance of';
    const p3 = 'Healing of Erosive Esophagitis in patients ages 1 to 11 years, pending results from feasibility.';
    const para = [p1, p2, p3].join(' ');
    const lines = ['Study timelines', p1, p2, p3, 'Number', 'Study', 'Date', '1.', 'Final Protocol Submission', 'July 2020', '2.', 'Study Initiation', 'November 2020'];
    const r = await tag(page, lines, SHELL('<p>' + para + '</p>' + TABLE('Proposed new study timelines for the Maintenance of Healing of Erosive Esophagitis in patients ages 1 to 11 years', ['1.', 'Final Protocol Submission'])));
    expect(r.leaves.filter((x: any) => x.role === 'Caption')).toEqual([]);
    expect(r.leaves.find((x: any) => x.role === 'P' && x.text.startsWith('The sponsor')).linked).toBe(true);
    expect(r.fails).toEqual([]);
  });

  test('a caption the page really prints stays, linked', async ({ page }) => {
    const lines = ['Study timelines', 'Table 1. Proposed study timelines', 'Number', 'Study', 'Date', '1.', 'Final Protocol Submission', 'July 2020', '2.', 'Study Initiation', 'November 2020'];
    const r = await tag(page, lines, SHELL(TABLE('Table 1. Proposed study timelines', ['1.', 'Final Protocol Submission'])));
    expect(r.leaves.filter((x: any) => x.role === 'Caption')).toEqual([expect.objectContaining({ text: 'Table 1. Proposed study timelines', linked: true })]);
  });
});
