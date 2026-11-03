import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const lanes = [['source', process.env.EXPORT_SOURCE || 'export_source.jsx'], ['runtime', 'export_module.js']]
  .filter(([lane]) => !process.env.EXPORT_SOURCE_ONLY || lane === 'source')
  .map(([lane, file]) => [lane, readFileSync(file, 'utf8')]);
const fontCode = readFileSync('ui_font_library_module.js', 'utf8');
const output = process.env.GLOSSARY_CARD_LABEL_OUTPUT || 'tmp/card-caption-refine-20261101/export';
const factories = {}, windows = [];
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let browser;
beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  for (const [lane, code] of lanes) { delete window.AlloModules.Export; new Function(code)(); factories[lane] = window.AlloModules.createExport; }
  new Function(fontCode)();
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { await browser?.close(); }, 60000);
afterEach(() => {
  document.body.replaceChildren(); document.documentElement.removeAttribute('lang'); document.documentElement.removeAttribute('dir');
  delete window.__alloReadingSettings; delete window.alloAnnounce;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
const sample = () => ({ type: 'glossary', data: [{
  entryId: 'leaf', term: 'Leaf & Stem', termLanguage: 'English', def: 'Une feuille & une tige.', definitionLanguage: 'French',
  contextSentence: 'تنمو الورقة.', contextSentenceLanguage: 'Arabic', translations: { Arabic: 'ورقة: جزء من النبات.' },
  etymology: 'Origine grecque & plante.', etymologyByLang: { French: 'Origine grecque & plante.' },
  roots: [{ root: 'φύλλον & <leaf>', lang: 'Greek', langByLocale: { French: 'Grec' }, meaningByLang: { French: 'feuille & plante' }, related: ['leaflet', 'ضفة'] }],
  image, imageAlt: 'Leaf', imageAttribution: { set: 'Synthetic set', author: 'Fixture Author', license: 'CC BY', licenseUrl: 'https://example.test/license?x=1&y=2', url: 'https://example.test/leaf' },
}] });
const badTranslation = mode => mode === 'key' ? key => key : mode === 'empty' ? () => '' : mode === 'whitespace' ? () => '   ' : () => { throw new Error('Translation pack unavailable'); };
function setup(lane, { data = sample(), t = key => key, locale = 'ar', fontId = null, size = 32 } = {}) {
  document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  const files = [], names = [], toasts = [], announced = [], saved = JSON.stringify(data);
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:card-label-test'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { names.push(this.download); });
  window.alloAnnounce = text => announced.push(text);
  if (fontId) {
    const fontClass = fontId === 'andika-bold-italic' ? 'font-andika-bold-italic' : 'font-andika-italic';
    window.__alloReadingSettings = { get: () => ({ fontId, fontClass, fontFamily: "'Andika', sans-serif", baseFontSize: size, lineHeight: 1.6, letterSpacing: .01 }), set() {} };
    vi.spyOn(window.AlloModules.UIFontLibrary, 'exportFontFaceCss').mockResolvedValue({ head: '', css: '' });
  }
  const api = factories[lane]({ liveRef: { current: { generatedContent: data, t, addToast: (...args) => toasts.push(args) } }, escapeXml });
  const run = async (mode = 'standard', enabled = !!fontId) => {
    await api.handleExportFlashcards(mode, { includeAudio: false, useReadingSettings: enabled });
    return { html: files.at(-1)?.text, doc: files.length ? new DOMParser().parseFromString(files.at(-1).text, 'text/html') : null };
  };
  return { run, files, names, toasts, announced, data, assertSaved: () => expect(JSON.stringify(data)).toBe(saved) };
}
const uiNodes = doc => [doc.querySelector('h1'), doc.querySelector('.no-print p'), doc.querySelector('.no-print button'), doc.querySelector('.set-caption') || doc.querySelector('.set-header'), doc.querySelector('.cut-guide span'), doc.querySelector('.picture-credits h2')].filter(Boolean);

describe.each(lanes)('readable card labels and inherited type (%s)', (lane) => {
  it.each(['key', 'empty', 'whitespace', 'throw'])('uses readable fallback UI when translation lookup returns %s', async mode => {
    for (const kind of ['standard', 'language']) {
      const run = setup(lane, { t: badTranslation(mode) });
      const { doc } = await run.run(kind);
      expect(doc.querySelector('h1').textContent).toBe(kind === 'standard' ? 'Flashcard Generator' : 'Language Study Flashcards');
      expect(doc.title).toContain(kind === 'standard' ? 'Flashcard Generator' : 'Language Study Flashcards');
      expect(doc.querySelector('title').lang).toBe('en');
      expect(doc.querySelector('.no-print button').textContent).toBe('Print');
      expect(doc.querySelector('.set-header').textContent).toContain('Study Set');
      if (kind === 'standard') expect(doc.querySelector('.cut-guide span').textContent).toBe('FOLD HERE');
      expect(doc.querySelector('.picture-credits').textContent).toContain('License: https://example.test/license?x=1&y=2');
      expect(doc.querySelector('.picture-credits').textContent).toContain('Source: https://example.test/leaf');
      for (const node of [doc.querySelector('h1'), doc.querySelector('.no-print p'), doc.querySelector('.no-print button'), doc.querySelector('.set-header [lang]'), doc.querySelector('.cut-guide span'), doc.querySelector('.picture-credits h2'), doc.querySelector('.etym-text strong'), doc.querySelector('[data-context-sentence] strong')].filter(Boolean)) {
        expect(node.lang).toBe('en'); expect(node.dir).toBe('ltr');
      }
      if (kind === 'standard') { expect(doc.querySelector('.etym-related strong').lang).toBe('en'); expect(doc.querySelector('.etym-related strong').dir).toBe('auto'); }
      expect(uiNodes(doc).map(node => node.textContent).join(' ')).not.toMatch(/(?:flashcards|common)\.[a-z_]+/);
      expect(run.names.at(-1)).toMatch(/^flashcards-(?:standard|language)-\d+\.html$/);
      expect(run.announced.at(-1)).toBe('Flashcards downloaded.');
      run.assertSaved(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    }
  });

  it.each([
    ['ar', { 'flashcards.print_title_standard': 'بطاقات الكلمات', 'flashcards.print_instructions': 'اطبع البطاقات ثم اطوها.', 'common.print': 'اطبع', 'flashcards.set_header': 'مجموعة', 'flashcards.fold_guide': 'اطوِ هنا', 'flashcards.picture_credits': 'مصادر الصور', 'flashcards.credit_license': 'الرخصة', 'flashcards.credit_source': 'المصدر', 'flashcards.export_done': 'تم التنزيل', 'export.filenames.flashcards': 'بطاقات', 'glossary.etymology_label': 'أصول الكلمات', 'glossary.context_sentence_label': 'في النص:', 'export.related_words_label': 'كلمات ذات صلة:' }],
    ['fr', { 'flashcards.print_title_standard': 'Cartes <de mots> & sens', 'flashcards.print_instructions': 'Imprimez les cartes.', 'common.print': 'Imprimer', 'flashcards.set_header': 'Ensemble', 'flashcards.fold_guide': 'Pliez ici', 'flashcards.picture_credits': 'Crédits des images', 'flashcards.export_done': 'Cartes téléchargées', 'export.filenames.flashcards': 'cartes', 'glossary.etymology_label': 'Racines', 'glossary.context_sentence_label': 'Dans le texte :', 'export.related_words_label': 'Mots apparentés :' }],
    ['es', { 'flashcards.print_title_standard': 'Tarjetas de palabras', 'flashcards.print_instructions': 'Imprime y pliega las tarjetas.', 'common.print': 'Imprimir', 'flashcards.set_header': 'Conjunto', 'flashcards.fold_guide': 'Doblar aquí', 'flashcards.picture_credits': 'Créditos de imágenes', 'flashcards.export_done': 'Tarjetas descargadas', 'export.filenames.flashcards': 'tarjetas', 'glossary.etymology_label': 'Raíces', 'glossary.context_sentence_label': 'En el texto:', 'export.related_words_label': 'Palabras relacionadas:' }],
  ])('preserves real %s labels and their interface metadata', async (locale, labels) => {
    const run = setup(lane, { locale, t: key => labels[key] || key });
    const { doc } = await run.run();
    expect(doc.querySelector('h1').textContent).toBe(labels['flashcards.print_title_standard']);
    expect(doc.querySelector('h1 em')).toBeNull(); expect(doc.querySelector('.no-print button').textContent).toBe(labels['common.print']);
    expect(doc.querySelector('.set-header').textContent).toContain(labels['flashcards.set_header']);
    for (const node of [doc.querySelector('h1'), doc.querySelector('.no-print p'), doc.querySelector('.no-print button'), doc.querySelector('.set-header [lang]'), doc.querySelector('.cut-guide span'), doc.querySelector('.picture-credits h2'), doc.querySelector('.etym-text strong'), doc.querySelector('[data-context-sentence] strong')]) {
      expect(node.lang).toBe(locale); expect(node.dir).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    }
    expect(doc.querySelector('.etym-related strong').lang).toBe(locale); expect(doc.querySelector('.etym-related strong').dir).toBe('auto');
    expect(run.announced.at(-1)).toBe(labels['flashcards.export_done']); run.assertSaved();
  });

  it('marks English fallback literals as English inside an Arabic interface', async () => {
    const labels = { 'flashcards.print_title_standard': 'Flashcard Generator', 'flashcards.print_instructions': 'Instructions: Print single-sided. Cut along the dashed borders. Fold in the middle to create double-sided cards.', 'common.print': 'Print', 'flashcards.set_header': 'Study Set', 'flashcards.fold_guide': 'FOLD HERE', 'flashcards.picture_credits': 'Picture credits', 'glossary.etymology_label': 'Word roots', 'glossary.context_sentence_label': 'In the text:', 'export.related_words_label': 'Related words:' };
    const run = setup(lane, { locale: 'ar', t: key => labels[key] || key });
    const { doc } = await run.run();
    expect(doc.documentElement.lang).toBe('ar');
    for (const node of [doc.querySelector('title'), doc.querySelector('h1'), doc.querySelector('.no-print p'), doc.querySelector('.no-print button'), doc.querySelector('.set-header [lang]'), doc.querySelector('.cut-guide span'), doc.querySelector('.picture-credits h2'), doc.querySelector('.etym-text strong'), doc.querySelector('[data-context-sentence] strong')]) {
      expect(node.lang).toBe('en'); expect(node.dir).toBe('ltr');
    }
    expect(doc.querySelector('.etym-related strong').lang).toBe('en'); expect(doc.querySelector('.etym-related strong').dir).toBe('auto');
    expect(doc.querySelector('h1').textContent).toBe(labels['flashcards.print_title_standard']); run.assertSaved();
  });

  it('keeps empty and untranslated notifications readable without making a file', async () => {
    for (const mode of ['key', 'empty', 'whitespace', 'throw']) {
      const empty = setup(lane, { data: { type: 'glossary', data: [] }, t: badTranslation(mode) });
      await empty.run(); expect(empty.files).toHaveLength(0); expect(empty.toasts.at(-1)).toEqual(['Add glossary terms before exporting flashcards.', 'info']); empty.assertSaved();
      vi.restoreAllMocks(); vi.unstubAllGlobals();
      const absent = setup(lane, { data: { type: 'glossary', data: [{ term: 'Leaf', def: 'A plant part.' }] }, t: badTranslation(mode) });
      await absent.run('language'); expect(absent.files).toHaveLength(0); expect(absent.toasts.at(-1)).toEqual(['No translated flashcards are available to export.', 'error']); absent.assertSaved();
      vi.restoreAllMocks(); vi.unstubAllGlobals();
    }
  });

  it('preserves authored root strings, language metadata and selected font styling', async () => {
    const run = setup(lane, { fontId: 'andika-bold-italic' }); const { doc } = await run.run();
    expect(doc.querySelector('.root-form').textContent).toBe('φύλλον & <leaf>');
    expect(doc.querySelector('.root-form').lang).toBe('el'); expect(doc.querySelector('.root-language').textContent).toBe('(Grec)');
    expect(doc.querySelector('.root-language').lang).toBe('fr'); expect(doc.querySelector('.root-meaning').textContent).toBe('feuille & plante');
    expect(doc.querySelector('.root-chip img')).toBeNull();
    expect(doc.querySelector('.back .def-text > span').textContent).toBe('Une feuille & une tige.');
    expect(doc.querySelector('[data-context-sentence] q').textContent).toBe('تنمو الورقة.'); run.assertSaved();
  });

  it.each([['en', 'andika-italic'], ['ar', 'andika-bold-italic']])('renders inherited font consistently across roots on a32px %s card', async (locale, fontId) => {
    const run = setup(lane, { locale, fontId });
    const enabled = await run.run('standard', true), disabled = await run.run('standard', false);
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => { const protocol = new URL(route.request().url()).protocol; return ['data:', 'blob:'].includes(protocol) ? route.continue() : route.abort('blockedbyclient'); });
    try {
      await page.setContent(enabled.html);
      const proof = await page.evaluate(() => ({
        rootSize: getComputedStyle(document.documentElement).fontSize,
        fields: [...document.querySelectorAll('.root-chip,.root-form,.root-language,.root-meaning,.back .def-text > span,.back q')].map(node => ({ text: node.textContent, font: getComputedStyle(node).fontFamily, style: getComputedStyle(node).fontStyle, weight: getComputedStyle(node).fontWeight })),
        fits: document.documentElement.scrollWidth <= innerWidth + 1,
      }));
      expect(proof.rootSize).toBe('32px'); expect(proof.fits).toBe(true); expect(proof.fields.length).toBeGreaterThanOrEqual(6);
      for (const field of proof.fields) { expect(field.font).toContain('Andika'); expect(field.style).toBe('italic'); if (fontId === 'andika-bold-italic') expect(field.weight).toBe('700'); }
      expect(errors).toEqual([]);
      await page.locator('.card-container').first().screenshot({ path: output + '/root-style-' + lane + '-' + locale + '.png' });
      writeFileSync(output + '/root-style-' + lane + '-' + locale + '-proof.json', JSON.stringify(proof, null, 2) + '\n');
      await page.setContent(disabled.html);
      for (const style of await page.locator('.root-chip,.root-form,.root-language,.root-meaning').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fontStyle))) expect(style).toBe('normal');
      expect(await page.locator('.root-form').textContent()).toBe('φύλλον & <leaf>'); run.assertSaved();
    } finally { await page.close(); }
  }, 60000);
});
