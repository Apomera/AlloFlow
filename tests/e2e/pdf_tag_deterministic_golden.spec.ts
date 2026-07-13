// Validate-what-you-ship golden (2026-06-21): the auto-veraPDF run tags one PDF and the download tags
// another. With a per-call new Date() they differ only by timestamp, so the green verdict never attests
// to the file the user actually receives. createTaggedPdf now accepts meta.modDate; the view threads ONE
// stable value per result, so re-tagging the SAME content yields BYTE-IDENTICAL output. This runs the real
// createTaggedPdf twice in Chromium (pdf-lib + the local module) on a born-digital, no-table doc (no
// Stage-5b Gemini, no scanned OCR) and asserts the two tagged buffers are byte-identical with a shared
// modDate — and that the modDate is actually the per-run difference (omitting it makes them differ).
import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let result: any = null;

test.describe('createTaggedPdf — deterministic with a stable meta.modDate (validate == download)', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });

    result = await page.evaluate(async () => {
      const { PDFDocument, StandardFonts } = (window as any).PDFLib;
      try {
        // a born-digital 1-page text PDF (no tables → no Stage-5b Gemini; not scanned → no OCR layer)
        const src = await PDFDocument.create();
        const pg = src.addPage([612, 792]);
        const font = await src.embedFont(StandardFonts.Helvetica);
        pg.drawText('Assessment Report', { x: 72, y: 720, size: 18, font });
        pg.drawText('This is a born-digital paragraph of body text for the determinism golden.', { x: 72, y: 690, size: 11, font });
        const srcBytes = await src.save();

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const fixResult = { accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>Assessment Report</title></head><body><main id="main-content" role="main"><h1>Assessment Report</h1><p>This is a born-digital paragraph of body text for the determinism golden.</p></main></body></html>' };
        const md5ish = (b: Uint8Array) => { let h = 0; for (let i = 0; i < b.length; i++) { h = ((h << 5) - h + b[i]) | 0; } return b.length + ':' + (h >>> 0); };
        const tag = async (modDate?: string) => {
          const meta: any = { title: 'Assessment Report', lang: 'en', subject: 'Remediated for accessibility by AlloFlow' };
          if (modDate) meta.modDate = modDate;
          const r = await pipeline.createTaggedPdf(srcBytes, fixResult, meta);
          return (r && r.bytes) ? r.bytes as Uint8Array : (r as Uint8Array);
        };
        const MOD = '2026-01-01T00:00:00Z';
        const a = await tag(MOD);
        const b = await tag(MOD);                 // same modDate → must be byte-identical
        await new Promise((res) => setTimeout(res, 1100)); // cross a second boundary
        const c = await tag();                    // no modDate → uses new Date()
        await new Promise((res) => setTimeout(res, 1100));
        const d = await tag();
        const eq = (x: Uint8Array, y: Uint8Array) => x.length === y.length && md5ish(x) === md5ish(y);
        return {
          ok: true,
          sameModDateIdentical: eq(a, b),
          lenA: a.length, lenB: b.length,
          noModDateDiffer: !eq(c, d),             // documents the modDate WAS the per-run difference
        };
      } catch (e) { return { error: String((e as any) && ((e as any).stack || (e as any).message) || e) }; }
    });
    await page.close();
    if (!result || result.error) console.log('SETUP ERROR:', result && result.error, '\n' + errs.slice(0, 4).join('\n'));
  });

  test('the same content + same modDate produces byte-identical tagged PDFs (validate == download)', () => {
    expect(result && result.error, result && result.error).toBeFalsy();
    expect(result.sameModDateIdentical, 'two tags with the same modDate must be byte-identical').toBe(true);
  });

  test('without a stable modDate the bytes differ across runs (so the modDate fix is what closes the gap)', () => {
    expect(result.noModDateDiffer).toBe(true);
  });
});
