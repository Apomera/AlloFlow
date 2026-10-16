import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const moduleSource = fs.readFileSync('word_sounds_module.js', 'utf8');
const start = moduleSource.indexOf('const handleCheckPhonemes = React.useCallback(');
const handler = moduleSource.slice(start, moduleSource.indexOf('// Regenerate only the Sound Swap task', start));
const originalPlugins = {};
beforeEach(() => {
  for (const key of ['AlloPhonics', 'AlloDictionary', '__alloLoadPlugin']) {
    originalPlugins[key] = window[key];
    window[key] = undefined;
  }
});
afterEach(() => Object.assign(window, originalPlugins));

// Run the production callback with deferred network results and functional
// setters. Queued setters let the test interleave another edit after lookup
// resolves but before React applies its update.
function mount(initialWords, { queueSetters = false } = {}) {
  const state = { words: initialWords, pending: [], requests: [], regenerating: null };
  const phonemeCheckStateRef = { current: { next: 0, requests: new Map(), context: 'lesson:en-US:voice' } };
  const audioRetryWordsRef = { current: initialWords }, isMountedRef = { current: true }, advanceEpochRef = { current: 0 };
  const setWords = update => {
    if (queueSetters) state.pending.push(update);
    else state.words = audioRetryWordsRef.current = update(state.words);
  };
  const env = {
    React: { useCallback: value => value }, preloadedWords: initialWords,
    phonemeCheckStateRef, audioRetryWordsRef, isMountedRef, advanceEpochRef,
    setWsPreloadedWords: setWords, setPreloadedWords: setWords,
    setRegeneratingIndex: value => { state.regenerating = typeof value === 'function' ? value(state.regenerating) : value; },
    wordSoundsLanguage: 'en-US', runtimeAiAllowed: true,
    callGemini: vi.fn(() => new Promise(resolve => state.requests.push(resolve))),
    estimatePhonemesBasic: word => word.split(''), addToast: vi.fn(), warnLog: vi.fn(), preloadedWordCache: { current: new Map() },
  };
  return {
    state, refs: { phonemeCheckStateRef, audioRetryWordsRef, isMountedRef, advanceEpochRef },
    run(index = 0) { env.preloadedWords = state.words; return new Function(...Object.keys(env), handler + '\nreturn handleCheckPhonemes;')(...Object.values(env))(index); },
    edit(update, updateRef = true) { state.words = update(state.words); if (updateRef) audioRetryWordsRef.current = state.words; },
    resolve(index, phonemes = ['k', 'æ', 't']) { state.requests[index](JSON.stringify({ phonemes, syllables: ['cat'] })); },
    flush() { for (const update of state.pending.splice(0)) state.words = update(state.words); audioRetryWordsRef.current = state.words; },
  };
}
const word = (extra = {}) => ({ word: 'cat', phonemes: ['c', 'a', 't'], syllables: ['cat'], ...extra });

