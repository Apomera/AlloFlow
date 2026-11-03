import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { core as soundsCore } from './helpers/word_sounds_core.js';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const babel = require('@babel/core');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = readFileSync('view_word_sounds_preview_source.jsx', 'utf8');
const compiled = babel.transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
const Icon = () => React.createElement('span');
const Preview = new Function('React', 'BookOpen', 'Play', compiled + '\nreturn WordSoundsPreviewView;')(React, Icon, Icon);
const setupSource = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const selectionStart = setupSource.indexOf('function buildWordPracticeSelection(');
const selectionEnd = setupSource.indexOf('const WordSoundsGenerator =', selectionStart);
const buildSelection = new Function('WS_CORE', setupSource.slice(selectionStart, selectionEnd) + '\nreturn buildWordPracticeSelection;')(soundsCore);
const setupHandlerStart = setupSource.indexOf('const openWordPractice = async () =>');
const setupHandlerEnd = setupSource.indexOf('const startRunRef =', setupHandlerStart);
function setupHandler(overrides = {}) {
  const deps = { isTeacherMode: true, isProbeMode: false, sessionType: 'practice', wordPracticeControllerRef: { current: null }, setWordPracticeStatus: vi.fn(), buildWordPracticeSelection: buildSelection, previewList: ['cat', 'ship'], selectedIndices: new Set([1]), includeGlossary: true, glossaryTerms: [], preloadedWords: [], preparedSessionConfig: {}, tf: (_key, fallback) => fallback, wordSoundsLanguage: 'English', currentUiLanguage: 'French', callTTS: vi.fn(), selectedVoice: 'teacher', ttsSpeed: 0.75, t: key => key, ...overrides };
  return { deps, open: new Function(...Object.keys(deps), setupSource.slice(setupHandlerStart, setupHandlerEnd) + '\nreturn openWordPractice;')(...Object.values(deps)) };
}
let mounted;

