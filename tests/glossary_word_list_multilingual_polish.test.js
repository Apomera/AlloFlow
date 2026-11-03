import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const lanes = [['source', process.env.EXPORT_SOURCE || 'export_source.jsx'], ['runtime', 'export_module.js']]
  .filter(([lane]) => !process.env.EXPORT_SOURCE_ONLY || lane === 'source')
  .map(([lane, file]) => [lane, readFileSync(file, 'utf8')]);
const fontLibrary = readFileSync('ui_font_library_module.js', 'utf8');
const output = 'tmp/card-bidi-polish-20261101/export';
const factories = {};
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let browser;
beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  for (const [lane, code] of lanes) {
    new Function(code)(); factories[lane] = window.AlloModules.createExport;
  }
  browser = await chromium.launch({ headless: true });
}, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);
afterEach(() => {
  document.querySelector('.agx-dialog')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.body.replaceChildren();
  document.documentElement.removeAttribute('lang'); document.documentElement.removeAttribute('dir');
  delete window.__alloReadingSettings;
  if (window.AlloModules) delete window.AlloModules.ModuleScopeExtras;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const dialog = () => document.querySelector('.agx-dialog');
const click = text => [...dialog().querySelectorAll('button')].find(node => node.textContent === text).click();
const set = (selector, value) => {
  const node = dialog().querySelector(selector); node.value = value; node.dispatchEvent(new Event('change'));
};
function setup(lane, words, extra = {}) {
  const resource = { type: 'glossary', title: 'Synthetic language review', karaokeAudio: { sentinel: 'unchanged authored audio identity' }, data: words };
  const saved = JSON.stringify(resource), files = [];
  const liveRef = { current: { generatedContent: resource, t: key => key, ...extra } };
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:multilingual-polish');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const api = factories[lane]({ liveRef, escapeXml });
  return { api, liveRef, resource, saved, files };
}
const aliases = () => [
  { term: 'First French', def: 'One meaning.', translations: { French: 'banque' } },
  { term: 'Second French', def: 'Another meaning.', translations: { French: 'rive' } },
  { term: 'Tagged French', def: 'A third meaning.', translations: { fr: 'pente' } },
  { term: 'Named Persian', def: 'Another language.', translations: { Persian: 'بانک' } },
  { term: 'Named Farsi', def: 'An alias.', translations: { Farsi: 'کنار' } },
];
const related = ['bank', 'ضفة', 'שלום', 'Rivière', '<b>literal</b>', 'e\u0301', 'bank', 'seventh'];
const relatedWord = () => ({ term: 'bank', termLanguage: 'English', def: 'A place beside a river.', definitionLanguage: 'English', roots: [{ root: 'bank', lang: 'English', meaning: 'sloping ground', related: [...related] }, { root: 'bank', related: ['BANK', 'eighth'] }] });

describe.each(lanes)('multilingual word-list and printable polish (%s)', (lane, code) => {
  it('distinguishes alias options without combining their keys, rows, previews or exported bytes', () => {
    document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
    const run = setup(lane, aliases());
    run.api.handleExportGlossaryFile('chooser', { format: 'quizlet', back: 'French' });
    const labels = [...dialog().querySelectorAll('[data-agx-back] option')].filter(option => option.value !== 'definition');
    expect(labels.map(option => option.value)).toEqual(['French', 'fr', 'Persian', 'Farsi']);
    expect(new Set(labels.map(option => option.textContent)).size).toBe(4);
    for (const option of labels) expect(option.textContent).toContain('(' + option.value + ')');
    const expected = {
      French: [['First French', 'banque'], ['Second French', 'rive']],
      fr: [['Tagged French', 'pente']], Persian: [['Named Persian', 'بانک']], Farsi: [['Named Farsi', 'کنار']],
    };
    for (const [back, pairs] of Object.entries(expected)) {
      set('[data-agx-back]', back);
      expect(dialog().querySelector('[role=status]').textContent).toContain(pairs.length === 1 ? '1 card ready.' : '2 cards ready.');
      click('Prepare Quizlet text');
      expect(dialog().querySelector('textarea').value).toBe(pairs.map(pair => pair.join('\t')).join('\n'));
      expect([...dialog().querySelectorAll('.agx-sample dt')].map(node => node.textContent)).toEqual(pairs.map(pair => pair[0]));
      click('Back to export options');
      expect(dialog().querySelector('[data-agx-back]').value).toBe(back);
    }
    click('Cancel');
    run.api.handleExportGlossaryFile('csv');
    expect(run.files.at(-1).text.split('\r\n')[0]).toBe('\uFEFFTerm,Definition,Tier,French,fr,Persian,Farsi');
    run.api.handleExportGlossaryFile('anki', { back: 'fr' });
    expect(run.files.at(-1).text).toContain('Tagged French\tpente\t');
    expect(run.files.at(-1).text).not.toContain('First French\t');
    expect(JSON.stringify(run.resource)).toBe(run.saved);
  });

  it('also disambiguates a retained initial back that is absent from the current words', () => {
    document.documentElement.lang = 'en';
    const run = setup(lane, [{ term: 'Bank', def: 'A meaning.', translations: { French: 'banque' } }]);
    run.api.handleExportGlossaryFile('chooser', { format: 'quizlet', back: 'fr' });
    const select = dialog().querySelector('[data-agx-back]');
    expect(select.value).toBe('fr');
    expect([...select.options].map(option => option.value)).toEqual(['definition', 'French', 'fr']);
    expect(select.options[1].textContent).not.toBe(select.options[2].textContent);
    expect(dialog().querySelector('.agx-btn-primary').disabled).toBe(true);
    set('[data-agx-back]', 'French'); expect(dialog().querySelector('.agx-btn-primary').disabled).toBe(false);
  });

  it('keeps already distinct script and region labels unchanged', () => {
    document.documentElement.lang = 'en';
    const languages = ['fr', 'fr-CA', 'ar', 'ar-Latn', 'zh-Hans', 'zh-Hant'];
    const run = setup(lane, [{ term: 'Term', def: 'Meaning', translations: Object.fromEntries(languages.map(key => [key, 'Text for ' + key])) }]);
    run.api.handleExportGlossaryFile('chooser', { format: 'quizlet' });
    const names = new Intl.DisplayNames(['en'], { type: 'language', languageDisplay: 'standard', fallback: 'none' });
    expect([...dialog().querySelectorAll('[data-agx-back] option')].slice(1).map(option => [option.value, option.textContent]))
      .toEqual(languages.map(language => [language, names.of(language) + ' translation']));
  });

  it('marks every skipped term with its actual known or explicitly unknown language', () => {
    document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
    window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: () => 'en-US' };
    const words = [
      { term: 'سلام', termLanguage: 'Arabic', def: '' }, { term: 'שלום', termLanguage: 'Hebrew', def: '' },
      { term: 'Bank', termLanguage: 'English', def: '' }, { term: 'kitab', termLanguage: 'ar-Latn', def: '' },
      { term: 'Nibi', termLanguage: 'Family language <unknown>', def: '' }, { term: 'Legacy', def: '' },
      { term: 'Ready', def: 'A meaning.' },
    ];
    const run = setup(lane, words);
    run.api.handleExportGlossaryFile('chooser', { format: 'quizlet' });
    const review = dialog().querySelector('.agx-review'); review.open = true;
    expect([...review.querySelectorAll('li bdi')].map(node => [node.textContent, node.getAttribute('lang'), node.getAttribute('dir')]))
      .toEqual([['سلام', 'ar', 'rtl'], ['שלום', 'he', 'rtl'], ['Bank', 'en', 'ltr'], ['kitab', 'ar-Latn', 'ltr'], ['Nibi', '', 'auto'], ['Legacy', 'en', 'ltr']]);
    run.liveRef.current.filteredGlossaryResource = run.resource;
    run.liveRef.current.filteredGlossaryData = [words[4], words[0]];
    set('[data-agx-scope]', 'filtered');
    expect(review.open).toBe(true);
    expect([...review.querySelectorAll('li bdi')].map(node => [node.textContent, node.lang, node.dir])).toEqual([['Nibi', '', 'auto'], ['سلام', 'ar', 'rtl']]);
    expect(JSON.stringify(run.resource)).toBe(run.saved);
  });

  it('isolates related words while retaining exact saved text, order, deduplication and the six-word limit', () => {
    document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
    const run = setup(lane, [relatedWord()]);
    run.api.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: false });
    const doc = new DOMParser().parseFromString(run.files.at(-1).text, 'text/html');
    const line = doc.querySelector('.etym-related');
    expect(line.querySelector('strong').textContent).toBe('Related words:');
    expect(line.querySelector('strong').dir).toBe('auto');
    expect([...line.querySelectorAll('bdi')].map(node => [node.textContent, node.getAttribute('lang'), node.dir]))
      .toEqual(related.slice(0, 6).map(word => [word, '', 'auto']));
    expect(line.querySelector('b')).toBeNull();
    expect(line.querySelector('script')).toBeNull();
    expect(line.textContent).not.toContain('seventh');
    expect(JSON.stringify(run.resource)).toBe(run.saved);
  });

  it.each([['en', 'ltr'], ['ar', 'rtl']])('keeps related words secondary, isolated and readable with 32px inherited styling in %s', async (locale, direction) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.route('**/*', route => route.abort('blockedbyclient'));
      await page.setContent('<!doctype html><html lang="' + locale + '" dir="' + direction + '"><body></body></html>');
      await page.addScriptTag({ content: fontLibrary }); await page.addScriptTag({ content: code });
      await page.evaluate(({ resource, direction }) => {
        const settings = { fontId: 'andika-bold-italic', fontFamily: "'Andika', sans-serif", fontClass: 'font-andika-bold-italic', baseFontSize: 32, lineHeight: 1.6, letterSpacing: 0 };
        window.__alloReadingSettings = { get: () => settings, set() {} };
        // Verify the actual library's CSS; no downloaded font is required to inspect declared styles.
        window.AlloModules.UIFontLibrary.exportFontFaceCss = async () => ({ css: '' });
        URL.createObjectURL = blob => { blob.text().then(html => { window.__exported = html; }); return 'blob:related'; };
        URL.revokeObjectURL = () => {}; HTMLAnchorElement.prototype.click = function () {};
        const labels = { 'flashcards.print_title_standard': 'Study cards', 'flashcards.print_instructions': 'Read each side.', 'common.print': 'Print', 'flashcards.fold_guide': 'Fold here', 'flashcards.set_header': 'study set' };
        const api = window.AlloModules.createExport({ liveRef: { current: { generatedContent: resource, t: key => labels[key] || key } }, escapeXml: value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])) });
        api.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: true });
      }, { resource: { type: 'glossary', title: 'Mixed script words', data: [relatedWord()] }, direction });
      await page.waitForFunction(() => typeof window.__exported === 'string');
      const html = await page.evaluate(() => window.__exported); await page.setContent(html);
      const proof = await page.evaluate(() => {
        const line = document.querySelector('.etym-related'), definition = document.querySelector('.back .def-text > span');
        const style = getComputedStyle(line), label = line.querySelector('strong');
        return { labelDirection: label.dir, labelIsolation: getComputedStyle(label).unicodeBidi, rootSize: getComputedStyle(document.documentElement).fontSize, relatedSize: parseFloat(style.fontSize), definitionSize: parseFloat(getComputedStyle(definition).fontSize), family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle, documentFits: document.documentElement.scrollWidth <= innerWidth + 1, lineFits: line.scrollWidth <= line.clientWidth + 1, tokens: [...line.querySelectorAll('bdi')].map(node => ({ text: node.textContent, lang: node.getAttribute('lang'), dir: node.dir, isolation: getComputedStyle(node).unicodeBidi })) };
      });
      writeFileSync(output + '/related-words-' + lane + '-' + locale + '-proof.json', JSON.stringify({ ...proof, errors }, null, 2) + '\n');
      expect(proof.rootSize).toBe('32px'); expect(proof.relatedSize).toBe(24); expect(proof.relatedSize).toBeLessThan(proof.definitionSize);
      expect(proof.family).toContain('Andika'); expect(proof.weight).toBe('700'); expect(proof.style).toBe('italic');
      expect(proof.documentFits).toBe(true); expect(proof.lineFits).toBe(true);
      expect(proof.tokens.map(token => [token.text, token.lang, token.dir])).toEqual(related.slice(0, 6).map(word => [word, '', 'auto']));
      expect(proof.tokens.every(token => token.isolation.includes('isolate'))).toBe(true);
      expect(proof.labelDirection).toBe('auto'); expect(proof.labelIsolation).toContain('isolate');
      expect(errors).toEqual([]);
      await page.locator('.etym-related').screenshot({ path: output + '/related-words-' + lane + '-' + locale + '-320.png' });
    } finally { await page.close(); }
  }, 60_000);
});
