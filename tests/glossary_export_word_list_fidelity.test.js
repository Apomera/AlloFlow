import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let sourceFactory, runtimeFactory, priorLanguageHelpers;
beforeAll(() => {
  new Function(readFileSync('export_source.jsx', 'utf8'))(); sourceFactory = window.AlloModules.createExport;
  delete window.AlloModules.Export;
  new Function(readFileSync('export_module.js', 'utf8'))(); runtimeFactory = window.AlloModules.createExport;
});
beforeEach(() => {
  vi.useFakeTimers();
  priorLanguageHelpers = window.AlloModules.ModuleScopeExtras;
  delete window.AlloModules.ModuleScopeExtras;
});
afterEach(() => {
  document.querySelectorAll('.agx-overlay').forEach(node => node.remove());
  if (priorLanguageHelpers === undefined) delete window.AlloModules.ModuleScopeExtras;
  else window.AlloModules.ModuleScopeExtras = priorLanguageHelpers;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function exportContent(factory, data, format, back) {
  const files = [], addToast = vi.fn();
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fidelity');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const api = factory({ liveRef: { current: { generatedContent: { type: 'glossary', title: 'Vocabulary', data }, t: key => key, addToast } }, escapeXml: String });
  const result = format === 'language' || format === 'standard'
    ? api.handleExportFlashcards(format, { includeAudio: false, useReadingSettings: false })
    : api.handleExportGlossaryFile(format, { back });
  return { result, files, addToast, doc: () => new DOMParser().parseFromString(files.at(-1).text, 'text/html'),
    quizlet: () => document.querySelector('.agx-overlay textarea')?.value };
}
const entry = translation => ({ term: 'Leaf', def: 'A plant part.', translations: { Spanish: translation } });

describe.each(['edited source', 'generated runtime'])('Glossary export data fidelity: %s', implementation => {
  const factory = () => implementation === 'edited source' ? sourceFactory : runtimeFactory;
  it.each([
    'Hoja: Parte de una planta.',
    { term: 'Hoja', def: 'Parte de una planta.' },
    { word: 'Hoja', definition: 'Parte de una planta.' },
    { text: 'Hoja: Parte de una planta.' },
    { translation: 'Hoja: Parte de una planta.' },
    { text: '', term: 'Hoja', def: 'Parte de una planta.' },
    { text: { malformed: true }, translation: [], word: 'Hoja', definition: 'Parte de una planta.' },
    { term: {}, word: 'Hoja', def: [], meaning: 'Parte de una planta.' },
  ])('preserves the same usable structured translation across all four export paths: %j', translation => {
    const data = [entry(translation)];
    const csv = exportContent(factory(), data, 'csv');
    expect(csv.files[0].text).toContain('Hoja: Parte de una planta.');
    const anki = exportContent(factory(), data, 'anki', 'Spanish');
    expect(anki.files[0].text).toContain('Leaf\tHoja: Parte de una planta.\t');
    const quizlet = exportContent(factory(), data, 'quizlet', 'Spanish');
    expect(quizlet.quizlet()).toBe('Leaf\tHoja: Parte de una planta.');
    const cards = exportContent(factory(), data, 'language');
    expect(cards.doc().querySelector('.back .primary-text').textContent).toBe('Hoja');
    expect(cards.doc().querySelector('.back .def-text').textContent).toBe('Parte de una planta.');
    expect([csv.files[0].text, anki.files[0].text, quizlet.quizlet(), cards.files[0].text].join('\n')).not.toContain('[object Object]');
  });

  it.each(['anki', 'quizlet'])('does not silently turn a missing requested translation into an English %s back', format => {
    const run = exportContent(factory(), [entry({ text: {} })], format, 'Spanish');
    expect(run.result).toBe(false);
    expect(run.files).toHaveLength(0);
    expect(run.quizlet()).toBeUndefined();
    expect(run.addToast).toHaveBeenCalledWith('No usable Spanish translations are available. Choose a different card back.', 'info');
  });

  it('retains intentional definition exports when no translation back was requested', () => {
    const run = exportContent(factory(), [entry({ text: {} })], 'anki');
    expect(run.result).toBe(true);
    expect(run.files[0].text).toContain('Leaf\tA plant part.\t');
  });

  it.each(['anki', 'quizlet'])('omits incomplete %s pairs and reports the actual missing count', format => {
    const run = exportContent(factory(), [entry('Hoja'), { term: 'Root', def: 'English root definition.', translations: { Spanish: { text: {} } } }], format, 'Spanish');
    const text = format === 'anki' ? run.files[0].text : run.quizlet();
    expect(text).toContain('Leaf\tHoja');
    expect(text).not.toContain('Root');
    expect(text).not.toContain('[object Object]');
    expect(run.addToast).toHaveBeenCalledWith('1 card was skipped because its selected back is missing.', 'info');
  });

  it('quotes meaningful hash-prefixed Anki terms without changing their text', () => {
    const run = exportContent(factory(), [{ term: '#include', def: 'A C preprocessor directive.' }, { term: '#define "SIZE"', def: 'Defines a macro.' }], 'anki');
    const dataLines = run.files[0].text.split('\n').slice(4).filter(Boolean);
    expect(dataLines).toEqual(['"#include"\tA C preprocessor directive.\t', '"#define ""SIZE"""\tDefines a macro.\t']);
    expect(dataLines.some(line => line.startsWith('#'))).toBe(false);
  });

  it('preserves literal operators and inline code while removing balanced emphasis', () => {
    const data = [{ term: '**', def: 'The expression 2 ** 3 equals 8.' }, { term: '**Power**', def: '**2** *cubed*; `**literal**` stays literal.' }];
    const csv = exportContent(factory(), data, 'csv');
    expect(csv.files[0].text).toContain('**,The expression 2 ** 3 equals 8.');
    expect(csv.files[0].text).toContain('Power,2 cubed; **literal** stays literal.');
    const anki = exportContent(factory(), data, 'anki');
    expect(anki.files[0].text).toContain('**\tThe expression 2 ** 3 equals 8.');
    const quizlet = exportContent(factory(), data, 'quizlet');
    expect(quizlet.quizlet()).toContain('**\tThe expression 2 ** 3 equals 8.');
    const cards = exportContent(factory(), [entry('**')], 'language');
    expect(cards.doc().querySelector('.back .def-text').textContent).toBe('**');
  });

  it.each(['language', 'standard'])('labels term and definition languages independently in %s cards without helper modules', mode => {
    const run = exportContent(factory(), [{ term: 'ورقة', termLanguage: 'Arabic', def: 'Parte de una planta.', definitionLanguage: 'Spanish', translations: { French: 'Feuille: Une partie de la plante.' } }], mode);
    const doc = run.doc(), term = doc.querySelector('.front .primary-text');
    expect(term.lang).toBe('ar'); expect(term.dir).toBe('rtl');
    expect(doc.querySelector('.front .lang-label').textContent).toBe('Arabic');
    const definition = mode === 'language' ? doc.querySelector('.front .def-text') : doc.querySelector('.back .def-text span');
    expect(definition.lang).toBe('es'); expect(definition.dir).toBe('ltr');
    expect(definition.textContent).toBe('Parte de una planta.');
    if (mode === 'language') {
      expect([...doc.querySelectorAll('.front .lang-label')].map(node => node.textContent)).toEqual(['Arabic', 'Spanish']);
      expect(doc.querySelector('.set-header').textContent).toContain('Arabic ⟷ French');
    } else expect(doc.querySelector('.back .def-text strong').textContent).toBe('Spanish:');
  });

  it('preserves empty template literals and unmatched backtick runs in every word-list format', () => {
    const data = [{ term: '``', def: 'const text = ``;' }, { term: '```', def: 'Unmatched ` and **bold** remain useful.' }];
    const csv = exportContent(factory(), data, 'csv');
    expect(csv.files[0].text).toContain('``,const text = ``;');
    expect(csv.files[0].text).toContain('```,Unmatched ` and bold remain useful.');
    const anki = exportContent(factory(), data, 'anki');
    expect(anki.files[0].text).toContain('``\tconst text = ``;');
    expect(anki.files[0].text).toContain('```\tUnmatched ` and bold remain useful.');
    const quizlet = exportContent(factory(), data, 'quizlet');
    expect(quizlet.quizlet()).toBe('``\tconst text = ``;\n```\tUnmatched ` and bold remain useful.');
    const cards = exportContent(factory(), [entry('``')], 'language');
    expect(cards.doc().querySelector('.back .def-text').textContent).toBe('``');
  });

  it('preserves inner backticks inside code spans with complete outer delimiter runs', () => {
    const data = [{ term: 'Code', def: 'Use `` `value` `` and `2 ** 3`; **bold** stays readable.' }];
    const csv = exportContent(factory(), data, 'csv');
    expect(csv.files[0].text).toContain('Use  `value`  and 2 ** 3; bold stays readable.');
    const anki = exportContent(factory(), data, 'anki');
    expect(anki.files[0].text).toContain('Code\tUse `value` and 2 ** 3; bold stays readable.');
    const cards = exportContent(factory(), [{ term: 'Code', def: data[0].def }], 'standard');
    expect(cards.doc().querySelector('.back .def-text span').textContent).toBe('Use  `value`  and 2 ** 3; bold stays readable.');
  });


  it('keeps an unknown source language automatic when a host resolver defaults it to English', () => {
    window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: () => 'en-US', isRtlLang: () => false };
    const run = exportContent(factory(), [{ term: 'A word', termLanguage: 'Unlisted language', def: 'A definition.', definitionLanguage: 'es-MX', translations: { French: 'Un mot' } }], 'language');
    const doc = run.doc();
    expect(doc.querySelector('.front .primary-text').hasAttribute('lang')).toBe(false);
    expect(doc.querySelector('.front .primary-text').dir).toBe('auto');
    expect(doc.querySelector('.front .def-text').lang).toBe('es-MX');
    expect(doc.querySelector('.front .lang-label').textContent).toBe('Unlisted language');
  });
});
