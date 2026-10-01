// Printable cloze worksheet (W5 / wave-2, built from Lane 3's L4 design).
//
// Drives the REAL built doc_pipeline module through the same headless factory seam
// tests/doc_pipeline_headless.test.js uses, with an injected state bag, so these are
// assertions about the shipped export path rather than about a mirrored copy.
//
// The two traps Lane 3 named from experience, both asserted here:
//   1. the blank keys to the text that was ACTUALLY replaced, not to the term implied
//      by the language setting (an English term sitting in a Spanish passage keys to
//      the English word);
//   2. the term boundary is \p{L}-based. A plain \b is ASCII-only in JS and produced a
//      passage with ZERO blanks for Russian, Arabic, Greek and CJK.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

const SPANISH_PASSAGE = [
  'La célula es la unidad basica de la vida.',
  'Cada célula tiene una membrana que la protege.',
  'El termino mitochondria todavia aparece en ingles en este parrafo.',
].join('\n\n');

const SPANISH_GLOSSARY = [
  { term: 'cell', def: 'The basic unit of life.', tier: 'Domain-Specific', translations: { Spanish: 'célula: la unidad basica de la vida' } },
  { term: 'membrane', def: 'The layer around a cell.', tier: 'Domain-Specific', translations: { Spanish: 'membrana: la capa que rodea la célula' } },
  { term: 'mitochondria', def: 'The part that releases energy.', tier: 'Domain-Specific', translations: { Spanish: 'mitocondria: la parte que libera energia' } },
];

const RUSSIAN_PASSAGE = 'Мозг управляет телом. Каждый мозг уникален.';
const RUSSIAN_GLOSSARY = [
  { term: 'brain', def: 'The organ that controls the body.', tier: 'Domain-Specific', translations: { Russian: 'мозг: орган, который управляет телом' } },
];

function makePipeline(leveledTextLanguage) {
  const factory = window.AlloModules.createDocPipeline;
  const stubModel = async () => '{}';
  return factory({
    callGemini: stubModel,
    callGeminiVision: stubModel,
    callImagen: async () => null,
    addToast: () => {},
    // The real t() returns undefined for a missing key (AlloFlowANTI.txt:4990), so the
    // English `|| fallback` is what actually renders until the keys land in ui_strings.
    t: () => undefined,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Leveled Text',
    state: { leveledTextLanguage, exportConfig: {}, currentUiLanguage: 'English' },
  });
}

function packItems(passage, glossary) {
  return [
    { id: 'simp-1', type: 'simplified', title: 'Leveled Text', data: passage },
    { id: 'gloss-1', type: 'glossary', title: 'Glossary', data: glossary },
  ];
}

const CFG_ON = { clozeWorksheet: true, includeTeacherKey: true, includeSimplified: true, includeGlossary: false };
const CFG_OFF = { clozeWorksheet: false, includeTeacherKey: true, includeSimplified: true, includeGlossary: false };

let esPipeline;
let ruPipeline;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  esPipeline = makePipeline('Spanish');
  ruPipeline = makePipeline('Russian');
});

describe('cloze worksheet: off by default and inert outside worksheet mode', () => {
  it('leaves the passage untouched when clozeWorksheet is false', () => {
    const html = esPipeline.generateFullPackHTML(packItems(SPANISH_PASSAGE, SPANISH_GLOSSARY), 'Celulas', true, {}, CFG_OFF);
    expect(html).not.toContain('alloflow-cloze-blank');
    expect(html).toContain('La célula es la unidad basica');
  });

  it('leaves the passage untouched in PDF (non-worksheet) mode even with the flag on', () => {
    const html = esPipeline.generateFullPackHTML(packItems(SPANISH_PASSAGE, SPANISH_GLOSSARY), 'Celulas', false, {}, CFG_ON);
    expect(html).not.toContain('alloflow-cloze-blank');
    expect(html).toContain('La célula es la unidad basica');
  });
});

