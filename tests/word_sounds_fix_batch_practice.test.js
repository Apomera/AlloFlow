// Student practice fixes, 2026-11-09. Each test mounts the real modal as a
// student (or teacher where stated) and plays it the way a child would.
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).word_sounds;
// Real English where it exists, "" otherwise so the in-code fallback shows.
const strings = (_t, key, params = {}) => {
  let text = english[String(key).replace('word_sounds.', '')] || '';
  for (const [name, value] of Object.entries(params || {})) text = text.split('{' + name + '}').join(String(value));
  return text;
};
let Modal, root, container, props, current, originalAudio, originalGlobalAudio;
const onClose = vi.fn();
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
  try { window.localStorage.removeItem('allo_word_sounds_anchor_mode_v1'); } catch (_) { /* no storage */ }
  onClose.mockClear();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

// A pack word built from the "cat" fixture; boards the test does not name are
// dropped so the module derives them from the word itself.
function item(word, phonemes, activityItems) {
  const cat = makePackItem();
  if (word === 'cat' && !activityItems) return cat;
  return {...cat, id: word, term: word, word, targetWord: word, displayWord: word, phonemes, graphemes: phonemes,
    phonemeCount: phonemes.length, syllables: [word], rhymeWord: '', rhymes: [], firstSound: phonemes[0], _ttsAssets: undefined,
    activityItems: activityItems || {}};
}
function Host(overrides) {
  const [activity, setActivity] = React.useState(overrides.activity || 'counting');
  const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
  const [history, setHistory] = React.useState([]), [feedback, setFeedbackState] = React.useState(null);
  const [confusions, setConfusions] = React.useState({});
  const messages = React.useRef([]);
  const setFeedback = React.useCallback((next) => { if (next && next.message) messages.current.push(next.message); setFeedbackState(next); }, []);
  current = {activity, word, data, score, history, feedback, confusions, setActivity, messages: messages.current};
  const {activity: _ignored, ...rest} = overrides;
  return React.createElement(Modal, {...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false,
    disableAnimations: true, sessionId: 'fix-batch', wsPreloadedWords: [makePackItem()],
    wordSoundsDifficulty: 'easy', wordSoundsSessionGoal: 10, onClose, getWordSoundsString: strings, ...rest,
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
    currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
    wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
    wordSoundsConfusionPatterns: confusions, setWordSoundsConfusionPatterns: setConfusions});
}
async function tick(ms) { await act(async () => vi.advanceTimersByTimeAsync(ms)); }
async function mount(overrides = {}) {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); props = overrides;
  await act(async () => root.render(React.createElement(Host, props))); await tick(120);
}
const click = async (element) => { expect(element, 'control to click').toBeTruthy(); await act(async () => element.click()); };
const count = (value) => click(container.querySelector(`[role="button"][aria-label="Number ${value}"]`));
const anchorCard = () => container.querySelector('[role="region"][aria-label^="Anchor"]');
const button = (text) => [...container.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const recap = () => container.querySelector('[aria-labelledby="word-sounds-session-complete-title"]');
const pressEscape = () => act(async () => {
  (document.activeElement && container.contains(document.activeElement) ? document.activeElement : container.querySelector('[role="dialog"]'))
    .dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
});
const typeInto = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', {bubbles: true})); });
};

