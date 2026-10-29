import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const factories = {};
beforeAll(() => {
  for (const [lane, file] of [['source', 'export_source.jsx'], ['runtime', 'export_module.js']]) {
    delete window.AlloModules.Export;
    new Function(readFileSync(file, 'utf8'))(); factories[lane] = window.AlloModules.createExport;
  }
});
beforeEach(() => { vi.useFakeTimers(); document.documentElement.lang = 'fr'; document.documentElement.dir = 'ltr'; });
afterEach(() => {
  document.querySelector('.agx-dialog')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.body.replaceChildren(); document.documentElement.removeAttribute('lang'); document.documentElement.removeAttribute('dir');
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const fixture = () => [{ term: 'שלום', termLanguage: 'Hebrew', def: 'Une salutation.\nBonjour.', definitionLanguage: 'French', translations: { 'ar-Latn': { term: 'salaam', def: 'tahiyya' }, 'zh-Hant-TW': { term: '你好', def: '問候語。' } } }];
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function setup(lane, data = fixture()) {
  const files = [], addToast = vi.fn();
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:language-labels'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const api = factories[lane]({ liveRef: { current: { generatedContent: { type: 'glossary', title: 'Languages', data }, t: key => key, addToast } }, escapeXml });
  return { api, files, addToast, cards(mode = 'language') { api.handleExportFlashcards(mode, { includeAudio: false, useReadingSettings: false }); return new DOMParser().parseFromString(files.at(-1).text, 'text/html'); } };
}
const click = text => [...document.querySelectorAll('.agx-dialog button')].find(node => node.textContent === text).click();

describe.each(['source', 'runtime'])('Glossary export language captions (%s)', lane => {
  it.each(['fr', 'ar'])('localizes source, definition, script and region names in %s without changing content metadata', locale => {
    document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    const data = fixture(), saved = JSON.stringify(data), doc = setup(lane, data).cards();
    const names = new Intl.DisplayNames([locale], { type: 'language', languageDisplay: 'standard' });
    expect(doc.documentElement.lang).toBe(locale);
    expect([...doc.querySelector('.front').querySelectorAll('.lang-label')].map(node => node.textContent)).toEqual([names.of('he'), names.of('fr')]);
    expect([...doc.querySelectorAll('.back .lang-label')].map(node => node.textContent)).toEqual([names.of('ar-Latn'), names.of('zh-Hant-TW')]);
    expect(doc.querySelector('.set-header').textContent).toContain(names.of('ar-Latn'));
    expect(doc.querySelector('.front .primary-text').getAttribute('lang')).toBe('he');
    expect(doc.querySelector('.front .primary-text').getAttribute('dir')).toBe('rtl');
    expect(doc.querySelector('.front .def-text').getAttribute('lang')).toBe('fr');
    expect(doc.querySelector('.front .def-text').textContent).toBe(data[0].def);
    expect([...doc.querySelectorAll('.back .primary-text')].map(node => node.lang)).toEqual(['ar-Latn', 'zh-Hant-TW']);
    expect(JSON.stringify(data)).toBe(saved);
  });
  it('avoids redundant or empty definition labels while preserving different regions', () => {
    const data = ['fr', 'fr-CA', 'French'].map((definitionLanguage, i) => ({ term: 'salut' + i, termLanguage: 'French', definitionLanguage, def: i === 2 ? '' : 'Une salutation.', translations: { English: 'hello' } }));
    const doc = setup(lane, data).cards();
    expect([...doc.querySelectorAll('.front')].map(front => front.querySelectorAll('.lang-label').length)).toEqual([1, 2, 1]);
  });
  it.each(['missing', 'throws', 'unsupported-locale'])('keeps original names when display-name support is %s', state => {
    if (state === 'missing') vi.spyOn(Intl, 'DisplayNames').mockImplementation(undefined);
    else if (state === 'throws') vi.spyOn(Intl, 'DisplayNames').mockImplementation(() => { throw new Error('No locale data'); });
    else document.documentElement.lang = 'qzz';
    const doc = setup(lane).cards();
    expect(doc.querySelector('.back .lang-label').textContent).toBe('ar-Latn');
  });
  it('preserves unknown names and supports saved Dari metadata without host helpers', () => {
    const data = [{ term: 'سلام', termLanguage: 'Dari', def: 'A greeting.', definitionLanguage: 'English', translations: { 'Family language <label>': 'A greeting' } }];
    const doc = setup(lane, data).cards();
    expect(doc.querySelector('.front .primary-text').lang).toBe(Intl.getCanonicalLocales('prs')[0]);
    expect(doc.querySelector('.front .primary-text').dir).toBe('rtl');
    expect(doc.querySelector('.back .lang-label').textContent).toBe('Family language <label>');
    expect(doc.querySelector('.back label')).toBeNull();
  });
  it('uses readable chooser/preview names but retains selected keys and Quizlet/Anki/CSV bytes', () => {
    const { api, files } = setup(lane);
    api.handleExportGlossaryFile('chooser', { format: 'quizlet', back: 'ar-Latn' });
    const option = document.querySelector('option[value="ar-Latn"]'), select = option.parentElement;
    expect(select.value).toBe('ar-Latn'); expect(option.textContent).toContain(new Intl.DisplayNames(['fr'], { type: 'language', languageDisplay: 'standard' }).of('ar-Latn'));
    click('Prepare Quizlet text');
    expect(document.querySelector('textarea').value).toBe('שלום\tsalaam: tahiyya');
    expect(document.querySelector('.agx-sample dd').lang).toBe('ar-Latn');
    expect(document.querySelector('.agx-dialog').textContent).toContain(option.textContent);
    click('Back to export options'); expect(document.querySelector('option[value="ar-Latn"]').parentElement.value).toBe('ar-Latn');
    click('Cancel');
    api.handleExportGlossaryFile('anki', { back: 'ar-Latn' }); expect(files.at(-1).text).toContain('שלום\tsalaam: tahiyya\t');
    api.handleExportGlossaryFile('csv'); expect(files.at(-1).text.split('\r\n')[0]).toContain('ar-Latn,zh-Hant-TW');
  });
});
