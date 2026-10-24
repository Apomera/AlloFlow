import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let pipeline;
const labels = { 'glossary.export_no_translations': 'No translated answer is available.', 'output.col_def': 'Definition', 'output.generated_via': 'Created with AlloFlow' };
beforeAll(() => {
  window.React ||= createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => labels[key] || key, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Vocabulary', state: {},
  });
});
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const glossary = (data, id = 'gloss') => ({ type: 'glossary', id, title: 'Plant words', data });
const render = (mode, data, config = {}) => parse(pipeline.generateResourceHTML(glossary(data), false, {}, { glossaryDisplayMode: mode, ...config }));
const pack = (items, config = {}, worksheet = false) => parse(pipeline.generateFullPackHTML(items, 'Vocabulary', worksheet, {}, { includeGlossary: true, includeTeacherKey: false, annotations: [], glossaryDisplayMode: 'word-wall', glossaryWordWallDefinition: true, glossaryWordWallPerPage: 4, ...config }));

const translations = [
  { value: 'Hoja: Parte de una planta.', expected: 'Hoja: Parte de una planta.' },
  { value: { term: 'Hoja', def: 'Parte de una planta.' }, expected: 'Hoja: Parte de una planta.' },
  { value: { word: 'Hoja', meaning: 'Parte de una planta.' }, expected: 'Hoja: Parte de una planta.' },
  { value: { text: '', translation: ' ', term: 'Hoja', definition: 'Parte de una planta.' }, expected: 'Hoja: Parte de una planta.' },
  { value: { text: { bad: true }, translation: 'Hoja: Parte de una planta.' }, expected: 'Hoja: Parte de una planta.' },
  { value: { text: 'Hoja：Parte de una planta.' }, expected: 'Hoja：Parte de una planta.' },
  { value: { translation: 'The expression 2 ** 3 equals 8.' }, expected: 'The expression 2 ** 3 equals 8.' },
  { value: '**', expected: '**' },
];
describe.each(['table', 'flash-cards', 'language-cards', 'bilingual'])('%s document translation normalization', mode => {
  it.each(translations)('renders the saved string-safe translation $value', ({ value, expected }) => {
    const doc = render(mode, [{ term: 'Leaf', def: 'A plant part.', translations: { Spanish: value } }]);
    const text = mode === 'table' ? doc.querySelector('tbody tr').lastElementChild.textContent
      : mode === 'bilingual' ? doc.querySelector('tbody tr').lastElementChild.textContent
      : doc.querySelector('.alloflow-glossary-card-back').textContent;
    expect(text).toContain(expected);
    expect(text).not.toContain('[object Object]');
  });
  it('omits malformed/empty language labels while preserving valid translations', () => {
    const doc = render(mode, [{ term: 'Leaf', def: 'A plant part.', translations: { Spanish: { term: 'Hoja', definition: 'Parte de una planta.' }, Empty: '  ', Broken: { text: {}, term: [], meaning: {} }, Array: ['not', 'translation'], Null: null, Separator: ':' } }]);
    const section = doc.querySelector('#gloss');
    section.querySelectorAll('style,script').forEach(node => node.remove());
    expect(section.textContent).toContain('Hoja: Parte de una planta.');
    ['Empty', 'Broken', 'Array', 'Null', 'Separator', '[object Object]'].forEach(value => expect(section.textContent).not.toContain(value));
  });
});

describe('document language-card missing translations', () => {
  it('keeps the source card with an explicit missing-answer notice and a labelled source definition', () => {
    const doc = render('language-cards', [
      { term: 'Leaf', def: 'A plant part.', translations: { Spanish: { term: 'Hoja', def: 'Parte de una planta.' } } },
      { term: 'Root', def: 'The part under the ground.', translations: { Spanish: '  ' } },
    ]);
    const backs = [...doc.querySelectorAll('.alloflow-glossary-card-back')];
    expect(backs).toHaveLength(2);
    expect(backs[0].querySelector('[data-glossary-translation-missing]')).toBeNull();
    expect(backs[1].querySelector('[data-glossary-translation-missing]').textContent).toBe(labels['glossary.export_no_translations']);
    expect(backs[1].textContent).not.toContain('Spanish:');
    expect(backs[1].querySelector('.alloflow-glossary-card-reference').textContent).toBe('Definition: The part under the ground.');
  });
  it('does not silently switch language cards to definition cards when every translation is missing', () => {
    const doc = render('language-cards', [{ term: 'Root', def: 'The part under the ground.', translations: { Spanish: {} } }]);
    expect(doc.querySelector('[data-glossary-translation-missing]').textContent).toBe(labels['glossary.export_no_translations']);
    expect(doc.querySelector('.alloflow-glossary-card-reference strong').textContent).toBe('Definition:');
    expect(doc.body.textContent).toContain('reveal the translation');
  });
  it('does not give empty table translation cells meaningless Reveal buttons', () => {
    const doc = render('table', [{ term: 'Leaf', def: 'A plant part.', translations: { Spanish: 'Hoja' } }, { term: 'Root', def: 'Under the ground.', translations: {} }], { glossarySelfTest: true });
    const lastCell = doc.querySelectorAll('tbody tr')[1].lastElementChild;
    expect(lastCell.textContent.trim()).toBe('');
    expect(lastCell.querySelector('details')).toBeNull();
  });
});

