import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const factories = {};
beforeAll(() => {
  for (const [lane, file] of [['source', process.env.ALLO_UNKNOWN_LANGUAGE_SOURCE || 'export_source.jsx'], ['runtime', 'export_module.js']]) {
    delete window.AlloModules.Export;
    new Function(readFileSync(file, 'utf8'))();
    factories[lane] = window.AlloModules.createExport;
  }
});
afterEach(() => {
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function exportCards(lane, mode, item) {
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
  let html;
  vi.stubGlobal('Blob', class { constructor(parts) { html = parts.join(''); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:unknown-language');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const resource = { type: 'glossary', title: 'بطاقات الكلمات', data: [item] }, saved = JSON.stringify(resource);
  const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const labels = { 'flashcards.set_header': 'مجموعة دراسية', 'flashcards.fold_guide': 'اطوِ هنا' };
  const previousExtras = window.AlloModules.ModuleScopeExtras;
  window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: () => 'en-US' };
  try {
    factories[lane]({ liveRef: { current: { generatedContent: resource, t: key => labels[key] || '' } }, escapeXml })
      .handleExportFlashcards(mode, { includeAudio: false, useReadingSettings: false });
  } finally { window.AlloModules.ModuleScopeExtras = previousExtras; }
  expect(JSON.stringify(resource)).toBe(saved);
  return new DOMParser().parseFromString(html, 'text/html');
}
const contentFields = (doc, mode) => [...doc.querySelectorAll(mode === 'standard'
  ? '.primary-text, .secondary-text, .def-text > span, .def-text > q, .def-trans > span'
  : '.primary-text, .def-text')];

describe.each(['source', 'runtime'])('unknown glossary card languages (%s)', lane => {
  describe.each(['standard', 'language'])('%s deck', mode => {
    it.each(['Community heritage language', 'fr--CA', 'ar" onclick="alert(1)'])('keeps %s content explicitly unknown beneath an Arabic interface', language => {
      const item = { term: 'Nibi', termLanguage: language, def: 'A saved meaning & detail.', definitionLanguage: language,
        contextSentence: 'An authored example.', contextSentenceLanguage: language,
        translations: { [language]: { term: 'Local word', def: 'A localized meaning.' } } };
      const doc = exportCards(lane, mode, item), fields = contentFields(doc, mode);
      expect(doc.documentElement.lang).toBe('ar');
      expect(doc.documentElement.dir).toBe('rtl');
      expect(fields).toHaveLength(mode === 'standard' ? 5 : 4);
      for (const field of fields) {
        expect(field.closest('[lang]').getAttribute('lang'), field.textContent + ' must not inherit Arabic').toBe('');
        expect(field.getAttribute('lang')).toBe('');
        expect(field.dir).toBe('auto');
      }
      expect(fields.map(field => field.textContent)).toEqual(mode === 'standard'
        ? ['Nibi', 'Local word', item.def, 'A localized meaning.', item.contextSentence]
        : ['Nibi', item.def, 'Local word', 'A localized meaning.']);
      expect(doc.querySelector('.set-header').closest('[lang]').lang).toBe('ar');
      expect(doc.querySelector('.card-container [onclick], .card-container script')).toBeNull();
      expect([...doc.querySelectorAll('[lang]')].some(node => node.lang.includes('onclick'))).toBe(false);
    });

    it('retains the English fallback for legacy cards with absent source metadata', () => {
      const doc = exportCards(lane, mode, { term: 'Leaf', def: 'A plant part.', contextSentence: 'The leaf fell.', translations: { French: { term: 'Feuille', def: 'Partie de la plante.' } } });
      const fields = contentFields(doc, mode);
      for (const field of fields) {
        const expected = ['Feuille', 'Partie de la plante.'].includes(field.textContent) ? 'fr' : 'en';
        expect(field.closest('[lang]').lang).toBe(expected);
        expect(field.dir).toBe('ltr');
      }
    });

    it('preserves complete known script and region tags independently of the interface', () => {
      const doc = exportCards(lane, mode, { term: 'A word', termLanguage: 'az-Arab', def: 'Une définition.', definitionLanguage: 'fr-CA',
        contextSentence: 'A latin-script example.', contextSentenceLanguage: 'ar-Latn',
        translations: { 'sr-Latn-RS': { term: 'Reč', def: 'Značenje.' } } });
      const actual = contentFields(doc, mode).map(field => [field.lang, field.dir]);
      expect(actual).toEqual(mode === 'standard'
        ? [['az-Arab', 'rtl'], ['sr-Latn-RS', 'ltr'], ['fr-CA', 'ltr'], ['sr-Latn-RS', 'ltr'], ['ar-Latn', 'ltr']]
        : [['az-Arab', 'rtl'], ['fr-CA', 'ltr'], ['sr-Latn-RS', 'ltr'], ['sr-Latn-RS', 'ltr']]);
    });
  });
});
