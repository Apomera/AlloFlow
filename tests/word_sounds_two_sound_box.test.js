// Sound Mapping, 2026-11-10 (owner decision): one box per SOUND, always. A
// spelling chip may span two boxes when one spelling says two sounds: qu
// (/k/ /w/), x (/k/ /s/, /g/ /z/), the u of cute (/y/ /oo/), le (schwa /l/).
// Board field: chipSpans (boxes each chip covers). Old boards: one box per chip.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, baseProps, setupWordSounds } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';
import { compileWords, core } from './helpers/word_sounds_core.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const MODULE = readFileSync('word_sounds_module.js', 'utf8');

let Modal, root, host, state, originalAudio, originalGlobalAudio;
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
const BANK = ['queen', 'little', 'k', 'w', 'ee', 'n', 'l', 'i', 't', 'schwa', 'qu', 'q', 'u', 'tt', 'le'];
beforeAll(() => { installCanvasStub(); ({ WordSoundsModal: Modal } = setupWordSounds()); });
beforeEach(() => {
  vi.useFakeTimers({ now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = CompleteAudio;
  window.__ALLO_INSTRUCTION_AUDIO = { mapping: 'data:audio/mp3;base64,MAP' };
  window.__ALLO_PHONEME_AUDIO_BANK = Object.fromEntries(BANK.map(key => [key, 'data:audio/mp3;base64,' + key]));
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
function Host({ item }) {
  const [activity, setActivity] = React.useState('mapping'), [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 }), [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
  state = { activity, word, data, score, history };
  const defaults = baseProps(activity);
  return React.createElement(Modal, { ...defaults, allowRuntimeAi: false, isTeacherMode: false, isProbeMode: true,
    disableAnimations: true, sessionId: 'span-' + item.itemId, wsPreloadedWords: [item], wordSoundsDifficulty: 'easy',
    sessionConfig: { fixedForm: true, probeItemCount: 1 }, wordSoundsSessionGoal: 1,
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity, currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData, wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory, wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback });
}
async function mount(item) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, { item })));
  await act(async () => vi.advanceTimersByTimeAsync(150));
}
const boxes = () => [...host.querySelectorAll('button[aria-label]')].filter(b => /mapping_slot|mapping_slots_filled_two|Slot \d|Boxes \d/.test(b.getAttribute('aria-label')));
const emptyBoxes = () => boxes().filter(b => /mapping_slot_empty|Empty Slot/.test(b.getAttribute('aria-label')));
const chip = text => [...host.querySelectorAll('button[aria-label]')].find(b => /select_sound_chip|Select sound/.test(b.getAttribute('aria-label')) && b.textContent.replace(/●/g, '') === text);
const tap = async el => { await act(async () => el.click()); await act(async () => vi.advanceTimersByTimeAsync(50)); };

describe('board data: one box per sound, chips that span', () => {
  it('queen is four sounds with a "qu" chip over boxes 1 and 2; the other activities keep counting sounds', () => {
    const [queen] = compileWords([{ word: 'queen', phonemes: ['k', 'w', 'ee', 'n'] }]);
    expect(queen.phonemes).toEqual(['k', 'w', 'ee', 'n']);
    expect(queen.activityItems.mapping).toMatchObject({ graphemes: ['qu', 'ee', 'n'], chipSpans: [2, 1, 1] });
    expect(queen.activityItems.mapping.chipOrder.map(c => c.text).sort()).toEqual(['ee', 'n', 'qu']);
    expect(queen.activityItems.segmentation.slotCount).toBe(4);
    expect(queen.activityItems.counting.answer).toBe(4);
    expect(queen.activityItems.segmentation.chips.filter(c => !c.isDistractor).map(c => c.phoneme)).toEqual(['k', 'w', 'ee', 'n']);
    expect(queen.activityItems.isolation.options).toContain(queen.activityItems.isolation.correctSound);
    expect(['k', 'w', 'ee', 'n']).toContain(queen.activityItems.isolation.correctSound);
    // Letter activities stay on letters.
    expect(queen.activityItems.spelling_bee.answer).toBe('queen');
    expect([...queen.activityItems.word_scramble.letters].sort().join('')).toBe([...'queen'].sort().join(''));
    expect(queen.activityItems.missing_letter.correctLetter).toHaveLength(1);
  });

  it('x, the u of cute and le span two boxes; "one" stays out with the teacher note', () => {
    const items = compileWords([
      { word: 'box', phonemes: ['b', 'o', 'k', 's'] }, { word: 'cute', phonemes: ['k', 'y', 'oo', 't'] },
      { word: 'little', phonemes: ['l', 'i', 't', 'schwa', 'l'] }, { word: 'one', phonemes: ['w', 'u', 'n'] }]);
    const map = word => items.find(i => i.word === word).activityItems.mapping;
    expect(map('box')).toMatchObject({ graphemes: ['b', 'o', 'x'], chipSpans: [1, 1, 2] });
    expect(map('cute')).toMatchObject({ graphemes: ['c', 'u', 'te'], chipSpans: [1, 2, 1] });
    expect(map('little')).toMatchObject({ graphemes: ['l', 'i', 'tt', 'le'], chipSpans: [1, 1, 1, 2] });
    expect(map('one')).toMatchObject({ supported: false, contentStatus: 'teacher_review_required', graphemes: [] });
    expect(map('one').chipSpans).toBeUndefined();
  });

  it('a board whose spans do not add up to the sounds is refused, never guessed', () => {
    expect(core.mappingChipSpans(['qu', 'ee', 'n'], 4, [2, 1, 1])).toEqual([2, 1, 1]);
    expect(core.mappingChipSpans(['qu', 'ee', 'n'], 4, [1, 1, 1])).toBeNull();
    expect(core.mappingChipSpans(['qu', 'ee', 'n'], 4)).toBeNull();
  });
});

