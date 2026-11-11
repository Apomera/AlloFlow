// @vitest-environment jsdom
// Word Sounds, 2026-11-10: Syllable Blending and Syllable Claps never block "Prepare lesson".
// Each uses the teacher's words it can play. With too few, built-in words are added for that
// activity only (item._wsOnlyFor); no other activity, printout, take-home block, script line or
// word count sees them. "Use only my words" turns the adding off; a lesson in a language with
// no built-in words skips the activity with a note.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const LANE = vi.hoisted(() => {
  const dir = process.env.LANE_DIR || '.';
  const owned = !process.env.LANE_DIR;
  process.env.LANE_DIR = dir;
  return { dir, owned };
});
import { loadModal, mount as mountPlayer, unmountAll, click as clickPlayer, settle, act as playerAct } from './helpers/word_sounds_present_harness.js';
if (LANE.owned) delete process.env.LANE_DIR;

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const setupSource = readFileSync('word_sounds_setup_source.jsx', 'utf8').replace(/\r\n/g, '\n');
const moduleSource = readFileSync('word_sounds_module.js', 'utf8');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const pronunciations = require(resolve('word_sounds_pronunciations.js'));
const core = new Function('pronunciations', coreSource + ';return createWordSoundsCore({pronunciations});')(pronunciations);

const LESSON = ['cat', 'hat', 'sunset', 'rabbit', 'elephant'];
const ACTIVITY_IDS = core.activityIds();
const blendingPlan = (words = LESSON, extra = {}) => core.syllableActivityPlan({ activity: 'syllable_blending', words, language: 'English', ...extra });
const clapsPlan = (words = LESSON, extra = {}) => core.syllableActivityPlan({ activity: 'syllable_counting', words, language: 'English', ...extra });

// Prepared items as the setup writes them.
const ownItem = (word, extra = {}) => {
  const task = core.resolveSyllableTask(word, null, 'en');
  const count = core.resolveSyllableCount(word, { language: 'en' });
  return { id: 'w-' + word, term: word, word, targetWord: word, displayWord: word, phonemes: word.split(''), phonemeCount: word.length,
    rhymeWord: 'bat', rhymeDistractors: ['dog', 'sun', 'bed'],
    activityItems: {
      syllable_blending: { ...task, options: [...new Set([word, 'raincoat', 'cupcake', 'bedtime'])], answer: word },
      syllable_counting: { ...count, answer: count.supported ? count.count : null },
      rhyming: { options: ['bat', 'dog', 'sun', 'bed'], answer: 'bat' },
      blending: { options: [word, 'cot', 'cut', 'bat'], answer: word },
      counting: { options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '11+'], answer: word.length },
    }, ...extra };
};
const addedItem = (word, only) => {
  const item = ownItem(word);
  return { ...item, _wsOnlyFor: only, activityItems: Object.fromEntries(Object.entries(item.activityItems).filter(([id]) => only.includes(id))) };
};
const lessonPack = () => [...LESSON.map((word) => ownItem(word)),
  ...blendingPlan().topUp.map((word) => addedItem(word, ['syllable_blending']))];
const wordsOf = (items) => items.map((item) => item.targetWord || item.word);

describe('which lesson words a syllable activity can use', () => {
  it('Syllable Blending takes compounds from the built-in list; everything else waits for a recording', () => {
    const plan = blendingPlan();
    expect(plan.eligible).toEqual(['sunset']);
    expect(plan.unused).toEqual(['cat', 'hat', 'rabbit', 'elephant']);
    expect(plan.needed).toBe(5);
    expect(plan.shortfall).toBe(4);
    expect(plan.skipped).toBe(false);
  });

  it('a word with a reviewed recording counts as usable when the caller says so', () => {
    const plan = blendingPlan(LESSON, { isEligible: (word) => word === 'rabbit' || core.resolveSyllableTask(word, null, 'en').supported });
    expect(plan.eligible).toEqual(['sunset', 'rabbit']);
    expect(plan.topUp).toHaveLength(3);
  });

  it('Syllable Claps takes every word whose count is agreed, one-syllable words included', () => {
    const plan = clapsPlan();
    expect(plan.eligible).toEqual(LESSON);
    expect(plan.unused).toEqual([]);
    expect(plan.topUp).toEqual([]);
    expect(LESSON.map((word) => core.resolveSyllableCount(word, { language: 'en' }).count)).toEqual([1, 1, 2, 2, 3]);
  });

  it('a word with two pronunciations of different length, or an unknown word, is left out of Syllable Claps', () => {
    const plan = clapsPlan(['cat', 'every', 'zzyxq', 'sunset', 'hat', 'rabbit', 'elephant']);
    expect(plan.unused).toEqual(['every', 'zzyxq']);
    expect(plan.eligible).toEqual(['cat', 'sunset', 'hat', 'rabbit', 'elephant']);
    expect(plan.topUp).toEqual([]);
  });

  it('the item count is the activity\'s own; five when none is given', () => {
    expect(blendingPlan(LESSON, { count: 3 }).topUp).toHaveLength(2);
    expect(blendingPlan(LESSON, { count: 8 }).topUp).toHaveLength(7);
    expect(blendingPlan(['sunset', 'raincoat', 'cupcake'], { count: 3 }).topUp).toEqual([]);
    expect(blendingPlan(LESSON, { count: undefined }).needed).toBe(5);
  });

  it('enough usable words: no word is added, and the rest are simply not used there', () => {
    const words = ['sunset', 'raincoat', 'cupcake', 'backpack', 'football', 'cat', 'hat'];
    const plan = blendingPlan(words);
    expect(plan.eligible).toEqual(words.slice(0, 5));
    expect(plan.unused).toEqual(['cat', 'hat']);
    expect(plan.topUp).toEqual([]);
    expect(plan.shortfall).toBe(0);
  });
});

