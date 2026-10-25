// Lane B fixes (2026-10-25 review of the 24 core resources): Word Sounds.
//  WS4  Sound Swap has checked one-sound changes for 10 words only. It is hidden when
//       no word in the list qualifies (player picker/sequence and setup lesson plan),
//       learner play skips words without one, and the message no longer promises a
//       teacher verification step that does not exist. The curated table lives in
//       word_sounds_core.js and is embedded by dev-tools/sync_word_sounds_core.cjs;
//       every copy must match.
//  WS5  Sound Sort uses the Word Families rule: learner play skips a word whose board
//       cannot be built, passes the activity over when no word can be played, and the
//       teacher keeps the notice (now with a skip button) and gets the skipped words.
// Mutation hooks: WS_FIX1025_SOURCE (word_sounds_module.js), WS_FIX1025_SETUP (setup source).
import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem, makeThrowingAi } from './helpers/word_sounds_pack_fixture.js';
import { core } from './helpers/word_sounds_core.js';

const SOURCE_PATH = process.env.WS_FIX1025_SOURCE || 'word_sounds_module.js';
const SETUP_PATH = process.env.WS_FIX1025_SETUP || 'word_sounds_setup_source.jsx';
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const SORT_NOTICE = 'This sound needs a reviewed word set';
const SORT_TEACHER = 'Sound Sort has no word set for this sound. This item will not be scored.';
const SWAP_TEACHER = 'Sound Swap has no checked sound change for this word. This item will not be scored.';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const require = createRequire(import.meta.url), modules = resolve('desktop/web-app/node_modules');
let React, client, act, Modal, panelProps = null; const mounted = [];
beforeAll(() => {
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  window.React = React;
  Modal = setupWordSounds().WordSoundsModal;
  window.WordSoundsReviewPanel = (props) => { panelProps = props; return React.createElement('div', { 'data-testid': 'review-panel-stub' }); };
  if (process.env.WS_FIX1025_SOURCE) {
    delete window.AlloModules.WordSoundsModal;
    new Function(readFileSync(SOURCE_PATH, 'utf8'))(); Modal = window.AlloModules.WordSoundsModal;
    if (typeof Modal !== 'function') throw Error('override source did not register WordSoundsModal');
  }
});
afterEach(() => { panelProps = null; for (const { root, host, observer } of mounted.splice(0)) { observer.disconnect(); act(() => root.unmount()); host.remove(); } });

const base = makePackItem();
const packWord = (word, extra = {}) => {
  const items = { ...base.activityItems }; delete items.word_families; delete items.sound_sort; delete items.manipulation;
  return { ...base, id: word, term: word, word, targetWord: word, displayWord: word, familyEnding: '', familyMembers: [], phonemes: [],
    manipulationTask: { type: 'deletion', targetPhoneme: 'x', answer: '', distractors: [] },
    activityItems: items, _ttsAssets: { ...base._ttsAssets, [word]: { mime: 'audio/webm', base64: 'BBBB' } }, ...extra };
};
const curatedCat = core.resolveManipulationTask('cat', null, 'en');
const CAT = { ...base, manipulationTask: curatedCat, activityItems: { ...base.activityItems, manipulation: { task: curatedCat, options: ['at', 'it', 'on', 'up', 'an', 'in'] } } };
const HAT = packWord('hat');
const RHYTHM = packWord('rhythm');
const CRYPT = packWord('crypt');
const SHIP = packWord('ship', { phonemes: ['sh', 'i', 'p'], manipulationTask: { type: 'deletion', targetPhoneme: 'sh', answer: 'ip', distractors: ['it', 'in'] } });

