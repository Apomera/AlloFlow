// Golden e2e for H1 (deep dive 2026-07-09): the per-leaf POSITIONED draw used to push one BDC/EMC
// pair per run BEFORE knowing whether any word would draw. On a non-Latin scan whose Unicode font
// fails to load (offline / CDN blocked — forced here by aborting the notofonts requests), every
// Tesseract word folds to '' via _toWinAnsi, so the positioned pass emitted N EMPTY pairs, _posDrew
// stayed false, and the block fallback re-emitted the SAME MCIDs — two marked-content sequences
// claiming one MCID (ISO 32000 §14.7.4, PAC/Acrobat-flaggable; the exact multi-claim the per-leaf
// path was shipped to retire). The fix decides drawability BEFORE committing any operator, so each
// MCID is claimed exactly once. Runs the REAL createTaggedPdf in Chromium (pdf-lib + local module).
import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5CYII=';

let result: any = null;

test.describe('createTaggedPdf — per-leaf fold-empty page never claims an MCID twice (H1)', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const errs: string[] = [];
    const logs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push('[console] ' + m.text());
      const t = m.text();
      if (/Tag-Tree Unify|per-leaf|createTaggedPdf/i.test(t)) logs.push(t);
    });
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js' });
    await page.waitForFunction(() => !!(window as any).PDFLib && !!(window as any).PDFLib.PDFDocument && !!(window as any).pako, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!((window as any).AlloModules && (window as any).AlloModules.createDocPipeline), null, { timeout: 20000 });
    // Force the fold: the Arabic Noto font must fail to load so _uniFont is null and every
    // Arabic word folds to '' in the WinAnsi (Helvetica) fallback.
    await page.route('**notofonts**', (r) => r.abort());

    result = await page.evaluate(async (png) => {
      const { PDFDocument } = (window as any).PDFLib;
      try {
        const src = await PDFDocument.create();
        const img = await src.embedPng(Uint8Array.from(atob(png), (c: string) => c.charCodeAt(0)));
        const pg = src.addPage([612, 792]);
        pg.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
        const scannedBytes = await src.save();
        // Pure-Arabic OCR (no [A-Za-z] → no latinext fallback route) WITH word boxes whose page
        // frame matches exactly → _perWord true → the positioned path is the one under test.
        const _w = (t: string, x0: number, y0: number) => ({ t, x0, x1: x0 + 80, y0, y1: y0 + 18 });
        const groundTruthPages = [{
          pageNum: 1, pageW: 612, pageH: 792,
          text: 'عنوان التقرير\nالنص العربي الكامل هنا للاختبار',
          words: [_w('عنوان', 40, 60), _w('التقرير', 130, 60), _w('النص', 40, 100), _w('العربي', 130, 100), _w('الكامل', 220, 100)],
        }];
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => true, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        if (typeof pipeline.createTaggedPdf !== 'function') return { error: 'no createTaggedPdf export' };
        const fixResult = {
          isScanned: true,
          accessibleHtml: '<!DOCTYPE html><html lang="ar" dir="rtl"><head><title>تقرير</title></head><body><main id="main-content" role="main"><h1>عنوان التقرير</h1><p>النص العربي الكامل هنا للاختبار</p></main></body></html>',
          groundTruthPages,
        };
        const res = await pipeline.createTaggedPdf(scannedBytes, fixResult, { title: 'تقرير', lang: 'ar' });
        if (!res || !res.bytes) return { error: 'createTaggedPdf returned no bytes' };
        // pdf-lib Flate-compresses the pushOperators content streams, so BDC claims are invisible
        // in the raw bytes — re-load the output and DECODE page 1's content streams (pako).
        const { PDFName } = (window as any).PDFLib;
        const out = await PDFDocument.load(res.bytes);
        const pg0 = out.getPages()[0];
        const contents = pg0.node.get(PDFName.of('Contents'));
        const ctx2 = out.context;
        const refs: any[] = [];
        if (contents && typeof (contents as any).size === 'function') { for (let k = 0; k < (contents as any).size(); k++) refs.push((contents as any).get(k)); }
        else if (contents) refs.push(contents);
        let decoded = '';
        for (const r of refs) {
          const s: any = ctx2.lookup(r);
          if (!s || !s.contents) continue;
          const filter = s.dict && s.dict.get ? s.dict.get(PDFName.of('Filter')) : null;
          try {
            const bytes = (filter && String(filter).indexOf('Flate') !== -1) ? (window as any).pako.inflate(s.contents) : s.contents;
            let txt = '';
            for (let i = 0; i < bytes.length; i += 8192) txt += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
            decoded += '\n' + txt;
          } catch (_) { /* a stream that fails to inflate contributes nothing */ }
        }
        // Every "<</MCID n>> BDC" content claim, tolerant of dict whitespace.
        const claims: Record<string, number> = {};
        const re = /\/MCID[\s\r\n]+(\d+)[\s\r\n]*>>[\s\r\n]*BDC/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(decoded))) claims[m[1]] = (claims[m[1]] || 0) + 1;
        return {
          ok: true,
          claims,
          claimedMcids: Object.keys(claims).length,
          duplicates: Object.entries(claims).filter(([, n]) => (n as number) > 1),
          hasArtifact: decoded.indexOf('/Artifact BMC') !== -1,
          droppedChars: (res.ocrTextLayer && res.ocrTextLayer.droppedChars) || 0,
        };
      } catch (e) { return { error: String((e as any) && ((e as any).stack || (e as any).message) || e) }; }
    }, PNG_1x1);
    await page.close();
    if (!result || result.error) console.log('SETUP ERROR:', result && result.error, '\n' + errs.slice(0, 4).join('\n'), '\nLOGS:', logs.slice(0, 8).join('\n'));
  });

  test('no MCID is claimed by more than one marked-content sequence', () => {
    expect(result && result.error, result && result.error).toBeFalsy();
    expect(result.duplicates, 'duplicate MCID claims: ' + JSON.stringify(result.claims)).toEqual([]);
  });

  test('the scenario is non-vacuous: per-leaf MCIDs were actually emitted and the image is /Artifact', () => {
    // The block fallback must still claim each planned leaf's MCID exactly once (empty runs are
    // legal); zero claims would mean the per-leaf plan never ran and the test proves nothing.
    expect(result.claimedMcids).toBeGreaterThan(0);
    expect(result.hasArtifact).toBe(true);
  });

  test('folded-away non-Latin chars are tallied (the coverage disclosure was dead on this path)', () => {
    expect(result.droppedChars).toBeGreaterThan(0);
  });
});
