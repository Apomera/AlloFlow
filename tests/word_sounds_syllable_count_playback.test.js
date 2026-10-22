import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const act = React.act || require(resolve(modules, 'react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const source = readFileSync('word_sounds_module.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('      const latestAudioRequestRef = React.useRef(null);');
const end = source.indexOf('      // Manual isolation playback replaces an old stimulus', start);
if (start < 0 || end < 0) throw new Error('Production handleAudio boundary missing');
const callbackSource = source.slice(start, end);
const manualSource = source.slice(source.indexOf('      const beginIsolationPlayback ='), source.indexOf('      const playIsolationInstruction ='));
const blendSource = source.slice(source.indexOf('      const playBlending ='), source.indexOf('      const PhonologyView ='));
const segmentationSource = source.slice(source.indexOf('      const playSegmentationSequence ='), source.indexOf('      // BEGIN WORD SOUNDS SPELLING REPLAY'));
const createCore = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore;')();
const core = createCore();
const helpersSource = source.slice(source.indexOf('    const syllableCountWordKey ='), source.indexOf('    // SyllableCountingView'));
const helpers = new Function('WS_CORE', 'window', helpersSource + '\nreturn { syllableCountWordKey, syllableCountContextKey, syllableCountDeliveryReady };')(core, {});
const asset = value => {
  const bytes = Buffer.alloc(68); bytes.write('RIFF'); bytes.write('WAVE', 8); bytes[60] = value;
  return { mime: 'audio/wav', base64: bytes.toString('base64'), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
};
const dataUri = clip => 'data:' + clip.mime + ';base64,' + clip.base64;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const mounted = [];
beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) { await act(async () => root.unmount()); container.remove(); }
  vi.clearAllTimers(); vi.useRealTimers();
});