function properties(extra = {}) {
  return {
    generatedContent: { type: 'word-sounds', id: 'lesson-1', title: 'Short vowels', data: [{ word: 'cat' }], sessionConfig: { language: 'English' } },
    isTeacherMode: true, wsActivitySequence: ['counting'], t: key => key, currentUiLanguage: 'French',
    setWordSoundsActivity: vi.fn(), setIsWordSoundsMode: vi.fn(), setWordSoundsAutoReview: vi.fn(),
    ...extra,
  };
}
function mount(props) {
  const element = document.createElement('div'); document.body.appendChild(element);
  const root = createRoot(element); act(() => root.render(React.createElement(Preview, props)));
  mounted = { root, element };
  return { element, render: next => act(() => root.render(React.createElement(Preview, next))) };
}
function button(element, text = 'Present & Export') { return [...element.querySelectorAll('button')].find(item => item.textContent.includes(text)); }
function click(target) { act(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }
async function settle() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
function unmount() { if (mounted) { act(() => mounted.root.unmount()); mounted.element.remove(); mounted = null; } }
beforeEach(() => { window.AlloModules = {}; window.__alloOpenWordPractice = vi.fn().mockResolvedValue({ close() {} }); });
afterEach(() => { unmount(); delete window.__alloOpenWordPractice; vi.restoreAllMocks(); });

describe('Word Sounds presentation entry', () => {
  it('opens only after a click and carries the actual prepared words and voice settings', async () => {
    const words = [{ word: 'ship', phonemes: ['sh', 'i', 'p'], activityItems: { read_sentence: { sentence: 'A ship sails.', before: 'A ', after: ' sails.', options: ['ship', 'rain'] } }, _ttsAssets: { ship: { mime: 'audio/wav', base64: 'Y2xpcA==' } } }];
    const callTTS = vi.fn();
    const input = properties({ callTTS, selectedVoice: 'teacher', ttsSpeed: 0.85 });
    input.generatedContent.wsPreloadedWords = words;
    const before = JSON.stringify(input.generatedContent);
    const { element } = mount(input);
    expect(window.__alloOpenWordPractice).not.toHaveBeenCalled();
    click(button(element)); await settle();
    expect(window.__alloOpenWordPractice).toHaveBeenCalledTimes(1);
    expect(window.__alloOpenWordPractice).toHaveBeenCalledWith(expect.objectContaining({ words, callTTS, selectedVoice: 'teacher', ttsSpeed: 0.85, source: 'word-sounds', title: 'Short vowels', language: 'English', currentUiLanguage: 'French' }));
    expect(window.__alloOpenWordPractice.mock.calls[0][0].signal.aborted).toBe(false);
    expect(JSON.stringify(input.generatedContent)).toBe(before);
    expect(input.setIsWordSoundsMode).not.toHaveBeenCalled();
  });

  it('uses prepared data when wsPreloadedWords is empty and retains lesson language', async () => {
    const input = properties({ wordSoundsLanguage: 'English' });
    input.generatedContent.wsPreloadedWords = [];
    input.generatedContent.sessionConfig.language = 'Spanish';
    const { element } = mount(input); click(button(element)); await settle();
    expect(window.__alloOpenWordPractice).toHaveBeenCalledWith(expect.objectContaining({ words: input.generatedContent.data, language: 'Spanish' }));
  });

  it('hides presentation entry from learners and assessment resources', () => {
    const input = properties({ isTeacherMode: false });
    const { element, render } = mount(input); expect(button(element)).toBeUndefined();
    render(properties({ generatedContent: { ...input.generatedContent, sessionConfig: { fixedForm: true } } }));
    expect(button(element)).toBeUndefined();
    render(properties({ generatedContent: { ...input.generatedContent, sessionConfig: { studentLocked: true } } }));
    expect(button(element)).toBeUndefined();
    expect(window.__alloOpenWordPractice).not.toHaveBeenCalled();
  });

  it('prevents duplicate loading and aborts pending launch when the preview closes', () => {
    window.__alloOpenWordPractice.mockImplementation(() => new Promise(() => {}));
    const { element } = mount(properties()); const action = button(element); click(action); click(action);
    expect(window.__alloOpenWordPractice).toHaveBeenCalledTimes(1);
    expect(action.disabled).toBe(true); expect(action.getAttribute('aria-busy')).toBe('true');
    const signal = window.__alloOpenWordPractice.mock.calls[0][0].signal;
    unmount(); expect(signal.aborted).toBe(true);
  });

  it('aborts a stale load on lesson or role change without surfacing its late error', async () => {
    let rejectOld;
    window.__alloOpenWordPractice.mockImplementation(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    const input = properties(), { element, render } = mount(input); click(button(element));
    const signal = window.__alloOpenWordPractice.mock.calls[0][0].signal;
    render({ ...input, generatedContent: { ...input.generatedContent, id: 'lesson-2' } });
    expect(signal.aborted).toBe(true); expect(button(element).disabled).toBe(false);
    await act(async () => rejectOld(new Error('old failure')));
    expect(element.textContent).not.toContain('could not open');
    click(button(element));
    const nextSignal = window.__alloOpenWordPractice.mock.calls[1][0].signal;
    render({ ...input, isTeacherMode: false });
    expect(nextSignal.aborted).toBe(true); expect(button(element)).toBeUndefined();
  });

  it('reports a recoverable loader failure and supports retry', async () => {
    window.__alloOpenWordPractice.mockRejectedValueOnce(new Error('network unavailable'));
    const { element } = mount(properties()); click(button(element)); await settle();
    expect(element.textContent).toContain('Presentation tools could not open. Please try again.');
    expect(button(element).disabled).toBe(false);
    click(button(element)); await settle();
    expect(window.__alloOpenWordPractice).toHaveBeenCalledTimes(2);
    expect(element.textContent).not.toContain('could not open');
  });
});

describe('Word Sounds selected presentation words', () => {
  it('opens only selected words through the setup action without preparing activities', async () => {
    const { deps, open } = setupHandler(); await open();
    expect(window.__alloOpenWordPractice).toHaveBeenCalledWith(expect.objectContaining({ words: [{ word: 'ship' }], callTTS: deps.callTTS, ttsSpeed: 0.75, language: 'English', currentUiLanguage: 'French' }));
    expect(deps.wordPracticeControllerRef.current).toBeNull();
  });

  it('blocks setup presentation actions for students and probes, even when invoked directly', async () => {
    for (const options of [{ isTeacherMode: false }, { isProbeMode: true }, { sessionType: 'assessment' }]) {
      const { open, deps } = setupHandler(options); await open(); expect(deps.setWordPracticeStatus).not.toHaveBeenCalled();
    }
    expect(window.__alloOpenWordPractice).not.toHaveBeenCalled();
  });

  it('retains glossary meaning and prepared phonemes and activities without mutating the source', () => {
    const glossary = [{ term: 'Ship', def: 'A large boat', translations: { Spanish: { term: 'barco' } } }];
    const prepared = [{ targetWord: 'ship', phonemes: ['sh', 'i', 'p'], activityItems: { read_sentence: { sentence: 'The ship sails.' } } }];
    const before = JSON.stringify({ glossary, prepared });
    const result = buildSelection(['Ship', 'rain'], glossary, prepared);
    expect(result.words[0]).toMatchObject({ word: 'Ship', def: 'A large boat', translations: glossary[0].translations, phonemes: prepared[0].phonemes, activityItems: prepared[0].activityItems });
    expect(result.words[1]).toEqual({ word: 'rain' });
    expect(JSON.stringify({ glossary, prepared })).toBe(before);
  });

  it('preserves a shared clip stored on a word outside the teacher selection', () => {
    const audio = { mime: 'audio/wav', base64: 'Y2xpcA==' };
    const result = buildSelection(['ship'], [], [{ word: 'rain', _ttsAssets: { ship: audio } }, { word: 'ship', phonemes: ['sh', 'i', 'p'] }]);
    expect(result.words).toHaveLength(1); expect(result.words[0].word).toBe('ship');
    expect(result.ttsAssets.ship).toBe(audio);
  });

  it('allows a blank presentation setup and normalizes multilingual matching', () => {
    expect(buildSelection([], undefined, undefined)).toEqual({ words: [], ttsAssets: {} });
    expect(buildSelection(['café au lait'], [{ term: 'CAFE\u0301  AU LAIT', def: 'Coffee with milk' }], []).words[0].def).toBe('Coffee with milk');
  });

  it('passes both languages of a selected spelling with their own meanings, IDs and prepared activities', async () => {
    const glossaryTerms = [{ entryId: 'present', term: 'gift', termLanguage: 'English', def: 'A present.' }, { entryId: 'poison', term: 'Gift', termLanguage: 'German', def: 'A poison.' }];
    const preloadedWords = [{ targetWord: 'gift', phonemes: ['g', 'i', 'f', 't'], activityItems: { read_sentence: { before: 'Das ', after: ' ist gefährlich.' } } }];
    const before = JSON.stringify([glossaryTerms, preloadedWords]);
    const { open } = setupHandler({ glossaryTerms, preloadedWords, preparedSessionConfig: { language: 'de-DE' }, previewList: ['tree', 'gift', 'skip'], selectedIndices: new Set([0, 1]) });
    await open();
    const pack = window.__alloOpenWordPractice.mock.calls[0][0];
    expect(pack.words.map(record => record.word)).toEqual(['tree', 'gift', 'Gift']);
    expect(pack.words[1]).toMatchObject({ entryId: 'present', termLanguage: 'English', def: 'A present.' });
    expect(pack.words[1].phonemes).toBeUndefined(); expect(pack.words[1].activityItems).toBeUndefined();
    expect(pack.words[2]).toMatchObject({ entryId: 'poison', termLanguage: 'German', def: 'A poison.', phonemes: preloadedWords[0].phonemes, activityItems: preloadedWords[0].activityItems });
    expect(JSON.stringify([glossaryTerms, preloadedWords])).toBe(before);
  });

  it('merges prepared records into the matching authored meaning, and keeps ambiguous prepared content independent', () => {
    const glossary = [{ entryId: 'river', term: 'bank', def: 'The side of a river.' }, { entryId: 'finance', term: 'bank', def: 'A financial institution.' }];
    const board = { read_sentence: { before: 'The ', after: ' accepts deposits.' } };
    const result = buildSelection(['bank'], glossary, [{ id: 'entry:finance', word: 'bank', activityItems: board }, { word: 'bank', phonemes: ['b', 'a', 'nk'] }]);
    expect(result.words).toHaveLength(3);
    expect(result.words[0]).toMatchObject({ entryId: 'river', def: glossary[0].def });
    expect(result.words[1]).toMatchObject({ entryId: 'finance', def: glossary[1].def, activityItems: board });
    expect(result.words[0].activityItems).toBeUndefined(); expect(result.words[1].phonemes).toBeUndefined();
    expect(result.words[2]).toMatchObject({ word: 'bank', phonemes: ['b', 'a', 'nk'] }); expect(result.words[2].entryId).toBeUndefined();
    expect(buildSelection(['bank'], glossary, ['bank']).words).toHaveLength(2);
  });

  it('opens distinct legacy glossary rows with stable IDs, field languages, and only matching prepared sounds', async () => {
    const glossaryTerms = [
      { term: 'vol', baseLanguage: 'French', def: 'Voyage dans les airs.' },
      { term: 'vol', baseLanguage: 'French', def: 'Action de voler un bien.' },
      { term: 'vol', glossaryEntryId: 42, baseLanguage: 'French', definitionLanguage: 'German', def: 'Eine Flugreise.' },
      { term: 'autre', id: 'glossary-row-0' },
      { term: 'pain', baseLanguage: 'English', termLanguage: 'French', def: 'Bread.' },
    ];
    const preloadedWords = [{ word: 'vol', id: 'entry:42', phonemes: ['v', 'ol'] }, { word: 'pain', phonemes: ['p', 'ain'] }];
    const { open } = setupHandler({ glossaryTerms, preloadedWords, preparedSessionConfig: { language: 'fr-FR' },
      previewList: ['pain', 'vol'], selectedIndices: new Set([0, 1]) });
    await open();
    const core = new Function('window', readFileSync('word_practice_core.js', 'utf8') + '\nreturn window.AlloWordPracticeCore;')({});
    const items = core.normalizeInput(window.__alloOpenWordPractice.mock.calls[0][0]).items;
    expect(items.map(row => [row.id, row.definition, row.termLanguage, row.definitionLanguage])).toEqual([
      ['glossary-row-4', 'Bread.', 'French', 'English'],
      ['_glossary-row-0', 'Voyage dans les airs.', 'French', 'French'],
      ['glossary-row-1', 'Action de voler un bien.', 'French', 'French'],
      ['entry:42', 'Eine Flugreise.', 'French', 'German'],
    ]);
    expect(items.map(row => row.phonemes.map(sound => sound.label))).toEqual([['p', 'ain'], [], [], ['v', 'ol']]);
  });

  it('honors the glossary source switch when a selected prepared spelling also occurs in another language', async () => {
    const { open } = setupHandler({ previewList: ['gift'], selectedIndices: new Set([0]), includeGlossary: false, glossaryTerms: [{ entryId: 'poison', term: 'Gift', termLanguage: 'German', def: 'A poison.' }], preloadedWords: [{ id: 'present', word: 'gift', phonemes: ['g', 'i', 'f', 't'] }] });
    await open();
    expect(window.__alloOpenWordPractice.mock.calls[0][0].words).toEqual([{ id: 'present', word: 'gift', phonemes: ['g', 'i', 'f', 't'] }]);
  });

  it('matches language aliases while preserving dialect-specific prepared records and conflicting authored IDs', () => {
    const glossary = [{ entryId: 'france', term: 'char', termLanguage: 'French', def: 'A tank.' }, { entryId: 'canada', term: 'char', termLanguage: 'French (Canadian)', def: 'A car.' }];
    const prepared = [{ word: 'char', termLanguage: 'fr-CA', phonemes: ['CA sound'] }, { word: 'char', termLanguage: 'fr-FR', phonemes: ['FR sound'] }];
    expect(buildSelection(['char'], glossary, prepared).words.map(item => [item.entryId, item.def, item.phonemes])).toEqual([['france', 'A tank.', ['FR sound']], ['canada', 'A car.', ['CA sound']]]);
    const conflicting = buildSelection(['char'], glossary, [{ entryId: 'france', word: 'char', termLanguage: 'fr-CA', phonemes: ['CA sound'] }]);
    const core = new Function('window', readFileSync('word_practice_core.js', 'utf8') + '\nreturn window.AlloWordPracticeCore;')({});
    expect(() => core.normalizeInput(conflicting)).toThrow(/different languages/i);
  });

  it('keeps unselected recording holders in their original languages even when they use the same audio key', async () => {
    const clip = marker => ({ mime: 'audio/wav', base64: Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(40)).toString('base64') });
    const english = clip('english'), german = clip('german');
    const { open } = setupHandler({ previewList: ['gift'], selectedIndices: new Set([0]), glossaryTerms: [{ term: 'gift', termLanguage: 'English' }, { term: 'Gift', termLanguage: 'German' }], preloadedWords: [{ word: 'rain', language: 'English', _ttsAssets: { gift: english } }, { word: 'Regen', _ttsAssets: { gift: german } }], preparedSessionConfig: { language: 'German' } });
    await open();
    const pack = window.__alloOpenWordPractice.mock.calls[0][0];
    expect(pack.words.map(record => record.word)).toEqual(['gift', 'Gift']); expect(pack.ttsAssets.gift).toBe(english);
    expect(pack.ttsAssetBanks.map(bank => [bank.language, bank.assets.gift])).toEqual([['English', english], ['German', german]]);
    const core = new Function('window', readFileSync('word_practice_core.js', 'utf8') + '\nreturn window.AlloWordPracticeCore;')({});
    expect(core.normalizeInput(pack).items.map(item => item.wordAudio)).toEqual([english, german].map(asset => 'data:audio/wav;base64,' + asset.base64));
  });
});
