// (2026-11-06) The cells a flattened table is rebuilt from, read by the REAL extractPdfTextDeterministic on PDFs in real pdf.js: the unit
// tests feed it made-up operator lists and marked content, and pdf.js is the part that can change shape.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;
const ROWS = [['Element', 'Percent'], ['Oxygen', '46.6'], ['Silicon', '27.7'], ['Iron', '5.0']];

async function boot(page: any) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  await page.evaluate(() => {
    const W: any = window;
    W.__pipe = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {} });
    W.__read = async (bytes: Uint8Array) => {
      let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as any);
      await W.__pipe.extractPdfTextDeterministic(btoa(b64));
      return W.__alloSourceTableGrids;
    };
    W.__ruled = (pg: any, font: any, rows: string[][], x = 70, y = 500, cw = 150, rh = 20) => {
      const black = W.PDFLib.rgb(0, 0, 0), n = rows.length, m = rows[0].length;
      for (let r = 0; r <= n; r++) pg.drawLine({ start: { x, y: y + r * rh }, end: { x: x + m * cw, y: y + r * rh }, thickness: 0.5, color: black });
      for (let c = 0; c <= m; c++) pg.drawLine({ start: { x: x + c * cw, y }, end: { x: x + c * cw, y: y + n * rh }, thickness: 0.5, color: black });
      rows.forEach((row, r) => row.forEach((t, c) => { if (t) pg.drawText(t, { x: x + c * cw + 4, y: y + (n - 1 - r) * rh + 5, size: 10, font }); }));
    };
    W.__cells = (g: any) => g.grid.rows.map((r: any) => r.cells.map((c: any) => c.text));
  });
}

test('a ruled data table is read cell by cell, top row first, and its top row becomes headers', async ({ page }) => {
  await boot(page);
  const got = await page.evaluate(async (ROWS: string[][]) => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica);
    W.__ruled(d.addPage([612, 792]), font, ROWS);
    const g = await W.__read(new Uint8Array(await d.save()));
    return { n: g.length, page: g[0].page, cells: W.__cells(g[0]), head: g[0].grid.rows[0].cells.map((c: any) => [c.isHeader, c.scope]) };
  }, ROWS);
  expect(got.n).toBe(1);
  expect(got.page).toBe(1);
  expect(got.cells).toEqual(ROWS);
  expect(got.head).toEqual([[true, 'col'], [true, 'col']]);
});

test('the author\'s tagged table is read from the tag tree, keeping its header cells', async ({ page }) => {
  await boot(page);
  const got = await page.evaluate(async (ROWS: string[][]) => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([612, 792]);
    pg.drawText('Elements', { x: 72, y: 720, size: 14, font });
    ROWS.forEach((r, i) => { pg.drawText(r[0], { x: 72, y: 680 - i * 20, size: 11, font }); pg.drawText(r[1], { x: 300, y: 680 - i * 20, size: 11, font }); });
    const html = '<html lang="en"><head><title>Elements</title></head><body><main><h1>Elements</h1><table><thead><tr><th scope="col">Element</th><th scope="col">Percent</th></tr></thead><tbody>'
      + ROWS.slice(1).map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></main></body></html>';
    const tagged = await W.__pipe.createTaggedPdf(new Uint8Array(await d.save()), { accessibleHtml: html }, { lang: 'en', title: 'Elements' });
    const g = await W.__read(new Uint8Array(tagged.bytes || tagged));
    return { n: g && g.length, cells: g && W.__cells(g[0]), th: g && g[0].grid.rows.map((r: any) => r.cells.map((c: any) => c.isHeader)) };
  }, ROWS);
  expect(got.n).toBe(1);
  expect(got.cells).toEqual(ROWS);
  expect(got.th).toEqual([[true, true], [false, false], [false, false], [false, false]]);
});