describe('1. the anchor card never gives the answer', () => {
  it('stays off the screen until the final answer, then shows the first SOUND of the word', async () => {
    await mount({wsPreloadedWords: [item('ship', ['sh', 'i', 'p'])]});
    expect(current.word).toBe('ship');
    expect(anchorCard(), 'before any answer').toBeNull();
    expect(container.textContent).not.toMatch(/key word/i);
    await count(2);
    expect(current.history).toHaveLength(0);
    expect(anchorCard(), 'after a first miss, with a retry still to come').toBeNull();
    await tick(3100);
    await count(3);
    const card = anchorCard();
    expect(card, 'after the final answer').toBeTruthy();
    expect(card.textContent).toContain('SH');
    expect(card.textContent).not.toContain('sun');
    expect(card.querySelector('[data-ws-anchor-teacher-note]'), 'teacher note on a student screen').toBeNull();
    // The card showed only after the answer, so the row is honestly sound-only.
    expect(current.history[0]).toMatchObject({word: 'ship', correct: true, mode: 'sound_only', textSupported: false});
    await tick(2100);
    expect(anchorCard(), 'gone again for the next item').toBeNull();
  });

  it('shows the teacher note to a teacher only', async () => {
    await mount({isTeacherMode: true, wsPreloadedWords: [item('ship', ['sh', 'i', 'p'])]});
    await count(3);
    expect(anchorCard().querySelector('[data-ws-anchor-teacher-note]').textContent).toContain('Teacher note:');
  });

  it('picks the card by sound and the word\'s spelling, or none at all', () => {
    const {anchorKeyForSound, getAnchor} = window.__alloAnchor;
    expect(anchorKeyForSound('sh', 'ship')).toBe('sh');
    expect(anchorKeyForSound('ch', 'chat')).toBe('ch');
    expect(anchorKeyForSound('f', 'phone')).toBe('ph');
    expect(getAnchor(anchorKeyForSound('f', 'phone')).ipa).toBe('f');
    expect(anchorKeyForSound('s', 'city')).toBe('s');
    expect(anchorKeyForSound('k', 'cat')).toBe('c');
    expect(anchorKeyForSound('k', 'kite')).toBe('k');
    expect(anchorKeyForSound('/sh/', 'ship')).toBe('sh');
    expect(anchorKeyForSound('zh', 'vision'), 'no card for this sound').toBeNull();
    expect(anchorKeyForSound('', 'cat')).toBeNull();
  });

  it('never prints the target word as the key word, even where the card may show early', async () => {
    // Missing Letter may show the card once the child presses "Show word".
    await mount({activity: 'missing_letter', wsPreloadedWords: [item('dog', ['d', 'o', 'g'])]});
    expect(anchorCard()).toBeNull();
    await click(container.querySelector('[data-testid="word-sounds-word-reveal"]'));
    expect(anchorCard(), 'the /d/ card has "dog" as its key word').toBeNull();
    expect(container.textContent).not.toMatch(/key word/i);
  });

  it('records the card as printed support when it showed before the answer', async () => {
    await mount({activity: 'missing_letter', wsPreloadedWords: [item('dig', ['d', 'i', 'g'])]});
    expect(anchorCard()).toBeNull();
    await click(container.querySelector('[data-testid="word-sounds-word-reveal"]'));
    expect(anchorCard().textContent, 'the /d/ card, key word dog').toContain('dog');
    const options = () => [...container.querySelectorAll('button[aria-pressed]')].filter((b) => b.textContent.length === 1);
    for (let k = 0; k < 2 && current.history.length === 0; k++) {
      await click(options()[k]);
      await click([...container.querySelectorAll('button')].find((b) => /Check Answer/.test(b.getAttribute('aria-label') || '')));
      await tick(100);
    }
    expect(current.history[0].cluesShown).toContain('anchor_card');
    expect(current.history[0]).toMatchObject({textSupported: true, mode: 'visual'});
  });
});

describe('2. every wrong response is logged', () => {
  it('keeps the corrected first pick: confusion pattern and a wrong list on the row', async () => {
    await mount({activity: 'orthography'});
    expect(current.word).toBe('cat');
    const input = container.querySelector('[data-ws-spell-input]');
    await typeInto(input, 'kat');
    await click(button('Check Spelling'));
    expect(current.history, 'first miss is a retry, not a row').toHaveLength(0);
    expect(current.confusions).toEqual({'cat->kat': 1});
    await tick(3100);
    await typeInto(container.querySelector('[data-ws-spell-input]'), 'cat');
    await click(button('Check Spelling'));
    expect(current.history).toHaveLength(1);
    expect(current.history[0]).toMatchObject({word: 'cat', correct: true, attempts: 2, firstTry: false, wrong: ['kat']});
    expect(current.confusions).toEqual({'cat->kat': 1});
  });

  it('logs both picks of a double miss, and no wrong list on a first-try answer', async () => {
    await mount();
    await count(2); await count(5);
    expect(current.history[0]).toMatchObject({correct: false, attempts: 2, wrong: ['2', '5']});
    expect(current.confusions, 'counts are not sound confusions').toEqual({});
    await tick(3100);
    await count(3);
    expect(current.history[1].correct).toBe(true);
    expect('wrong' in current.history[1]).toBe(false);
  });

  it('logs the word actually chosen in Blend Sounds, which grades with a sentinel', async () => {
    await mount({activity: 'blending'});
    const choices = () => [...container.querySelectorAll('[data-ws-blend-choice]')];
    expect(choices().length).toBeGreaterThan(1);
    // Tap until the item is final; every wrong tap must be on the row and in the patterns.
    for (let k = 0; k < 2 && current.history.length === 0; k++) { await click(choices()[k]); await tick(100); }
    const row = current.history[0];
    const wrong = row.wrong || [];
    expect(wrong.length).toBe(row.correct ? row.attempts - 1 : row.attempts);
    expect(Object.values(current.confusions).reduce((a, b) => a + b, 0)).toBe(wrong.length);
    for (const pick of wrong) { expect(pick).not.toBe('incorrect'); expect(current.confusions['cat->' + pick]).toBe(1); }
  });
});

