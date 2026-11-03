import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const factories = {};
beforeAll(() => {
  new Function(readFileSync('ui_font_library_module.js', 'utf8'))();
  for (const [name, file] of [['source', 'export_source.jsx'], ['runtime', 'export_module.js']]) {
    delete window.AlloModules.Export;
    new Function(readFileSync(file, 'utf8'))();
    factories[name] = window.AlloModules.createExport;
  }
});
afterEach(() => {
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  delete window.__alloReadingSettings;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const row = { term: 'Leaf', termLanguage: 'English', def: 'A plant part.', translations: { Arabic: 'ورقة: جزء من النبات.', French: 'Feuille: Partie de la plante.' } };
const labels = {
  en: { 'flashcards.set_header': 'Study Set', 'flashcards.print_title_language': 'Language Study Flashcards', 'flashcards.print_title_standard': 'Flashcard Generator' },
  ar: { 'flashcards.set_header': 'مجموعة دراسية', 'flashcards.print_title_language': 'بطاقات لغة', 'flashcards.print_title_standard': 'بطاقات دراسية' },
};
async function generate(lane, metadata, { locale = 'en', mode = 'standard', enlarged = false } = {}) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  if (enlarged) window.__alloReadingSettings = { get: () => ({ fontId: 'default', baseFontSize: 32, lineHeight: 1.8, letterSpacing: 0.04 }), set() {} };
  let html;
  vi.stubGlobal('Blob', class { constructor(parts) { html = parts.join(''); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:deck-identity');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const resource = { type: 'glossary', data: [row], ...metadata };
  const saved = JSON.stringify(resource);
  const api = factories[lane]({ liveRef: { current: { generatedContent: resource, t: key => labels[locale][key] || key } }, escapeXml });
  await api.handleExportFlashcards(mode, { includeAudio: false, useReadingSettings: enlarged });
  expect(JSON.stringify(resource)).toBe(saved);
  return { html, doc: new DOMParser().parseFromString(html, 'text/html') };
}

describe.each(['source', 'runtime'])('printable glossary deck identity (%s)', lane => {
  it.each(['standard', 'language'])('repeats the escaped authored Arabic title in every %s set and its browser tab', async mode => {
    const authored = 'دليل النباتات <ورقة> & </title><img src=x>';
    const { doc } = await generate(lane, { title: authored, titleLanguage: 'Arabic' }, { mode });
    expect(doc.title).toBe(authored);
    expect(doc.querySelectorAll('title')).toHaveLength(1);
    expect(doc.querySelector('img, ورقة')).toBeNull();
    const names = new Intl.DisplayNames(['en'], { type: 'language', languageDisplay: 'standard' });
    const headers = [...doc.querySelectorAll('h2.set-header')];
    expect(headers).toHaveLength(2);
    headers.forEach((header, index) => {
      const title = header.querySelector('bdi.set-title');
      expect([title.textContent, title.lang, title.dir]).toEqual([authored, 'ar', 'rtl']);
      const caption = header.querySelector('.set-caption');
      const target = names.of(index === 0 ? 'ar' : 'fr');
      expect(caption.textContent).toBe((mode === 'language' ? names.of('en') + ' ⟷ ' : '') + target + ' Study Set');
      expect(caption.closest('[lang]').lang).toBe('en');
    });
    expect([doc.querySelector('title').lang, doc.querySelector('title').dir]).toEqual(['ar', 'rtl']);
  });

  it('keeps an English authored title distinct from Arabic set captions', async () => {
    const { doc } = await generate(lane, { title: 'Plant science', titleLanguage: 'en_GB' }, { locale: 'ar' });
    const title = doc.querySelector('.set-title'), caption = doc.querySelector('.set-caption');
    expect([title.lang, title.dir, title.textContent]).toEqual(['en-GB', 'ltr', 'Plant science']);
    expect(caption.textContent).toContain(labels.ar['flashcards.set_header']);
    expect(caption.closest('[lang]').lang).toBe('ar');
  });

  it.each([undefined, 'Uncatalogued language'])('uses automatic direction without guessing the title language from the interface or source rows (%s)', async titleLanguage => {
    const { doc } = await generate(lane, { title: '2026 – دليل علوم', language: 'French', baseLanguage: 'Greek', titleLanguage }, { locale: 'ar' });
    for (const el of [doc.querySelector('title'), doc.querySelector('.set-title')]) {
      expect([el.getAttribute('lang'), el.dir]).toEqual(['', 'auto']);
    }
  });

  it.each([undefined, ' \n\t ', '\u0001', { text: 'Unsupported' }])('preserves the original fallback for an unusable title (%j)', async title => {
    const { doc } = await generate(lane, { title });
    expect(doc.title).toMatch(/^Flashcard Generator - .+/);
    expect(doc.querySelector('.set-title, .set-caption')).toBeNull();
    expect([...doc.querySelectorAll('.set-header')].map(el => el.textContent)).toEqual(['Arabic Study Set', 'French Study Set']);
  });
});

it('keeps the authored title and language caption visible, separate and wrapped in mobile screen and print layouts', async () => {
  const { html } = await generate('source', { title: '٢٠٢٦ – علمالنباتوالتغيراتالموسمية في المدرسة', baseLanguage: 'English' }, { enlarged: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
    await page.setContent(html);
    const header = page.locator('.set-header').first();
    for (const media of ['screen', 'print']) {
      await page.emulateMedia({ media });
      const geometry = await header.evaluate(h => {
        const title = h.querySelector('.set-title'), caption = h.querySelector('.set-caption');
        const a = title.getBoundingClientRect(), b = caption.getBoundingClientRect();
        return { fits: h.scrollWidth <= h.clientWidth + 1 && title.scrollWidth <= title.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
          direction: getComputedStyle(title).direction, captionDirection: getComputedStyle(caption).direction,
          titleLines: a.height / parseFloat(getComputedStyle(title).lineHeight), separate: a.bottom <= b.top, visible: a.height > 0 && b.height > 0 };
      });
      expect(geometry).toMatchObject({ fits: true, direction: 'rtl', captionDirection: 'ltr', separate: true, visible: true });
      expect(geometry.titleLines).toBeGreaterThan(1);
    }
    if (process.env.GLOSSARY_DECK_TITLE_SCREENSHOT) await header.screenshot({ path: process.env.GLOSSARY_DECK_TITLE_SCREENSHOT });
  } finally { await browser.close(); }
}, 45_000);
