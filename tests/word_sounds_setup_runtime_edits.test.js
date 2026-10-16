import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_module.js', 'utf8');
const between = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < a) throw Error('Missing runtime boundary');
  return source.slice(a, b);
};
const load = new Function('preloadedWords', 'setWsPreloadedWords', 'fetchWordData', `
  const React = {useCallback: fn => fn}, setPreloadedWords = null;
  const debugLog = () => {}, warnLog = () => {}, addToast = () => {};
  const setIsPlayingAudio = () => {}, setRegeneratingIndex = () => {}, window = {};
  const audioInstances = {}, audioCache = {}, wordDataCache = {}, preloadedWordCache = {};
  ${between('const handleReorderPreloadedWords =', '// Dropping a word')}
  ${between('const handleRegenerateAll =', '// Retry TTS prefetch')}
  return {reorder:handleReorderPreloadedWords,regenerate:handleRegenerateAll};
`);

describe('runtime edits retain the setup authoring session', () => {
  it('reorders through a functional host update', () => {
    const words = [{word:'apple'},{word:'fire'}], reordered = [...words].reverse(), setter = vi.fn();
    load(words, setter, vi.fn()).reorder(reordered);
    expect(typeof setter.mock.calls[0][0]).toBe('function');
    expect(setter.mock.calls[0][0](words)).toBe(reordered);
  });

  it('regenerates the current lesson through a functional host update', async () => {
    const words = [{word:'apple',image:'saved'}], setter = vi.fn();
    const fetch = vi.fn().mockResolvedValue({definition:'updated'});
    await load(words,setter,fetch).regenerate();
    const update = setter.mock.calls[0][0];
    expect(typeof update).toBe('function');
    expect(update(words)).toEqual([{word:'apple',image:'saved',definition:'updated'}]);
    expect(fetch).toHaveBeenCalledWith('apple',0,true);
  });

  it('does not apply completed regeneration to a replaced or edited lesson', async () => {
    const words = [{word:'apple'}], setter = vi.fn();
    let finish;
    const pending = new Promise(resolve => {finish=resolve;});
    const action = load(words,setter,()=>pending).regenerate();
    const replacement = [{word:'apple',definition:'later edit'}];
    finish({definition:'older result'});
    await action;
    expect(setter.mock.calls[0][0](replacement)).toBe(replacement);
    expect(replacement[0].definition).toBe('later edit');
  });
});