describe('the words that are added', () => {
  it('are built-in compounds that are not in the lesson, and enough to reach the count', () => {
    const plan = blendingPlan();
    expect(plan.topUp).toHaveLength(4);
    plan.topUp.forEach((word) => {
      expect(core.compoundWords()).toContain(word);
      expect(LESSON).not.toContain(word);
      expect(core.resolveSyllableTask(word, null, 'en').supported).toBe(true);
    });
    expect(new Set(plan.topUp).size).toBe(4);
  });

  it('are the same every time for the same lesson words, in any order or letter case', () => {
    const first = blendingPlan().topUp;
    expect(blendingPlan().topUp).toEqual(first);
    expect(blendingPlan([...LESSON].reverse()).topUp).toEqual(first);
    expect(blendingPlan(LESSON.map((word) => word.toUpperCase())).topUp).toEqual(first);
    expect(blendingPlan([...LESSON, 'cat', ' hat ']).topUp).toEqual(first);
  });

  it('change with the lesson, and a compound built on a lesson word comes first', () => {
    expect(blendingPlan().topUp[0]).toBe('catfish');
    expect(blendingPlan(['dog', 'pig', 'bed']).topUp).not.toEqual(blendingPlan(['map', 'pen', 'log']).topUp);
  });

  it('for Syllable Claps mix one, two and three or more claps, around what the lesson already has', () => {
    const plan = clapsPlan(['cat', 'hat']);
    expect(plan.eligible).toEqual(['cat', 'hat']);
    expect(plan.topUp).toHaveLength(3);
    const counts = plan.topUp.map((word) => core.resolveSyllableCount(word, { language: 'en' }).count);
    expect(counts.every((count) => count >= 2), 'the lesson already has two one-clap words').toBe(true);
    expect(counts.some((count) => count === 2) && counts.some((count) => count >= 3)).toBe(true);
    expect(clapsPlan(['cat', 'hat']).topUp).toEqual(plan.topUp);
    // With no lesson word usable, all three sizes appear.
    const empty = clapsPlan(['zzyxq'], { count: 6 });
    const sizes = empty.topUp.map((word) => Math.min(3, core.resolveSyllableCount(word, { language: 'en' }).count));
    expect([...new Set(sizes)].sort()).toEqual([1, 2, 3]);
    empty.topUp.forEach((word) => expect(core.resolveSyllableCount(word, { language: 'en' }).supported, word).toBe(true));
  });

  it('for Syllable Claps never include a word whose count is not settled', () => {
    // As when the pronunciation dictionary has not loaded: only the compounds have a settled count.
    const settled = (word) => core.compoundWords().includes(word);
    const plan = core.syllableActivityPlan({ activity: 'syllable_counting', words: ['zzyxq'], language: 'en', isEligible: () => false, canTopUp: settled });
    expect(plan.topUp).toHaveLength(5);
    plan.topUp.forEach((word) => expect(core.compoundWords()).toContain(word));
    expect(core.syllableActivityPlan({ activity: 'syllable_counting', words: ['zzyxq'], language: 'en', isEligible: () => false, canTopUp: () => false }).skipped).toBe(true);
  });

  it('"Use only my words" adds nothing; with no usable word the activity is skipped', () => {
    const plan = blendingPlan(LESSON, { topUp: false });
    expect(plan.topUp).toEqual([]);
    expect(plan.eligible).toEqual(['sunset']);
    expect(plan.skipped).toBe(false);
    expect(plan.topUpOff).toBe(true);
    expect(blendingPlan(['cat', 'hat'], { topUp: false }).skipped).toBe(true);
  });

  it('a lesson in another language has no built-in words: usable words only, or skipped', () => {
    const none = core.syllableActivityPlan({ activity: 'syllable_blending', words: ['gato', 'mesa'], language: 'es' });
    expect(none.builtIn).toBe(false);
    expect(none.topUp).toEqual([]);
    expect(none.skipped).toBe(true);
    const recorded = core.syllableActivityPlan({ activity: 'syllable_blending', words: ['gato', 'mesa'], language: 'es', isEligible: (word) => word === 'mesa' });
    expect(recorded.eligible).toEqual(['mesa']);
    expect(recorded.topUp).toEqual([]);
    expect(recorded.skipped).toBe(false);
    expect(core.syllableActivityPlan({ activity: 'syllable_counting', words: ['gato'], language: 'es' }).skipped).toBe(true);
  });
});

