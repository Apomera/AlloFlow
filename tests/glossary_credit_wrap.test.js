import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const factories = {};
let browser;
beforeAll(async () => {
  new Function(readFileSync('ui_font_library_module.js', 'utf8'))();
  for (const [lane, file] of [['source', process.env.ALLO_CREDIT_SOURCE || 'export_source.jsx'], ['runtime', 'export_module.js']]) {
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const labels = {
  en: { 'flashcards.print_title_standard': 'Study cards', 'flashcards.print_instructions': 'Print and fold the cards.', 'flashcards.set_header': 'Study set', 'flashcards.fold_guide': 'Fold here', 'flashcards.credit_license': 'License', 'flashcards.credit_source': 'Source', 'flashcards.picture_credits': 'Picture credits', 'common.print': 'Print' },
  ar: { 'flashcards.print_title_standard': 'بطاقات دراسية', 'flashcards.print_instructions': 'اطبع البطاقات واطوها.', 'flashcards.set_header': 'مجموعة دراسية', 'flashcards.fold_guide': 'اطوِ هنا', 'flashcards.credit_license': 'الترخيص', 'flashcards.credit_source': 'المصدر', 'flashcards.picture_credits': 'مصادر الصور', 'common.print': 'طباعة' },
};
const credit = { set: 'Community images / صور', author: 'Lina & نور <photographer>', license: 'CC BY 4.0', modified: true,
  url: 'https://images.example.org/art/' + 'A'.repeat(400) + '?collection=plants&language=ar',
  licenseUrl: 'https://images.example.org/licenses/' + 'B'.repeat(120) };
const picture = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="green"/></svg>');

async function exportCredits(lane, locale, size) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  if (size) window.__alloReadingSettings = { get: () => ({ fontId: 'default', baseFontSize: size, lineHeight: 1.8, letterSpacing: 0.04 }), set() {} };
  let html;
  vi.stubGlobal('Blob', class { constructor(parts) { html = parts.join(''); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credit-wrap');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const resource = { type: 'glossary', data: ['Leaf', 'Plant'].map(term => ({ term, termLanguage: 'English', def: 'Part of nature.', definitionLanguage: 'English', image: picture, imageAttribution: credit })) };
  const saved = JSON.stringify(resource);
  const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const api = factories[lane]({ liveRef: { current: { generatedContent: resource, t: key => labels[locale][key] || '' } }, escapeXml });
  await api.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: !!size });
  expect(JSON.stringify(resource)).toBe(saved);
  return html;
}

describe.each(['source', 'runtime'])('standalone glossary credit wrapping (%s)', lane => {
  it.each([['en', 0], ['ar', 0], ['en', 32], ['ar', 32]])('retains complete credits within %s mobile and print pages at size %i', async (locale, size) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    try {
      await page.setContent(await exportCredits(lane, locale, size));
      const credits = page.locator('.picture-credits');
      expect(await credits.locator('li').count()).toBe(1);
      expect(await credits.locator('photographer').count()).toBe(0);
      const text = await credits.locator('li').textContent();
      for (const value of [credit.set, credit.author, credit.license, credit.url, credit.licenseUrl]) expect(text).toContain(value);
      expect(await page.locator('.card-picture figcaption').count()).toBe(2);

      for (const [media, width] of [['screen', 320], ['print', 794]]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ media });
        const geometry = await credits.evaluate(el => {
          const list = el.querySelector('ul'), entry = el.querySelector('li'), box = el.getBoundingClientRect(), line = entry.getBoundingClientRect();
          const style = getComputedStyle(entry), range = document.createRange();
          range.selectNodeContents(entry);
          return { width: el.clientWidth, contentWidth: el.scrollWidth,
            fragmentsFit: [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1),
            fontSize: parseFloat(style.fontSize), direction: style.direction, alignment: style.textAlign,
            leftInset: line.left - list.getBoundingClientRect().left, rightInset: list.getBoundingClientRect().right - line.right,
            listStyle: getComputedStyle(list).listStyleType, text: entry.textContent };
        });
        expect(geometry.contentWidth, JSON.stringify({ media, ...geometry })).toBeLessThanOrEqual(geometry.width + 1);
        expect(geometry.fragmentsFit).toBe(true);
        expect(geometry.fontSize).toBe(size || 16);
        expect(geometry.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
        expect(geometry.alignment).toBe('start');
        expect(geometry.listStyle).toBe('disc');
        expect(locale === 'ar' ? geometry.rightInset : geometry.leftInset).toBeGreaterThan(geometry.fontSize);
        expect(locale === 'ar' ? geometry.leftInset : geometry.rightInset).toBeLessThan(1);
        expect(geometry.text).toBe(text);
        if (process.env.GLOSSARY_CREDIT_SCREENSHOT_DIR && lane === 'source' && ((locale === 'ar' && size === 32 && media === 'screen') || (locale === 'en' && !size && media === 'print'))) {
          await credits.screenshot({ path: join(process.env.GLOSSARY_CREDIT_SCREENSHOT_DIR, `credits-${locale}-${size || 16}-${media}.png`) });
        }
      }
    } finally { await page.close(); }
  }, 45_000);
});
