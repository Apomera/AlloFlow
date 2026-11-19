// 2026-11-18 (owner: "whatever is correct in terms of phonetics and true Orton-Gillingham"): in the app's Sound
// Mapping every chip plays the sound it makes IN THIS WORD, as the practice files do: the s of "dogs" plays /z/
// (it used to play its letters, /s/; a chip spanning two sounds already played the word's sounds). A spelling
// that says a surprising sound gets the note "s says /z/ here." once the child has heard it; it stays for that
// word, and never shows in a fixed-form (probe) session.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupWordSounds } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';
import { compileWords } from './helpers/word_sounds_core.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));

let Modal, root, host, originalAudio, originalGlobalAudio;
const playedSrc = [];
class CompleteAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.currentTime = 0; this.listeners = new Map(); queueMicrotask(() => this.dispatch('canplaythrough')); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  dispatch(name) { this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn(); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(() => { this.dispatch('loadedmetadata'); this.dispatch('canplaythrough'); this.dispatch('canplay'); }); }
  removeAttribute() {}
  play() { playedSrc.push(this.src); this.paused = false; setTimeout(() => { if (!this.paused) { this.paused = true; this.ended = true; this.dispatch('ended'); } }, 1); return Promise.resolve(); }
  pause() { this.paused = true; this.dispatch('pause'); }
}
const BANK = ['dogs', 'cats', 'd', 'o', 'g', 'z', 's', 'k', 'a', 't', 'c'];
beforeAll(() => { installCanvasStub(); ({ WordSoundsModal: Modal } = setupWordSounds()); });
beforeEach(() => {
  vi.useFakeTimers({ now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = CompleteAudio;
  window.__ALLO_INSTRUCTION_AUDIO = { mapping: 'data:audio/mp3;base64,MAP' };
  window.__ALLO_PHONEME_AUDIO_BANK = Object.fromEntries(BANK.map((key) => [key, 'data:audio/mp3;base64,' + key]));
  playedSrc.length = 0;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
  delete window.__ALLO_INSTRUCTION_AUDIO; delete window.__ALLO_PHONEME_AUDIO_BANK;
  vi.clearAllTimers(); vi.useRealTimers(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

function itemFor(word, phonemes) {
  const item = compileWords([{ word, phonemes }])[0];
  const assets = makePackItem()._ttsAssets;
  return { ...item, id: word, itemId: word, ttsReady: true, _ttsAssets: { ...assets, [word]: assets.cat } };
}
function Host({ item, fixed }) {
  const [activity, setActivity] = React.useState('mapping'), [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 }), [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
  const defaults = baseProps(activity);
  return React.createElement(Modal, { ...defaults, allowRuntimeAi: false, isTeacherMode: false, isProbeMode: fixed,
    disableAnimations: true, sessionId: 'says-' + item.itemId + (fixed ? '-fixed' : ''), wsPreloadedWords: [item], wordSoundsDifficulty: 'easy',
    sessionConfig: fixed ? { fixedForm: true, probeItemCount: 1 } : {}, wordSoundsSessionGoal: 1,
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity, currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData, wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory, wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback });
}
async function mount(item, fixed) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, { item, fixed })));
  await act(async () => vi.advanceTimersByTimeAsync(150));
}
const chip = (text) => [...host.querySelectorAll('button[aria-label]')].find((b) => /select_sound_chip|Select sound/.test(b.getAttribute('aria-label')) && b.textContent.replace(/●/g, '') === text);
const tap = async (el) => { await act(async () => el.click()); await act(async () => vi.advanceTimersByTimeAsync(200)); };
const clips = () => playedSrc.map((src) => src.split(',')[1]);
const notes = () => [...host.querySelectorAll('[data-mapping-says]')].map((n) => n.textContent);

describe('app Sound Mapping: the sound in this word', () => {
  it('plays /z/ for the s of "dogs" and its letters\' usual sound for the others, in a fixed-form session with no note', async () => {
    await mount(itemFor('dogs', ['d', 'o', 'g', 'z']), true);
    expect(chip('s'), [...host.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).join(' | ')).toBeTruthy();
    playedSrc.length = 0;
    await tap(chip('d'));
    expect(clips()).toContain('d');
    playedSrc.length = 0;
    await tap(chip('s'));
    expect(clips()).toContain('z');
    expect(clips()).not.toContain('s');
    // A fixed-form (probe) session: never a note.
    expect(notes()).toEqual([]);
  });

  it('plays /s/ for the s of "cats"', async () => {
    await mount(itemFor('cats', ['k', 'a', 't', 's']), true);
    playedSrc.length = 0;
    await tap(chip('s'));
    expect(clips()).toContain('s');
    expect(clips()).not.toContain('z');
  });
});

describe('app Sound Mapping: the note', () => {
  it('shows "s says /z/ here." once the s of "dogs" has been heard, and keeps it, outside a fixed-form session', async () => {
    await mount(itemFor('dogs', ['d', 'o', 'g', 'z']), false);
    expect(chip('s'), [...host.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).join(' | ')).toBeTruthy();
    expect(notes()).toEqual([]);
    await tap(chip('d'));
    expect(notes()).toEqual([]);
    await tap(chip('s'));
    expect(clips()).toContain('z');
    expect(notes()).toHaveLength(1);
    expect(['s says /z/ here.', 'word_sounds.take_home_player_mapping_says']).toContain(notes()[0]);
    expect(host.querySelector('[data-mapping-notes]').getAttribute('aria-live')).toBe('polite');
    await tap(chip('o'));
    expect(notes()).toHaveLength(1);
  });
});
