// Word Families: learner play skips a word whose board cannot be played (no
// reviewed family, or a board rejected by wordFamilyBoardIssue) instead of
// stranding the student on the review notice. Teachers keep the notice and
// see the skipped words named on the review screen (2026-09-28 decision).
// WS_FIX0928_SOURCE / WS_FIX0928_MISC point the checks at other copies of
// word_sounds_module.js / misc_components_module.js (mutation runs).
import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem, makeThrowingAi } from './helpers/word_sounds_pack_fixture.js';

const SOURCE_PATH = process.env.WS_FIX0928_SOURCE || 'word_sounds_module.js';
const MISC_PATH = process.env.WS_FIX0928_MISC || 'misc_components_module.js';
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const REVIEW = english.word_families_review_needed;
const EAR = String.fromCodePoint(0x1F442);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const require = createRequire(import.meta.url), modules = resolve('desktop/web-app/node_modules');
let React, client, act, Modal, RealPanel, panelProps = null; const mounted = [];
beforeAll(() => {
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  window.React = React;
  new Function(readFileSync(MISC_PATH, 'utf8'))();
  RealPanel = window.WordSoundsReviewPanel;
  if (typeof RealPanel !== 'function') throw Error('misc_components did not register WordSoundsReviewPanel');
  // The modal resolves the panel at render time; this stub records what the
  // player hands the teacher's review screen.
  window.WordSoundsReviewPanel = (props) => { panelProps = props; return React.createElement('div', { 'data-testid': 'review-panel-stub' }); };
  Modal = setupWordSounds().WordSoundsModal;
  if (process.env.WS_FIX0928_SOURCE) {
    delete window.AlloModules.WordSoundsModal; // the module skips a duplicate load
    new Function(readFileSync(SOURCE_PATH, 'utf8'))(); Modal = window.AlloModules.WordSoundsModal;
    if (typeof Modal !== 'function') throw Error('override source did not register WordSoundsModal');
  }
});
afterEach(() => { panelProps = null; for (const { root, host, observer } of mounted.splice(0)) { observer.disconnect(); act(() => root.unmount()); host.remove(); } });

// Pack words. cat/hat carry valid prepared boards; rhythm/crypt have no
// family at all; dog carries a teacher edit that scores "log" on both sides.
const base = makePackItem();
const packWord = (word, extra = {}) => {
  const items = { ...base.activityItems }; delete items.word_families;
  return { ...base, id: word, term: word, word, targetWord: word, displayWord: word, familyEnding: '', familyMembers: [],
    activityItems: items, _ttsAssets: { ...base._ttsAssets, [word]: { mime: 'audio/webm', base64: 'BBBB' } }, ...extra };
};
const CAT = base;
const HAT = packWord('hat', { activityItems: { ...base.activityItems, word_families: { rime: 'at', options: ['cat', 'bat', 'mat'], distractors: ['dog', 'sun'] } } });
const RHYTHM = packWord('rhythm');
const CRYPT = packWord('crypt');
const DOG = packWord('dog', { rimeFamilyMembers: { teacherEdited: true, rime: 'og', words: ['log'], distractors: ['log'] } });
const PLAYABLE = ['cat', 'hat'];
const UNPLAYABLE = ['rhythm', 'crypt', 'dog'];

