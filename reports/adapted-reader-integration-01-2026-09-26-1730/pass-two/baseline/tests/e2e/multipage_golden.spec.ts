// Multi-page golden: Stage 4b's block stream is built ACROSS pages by design
// ("a paragraph may span a page boundary, and /K happily holds MCRs from
// different pages") — but every fixture was single-page, so the claim was
// untested. Real teacher PDFs are 5–30 pages. This golden draws one
// paragraph's two lines on TWO DIFFERENT pages, remediates it as ONE <p>,
// and asserts the leaf carries MCRs pointing at BOTH pages — plus the
// declaration still clears on a multi-page document.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

test.describe('createTaggedPdf — multi-page per-leaf linking', () => {
  test('a paragraph spanning a page boundary links with MCRs on BOTH pages; declaration earned', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: MODULE_PATH });

    const out = await page.evaluate(async () => {
      try {
        const PDFLib = (window as any).PDFLib;
        const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef } = PDFLib;
        const HEAD = 'Multi Page Heading Example';
        const L1 = 'This long paragraph begins on the first page of the document';
        const L2 = 'and finishes on the second page after the break.';
        const TAIL = 'A closing paragraph that lives entirely on page two.';
        const inDoc = await PDFDocument.create();
        const font = await inDoc.embedFont(StandardFonts.Helvetica);
        const p1 = inDoc.addPage([612, 792]);
        p1.drawText(HEAD, { x: 50, y: 740, size: 22, font });
        p1.drawText(L1, { x: 50, y: 60, size: 12, font }); // bottom of page 1
        const p2 = inDoc.addPage([612, 792]);
        p2.drawText(L2, { x: 50, y: 740, size: 12, font }); // top of page 2
        p2.drawText(TAIL, { x: 50, y: 700, size: 12, font });
        const inputBytes = await inDoc.save();

        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const html = '<!DOCTYPE html><html lang="en"><head><title>MP</title></head><body><main>'
          + '<h1>' + HEAD + '</h1><p>' + L1 + ' ' + L2 + '</p><p>' + TAIL + '</p></main></body></html>';
        const result = await pipeline.createTaggedPdf(inputBytes, { accessibleHtml: html }, { title: 'MP', lang: 'en' });
        if (!result || !result.bytes) return { error: 'no bytes' };

        const outDoc = await PDFDocument.load(result.bytes);
        const ctx = outDoc.context;
        const nm = (n: string) => PDFName.of(n);
        const resolve = (o: any) => (o instanceof PDFRef ? ctx.lookup(o) : o);
        // Find the spanning-P leaf and collect its MCR /Pg object numbers.
        let spanPgNums: number[] = [];
        let spanMcrCount = 0;
        const walk = (objIn: any, depth: number) => {
          const obj = resolve(objIn);
          if (depth > 60 || obj == null) return;
          if (obj instanceof PDFArray) { for (let i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1); return; }
          if (!(obj instanceof PDFDict)) return;
          const S = obj.get(nm('S'));
          if (S && String(S) === '/P') {
            const at = obj.get(nm('ActualText'));
            const atText = at && (at as any).decodeText ? (at as any).decodeText() : String(at || '');
            if (atText.indexOf('begins on the first page') !== -1) {
              const K = resolve(obj.get(nm('K')));
              const items = (K instanceof PDFArray) ? Array.from({ length: K.size() }, (_, i) => resolve(K.get(i))) : [K];
              for (const it of items) {
                if (it instanceof PDFDict && String(it.get(nm('Type')) || '') === '/MCR') {
                  spanMcrCount++;
                  const pg = it.get(nm('Pg'));
                  if (pg instanceof PDFRef) spanPgNums.push(pg.objectNumber);
                }
              }
            }
          }
          const K2 = obj.get(nm('K'));
          if (K2 != null) walk(K2, depth + 1);
        };
        const stRoot = resolve(outDoc.catalog.get(nm('StructTreeRoot')));
        if (stRoot && stRoot.get) walk(stRoot.get(nm('K')), 0);

        // Declaration from XMP.
        let xmp = '';
        try {
          const metaS: any = resolve(outDoc.catalog.get(nm('Metadata')));
          const contents = metaS && (metaS.contents || (metaS.getContents && metaS.getContents()));
          if (contents) xmp = new TextDecoder('utf-8').decode(contents);
        } catch (_) {}
        return {
          perLeafLinked: (result.summary || {}).perLeafLinked ?? null,
          spanMcrCount,
          distinctPages: Array.from(new Set(spanPgNums)).length,
          hasUaClaim: xmp.indexOf('<pdfuaid:part>1</pdfuaid:part>') !== -1,
          roundTripOk: result.roundTrip ? result.roundTrip.ok !== false : null,
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });

    expect((out as any).error, 'evaluate error').toBeUndefined();
    expect(out.spanMcrCount, 'the spanning paragraph must hold one MCR per drawn line').toBe(2);
    expect(out.distinctPages, 'the two MCRs must point at TWO DIFFERENT pages').toBe(2);
    expect(out.perLeafLinked, 'all three leaves (H1 + spanning P + tail P) linked').toBeGreaterThanOrEqual(3);
    expect(out.hasUaClaim, 'multi-page fully-linked document must earn the declaration').toBe(true);
    expect(out.roundTripOk).toBe(true);
  });
});