describe('an added word belongs to its activity only', () => {
  const pack = lessonPack();
  const added = blendingPlan().topUp;

  it('every other activity gets the lesson\'s own words, and Syllable Blending gets what it can play', () => {
    ACTIVITY_IDS.filter((id) => !core.SYLLABLE_ACTIVITY_IDS.includes(id)).forEach((id) => {
      expect(wordsOf(core.wordsForActivity(pack, id, 'en')), id).toEqual(LESSON);
    });
    expect(wordsOf(core.wordsForActivity(pack, 'syllable_blending', 'en'))).toEqual(['sunset', ...added]);
    expect(wordsOf(core.wordsForActivity(pack, 'syllable_counting', 'en'))).toEqual(LESSON);
  });

  it('the word count and the own-word list leave them out', () => {
    expect(wordsOf(core.lessonOwnItems(pack))).toEqual(LESSON);
    expect(wordsOf(core.topUpItems(pack))).toEqual(added);
    expect(wordsOf(core.topUpItems(pack, 'syllable_blending'))).toEqual(added);
    expect(core.topUpItems(pack, 'syllable_counting')).toEqual([]);
    expect(core.isTopUpItem(pack[0])).toBe(false);
    expect(core.isTopUpItem({ word: 'x', _wsOnlyFor: [] })).toBe(false);
  });

  it('the tag survives a save and a reload', () => {
    const restored = JSON.parse(JSON.stringify(pack));
    expect(wordsOf(core.topUpItems(restored, 'syllable_blending'))).toEqual(added);
    expect(wordsOf(core.wordsForActivity(restored, 'rhyming', 'en'))).toEqual(LESSON);
    expect(wordsOf(core.wordsForActivity(restored, 'syllable_blending', 'en'))).toEqual(['sunset', ...added]);
  });

  it('a lesson saved before this rule keeps its own words in a syllable activity that has nothing playable', () => {
    const old = [ownItem('cat'), ownItem('hat')];
    expect(wordsOf(core.wordsForActivity(old, 'syllable_blending', 'en'))).toEqual(['cat', 'hat']);
    expect(core.syllableActivityHasWords(old, 'syllable_blending', 'en')).toBe(false);
    expect(core.syllableActivityHasWords(pack, 'syllable_blending', 'en')).toBe(true);
  });
});