describe('3. session recap', () => {
  it('keys results by activity and word', () => {
    const recapOf = window.__alloWordSoundsRecap;
    const result = recapOf([
      {word: 'dog', correct: false, attempts: 2, activity: 'blending'},
      {word: 'dog', correct: true, attempts: 1, activity: 'rhyming'},
      {word: 'sun', correct: true, attempts: 1, activity: 'blending'},
      {word: 'hat', correct: false, attempts: 2, activity: 'rhyming'},
      {word: 'hat', correct: true, attempts: 1, activity: 'rhyming'},
      null,
    ]);
    expect(result.activities).toEqual(['blending', 'rhyming']);
    expect(result.words).toEqual([
      {word: 'dog', missedIn: ['blending'], attempts: 2},
      {word: 'sun', missedIn: [], attempts: 1},
      {word: 'hat', missedIn: [], attempts: 1},
    ]);
    expect(result.missed).toEqual([{activity: 'blending', word: 'dog'}]);
  });

  it('shows a word missed in one activity as missed, and replays it in that activity', async () => {
    const copied = [];
    Object.defineProperty(window.navigator, 'clipboard', {configurable: true, value: {writeText: async (text) => { copied.push(text); }}});
    await mount({wordSoundsSessionGoal: 1, isParentMode: true});
    await count(2); await count(5);              // Sound Counting: cat missed
    await tick(3100);
    await act(async () => current.setActivity('isolation')); await tick(120);
    expect(container.querySelector('[data-ws-header-subtitle]').textContent).toBe('Find Sounds');
    const iso = current.data.activityItems.isolation;
    await click(container.querySelector(`button[aria-label="Choose Sound ${iso.options.indexOf(iso.correctSound) + 1}"]`));
    await tick(2100);                            // Find Sounds: cat right -> goal met
    expect(recap()).toBeTruthy();
    const chip = recap().querySelector('[data-ws-recap-word="cat"]');
    expect(chip.getAttribute('data-ws-recap-missed')).toBe('true');
    expect(chip.textContent).toContain('cat (missed in Sound Counting)');
    const replay = recap().querySelector('[data-ws-practice-missed]');
    expect(replay.textContent).toContain('(1)');
    // Parent summary names every activity practised.
    await click(button('Copy Summary'));
    await tick(50);
    expect(copied).toHaveLength(1);
    expect(copied[0]).toContain('Activities: Sound Counting, Find Sounds');
    expect(copied[0]).toContain('✗ cat (missed in Sound Counting)');
    // Replay: back in Sound Counting with "cat", then the recap again.
    await click(recap().querySelector('[data-ws-practice-missed]'));
    await tick(120);
    expect(recap()).toBeNull();
    expect(current.activity).toBe('counting');
    expect(current.word).toBe('cat');
    await count(3);
    await tick(2100);
    expect(recap(), 'the replay ends at the recap, it does not run on').toBeTruthy();
    expect(current.history.at(-1)).toMatchObject({activity: 'counting', word: 'cat', correct: true});
    expect(recap().querySelector('[data-ws-recap-word="cat"]').getAttribute('data-ws-recap-missed')).toBe('false');
    expect(recap().querySelector('[data-ws-practice-missed]')).toBeNull();
  });
});