async function harness({ word = 'air', activity = 'syllable_counting', clip = asset(1), currentWord = word, language = 'en-US', voice = 'af_heart', items = [] } = {}) {
  const created = [], played = [];
  class ControlledAudio {
    constructor(src) { this.src = src; this.currentTime = 0; this.paused = true; this.ended = false; created.push(this); }
    ready() { this.oncanplaythrough?.(); }
    play = vi.fn(async () => { this.paused = false; this.ended = false; played.push(this.src); });
    pause = vi.fn(() => { this.paused = true; this.onpause?.(); });
    end() { this.ended = true; this.paused = true; this.onpause?.(); this.onended?.(); }
  }
  const context = core.createSyllableCountAudioContext({ asset: clip || undefined, language: 'en-US', voice: 'af_heart' });
  const reviewed = core.createReviewedSyllableCount({ targetWord: word, language: 'en-US', count: word === 'family' ? 3 : 1,
    revision: 1, reviewed: true, audioContext: context });
  const item = { word, phonemes: ['k', 'a', 't'], activityItems: { syllable_counting: reviewed } };
  const env = {
    React, WS_CORE: core, Audio: ControlledAudio, window: { __ALLO_PHONEME_AUDIO_BANK: {} }, _CACHE_WORD_AUDIO_BANK: {},
    ...helpers,
    syllableCountAudioRef: { current: { asset: clip || undefined, source: clip ? dataUri(clip) : null, context } },
    syllableCountContextRef: { current: helpers.syllableCountContextKey(word, 'en-US', item, context) },
    syllableCountDeliveryRef: { current: null }, syllableCountAttemptRef: { current: 0 }, advanceEpochRef: { current: 1 },
    setSyllableCountDelivery: vi.fn(),
    setHighlightedBlendIndex: vi.fn(), setHighlightedRhymeIndex: vi.fn(), setHighlightedManipIndex: vi.fn(), setPlayingOptionIndex: vi.fn(),
    elkoninBoxes: [{ phoneme: 'k' }, { phoneme: 'a' }, { phoneme: 't' }],
    wordSoundsLanguage: language, selectedVoice: voice, wordSoundsVoiceRef: { current: voice }, preloadedWords: items, ttsSpeed: 1,
    wordSoundsAudioLibrary: {}, wordSoundsAudioLibraryRef: { current: {} },
    audioRunIdRef: { current: 1 }, audioCancelledRef: { current: false }, isMountedRef: { current: true },
    feedbackPlaybackRef: { current: null }, currentActiveAudio: { current: null }, activePlaybackRef: { current: null },
    lastAudioRef: { current: null }, anchorReplayTimeoutRef: { current: null }, audioNotice: null, audioInstances: { current: new Map() }, preparedAudioInstances: { current: new Set() },
    audioCache: { current: new Map() }, ttsInflight: { current: new Map() },
    setIsPlayingAudio: vi.fn(), setAudioNotice: vi.fn(), clearAudioNotice: vi.fn(), notifyAudioUnavailable: vi.fn(),
    reportPreparedRuntimePlayback: vi.fn(), cancelMicInput: vi.fn(), callTTS: vi.fn(async () => 'blob:new-tts'),
    portableTtsSrcFor: vi.fn(() => null), loadAudioFromStorage: vi.fn(() => null), saveAudioToStorage: vi.fn(),
    speakWord: vi.fn(), warnLog: vi.fn(), debugLog: vi.fn(), ts: () => '',
  };
  const usePlayback = new Function(...Object.keys(env), `return function usePlayback(props) {
    const { wordSoundsActivity, currentWordSoundsWord, wordSoundsPhonemes } = props;
    ${callbackSource}
    ${manualSource}
    ${blendSource}
    ${segmentationSource}
    return { handleAudio, handleManualAudio, playBlending, playSegmentationSequence };
  };`)(...Object.values(env));
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container); mounted.push({ root, container });
  let callback, manualCallback, sequences, props = { wordSoundsActivity: activity, currentWordSoundsWord: currentWord, wordSoundsPhonemes: item };
  function Host(nextProps) { const handlers = usePlayback(nextProps); callback = handlers.handleAudio; manualCallback = handlers.handleManualAudio; sequences = handlers; return null; }
  const render = async updates => {
    props = { ...props, ...updates };
    env.syllableCountContextRef.current = props.wordSoundsActivity === 'syllable_counting'
      ? helpers.syllableCountContextKey(props.currentWordSoundsWord || props.wordSoundsPhonemes.word, 'en-US', props.wordSoundsPhonemes, env.syllableCountAudioRef.current.context) : null;
    await act(async () => root.render(React.createElement(Host, props)));
  };
  await render();
  const finishPlayback = async (input = word) => {
    const request = callback(input);
    await flush();
    for (const audio of created) audio.ready();
    await flush();
    for (const audio of created) if (!audio.paused) audio.end();
    return request;
  };
  return { env, created, played, ControlledAudio, item, render, finishPlayback, get callback() { return callback; }, get manualCallback() { return manualCallback; }, get sequences() { return sequences; } };
}

