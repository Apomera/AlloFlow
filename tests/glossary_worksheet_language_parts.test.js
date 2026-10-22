import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let pipeline;
const entries = [
  { term: 'Hoja', termLanguage: 'Spanish', def: 'Une partie de la plante.', definitionLanguage: 'French' },
  { term: 'waraqa', termLanguage: 'ar-Latn', def: 'پودے کا ایک حصہ', definitionLanguage: 'pa-Arab' },
  { term: 'Unknown term', termLanguage: 'Unlisted language', def: 'Unknown definition', definitionLanguage: 'Another unlisted language' },
  { term: 'Leaf', def: 'A plant part.' },
];
const expected = [
  { term: ['es', 'ltr'], definition: ['fr', 'ltr'] },
  { term: ['ar-Latn', 'ltr'], definition: ['pa-Arab', 'rtl'] },
  { term: [null, 'auto'], definition: [null, 'auto'] },
  { term: ['en', 'ltr'], definition: ['en', 'ltr'] },
];
const item = data => ({ id: 'worksheet-languages', type: 'glossary', title: 'Plant words', data });
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const attrs = node => [node.getAttribute('lang'), node.getAttribute('dir')];
const effectiveLang = node => node.closest('[lang]')?.getAttribute('lang') || '';
beforeAll(() => {
  window.React ||= createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('module_scope_extras_module.js');
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: window.AlloModules.ModuleScopeExtras.isRtlLang, updateExportPreview: () => {}, getDefaultTitle: () => 'Vocabulary', state: { currentUiLanguage: 'English', leveledTextLanguage: 'English' } });
});
function pack(variant, paper, config = {}, data = entries) {
  return parse(pipeline.generateFullPackHTML([item(data)], 'Worksheet languages', paper, {}, {
    includeGlossary: true, includeTeacherKey: true, annotations: [], glossaryDisplayMode: 'worksheet', glossaryWorksheetVariant: variant, glossaryWorksheetSeed: 'language-parts', ...config,
  }));
}

describe.each([false, true])('Glossary worksheet source language parts (paper=%s)', paper => {
  it('keeps matching definitions in their saved languages while letter labels stay in the UI language', () => {
    const doc = pack('matching', paper);
    const student = doc.querySelector('[data-glossary-worksheet="matching"]');
    expect([...student.querySelectorAll('[data-glossary-term]')].map(node => node.textContent)).toEqual(entries.map(entry => entry.term));
    const definitions = [...student.querySelectorAll('[data-glossary-worksheet-definitions] [data-glossary-definition]')];
    expect(definitions).toHaveLength(entries.length);
    definitions.forEach(node => {
      const index = entries.findIndex(entry => entry.def === node.textContent);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(attrs(node)).toEqual(expected[index].definition);
      expect(effectiveLang(node.parentElement.querySelector('strong'))).toBe('en');
    });
    expect(effectiveLang(student.querySelector('p'))).toBe('en');
    expect(student.querySelectorAll('input')).toHaveLength(paper ? 0 : entries.length);
  });
  it('keeps the matching teacher key terms tagged and its answer letters aligned with the student definition order', () => {
    const doc = pack('matching', paper);
    const student = doc.querySelector('[data-glossary-worksheet="matching"]');
    const letterByDefinition = new Map([...student.querySelectorAll('[data-glossary-worksheet-definitions] > li')].map(row => [row.querySelector('[data-glossary-definition]').textContent, row.querySelector('strong').textContent.replace('.', '')]));
    const key = doc.querySelector('[data-glossary-worksheet-key="matching"]');
    const rows = [...key.querySelectorAll('li')];
    expect(rows).toHaveLength(entries.length);
    rows.forEach((row, index) => {
      const term = row.querySelector('[data-glossary-term]');
      expect(term.textContent).toBe(entries[index].term);
      expect(attrs(term)).toEqual(expected[index].term);
      expect(row.textContent.slice(entries[index].term.length)).toBe(': ' + letterByDefinition.get(entries[index].def));
      expect(effectiveLang(row)).toBe('en');
    });
    expect(key.querySelector('[data-glossary-definition]')).toBeNull();
  });
  it('tags term and definition independently in the writing-lines teacher key without leaking definitions to the student sheet', () => {
    const doc = pack('lines', paper);
    const student = doc.querySelector('[data-glossary-worksheet="lines"]');
    expect(student.querySelector('[data-glossary-definition]')).toBeNull();
    entries.forEach(entry => expect(student.textContent).not.toContain(entry.def));
    const rows = [...doc.querySelectorAll('[data-glossary-worksheet-key="lines"] li')];
    expect(rows).toHaveLength(entries.length);
    rows.forEach((row, index) => {
      expect(attrs(row.querySelector('[data-glossary-term]'))).toEqual(expected[index].term);
      expect(attrs(row.querySelector('[data-glossary-definition]'))).toEqual(expected[index].definition);
      expect(row.textContent).toBe(entries[index].term + ': ' + entries[index].def);
      expect(effectiveLang(row)).toBe('en');
    });
  });
  it.each(['lines', 'matching'])('preserves Teacher Key and assessment-mode isolation for %s', variant => {
    for (const config of [{ includeTeacherKey: false }, { includeTeacherKey: true, assessmentMode: true }]) {
      const doc = pack(variant, paper, config);
      expect(doc.querySelector('[data-glossary-worksheet-key]')).toBeNull();
      const student = doc.querySelector('[data-glossary-worksheet]');
      expect(student).not.toBeNull();
      if (variant === 'lines') entries.forEach(entry => expect(student.textContent).not.toContain(entry.def));
      else expect(student.querySelectorAll('[data-glossary-definition]')).toHaveLength(entries.length);
    }
  });
});

describe('worksheet language renderers preserve escaped data and direct teacher rendering', () => {
  it.each(['lines', 'matching'])('can render a %s key directly before the other display-mode branches initialize', variant => {
    const html = pipeline.generateResourceHTML(item(entries), true, {}, { includeGlossary: true, includeTeacherKey: true, glossaryDisplayMode: 'worksheet', glossaryWorksheetVariant: variant });
    const doc = parse(html), key = doc.querySelector('[data-glossary-worksheet-key]');
    expect(key).not.toBeNull();
    expect(attrs(key.querySelector('[data-glossary-term]'))).toEqual(['es', 'ltr']);
    if (variant === 'lines') expect(attrs(key.querySelector('[data-glossary-definition]'))).toEqual(['fr', 'ltr']);
  });
  it('keeps literal instructional markup escaped and uses the definition alias without changing language tags', () => {
    const raw = { term: '<hoja> & leaf', termLanguage: 'es-MX', definition: '<meaning> & description', definitionLanguage: 'fr-CA' };
    const doc = pack('lines', false, {}, [raw]);
    const key = doc.querySelector('[data-glossary-worksheet-key]');
    expect(key.querySelector('[data-glossary-term]').textContent).toBe(raw.term);
    expect(key.querySelector('[data-glossary-definition]').textContent).toBe(raw.definition);
    expect(attrs(key.querySelector('[data-glossary-term]'))).toEqual(['es-MX', 'ltr']);
    expect(attrs(key.querySelector('[data-glossary-definition]'))).toEqual(['fr-CA', 'ltr']);
    expect(key.querySelector('hoja,meaning')).toBeNull();
  });
});
