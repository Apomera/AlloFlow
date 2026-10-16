import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';
const require = createRequire(import.meta.url), modules = resolve('desktop/web-app/node_modules');
const source = readFileSync('word_sounds_module.js', 'utf8');
// Extract exactly the callback declaration; adjacent editor/repair hooks are
// separate behavior and must not be pulled into this isolated audio fixture.
const tree = require('@babel/parser').parse(source, { sourceType: 'script' });
const stack = [tree], audioDeclarations = [];
while (stack.length) {
  const node = stack.pop();
  if (node.type === 'VariableDeclarator' && node.id?.name === 'handleAudio') audioDeclarations.push(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => { if (child?.type) stack.push(child); });
    else if (value?.type) stack.push(value);
  }
}
if (audioDeclarations.length !== 1) throw new Error('Expected exactly one handleAudio declaration');
const handleAudioSource = 'const ' + source.slice(audioDeclarations[0].start, audioDeclarations[0].end) + ';';

let React, client, act;
const mounts = [];
beforeAll(() => {
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
});
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => {
  for (const m of mounts.splice(0)) { act(() => m.root.unmount()); m.host.remove(); }
  vi.clearAllTimers(); vi.useRealTimers(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function tick(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function mount(extra = {}) {
  const viewSource = sliceBetween(source, 'const WordFamiliesView = React.useMemo(', 'const ts = React.useCallback(', {
    file: 'word_sounds_module.js', label: 'Word Families view',
  });
  const audioRunIdRef = { current: 0 };
  const View = new Function('React', 't', 'ts', 'isMountedRef', 'audioRunIdRef', 'isPlayingAudioRef', 'currentActiveAudio', 'fisherYatesShuffle', 'Volume2', 'Check', 'X', viewSource + ';return WordFamiliesView;')(
    { ...React, useMemo: fn => fn() }, key => key, () => '', { current: true }, audioRunIdRef, { current: false }, { current: null }, a => a, () => null, () => null, () => null);
  const props = { data: { family: 'at', targetWord: 'cat', options: ['hat', 'bat'], distractors: ['dog', 'sun'] },
    onPreloadAudio: vi.fn(async () => {}), onPlayAudio: vi.fn(async () => {}), onCheckAnswer: vi.fn(), soundOnlyMode: false, ...extra };
  const host = document.createElement('div'); document.body.appendChild(host); const root = client.createRoot(host);
  const m = { host, root, props, audioRunIdRef }; mounts.push(m);
  m.render = patch => { Object.assign(props, patch); act(() => root.render(React.createElement(View, props))); };
  m.render({});
  m.button = text => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text);
  return m;
}
describe('prepared Word Families response audio', () => {
  it('preloads every displayed member and distractor before the instruction ends, without speaking any', async () => {
    const m = mount(); await tick();
    expect(m.props.onPreloadAudio.mock.calls.map(c => c[0])).toEqual(['hat', 'bat', 'dog', 'sun']);
    expect(m.props.onPlayAudio).not.toHaveBeenCalled();
  });
  it('waits for the warmed clips and starts the automatic sequence only once', async () => {
    const warm = deferred(), m = mount({ onPreloadAudio: vi.fn(() => warm.promise) }); await tick();
    act(() => window.dispatchEvent(new Event('wordSoundsInstructionDone'))); await tick(300);
    expect(m.props.onPlayAudio).not.toHaveBeenCalled();
    await act(async () => warm.resolve()); await tick(1200);
    expect(m.props.onPlayAudio.mock.calls.map(c => c[0])).toEqual(['hat', 'bat', 'dog', 'sun']);
    act(() => window.dispatchEvent(new Event('wordSoundsInstructionDone'))); await tick(13000);
    expect(m.props.onPlayAudio).toHaveBeenCalledTimes(4);
  });
  it('does not let an old preload completion start playback after the target changes', async () => {
    const warm = deferred(), m = mount({ onPreloadAudio: vi.fn(() => warm.promise) }); await tick();
    act(() => window.dispatchEvent(new Event('wordSoundsInstructionDone')));
    m.render({ data: { family: 'un', targetWord: 'run', options: ['fun', 'sun'], distractors: ['bed', 'pin'] } });
    await act(async () => warm.resolve()); await tick(500);
    expect(m.props.onPlayAudio).not.toHaveBeenCalled();
    expect(m.props.onPreloadAudio.mock.calls.map(c => c[0])).toEqual(['hat', 'bat', 'dog', 'sun', 'fun', 'sun', 'bed', 'pin']);
    act(() => window.dispatchEvent(new Event('wordSoundsInstructionDone'))); await tick(1200);
    expect(m.props.onPlayAudio.mock.calls.map(c => c[0])).toEqual(['fun', 'sun', 'bed', 'pin']);
  });
  it('settles a failed background preload so manual replay can retry it', async () => {
    const m = mount({ onPreloadAudio: vi.fn(() => Promise.reject(new Error('temporary load failure'))) }); await tick();
    act(() => m.host.querySelector('[aria-label="common.hear_all_words"]').click()); await tick(1500);
    expect(m.props.onPlayAudio.mock.calls.map(c => c[0])).toEqual(['hat', 'bat', 'dog', 'sun']);
  });
  it('leaves spoken praise to the one parent answer handler', async () => {
    const m = mount({ data: { family: 'at', targetWord: 'cat', options: ['hat'], distractors: ['dog'] } });
    act(() => m.button('hat').click()); await tick(1200);
    expect(m.props.onPlayAudio.mock.calls.map(c => c[0])).toEqual(['hat']);
    expect(m.props.onCheckAnswer).toHaveBeenCalledExactlyOnceWith('correct');
  });
  it('does not preload or automatically speak editable board rows', async () => {
    const m = mount({ isEditing: true }); await tick(13000);
    expect(m.props.onPreloadAudio).not.toHaveBeenCalled(); expect(m.props.onPlayAudio).not.toHaveBeenCalled();
  });
});

function audioHarness({ packed = null, cached = null } = {}) {
  const clips = [];
  class Audio {
    constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.play = vi.fn(async () => { this.paused = false; }); this.pause = vi.fn(() => { this.paused = true; this.onpause?.(); }); clips.push(this); }
    finish() { this.paused = true; this.onended?.(); }
  }
  const environment = {
    React: { useCallback: fn => fn }, Audio,
    wordSoundsVoiceRef: { current: 'af_heart' }, selectedVoice: 'af_heart',
    audioRunIdRef: { current: 1 }, isMountedRef: { current: true }, audioCancelledRef: { current: false },
    latestAudioRequestRef: { current: null }, wordSoundsActivity: 'word_families', currentWordSoundsWord: 'hat', wordSoundsPhonemes: { word: 'hat' },
    feedbackPlaybackRef: { current: null }, activePlaybackRef: { current: null }, currentActiveAudio: { current: null },
    lastAudioRef: { current: null }, audioNotice: null, clearAudioNotice: vi.fn(), cancelMicInput: vi.fn(),
    window: {}, warnLog: vi.fn(), debugLog: vi.fn(), setIsPlayingAudio: vi.fn(), ttsSpeed: 1,
    audioInstances: { current: new Map() }, preparedAudioInstances: { current: new Set() },
    reportPreparedRuntimePlayback: vi.fn(), notifyAudioUnavailable: vi.fn(), audioCache: { current: new Map() },
    portableTtsSrcFor: () => packed, wordSoundsAudioLibraryRef: { current: {} },
    loadAudioFromStorage: () => null, ttsInflight: { current: new Map() }, callTTS: vi.fn(async () => null),
    saveAudioToStorage: vi.fn(), wordSoundsLanguage: 'en', wordSoundsAudioLibrary: {}, speakWord: vi.fn(),
  };
  if (cached) environment.audioInstances.current.set('hat', cached);
  const handleAudio = new Function(...Object.keys(environment), handleAudioSource + ';return handleAudio;')(...Object.values(environment));
  return { ...environment, handleAudio, clips, Audio };
}
describe('silent option loading and playback outcomes', () => {
  it('warms a packed option without changing or pausing an instruction already playing', async () => {
    const h = audioHarness({ packed: 'data:audio/mp3;base64,HAT' });
    const instruction = new h.Audio('instruction'); instruction.paused = false; h.currentActiveAudio.current = instruction;
    const warm = h.handleAudio('hat', false); await tick(1001); await warm;
    expect(h.audioInstances.current.has('hat')).toBe(true);
    expect(h.setIsPlayingAudio).not.toHaveBeenCalled(); expect(instruction.pause).not.toHaveBeenCalled();
    expect(h.cancelMicInput).not.toHaveBeenCalled();
    expect(h.clips.every(clip => clip.play.mock.calls.length === 0)).toBe(true);
    await h.handleAudio('hat', false); expect(h.setIsPlayingAudio).not.toHaveBeenCalled();
  });
  it('reports a successful warmed cache hit instead of treating it as missing', async () => {
    const h = audioHarness(), clip = new h.Audio('hat'); h.audioInstances.current.set('hat', clip);
    const played = h.handleAudio('hat'); await tick(); clip.finish();
    await expect(played).resolves.toEqual({ ok: true, status: 'ready' });
    expect(h.cancelMicInput).toHaveBeenCalledOnce();
  });
  it('returns the actual cached playback failure to a sequenced activity', async () => {
    const h = audioHarness(), clip = new h.Audio('hat'); clip.play.mockRejectedValue(new Error('damaged')); h.audioInstances.current.set('hat', clip);
    await expect(h.handleAudio('hat')).resolves.toEqual({ ok: false, status: 'damaged' });
    expect(h.notifyAudioUnavailable).toHaveBeenCalledOnce();
  });
  it('does not report cancellation of a delayed load as damaged audio', async () => {
    const h = audioHarness({ packed: 'data:audio/mp3;base64,HAT' }), played = h.handleAudio('hat');
    h.audioRunIdRef.current++; await tick(1001); await expect(played).resolves.toEqual({ ok: false, status: 'cancelled' });
    expect(h.clips[0].play).not.toHaveBeenCalled(); expect(h.notifyAudioUnavailable).not.toHaveBeenCalled();
    expect(h.reportPreparedRuntimePlayback).not.toHaveBeenCalled();
  });
  it('returns unavailable when selected synthesis supplies no clip', async () => {
    const h = audioHarness(); await expect(h.handleAudio('hat')).resolves.toEqual({ ok: false, status: 'unavailable' });
  });
});