describe('cloze worksheet: Spanish passage', () => {
  let html;
  beforeAll(() => { html = esPipeline.generateFullPackHTML(packItems(SPANISH_PASSAGE, SPANISH_GLOSSARY), 'Celulas', true, {}, CFG_ON); });

  it('blanks every glossary term occurrence, including the repeat', () => {
    const blanks = (html.match(/alloflow-cloze-blank/g) || []).length;
    // celula x2, membrana x1, mitochondria x1
    expect(blanks).toBe(4);
  });

  it('removes the blanked words from the passage prose', () => {
    const passageSection = html.split('Word Bank')[0];
    expect(passageSection).not.toContain('La célula es');
    expect(passageSection).not.toContain('una membrana que');
  });

  it('numbers the blanks so the answer key can be read against them', () => {
    expect(html).toContain('>1</span>');
    expect(html).toContain('>4</span>');
  });

  it('offers a word bank in the PASSAGE language, with the English kept beside it', () => {
    expect(html).toContain('Word Bank');
    expect(html).toContain('célula (cell)');
    expect(html).toContain('membrana (membrane)');
  });

  it('dedupes the word bank: a term used twice is offered once', () => {
    expect((html.match(/célula \(cell\)/g) || []).length).toBe(1);
  });

  it('TRAP 1 — an English term still sitting in the Spanish passage keys to the ENGLISH word', () => {
    // "mitochondria" appears in English in the passage. The blank must key to what it
    // replaced, not to "mitocondria", which is what the language setting implies.
    expect(html).toContain('mitochondria');
    expect(html).not.toContain('mitocondria (mitochondria)');
  });

  it('carries the student instruction line', () => {
    expect(html).toContain('Fill in each blank with the correct word from the word bank.');
  });

  it('renders no literal i18n keys (the export.cloze_* fallbacks resolve)', () => {
    expect(html).not.toContain('export.cloze_');
  });
});

describe('cloze worksheet: teacher answer key', () => {
  it('appears in the teacher copy and lists the replaced text in blank order', () => {
    const html = esPipeline.generateFullPackHTML(packItems(SPANISH_PASSAGE, SPANISH_GLOSSARY), 'Celulas', true, {}, CFG_ON);
    expect(html).toContain('Fill in the Blanks: Answer Key');
    const key = html.slice(html.indexOf('Fill in the Blanks: Answer Key'));
    const items = key.match(/<li[^>]*>(.*?)<\/li>/g) || [];
    expect(items.length).toBe(4);
    expect(items[0]).toContain('célula');
    expect(items[0]).toContain('(cell)'); // the English gloss rides along
    expect(items[3]).toContain('mitochondria');
  });

  it('is suppressed when the teacher key is off', () => {
    const html = esPipeline.generateFullPackHTML(packItems(SPANISH_PASSAGE, SPANISH_GLOSSARY), 'Celulas', true, {}, { ...CFG_ON, includeTeacherKey: false });
    expect(html).toContain('alloflow-cloze-blank');
    expect(html).not.toContain('Fill in the Blanks: Answer Key');
  });

  it('says so honestly when no glossary term appears in the passage', () => {
    const items = packItems('Este parrafo no menciona ningun termino del glosario.', SPANISH_GLOSSARY);
    const html = esPipeline.generateFullPackHTML(items, 'Celulas', true, {}, CFG_ON);
    expect(html).toContain('No glossary terms appear in this passage, so no blanks were made.');
    // and the student still gets a readable passage rather than a sheet with nothing to fill in
    expect(html).not.toContain('alloflow-cloze-blank');
    expect(html).toContain('Este parrafo no menciona');
  });
});

describe('cloze worksheet: TRAP 2 — non-ASCII boundaries', () => {
  it('blanks Cyrillic terms (a plain \\b matched nothing here)', () => {
    const html = ruPipeline.generateFullPackHTML(packItems(RUSSIAN_PASSAGE, RUSSIAN_GLOSSARY), 'Mozg', true, {}, CFG_ON);
    const blanks = (html.match(/alloflow-cloze-blank/g) || []).length;
    expect(blanks).toBe(2);
    expect(html).toContain('мозг (brain)');
  });
});

describe('cloze worksheet: the word bank is stable across the two render passes', () => {
  it('student copy and teacher key are generated from the same shuffle seed, not Math.random', () => {
    const items = packItems(SPANISH_PASSAGE, SPANISH_GLOSSARY);
    const a = esPipeline.generateFullPackHTML(items, 'Celulas', true, {}, CFG_ON);
    const b = esPipeline.generateFullPackHTML(items, 'Celulas', true, {}, CFG_ON);
    const bankOf = (html) => (html.match(/border-radius:9999px;padding:4px 12px;font-size:0\.95em;color:#1e293b;">([^<]*)</g) || []).join('|');
    expect(bankOf(a)).toBe(bankOf(b));
    expect(bankOf(a).length).toBeGreaterThan(0);
  });
});