describe('4. spelling a word with an apostrophe, hyphen or space', () => {
  it('lays letters around fixed slots and compares letters only', () => {
    const {spellAlign, spellSame} = window.__alloAnchor;
    expect(spellAlign("don't", 'do')).toBe('do');
    expect(spellAlign("don't", 'don')).toBe("don'");
    expect(spellAlign("don't", "don't")).toBe("don't");
    expect(spellAlign('ice-cream', 'icecream')).toBe('ice-cream');
    expect(spellAlign('ice cream', 'icec')).toBe('ice c');
    expect(spellAlign("don't", '')).toBe('');
    expect(spellAlign('dog', 'do')).toBe('do');
    expect(spellSame('dont', "don't")).toBe(true);
    expect(spellSame('icecream', 'ice-cream')).toBe(true);
    expect(spellSame('d_nt', "don't")).toBe(false);
    expect(spellSame('café', 'café')).toBe(true);
    expect(spellSame('cafe', 'café')).toBe(false);
    expect(spellSame('кот', 'кот')).toBe(true);
  });

  it('Spelling Bee: "don\'t" has four letter slots and can be spelled with the letter tiles', async () => {
    await mount({activity: 'spelling_bee', wsPreloadedWords: [item("don't", ['d', 'o', 'n', 't'])]});
    expect(current.word).toBe("don't");
    expect(container.querySelectorAll('[data-ws-spell-slot]')).toHaveLength(4);
    expect([...container.querySelectorAll('[data-ws-spell-fixed]')].map((e) => e.textContent)).toEqual(["'"]);
    const keys = container.querySelector('[data-ws-letter-keys]');
    const tile = (letter) => [...keys.querySelectorAll('button')].find((b) => b.textContent === letter);
    for (const letter of ['d', 'o', 'n']) await click(tile(letter));
    const input = container.querySelector('input[type="text"]');
    expect(input.value, 'the apostrophe is filled in').toBe("don'");
    await click(keys.querySelector('button[aria-label="Delete the last letter"]'));
    expect(input.value, 'delete takes the letter, not only the apostrophe').toBe('do');
    for (const letter of ['n', 't']) await click(tile(letter));
    expect(input.value).toBe("don't");
    await click(button('Check Spelling'));
    expect(current.history[0]).toMatchObject({word: "don't", correct: true, attempts: 1});
  });

  it('Word Scramble offers letter tiles only and accepts them', async () => {
    await mount({activity: 'word_scramble', wsPreloadedWords: [item('ice-cream', ['i', 's', 'k', 'r', 'ee', 'm'])]});
    const tiles = () => [...container.querySelectorAll('[role="button"][aria-label]')].filter((e) => e.getAttribute('aria-label').length === 1 && e.textContent.length === 1);
    expect(tiles().map((e) => e.textContent.toLowerCase()).sort().join('')).toBe('acceeimr');
    expect([...container.querySelectorAll('[data-ws-spell-fixed]')].map((e) => e.textContent)).toEqual(['-']);
    for (const letter of 'icecream') await click(tiles().find((e) => e.textContent.toLowerCase() === letter && e.getAttribute('aria-disabled') !== 'true'));
    await click([...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === (english.word_scramble_check || 'Check Answer')));
    expect(current.history[0]).toMatchObject({word: 'ice-cream', correct: true});
  });

  it('Missing Letter never hides the space', async () => {
    // "ab c": the old index (character total modulo length) landed on the space.
    await mount({activity: 'missing_letter', wsPreloadedWords: [item('ab c', ['a', 'b', 'k'])]});
    expect([...container.querySelectorAll('[data-ws-spell-fixed]')]).toHaveLength(1);
    const options = [...container.querySelectorAll('button[aria-pressed]')].filter((b) => b.textContent.length === 1).map((b) => b.textContent);
    expect(options.length).toBeGreaterThan(1);
    expect(options.every((o) => /[A-Z]/.test(o))).toBe(true);
    expect(options).toContain('C');
  });

  it('Sight & Spell accepts the letters of "don\'t" from its letter tiles', async () => {
    await mount({activity: 'orthography', wsPreloadedWords: [item("don't", ['d', 'o', 'n', 't'])]});
    await typeInto(container.querySelector('[data-ws-spell-input]'), 'dont');
    await click(button('Check Spelling'));
    expect(current.history[0]).toMatchObject({word: "don't", correct: true});
  });
});

