// Render-verification golden: the safety net veraPDF cannot provide.
// veraPDF validates STRUCTURE; nothing verified that a tagged PDF still
// RENDERS its content visibly. The failure class is real: Stage 7 swaps
// non-embedded fonts for substitutes (a broken FontFile2/cmap would render
// as INVISIBLE text), and Stage 4/4c splice BDC/EMC into content streams (a
// malformed splice could blank a page). This golden renders page 1 of the
// SOURCE and the TAGGED output via pdf.js and compares ink coverage —
// catastrophes (blank page, vanished glyphs, doubled content) fail loudly,
// while legitimate glyph differences (Helvetica → Liberation Sans) pass
// within tolerance. This is also the prerequisite harness for ever
// attempting font SUBSETTING in Stage 7.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

test.describe('tagged-PDF render verification (ink coverage)', () => {
  test('the tagged output renders page 1 with ink comparable to the source — no invisible-text/blank-page regressions', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.addScriptTag({ url: PDFJS_CDN });
    await page.waitForFunction(() => !!((window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf']), null, { timeout: 30000 });

    const out = await page.evaluate(async (workerUrl) => {
      try {
        const { PDFDocument, StandardFonts } = (window as any).PDFLib;
        // Text-rich fixture using NON-EMBEDDED Helvetica so Stage 7 font
        // repair runs — the exact path whose rendering we most need verified.
        const inDoc = await PDFDocument.create();
        const pg = inDoc.addPage([612, 792]);
        const font = await inDoc.embedFont(StandardFonts.Helvetica);
        let y = 740;
        pg.drawText('Render Verification Heading', { x: 50, y, size: 22, font }); y -= 36;
        for (let i = 0; i < 10; i++) { pg.drawText('Line ' + (i + 1) + ': the quick brown fox jumps over the lazy dog near the riverbank.', { x: 50, y, size: 12, font }); y -= 18; }
        const inputBytes = await inDoc.save();

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const html = '<!DOCTYPE html><html lang="en"><head><title>RV</title></head><body><main><h1>Render Verification Heading</h1>'
          + Array.from({ length: 10 }, (_, i) => '<p>Line ' + (i + 1) + ': the quick brown fox jumps over the lazy dog near the riverbank.</p>').join('')
          + '</main></body></html>';
        const result = await pipeline.createTaggedPdf(inputBytes, { accessibleHtml: html }, { title: 'RV', lang: 'en' });
        if (!result || !result.bytes) return { error: 'createTaggedPdf returned no bytes' };
        const fontsRepaired = (result.summary || {}).fontsRepaired ?? 0;
        const fontsSubset = (result.summary || {}).fontsSubset ?? 0;
        const taggedByteLength = result.bytes.length;

        const pdfjs = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
        try { pdfjs.GlobalWorkerOptions.workerSrc = workerUrl; } catch (_) {}
        const inkOf = async (bytes: any) => {
          const doc = await pdfjs.getDocument({ data: bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes) }).promise;
          const p1 = await doc.getPage(1);
          const vp = p1.getViewport({ scale: 1.5 });
          const c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height;
          const ctx = c.getContext('2d')!;
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
          await p1.render({ canvasContext: ctx, viewport: vp }).promise;
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          let ink = 0;
          for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            if (lum < 240) ink++;
          }
          try { doc.destroy(); } catch (_) {}
          return ink;
        };
        const sourceInk = await inkOf(inputBytes);
        const taggedInk = await inkOf(result.bytes);
        return { ok: true, sourceInk, taggedInk, fontsRepaired, fontsSubset, taggedByteLength, ratio: sourceInk > 0 ? taggedInk / sourceInk : 0 };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    }, PDFJS_WORKER);

    expect((out as any).error, 'evaluate error').toBeUndefined();
    expect(out.fontsRepaired, 'Stage 7 must have run (the fixture uses non-embedded Helvetica)').toBeGreaterThanOrEqual(1);
    // Subsetting must have actually RUN — a silent per-font fallback to the
    // full TTF would make every other assertion pass while shipping 5× the
    // bytes. (Full Liberation Sans ≈ 350 KB; the WinAnsi subset ≈ 40-90 KB.)
    expect(out.fontsSubset, 'the WinAnsi subset path must be taken, not the full-font fallback').toBeGreaterThanOrEqual(1);
    expect(out.taggedByteLength, 'subset output should stay well under a full-font embed (bytes: ' + out.taggedByteLength + ')').toBeLessThan(220000);
    expect(out.sourceInk, 'source page must render visible text (harness sanity)').toBeGreaterThan(2000);
    // The catastrophe bound: invisible text / blank page would crater this.
    expect(out.taggedInk, 'tagged page must not lose its ink (invisible-text class) — ratio: ' + out.ratio.toFixed(3)).toBeGreaterThan(out.sourceInk * 0.6);
    // The runaway bound: doubled/garbled content would balloon it.
    expect(out.taggedInk, 'tagged page must not balloon (doubled-content class) — ratio: ' + out.ratio.toFixed(3)).toBeLessThan(out.sourceInk * 1.6);
  });
});
