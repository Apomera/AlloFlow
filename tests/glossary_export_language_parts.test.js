import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let extras;
const modes = ['table', 'flash-cards', 'language-cards', 'bilingual'];
const labels = { 'output.col_term': 'Term', 'output.col_def': 'Definition', 'output.col_trans': 'Translation' };
const source = { term: 'Hoja', termLanguage: 'Spanish', def: 'Une partie de la plante.', definitionLanguage: 'French', translations: { 'pa-Arab': 'پتہ', 'ar-Latn': 'waraqa', 'fr-CA': 'Feuille' } };
beforeAll(() => {
  window.React ||= createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('module_scope_extras_module.js');
  extras = window.AlloModules.ModuleScopeExtras;
  loadAlloModule('doc_pipeline_module.js');
});
afterEach(() => { window.AlloModules.ModuleScopeExtras = extras; vi.restoreAllMocks(); });
function render(mode, entries = [source], { full = false, selfTest = false, language = 'English', extra = {} } = {}) {
  const pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => labels[key] || key, isRtlLang: extras.isRtlLang, updateExportPreview: () => {}, getDefaultTitle: () => 'Vocabulary', state: { currentUiLanguage: language, leveledTextLanguage: language } });
  const item = { id: 'language-parts', type: 'glossary', title: 'Plant words', data: entries };
  const config = { includeGlossary: true, includeTeacherKey: false, annotations: [], glossaryDisplayMode: mode, glossarySelfTest: selfTest, ...extra };
  const html = full ? pipeline.generateFullPackHTML([item], 'Language parts', false, {}, config) : pipeline.generateResourceHTML(item, false, {}, config);
  return new DOMParser().parseFromString(html, 'text/html');
}
const attrs = node => [node.getAttribute('lang'), node.getAttribute('dir')];
const translation = (doc, text) => [...doc.querySelectorAll('[lang], [dir="auto"]')].find(node => node.textContent === text);

