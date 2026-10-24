import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
let views, sharedNormalizer;
const cleanups = [];
beforeAll(() => {
  window.React = React;
  new Function(readFileSync('read_aloud_audio_service_source.jsx', 'utf8'))();
  sharedNormalizer = window.AlloModules.normalizeGlossaryTranslation;
  const source = readFileSync('glossary_image_controls_source.jsx', 'utf8') + '\n' + readFileSync('view_glossary_source.jsx', 'utf8');
  const compiled = babel.transformSync(source, { plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false }).code;
  const sourceView = new Function('React', 'Fragment', compiled + '\nreturn GlossaryView;')(React, React.Fragment);
  delete window.AlloModules.GlossaryView;
  new Function(readFileSync('view_glossary_module.js', 'utf8'))();
  views = { source: sourceView, runtime: window.AlloModules.GlossaryView };
}, 60000);
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  delete window.__alloResolveGlossaryAudio; delete window.__alloOpenWordPractice;
  window.AlloModules.normalizeGlossaryTranslation = sharedNormalizer;
  vi.restoreAllMocks();
});
const text = 'Feuille: Une partie de la plante.';
const shapes = [
  { word: 'Feuille', definition: 'Une partie de la plante.' },
  { text: '', term: 'Feuille', def: 'Une partie de la plante.' },
  { text: { invalid: true }, term: 'Feuille', def: 'Une partie de la plante.' },
];
const t = key => ({ 'glossary.more_tools': 'More tools' }[key] || key);
function mount(implementation, translation, overrides = {}) {
  const base = glossaryMediaProps(), data = [{ ...base.generatedContent.data[0], translations: { French: translation } }];
  const props = glossaryMediaProps({ t, generatedContent: { ...base.generatedContent, data }, handleSpeak: vi.fn(), handleDownloadAudio: vi.fn(), ...overrides });
  props.filteredGlossaryData = props.generatedContent.data.map((item, _originalIdx) => ({ ...item, _originalIdx }));
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(views[implementation], props)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, props };
}
const click = async button => { expect(button).toBeTruthy(); await act(async () => button.click()); };

describe.each(['source', 'runtime'])('Live structured glossary translation: %s', implementation => {
  it.each(shapes)('renders and reads usable translation fields before the audio helper loads: %j', async translation => {
    delete window.AlloModules.normalizeGlossaryTranslation;
    const view = mount(implementation, translation);
    expect(view.container.textContent).toContain(text);
    expect(view.container.textContent).not.toContain('[object Object]');
    const toolbar = view.container.querySelector('[role="toolbar"][aria-label="French actions for Leaf"]');
    await click(toolbar?.querySelectorAll('button')[0]);
    expect(view.props.handleSpeak).toHaveBeenCalledWith(text, 'trans-0-French');
    await click(toolbar?.querySelectorAll('button')[1]);
    expect(view.props.handleDownloadAudio).toHaveBeenCalledWith(text, 'trans-0-French-audio', 'dl-trans-0-French');
    expect(view.props.generatedContent.data[0].translations.French).toEqual(translation);
  });
  it('sends the canonical string to saved-audio playback and retains structured source metadata', async () => {
    window.AlloModules.normalizeGlossaryTranslation = sharedNormalizer;
    window.__alloResolveGlossaryAudio = vi.fn(async () => null);
    const translation = shapes[2], view = mount(implementation, translation);
    const toolbar = view.container.querySelector('[role="toolbar"][aria-label="French actions for Leaf"]');
    await click(toolbar?.querySelectorAll('button')[0]);
    expect(window.__alloResolveGlossaryAudio).toHaveBeenCalledWith(expect.objectContaining({ field: 'translation', language: 'French', spokenText: text }), { reason: 'glossary-playback' });
    expect(view.props.generatedContent.data[0].translations.French).toEqual(translation);
  });
  it('shows an editable string without persisting a flattened translation on render', () => {
    const translation = shapes[0], view = mount(implementation, translation, { isEditingGlossary: true });
    const input = view.container.querySelector('textarea[aria-label="Edit French translation for Leaf"]');
    expect(input?.value).toBe(text);
    expect(view.props.generatedContent.data[0].translations.French).toEqual(translation);
    expect(view.container.textContent).not.toContain('[object Object]');
  });
  it('uses the same normalized content in interactive language-card display', () => {
    const view = mount(implementation, shapes[1], { isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'French', isFlashcardFlipped: true, isFlashcardQuizMode: false });
    const back = view.container.querySelector('[data-flashcard-face="back"]');
    expect(back?.textContent).toContain('Feuille');
    expect(back?.textContent).toContain('Une partie de la plante.');
    expect(back?.textContent).not.toContain('[object Object]');
  });
  it('passes the UI locale separately from the teaching language to Present & Export', async () => {
    window.__alloOpenWordPractice = vi.fn(async () => ({}));
    const view = mount(implementation, shapes[0], { currentUiLanguage: 'Spanish' });
    await click([...view.container.querySelectorAll('button')].find(button => button.textContent.includes('More tools')));
    await click(view.container.querySelector('button[aria-describedby="glossary-presentation-help"]'));
    expect(window.__alloOpenWordPractice).toHaveBeenCalledWith(expect.objectContaining({ currentUiLanguage: 'Spanish', language: 'English' }));
  });
});