describe('latest audible request ownership', () => {
  it('plays non-English phoneme objects only from exact IPA assets in the lesson pack', async () => {
    const nativeA = { ...asset(21), provenance: { language: 'es', resolvedVoice: 'native', provider: 'recorded' } };
    const h = await harness({activity:'blending',language:'es',voice:'native',items:[{word:'gato',_ttsAssets:{a:nativeA}}]});
    h.env.window.__ALLO_PHONEME_AUDIO_BANK.a = dataUri(asset(22));
    h.env.wordSoundsAudioLibraryRef.current.a = dataUri(asset(23));
    h.env.portableTtsSrcFor.mockImplementation(key=>key==='a'?dataUri(nativeA):null);
    expect(await h.finishPlayback({ipa:'a',grapheme:'a'})).toBe(dataUri(nativeA));
    expect(h.played).toEqual([dataUri(nativeA)]);
    expect(h.env.loadAudioFromStorage).not.toHaveBeenCalled();expect(h.env.callTTS).not.toHaveBeenCalled();
  });

  it.each([
    {name:'missing exact IPA asset',input:{ipa:'i',grapheme:'y'},assets:{ee:asset(24),y:asset(25)}},
    {name:'missing IPA on an object',input:{grapheme:'a'},assets:{a:asset(24)}},
    {name:'different language provenance',input:{ipa:'a',grapheme:'a'},assets:{a:{...asset(24),provenance:{language:'en-US'}}}},
    {name:'raw IPA string without a native asset',input:'eɪ',assets:{ay:asset(24)}},
    {name:'slash marked native sound without an asset',input:'/rr/',assets:{}},
  ])('does not substitute English bank, cache, or letter TTS for $name', async ({input,assets})=>{
    const h=await harness({activity:'blending',language:'es',voice:'native',items:[{word:'gato',_ttsAssets:assets}]});
    h.env.window.__ALLO_PHONEME_AUDIO_BANK={a:dataUri(asset(26)),ee:dataUri(asset(27)),i:dataUri(asset(28))};
    h.env.wordSoundsAudioLibraryRef.current={a:'blob:english-cache',i:'blob:english-cache'};
    h.env.portableTtsSrcFor.mockImplementation(key=>assets[key]?dataUri(assets[key]):null);
    expect(await h.callback(input)).toMatchObject({ok:false,status:'unavailable'});
    expect(h.played).toEqual([]);expect(h.created).toEqual([]);
    expect(h.env.callTTS).not.toHaveBeenCalled();expect(h.env.loadAudioFromStorage).not.toHaveBeenCalled();
    expect(h.env.setAudioNotice).toHaveBeenCalledWith(expect.stringContaining('lesson language'));
  });

  it('preserves raw IPA identity on the retry notice instead of turning an object into word TTS',async()=>{
    const h=await harness({activity:'blending',language:'es',voice:'native'});const input={ipa:'aː',grapheme:'a'};
    await h.callback(input);expect(h.env.lastAudioRef.current).toBe(input);
    expect(await h.callback(h.env.lastAudioRef.current)).toMatchObject({ok:false,status:'unavailable'});
    expect(h.env.callTTS).not.toHaveBeenCalled();expect(h.played).toEqual([]);
  });

  it('preserves explicit native word and media requests',async()=>{
    const h=await harness({activity:'blending',language:'es',voice:'native'});
    h.env.portableTtsSrcFor.mockImplementation(key=>key==='a'?'blob:word-a':null);
    expect(await h.finishPlayback({word:'a'})).toBe('blob:word-a');
    expect(await h.finishPlayback({audioSrc:'blob:checked-native-sound'})).toMatchObject({ok:true});
    expect(h.played).toEqual(['blob:word-a','blob:checked-native-sound']);
  });

  it.each(['ready', 'error'])('ignores an older media load finishing with %s after the newer option starts', async outcome => {
    const h = await harness({ activity: 'rhyming' });
    h.env.portableTtsSrcFor.mockImplementation(word => 'blob:' + word);
    const older = h.callback('cat'), newer = h.callback('dog');
    await flush();
    const first = h.created[0], second = h.created[1];
    second.ready(); await flush();
    if (outcome === 'ready') first.ready(); else first.onerror(new Error('Old clip failed'));
    await flush();
    expect(await older).toMatchObject({ ok: false, status: 'cancelled' });
    expect(h.played).toEqual(['blob:dog']);
    expect(second.paused).toBe(false);
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(true);
    expect(h.env.notifyAudioUnavailable).not.toHaveBeenCalled();
    expect(h.env.reportPreparedRuntimePlayback).not.toHaveBeenCalled();
    second.end(); await newer;
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(false);
  });

  it.each(['late success', 'late failure'])('discards stale TTS %s without interrupting the current word', async outcome => {
    const h = await harness({ activity: 'rhyming' });
    let resolveOld, rejectOld;
    h.env.callTTS.mockImplementation(word => word === 'cat' ? new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }) : Promise.resolve('blob:dog'));
    const older = h.callback('cat'), newer = h.callback('dog'); await flush();
    const current = h.created[0]; current.ready(); await flush();
    if (outcome === 'late success') resolveOld('blob:cat'); else rejectOld(new Error('Old synthesis failed'));
    await flush();
    expect(await older).toMatchObject({ ok: false, status: 'cancelled' });
    expect(h.played).toEqual(['blob:dog']);
    expect(current.paused).toBe(false);
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(true);
    expect(h.env.notifyAudioUnavailable).not.toHaveBeenCalled();
    expect(h.env.callTTS).toHaveBeenCalledTimes(2);
    current.end(); await newer;
  });

  it('pauses the replaced clip immediately and ignores its late ended event while the new clip loads', async () => {
    const h = await harness({ activity: 'rhyming' });
    h.env.portableTtsSrcFor.mockImplementation(word => 'blob:' + word);
    const older = h.callback('cat'); await flush();
    const first = h.created[0]; first.ready(); await flush();
    const newer = h.callback('dog'); await flush();
    expect(first.paused).toBe(true);
    first.end();
    expect(await older).toMatchObject({ ok: false, status: 'cancelled' });
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(true);
    const second = h.created[1]; second.ready(); await flush(); second.end(); await newer;
  });

  it('preserves feedback and plays only the latest request waiting behind it', async () => {
    const h = await harness({ activity: 'rhyming' });
    let completeFeedback;
    const feedback = { promise: new Promise(resolve => { completeFeedback = resolve; }) };
    h.env.feedbackPlaybackRef.current = feedback;
    const older = h.callback({ audioSrc: 'blob:cat' }), newer = h.callback({ audioSrc: 'blob:dog' });
    await flush(); expect(h.played).toEqual([]);
    expect(h.env.feedbackPlaybackRef.current).toBe(feedback);
    h.env.feedbackPlaybackRef.current = null; completeFeedback(); await flush();
    expect(await older).toMatchObject({ ok: false, status: 'cancelled' });
    expect(h.played).toEqual(['blob:dog']);
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(true);
    h.created[1].end(); await newer;
  });

  it('keeps preloads silent and sequential instruction clips on the same activity run', async () => {
    const h = await harness({ activity: 'rhyming' });
    h.env.portableTtsSrcFor.mockImplementation(word => 'blob:' + word);
    const first = h.callback('cat'); await flush(); h.created[0].ready(); await flush();
    const warm = h.callback('dog', false); await flush(); h.created[1].ready(); await warm;
    expect(h.created[0].paused).toBe(false); expect(h.played).toEqual(['blob:cat']);
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(true);
    h.created[0].end(); await first;
    const second = h.callback('dog'); await flush(); expect(h.played).toEqual(['blob:cat', 'blob:dog']);
    expect(h.env.audioRunIdRef.current).toBe(1);
    h.created[1].end(); await second;
  });

  it('a manual Listen cancels the automatic sequence before it can enqueue its next option', async () => {
    const h = await harness({ activity: 'rhyming' });
    h.env.portableTtsSrcFor.mockImplementation(word => 'blob:' + word);
    const sequenceRun = h.env.audioRunIdRef.current;
    const sequence = (async () => {
      for (const word of ['cat', 'bat']) {
        if (h.env.audioRunIdRef.current !== sequenceRun) return;
        await h.callback(word);
      }
    })();
    await flush(); h.created[0].ready(); await flush();
    const selected = h.manualCallback('dog'); await flush();
    expect(h.env.audioRunIdRef.current).toBe(sequenceRun + 1);
    await sequence;
    expect(h.created.map(audio => audio.src)).toEqual(['blob:cat', 'blob:dog']);
    h.created[1].ready(); await flush();
    expect(h.played).toEqual(['blob:cat', 'blob:dog']);
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(true);
    h.created[1].end(); await selected;
  });

  it.each(['playBlending', 'playSegmentationSequence'])('manual Listen stops the real %s sequence without clearing the newer busy state', async sequenceName => {
    const h = await harness({ activity: sequenceName === 'playBlending' ? 'blending' : 'segmentation' });
    h.env.window.__ALLO_PHONEME_AUDIO_BANK = { k: 'blob:k', a: 'blob:a', t: 'blob:t' };
    h.env.portableTtsSrcFor.mockImplementation(word => 'blob:' + word);
    const sequence = h.sequences[sequenceName](); await flush();
    expect(h.played).toEqual(['blob:k']);
    const selected = h.manualCallback('dog'); await flush();
    const current = h.created.at(-1); current.ready(); await flush();
    await vi.advanceTimersByTimeAsync(600); await sequence;
    expect(h.played).toEqual(['blob:k', 'blob:dog']);
    expect(current.paused).toBe(false);
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(true);
    current.end(); await selected;
  });
});

