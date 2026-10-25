import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
let view, exportFactory;
const cleanups = [];
beforeAll(() => {
  window.React = React;
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('view_glossary_module.js');
  view = window.AlloModules.GlossaryView;
  new Function(readFileSync('export_module.js', 'utf8'))();
  exportFactory = window.AlloModules.createExport;
});
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  delete window.__alloResolveGlossaryAudio;
  delete window.AlloDictionary;
  document.querySelectorAll('.agx-overlay').forEach(node => node.remove());
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const resource = (extra = {}, entry = {}) => ({ id: 'saved-glossary', type: 'glossary', title: 'Saved vocabulary',
  config: { language: 'Spanish' }, data: [{ entryId: 'bread', term: 'Pain', def: 'Un aliment.', translations: {}, ...entry }], ...extra });
function mount(saved, extra = {}) {
  const props = glossaryMediaProps({ generatedContent: saved,
    filteredGlossaryData: saved.data.map((item, index) => ({ ...item, _originalIdx: index })),
    currentUiLanguage: 'Arabic', leveledTextLanguage: 'Arabic', handleSpeak: vi.fn(), handleDownloadAudio: vi.fn(), ...extra });
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(view, props)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, props };
}
async function click(container, label) {
  const button = [...container.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === label);
  expect(button).toBeTruthy();
  await act(async () => button.click());
}

describe('saved native glossary speech and English language services', () => {
  it('uses saved artifact base language for live speech and downloads after app defaults change', async () => {
    const saved = resource({ baseLanguage: 'French' });
    const { container, props } = mount(saved);
    await click(container, 'Read term: Pain');
    expect(props.handleSpeak).toHaveBeenCalledWith('Pain', 'term-0', 0, false, 'French');
    await click(container, 'Read definition for Pain');
    expect(props.handleSpeak).toHaveBeenCalledWith('Pain: Un aliment.', 'def-0', 0, false, 'French');
    await click(container, 'Download audio for term: Pain');
    expect(props.handleDownloadAudio).toHaveBeenCalledWith('Pain', 'term-0-audio', 'dl-term-0', 'French');
  });

  it('retains independent term and definition languages in saved-audio lookups', async () => {
    window.__alloResolveGlossaryAudio = vi.fn(async () => null);
    const { container, props } = mount(resource({}, { termLanguage: 'Spanish', definitionLanguage: 'French' }));
    await click(container, 'Read term: Pain');
    await click(container, 'Read definition for Pain');
    expect(window.__alloResolveGlossaryAudio.mock.calls.map(([request]) => request.language)).toEqual(['Spanish', 'French']);
    expect(props.handleSpeak).toHaveBeenLastCalledWith('Pain: Un aliment.', 'def-0', 0, false, 'French');
  });

  it('keeps a legacy English base despite an old translation destination and current Arabic defaults', async () => {
    window.__alloResolveGlossaryAudio = vi.fn(async () => null);
    const saved = resource({ language: 'Spanish' }, { term: 'Leaf', def: 'Part of a plant.' });
    const { container, props } = mount(saved);
    await click(container, 'Read term: Leaf');
    expect(window.__alloResolveGlossaryAudio).toHaveBeenCalledWith(expect.objectContaining({ language: 'English' }), { reason: 'glossary-playback' });
    expect(props.handleSpeak).toHaveBeenCalledWith('Leaf', 'term-0');
  });

  it('withholds English dictionary enrichment and phonics for a non-English base', () => {
    window.AlloDictionary = { getCached: vi.fn(() => ({ word: 'Pain', meanings: [{ definitions: [{ definition: 'A hurtful sensation.' }] }] })) };
    const { container } = mount(resource({ baseLanguage: 'French' }), { isInteractiveFlashcards: true, isFlashcardFlipped: true, handlePhonicsClick: vi.fn() });
    expect(window.AlloDictionary.getCached).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('A hurtful sensation.');
    expect([...container.querySelectorAll('button')].some(node => node.textContent.trim() === 'Aa')).toBe(false);
    expect(container.textContent).toContain('French');
  });
});

function exportDocument(saved) {
  const files = [];
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:native-glossary');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  exportFactory({ liveRef: { current: { generatedContent: saved, currentUiLanguage: 'Arabic', leveledTextLanguage: 'Arabic', t: key => key, addToast() {} } }, escapeXml: String })
    .handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: false });
  return new DOMParser().parseFromString(files.at(-1).text, 'text/html');
}
describe('native and legacy glossary export language metadata', () => {
  it('exports artifact-only native base metadata without requiring per-row duplication', () => {
    const doc = exportDocument(resource({ baseLanguage: 'French' }));
    expect(doc.querySelector('.front .primary-text').getAttribute('lang')).toBe('fr');
    expect(doc.querySelector('.back .def-text span[lang]').getAttribute('lang')).toBe('fr');
  });

  it('preserves the English base of legacy translated glossaries', () => {
    const doc = exportDocument(resource({ language: 'Spanish' }, { term: 'Leaf', def: 'Part of a plant.' }));
    expect(doc.querySelector('.front .primary-text').getAttribute('lang')).toBe('en');
    expect(doc.querySelector('.back .def-text span[lang]').getAttribute('lang')).toBe('en');
  });
});
