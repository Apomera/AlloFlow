import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let sourceFactory, runtimeFactory;
beforeAll(() => {
  new Function(readFileSync('export_source.jsx', 'utf8'))(); sourceFactory = window.AlloModules.createExport;
  // Test the shipped implementation independently of the edited source.
  const prior = window.AlloModules.Export; delete window.AlloModules.Export;
  new Function(readFileSync('export_module.js', 'utf8'))(); runtimeFactory = window.AlloModules.createExport;
  if (prior) window.AlloModules.Export = prior;
});
afterEach(() => { document.querySelectorAll('.agx-overlay').forEach(node => node.remove()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const words = () => [
  { entryId: 'leaf', term: 'Leaf', def: 'A plant part.', translations: { Spanish: 'Hoja: Parte de una planta.' } },
  { entryId: 'root', term: 'Root', def: 'The part under the ground.', translations: { French: 'Racine: Partie sous la terre.' } },
];
function exportCards(factory, data, mode = 'language', extra = {}, options = { includeAudio: false, useReadingSettings: false }) {
  const files = [], addToast = vi.fn();
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:translation-test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const api = factory({ liveRef: { current: { generatedContent: { id: 'translation-deck', type: 'glossary', data, ...extra }, addToast, t: key => key } }, escapeXml: String });
  api.handleExportFlashcards(mode, options);
  return { api, files, addToast, document: () => new DOMParser().parseFromString(files.at(-1).text, 'text/html') };
}
describe.each(['edited source', 'generated runtime'])('Language-card export integrity: %s', implementation => {
  const factory = () => implementation === 'edited source' ? sourceFactory : runtimeFactory;
  it('exports usable language pairs without blank backs and reports skipped pairs', () => {
    const run = exportCards(factory(), words());
    const cards = [...run.document().querySelectorAll('.card-container')];
    expect(cards).toHaveLength(2);
    expect(cards.map(card => card.querySelector('.front .primary-text').textContent)).toEqual(['Leaf', 'Root']);
    expect(cards.map(card => card.querySelector('.back .primary-text').textContent)).toEqual(['Hoja', 'Racine']);
    expect(run.addToast).toHaveBeenCalledWith('2 cards were skipped because their translations are missing.', 'info');
  });
  it.each([
    [{ term: 'Hoja', def: 'Parte de una planta.' }, 'Hoja', 'Parte de una planta.'],
    [{ text: 'Hoja：Parte de una planta.' }, 'Hoja', 'Parte de una planta.'],
    [{ translation: 'Hoja: Parte de una planta.' }, 'Hoja', 'Parte de una planta.'],
    [{ word: 'Hoja', definition: 'Parte de una planta.' }, 'Hoja', 'Parte de una planta.'],
    ['Hoja', '', 'Hoja'],
  ])('renders supported translation shape %j without object strings', (translation, term, definition) => {
    const run = exportCards(factory(), [{ ...words()[0], translations: { Spanish: translation } }]);
    const doc = run.document();
    expect(doc.querySelector('.back .primary-text').textContent).toBe(term);
    expect(doc.querySelector('.back .def-text').textContent).toBe(definition);
    expect(doc.body.textContent).not.toContain('[object Object]');
    expect(run.addToast).not.toHaveBeenCalled();
  });
  it('does not create language sets for blank or malformed translations', () => {
    // A bare ** is a valid programming operator, so it is no longer treated
    // as empty formatting. Use genuinely blank text for an absent translation.
    const data = words(); data[0].translations = { Spanish: '   ', Blank: '\n\t ', Invalid: { text: {} } };
    const run = exportCards(factory(), data);
    expect(run.document().querySelectorAll('.card-container')).toHaveLength(1);
    expect(run.document().querySelector('.back .primary-text').textContent).toBe('Racine');
    expect(run.addToast).toHaveBeenCalledWith('1 card was skipped because its translation is missing.', 'info');
  });
  it('keeps every base term in standard decks even when translations are incomplete', () => {
    const run = exportCards(factory(), words(), 'standard');
    expect(run.document().querySelectorAll('.card-container')).toHaveLength(4);
    expect(run.addToast).not.toHaveBeenCalled();
  });
  it('keeps the existing no-translations path without an empty download', () => {
    const run = exportCards(factory(), [{ ...words()[0], translations: { Spanish: ' ', Invalid: [] } }]);
    expect(run.files).toHaveLength(0);
    expect(run.addToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
  it('uses the same structured translation text for prepared audio and visible content', () => {
    const clip = Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
    const run = exportCards(factory(), [{ ...words()[0], translations: { Spanish: { term: 'Hoja', def: 'Parte de una planta.' } } }], 'language', {
      karaokeAudio: { version: 4, entries: { translation: { audio: clip, mime: 'audio/wav', identity: { adapterId: 'alloflow.glossary.read-aloud', scopeId: 'main', segmentId: 'entry/leaf/translation/spanish', spokenText: 'Hoja: Parte de una planta.' } } } },
    }, { includeAudio: true, useReadingSettings: false });
    const doc = run.document();
    expect(doc.querySelector('.back [data-card-audio]')).toBeTruthy();
    expect(doc.querySelector('.back .primary-text').textContent).toBe('Hoja');
    expect(JSON.parse(doc.getElementById('card-audio-data').textContent)).toEqual({ a0: 'data:audio/wav;base64,' + clip });
  });
});