describe.each(modes)('%s glossary language of parts', mode => {
  it('tags the term and definition independently using actual saved metadata', () => {
    const doc = render(mode);
    const term = doc.querySelector('[data-glossary-term]'), definition = doc.querySelector('[data-glossary-definition]');
    expect(term.textContent).toBe(source.term);
    expect(definition.textContent).toBe(source.def);
    expect(attrs(term)).toEqual(['es', 'ltr']);
    expect(attrs(definition)).toEqual(['fr', 'ltr']);
    expect(attrs(translation(doc, 'پتہ'))).toEqual(['pa-Arab', 'rtl']);
    expect(attrs(translation(doc, 'waraqa'))).toEqual(['ar-Latn', 'ltr']);
    expect(attrs(translation(doc, 'Feuille'))).toEqual(['fr-CA', 'ltr']);
  });
  it('keeps UI labels in the document language rather than tagging the entire control/card as the definition language', () => {
    const doc = render(mode, [source], { full: true, selfTest: true });
    expect(doc.documentElement.lang).toBe('en');
    const definition = doc.querySelector('[data-glossary-definition]');
    expect(definition.lang).toBe('fr');
    const ui = mode === 'table' ? doc.querySelector('details summary')
      : mode === 'bilingual' ? doc.querySelector('thead th')
      : mode === 'language-cards' ? doc.querySelector('.alloflow-glossary-card-reference strong')
      : doc.querySelector('.alloflow-glossary-show-all');
    expect(ui.closest('[lang]').getAttribute('lang')).toBe('en');
    expect(doc.querySelector('.resource-header').closest('[lang]').getAttribute('lang')).toBe('en');
  });
  it('preserves script/region tags and ignores script-looking subtags inside extensions', () => {
    const expected = [
      ['az_Arab', 'az-Arab', 'rtl'], ['AR_latn', 'ar-Latn', 'ltr'], ['zh_Hant_TW', 'zh-Hant-TW', 'ltr'],
      ['sr-Latn-RS', 'sr-Latn-RS', 'ltr'], ['ar-u-nu-latn', 'ar-u-nu-latn', 'rtl'],
      ['en-u-nu-arab', 'en-u-nu-arab', 'ltr'], ['pa-Arab-u-nu-latn', 'pa-Arab-u-nu-latn', 'rtl'],
    ];
    const translations = Object.fromEntries(expected.map(([input], index) => [input, `Translated text ${index}`]));
    const doc = render(mode, [{ term: 'Leaf', def: 'A plant part.', translations }]);
    expected.forEach(([, tag, dir], index) => expect(attrs(translation(doc, `Translated text ${index}`))).toEqual([tag, dir]));
  });
  it('leaves unknown names and malformed metadata untagged with automatic direction', () => {
    vi.spyOn(extras, 'getSpeechLangCode').mockReturnValue('en-US');
    const doc = render(mode, [{ term: 'Unknown source', termLanguage: 'Invented language', def: 'An unknown-language definition.', definitionLanguage: 'fr--CA', translations: { 'Another invented name': 'Unknown translated text', 'ar" onclick="alert(1)': 'Malformed language text' } }]);
    expect(attrs(doc.querySelector('[data-glossary-term]'))).toEqual([null, 'auto']);
    expect(attrs(doc.querySelector('[data-glossary-definition]'))).toEqual([null, 'auto']);
    expect(attrs(translation(doc, 'Unknown translated text'))).toEqual([null, 'auto']);
    expect(attrs(translation(doc, 'Malformed language text'))).toEqual([null, 'auto']);
    expect(doc.querySelector('[onclick]')).toBeNull();
  });
  it('works without the optional host resolver and keeps canonical regional friendly names', () => {
    delete window.AlloModules.ModuleScopeExtras;
    const doc = render(mode, [{ term: 'ورقة', termLanguage: 'Arabic', def: 'Une partie de la plante.', definitionLanguage: 'French (Canadian)', translations: { 'Spanish (Latin America)': 'Hoja', 'az-Arab': 'یارپاق', 'Unknown language': 'Unclassified text' } }]);
    expect(attrs(doc.querySelector('[data-glossary-term]'))).toEqual(['ar', 'rtl']);
    expect(attrs(doc.querySelector('[data-glossary-definition]'))).toEqual(['fr-CA', 'ltr']);
    expect(attrs(translation(doc, 'Hoja'))).toEqual(['es-419', 'ltr']);
    expect(attrs(translation(doc, 'یارپاق'))).toEqual(['az-Arab', 'rtl']);
    expect(attrs(translation(doc, 'Unclassified text'))).toEqual([null, 'auto']);
  });
  it('uses full safe host-resolved tags for additional friendly names', () => {
    vi.spyOn(extras, 'getSpeechLangCode').mockImplementation(name => name === 'Community language' ? 'ff-Adlm-GN' : 'en-US');
    const doc = render(mode, [{ term: 'Leaf', def: 'A plant part.', translations: { 'Community language': 'Community translation', 'Unknown name': 'Unknown translation' } }]);
    expect(attrs(translation(doc, 'Community translation'))).toEqual(['ff-Adlm-GN', 'rtl']);
    expect(attrs(translation(doc, 'Unknown translation'))).toEqual([null, 'auto']);
  });
  it('retains the legacy English source default independently for fields without language metadata', () => {
    const doc = render(mode, [{ term: 'Leaf', termLanguage: 'en-US', def: 'A plant part.', translations: {} }]);
    expect(attrs(doc.querySelector('[data-glossary-term]'))).toEqual(['en-US', 'ltr']);
    expect(attrs(doc.querySelector('[data-glossary-definition]'))).toEqual(['en', 'ltr']);
  });
});

describe('language tagging preserves glossary content and other display modes', () => {
  it('keeps escaped instructional text literal and secondary English terms explicitly English', () => {
    const doc = render('flash-cards', [{ term: '<Hoja> & leaf', termLanguage: 'Spanish', term_en: 'Leaf', def: '<meaning> & description', definitionLanguage: 'French', translations: { 'ar-Latn': '<waraqa> & leaf' } }]);
    expect(doc.querySelector('[data-glossary-term]').textContent).toBe('<Hoja> & leaf');
    expect(doc.querySelector('[data-glossary-definition]').textContent).toBe('<meaning> & description');
    expect(doc.querySelector('hoja,meaning,waraqa')).toBeNull();
    expect(attrs(translation(doc, '<waraqa> & leaf'))).toEqual(['ar-Latn', 'ltr']);
    const english = [...doc.querySelectorAll('.alloflow-glossary-card-front > div')].find(node => node.textContent === '(Leaf)');
    expect(attrs(english)).toEqual(['en', 'ltr']);
  });
  it('retains term/definition languages in Word Wall through the shared text renderers', () => {
    const doc = render('word-wall', [source], { extra: { glossaryWordWallDefinition: true } });
    expect(attrs(doc.querySelector('[data-glossary-term]'))).toEqual(['es', 'ltr']);
    expect(attrs(doc.querySelector('[data-glossary-definition]'))).toEqual(['fr', 'ltr']);
    expect(doc.querySelectorAll('.alloflow-word-wall-card')).toHaveLength(1);
  });
});
