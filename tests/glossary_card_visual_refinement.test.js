import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const factories = {};
beforeAll(() => {
  new Function(readFileSync('ui_font_library_module.js', 'utf8'))();
  for (const [lane, file] of [['source', 'export_source.jsx'], ['runtime', 'export_module.js']]) {
    delete window.AlloModules.Export;
    new Function(readFileSync(file, 'utf8'))();
    factories[lane] = window.AlloModules.createExport;
  }
});
afterEach(() => {
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  delete window.__alloReadingSettings;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const arabicOrigin = 'أصل الكلمة من وصفٍ قديم للنبات.\nيظهر هذا المعنى في اسم الورقة.';
const legacyOrigin = 'An older English explanation.';
const arabicEntry = () => ({ term: 'Leaf', def: 'جزء من النبات.', definitionLanguage: 'ar', etymology: legacyOrigin, etymologyByLang: { English: legacyOrigin, Arabic: arabicOrigin } });
async function exportCards(lane, data, locale = 'en', size = 0) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  if (size) window.__alloReadingSettings = { get: () => ({ fontId: 'default', baseFontSize: size, lineHeight: 2, letterSpacing: 0.04 }), set() {} };
  let html;
  vi.stubGlobal('Blob', class { constructor(parts) { html = parts.join(''); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:origin');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const labels = { 'glossary.etymology_label': locale === 'ar' ? 'أصول الكلمات' : 'Word roots', 'flashcards.fold_guide': 'Fold here', 'flashcards.set_header': 'set' };
  const exporter = factories[lane]({ liveRef: { current: { generatedContent: { type: 'glossary', data }, t: key => labels[key] || key } }, escapeXml });
  await exporter.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: !!size });
  return { html, doc: new DOMParser().parseFromString(html, 'text/html') };
}

describe.each(['source', 'runtime'])('standalone glossary word origins (%s)', lane => {
  it('uses saved definition-language prose, keeping an English heading separate from Arabic content', async () => {
    const row = arabicEntry(), saved = JSON.stringify(row);
    const { doc } = await exportCards(lane, [row]);
    const origin = doc.querySelector('.back .etym-text');
    const heading = origin.querySelector('strong'), passage = origin.querySelector(':scope > span');
    expect(heading.textContent).toContain('Word roots');
    expect(heading.closest('[lang]').lang).toBe('en');
    expect([passage.lang, passage.dir, passage.textContent]).toEqual(['ar', 'rtl', arabicOrigin]);
    expect(origin.textContent).not.toContain(legacyOrigin);
    expect(JSON.stringify(row)).toBe(saved);
  });

  it('prefers an exact saved key, preserves script distinctions and escapes origin text', async () => {
    const prose = 'Latin script <note> & punctuation.';
    const row = { term: 'Word', def: 'salam', definitionLanguage: 'ar-Latn', etymologyByLang: { ar: 'خط عربي', ar_Latn: 'Alias version', 'ar-Latn': prose } };
    const { doc } = await exportCards(lane, [row], 'ar');
    const origin = doc.querySelector('.etym-text');
    const passage = origin.querySelector(':scope > span');
    expect(origin.querySelector('strong').closest('[lang]').lang).toBe('ar');
    expect(origin.querySelector('strong').textContent).toContain('أصول الكلمات');
    expect([passage.lang, passage.dir, passage.textContent]).toEqual(['ar-Latn', 'ltr', prose]);
    expect(origin.querySelector('note')).toBeNull();
  });

  it('preserves legacy prose with its known original language, uses the definition fallback and omits empty origins', async () => {
    const entries = [
      { term: 'One', definitionLanguage: 'French', etymology: arabicOrigin, etymologyByLang: { Arabic: arabicOrigin, 'fr-CA': 'Different regional passage' } },
      { term: 'Two', definitionLanguage: 'French', etymology: 'Une origine ancienne.' },
      { term: 'Three', definitionLanguage: 'Community language', etymologyByLang: { 'Community language': 'A saved local passage.' } },
      { term: 'Four', definitionLanguage: 'French', etymologyByLang: { French: {}, Arabic: 'Unrelated passage.' } },
    ];
    const { doc } = await exportCards(lane, entries);
    const passages = [...doc.querySelectorAll('.etym-text > span')];
    expect(passages.map(p => [p.getAttribute('lang'), p.dir, p.textContent])).toEqual([
      ['ar', 'rtl', arabicOrigin], ['fr', 'ltr', 'Une origine ancienne.'], ['', 'auto', 'A saved local passage.'],
    ]);
    expect(doc.querySelectorAll('.back')[3].querySelector('.etym-text')).toBeNull();
  });
});

it('renders RTL origin lines inside the actual card at mobile width and enlarged reader settings', async () => {
  const { html } = await exportCards('source', [arabicEntry()], 'en', 32);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 }, reducedMotion: 'reduce' });
    await page.setContent(html);
    const origin = page.locator('.etym-text');
    for (const media of ['screen', 'print']) {
      await page.emulateMedia({ media });
      const geometry = await origin.evaluate(el => {
        const heading = el.querySelector('strong'), passage = el.querySelector(':scope > span'), style = getComputedStyle(passage);
        const range = document.createRange();
        range.selectNodeContents(passage);
        const fragments = [...range.getClientRects()];
        const firstLine = fragments.filter(rect => Math.abs(rect.top - fragments[0].top) < 1);
        return { fits: el.scrollWidth <= el.clientWidth + 1, separate: heading.getBoundingClientRect().bottom <= passage.getBoundingClientRect().top,
          direction: style.direction, rightGap: passage.getBoundingClientRect().right - Math.max(...firstLine.map(rect => rect.right)), fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
      });
      expect(geometry.fits && geometry.separate).toBe(true);
      expect(geometry.direction).toBe('rtl');
      expect(Math.abs(geometry.rightGap), JSON.stringify({ media, ...geometry })).toBeLessThan(2);
      expect(geometry.fontSize).toBe(26);
      expect(geometry.lineHeight).toBe(52);
    }
    if (process.env.GLOSSARY_CARD_SCREENSHOT) {
      await page.emulateMedia({ media: 'screen' });
      await page.locator('.back').screenshot({ path: process.env.GLOSSARY_CARD_SCREENSHOT });
    }
  } finally { await browser.close(); }
}, 45_000);