// ── The setup screen ──────────────────────────────────────────────────────────
const icons = [...new Set([...setupSource.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map((m) => m[1] || m[2]))]
  .filter((name) => !new RegExp('(?:function|const) ' + name + '\\b').test(setupSource));
const compiled = transformSync(setupSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const Generator = new Function('React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...icons,
  compiled + '\nreturn WordSoundsGenerator;')(React, () => {}, () => {}, (_t, key) => key, () => {}, ...icons.map(() => () => null));
const planOf = (on = [], count = 5) => Object.fromEntries(ACTIVITY_IDS.map((id) => [id, { enabled: on.includes(id), count }]));
// The word analysis the AI would return: enough for every board to be built.
const analysis = vi.fn(async (prompt) => {
  const word = (String(prompt).match(/Analyze the word "([^"]+)"/) || [])[1];
  if (!word) return '{}';
  return JSON.stringify({ word, phonemes: word.split(''), graphemes: word.split(''), phonemeCount: word.length, syllables: [word],
    syllableBlendingOptions: ['window', 'pencil', 'basket'], rhymeWord: 'bat', rhymeDistractors: ['dog', 'sun', 'bed', 'pig', 'cup'],
    blendingDistractors: ['cot', 'cut', 'bit', 'map', 'pen'], orthographyDistractors: ['kat', 'catt', 'cta'], wordFamily: '-at', familyEnding: '-at',
    familyMembers: ['bat', 'mat', 'sat'], firstSound: word[0], lastSound: word[word.length - 1], definition: 'a word', imagePrompt: 'icon' });
});

describe('setup', () => {
  let root, container;
  const mount = async (extra = {}) => {
    const props = { glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false, wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => key,
      selectedVoice: 'Kore', ttsSpeed: 1, onStartGame: vi.fn(), callGemini: analysis,
      syllableReviewSession: { key: 1, setupDraft: { sessionType: 'practice' } }, ...extra };
    await act(async () => root.render(React.createElement(Generator, props)));
    return props;
  };
  const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  const until = async (check, label) => { for (let i = 0; i < 400; i++) { if (check()) return; await tick(); } throw Error('Timed out: ' + label); };
  const all = (selector) => [...container.querySelectorAll(selector)];
  const one = (selector) => container.querySelector(selector);
  const click = (el) => { expect(el).toBeTruthy(); return act(async () => { el.click(); }); };
  const startButtons = () => all('button').filter((b) => /^(Prepare lesson|Start Activity|Start teacher-led activity|Start Assessment|Prepare assessment)$/.test(b.textContent.trim()));
  const gridWords = () => all('button[aria-pressed][aria-label*=": "]').filter((b) => /: (not )?selected$/.test(b.getAttribute('aria-label'))).map((b) => b.getAttribute('aria-label').split(':')[0]);
  const line = (id) => one('[data-ws-syllable-plan="' + id + '"] [data-ws-syllable-plan-text]')?.textContent.trim();
  const session = (on, extra = {}) => ({ key: 1, setupDraft: { sessionType: 'practice', includeCustom: true, customText: LESSON.join(' '), includeLessonPlan: true, lessonPlan: planOf(on), ...extra } });
  const mountLesson = async (on = ['syllable_blending', 'syllable_counting', 'rhyming'], extra = {}, props = {}) => {
    const mounted = await mount({ syllableReviewSession: session(on, extra), ...props });
    await until(() => !/Loading pronunciation dictionary/.test(container.textContent) && !!one('[data-ws-chip-syllables="1"]'), 'the dictionary loads');
    return mounted;
  };

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
// The sound dictionary is loaded but holds none of these words, so each word takes the AI analysis this file
    // tests. The dictionary route (no AI call) is tested in word_sounds_ai_free_prepare.test.js.
    window.AlloModules = { WordSoundsPronunciations: pronunciations, WordSoundsPhonemes: { lookup: () => [] } };
    window.WORD_FAMILY_PRESETS = {}; window.SIGHT_WORD_PRESETS = {};
    delete window.__alloAiUsable;
    analysis.mockClear();
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

  it('typed words with both syllable activities ticked: Prepare is enabled and one line each says what will happen', async () => {
    await mountLesson();
    expect(gridWords()).toEqual(LESSON);
    const added = blendingPlan().topUp;
    expect(line('syllable_blending')).toBe('Syllable Blending will use 1 of your words and 4 compound words from our list (' + added.join(', ') + ').');
    expect(line('syllable_counting')).toBe('Syllable Claps will use all of your words.');
    expect(all('[data-ws-syllable-plan]')).toHaveLength(2);
    expect(startButtons().length).toBeGreaterThan(0);
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
    expect(one('[data-ws-start-blocked]')).toBeNull();
    expect(one('#ws-start-blocked-bar').textContent).toBe('5 words selected');
    expect(container.textContent).not.toMatch(/Add syllable recordings for|Confirm \d+ syllable count|Add and review syllable recordings below|Review the syllable count below or deselect/);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    // The editors are one click away, not on the screen.
    expect(container.textContent).not.toContain('Word-specific syllable recordings');
    expect(container.textContent).not.toContain('Review syllable counts');
  });

  it('the line is there only while that activity is in the lesson', async () => {
    await mount({ syllableReviewSession: session(['rhyming']) });
    await tick();
    expect(gridWords()).toEqual(LESSON);
    expect(all('[data-ws-syllable-plan]')).toHaveLength(0);
    act(() => root.unmount()); root = createRoot(container);
    await mountLesson(['syllable_counting']);
    expect(all('[data-ws-syllable-plan]').map((node) => node.getAttribute('data-ws-syllable-plan'))).toEqual(['syllable_counting']);
  });

  it('unsettled counts are named in the Syllable Claps line and do not block', async () => {
    await mountLesson(['syllable_counting'], { customText: 'cat hat every zzyxq sunset rabbit elephant' });
    expect(line('syllable_counting')).toBe('Syllable Claps will use 5 of your words. 2 of your words need a syllable check before they can be used here.');
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
    expect(one('[data-ws-start-blocked]')).toBeNull();
    expect(one('[data-ws-chip-syllables="review"]').textContent).toBe('Syllable count needs review');
  });

  it('[Change] opens the existing editors and offers "Use only my words", which removes the added words', async () => {
    await mountLesson();
    const change = one('[data-ws-syllable-plan-change="syllable_blending"]');
    expect(change.textContent).toBe('Change');
    expect(change.getAttribute('aria-label')).toBe('Change the words for Syllable Blending');
    expect(change.getAttribute('aria-expanded')).toBe('false');
    await click(change);
    expect(change.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Word-specific syllable recordings');
    expect(all('[data-syllable-recording-word]').length).toBeGreaterThan(0);
    const only = one('[data-ws-syllable-only-mine="syllable_blending"]');
    expect(only.closest('label').textContent.trim()).toBe('Use only my words');
    expect(only.checked).toBe(false);
    await act(async () => Simulate.change(only, { target: { checked: true } }));
    expect(line('syllable_blending')).toBe('Syllable Blending will use 1 of your words.');
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
    await act(async () => Simulate.change(one('[data-ws-syllable-only-mine="syllable_blending"]'), { target: { checked: false } }));
    expect(line('syllable_blending')).toContain('4 compound words from our list');
    // Syllable Claps has its own switch and its count review.
    await click(one('[data-ws-syllable-plan-change="syllable_counting"]'));
    expect(container.textContent).toContain('Review syllable counts');
    expect(one('[data-ws-syllable-only-mine="syllable_counting"]').checked).toBe(false);
  });

  it('"Use only my words" with no usable word: the activity is skipped with a note, and the lesson still prepares', async () => {
    const props = await mountLesson(['syllable_blending', 'rhyming'], { customText: 'cat hat', syllableTopUpOff: { syllable_blending: true } });
    expect(line('syllable_blending')).toBe('Syllable Blending cannot use any of your words. It will be skipped.');
    expect(one('[data-ws-syllable-plan="syllable_blending"]').getAttribute('data-ws-syllable-plan-skipped')).toBe('true');
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
    await click(startButtons()[0]);
    await until(() => props.onStartGame.mock.calls.length > 0, 'the run finishes');
    const [words, sequence, lessonPlanConfig, , , sessionConfig] = props.onStartGame.mock.calls[0];
    expect(wordsOf(words)).toEqual(['cat', 'hat']);
    expect([...new Set(sequence)]).toEqual(['rhyming']);
    expect(lessonPlanConfig.order).toEqual(['rhyming']);
    expect(lessonPlanConfig.activities.map((row) => row.id)).toEqual(['rhyming']);
    expect(sessionConfig.preparedActivities === undefined || !sessionConfig.preparedActivities.includes('syllable_blending')).toBe(true);
    expect(words[0]._wsTopUpOff).toEqual(['syllable_blending']);
  });

  it('a lesson in another language shows the skip note instead of blocking', async () => {
    await mount({ wordSoundsLanguage: 'es', syllableReviewSession: session(['syllable_blending', 'syllable_counting', 'rhyming'], { customText: 'gato mesa' }) });
    await tick();
    expect(line('syllable_blending')).toBe('Syllable Blending needs recorded syllables in this language. It will be skipped.');
    expect(line('syllable_counting')).toBe('Syllable Claps needs a checked syllable count for each word in this language. It will be skipped.');
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
    expect(one('[data-ws-start-blocked]')).toBeNull();
    // The editors stay reachable; there are no built-in words to switch off.
    await click(one('[data-ws-syllable-plan-change="syllable_blending"]'));
    expect(container.textContent).toContain('Word-specific syllable recordings');
    expect(one('[data-ws-syllable-only-mine="syllable_blending"]')).toBeNull();
  });

  it('what still blocks: a lesson whose only activity is skipped has nothing to run', async () => {
    await mount({ wordSoundsLanguage: 'es', syllableReviewSession: session(['syllable_blending'], { customText: 'gato mesa' }) });
    await tick();
    startButtons().forEach((button) => expect(button.disabled).toBe(true));
    expect(one('[data-ws-start-blocked]').textContent).toContain('Choose at least one lesson activity before preparing.');
  });

  it('word chips show the syllable count; the source is the chip\'s description, and "needs review" stays visible', async () => {
    await mountLesson();
    const chip = one('[data-ws-word-chip="cat"]');
    expect(chip.querySelector('[data-ws-chip-syllables]').textContent).toBe('1 syllable');
    expect(chip.getAttribute('title')).toBe('Pronunciation dictionary (US English)');
    expect(one('[data-ws-word-chip="elephant"] [data-ws-chip-syllables]').textContent).toBe('3 syllables');
    expect(one('[data-ws-word-chip="sunset"]').getAttribute('title')).toBe('Reviewed word bank');
    all('[data-ws-word-chip]').forEach((node) => expect(node.textContent).not.toMatch(/·|Pronunciation dictionary|Reviewed word bank/));
  });

  it('the prepared lesson carries the added words after the teacher\'s own, tagged for their activity, and no board elsewhere uses them', async () => {
    const props = await mountLesson();
    await click(startButtons()[0]);
    await until(() => props.onStartGame.mock.calls.length > 0, 'the run finishes');
    const [words, sequence, lessonPlanConfig, summary] = props.onStartGame.mock.calls[0];
    const added = blendingPlan().topUp;
    expect(wordsOf(words)).toEqual([...LESSON, ...added]);
    expect(words.slice(0, 5).every((item) => item._wsOnlyFor === undefined)).toBe(true);
    words.slice(5).forEach((item) => {
      expect(item._wsOnlyFor).toEqual(['syllable_blending']);
      expect(Object.keys(item.activityItems)).toEqual(['syllable_blending']);
      expect(core.validSyllableBoard(item.activityItems.syllable_blending)).toBe(true);
    });
    expect(words[0]._ttsRequiredKeys, 'the shared audio list sits on a lesson word').toBeTruthy();
    // The queues the player builds.
    expect(wordsOf(core.wordsForActivity(words, 'syllable_blending', 'English'))).toEqual(['sunset', ...added]);
    expect(wordsOf(core.wordsForActivity(words, 'syllable_counting', 'English'))).toEqual(LESSON);
    expect(wordsOf(core.wordsForActivity(words, 'rhyming', 'English'))).toEqual(LESSON);
    // No lesson word's board offers an added word as a choice.
    const ownBoards = JSON.stringify(words.slice(0, 5).map((item) => ({ ...item.activityItems, syllable_blending: null })));
    added.forEach((word) => expect(ownBoards, word).not.toContain('"' + word + '"'));
    // The lesson itself is unchanged: both syllable activities run, five items each.
    expect(lessonPlanConfig.order).toEqual(expect.arrayContaining(['syllable_blending', 'syllable_counting', 'rhyming']));
    expect(sequence.filter((id) => id === 'syllable_blending')).toHaveLength(5);
    expect(summary).toContain('Syllable Blending');
    expect(words[0]._wsTopUpOff).toBeUndefined();

    // Reopened in setup: the added words are not the teacher's words, and the same ones are chosen again.
    act(() => root.unmount()); root = createRoot(container);
    const saved = JSON.parse(JSON.stringify(words));
    const again = await mount({ preloadedWords: saved, syllableReviewSession: { key: 2, setupDraft: { sessionType: 'practice', includeLessonPlan: true, lessonPlan: planOf(['syllable_blending', 'syllable_counting', 'rhyming']) } } });
    await until(() => !!one('[data-ws-chip-syllables="1"]'), 'the dictionary loads');
    expect(gridWords()).toEqual(LESSON);
    expect(line('syllable_blending')).toContain('(' + added.join(', ') + ')');
    analysis.mockClear();
    await click(startButtons()[0]);
    await until(() => again.onStartGame.mock.calls.length > 0, 'the second run finishes');
    expect(wordsOf(again.onStartGame.mock.calls[0][0])).toEqual([...LESSON, ...added]);
    expect(analysis, 'saved words are not analysed again').not.toHaveBeenCalled();
  });

  it('"Use only my words" is saved with the lesson and restored', async () => {
    const pack = [ownItem('cat'), { ...ownItem('sunset'), _wsTopUpOff: undefined }];
    pack[0]._wsTopUpOff = ['syllable_blending'];
    await mount({ preloadedWords: pack, syllableReviewSession: { key: 3, setupDraft: { sessionType: 'practice', includeLessonPlan: true, lessonPlan: planOf(['syllable_blending', 'rhyming']) } } });
    await tick();
    expect(line('syllable_blending')).toBe('Syllable Blending will use 1 of your words.');
    await click(one('[data-ws-syllable-plan-change="syllable_blending"]'));
    expect(one('[data-ws-syllable-only-mine="syllable_blending"]').checked).toBe(true);
  });

  it('an assessment of Syllable Blending asks the usable words and the added ones, and is not blocked', async () => {
    const props = await mount({ syllableReviewSession: { key: 4, setupDraft: { sessionType: 'assessment', probeActivitySel: 'syllable_blending', includeCustom: true, customText: LESSON.join(' ') } } });
    await tick();
    expect(line('syllable_blending')).toContain('1 of your words and 4 compound words');
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
    await click(startButtons()[0]);
    await until(() => props.onStartGame.mock.calls.length > 0, 'the run finishes');
    expect(wordsOf(props.onStartGame.mock.calls[0][0])).toEqual(['sunset', ...blendingPlan().topUp]);
  });

  it('the old blockers are gone from the source', () => {
    expect(setupSource).not.toMatch(/start_blocked_recordings|start_blocked_counts|recordings_blocked|count_review_blocked/);
    expect(setupSource).not.toMatch(/startBlocked = [^;]*(unsupportedSyllableWords|unreviewedSyllableCountWords)/);
    expect(setupSource).not.toMatch(/wordsToProcess\.length === 0 \|\| un(supported|reviewed)Syllable/);
  });
});

// ── The player ────────────────────────────────────────────────────────────────
describe('the player', () => {
  beforeAll(() => { loadModal(); });
  afterEach(() => { unmountAll(); vi.restoreAllMocks(); });
  const firstWord = (spies) => (spies.setCurrentWordSoundsWord.mock.calls.find((call) => typeof call[0] === 'string') || [])[0];
  const added = ['raincoat', 'cupcake', 'backpack', 'football', 'doorbell', 'starfish'];

  it('Rhyme Time never starts on a word added for Syllable Blending', async () => {
    const pack = [ownItem('cat'), ...added.map((word) => addedItem(word, ['syllable_blending']))];
    for (let run = 0; run < 4; run++) {
      const { spies } = await mountPlayer({ activity: 'rhyming', words: pack, currentWordSoundsWord: null, wordSoundsPhonemes: null });
      await settle(120);
      expect(firstWord(spies), 'run ' + run).toBe('cat');
      unmountAll();
    }
  });

  it('Syllable Blending starts on a word it can play: the lesson word without a recording is left out', async () => {
    const pack = [ownItem('cat'), ownItem('hat'), ownItem('rabbit'), ownItem('elephant'), addedItem('raincoat', ['syllable_blending'])];
    for (let run = 0; run < 4; run++) {
      const { spies } = await mountPlayer({ activity: 'syllable_blending', words: pack, currentWordSoundsWord: null, wordSoundsPhonemes: null });
      await settle(120);
      expect(firstWord(spies), 'run ' + run).toBe('raincoat');
      unmountAll();
    }
  });

  it('Syllable Claps leaves out a word whose count is not settled', async () => {
    const unsettled = (word) => { const item = ownItem(word); item.activityItems.syllable_counting = { supported: false, status: 'needs_review', counts: [], count: null, targetWord: word, language: 'en' }; return item; };
    const pack = [unsettled('zzyxq'), unsettled('qqzzy'), unsettled('zzqqa'), unsettled('yyzzq'), ownItem('sunset')];
    for (let run = 0; run < 4; run++) {
      const { spies } = await mountPlayer({ activity: 'syllable_counting', words: pack, currentWordSoundsWord: null, wordSoundsPhonemes: null });
      await settle(120);
      expect(firstWord(spies), 'run ' + run).toBe('sunset');
      unmountAll();
    }
  });

  it('printed word cards list the lesson\'s own words only', async () => {
    const written = [];
    vi.spyOn(window, 'open').mockImplementation(() => ({ document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn(), images: [] }, focus: vi.fn(), print: vi.fn() }));
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const pack = [ownItem('cat'), ownItem('hat'), ownItem('sunset'), ...added.slice(0, 3).map((word) => addedItem(word, ['syllable_blending']))];
    const { host } = await mountPlayer({ isTeacherMode: true, allowRuntimeAi: true, callGemini: async () => '', callTTS: async () => null, callImagen: async () => null, words: pack });
    await clickPlayer(host.querySelector('[data-ws-share-open]'));
    await clickPlayer(host.querySelector('[data-ws-print-open]'));
    await settle(10);
    await clickPlayer(host.querySelector('[data-ws-print-dialog] [data-ws-print="cards"]'));
    await settle(10);
    expect(written.length).toBeGreaterThan(0);
    const text = new DOMParser().parseFromString(written[written.length - 1], 'text/html').body.textContent;
    ['cat', 'hat', 'sunset'].forEach((word) => expect(text).toContain(word));
    added.slice(0, 3).forEach((word) => expect(text, word).not.toContain(word));
  });

  it('every per-activity reader in the player goes through the same rule', () => {
    // The queue, Present and worksheets, the review rows, word cards, Word Practice and the take-home file.
    expect(moduleSource).toContain('WS_CORE.wordsForActivity(preloadedWords, activityId, wordSoundsLanguage)');
    expect(moduleSource).toContain('const pool = WS_CORE.wordsForActivity(words, activity, language);');
    expect(moduleSource).toContain('wsPrintEntries(WS_CORE.lessonOwnItems(preloadedWords), preparedImageLibrary)');
    expect(moduleSource).toContain('preloadedWords: reviewRows,');
    expect(moduleSource).toContain('adapters: takeHomeAdapters(lib),');
    expect(moduleSource).not.toMatch(/pool: \[\.\.\.\(preloadedWords \|\| \[\]\)/);
  });
});

describe('the take-home file', () => {
  const loadLoader = () => { delete window.AlloWordSoundsTakeHome; new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))(); return window.AlloWordSoundsTakeHome; };
  // The two helpers the player wraps the builder with, as written in the module.
  const start = moduleSource.indexOf('      const takeHomeAdapters = (lib) =>');
  const end = moduleSource.indexOf('      const takeHomeLesson = async', start);
  const helpers = new Function('WS_CORE', moduleSource.slice(start, end) + '\nreturn { takeHomeAdapters, takeHomeOwn };');

  it('builds each activity from the words that activity uses and does not report the others as problems', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const lib = loadLoader();
    const { takeHomeAdapters, takeHomeOwn } = helpers(core);
    const pack = lessonPack();
    const ids = lib.activities().map((entry) => entry.id);
    expect(ids).toContain('syllable_blending');
    const built = takeHomeOwn(lib.lessonFromPack(pack, { core, adapters: takeHomeAdapters(lib), banks: {}, isEnglish: true, activities: ids, title: 'Lesson' }));
    const added = blendingPlan().topUp;
    built.lesson.blocks.forEach((block) => {
      const words = block.items.map((item) => item.word);
      if (block.activity !== 'syllable_blending') added.forEach((word) => expect(words, block.activity).not.toContain(word));
    });
    built.exceptions.forEach((entry) => expect(added, entry.activity + ':' + entry.word).not.toContain(entry.activity === 'syllable_blending' ? '' : entry.word));
    expect(built.total).toBe(built.ready + built.exceptions.length);
    // Without the wrapper the same pack reports the added words under every other activity.
    const raw = lib.lessonFromPack(pack, { core, banks: {}, isEnglish: true, activities: ids, title: 'Lesson' });
    expect(raw.exceptions.some((entry) => entry.activity !== 'syllable_blending' && added.includes(entry.word))).toBe(true);
  });
});

