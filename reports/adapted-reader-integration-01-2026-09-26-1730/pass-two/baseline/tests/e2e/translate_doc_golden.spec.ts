// Document-translation golden (2026-06-12): translateAccessibleHtml must
// (1) accept a structure-preserving translation (tag-sequence parity),
// (2) REJECT a structure-mangling response and keep the original text for
// that chunk — counted, never silent, (3) set lang/dir metadata (RTL),
// (4) carry image data-URLs through untouched, (5) prepend the honesty
// banner. Deterministic: callGemini is mocked.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let r: any = null;

test.describe('translateAccessibleHtml — structure-verified document translation', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: PIPELINE_PATH });

    r = await page.evaluate(async () => {
      try {
        const IMG = 'data:image/png;base64,' + 'A'.repeat(200);
        const HTML = '<!DOCTYPE html><html lang="en"><head><title>Lesson</title></head><body><main>'
          + '<h1>Photosynthesis</h1>'
          + '<p>Plants convert light into energy.</p>'
          + '<figure><img src="' + IMG + '" alt="A leaf diagram"><figcaption>Leaf</figcaption></figure>'
          + '</main></body></html>';

        // Mock 1: faithful translator — swaps text, keeps structure.
        let calls = 0;
        const goodGemini = async (prompt: string) => {
          calls++;
          const m = prompt.match(/"""\n([\s\S]*?)\n"""/);
          let chunk = m ? m[1] : '';
          return chunk
            .replace(/Photosynthesis/g, 'Fotosíntesis')
            .replace(/Plants convert light into energy\./g, 'Las plantas convierten la luz en energía.')
            .replace(/alt="A leaf diagram"/g, 'alt="Un diagrama de hoja"')
            .replace(/<figcaption>Leaf<\/figcaption>/g, '<figcaption>Hoja</figcaption>')
            .replace(/<title>Lesson<\/title>/g, '<title>Lección</title>');
        };
        const p1 = (window as any).AlloModules.createDocPipeline({
          callGemini: goodGemini, callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: (l: string) => /arabic|hebrew|urdu|farsi|dari|pashto/i.test(l || ''), updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const good = await p1.translateAccessibleHtml(HTML, 'Spanish', { langCode: 'es' });

        // Mock 2: structure-mangler — drops the figure entirely.
        const badGemini = async (prompt: string) => {
          const m = prompt.match(/"""\n([\s\S]*?)\n"""/);
          return (m ? m[1] : '').replace(/<figure>[\s\S]*?<\/figure>/g, 'IMAGEN ELIMINADA');
        };
        const p2 = (window as any).AlloModules.createDocPipeline({
          callGemini: badGemini, callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const bad = await p2.translateAccessibleHtml(HTML, 'Spanish', { langCode: 'es' });

        // Mock 3: RTL metadata.
        const p3 = (window as any).AlloModules.createDocPipeline({
          callGemini: goodGemini, callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: (l: string) => /arabic/i.test(l || ''), updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const rtl = await p3.translateAccessibleHtml(HTML, 'Arabic', { langCode: 'ar' });

        return {
          good: { html: good.html, failed: good.chunksFailed, total: good.chunksTotal },
          bad: { html: bad.html, failed: bad.chunksFailed },
          rtl: { html: rtl.html.slice(0, 400), rtlFlag: rtl.rtl },
          imgOk: good.html.includes(IMG),
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('faithful translation accepted: text + alt translated, structure intact, zero failures', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
    expect(r.good.failed).toBe(0);
    expect(r.good.html).toContain('Fotosíntesis');
    expect(r.good.html).toContain('Las plantas convierten la luz en energía.');
    expect(r.good.html).toContain('alt="Un diagrama de hoja"');
    expect(r.good.html).toContain('lang="es"');
  });

  test('image data-URLs ride through untouched', () => {
    expect(r.imgOk).toBeTruthy();
  });

  test('honesty banner prepended inside main', () => {
    expect(r.good.html).toContain('data-allo-translation-note');
    expect(r.good.html).toMatch(/AI-translated to Spanish/);
  });

  test('structure-mangling response REJECTED: original text kept, failure counted', () => {
    expect(r.bad.failed).toBeGreaterThan(0);
    expect(r.bad.html).toContain('<figure>');
    expect(r.bad.html).toContain('Photosynthesis');
    expect(r.bad.html).not.toContain('IMAGEN ELIMINADA');
  });

  test('RTL target gets dir="rtl"', () => {
    expect(r.rtl.rtlFlag).toBeTruthy();
    expect(r.rtl.html).toContain('dir="rtl"');
  });
});
