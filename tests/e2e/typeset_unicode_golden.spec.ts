// Typeset unicode golden (2026-06-11): createTypesetTaggedPdf embeds Noto
// fonts for scripts that render honestly without a shaping engine (CJK,
// Greek/Cyrillic, extended Latin, Ethiopic) and WARNS — instead of shipping
// broken glyph soup — for scripts that need shaping/bidi (Arabic, Indic…).
// Pins: (1) Korean → NotoSansKR embedded, real chars survive, declaration
// still evidence-gated; (2) Cyrillic → NotoSans via notofonts TTF;
// (3) Arabic → unicodeTypesetWarning with needs-shaping-engine, Latin
// content preserved, no throw; (4) pure-Latin path unchanged (no font
// fetch, no summary fields). Network: fetches fonts from jsDelivr like the
// pipeline itself does for pdf-lib/fontkit.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let r: any = null;

test.describe('Typeset unicode — Noto fallback for non-Latin scripts', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300000);
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: PIPELINE_PATH });

    r = await page.evaluate(async () => {
      try {
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const mk = (title: string, body: string) =>
          '<!DOCTYPE html><html lang="en"><head><title>' + title + '</title></head><body><main>' + body + '</main></body></html>';

        const korean = await pipeline.createTypesetTaggedPdf(
          { accessibleHtml: mk('한국어 시험', '<h1>광합성 수업</h1><p>식물은 빛을 화학 에너지로 바꿉니다. 이 과정은 엽록체에서 일어나며 모든 녹색 세포에 존재합니다.</p><p>오늘은 명반응과 캘빈 회로를 다룹니다.</p>') },
          { title: 'Korean Lesson', lang: 'ko' });

        const cyrillic = await pipeline.createTypesetTaggedPdf(
          { accessibleHtml: mk('Урок', '<h1>Фотосинтез</h1><p>Растения превращают свет в химическую энергию. Этот процесс происходит в хлоропластах каждой зелёной клетки.</p>') },
          { title: 'Russian Lesson', lang: 'ru' });

        const arabic = await pipeline.createTypesetTaggedPdf(
          { accessibleHtml: mk('Lesson', '<h1>Photosynthesis درس</h1><p>النباتات تحول الضوء إلى طاقة كيميائية</p><p>Plants convert light into chemical energy.</p>') },
          { title: 'Arabic Lesson', lang: 'ar' });

        const latin = await pipeline.createTypesetTaggedPdf(
          { accessibleHtml: mk('Lesson', '<h1>Photosynthesis</h1><p>Plants convert light into chemical energy in their chloroplasts.</p>') },
          { title: 'Latin Lesson', lang: 'en' });

        const pick = (x: any) => x && x.bytes ? {
          bytes: x.bytes.length,
          uaDeclared: !!(x.summary || {}).uaDeclared,
          orphans: (x.summary || {}).orphanedLeaves,
          roundTripOk: !(x.roundTrip && x.roundTrip.ok === false),
          font: (x.summary || {}).typesetFont || null,
          warning: (x.summary || {}).unicodeTypesetWarning || null,
        } : null;
        return { korean: pick(korean), cyrillic: pick(cyrillic), arabic: pick(arabic), latin: pick(latin) };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('Korean: NotoSansKR embedded, declaration evidence-gated, no orphans', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
    expect(r.korean).toBeTruthy();
    expect(r.korean.font, 'Korean must embed a CJK font').toBeTruthy();
    expect(r.korean.font.script).toBe('korean');
    expect(r.korean.font.family).toBe('NotoSansKR');
    expect(r.korean.warning).toBeNull();
    expect(r.korean.roundTripOk).toBeTruthy();
    expect(r.korean.orphans).toBe(0);
    expect(r.korean.uaDeclared).toBeTruthy();
    // CJK font embedded+subset: the PDF must be meaningfully larger than a
    // Helvetica-only doc but far below the full ~5MB fetch.
    expect(r.korean.bytes).toBeGreaterThan(8000);
    expect(r.korean.bytes).toBeLessThan(2000000);
  });

  test('Cyrillic: NotoSans via notofonts, real characters kept', () => {
    expect(r.cyrillic && r.cyrillic.font, 'Cyrillic must embed NotoSans').toBeTruthy();
    expect(r.cyrillic.font.script).toBe('latinplus');
    expect(r.cyrillic.warning).toBeNull();
    expect(r.cyrillic.roundTripOk).toBeTruthy();
    expect(r.cyrillic.uaDeclared).toBeTruthy();
  });

  test('Arabic: honest warning instead of broken glyphs; Latin content survives', () => {
    expect(r.arabic).toBeTruthy();
    expect(r.arabic.warning, 'Arabic must warn, not silently drop').toBeTruthy();
    expect(r.arabic.warning.reason).toBe('needs-shaping-engine');
    expect(r.arabic.warning.script).toBe('arabic');
    expect(r.arabic.font).toBeNull();
    expect(r.arabic.roundTripOk, 'PDF still produced with the Latin content').toBeTruthy();
  });

  test('pure Latin: untouched fast path — no font fetch, no new summary fields', () => {
    expect(r.latin).toBeTruthy();
    expect(r.latin.font).toBeNull();
    expect(r.latin.warning).toBeNull();
    expect(r.latin.uaDeclared).toBeTruthy();
    expect(r.latin.orphans).toBe(0);
  });
});