describe('the lesson script', () => {
  const DI = require(resolve('word_sounds_di_loader.js'));
  const pack = lessonPack();
  const added = blendingPlan().topUp;
  const activities = [{ id: 'rhyming', count: 5 }, { id: 'syllable_blending', count: 5 }, { id: 'counting', count: 5 }];
  const analysisOf = (words) => DI.analyzeWordSet(words, { language: 'en' });
  const script = (words) => DI.buildLessonScript(analysisOf(words), { activities, order: activities.map((a) => a.id), masteryThreshold: 3 }, {});
  // The words each "Your turn" block of the script lists.
  const turns = (built) => Object.fromEntries(built.sections.filter((section) => /^test_/.test(section.id)).map((section) => [section.id.slice(5), section.items.map((item) => item.primary)]));

  it('analyses the lesson\'s own words and keeps the added ones apart', () => {
    const result = analysisOf(pack);
    expect(result.words.map((w) => w.word)).toEqual(LESSON);
    expect(result.extraWords.map((w) => w.word)).toEqual(added);
    expect(result.wordCount).toBe(analysisOf(pack.slice(0, 5)).wordCount);
    expect(JSON.stringify(result.gpcs)).toBe(JSON.stringify(analysisOf(pack.slice(0, 5)).gpcs));
  });

  it('lists an added word under its own activity only, and never in the word list', () => {
    const built = script(pack);
    const text = JSON.stringify(built);
    expect(built.wordList.map((row) => row.word)).toEqual(LESSON);
    const byActivity = turns(built);
    expect(Object.keys(byActivity)).toEqual(expect.arrayContaining(['rhyming', 'syllable_blending', 'counting']));
    added.forEach((word) => {
      expect(byActivity.rhyming, word).not.toContain(word);
      expect(byActivity.counting, word).not.toContain(word);
    });
    expect(byActivity.syllable_blending.every((word) => word === 'sunset' || added.includes(word))).toBe(true);
    expect(byActivity.syllable_blending.some((word) => added.includes(word))).toBe(true);
    expect(text).toContain(added[0]);
  });

  it('a lesson with no added words is scripted exactly as before', () => {
    const own = pack.slice(0, 5).map((item) => ({ ...item, activityItems: { ...item.activityItems } }));
    const built = script(own);
    const byActivity = turns(built);
    expect(byActivity.rhyming).toEqual(LESSON);
    expect(byActivity.syllable_blending, 'only the word it can play').toEqual(Array(5).fill('sunset'));
  });

  it('the presenter line for another activity is not written from an added word', () => {
    const extra = pack[5];
    expect(DI.presenterLines('rhyming', extra, { language: 'en', words: pack })).toBeNull();
    expect(DI.presenterLines('syllable_blending', extra, { language: 'en', words: pack })).toBeTruthy();
  });
});

