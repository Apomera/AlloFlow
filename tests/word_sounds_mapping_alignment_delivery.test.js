import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';
import {compileWords} from './helpers/word_sounds_core.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let Modal, root, host, state, originalAudio, originalGlobalAudio;
class CompleteAudio {
  constructor(src = '') {this.src = src; this.paused = true; this.currentTime = 0; this.listeners = new Map(); queueMicrotask(() => this.dispatch('canplaythrough'));}
  addEventListener(name, fn) {if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn);}
  removeEventListener(name, fn) {this.listeners.get(name)?.delete(fn);}
  dispatch(name) {this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn();}
  canPlayType() {return 'probably';}
  load() {queueMicrotask(() => {this.dispatch('loadedmetadata'); this.dispatch('canplaythrough'); this.dispatch('canplay');});}
  removeAttribute() {}
  play() {this.paused = false; setTimeout(() => {if (!this.paused) {this.paused = true; this.ended = true; this.dispatch('ended');}}, 1); return Promise.resolve();}
  pause() {this.paused = true; this.dispatch('pause');}
}
beforeAll(() => {installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds());});
beforeEach(() => {
  vi.useFakeTimers({now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = CompleteAudio;
  window.__ALLO_INSTRUCTION_AUDIO = {mapping: 'data:audio/mp3;base64,MAP', inst_counting: 'data:audio/mp3;base64,COUNT'};
  window.__ALLO_PHONEME_AUDIO_BANK = Object.fromEntries(['box', 'cat', 'ship', 'b', 'o', 'k', 's', 'sh', 'i', 'p'].map(key => [key, 'data:audio/mp3;base64,' + key]));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
  delete window.__ALLO_INSTRUCTION_AUDIO; delete window.__ALLO_PHONEME_AUDIO_BANK;
  vi.clearAllTimers(); vi.useRealTimers(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
function itemFor(word, phonemes) {
  const item = compileWords([{word, phonemes}])[0];
  const assets = makePackItem()._ttsAssets;
  return {...item, id: word, itemId: word, ttsReady: true, _ttsAssets: {...assets, [word]: assets.cat}};
}
const box = () => itemFor('box', ['b', 'ɑ', 'k', 's'].map(ipa => ({ipa, grapheme: ''})));
function Host({item, initialActivity}) {
  const [activity, setActivity] = React.useState(initialActivity), [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0}), [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
  state = {activity, word, data, score, history};
  const defaults = baseProps(activity);
  return React.createElement(Modal, {...defaults, allowRuntimeAi: false, isTeacherMode: false, isProbeMode: true,
    disableAnimations: true, sessionId: 'alignment-' + item.itemId, wsPreloadedWords: [item], wordSoundsDifficulty: 'easy',
    sessionConfig: {fixedForm: true, probeItemCount: 1}, wordSoundsSessionGoal: 1,
    getWordSoundsString: (_t, key, ...rest) => key === 'word_sounds.mapping_unscored_review' ? '' : defaults.getWordSoundsString(_t, key, ...rest),
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity, currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData, wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory, wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback});
}
async function mount(item, initialActivity) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, {item, initialActivity})));
  await act(async () => vi.advanceTimersByTimeAsync(150));
}

describe('unaligned sound data does not become a scored mapping board', () => {
  it.each(['box', 'explicit rejection'])('shows an unscored review route for %s instead of synthesizing letter slots', async scenario => {
    const item = scenario === 'box' ? box() : itemFor('cat', ['k', 'a', 't']);
    if (scenario === 'explicit rejection') item.activityItems.mapping = {...item.activityItems.mapping, supported: false, contentStatus: 'teacher_review_required'};
    await mount(item, 'mapping');
    expect(state.data.phonemes).toHaveLength(scenario === 'box' ? 4 : 3);
    expect(host.textContent).toContain('Sound Mapping needs a teacher to check how the letters match these sounds.');
    expect(host.querySelector('button[aria-label^="word_sounds.select_sound_chip"], button[aria-label^="Select sound "]')).toBeNull();
    expect(state.score.total).toBe(0); expect(state.history).toEqual([]);
    const skip = [...host.querySelectorAll('button')].find(button => /skip_unscored_continue|Skip unscored item and continue/.test(button.textContent));
    expect(skip).toBeTruthy(); await act(async () => skip.click());
    expect(state.score.total).toBe(0); expect(state.history).toEqual([]);
  });

  it('still counts four sounds in the same unaligned box row', async () => {
    await mount(box(), 'counting');
    expect(host.textContent).not.toContain('Sound Mapping needs a teacher');
    const four = host.querySelector('[role="button"][aria-label="Number 4"]');
    expect(four).toBeTruthy(); await act(async () => four.click());
    expect(state.score).toMatchObject({correct: 1, total: 1});
    expect(state.history.at(-1)).toMatchObject({word: 'box', activity: 'counting', correct: true});
  });

  it('keeps verified digraph mapping interactive and scores its actual three-chip arrangement', async () => {
    const ship = itemFor('ship', [{ipa: 'ʃ', grapheme: 'sh'}, {ipa: 'ɪ', grapheme: 'i'}, {ipa: 'p', grapheme: 'p'}]);
    await mount(ship, 'mapping');
    expect(host.textContent).not.toContain('Sound Mapping needs a teacher');
    for (const grapheme of ['sh', 'i', 'p']) {
      const chip = host.querySelector('button[aria-label$=" ' + grapheme + '"]');
      expect(chip, JSON.stringify({word: state.word, graphemes: state.data?.graphemes,
        buttons: [...host.querySelectorAll('button')].map(button => button.getAttribute('aria-label'))})).toBeTruthy();
      await act(async () => chip.click());
    }
    expect(state.score).toMatchObject({correct: 1, total: 1});
    expect(state.history.at(-1)).toMatchObject({word: 'ship', activity: 'mapping', correct: true});
  });
});