describe('the student board', () => {
  it('shows four boxes for queen; the "qu" chip snaps across two, says it spells two sounds, and plays /k/ then /w/', async () => {
    await mount(itemFor('queen', ['k', 'w', 'ee', 'n']));
    expect(emptyBoxes()).toHaveLength(4);
    const qu = chip('qu');
    expect(qu, [...host.querySelectorAll('button')].map(b => b.getAttribute('aria-label')).join(' | ')).toBeTruthy();
    expect(qu.getAttribute('aria-label')).toMatch(/qu, (word_sounds\.mapping_chip_two_sounds|spells two sounds)$/);
    expect(qu.getAttribute('data-span')).toBe('2');
    expect(chip('ee').getAttribute('data-span')).toBeNull();
    playedSrc.length = 0;
    await tap(qu);
    await act(async () => vi.advanceTimersByTimeAsync(200));
    // One wide box covers boxes 1 and 2; boxes 3 and 4 are still empty.
    const wide = host.querySelector('button[data-span="2"][aria-label*="mapping_slots_filled_two"], button[data-span="2"][aria-label^="Boxes 1 and 2"]');
    expect(wide).toBeTruthy();
    expect(wide.textContent.replace(/●/g, '')).toBe('qu');
    expect(wide.className).toContain('w-44');
    expect(emptyBoxes()).toHaveLength(2);
    const clips = playedSrc.filter(src => /base64,(k|w|qu|q|u)$/.test(src)).map(src => src.split(',')[1]);
    expect(clips).toEqual(['k', 'w']);
    await tap(chip('ee'));
    await tap(chip('n'));
    expect(state.score).toMatchObject({ correct: 1, total: 1 });
    expect(state.history.at(-1)).toMatchObject({ word: 'queen', activity: 'mapping', correct: true });
  });

  it('grades the chips in box order: qu after ee and n is wrong', async () => {
    await mount(itemFor('queen', ['k', 'w', 'ee', 'n']));
    await tap(chip('ee'));
    await tap(chip('n'));
    await tap(chip('qu'));
    expect(state.score).toMatchObject({ correct: 0, total: 1 });
  });

  it('a spanning chip needs two empty boxes side by side; tapping its box takes both back', async () => {
    await mount(itemFor('little', ['l', 'i', 't', 'schwa', 'l']));
    expect(emptyBoxes()).toHaveLength(5);
    await tap(chip('l'));
    await tap(chip('i'));
    await tap(chip('tt'));
    // Take i out of box 2: boxes 2, 4 and 5 are empty. le cannot start in box 2
    // (box 3 is full), so it goes to the first two empty boxes side by side.
    await tap(boxes()[1]);
    expect(emptyBoxes()).toHaveLength(3);
    await tap(chip('le'));
    expect(chip('le'), 'le left the tray').toBeUndefined();
    const wide = host.querySelector('button[data-span="2"]');
    expect(wide.getAttribute('aria-label')).toMatch(/Boxes 4 and 5|mapping_slots_filled_two/);
    expect(emptyBoxes()).toHaveLength(1);
    // Tapping the wide box takes le back and empties both boxes.
    await tap(wide);
    expect(emptyBoxes()).toHaveLength(3);
    expect(chip('le')).toBeTruthy();
    expect(state.score.total).toBe(0);
    await tap(chip('i'));
    await tap(chip('le'));
    expect(state.score).toMatchObject({ correct: 1, total: 1 });
  });

  it('an old saved board (q and u as two chips, no chipSpans) works exactly as before', async () => {
    const item = itemFor('queen', ['k', 'w', 'ee', 'n']);
    item.graphemes = ['q', 'u', 'ee', 'n']; delete item.chipSpans;
    item.activityItems = { ...item.activityItems, mapping: { graphemes: ['q', 'u', 'ee', 'n'], chipOrder: [{ id: 3, text: 'n' }, { id: 0, text: 'q' }, { id: 2, text: 'ee' }, { id: 1, text: 'u' }] } };
    await mount(item);
    expect(emptyBoxes()).toHaveLength(4);
    expect(host.querySelector('button[data-span]')).toBeNull();
    for (const text of ['q', 'u', 'ee', 'n']) await tap(chip(text));
    expect(state.score).toMatchObject({ correct: 1, total: 1 });
  });
});

