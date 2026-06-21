// Golden e2e for tagging-pdfua-2 (2026-06-21): a SCANNED page with NO OCR text (a blank/unreadable scan)
// must NOT have its bare page IMAGE wrapped in /P <</MCID 0>> BDC — that tags an image as a text paragraph,
// the veraPDF §7.1 "content neither Artifact nor tagged" failure. The fix wraps such a page's image in
// /Artifact (decorative) with no /P StructElem. The existing scanned-tagging fixtures all carry OCR text,
// so this branch had ZERO coverage. Runs the REAL createTaggedPdf in Chromium (pdf-lib + the local module)
// and inspects the OUTPUT content-stream markers — no Java/veraPDF needed (the manual scanned_tag_harness
// BLANK=1 gives the full ISO validation).
import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
// minimal valid 1×1 white PNG — drawn to fill the page as the "scan"
const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let result: any = null;

test.describe('createTaggedPdf — blank scanned page → image /Artifact, not /P (tagging-pdfua-2)', () => {
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

    result = await page.evaluate(async (png) => {
      const { PDFDocument } = (window as any).PDFLib;
      try {
        // An image-only "scanned" 1-page doc with NO OCR text (groundTruthPages.words is empty).
        const src = await PDFDocument.create();
        const img = await src.embedPng(Uint8Array.from(atob(png), (c: string) => c.charCodeAt(0)));
        const pg = src.addPage([612, 792]);
        pg.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
        const scannedBytes = await src.save();
        const groundTruthPages = [{ pageNum: 1, pageW: 612, pageH: 792, text: '', words: [] }]; // BLANK — no OCR

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        if (typeof pipeline.createTaggedPdf !== 'function') return { error: 'no createTaggedPdf export' };
        const fixResult = { isScanned: true, accessibleHtml: '<!DOCTYPE html><html lang="en"><head><title>Blank Scan</title></head><body><main id="main-content" role="main"></main></body></html>', groundTruthPages };
        const res = await pipeline.createTaggedPdf(scannedBytes, fixResult, { title: 'Blank Scan', lang: 'en' });
        if (!res || !res.bytes) return { error: 'createTaggedPdf returned no bytes' };
        // The BDC/EMC marker streams are uncompressed (TextEncoder bytes), so they appear verbatim in the
        // raw output — inspect them directly.
        const b = res.bytes; let raw = '';
        for (let i = 0; i < b.length; i += 8192) raw += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
        return {
          ok: true,
          hasArtifact: raw.indexOf('/Artifact BMC') !== -1,             // image wrapped decorative
          hasParagraphWrap: raw.indexOf('/P <</MCID 0>> BDC') !== -1,    // image tagged as a text paragraph (the bug)
          hasStructTree: raw.indexOf('StructTreeRoot') !== -1,          // doc still declares a structure tree
          selfCheck: (res.postExportValidator && res.postExportValidator.summary) || null,
        };
      } catch (e) { return { error: String((e as any) && ((e as any).stack || (e as any).message) || e) }; }
    }, PNG_1x1);
    await page.close();
    if (!result || result.error) console.log('SETUP ERROR:', result && result.error, '\n' + errs.slice(0, 4).join('\n'));
  });

  test('the bare page image is wrapped /Artifact (decorative), never /P MCID 0', () => {
    expect(result && result.error, result && result.error).toBeFalsy();
    expect(result.hasArtifact, 'blank scanned image should be marked /Artifact BMC').toBe(true);
    expect(result.hasParagraphWrap, 'blank scanned image must NOT be wrapped /P <</MCID 0>> (§7.1)').toBe(false);
  });

  test('the tagged doc still declares a structure tree', () => {
    expect(result.hasStructTree).toBe(true);
  });
});