describe('syllable-count playback uses the reviewed pronunciation', () => {
  it('plays the approved whole-word clip before a colliding phoneme key and stale audio instance, and waits for ended', async () => {
    const h = await harness();
    h.env.window.__ALLO_PHONEME_AUDIO_BANK.air = 'blob:phoneme-air';
    const stale = new h.ControlledAudio('blob:old-word-voice');
    h.env.audioInstances.current.set('air', stale);
    let settled = false;
    const request = h.callback(' AIR ').then(result => { settled = true; return result; });
    await flush();
    const current = h.created.at(-1);
    expect(current.src).toBe(h.env.syllableCountAudioRef.current.source);
    current.ready(); await flush();
    expect(h.played).toEqual([current.src]);
    expect(stale.play).not.toHaveBeenCalled();
    expect(settled).toBe(false);
    expect(h.env.syllableCountDeliveryRef.current.delivered).toBe(false);
    current.end();
    expect(await request).toBe(current.src);
    expect(h.env.reportPreparedRuntimePlayback).toHaveBeenCalledWith('ready');
    expect(h.env.callTTS).not.toHaveBeenCalled();
    expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(false);
    expect(h.env.syllableCountDeliveryRef.current).toMatchObject({ delivered: true, deliveryMode: 'recorded_audio', epoch: 1, attempt: 0 });
  });

  it.each(['cancel', 'error', 'blocked', 'context', 'epoch', 'attempt', 'run', 'unmount'])('does not unlock counting after %s interrupts playback', async change => {
    const h = await harness();
    const request = h.callback('air'); await flush();
    const audio = h.created.at(-1);
    if (change === 'blocked') audio.play.mockRejectedValueOnce(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' }));
    audio.ready(); await flush();
    if (change === 'cancel') audio.pause();
    if (change === 'error') audio.onerror();
    if (change === 'context') h.env.syllableCountContextRef.current = 'another-word';
    if (change === 'epoch') h.env.advanceEpochRef.current++;
    if (change === 'attempt') h.env.syllableCountAttemptRef.current++;
    if (change === 'run') h.env.audioRunIdRef.current++;
    if (change === 'unmount') h.env.isMountedRef.current = false;
    audio.end(); await request;
    expect(h.env.syllableCountDeliveryRef.current?.delivered).not.toBe(true);
    expect(h.env.setSyllableCountDelivery.mock.calls.some(([value]) => value?.delivered === true)).toBe(false);
  });

  it('does not count preload, instructions or raw media playback as target delivery', async () => {
    const h = await harness();
    const preloaded = h.callback('air', false); await flush(); h.created.at(-1).ready(); await preloaded;
    expect(h.env.syllableCountDeliveryRef.current).toBeNull();
    const request = h.callback({ audioSrc: dataUri(asset(2)) }); await flush();
    h.created.at(-1).end(); await request;
    expect(h.env.syllableCountDeliveryRef.current).toBeNull();
  });

  it('does not let a stale word callback play the new word audio or unlock its answer', async () => {
    const h = await harness(), old = h.callback;
    const next = asset(2);
    h.env.syllableCountAudioRef.current = { source: dataUri(next), asset: next,
      context: core.createSyllableCountAudioContext({ asset: next, language: 'en-US' }) };
    await h.render({ currentWordSoundsWord: 'ear', wordSoundsPhonemes: { word: 'ear' } });
    expect(await old('air')).toEqual({ ok: false, status: 'cancelled' });
    expect(h.created).toEqual([]);
    expect(h.env.syllableCountDeliveryRef.current).toBeNull();
  });

  it('revokes delivery when replay starts and ignores the replaced clip completion', async () => {
    const h = await harness();
    await h.finishPlayback();
    expect(h.env.syllableCountDeliveryRef.current.delivered).toBe(true);
    const first = h.callback('air'); await flush(); const replaced = h.created.at(-1); replaced.ready(); await flush();
    const second = h.callback('air'); await flush(); const current = h.created.at(-1); current.ready(); await flush();
    replaced.end(); await first;
    expect(h.env.syllableCountDeliveryRef.current.delivered).toBe(false);
    current.end(); await second;
    expect(h.env.syllableCountDeliveryRef.current.delivered).toBe(true);
  });

  it.each(['phoneme bank', 'audio instance', 'shared cache', 'portable clip', 'word bank', 'live library', 'persistent cache', 'in-flight TTS', 'new TTS'])(
    'does not substitute %s for a reviewed teacher-spoken word', async cache => {
      const word = cache === 'phoneme bank' ? 'air' : 'family';
      const h = await harness({ word, clip: null });
      if (cache === 'phoneme bank') h.env.window.__ALLO_PHONEME_AUDIO_BANK[word] = 'blob:hidden-phoneme';
      if (cache === 'audio instance') h.env.audioInstances.current.set(word, new h.ControlledAudio('blob:hidden-instance'));
      if (cache === 'shared cache') h.env.audioCache.current.set(word, 'blob:hidden-shared');
      if (cache === 'portable clip') h.env.portableTtsSrcFor.mockReturnValue('blob:hidden-portable');
      if (cache === 'word bank') h.env._CACHE_WORD_AUDIO_BANK[word] = 'blob:hidden-word';
      if (cache === 'live library') h.env.wordSoundsAudioLibraryRef.current[word] = 'blob:hidden-library';
      if (cache === 'persistent cache') h.env.loadAudioFromStorage.mockReturnValue('blob:hidden-storage');
      if (cache === 'in-flight TTS') h.env.ttsInflight.current.set(word, Promise.resolve('blob:hidden-inflight'));
      const countBefore = h.created.length;
      expect(h.item.activityItems.syllable_counting.audioContext.fingerprint).toBeNull();
      expect(await h.finishPlayback()).toEqual({ ok: false, status: 'teacher_spoken' });
      expect(h.created).toHaveLength(countBefore);
      expect(h.played).toEqual([]);
      expect(h.env.callTTS).not.toHaveBeenCalled();
      expect(h.env.setAudioNotice).toHaveBeenCalledWith(expect.stringMatching(/ask your teacher to say the word/i));
      expect(h.env.setIsPlayingAudio).toHaveBeenLastCalledWith(false);
      expect(h.env.notifyAudioUnavailable).not.toHaveBeenCalled();
    },
  );

  it('does not preload hidden audio or show a playback notice for a teacher-spoken review', async () => {
    const h = await harness({ word: 'family', clip: null });
    h.env.audioCache.current.set('family', 'blob:hidden-shared');
    expect(await h.callback('family', false)).toEqual({ ok: false, status: 'teacher_spoken' });
    expect(h.created).toEqual([]);
    expect(h.env.setAudioNotice).not.toHaveBeenCalled();
    expect(h.env.callTTS).not.toHaveBeenCalled();
  });

  it('preserves explicit teacher delivery when delayed automatic playback requests a spoken word', async () => {
    const h = await harness({ word: 'family', clip: null });
    const receipt = { delivered: true, deliveryMode: 'teacher_spoken', contextKey: h.env.syllableCountContextRef.current,
      epoch: h.env.advanceEpochRef.current, attempt: h.env.syllableCountAttemptRef.current };
    h.env.syllableCountDeliveryRef.current = receipt;
    expect(await h.callback('family')).toEqual({ ok: false, status: 'teacher_spoken' });
    expect(h.env.syllableCountDeliveryRef.current).toBe(receipt);
    expect(h.env.setSyllableCountDelivery).not.toHaveBeenCalled();
  });

  it('continues to play slash-delimited phonemes outside syllable counting', async () => {
    const h = await harness({ activity: 'isolation' });
    h.env.window.__ALLO_PHONEME_AUDIO_BANK.air = 'blob:phoneme-air';
    expect(await h.finishPlayback('/air/')).toEqual({ ok: true, status: 'ready' });
    expect(h.played).toEqual(['blob:phoneme-air']);
    expect(h.env.callTTS).not.toHaveBeenCalled();
  });

  it('refreshes the real React callback when the activity changes', async () => {
    const h = await harness({ activity: 'isolation' });
    h.env.window.__ALLO_PHONEME_AUDIO_BANK.air = 'blob:phoneme-air';
    const before = h.callback;
    await h.render({ wordSoundsActivity: 'syllable_counting' });
    expect(h.callback).not.toBe(before);
    await h.finishPlayback();
    expect(h.played).toEqual([h.env.syllableCountAudioRef.current.source]);
  });

  it.each(['current word', 'fallback word data'])('refreshes the real React callback when the %s changes', async change => {
    const h = await harness({ currentWord: change === 'current word' ? 'air' : '' });
    h.env.window.__ALLO_PHONEME_AUDIO_BANK.ear = 'blob:phoneme-ear';
    const next = asset(2);
    h.env.syllableCountAudioRef.current = { source: dataUri(next), asset: next,
      context: core.createSyllableCountAudioContext({ asset: next, language: 'en-US' }) };
    const before = h.callback;
    await h.render(change === 'current word' ? { currentWordSoundsWord: 'ear' } : { wordSoundsPhonemes: { ...h.item, word: 'ear' } });
    expect(h.callback).not.toBe(before);
    await h.finishPlayback('ear');
    expect(h.played).toEqual([dataUri(next)]);
  });

  it.each([false, true])('renders the actual student prompt for a review with saved audio: %s', async hasClip => {
    const viewSource = source.slice(source.indexOf('    const syllableCountWordKey ='), source.indexOf('    // BEGIN WORD SOUNDS TILE ANSWER LIFECYCLE'));
    const textHelper = source.slice(source.indexOf('    const wordSoundsCountResultText ='), source.indexOf('    const wordSoundsCountResultLine ='));
    const View = new Function('React', 'WS_CORE', 'window', textHelper + viewSource + '\nreturn SyllableCountingView;')(React, core, {});
    const audioContext = core.createSyllableCountAudioContext({ asset: hasClip ? asset(1) : undefined, language: 'en-US', voice: 'af_heart' });
    const data = core.createReviewedSyllableCount({ targetWord: 'family', language: 'en-US', count: 3, revision: 1, reviewed: true, audioContext });
    const onPlayAudio = vi.fn(), onTap = vi.fn();
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container); mounted.push({ root, container });
    await act(async () => root.render(React.createElement(View, { data, word: 'family', tapCount: 0, onPlayAudio, onTap, ts: () => '' })));
    const hearButton = [...container.querySelectorAll('button')].find(button => /hear the word again/i.test(button.textContent));
    if (hasClip) {
      expect(hearButton).toBeTruthy();
      await act(async () => hearButton.click());
      expect(onPlayAudio).toHaveBeenCalledWith('family');
      expect(container.querySelector('[role="status"]').textContent).toMatch(/hear the whole word before submitting/i);
    } else {
      expect(hearButton).toBeUndefined();
      expect(container.querySelector('[role="status"]').textContent).toMatch(/confirm after your teacher has said the word/i);
      expect(onPlayAudio).not.toHaveBeenCalled();
    }
    const tap = container.querySelector('[aria-label="Tap to count syllables"]');
    expect(tap.disabled).toBe(false);
    await act(async () => tap.click());
    expect(onTap).toHaveBeenCalledOnce();
  });
});