describe('Present, the printable worksheet and the take-home file', () => {
  const queen = () => ({ ...makePackItem(), id: 'queen', term: 'queen', word: 'queen', targetWord: 'queen', displayWord: 'queen',
    phonemes: ['k', 'w', 'ee', 'n'], phonemeCount: 4, graphemes: ['qu', 'ee', 'n'], chipSpans: [2, 1, 1],
    activityItems: { mapping: { graphemes: ['qu', 'ee', 'n'], chipSpans: [2, 1, 1], chipOrder: [{ id: 2, text: 'n' }, { id: 0, text: 'qu' }, { id: 1, text: 'ee' }] } } });
  const { wsPresentItems } = new Function('WS_CORE', 'React', 'window', 'document',
    MODULE.slice(MODULE.indexOf('    const WS_PRESENT_ACTIVITIES ='), MODULE.indexOf('    const wsPresentKeyAction =')) +
    '\nreturn { wsPresentItems };')(core, {}, globalThis.window, globalThis.document);

  it('Present keeps one sound per box and says which chip spans', () => {
    const [item] = wsPresentItems('mapping', [queen()]);
    expect(item.display).toEqual({ kind: 'map', sounds: ['k', 'w', 'ee', 'n'], letters: ['qu', 'ee', 'n'], spans: [2, 1, 1] });
    const [cat] = wsPresentItems('mapping', [makePackItem()]);
    expect(cat.display).toEqual({ kind: 'map', sounds: ['k', 'a', 't'], letters: ['c', 'a', 't'] });
  });

  it('the worksheet prints /k/ /w/ over one box as wide as two', () => {
    const lines = MODULE.split('\n');
    const begin = lines.findIndex(l => l.includes('// BEGIN WORD SOUNDS PRINTABLES')), end = lines.findIndex(l => l.includes('// END WORD SOUNDS PRINTABLES'));
    const shuffle = lines.findIndex(l => l.startsWith('    const wsPresentShuffle = ')), shuffleEnd = lines.findIndex((l, i) => i > shuffle && l === '    };');
    const P = new Function('wsPresentWord', 'wsPresentSound', 'window', lines.slice(shuffle, shuffleEnd + 1).join('\n') + '\n' + lines.slice(begin, end).join('\n') +
      '\nreturn { wsPrintSheets };')(x => x.word, x => x, {});
    const TEXT = { title: 'Sheet', name: 'Name:', directions: 'Do it.', listen: 'Listen.', all: 'All.', picture: 'Picture {n}', keyTitle: 'Answer key', say: 'Say:', sayTitle: 'Say', sayNote: 'Read.', print: 'Print' };
    const [item] = wsPresentItems('mapping', [queen()]);
    const doc = new DOMParser().parseFromString(P.wsPrintSheets([{ items: [{ ...item, activity: 'mapping', word: 'queen', promptText: 'Map it.' }] }], '', TEXT, () => null, 'none'), 'text/html');
    const cells = [...doc.querySelectorAll('.ws-ws-map > div')];
    expect(cells.map(c => c.textContent.trim())).toEqual(['/k/ /w/', '/ee/', '/n/']);
    const wide = cells[0].querySelector('.ws-ws-box');
    expect(wide.getAttribute('data-span')).toBe('2');
    expect(wide.getAttribute('style')).toContain('calc(2 * min(4.2rem,1.1in) + 8px)');
    expect(cells[1].querySelector('.ws-ws-box').getAttribute('style')).toBeNull();
    // The old one-box-per-chip worksheet is unchanged.
    const [cat] = wsPresentItems('mapping', [makePackItem()]);
    const old = new DOMParser().parseFromString(P.wsPrintSheets([{ items: [{ ...cat, activity: 'mapping', word: 'cat', promptText: 'Map it.' }] }], '', TEXT, () => null, 'none'), 'text/html');
    expect(old.querySelector('.ws-ws-map').innerHTML).toBe('<div>/k/<span class="ws-ws-box"></span></div><div>/a/<span class="ws-ws-box"></span></div><div>/t/<span class="ws-ws-box"></span></div>');
  });

  it('the take-home adapter builds the spanning chip, plays its two clips, and grades in slot order', () => {
    const mod = { exports: {} };
    new Function('module', 'exports', readFileSync('word_sounds_take_home/adapters/mapping.js', 'utf8'))(mod, mod.exports);
    const adapter = mod.exports;
    const env = { word: 'queen', wordClip: () => 'W', bankClip: () => 'P', label: p => String(p), phonemeClip: label => 'c_' + label };
    const { item } = adapter.prepare(queen(), env);
    expect(item.spans).toEqual([2, 1, 1]);
    expect(item.chips).toEqual([{ text: 'n', audio: 'c_n' }, { text: 'qu', audio: 'c_k', audios: ['c_k', 'c_w'], span: 2 }, { text: 'ee', audio: 'c_ee' }]);
    // An old board: one slot per chip, chips exactly as before.
    const old = adapter.prepare({ ...makePackItem(), chipSpans: undefined }, { ...env, word: 'cat' }).item;
    expect(old.spans).toBeUndefined();
    expect(old.chips.every(c => Object.keys(c).join() === 'text,audio')).toBe(true);
    // Render with a small ctx.
    const root = document.createElement('div');
    const plays = [], answers = [];
    const el = (tag, attrs, kids) => { const n = document.createElement(tag); Object.keys(attrs || {}).forEach(k => { if (k === 'text') n.textContent = attrs[k]; else if (k === 'on') Object.keys(attrs.on).forEach(ev => n.addEventListener(ev, attrs.on[ev])); else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]); }); (kids || []).forEach(c => c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)); return n; };
    const L = new Proxy(adapter.labels, { get: (t, k) => t[k] || String(k) });
    const ctx = { root, el, L, fmt: (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k]), isDone: () => false, play: id => plays.push([id]), playAll: ids => plays.push(ids),
      announce: () => {}, support: () => {}, answer: (text, right) => answers.push([text, right]) };
    adapter.render({ ...item, word: 'queen' }, ctx);
    const slotBtns = () => [...root.querySelectorAll('ol.slots button')];
    const visible = () => slotBtns().filter(b => !b.parentNode.hidden);
    expect(slotBtns()).toHaveLength(4);
    const pick = text => [...root.querySelectorAll('ul button.primary')].find(b => b.textContent === text);
    expect(pick('qu').getAttribute('aria-label')).toContain('qu spells two sounds.');
    // A spanning chip cannot start in the last slot.
    pick('qu').click(); slotBtns()[3].click();
    expect(slotBtns().filter(b => /empty/.test(b.getAttribute('aria-label')))).toHaveLength(4);
    slotBtns()[0].click();
    expect(plays.at(-1)).toEqual(['c_k', 'c_w']);
    expect(visible()).toHaveLength(3);
    expect(visible()[0].getAttribute('data-span')).toBe('2');
    expect(visible()[0].getAttribute('aria-label')).toBe('Slots 1 and 2: qu, two sounds');
    pick('ee').click(); slotBtns()[2].click();
    pick('n').click(); slotBtns()[3].click();
    expect(answers).toEqual([['qu ee n', true]]);
  });
});
