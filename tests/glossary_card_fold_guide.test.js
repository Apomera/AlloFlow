import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const factories = {};
let browser;
beforeAll(async () => {
  new Function(readFileSync('ui_font_library_module.js', 'utf8'))();
  for (const [lane, file] of [['source', 'export_source.jsx'], ['runtime', 'export_module.js']]) {
    delete window.AlloModules.Export;
    new Function(readFileSync(file, 'utf8'))();
    factories[lane] = window.AlloModules.createExport;
  }
  browser = await chromium.launch({ headless: true });
}, 60_000);
afterAll(async () => { await browser?.close(); });
afterEach(() => {
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  delete window.__alloReadingSettings;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const picture = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="70" viewBox="0 0 120 70"><path d="M10 58Q16 8 106 8Q98 58 10 58" fill="#328453"/></svg>');
const row = { term: 'ورقة', termLanguage: 'Arabic', def: 'The part of a plant that catches sunlight.', definitionLanguage: 'English',
  image: picture, imageAlt: 'A green leaf', translations: { French: 'Feuille: Une partie de la plante.' } };
async function exportPage(lane, locale, size, mode = 'standard', useReader = true) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  window.__alloReadingSettings = { get: () => ({ fontId: 'default', baseFontSize: size, lineHeight: 1.8, letterSpacing: 0.04 }), set() {} };
  let html;
  vi.stubGlobal('Blob', class { constructor(parts) { html = parts.join(''); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fold-guide');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const labels = { 'flashcards.fold_guide': locale === 'ar' ? 'اطوِ البطاقة هنا' : 'Fold here', 'flashcards.set_header': 'Study set' };
  const api = factories[lane]({ liveRef: { current: { generatedContent: { type: 'glossary', title: 'Plant words', data: [row] }, t: key => labels[key] || key } }, escapeXml: String });
  await api.handleExportFlashcards(mode, { useReadingSettings: useReader, includeAudio: false });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 }, reducedMotion: 'reduce' });
  await page.setContent(html);
  return page;
}

describe.each(['source', 'runtime'])('standalone glossary fold guides (%s)', lane => {
  it.each([['en', 16], ['ar', 16], ['en', 32], ['ar', 32]])('positions the printed marker at the actual fold for %s at %ipx', async (locale, size) => {
    const page = await exportPage(lane, locale, size);
    try {
      await page.emulateMedia({ media: 'print' });
      const card = page.locator('.card-container').first();
      const measured = await card.evaluate(el => {
        const front = el.querySelector('.front').getBoundingClientRect(), back = el.querySelector('.back').getBoundingClientRect();
        const marker = el.querySelector('.cut-guide'), label = marker.querySelector('span').getBoundingClientRect(), box = el.getBoundingClientRect();
        return { front: front.toJSON(), back: back.toJSON(), label: label.toJSON(), card: box.toJSON(),
          line: getComputedStyle(marker, '::before').borderBlockStartStyle, fits: el.scrollWidth <= el.clientWidth + 1,
          retained: !!el.querySelector('.front img') && el.querySelector('.primary-text').lang === 'ar' && !!el.previousElementSibling.querySelector('.set-title') };
      });
      const { front, back, label } = measured;
      expect(measured.fits && measured.retained).toBe(true);
      expect(label.width).toBeGreaterThan(0);
      if (size < 24) {
        const seam = locale === 'ar' ? front.left : front.right;
        expect(Math.abs(label.x + label.width / 2 - seam)).toBeLessThan(2);
        expect(label.bottom).toBeLessThanOrEqual(Math.min(front.top, back.top) + 1);
      } else {
        expect(measured.line).toBe('dashed');
        expect(front.bottom).toBeLessThanOrEqual(label.top + 1);
        expect(label.bottom).toBeLessThanOrEqual(back.top + 1);
        const markerCenter = label.top + label.height / 2;
        expect(Math.abs(markerCenter - (front.bottom + back.top) / 2)).toBeLessThan(2);
        expect(Math.abs(markerCenter - (measured.card.top + measured.card.height / 2))).toBeLessThan(2);
      }
      if (process.env.GLOSSARY_FOLD_SCREENSHOT_DIR && ((locale === 'en' && size === 16) || (locale === 'ar' && size === 32))) {
        await card.screenshot({ path: join(process.env.GLOSSARY_FOLD_SCREENSHOT_DIR, `print-fold-${locale}-${size}.png`) });
      }
      // The same downloaded file omits the print instruction on a narrow screen.
      await page.emulateMedia({ media: 'screen' });
      await page.setViewportSize({ width: 320, height: 800 });
      expect(await card.locator('.cut-guide').isVisible()).toBe(false);
      expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    } finally { await page.close(); }
  }, 45_000);

  it('keeps the default print marker on the vertical seam and omits it from language decks', async () => {
    const standard = await exportPage(lane, 'ar', 16, 'standard', false);
    try {
      await standard.emulateMedia({ media: 'print' });
      const delta = await standard.locator('.card-container').evaluate(el => {
        const label = el.querySelector('.cut-guide').getBoundingClientRect(), front = el.querySelector('.front').getBoundingClientRect();
        return label.left + label.width / 2 - front.left;
      });
      expect(Math.abs(delta)).toBeLessThan(2);
    } finally { await standard.close(); }
    const language = await exportPage(lane, 'ar', 32, 'language');
    try { expect(await language.locator('.cut-guide').count()).toBe(0); } finally { await language.close(); }
  });
});
