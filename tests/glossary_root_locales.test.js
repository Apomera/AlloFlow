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

async function exportRoots(lane, roots, { language = 'Spanish', locale = 'ar', size = 0 } = {}) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  if (size) window.__alloReadingSettings = { get: () => ({ fontId: 'default', baseFontSize: size, lineHeight: 1.8, letterSpacing: 0.04 }), set() {} };
  let html;
  vi.stubGlobal('Blob', class { constructor(parts) { html = parts.join(''); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:root-locales');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const resource = { type: 'glossary', title: 'Plant words', data: [{ term: 'conservation', termLanguage: 'English', def: language === 'Arabic' ? 'حماية الطبيعة.' : 'Protection of nature.', definitionLanguage: language, roots }] };
  const labels = { 'flashcards.fold_guide': 'Fold here', 'flashcards.set_header': 'Study set' };
  const api = factories[lane]({ liveRef: { current: { generatedContent: resource, t: key => labels[key] || key } }, escapeXml: String });
  await api.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: !!size });
  return { html, doc: new DOMParser().parseFromString(html, 'text/html') };
}
const part = (chip, selector) => {
  const node = chip.querySelector(selector);
  return [node.textContent, node.getAttribute('lang'), node.dir];
};

describe.each(['source', 'runtime'])('standalone glossary root locales (%s)', lane => {
  it('uses saved Spanish names and meanings independently of the Arabic interface', async () => {
    const roots = [{ root: 'servare', lang: 'Latin', meaning: 'to keep or watch',
      langByLocale: { Spanish: 'latín' }, meaningByLang: { Spanish: 'guardar o vigilar' }, related: ['preserve'] }];
    const saved = JSON.stringify(roots);
    const { doc } = await exportRoots(lane, roots);
    const chip = doc.querySelector('.root-chip');
    expect(part(chip, '.root-form')).toEqual(['servare', 'la', 'ltr']);
    expect(part(chip, '.root-language')).toEqual(['(latín)', 'es', 'ltr']);
    expect(part(chip, '.root-meaning')).toEqual(['guardar o vigilar', 'es', 'ltr']);
    expect(chip.textContent).not.toContain('to keep or watch');
    expect(doc.querySelector('.etym-related').textContent).toContain('preserve');
    expect(JSON.stringify(roots)).toBe(saved);
  });

  it.each([
    ['ar-Latn', 'ar_Latn', 'Arabic', 'ar-Latn'],
    ['ar-Latn-US', 'AR_latn_us', 'ar-Latn', 'ar-Latn-US'],
    ['es-MX', 'ES_mx', 'Spanish', 'es-MX'],
  ])('prefers an exact %s key, then its full canonical alias without collapsing script or region', async (language, alias, other, tag) => {
    const root = { root: 'servare', lang: 'Latin', meaning: 'legacy meaning',
      meaningByLang: { [other]: 'different locale', [alias]: 'canonical meaning', [language]: 'exact meaning' } };
    const exact = await exportRoots(lane, [root], { language });
    expect(part(exact.doc.querySelector('.root-chip'), '.root-meaning')).toEqual(['exact meaning', tag, 'ltr']);
    delete root.meaningByLang[language];
    const canonical = await exportRoots(lane, [root], { language });
    expect(part(canonical.doc.querySelector('.root-chip'), '.root-meaning')).toEqual(['canonical meaning', tag, 'ltr']);
    delete root.meaningByLang[alias];
    const fallback = await exportRoots(lane, [root], { language });
    expect(part(fallback.doc.querySelector('.root-chip'), '.root-meaning')).toEqual(['legacy meaning', '', 'auto']);
  });

  it('retains the known language of a legacy fallback while resolving each saved field separately', async () => {
    const roots = [{ root: 'servare', lang: 'Latin', meaning: 'to keep or watch',
      langByLocale: { es: 'latín', English: 'Latin' }, meaningByLang: { English: 'to keep or watch', 'es-MX': 'A regional gloss' } }];
    const { doc } = await exportRoots(lane, roots);
    const chip = doc.querySelector('.root-chip');
    expect(part(chip, '.root-language')).toEqual(['(latín)', 'es', 'ltr']);
    expect(part(chip, '.root-meaning')).toEqual(['to keep or watch', 'en', 'ltr']);
  });

  it('keeps uncertain legacy language explicit and handles malformed or unavailable localized values', async () => {
    const roots = [{ root: 'local-root', lang: 'Community origin', meaning: 'A saved local meaning',
      langByLocale: ['incorrect array'], meaningByLang: { Spanish: {}, Arabic: 'Unrelated gloss' } }];
    const { doc } = await exportRoots(lane, roots);
    const chip = doc.querySelector('.root-chip');
    expect(part(chip, '.root-form')).toEqual(['local-root', '', 'auto']);
    expect(part(chip, '.root-language')).toEqual(['(Community origin)', '', 'auto']);
    expect(part(chip, '.root-meaning')).toEqual(['A saved local meaning', '', 'auto']);
  });

  it('finds the source language through saved localized origin names and keeps Arabic glosses separate', async () => {
    const { doc } = await exportRoots(lane, [{ root: 'servare', lang: 'لاتينية', meaning: 'حفظ',
      langByLocale: { Arabic: 'لاتينية', English: 'Latin' }, meaningByLang: { Arabic: 'حفظ أو رعاية' } }], { language: 'ar', locale: 'en' });
    const chip = doc.querySelector('.root-chip');
    expect(part(chip, '.root-form')).toEqual(['servare', 'la', 'ltr']);
    expect(part(chip, '.root-language')).toEqual(['(لاتينية)', 'ar', 'rtl']);
    expect(part(chip, '.root-meaning')).toEqual(['حفظ أو رعاية', 'ar', 'rtl']);
    expect([...chip.children].every(node => node.tagName === 'BDI')).toBe(true);
  });

  it('escapes root spellings and localized prose while preserving literal punctuation', async () => {
    const root = 'r < 2 & "quoted"', label = 'origin < 3 & "name"', meaning = 'keep > watch & "care"';
    const { doc } = await exportRoots(lane, [{ root, lang: 'Unknown origin', langByLocale: { Spanish: label }, meaningByLang: { Spanish: meaning } }]);
    const chip = doc.querySelector('.root-chip');
    expect(part(chip, '.root-form')[0]).toBe(root);
    expect(part(chip, '.root-language')[0]).toBe('(' + label + ')');
    expect(part(chip, '.root-meaning')[0]).toBe(meaning);
    expect(chip.children).toHaveLength(3);
  });

  it('keeps enlarged mixed-script chips inside narrow screen and print cards', async () => {
    const root = 'conservation'.repeat(7), meaning = 'حفظ النباتات ورعايتها '.repeat(5).trim();
    const { html } = await exportRoots(lane, [{ root, lang: 'Latin', langByLocale: { Arabic: 'اللغة اللاتينية' }, meaningByLang: { Arabic: meaning } }], { language: 'Arabic', locale: 'en', size: 32 });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
      await page.setContent(html);
      for (const media of ['screen', 'print']) {
        await page.emulateMedia({ media });
        const geometry = await page.locator('.root-chip').evaluate(chip => {
          const form = chip.querySelector('.root-form'), gloss = chip.querySelector('.root-meaning');
          const card = chip.closest('.card-side'), chipRect = chip.getBoundingClientRect(), cardRect = card.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(chip);
          return { fits: chipRect.left >= cardRect.left && chipRect.right <= cardRect.right && card.scrollWidth <= card.clientWidth + 1,
            fragmentsFit: [...range.getClientRects()].every(rect => rect.left >= cardRect.left && rect.right <= cardRect.right),
            fontSize: parseFloat(getComputedStyle(gloss).fontSize), rootDirection: getComputedStyle(form).direction,
            meaningDirection: getComputedStyle(gloss).direction, isolated: getComputedStyle(gloss).unicodeBidi,
            root: form.textContent, meaning: gloss.textContent };
        });
        expect(geometry.fits && geometry.fragmentsFit).toBe(true);
        expect(geometry.fontSize).toBe(20);
        expect([geometry.rootDirection, geometry.meaningDirection, geometry.isolated]).toEqual(['ltr', 'rtl', 'isolate']);
        expect([geometry.root, geometry.meaning]).toEqual([root, meaning]);
      }
      if (process.env.GLOSSARY_ROOT_SCREENSHOT && lane === 'source') {
        await page.emulateMedia({ media: 'screen' });
        await page.locator('.back').screenshot({ path: process.env.GLOSSARY_ROOT_SCREENSHOT });
      }
    } finally { await browser.close(); }
  }, 45_000);
});
