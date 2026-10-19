import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let Modal, root, container, props, current, originalAudio, originalGlobalAudio;
const awards = vi.fn();
class CompleteAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.listeners = new Map(); queueMicrotask(() => this.emit('canplaythrough')); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn(); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(() => { this.emit('loadedmetadata'); this.emit('canplaythrough'); }); }
  removeAttribute() {}
  pause() { this.paused = true; }
  play() { this.paused = false; setTimeout(() => { if (!this.paused) { this.ended = true; this.emit('ended'); } }, 1); return Promise.resolve(); }
}
beforeAll(() => { installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds()); });
beforeEach(() => {
  vi.useFakeTimers({now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = CompleteAudio;
  awards.mockClear();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});
const strings = baseProps('counting').getWordSoundsString;
function Host(overrides) {
  const [activity, setActivity] = React.useState('counting');
  const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
  const [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
  current = {word, data, score, history, setActivity};
  return React.createElement(Modal, {...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false,
    disableAnimations: false, sessionId: 'xp-a', wsPreloadedWords: [makePackItem()],
    wordSoundsDifficulty: 'easy', wordSoundsSessionGoal: 1, onScoreUpdate: awards, ...overrides,
    getWordSoundsString: (_t, key, params) => ({'word_sounds.session_xp_earned': 'XP Earned', 'word_sounds.accuracy': 'Accuracy',
      'word_sounds.play_again': 'Play Again'})[key] || strings(_t, key, params),
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
    currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
    wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback});
}
async function render(next = {}) { props = {...props, ...next}; await act(async () => root.render(React.createElement(Host, props))); }
async function tick(ms) { await act(async () => vi.advanceTimersByTimeAsync(ms)); }
async function mount(overrides = {}) {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); props = {};
  await render(overrides); await tick(120);
}
async function answer(value = 3) {
  const control = container.querySelector(`[role="button"][aria-label="Number ${value}"]`);
  expect(control).toBeTruthy(); await act(async () => control.click());
}
function recapValue(label = 'XP Earned') {
  const recap = container.querySelector('[aria-labelledby="word-sounds-session-complete-title"]');
  expect(recap).toBeTruthy();
  const text = [...recap.querySelectorAll('div')].find(element => !element.children.length && element.textContent === label);
  expect(text).toBeTruthy(); return text.previousElementSibling.textContent;
}
function lastFloat() { return [...container.querySelectorAll('.ws-float-xp')].at(-1)?.textContent; }

describe('Word Sounds awards and displayed XP agree', () => {
  it.each([['easy', 12], ['medium', 17], ['hard', 22]])('uses the actual first-try %s award in the float and final recap', async (difficulty, expected) => {
    await mount({wordSoundsDifficulty: difficulty}); await answer();
    expect(awards).toHaveBeenCalledExactlyOnceWith(expected, 'word_sounds_counting');
    expect(lastFloat()).toContain('+' + expected + ' XP');
    await tick(2001); expect(recapValue()).toBe(expected + ' ✨');
  });

  it.each([['easy', 5], ['medium', 10], ['hard', 15]])('preserves the %s retry reward without a streak bonus', async (difficulty, expected) => {
    await mount({wordSoundsDifficulty: difficulty}); await answer(2);
    expect(awards).not.toHaveBeenCalled(); expect(lastFloat()).toBeUndefined();
    await answer(3); expect(awards).toHaveBeenCalledExactlyOnceWith(expected, 'word_sounds_counting');
    expect(lastFloat()).toContain('+' + expected + ' XP');
    await tick(2001); expect(recapValue()).toBe(expected + ' ✨');
  });

  it('adds streak rewards once per response and includes the final award', async () => {
    await mount({wordSoundsSessionGoal: 2}); await answer(); await tick(2001); await answer();
    expect(awards.mock.calls.map(call => call[0])).toEqual([12, 14]);
    expect(lastFloat()).toContain('+14 XP');
    await tick(2001); expect(recapValue()).toBe('26 ✨');
  });

  it('shows the actual decorated rewards and honors the streak bonus cap', async () => {
    const expected = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 30];
    await mount({wordSoundsSessionGoal: expected.length});
    for (const amount of expected) {
      await answer(); expect(lastFloat()).toContain('+' + amount + ' XP');
      await tick(2001);
    }
    expect(awards.mock.calls.map(call => call[0])).toEqual(expected);
    expect(recapValue()).toBe('240 ✨');
  });

  it('still awards and totals XP when animations are disabled', async () => {
    await mount({disableAnimations: true}); await answer();
    expect(awards).toHaveBeenCalledExactlyOnceWith(12, 'word_sounds_counting');
    expect(lastFloat()).toBeUndefined();
    await tick(2001); expect(recapValue()).toBe('12 ✨');
  });

  it('does not award or add XP after two wrong responses', async () => {
    await mount(); await answer(2); await answer(2);
    expect(awards).not.toHaveBeenCalled(); expect(lastFloat()).toBeUndefined();
    await tick(3001); await answer(); await tick(2001);
    expect(awards.mock.calls.map(call => call[0])).toEqual([12]);
    expect(recapValue()).toBe('12 ✨');
  });

  it('retains session XP when the current activity changes', async () => {
    await mount({wordSoundsSessionGoal: 2}); await answer(); await tick(2001);
    await act(async () => current.setActivity('isolation')); await tick(120);
    const position = current.data.activityItems.isolation.options.indexOf(current.data.activityItems.isolation.correctSound);
    const choice = container.querySelector(`button[aria-label="Choose Sound ${position + 1}"]`);
    expect(choice).toBeTruthy(); await act(async () => choice.click());
    expect(awards.mock.calls.map(call => call[0])).toEqual([12, 14]);
    await tick(2001); expect(recapValue()).toBe('26 ✨');
  });

  it('starts the recap tally fresh on Play Again while keeping prior global awards', async () => {
    await mount(); await answer(); await tick(2001); expect(recapValue()).toBe('12 ✨');
    const replay = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Play Again'));
    expect(replay).toBeTruthy(); await act(async () => replay.click()); await tick(120);
    await answer(); await tick(2001);
    expect(awards.mock.calls.map(call => call[0])).toEqual([12, 12]);
    expect(recapValue()).toBe('12 ✨');
  });

  it('resets session XP on a new session identity', async () => {
    await mount({wordSoundsSessionGoal: 2}); await answer(); await tick(2001);
    await render({sessionId: 'xp-b', wordSoundsSessionGoal: 1}); await tick(120);
    await answer(); await tick(2001);
    expect(awards.mock.calls.map(call => call[0])).toEqual([12, 12]); expect(recapValue()).toBe('12 ✨');
  });

  it('keeps probe rewards at zero and reports accuracy instead of XP', async () => {
    await mount({isProbeMode: true, sessionConfig: {fixedForm: true, probeItemCount: 1}}); await answer();
    expect(awards).not.toHaveBeenCalled(); expect(lastFloat()).toBeUndefined();
    await tick(801); expect(recapValue('Accuracy')).toBe('100%');
    expect(container.textContent).not.toContain('XP Earned');
  });
});