describe('the readiness contract', () => {
  // The contract's own part needs a small guard for this rule. It is written as
  // dev-tools/apply_word_sounds_contract_topup_guard.cjs and is applied here in memory, so these
  // tests hold before and after the file itself is patched (patch() leaves a patched text alone).
  const guard = require(resolve('dev-tools/apply_word_sounds_contract_topup_guard.cjs'));
  const fileText = readFileSync('word_sounds_readiness_contract.js', 'utf8');
  const contractSource = guard.patch(fileText);
  const load = (text) => { const module = { exports: {} }; new Function('globalThis', 'module', text)({ window: {} }, module); return module.exports; };
  const resource = (words, extra = {}) => ({ type: 'word-sounds', wsPreloadedWords: words, lessonPlanSequence: ['rhyming', 'syllable_blending', 'syllable_counting'], sessionConfig: { wordSoundsLanguage: 'en' }, ...extra });
  const issues = (words, extra) => load(contractSource).requirements(resource(words, extra)).contentIssues;
  const syllableIssues = (list) => list.filter((issue) => /Syllable (blending|count)/.test(issue));
  const rhymeItem = (word) => ({ ...ownItem(word), phonemes: ['k', 'a', 't'], rhymeWord: 'hat', activityItems: { ...ownItem(word).activityItems, rhyming: { options: ['hat', 'dog', 'sun', 'bed'], answer: 'hat' } } });

  it('embeds the same core, with the activity-word rule', () => {
    expect(fileText).toContain('const packItemPlaysIn = (item, activity, language) =>');
    expect(fileText.replace(/\r\n/g, '\n')).toContain(coreSource.replace(/\r\n/g, '\n').trim());
  });

  it('the guard applies cleanly and only once', () => {
    expect(contractSource).toContain('var otherActivityWord = function');
    expect(guard.patch(contractSource)).toBe(contractSource);
  });

  it('is unchanged for a lesson with no added words where every word can be used', () => {
    const own = [ownItem('sunset'), ownItem('raincoat')];
    const before = load(fileText).requirements(resource(own));
    const after = load(contractSource).requirements(resource(own));
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    expect(syllableIssues(after.contentIssues)).toEqual([]);
  });

  it('does not report a lesson word that a syllable activity leaves out', () => {
    const words = [ownItem('cat'), ownItem('hat'), ownItem('sunset')];
    expect(syllableIssues(issues(words))).toEqual([]);
  });

  it('does not check an added word against any other activity, and still asks for its audio', () => {
    const lesson = [rhymeItem('cat'), ownItem('sunset')];
    const withAdded = [...lesson, addedItem('raincoat', ['syllable_blending']), addedItem('cupcake', ['syllable_blending'])];
    expect(issues(withAdded)).toEqual(issues(lesson));
    expect(issues(withAdded).join(' ')).not.toMatch(/raincoat|cupcake/);
    const speech = load(contractSource).requirements(resource(withAdded)).entries.filter((entry) => entry.category === 'speech').map((entry) => entry.key);
    expect(speech).toEqual(expect.arrayContaining(['sunset', 'raincoat', 'rain', 'coat', 'cupcake', 'cup', 'cake']));
  });

  it('still reports a syllable activity that has no usable word at all', () => {
    const none = issues([ownItem('cat'), ownItem('hat')], { lessonPlanSequence: ['syllable_blending'] });
    expect(none.filter((issue) => /Syllable blending for (cat|hat)/.test(issue))).toHaveLength(2);
  });

  it('still reports every unusable word of a fixed form (an assessment keeps each authored item)', () => {
    const fixed = issues([ownItem('cat'), ownItem('sunset')], { lessonPlanSequence: ['syllable_blending'], sessionConfig: { wordSoundsLanguage: 'en', fixedForm: true } });
    expect(fixed.filter((issue) => /Syllable blending for cat/.test(issue))).toHaveLength(1);
  });
});

describe('the bank build reads the whole compound list', () => {
  it('targets compoundWords(), not only the first 64', () => {
    const build = readFileSync('dev-tools/build_word_sounds_syllable_audio.cjs', 'utf8');
    expect(build).toContain('const targets = core.compoundWords().sort();');
    expect(build).not.toContain('core.syllableWords()');
    expect(core.compoundWords()).toHaveLength(104);
  });
});
