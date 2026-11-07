// (2026-11-06, keyless complaint4) The table count the fidelity note compares against, measured by the REAL extractPdfTextDeterministic
// on PDFs read by real pdf.js in Chromium: the unit tests feed it made-up operator lists, and pdf.js is the part that can change shape.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;
const LABELS = ['Name', 'Address', 'City', 'State', 'Email', 'Home Phone', 'Cell phone'];

async function boot(page: any) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  await page.evaluate(() => {
    const W: any = window;
    W.__pipe = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {} });
    W.__measure = async (bytes: Uint8Array) => {
      let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as any);
      await W.__pipe.extractPdfTextDeterministic(btoa(b64));
      return W.__alloSourceTables;
    };
    W.__grid = (pg: any, font: any, x: number, y: number, rows: number, cols: number, cw: number, rh: number, labels: string[]) => {
      const black = W.PDFLib.rgb(0, 0, 0);
      for (let r = 0; r <= rows; r++) pg.drawLine({ start: { x, y: y + r * rh }, end: { x: x + cols * cw, y: y + r * rh }, thickness: 0.5, color: black });
      for (let c = 0; c <= cols; c++) pg.drawLine({ start: { x: x + c * cw, y }, end: { x: x + c * cw, y: y + rows * rh }, thickness: 0.5, color: black });
      labels.forEach((t, r) => pg.drawText(t, { x: x + 4, y: y + (rows - 1 - r) * rh + 5, size: 10, font }));
    };
  });
}

test('a ruled form grid is counted, on the right page', async ({ page }) => {
  await boot(page);
  const seen = await page.evaluate(async (LABELS: string[]) => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica);
    const p1 = d.addPage([612, 792]); p1.drawText('A page of plain words with nothing ruled on it at all.', { x: 72, y: 700, size: 11, font });
    p1.drawText('And a second line of them, then a third and a fourth.', { x: 72, y: 680, size: 11, font });
    const p2 = d.addPage([612, 792]); W.__grid(p2, font, 70, 500, 7, 2, 200, 20, LABELS); W.__grid(p2, font, 70, 300, 7, 2, 200, 20, LABELS);
    return W.__measure(new Uint8Array(await d.save()));
  }, LABELS);
  expect(seen).toEqual({ tables: 2, cells: 28, pages: [2] });
});

test('words on coloured or white boxes, and underlines, are not a table', async ({ page }) => {
  await boot(page);
  const seen = await page.evaluate(async () => {
    const W: any = window; const { PDFDocument, StandardFonts, rgb } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([612, 792]);
    for (let i = 0; i < 8; i++) {
      const y = 600 - i * 14;
      pg.drawRectangle({ x: 72, y: y - 2, width: 468, height: 14, color: rgb(1, 1, 1) });
      pg.drawText('A line of the letter, sitting on a white box the way Word draws it.', { x: 72, y, size: 11, font });
      if (i % 2) pg.drawLine({ start: { x: 72, y: y - 2 }, end: { x: 300, y: y - 2 }, thickness: 0.5 });
    }
    return W.__measure(new Uint8Array(await d.save()));
  });
  expect(seen).toBeNull();
});

test('a bar chart\'s gridlines are not a table', async ({ page }) => {
  await boot(page);
  const seen = await page.evaluate(async () => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([612, 792]);
    W.__grid(pg, font, 70, 300, 20, 20, 24, 15, ['51', '62', '72', '73', '75', '76', '79', 'Percent', 'Strategies', '10', '20', '30']);
    return W.__measure(new Uint8Array(await d.save()));
  });
  expect(seen).toBeNull();
});

test('one document\'s count never reaches the next', async ({ page }) => {
  await boot(page);
  const [first, second] = await page.evaluate(async (LABELS: string[]) => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const a = await PDFDocument.create(); let font = await a.embedFont(StandardFonts.Helvetica);
    W.__grid(a.addPage([612, 792]), font, 70, 500, 7, 2, 200, 20, LABELS);
    const one = await W.__measure(new Uint8Array(await a.save()));
    const b = await PDFDocument.create(); font = await b.embedFont(StandardFonts.Helvetica);
    const pg = b.addPage([612, 792]); LABELS.forEach((t, i) => pg.drawText(t + ' is only a line of words here.', { x: 72, y: 700 - i * 14, size: 11, font }));
    return [one, await W.__measure(new Uint8Array(await b.save()))];
  }, LABELS);
  expect(first.tables).toBe(1);
  expect(second).toBeNull();
});

test('a table the author tagged is read from the tag tree, with its real cell count', async ({ page }) => {
  await boot(page);
  const seen = await page.evaluate(async () => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([612, 792]);
    const rows = [['Name', 'Ann'], ['City', 'Bath'], ['State', 'Maine']];
    pg.drawText('Contact sheet', { x: 72, y: 720, size: 14, font });
    rows.forEach((r, i) => { pg.drawText(r[0], { x: 72, y: 680 - i * 20, size: 11, font }); pg.drawText(r[1], { x: 300, y: 680 - i * 20, size: 11, font }); });
    const html = '<html lang="en"><head><title>Contact sheet</title></head><body><main><h1>Contact sheet</h1><table><tbody>'
      + rows.map((r) => '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></main></body></html>';
    const tagged = await W.__pipe.createTaggedPdf(new Uint8Array(await d.save()), { accessibleHtml: html }, { lang: 'en', title: 'Contact sheet' });
    return W.__measure(new Uint8Array(tagged.bytes || tagged));
  });
  expect(seen).toEqual({ tables: 1, cells: 6, pages: [1] });
});
