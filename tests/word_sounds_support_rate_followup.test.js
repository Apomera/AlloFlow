import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act, Simulate} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const translate = (_t, key, params = {}) => {
  let value = english[key.replace('word_sounds.', '')] || key;
  for (const [name, replacement] of Object.entries(params)) value = value.replaceAll('{' + name + '}', String(replacement));
  return value;
};
class TestAudio {
  constructor(src = '') {this.src = src; this.paused = true; this.listeners = new Map(); this.currentTime = 0;}
  addEventListener(name, fn) {if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn);}
  removeEventListener(name, fn) {this.listeners.get(name)?.delete(fn);}
  emit(name) {this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn();}
  canPlayType() {return 'probably';}
  load() {queueMicrotask(() => {this.emit('loadedmetadata'); this.emit('canplaythrough');});}
  removeAttribute() {}
  pause() {this.paused = true;}
  play() {this.paused = false; setTimeout(() => {if (!this.paused) this.emit('ended');}, 1); return Promise.resolve();}
}
let Modal;
const mounted = [];
const settle = ms => act(async () => {await new Promise(done => setTimeout(done, ms));});
beforeAll(() => {installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds());});
beforeEach(() => {
  vi.stubGlobal('Audio', TestAudio);
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => {
  for (const {root, host} of mounted.splice(0)) {act(() => root.unmount()); host.remove();}
  vi.unstubAllGlobals();
});
const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="15" fill="blue"/></svg>').toString('base64');
async function mountActivity(activity, extra = {}) {
  const item = {...makePackItem(), _aacEnabled: false,
    _aacAssets: Object.fromEntries(['kite', 'apple', 'tree', 'moon', 'sun', 'ball'].map(word => [word, svg]))};
  const props = {...baseProps(activity), isParentMode: true, isTeacherMode: false, allowRuntimeAi: false,
    getWordSoundsString: translate, wsPreloadedWords: [item], wordSoundsDifficulty: 'easy',
    wordSoundsSessionGoal: 10, sessionConfig: {studentLocked: false}, ...extra};
  let current;
  function Host() {
    const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
    const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
    const [history, setHistory] = React.useState(props.wordSoundsHistory || []), [feedback, setFeedback] = React.useState(null);
    const [mastery, setMastery] = React.useState({});
    current = {word, data, score, history, mastery};
    return React.createElement(Modal, {...props, currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
      wordSoundsPhonemes: data, setWordSoundsPhonemes: setData, wordSoundsScore: score, setWordSoundsScore: setScore,
      wordSoundsHistory: history, setWordSoundsHistory: setHistory, wordSoundsFeedback: feedback,
      setWordSoundsFeedback: setFeedback, phonemeMastery: mastery, setPhonemeMastery: setMastery});
  }
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  mounted.push({root, host}); await act(async () => root.render(React.createElement(Host))); await settle(40);
  return {host, root, current: () => current};
}
async function toggleAac(host, on) {
  const title = english[on ? 'aac_overlay_off_title' : 'aac_overlay_on_title'];
  const button = [...host.querySelectorAll('button')].find(node => node.title === title);
  expect(button, 'real AAC overlay control').toBeTruthy(); await act(async () => button.click());
}
const answerSound = async (host, n = 1) => {
  const button = host.querySelector('button[aria-label="Choose Sound ' + n + '"]');
  expect(button).toBeTruthy(); await act(async () => button.click());
};

describe('item support is retained in response evidence', () => {
  it('keeps genuinely unsupported isolation responses independent', async () => {
    const run = await mountActivity('isolation'); await answerSound(run.host);
    expect(run.current().history[0].aacAssisted).toBeUndefined();
    expect(run.current().mastery.k.independentCorrect).toBe(1);
  });
  it.each([false, true])('remembers pictures after hiding them (retry=%s)', async retry => {
    const run = await mountActivity('isolation');
    await toggleAac(run.host, true);
    expect(run.host.querySelectorAll('button[aria-label^="Choose Sound"] img').length).toBeGreaterThan(0);
    await toggleAac(run.host, false);
    expect(run.host.querySelectorAll('button[aria-label^="Choose Sound"] img')).toHaveLength(0);
    if (retry) {await answerSound(run.host, 2); expect(run.current().history).toHaveLength(0);}
    await answerSound(run.host);
    const {history, mastery} = run.current();
    expect(history).toHaveLength(1); expect(history[0].aacAssisted).toBe(true);
    expect(history[0].attempts).toBe(retry ? 2 : 1);
    expect(mastery.k.aacAssistedCorrect).toBe(1); expect(mastery.k.independentCorrect).toBe(0);
  });
  it('resets prior picture support at the next occurrence of the same word', async () => {
    const item = makePackItem();
    const run = await mountActivity('isolation', {
      sessionConfig: {fixedForm: true, probeItemCount: 2}, wsPreloadedWords: [item, {...item, id: 2}]});
    await toggleAac(run.host, true); await toggleAac(run.host, false); await answerSound(run.host);
    expect(run.current().history[0].aacAssisted).toBe(true); await settle(2200);
    await answerSound(run.host);
    expect(run.current().history).toHaveLength(2);
    expect(run.current().history[1].aacAssisted).toBeUndefined();
    expect(run.current().mastery.k.independentCorrect).toBe(1);
  });
  it('records the printed Missing Letter frame without granting untested phoneme mastery', async () => {
    const run = await mountActivity('missing_letter');
    const choice = [...run.host.querySelectorAll('button')].find(node => node.textContent.trim() === 'A');
    expect(choice).toBeTruthy(); await act(async () => choice.click());
    await act(async () => run.host.querySelector('button[aria-label="' + english.check_answer + '"]').click());
    expect(run.current().history).toHaveLength(1);
    expect(run.current().history[0]).toMatchObject({correct: true, textSupported: true, mode: 'visual'});
    expect(run.current().history[0].cluesShown).toContain('missing_letter_frame');
    expect(run.current().mastery).toEqual({});
  });
  it('uses prior visual Missing Letter evidence for the same visual task difficulty', async () => {
    const history = ['dog', 'sun', 'map', 'bed', 'cup', 'hat'].map((word, index) => ({word,
      activity: 'missing_letter', correct: true, difficulty: 'easy', mode: 'visual',
      textSupported: true, cluesShown: ['missing_letter_frame'], attempts: 1, timestamp: index}));
    const run = await mountActivity('missing_letter', {wordSoundsHistory: history, wordSoundsDifficulty: 'auto'});
    const choice = [...run.host.querySelectorAll('button')].find(node => node.textContent.trim() === 'A');
    expect(choice).toBeTruthy(); await act(async () => choice.click());
    await act(async () => run.host.querySelector('button[aria-label="' + english.check_answer + '"]').click());
    expect(run.current().history.at(-1)).toMatchObject({activity: 'missing_letter', difficulty: 'medium', mode: 'visual'});
  });
});

async function mountRate(extra = {}) {
  const props = {...baseProps('counting'), wsPreloadedWords: [makePackItem()], allowRuntimeAi: false,
    isTeacherMode: true, getWordSoundsString: translate, ...extra};
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  mounted.push({root, host});
  await act(async () => root.render(React.createElement(Modal, props)));
  return {host, root, props, render: async next => act(async () => root.render(React.createElement(Modal, {...props, ...next})))};
}
const rateSlider = host => host.querySelector('input[type="range"][step="0.25"]');
describe('saved and live speech rates share the host setting', () => {
  it.each([
    [{wordSoundsTtsSpeed: 0.5, ttsSpeed: 1.25}, 0.5],
    [{ttsSpeed: 0.75}, 0.75],
    [{wordSoundsTtsSpeed: -2, ttsSpeed: 1.5}, 1.5],
    [{ttsSpeed: 9}, 1],
  ])('restores valid config and rejects invalid values: %j', async (sessionConfig, rate) => {
    const run = await mountRate({sessionConfig, wordSoundsTtsSpeed: 1});
    expect(Number(rateSlider(run.host).value)).toBe(rate);
  });
  it('propagates normal and presentation adjustments through the host setter', async () => {
    const setter = vi.fn(); const run = await mountRate({setWordSoundsTtsSpeed: setter, sessionConfig: {ttsSpeed: 0.5}});
    await act(async () => Simulate.change(rateSlider(run.host), {target: {value: '0.75'}}));
    expect(setter).toHaveBeenLastCalledWith(0.75); expect(Number(rateSlider(run.host).value)).toBe(0.75);
    await act(async () => run.host.querySelector('[data-ws-present-open]').click());
    const presentation = run.host.querySelector('[data-ws-presenter]'); expect(presentation).toBeTruthy();
    const controls = [...presentation.querySelectorAll('button')].find(node => node.textContent.trim() === english.present_teacher_controls);
    expect(controls).toBeTruthy(); await act(async () => controls.click());
    await act(async () => Simulate.change(rateSlider(presentation), {target: {value: '1.25'}}));
    expect(setter).toHaveBeenLastCalledWith(1.25); expect(Number(rateSlider(presentation).value)).toBe(1.25);
  });
  it('accepts an incoming saved lesson rate when the player is reused', async () => {
    const run = await mountRate({sessionConfig: {resourceId: 'one', ttsSpeed: 0.5}});
    await run.render({sessionConfig: {resourceId: 'two', wordSoundsTtsSpeed: 1.5}});
    expect(Number(rateSlider(run.host).value)).toBe(1.5);
  });
});
