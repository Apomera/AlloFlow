// Answer cards a 4-9 year old uses, 2026-11-09. A card that has to be heard
// (no word, no picture) is tapped to hear and select it, and a Check button
// grades it; a tried card is marked "not this one"; the answer card is marked
// when the item ends; beginners get fewer choices. Each test mounts the real
// modal and plays it. Probes keep one-tap answers and no marks.
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';
import {core} from './helpers/word_sounds_core.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).word_sounds;
const strings = (_t, key, params = {}) => {
  let text = english[String(key).replace('word_sounds.', '')] || '';
  for (const [name, value] of Object.entries(params || {})) text = text.split('{' + name + '}').join(String(value));
  return text;
};
let Modal, root, container, current, originalAudio, originalGlobalAudio, plays;
class CountingAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.listeners = new Map(); queueMicrotask(() => this.emit('canplaythrough')); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn(); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(() => { this.emit('loadedmetadata'); this.emit('canplaythrough'); }); }
  removeAttribute() {}
  pause() { this.paused = true; }
  play() { plays++; this.paused = false; setTimeout(() => { if (!this.paused) { this.ended = true; this.emit('ended'); } }, 1); return Promise.resolve(); }
}
beforeAll(() => { installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds()); });
beforeEach(() => {
  vi.useFakeTimers({now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = CountingAudio;
  plays = 0;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
  vi.restoreAllMocks(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

function Host(overrides) {
  const {activity: startActivity = 'blending', history: startHistory = [], ...rest} = overrides;
  const [activity, setActivity] = React.useState(startActivity);
  const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
  const [history, setHistory] = React.useState(startHistory), [feedback, setFeedback] = React.useState(null);
  current = {activity, word, data, score, history, feedback};
  return React.createElement(Modal, {...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false,
    disableAnimations: true, sessionId: 'answer-cards', wsPreloadedWords: [makePackItem()],
    wordSoundsDifficulty: 'easy', wordSoundsSessionGoal: 10, getWordSoundsString: strings, ...rest,
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
    currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
    wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback});
}
async function tick(ms) { await act(async () => vi.advanceTimersByTimeAsync(ms)); }
async function mount(overrides = {}) {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Host, overrides))); await tick(150);
}
const click = async (element) => { expect(element, 'control to click').toBeTruthy(); await act(async () => element.click()); await tick(20); };
const key = async (element, name, init = {}) => {
  const event = new KeyboardEvent('keydown', {key: name, bubbles: true, cancelable: true, ...init});
  await act(async () => { element.dispatchEvent(event); }); await tick(20);
  return event;
};
const cards = () => [...container.querySelectorAll('[data-ws-card]')];
const stateOf = (card) => card.getAttribute('data-ws-card-state');
const check = () => container.querySelector('[data-ws-card-check]');
const mark = (card) => card.querySelector('[data-ws-card-mark]');
// A pack word with no prepared boards, so the module builds each board itself.
const generated = (word, phonemes, extra = {}) => {
  const base = makePackItem();
  return {...base, id: word, term: word, word, targetWord: word, displayWord: word, phonemes, phonemeCount: phonemes.length,
    graphemes: word.split(''), firstSound: phonemes[0], lastSound: phonemes[phonemes.length - 1], activityItems: {}, ...extra};
};
// The prepared blending board is cat, cot, cut, bat: easy keeps cat, cot, cut in that order.
const CAT = 0, COT = 1, CUT = 2;

describe('sound-only cards: tap to hear and select, Check to answer', () => {
  it('a first tap selects and plays the card and grades nothing', async () => {
    await mount();
    expect(cards().length).toBe(3);
    expect(cards().every((card) => card.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(check(), 'Check sits with the choices').toBeTruthy();
    expect(check().disabled, 'Check waits for a selection').toBe(true);
    expect(check().textContent).toBe('Check');
    expect(container.querySelector('[data-ws-cards]').parentElement.contains(check())).toBe(true);
    // The whole card plays now: no small corner speaker beside it.
    expect(container.querySelector('button[aria-label="common.listen_to_this_option"]')).toBeNull();
    const before = plays;
    await click(cards()[COT]);
    expect(plays, 'the tapped card is heard').toBeGreaterThan(before);
    expect(stateOf(cards()[COT])).toBe('selected');
    expect(cards()[COT].getAttribute('aria-pressed')).toBe('true');
    expect(mark(cards()[COT]), 'a marker, not colour alone').toBeTruthy();
    expect(cards()[CAT].getAttribute('aria-pressed')).toBe('false');
    expect(check().disabled).toBe(false);
    expect(current.history).toEqual([]);
    expect(current.feedback).toBeNull();
    expect(current.score.total).toBe(0);
  });

  it('tapping the selected card again replays it and still grades nothing', async () => {
    await mount();
    await click(cards()[COT]);
    const before = plays;
    await click(cards()[COT]);
    expect(plays).toBeGreaterThan(before);
    expect(stateOf(cards()[COT])).toBe('selected');
    expect(current.history).toEqual([]);
    expect(current.feedback).toBeNull();
    // Choosing another card moves the selection.
    await click(cards()[CUT]);
    expect(cards().map(stateOf)).toEqual(['idle', 'idle', 'selected']);
  });

  it('Check grades the selected card', async () => {
    await mount();
    await click(cards()[CAT]);
    await click(check());
    expect(current.feedback && current.feedback.isCorrect).toBe(true);
    expect(current.history.length).toBe(1);
    expect(current.history[0]).toMatchObject({activity: 'blending', word: 'cat', correct: true, attempts: 1});
    // The answer card is marked before the next word arrives.
    expect(stateOf(cards()[CAT])).toBe('correct');
    expect(mark(cards()[CAT]).textContent).toContain('Answer');
  });

  it('a second Enter on the selected card submits; Space only replays', async () => {
    await mount();
    await click(cards()[CAT]); // what the first Enter does on a button
    const space = await key(cards()[CAT], ' ');
    expect(space.defaultPrevented, 'Space keeps its own click (replay)').toBe(false);
    expect(current.history).toEqual([]);
    const held = await key(cards()[CAT], 'Enter', {repeat: true});
    expect(held.defaultPrevented).toBe(true);
    expect(current.history, 'a held key does not submit').toEqual([]);
    const enter = await key(cards()[CAT], 'Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(current.history.length).toBe(1);
    expect(current.history[0].correct).toBe(true);
  });

  it('Enter on a card that is not selected is left to the button (select and play)', async () => {
    await mount();
    const enter = await key(cards()[COT], 'Enter');
    expect(enter.defaultPrevented).toBe(false);
    expect(current.history).toEqual([]);
  });

  it('arrow keys move between the cards', async () => {
    await mount();
    cards()[0].focus();
    await key(cards()[0], 'ArrowRight');
    expect(document.activeElement).toBe(cards()[1]);
    await key(cards()[1], 'ArrowLeft');
    expect(document.activeElement).toBe(cards()[0]);
    await key(cards()[0], 'ArrowUp');
    expect(document.activeElement, 'wraps').toBe(cards()[2]);
  });
});

describe('teaching after a miss', () => {
  it('the tried card is marked, disabled for the item, and the selection clears', async () => {
    await mount();
    await click(cards()[COT]);
    await click(check());
    expect(current.feedback && current.feedback.isCorrect).toBe(false);
    expect(current.history, 'a first miss is not the final answer').toEqual([]);
    expect(stateOf(cards()[COT])).toBe('wrong');
    expect(cards()[COT].getAttribute('aria-disabled')).toBe('true');
    expect(mark(cards()[COT]).textContent).toContain('Not this one');
    expect(cards().filter((card) => card.getAttribute('aria-pressed') === 'true')).toEqual([]);
    expect(check().disabled).toBe(true);
    // Tapping it again neither selects nor answers.
    const before = plays;
    await click(cards()[COT]);
    expect(stateOf(cards()[COT])).toBe('wrong');
    expect(check().disabled).toBe(true);
    expect(plays).toBe(before);
    expect(current.history).toEqual([]);
  });

  it('a double tap is one answer, not a miss and its retry', async () => {
    await mount();
    await click(cards()[COT]);
    await act(async () => { check().click(); check().click(); });
    await tick(20);
    expect(current.history, 'still only the first miss').toEqual([]);
    expect(current.feedback.isCorrect).toBe(false);
    expect(cards().map(stateOf)).toEqual(['idle', 'wrong', 'idle']);
    await act(async () => root.unmount()); root = null; container.remove();
    await mount({activity: 'counting'});
    const five = container.querySelector('[role="button"][aria-label="Number 5"]');
    await act(async () => { five.click(); five.click(); });
    await tick(20);
    expect(current.history).toEqual([]);
    expect(stateOf(container.querySelector('[role="button"][aria-label="Number 5"]'))).toBe('wrong');
  });

  it('after the second miss the answer card is marked and the answer is modelled', async () => {
    await mount();
    await click(cards()[COT]); await click(check());
    await tick(3100);
    await click(cards()[CUT]); await click(check());
    expect(current.history.length).toBe(1);
    expect(current.history[0]).toMatchObject({correct: false, attempts: 2, wrong: ['cot', 'cut']});
    expect(cards().map(stateOf)).toEqual(['correct', 'wrong', 'wrong']);
    expect(mark(cards()[CAT]).getAttribute('data-ws-card-mark')).toBe('correct');
    expect(current.feedback.message).toMatch(/Nice try/);
  });

  it('a missed item is modelled once: the target word, then its answer', async () => {
    // Saved rhyme board for "cat": hat (the answer) first, then its foils.
    await mount({activity: 'rhyming'});
    expect(cards().length).toBe(3);
    await click(cards()[1]); await click(check());
    await tick(3100);
    await click(cards()[2]); await click(check());
    expect(current.history.length).toBe(1);
    expect(current.history[0].correct).toBe(false);
    expect(cards().map(stateOf)).toEqual(['correct', 'wrong', 'wrong']);
    const before = plays;
    await tick(2600);
    expect(plays - before, '"cat", then "hat"').toBeGreaterThanOrEqual(2);
    expect(current.word, 'the next word waits for the model').toBe('cat');
    expect(cards().map(stateOf)).toEqual(['correct', 'wrong', 'wrong']);
  });

  it('the marks belong to one item: the next word starts clean', async () => {
    await mount({wsPreloadedWords: [makePackItem(), generated('dog', ['d', 'o', 'g'], {blendingDistractors: ['dig', 'log', 'cot']})]});
    // Miss the item out, whichever word came first.
    for (let i = 0; i < 3 && current.history.length === 0; i++) {
      const open = cards().filter((card) => stateOf(card) === 'idle');
      await click(open[open.length - 1]); await click(check());
      if (current.history.length === 0) await tick(3100);
    }
    expect(current.history.length).toBe(1);
    const first = current.word;
    expect(cards().some((card) => stateOf(card) !== 'idle')).toBe(true);
    await tick(9000);
    expect(current.word).not.toBe(first);
    expect(cards().length).toBeGreaterThan(1);
    expect(cards().every((card) => stateOf(card) === 'idle')).toBe(true);
    expect(check().disabled).toBe(true);
  });

  it('counting: the tried number is disabled and the right number is marked at the end', async () => {
    await mount({activity: 'counting'});
    const tile = (n) => container.querySelector(`[role="button"][aria-label="Number ${n}"]`);
    expect(check(), 'numbers are read at a glance: one tap answers').toBeNull();
    await click(tile(5));
    expect(current.feedback && current.feedback.isCorrect).toBe(false);
    expect(stateOf(tile(5))).toBe('wrong');
    expect(tile(5).getAttribute('aria-disabled')).toBe('true');
    await tick(3100);
    await click(tile(5));
    expect(current.history, 'a disabled number does not answer').toEqual([]);
    await click(tile(4));
    expect(current.history.length).toBe(1);
    expect(current.history[0].correct).toBe(false);
    expect(stateOf(tile(3))).toBe('correct');
    expect(tile(3).getAttribute('aria-current')).toBe('true');
    expect(stateOf(tile(4))).toBe('wrong');
  });
});

describe('fewer choices for beginners', () => {
  const countFor = async (activity, difficulty, words) => {
    await mount({activity, wordSoundsDifficulty: difficulty, ...(words ? {wsPreloadedWords: words} : {})});
    const n = cards().length;
    await act(async () => root.unmount()); root = null; container.remove();
    return n;
  };
  it('isolation: easy 3, medium 4, hard keeps the six of the saved board', async () => {
    expect(await countFor('isolation', 'easy')).toBe(3);
    expect(await countFor('isolation', 'medium')).toBe(4);
    expect(await countFor('isolation', 'hard')).toBe(6);
  });
  it('blending: easy 3, medium 4, hard keeps a generated board of six', async () => {
    const words = [generated('cat', ['k', 'a', 't'], {blendingDistractors: ['cot', 'cut', 'bat', 'dog', 'sun']})];
    expect(await countFor('blending', 'easy', words)).toBe(3);
    expect(await countFor('blending', 'medium', words)).toBe(4);
    expect(await countFor('blending', 'hard', words)).toBe(6);
  });
  it('rhyming: easy 3, medium 4, hard keeps the five of a generated board', async () => {
    const words = [['cat', ['k', 'a', 't'], 'hat'], ['dog', ['d', 'o', 'g'], 'log'], ['sun', ['s', 'u', 'n'], 'fun'], ['bed', ['b', 'e', 'd'], 'red'], ['pig', ['p', 'i', 'g'], 'big']]
      .map(([w, p, rhyme]) => generated(w, p, {rhymeWord: rhyme, rhymes: [rhyme], rhymeDistractors: []}));
    expect(await countFor('rhyming', 'easy', words)).toBe(3);
    expect(await countFor('rhyming', 'medium', words)).toBe(4);
    expect(await countFor('rhyming', 'hard', words)).toBe(5);
  });
  it('counting: easy offers the count with two either side, medium 1-8, hard the full row', async () => {
    const numbers = () => [...container.querySelectorAll('[role="button"][aria-label^="Number "]')].map((e) => e.textContent.trim());
    await mount({activity: 'counting'});
    expect(numbers()).toEqual(['1', '2', '3', '4', '5']);
    expect(container.querySelector('[aria-label="common.11_or_more_sounds"]')).toBeNull();
    await act(async () => root.unmount()); container.remove();
    await mount({activity: 'counting', wordSoundsDifficulty: 'medium'});
    expect(numbers()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    await act(async () => root.unmount()); container.remove();
    await mount({activity: 'counting', wordSoundsDifficulty: 'hard'});
    expect(numbers()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(container.querySelector('[aria-label="common.11_or_more_sounds"]')).toBeTruthy();
  });
  it('a saved board is trimmed for display only and keeps its answer', async () => {
    const item = makePackItem();
    const saved = JSON.stringify(item.activityItems);
    await mount({activity: 'isolation', wsPreloadedWords: [item]});
    expect(cards().length).toBe(3);
    expect(JSON.stringify(item.activityItems), 'the pack is not rewritten').toBe(saved);
    // The saved order is k, a, t, m, s, b: /k/ stays first and is still the answer.
    await click(cards()[0]); await click(check());
    expect(current.history.length).toBe(1);
    expect(current.history[0].correct).toBe(true);
    expect(stateOf(cards()[0])).toBe('correct');
  });
  it('auto difficulty under 40% on the lowest band shows two choices', async () => {
    const words = ['cat', 'dog', 'sun', 'pig', 'map', 'bed', 'hat', 'log'];
    const misses = words.map((word, i) => ({activity: 'blending', word, correct: false, attempts: 2, difficulty: 'easy', mode: 'sound_only', timestamp: i}));
    await mount({wordSoundsDifficulty: 'auto', history: misses});
    expect(cards().length).toBe(2);
    await click(cards()[CAT]); await click(check());
    expect(current.history[current.history.length - 1].correct, 'the answer is one of the two').toBe(true);
  });
});

describe('isolation asks for a position the level can manage', () => {
  const heading = () => container.querySelector('h3.text-2xl').textContent;
  const lastPick = () => vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const words = [generated('cat', ['k', 'a', 't'])];
  it('easy asks only for the first sound', async () => {
    lastPick();
    await mount({activity: 'isolation', wsPreloadedWords: words});
    expect(heading()).toBe('What is the 1st sound?');
  });
  it('medium asks for the first or the last sound, hard any sound', async () => {
    const spy = lastPick();
    await mount({activity: 'isolation', wsPreloadedWords: words, wordSoundsDifficulty: 'medium'});
    expect(heading()).toBe('What is the 3rd sound?');
    await act(async () => root.unmount()); container.remove();
    spy.mockReturnValue(0.5);
    await mount({activity: 'isolation', wsPreloadedWords: words, wordSoundsDifficulty: 'hard'});
    expect(heading()).toBe('What is the 2nd sound?');
    expect(core.isolationPositions('medium', 3)).toEqual([0, 2]);
    expect(core.isolationPositions('easy', 5)).toEqual([0]);
    expect(core.isolationPositions(undefined, 3)).toEqual([0, 1, 2]);
  });
  it('a saved board keeps its saved position', async () => {
    const item = makePackItem();
    item.activityItems.isolation = {position: 2, correctSound: 't', options: ['k', 'a', 't', 'm', 's', 'b']};
    await mount({activity: 'isolation', wsPreloadedWords: [item]});
    expect(heading()).toBe('What is the 3rd sound?');
    expect(cards().length).toBe(3);
  });
});

describe('probes are unchanged', () => {
  it('one tap answers, with no Check, no selection and no marks', async () => {
    await mount({activity: 'isolation', isProbeMode: true});
    expect(cards().length, 'the saved board is not trimmed').toBe(6);
    expect(check()).toBeNull();
    expect(cards().every((card) => !card.hasAttribute('aria-pressed'))).toBe(true);
    await click(cards()[1]); // /a/ is wrong for "cat", first sound
    expect(current.history.length, 'graded at once, no retry').toBe(1);
    expect(current.history[0].correct).toBe(false);
    expect(cards().every((card) => stateOf(card) === 'idle')).toBe(true);
    expect(container.querySelector('[data-ws-card-mark]')).toBeNull();
  });
  it('a probe keeps the full number row', async () => {
    await mount({activity: 'counting', isProbeMode: true});
    expect(container.querySelectorAll('[role="button"][aria-label^="Number "]').length).toBe(10);
  });
});

describe('find-all boards', () => {
  // 2026-11-13 (from the AlloFlow Packets review, polish_ws F4): a word that does not belong is out after its
  // first tap, marked "Not this one", and a second tap of it costs no try. Before, each tap of the same wrong word
  // was another miss, so a double tap could end the item. With the budget of distractors + 1 the item now ends when
  // every family word is found, as in a practice file.
  it('Word Families: a wrong word is out after its first tap; a second tap costs no try', async () => {
    await mount({activity: 'word_families'});
    const tiles = () => [...container.querySelectorAll('[data-ws-bank-pick]')];
    expect(tiles().length).toBe(5); // hat, bat, mat + dog, sun
    expect(container.querySelector('[data-ws-card-state]')).toBeNull();
    // Choose every tile once, in order (a found word leaves the bank; a wrong one stays, out).
    let foils = 0;
    for (let guard = 0; guard < 10 && current.history.length === 0; guard++) {
      const next = tiles().find((t) => !t.hasAttribute('aria-disabled'));
      if (!next) break;
      const label = next.getAttribute('aria-label'), before = tiles().length;
      await click(next);
      if (tiles().length !== before) continue;
      foils++;
      expect(current.feedback && current.feedback.isCorrect, label).toBe(false);
      await tick(1600); // the shake ends; the mark stays
      // The same button (the bank keeps its keys). After a miss the words may be shown, so its name can change
      // from "option n" to the word; either way it ends "Not this one".
      const out = next;
      expect(tiles(), label).toContain(out);
      expect(out.getAttribute('aria-label'), label).toMatch(/, Not this one$/);
      expect(out.getAttribute('data-ws-card-state'), label).toBe('wrong');
      expect(out.getAttribute('aria-disabled'), label).toBe('true');
      expect(out.querySelector('[data-ws-card-mark="wrong"]'), label).toBeTruthy();
      const feedback = current.feedback, messages = JSON.stringify(current.history);
      await click(out);
      await click(out);
      expect(current.feedback, label + ': tapped again, nothing new').toBe(feedback);
      expect(JSON.stringify(current.history), label).toBe(messages);
    }
    await tick(1500);
    expect(foils, 'dog and sun').toBe(2);
    expect(current.history).toHaveLength(1);
    expect(current.history[0].correct).toBe(true);
  });
});

describe('word scramble', () => {
  it('the answer slots are in the row that shrinks and wraps', async () => {
    const word = 'butterflies';
    await mount({activity: 'word_scramble', wsPreloadedWords: [generated(word, ['b', 'u', 't', 'er', 'f', 'l', 'ie', 'z'])]});
    const slots = [...container.querySelectorAll('[data-ws-spell-slot]')];
    expect(slots.length).toBe(11);
    expect(slots.every((slot) => slot.parentElement.classList.contains('ws-scramble-slots'))).toBe(true);
    const css = document.getElementById('ws-a11y-css').textContent;
    expect(css).toMatch(/\.ws-scramble-slots \{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/\.ws-scramble-slots > \[data-ws-spell-slot\] \{[^}]*flex: 0 1 2\.5rem/);
  });
});