describe('5. closing mid-session asks a student first', () => {
  it('Escape and the X open "Stop practicing?"; Escape keeps going; Stop closes', async () => {
    await mount();
    await count(3); await tick(2100);
    await pressEscape();
    const confirm = () => container.querySelector('[role="alertdialog"]');
    expect(confirm(), 'confirmation after Escape').toBeTruthy();
    expect(confirm().getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(confirm().getAttribute('aria-labelledby')).textContent).toBe('Stop practicing?');
    expect(document.getElementById(confirm().getAttribute('aria-describedby'))).toBeTruthy();
    expect(document.activeElement.textContent, 'default focus').toBe('Keep going');
    expect(onClose).not.toHaveBeenCalled();
    await pressEscape();
    expect(confirm(), 'Escape = keep going').toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(current.score.total, 'the session is untouched').toBe(1);
    await click(container.querySelector('button[aria-label="common.close"], button[aria-label="Close"]'));
    expect(confirm()).toBeTruthy();
    await click(button('Keep going'));
    expect(confirm()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    await pressEscape();
    await click(confirm().querySelector('[data-ws-stop-now]'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes at once for a teacher, and for a student who has not answered yet', async () => {
    await mount({isTeacherMode: true});
    await count(3); await tick(2100);
    await pressEscape();
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount()); container.remove(); onClose.mockClear();
    await mount();
    await pressEscape();
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes a finished session at once', async () => {
    await mount({wordSoundsSessionGoal: 1});
    await count(3); await tick(2100);
    expect(recap()).toBeTruthy();
    await click(button('Close'));
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('6. a hole in the word list', () => {
  it('skips null and non-object entries instead of throwing', async () => {
    await mount({wsPreloadedWords: [null, makePackItem(), 'junk', 7, undefined]});
    expect(current.word).toBe('cat');
    await count(3);
    expect(current.history[0]).toMatchObject({word: 'cat', correct: true});
  });
});

describe('7. header text', () => {
  it('names the running activity instead of "Choose an activity"', async () => {
    await mount();
    const subtitle = container.querySelector('[data-ws-header-subtitle]');
    expect(subtitle.textContent).toBe('Sound Counting');
    expect(container.textContent).not.toContain('Choose an activity below');
  });

  it('names the next activity in a lesson by its display name', async () => {
    await mount({
      sessionConfig: {studentLocked: true}, initialActivitySequence: ['counting', 'syllable_counting'],
      lessonPlanConfig: {activities: [{id: 'counting', count: 3}, {id: 'syllable_counting', count: 3}], masteryThreshold: 3},
    });
    expect(container.querySelector('[data-ws-header-subtitle]').textContent).toBe('Sound Counting');
    expect(container.textContent).toContain('Next: ' + english.activity_syllable_counting);
    expect(container.textContent).not.toContain('Next: syllable counting');
  });
});

describe('8. the second-miss hint', () => {
  it('Sound Sort says "So close! One more try!" on a second wrong tap, never a bare "One more try!"', async () => {
    await mount({activity: 'sound_sort'});
    const tiles = () => [...container.querySelectorAll('button[data-ws-bank-pick]')];
    expect(tiles().length, 'sound sort tiles').toBeGreaterThan(2);
    // Find a word that does not match: its first tap says "Try again".
    let wrongText = null;
    for (const text of tiles().map((b) => b.textContent)) {
      const seen = current.messages.length;
      await click(tiles().find((b) => b.textContent === text)); await tick(50);
      if (current.messages.slice(seen).some((m) => /Try again/.test(m))) { wrongText = text; break; }
    }
    expect(wrongText, 'a non-matching word on the board').toBeTruthy();
    expect(current.history, 'exploratory taps do not finish the item').toHaveLength(0);
    const seen = current.messages.length;
    await click(tiles().find((b) => b.textContent === wrongText)); await tick(50);
    expect(current.messages.slice(seen)).toEqual(['So close! One more try!']);
  });
});