const image = 'data:image/png;base64,iVBORw0KGgo=';
const wallData = Array.from({ length: 8 }, (_, index) => ({ term: `Science word ${index + 1}`, def: `Definition ${index + 1}.`, ...(index === 0 ? { image, imageAttribution: { set: 'Teacher collection', author: 'A. Teacher', license: 'CC BY 4.0', url: 'https://example.org/credit' } } : {}) }));
describe('economical wall-only print policy', () => {
  it.each([2, 3, 4])('%i cards per page retains all terms, definitions, pictures and credits in two groups', count => {
    const doc = pack([glossary(wallData.slice(0, count * 2))], { glossaryWordWallPerPage: count });
    expect(doc.body.getAttribute('data-alloflow-word-wall-print')).toBe('economical');
    expect([...doc.querySelectorAll('.alloflow-word-wall-page')].map(page => page.children.length)).toEqual([count, count]);
    expect([...doc.querySelectorAll('.alloflow-word-wall-term')].map(node => node.textContent)).toEqual(wallData.slice(0, count * 2).map(entry => entry.term));
    expect([...doc.querySelectorAll('.alloflow-word-wall-def')].map(node => node.textContent)).toEqual(wallData.slice(0, count * 2).map(entry => entry.def));
    expect(doc.querySelector('.alloflow-word-wall-card img').getAttribute('src')).toBe(image);
    expect(doc.querySelector('[data-picture-credits]').textContent).toContain('A. Teacher');
    expect(doc.querySelector('[data-picture-credits] a').getAttribute('href')).toBe('https://example.org/credit');
  });
  it('keeps the complete reference chrome in the HTML and puts the attribution in the compact print heading', () => {
    const doc = pack([glossary(wallData)]);
    expect(doc.querySelector('.export-header .export-title').textContent).toContain('Vocabulary');
    expect(doc.querySelector('.alloflow-section-marker')).not.toBeNull();
    expect(doc.querySelector('.a11y-badge')).not.toBeNull();
    expect(doc.querySelector('footer[role="contentinfo"]').textContent).toContain('Created with AlloFlow');
    expect(doc.querySelector('.alloflow-word-wall-print-attribution').textContent).toBe('Created with AlloFlow');
    // Pagination is checked in Chromium PDFs; this asserts the policy is print
    // scoped rather than deleting the reference footer or other source content.
    const css = [...doc.querySelectorAll('style')].map(node => node.textContent).join('\n');
    expect(css).toContain('@media print {\n            body[data-alloflow-word-wall-print="economical"] .export-header');
    expect(css).toContain('.alloflow-word-wall-print-attribution { display:none; }');
  });
  it('applies across multiple wall glossaries and suppresses only an empty teacher appendix on paper', () => {
    const doc = pack([glossary(wallData.slice(0, 4), 'wall-one'), glossary(wallData.slice(4), 'wall-two')], { includeTeacherKey: true });
    expect(doc.body.getAttribute('data-alloflow-word-wall-print')).toBe('economical');
    expect(doc.querySelectorAll('.alloflow-word-wall-card')).toHaveLength(8);
    expect(doc.querySelectorAll('.alloflow-toc')).toHaveLength(1);
  });
  it('retains normal full-pack printing when a teacher answer appendix contains material', () => {
    const withKey = { ...glossary(wallData), gameData: { grid: [['W']], solutions: ['0-0'], words: ['Word'] } };
    const doc = pack([withKey], { includeTeacherKey: true });
    expect(doc.body.hasAttribute('data-alloflow-word-wall-print')).toBe(false);
    expect(doc.querySelector('.teacher-view #gloss-key')).not.toBeNull();
  });
  it('retains normal mixed-resource and worksheet printing', () => {
    const mixed = pack([glossary(wallData), { id: 'reading', type: 'simplified', title: 'Reading', data: 'Plants need sunlight.' }]);
    expect(mixed.body.hasAttribute('data-alloflow-word-wall-print')).toBe(false);
    expect(mixed.querySelector('#reading')).not.toBeNull();
    const worksheet = pack([glossary(wallData)], {}, true);
    expect(worksheet.body.hasAttribute('data-alloflow-word-wall-print')).toBe(false);
    expect(worksheet.querySelector('.worksheet-header')).not.toBeNull();
  });
});