async function mountHost(overrides) {
  const log = { words: [] };
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
    Object.assign(api, { activity, word, history, score, setWord, setPhonemes });
    return React.createElement(Modal, {
      ...baseProps(overrides.wordSoundsActivity),
      allowRuntimeAi: false,
      callGemini: makeThrowingAi(calls, 'callGemini'), callTTS: makeThrowingAi(calls, 'callTTS'), callImagen: makeThrowingAi(calls, 'callImagen'),
      glossaryTerms: [],
      getWordSoundsString: (_t, key) => english[key.replace('word_sounds.', '')] || key,
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
  const seen = { sortNotice: false };
  const observer = new MutationObserver(() => { if (host.textContent.includes(SORT_NOTICE)) seen.sortNotice = true; });
  observer.observe(host, { childList: true, subtree: true, characterData: true });
  const root = client.createRoot(host); mounted.push({ host, root, observer });
  await act(async () => { root.render(React.createElement(Host)); await wait(60); });
  return { host, log, api, seen, calls };
}
const served = (log) => log.words.filter(Boolean).map((w) => String(w).toLowerCase());
const student = (activity, pack, extra = {}) => ({ wordSoundsActivity: activity, wsPreloadedWords: pack, isTeacherMode: false, ...extra });
const hasButton = (host, text) => [...host.querySelectorAll('button')].some((b) => b.textContent.includes(text));

describe('WS5: Sound Sort learner play skips words it cannot build', () => {
  it('fixture sanity: rhythm and crypt have no Sound Sort board; cat and hat do', () => {
    const pool = [...core.knownWords];
    for (const w of ['rhythm', 'crypt']) expect(['first', 'last'].some((mode) => core.buildSoundSort({ word: w, pool, mode }))).toBe(false);
    expect(core.validSoundBoard(CAT.activityItems.sound_sort, 'cat', [CAT, ...pool])).toBe(true);
  });

  it('never serves an unbuildable word from the queue', async () => {
    const { log, api, seen } = await mountHost(student('sound_sort', [RHYTHM, CRYPT, CAT, HAT]));
    expect(served(log).length).toBeGreaterThan(0);
    expect(served(log).filter((w) => ['rhythm', 'crypt'].includes(w))).toEqual([]);
    expect(['cat', 'hat']).toContain(String(api.word).toLowerCase());
    expect(seen.sortNotice).toBe(false);
  });

  it('skips an unbuildable word that becomes current, without a notice or a score', async () => {
    const { api, seen, host } = await mountHost(student('sound_sort', [RHYTHM, CRYPT, CAT, HAT]));
    await act(async () => { api.setWord('rhythm'); api.setPhonemes(RHYTHM); await wait(60); });
    expect(['cat', 'hat']).toContain(String(api.word).toLowerCase());
    expect(seen.sortNotice).toBe(false);
    expect(host.textContent).not.toContain(SORT_TEACHER);
    expect(api.history).toEqual([]);
    expect(api.score).toEqual({ correct: 0, total: 0, streak: 0 });
  });

  it('passes Sound Sort over when no word can be played', async () => {
    const { api, seen } = await mountHost(student('sound_sort', [RHYTHM, CRYPT], { initialActivitySequence: ['sound_sort', 'counting'] }));
    await act(async () => { await wait(60); });
    expect(api.activity).toBe('counting');
    expect(seen.sortNotice).toBe(false);
  });

  it('a teacher keeps the notice, can skip the item, and the review screen names the words', async () => {
    const t = await mountHost({ ...student('sound_sort', [RHYTHM, CAT]), isTeacherMode: true });
    await act(async () => { t.api.setWord('rhythm'); t.api.setPhonemes(RHYTHM); await wait(60); });
    expect(t.api.word).toBe('rhythm');
    expect(t.host.textContent).toContain(SORT_TEACHER);
    expect(hasButton(t.host, 'Skip unscored item and continue')).toBe(true);

    await mountHost({ ...student('sound_sort', [RHYTHM, CAT, CRYPT, HAT]), isTeacherMode: true, initialShowReviewPanel: true });
    expect(panelProps).toBeTruthy();
    expect(panelProps.soundSortSkips).toEqual(['rhythm', 'crypt']);
  });
});

describe('WS4: Sound Swap only where a checked one-sound change exists', () => {
  it('learner play skips words without one', async () => {
    const { log, api, host } = await mountHost(student('manipulation', [SHIP, RHYTHM, CAT]));
    expect(served(log).filter((w) => ['ship', 'rhythm'].includes(w))).toEqual([]);
    expect(String(api.word).toLowerCase()).toBe('cat');
    await act(async () => { api.setWord('ship'); api.setPhonemes(SHIP); await wait(60); });
    expect(String(api.word).toLowerCase()).toBe('cat');
    expect(host.textContent).not.toContain(SWAP_TEACHER);
    expect(api.history).toEqual([]);
  });

  it('is hidden from the picker and the sequence when no word qualifies', async () => {
    const withCat = await mountHost(student('counting', [CAT, SHIP], { isTeacherMode: true }));
    expect(hasButton(withCat.host, english.activity_manipulation || 'Sound Swap')).toBe(true);
    const none = await mountHost(student('manipulation', [SHIP, RHYTHM], { initialActivitySequence: ['manipulation', 'counting'], isTeacherMode: true }));
    await act(async () => { await wait(60); });
    expect(none.api.activity).toBe('counting');
    expect(hasButton(none.host, english.activity_manipulation || 'Sound Swap')).toBe(false);
  });

  it('a teacher sees an honest notice on a word without a checked change', async () => {
    const t = await mountHost({ ...student('manipulation', [CAT, SHIP]), isTeacherMode: true });
    await act(async () => { t.api.setWord('ship'); t.api.setPhonemes(SHIP); await wait(80); });
    expect(t.api.word).toBe('ship');
    expect(t.host.textContent).toContain(SWAP_TEACHER);
    expect(t.host.textContent).not.toMatch(/until a teacher verifies|teacher to verify/);

    await mountHost({ ...student('manipulation', [CAT, SHIP, RHYTHM]), isTeacherMode: true, initialShowReviewPanel: true });
    expect(panelProps.soundSwapSkips).toEqual(['ship', 'rhythm']);
  });

  it('no Word Sounds copy promises a teacher verification step', () => {
    for (const file of [SOURCE_PATH, 'word_sounds_core.js', SETUP_PATH, 'word_sounds_setup_module.js', 'word_sounds_readiness_contract.js', 'word_sounds_di_loader.js']) {
      expect(readFileSync(file, 'utf8').includes('until a teacher verifies'), file).toBe(false);
    }
    expect(core.resolveManipulationTask('ship', null, 'en').instruction).toMatch(/^Sound Swap has a checked sound change for only a small set of words/);
  });
});

describe('WS4: one curated table', () => {
  // Built copies are reformatted by esbuild, so compare the evaluated object.
  const tableOf = (file) => {
    const s = readFileSync(file, 'utf8');
    const at = s.indexOf('CURATED_MANIPULATIONS = {');
    if (at < 0) throw Error('no CURATED_MANIPULATIONS in ' + file);
    const open = s.indexOf('{', at);
    let depth = 0, end = open;
    for (; end < s.length; end++) { if (s[end] === '{') depth++; else if (s[end] === '}' && --depth === 0) break; }
    return new Function('return ' + s.slice(open, end + 1))();
  };
  const copies = ['word_sounds_module.js', 'word_sounds_setup_source.jsx', 'word_sounds_setup_module.js', 'word_sounds_readiness_contract.js', 'word_sounds_di_loader.js',
    'desktop/web-app/public/word_sounds_module.js', 'desktop/web-app/public/word_sounds_setup_module.js',
    'desktop/web-app/public/word_sounds_readiness_contract.js', 'desktop/web-app/public/word_sounds_di_loader.js'];
  it.each(copies)('%s carries the same table as word_sounds_core.js', (file) => {
    const table = tableOf(file);
    expect(Object.keys(table).length).toBe(10);
    expect(table).toEqual(tableOf('word_sounds_core.js'));
  });
  it('the embedded cores are in sync (dev-tools/sync_word_sounds_core.cjs --check)', () => {
    expect(() => execFileSync(process.execPath, ['dev-tools/sync_word_sounds_core.cjs', '--check'], { stdio: 'pipe' })).not.toThrow();
  });
});

describe('WS4: setup hides Sound Swap when no selected word qualifies', () => {
  const src = readFileSync(SETUP_PATH, 'utf8');
  const start = src.indexOf('const soundSwapAvailable = previewList.some(');
  const end = src.indexOf('const lessonPlanActivityOn = ', start);
  const lineEnd = src.indexOf('\n', end);
  it('the availability rule follows the selected words', () => {
    expect(start > 0 && end > start, 'setup availability rule').toBe(true);
    const rule = new Function('previewList', 'selectedIndices', 'wordSoundsLanguage', 'WS_CORE', 'lessonPlan',
      src.slice(start, lineEnd) + '\nreturn { soundSwapAvailable, lessonPlanActivityOn };');
    const plan = { manipulation: { enabled: true }, counting: { enabled: true } };
    const none = rule(['ship', 'rhythm', 'cat'], new Set([0, 1]), 'en', core, plan);
    expect(none.soundSwapAvailable).toBe(false);
    expect(['counting', 'manipulation'].filter(none.lessonPlanActivityOn)).toEqual(['counting']);
    const some = rule(['ship', 'rhythm', 'cat'], new Set([0, 2]), 'en', core, plan);
    expect(some.soundSwapAvailable).toBe(true);
    expect(['counting', 'manipulation'].filter(some.lessonPlanActivityOn)).toEqual(['counting', 'manipulation']);
    expect(rule(['cat'], new Set([0]), 'es', core, plan).soundSwapAvailable).toBe(false);
  });
  it('the lesson plan list, preview, prepare and start all use the rule', () => {
    expect(src.split('lessonPlanOrder.filter(lessonPlanActivityOn)').length - 1).toBe(3);
    expect(src.includes('lessonPlanOrder.filter(id => lessonPlan[id]?.enabled)')).toBe(false);
    expect(src.includes("if (cfg && lessonPlanActivityOn(actId)) {")).toBe(true);
    expect(src.includes("if (actId === 'manipulation' && !soundSwapAvailable) return null;")).toBe(true);
  });
});