async function mountHost(overrides) {
  const log = { words: [], xp: 0, mastery: 0 };
  const api = {};
  const calls = [];
  function Host() {
    const [activity, setActivity] = React.useState(overrides.wordSoundsActivity);
    const [word, setWord] = React.useState(null);
    const [phonemes, setPhonemes] = React.useState(null);
    const [feedback, setFeedback] = React.useState(null);
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [progress, setProgress] = React.useState(0);
    const [preloaded, setPreloaded] = React.useState(overrides.wsPreloadedWords);
    const [history, setHistory] = React.useState([]);
    Object.assign(api, { activity, word, history, score, progress, feedback, setWord, setPhonemes });
    return React.createElement(Modal, {
      ...baseProps(overrides.wordSoundsActivity),
      allowRuntimeAi: false,
      callGemini: makeThrowingAi(calls, 'callGemini'), callTTS: makeThrowingAi(calls, 'callTTS'), callImagen: makeThrowingAi(calls, 'callImagen'),
      glossaryTerms: [],
      getWordSoundsString: (_t, key) => english[key.replace('word_sounds.', '')] || key,
      onScoreUpdate: () => { log.xp++; },
      setPhonemeMastery: () => { log.mastery++; },
      ...overrides,
      wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
      currentWordSoundsWord: word, setCurrentWordSoundsWord: (w) => { log.words.push(w); setWord(w); },
      wordSoundsPhonemes: phonemes, setWordSoundsPhonemes: setPhonemes,
      wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
      wordSoundsScore: score, setWordSoundsScore: setScore,
      wordSoundsSessionProgress: progress, setWordSoundsSessionProgress: setProgress,
      wsPreloadedWords: preloaded, setWsPreloadedWords: setPreloaded,
      wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    });
  }
  const host = document.createElement('div'); document.body.appendChild(host);
  // Records whether the review notice was EVER on screen, not just at the end.
  const seen = { review: false };
  const observer = new MutationObserver(() => { if (host.textContent.includes(REVIEW)) seen.review = true; });
  observer.observe(host, { childList: true, subtree: true, characterData: true });
  const root = client.createRoot(host); mounted.push({ host, root, observer });
  await act(async () => { root.render(React.createElement(Host)); await wait(60); });
  return { host, log, api, seen, calls };
}
const settle = (ms = 60) => act(async () => { await wait(ms); });
const served = (log) => log.words.filter(Boolean).map((w) => String(w).toLowerCase());
const wordTiles = (host) => [...host.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')).filter((l) => /^[a-z]+$/.test(l));
const buttonWith = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const student = (pack, extra = {}) => ({ wordSoundsActivity: 'word_families', wsPreloadedWords: pack, isTeacherMode: false, ...extra });

describe('Word Families: a student queue skips unplayable words and continues', () => {
  it('never serves an unplayable word from the queue', async () => {
    const { log, api, seen, host } = await mountHost(student([RHYTHM, CRYPT, DOG, CAT, HAT]));
    expect(served(log).length).toBeGreaterThan(0);
    expect(served(log).filter((w) => UNPLAYABLE.includes(w))).toEqual([]);
    expect(PLAYABLE).toContain(String(api.word).toLowerCase());
    expect(api.activity).toBe('word_families');
    expect(seen.review).toBe(false);
    await act(async () => buttonWith(host, EAR).click());
    expect(wordTiles(host).length).toBeGreaterThan(0);
  });

  it('skips an unplayable word that becomes current and moves to the next playable word', async () => {
    const { log, api, seen, host } = await mountHost(student([RHYTHM, CRYPT, DOG, CAT, HAT]));
    log.words.length = 0;
    await act(async () => { api.setWord('rhythm'); api.setPhonemes(RHYTHM); await wait(60); });
    expect(served(log)).not.toEqual([]);
    expect(PLAYABLE).toContain(String(api.word).toLowerCase());
    expect(seen.review).toBe(false);
    expect(host.textContent).not.toContain(REVIEW);
  });

  it('continues to another playable word after one is answered', async () => {
    const { log, api, host } = await mountHost(student([RHYTHM, CRYPT, DOG, CAT, HAT]));
    const first = String(api.word).toLowerCase();
    await act(async () => buttonWith(host, EAR).click());
    const board = (first === 'cat' ? CAT : HAT).activityItems.word_families;
    for (const member of board.options) {
      const tile = host.querySelector(`button[aria-label="${member}"]`);
      expect(tile, member).toBeTruthy();
      await act(async () => { tile.click(); await wait(10); });
    }
    await settle(3800);
    expect(api.history.map((r) => [r.word, r.correct])).toEqual([[first, true]]);
    expect(served(log).length).toBeGreaterThan(1);
    expect(served(log).filter((w) => UNPLAYABLE.includes(w))).toEqual([]);
    expect(PLAYABLE).toContain(String(api.word).toLowerCase());
  }, 20000);
});

describe('Word Families: when every word is skipped the activity ends and the sequence moves on', () => {
  it('starts the next activity in the sequence', async () => {
    const { api, seen, host } = await mountHost(student([RHYTHM, CRYPT, DOG], { initialActivitySequence: ['word_families', 'counting'] }));
    await settle();
    expect(api.activity).toBe('counting');
    expect(host.querySelector('[role="button"][aria-label="Number 3"]')).toBeTruthy();
    expect(seen.review).toBe(false);
    expect(api.history).toEqual([]);
  });

  it('ends the session gracefully when Word Families is the last activity', async () => {
    const { host, seen, api } = await mountHost(student([RHYTHM, CRYPT, DOG], { initialActivitySequence: ['counting', 'word_families'] }));
    await settle();
    expect(host.querySelector('#word-sounds-session-complete-title')).toBeTruthy();
    expect(seen.review).toBe(false);
    expect(api.history).toEqual([]);
  });
});

describe('Word Families: teacher preview keeps the notice', () => {
  it('a teacher sees the notice on the word a student skips', async () => {
    const teacher = await mountHost({ ...student([RHYTHM, CAT]), isTeacherMode: true });
    await act(async () => { teacher.api.setWord('rhythm'); teacher.api.setPhonemes(RHYTHM); await wait(60); });
    expect(teacher.host.textContent).toContain(REVIEW);
    expect(teacher.api.word).toBe('rhythm');
    expect(teacher.api.activity).toBe('word_families');

    const learner = await mountHost(student([RHYTHM, CAT]));
    await act(async () => { learner.api.setWord('rhythm'); learner.api.setPhonemes(RHYTHM); await wait(60); });
    expect(learner.host.textContent).not.toContain(REVIEW);
    expect(learner.api.word).toBe('cat');
  });
});

describe('Word Families: a skip is not an answer', () => {
  it('records no history row, score, XP, progress or mastery for skipped words', async () => {
    const { log, api, seen } = await mountHost(student([RHYTHM, CRYPT, DOG, CAT]));
    await act(async () => { api.setWord('crypt'); api.setPhonemes(CRYPT); await wait(60); });
    await act(async () => { api.setWord('dog'); api.setPhonemes(DOG); await wait(60); });
    expect(api.word).toBe('cat');
    expect(seen.review).toBe(false);
    expect(api.history).toEqual([]);
    expect(api.score).toEqual({ correct: 0, total: 0, streak: 0 });
    expect(api.progress).toBe(0);
    expect(api.feedback).toBeNull();
    expect(log.xp).toBe(0);
    expect(log.mastery).toBe(0);
  });
});

describe('Word Families: the teacher sees which words students skip', () => {
  it('the player names the skipped pack words for the review screen', async () => {
    await mountHost({ ...student([RHYTHM, CAT, CRYPT, DOG, HAT]), isTeacherMode: true, initialShowReviewPanel: true });
    expect(panelProps).toBeTruthy();
    expect(panelProps.wordFamilySkips).toEqual(['rhythm', 'crypt', 'dog']);
  });

  it('lists nothing when Word Families is not in the lesson', async () => {
    await mountHost({ ...student([RHYTHM, CAT]), wordSoundsActivity: 'counting', isTeacherMode: true, initialShowReviewPanel: true, initialActivitySequence: ['counting'] });
    expect(panelProps).toBeTruthy();
    expect(panelProps.wordFamilySkips).toEqual([]);
  });

  it('the review screen shows the count and names the words', async () => {
    const t = (key, params = {}) => {
      const s = key.startsWith('word_sounds.') ? english[key.slice('word_sounds.'.length)] : '';
      return s ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), s) : '';
    };
    const noop = () => {};
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = client.createRoot(host);
    mounted.push({ host, root, observer: { disconnect: noop } });
    await act(async () => {
      root.render(React.createElement(RealPanel, {
        preloadedWords: [CAT], wordFamilySkips: ['rhythm', 'crypt'], t, activitySequence: ['word_families'], setActivitySequence: noop,
        onUpdateWord: noop, onReorderWords: noop, onStartActivity: noop, onClose: noop, onBackToSetup: noop, onPlayAudio: noop,
        isLoading: false, isStudentLocked: false, setIsStudentLocked: noop, imageVisibilityMode: 'always', setImageVisibilityMode: noop,
      }));
      await wait(30);
    });
    const note = host.querySelector('[data-ws-word-family-skips]');
    expect(note).toBeTruthy();
    expect(note.getAttribute('role')).toBe('note');
    expect(note.textContent).toBe('2 skipped for students in Word Families (needs a reviewed word family): rhythm, crypt');
  });
});
