// Golden master for the accessible PowerPoint export (2026-06-09).
//
// Runs the REAL shipped helpers (_htmlToDocxSpec → _docxSpecToSlides →
// _buildPptxBlobFromSlides, runtime-extracted from view_pdf_audit_source.jsx)
// Also: the office media-preservation sentinel — a real PPTX built with an
// embedded image + alt round-trips through extractPptxTextDeterministic and
// comes back with the image bytes (data URL) and the authored alt attached.
// against the real pptxgenjs bundle in Chromium, then unzips the produced
// .pptx and asserts the accessibility properties actually land in the OOXML:
// slide titles, image alt text (descr), table markup, real bullet lists.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../../view_pdf_audit_source.jsx'), 'utf8');
const cut = (startMarker: string, endMarker: string) => {
  const s = SRC.indexOf(startMarker);
  const e = SRC.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error('extraction markers missing: ' + startMarker);
  return SRC.slice(s, e);
};
const HELPERS =
  cut('function _htmlToDocxSpec(html) {', '// end _htmlToDocxSpec') + '\n' +
  cut('function _docxSpecToSlides(spec) {', '// end _docxSpecToSlides') + '\n' +
  // Start at the theme block so _PPTX_THEMES/_sanitizePptxTheme/_pptxContrast
  // come along with the builder (its signature now takes an optional theme).
  cut('// ── Accessible PPTX themes ──', '\n// Merge multiple TTS audio Blobs');

const FIXTURE_HTML = `<!DOCTYPE html><html lang="en"><head><title>Deck Fixture</title></head><body><main>
<h1>Photosynthesis Basics</h1>
<p>Plants convert light energy into chemical energy.</p>
<ul><li>Sunlight</li><li>Water<ul><li>From roots</li></ul></li></ul>
<h2>Data Summary</h2>
<table><tr><th>Input</th><th>Output</th></tr><tr><td>CO2</td><td>O2</td></tr></table>
<figure><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="Leaf cross-section diagram"><figcaption>Figure 1</figcaption></figure>
</main></body></html>`;

let deckSummary: any = null;
test.describe('accessible PowerPoint export — golden', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js' });
    await page.waitForFunction(() => !!(window as any).PptxGenJS, null, { timeout: 30000 });
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' });
    await page.waitForFunction(() => !!(window as any).JSZip, null, { timeout: 30000 });

    deckSummary = await page.evaluate(async ({ helpers, html }) => {
      try {
        const fns = new Function(helpers + '; return { _htmlToDocxSpec, _docxSpecToSlides, _buildPptxBlobFromSlides };')();
        const deck = fns._docxSpecToSlides(fns._htmlToDocxSpec(html));
        const blob = await fns._buildPptxBlobFromSlides(deck, (window as any).PptxGenJS);
        const buf = new Uint8Array(await blob.arrayBuffer());
        const zip = await (window as any).JSZip.loadAsync(buf);
        const names = Object.keys(zip.files);
        const slideNames = names.filter((n: string) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
        const xmls: string[] = [];
        for (const n of slideNames) xmls.push(await zip.file(n).async('string'));
        const all = xmls.join('\n');
        return {
          counts: deck.counts,
          pk: buf[0] === 0x50 && buf[1] === 0x4b,
          slideCount: slideNames.length,
          title1: xmls[0] ? xmls[0].indexOf('Photosynthesis Basics') !== -1 : false,
          title2: xmls[1] ? xmls[1].indexOf('Data Summary') !== -1 : false,
          altInXml: all.indexOf('Leaf cross-section diagram') !== -1,
          tableInXml: all.indexOf('<a:tbl>') !== -1,
          bulletInXml: all.indexOf('<a:buChar') !== -1 || all.indexOf('<a:buAutoNum') !== -1,
          bodyText: all.indexOf('Plants convert light energy') !== -1,
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    }, { helpers: HELPERS, html: FIXTURE_HTML });
  });

  test('deck builds: real PK bytes, one slide per h1/h2 section', () => {
    expect(deckSummary && !deckSummary.error, 'evaluate error: ' + (deckSummary && deckSummary.error)).toBeTruthy();
    expect(deckSummary.pk).toBe(true);
    expect(deckSummary.slideCount).toBe(2);
    expect(deckSummary.counts.titled).toBe(2);
  });

  test('slide titles land in the slide XML (the #1 PPT a11y-checker item)', () => {
    expect(deckSummary.title1).toBe(true);
    expect(deckSummary.title2).toBe(true);
  });

  test('image alt text lands in the OOXML (descr); tables and bullets are real', () => {
    expect(deckSummary.altInXml, 'altText must serialize into slide XML').toBe(true);
    expect(deckSummary.tableInXml, 'table must be a real <a:tbl>, not text').toBe(true);
    expect(deckSummary.bulletInXml, 'bullets must be real list formatting').toBe(true);
    expect(deckSummary.bodyText).toBe(true);
  });

  test('media preservation: a PPTX with an embedded image round-trips through the deterministic extractor with bytes + alt', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('about:blank');
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js' });
    await page.addScriptTag({ path: path.resolve(__dirname, '../../doc_pipeline_module.js') });
    const out = await page.evaluate(async () => {
      try {
        const P = (window as any).PptxGenJS;
        const p = new P();
        const s = p.addSlide();
        s.addText('Slide with an embedded image', { x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 24 });
        const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        s.addImage({ data: 'image/png;base64,' + PNG, x: 0.5, y: 1.5, w: 2, h: 2, altText: 'A red square used to test media preservation' });
        const blob: Blob = await p.write({ outputType: 'blob' });
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bs = '';
        for (let i = 0; i < buf.length; i += 0x8000) bs += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 0x8000)));
        const b64 = btoa(bs);
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const det = await pipeline.extractPptxTextDeterministic(b64);
        const media = (det && det.mediaImages) || [];
        return {
          ok: true,
          count: media.length,
          first: media[0] ? { hasDataUrl: !!(media[0].src && media[0].src.indexOf('data:image/') === 0), alt: media[0].alt || '', slideNum: media[0].slideNum } : null,
        };
      } catch (e: any) { return { ok: false, msg: String(e && (e.message || e)).slice(0, 300) }; }
    });
    expect(out.ok, 'evaluate error: ' + (out as any).msg).toBe(true);
    expect(out.count, 'extractor must collect the embedded image').toBeGreaterThanOrEqual(1);
    expect(out.first!.hasDataUrl, 'image must come back as a data URL').toBe(true);
    expect(out.first!.alt).toContain('red square');
    expect(out.first!.slideNum, 'image must attribute to its slide').toBe(1);
  });
});