test('label-and-blank is counted as a table but offers no cells to rebuild', async ({ page }) => {
  await boot(page);
  const got = await page.evaluate(async () => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica);
    W.__ruled(d.addPage([612, 792]), font, [['Name', ''], ['Address', ''], ['City', ''], ['Phone', '']]);
    const grids = await W.__read(new Uint8Array(await d.save()));
    return { grids, counted: W.__alloSourceTables && W.__alloSourceTables.tables };
  });
  expect(got.counted).toBe(1);
  expect(got.grids).toBeNull();
});

test('a table on a page with form fields offers no cells, even a fully filled one', async ({ page }) => {
  await boot(page);
  const got = await page.evaluate(async (ROWS: string[][]) => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([612, 792]);
    W.__ruled(pg, font, ROWS);
    d.getForm().createTextField('reader.name').addToPage(pg, { x: 70, y: 300, width: 200, height: 20 });
    const grids = await W.__read(new Uint8Array(await d.save()));
    return { grids, counted: W.__alloSourceTables && W.__alloSourceTables.tables };
  }, ROWS);
  expect(got.counted).toBe(1);
  expect(got.grids).toBeNull();
});

test('a rotated page offers no cells, since its rows run sideways', async ({ page }) => {
  await boot(page);
  const grids = await page.evaluate(async (ROWS: string[][]) => {
    const W: any = window; const { PDFDocument, StandardFonts, degrees } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([612, 792]);
    W.__ruled(pg, font, ROWS); pg.setRotation(degrees(90));
    return W.__read(new Uint8Array(await d.save()));
  }, ROWS);
  expect(grids).toBeNull();
});

test('one document\'s cells never reach the next', async ({ page }) => {
  await boot(page);
  const [first, second] = await page.evaluate(async (ROWS: string[][]) => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const a = await PDFDocument.create(); let font = await a.embedFont(StandardFonts.Helvetica);
    W.__ruled(a.addPage([612, 792]), font, ROWS);
    const one = await W.__read(new Uint8Array(await a.save()));
    const b = await PDFDocument.create(); font = await b.embedFont(StandardFonts.Helvetica);
    b.addPage([612, 792]).drawText('Only a line of words on this page.', { x: 72, y: 700, size: 11, font });
    return [one && one.length, await W.__read(new Uint8Array(await b.save()))];
  }, ROWS);
  expect(first).toBe(1);
  expect(second).toBeNull();
});

test('the real cells rebuild a flattened list, in place', async ({ page }) => {
  await boot(page);
  const got = await page.evaluate(async (ROWS: string[][]) => {
    const W: any = window; const { PDFDocument, StandardFonts } = W.PDFLib;
    const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica);
    W.__ruled(d.addPage([612, 792]), font, ROWS);
    const grids = await W.__read(new Uint8Array(await d.save()));
    const flat = '<!DOCTYPE html><html lang="en"><head><title>Elements</title></head><body><main><h1>Elements</h1><p>Words before.</p><ul>' + ROWS.map((r) => '<li>' + r.join(': ') + '</li>').join('') + '</ul><p>Words after.</p></main></body></html>';
    const r = W.__pipe._alloRebuildFlattenedTables(flat, grids);
    const out = new DOMParser().parseFromString(r.html, 'text/html');
    return {
      rebuilt: r.rebuilt,
      rows: Array.from(out.querySelectorAll('table tr')).map((tr: any) => Array.from(tr.children).map((c: any) => c.tagName + ':' + c.textContent)),
      list: !!out.querySelector('ul'),
      around: [out.querySelector('table')!.previousElementSibling!.textContent, out.querySelector('table')!.nextElementSibling!.textContent],
    };
  }, ROWS);
  expect(got.rebuilt).toEqual([{ page: 1, rows: 4, cols: 2 }]);
  expect(got.rows).toEqual([['TH:Element', 'TH:Percent'], ['TD:Oxygen', 'TD:46.6'], ['TD:Silicon', 'TD:27.7'], ['TD:Iron', 'TD:5.0']]);
  expect(got.list).toBe(false);
  expect(got.around).toEqual(['Words before.', 'Words after.']);
});