describe('Word Sounds per-word phoneme check', () => {
  it('keeps audio regeneration and phoneme checking as separate controls', () => {
    // The LIVE panel (misc_components — the setup fossil was deleted
    // 2026-08-11) accepts both props and prefers the tri-source checker.
    const miscSource = fs.readFileSync('misc_components_source.jsx', 'utf8');
    expect(miscSource).toContain('onRegenerateWord,');
    expect(miscSource).toContain('onCheckPhonemes,');
    expect(miscSource).toContain('onClick={() => (onCheckPhonemes || onRegenerateWord) && (onCheckPhonemes || onRegenerateWord)(idx)}');
    expect(moduleSource).toContain("await handlePackAudioUpdate('replace'");
    expect(moduleSource).toContain('const handleCheckPhonemes = React.useCallback(');
    expect(moduleSource).toContain('onCheckPhonemes: handleCheckPhonemes,');
  });

  it('triangulates pronunciation without invoking the broad word-data generator', () => {
    const start = moduleSource.indexOf('const handleCheckPhonemes = React.useCallback(');
    const end = moduleSource.indexOf('// Regenerate only the Sound Swap task', start);
    const handler = moduleSource.slice(start, end);

    expect(handler).toContain('window.AlloPhonics.toPhonemes');
    expect(handler).toContain('window.AlloPhonics.buildPhonemes');
    expect(handler).toContain('window.AlloDictionary.lookup');
    expect(handler).toContain('const [aiData, espeakData, dictionaryData] = await Promise.all');
    expect(handler).not.toContain('fetchWordData(');
    expect(handler).not.toContain('handleAudio(');
  });

  it('preserves syllable approvals, recordings and audio edited while checking', async () => {
    const h = mount([word()]);
    const checking = h.run();
    const activityItems = { syllable_counting: { count: 2 }, syllable_blending: { review: { signature: 'new' } } };
    const assets = { cat: { mime: 'audio/wav', base64: 'new-audio' } };
    h.edit(words => words.map(item => ({ ...item, activityItems, _ttsAssets: assets, imageUrl: 'new-image', teacherNote: 'Keep me' })));
    h.resolve(0); await checking;
    expect(h.state.words[0]).toMatchObject({ phonemes: ['k', 'æ', 't'], activityItems, _ttsAssets: assets, imageUrl: 'new-image', teacherNote: 'Keep me' });
    expect(h.state.words[0].activityItems).toBe(activityItems);
    expect(h.state.words[0]._ttsAssets).toBe(assets);
  });

  it('keeps a newer manual phoneme edit', async () => {
    const h = mount([word()]), checking = h.run();
    h.edit(words => words.map(item => ({ ...item, phonemes: ['teacher', 'choice'] })));
    const edited = h.state.words;
    h.resolve(0); await checking;
    expect(h.state.words).toBe(edited);
  });

  it('follows a uniquely identified word when it moves to another row', async () => {
    const other = word({ id: 'dog', word: 'dog' });
    const h = mount([word({ id: 'cat' }), other]), checking = h.run();
    h.edit(words => [words[1], words[0]]);
    h.resolve(0); await checking;
    expect(h.state.words[0]).toBe(other);
    expect(h.state.words[1]).toMatchObject({ id: 'cat', phonemes: ['k', 'æ', 't'] });
  });

  it('ignores a reordered word when there is no stable row identity', async () => {
    const h = mount([word(), word({ word: 'dog' })]), checking = h.run();
    h.edit(words => [words[1], words[0]]);
    const edited = h.state.words;
    h.resolve(0); await checking;
    expect(h.state.words).toBe(edited);
  });

  it('allows only the newest check for a word to apply', async () => {
    const h = mount([word()]), older = h.run(), newer = h.run();
    h.resolve(1, ['new', 'choice']); await newer;
    const checked = h.state.words;
    h.resolve(0, ['old', 'choice']); await older;
    expect(h.state.words).toBe(checked);
    expect(checked[0].phonemes).toEqual(['new', 'choice']);
  });

  it.each(['context', 'epoch', 'unmount'])('ignores results after the %s changes', async kind => {
    const h = mount([word()]), checking = h.run();
    if (kind === 'context') h.refs.phonemeCheckStateRef.current.context = 'lesson:en-GB:other-voice';
    if (kind === 'epoch') h.refs.advanceEpochRef.current += 1;
    if (kind === 'unmount') h.refs.isMountedRef.current = false;
    const original = h.state.words;
    h.resolve(0); await checking;
    expect(h.state.words).toBe(original);
  });

  it('checks the latest edit again inside a deferred React setter', async () => {
    const h = mount([word()], { queueSetters: true }), checking = h.run();
    h.resolve(0); await checking;
    expect(h.state.pending).toHaveLength(1);
    h.edit(words => words.map(item => ({ ...item, phonemes: ['queued', 'teacher', 'edit'] })), false);
    const edited = h.state.words;
    h.flush();
    expect(h.state.words).toBe(edited);
  });
});
