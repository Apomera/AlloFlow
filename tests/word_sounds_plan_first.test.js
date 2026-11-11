// @vitest-environment jsdom
// Word Sounds, 2026-11-10: the plan is the lesson.
// Setup always has a plan. Six starting points fill it; before the teacher chooses, the app
// suggests one from the selected words. One length control scales the item counts. Only the
// planned activities are prepared unless "Let students choose from all activities" is ticked.
// The player follows the plan: students see only what was prepared, teachers also see what was
// not, with a way to add it. A requirement is shown only when an activity in the plan needs it.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { baseProps, setupWordSounds } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const setupSource = readFileSync('word_sounds_setup_source.jsx', 'utf8').replace(/\r\n/g, '\n');
const moduleSource = readFileSync('word_sounds_module.js', 'utf8');
const reviewSource = readFileSync('misc_components_source.jsx', 'utf8').replace(/\r\n/g, '\n');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const pronunciations = require(resolve('word_sounds_pronunciations.js'));
const core = new Function('pronunciations', coreSource + ';return createWordSoundsCore({pronunciations});')(pronunciations);
const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).word_sounds;
const IDS = core.activityIds();
const names = (ids) => ids.map((id) => core.activityEnglishName(id));
const CVC = ['cat', 'hat', 'map', 'sun', 'pig', 'dog'];

describe('starting points (core data)', () => {
  it('six of them, each a list of real activities in running order with a streak', () => {
    const points = core.startingPoints();
    expect(points.map((p) => p.id)).toEqual(['hearing_sounds', 'first_sounds_letters', 'cvc', 'digraphs_blends', 'syllables', 'reading']);
    expect(points.map((p) => p.name)).toEqual(['Hearing sounds', 'First sounds and letters', 'CVC blending and spelling', 'Digraphs and blends', 'Syllables', 'Reading words and sentences']);
    points.forEach((point) => {
      expect(point.activities.length).toBeGreaterThanOrEqual(3);
      point.activities.forEach((activity) => expect(IDS, point.id).toContain(activity.id));
      expect(new Set(point.activities.map((a) => a.id)).size).toBe(point.activities.length);
      expect([2, 3, 4]).toContain(point.mastery);
    });
    expect(core.startingPointPlan('hearing_sounds').order).toEqual(['rhyming', 'syllable_counting', 'syllable_blending', 'isolation']);
    expect(core.startingPointPlan('hearing_sounds').masteryThreshold).toBe(2);
    expect(core.startingPointPlan('cvc').order).toEqual(['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']);
    expect(core.startingPointPlan('digraphs_blends').order).toEqual(['isolation', 'sound_sort', 'blending', 'mapping', 'missing_letter', 'spelling_bee']);
    expect(core.startingPointPlan('syllables').order).toEqual(['syllable_counting', 'syllable_blending', 'spelling_bee']);
    expect(core.startingPointPlan('reading').order).toEqual(['decoding', 'read_sentence', 'sentence_match', 'read_passage']);
    expect(core.startingPointPlan('nope')).toBeNull();
  });

  it('a saved plan with exactly a starting point\'s activities, in order, is that starting point', () => {
    expect(core.matchStartingPoint(['isolation', 'sound_sort', 'blending', 'letter_tracing'])).toBe('first_sounds_letters');
    expect(core.matchStartingPoint(['sound_sort', 'isolation', 'blending', 'letter_tracing'])).toBe('');
    expect(core.matchStartingPoint(['isolation', 'sound_sort', 'blending'])).toBe('');
    expect(core.matchStartingPoint([])).toBe('');
  });

  it('lesson length shares 10, 20 or 30 items between the activities: about 5, 10 and 15 minutes', () => {
    for (const point of core.startingPoints()) {
      for (const [length, items, minutes] of [['short', 10, 5], ['regular', 20, 10], ['long', 30, 15]]) {
        const plan = core.startingPointPlan(point.id, { length });
        expect(core.lessonPlanItems(plan.activities), point.id + ' ' + length).toBe(items);
        expect(core.lessonPlanMinutes(plan.activities)).toBe(minutes);
        expect(core.lessonLengthOf(plan.activities)).toBe(length);
        plan.activities.forEach((activity) => { expect(activity.count).toBeGreaterThanOrEqual(1); expect(activity.count).toBeLessThanOrEqual(20); });
      }
    }
    expect(core.startingPointPlan('cvc').length, 'Regular when none is given').toBe('regular');
    expect(core.startingPointPlan('hearing_sounds').activities.map((a) => a.count)).toEqual([5, 5, 5, 5]);
  });

  it('scaling keeps the teacher\'s proportions, never drops an activity, and reports other totals as custom', () => {
    const mix = [{ id: 'blending', count: 8 }, { id: 'rhyming', count: 2 }];
    expect(core.scaleLessonCounts(mix, 'short')).toEqual([{ id: 'blending', count: 8 }, { id: 'rhyming', count: 2 }]);
    expect(core.scaleLessonCounts(mix, 'long'), 'no activity passes 20; the rest of the items go to the other').toEqual([{ id: 'blending', count: 20 }, { id: 'rhyming', count: 10 }]);
    const many = IDS.slice(0, 14).map((id) => ({ id, count: 5 }));
    expect(core.scaleLessonCounts(many, 'short').every((entry) => entry.count === 1), 'one item each when the plan has more activities than items').toBe(true);
    expect(core.lessonLengthOf(mix.concat({ id: 'isolation', count: 5 }))).toBe('custom');
    expect(core.scaleLessonCounts(mix, 'forever')).toEqual(mix);
  });

  it('suggests a starting point from the words by a fixed rule', () => {
    const suggest = (words, options) => core.suggestStartingPoint(words, options).id;
    expect(core.suggestStartingPoint([])).toEqual({ id: 'hearing_sounds', rule: 'no_words' });
    expect(suggest(CVC)).toBe('cvc');
    expect(suggest(['cat', 'hat', 'mat', 'sat', 'bat', 'rat', 'pat', 'fat', 'flat', 'chat']), 'a rhyming family with two blends in ten').toBe('cvc');
    expect(suggest(['ship', 'shop', 'chat', 'fish', 'thin'])).toBe('digraphs_blends');
    expect(suggest(['stop', 'flag', 'best', 'jump'])).toBe('digraphs_blends');
    expect(suggest(['rabbit', 'sunset', 'banana', 'elephant', 'cat'])).toBe('syllables');
    expect(suggest(['apple', 'little'], { countOf: () => 0 }), 'spelling is the guess when no count is known').toBe('syllables');
    expect(suggest(['cat', 'dog'], { countOf: () => 3 }), 'a known count wins over the spelling').toBe('syllables');
    expect(suggest(['the', 'and', 'said', 'was'], { sightWords: ['the', 'and', 'said', 'was', 'you'] })).toBe('reading');
    expect(suggest(['gato', 'perro', 'mesa'], { language: 'es' })).toBe('hearing_sounds');
    expect(suggest(['eight', 'would', 'laugh', 'people', 'beautiful']), 'nothing fits: back to listening').toBe('hearing_sounds');
    // A starting point that is not offered here is passed over.
    expect(suggest(['the', 'and', 'said'], { sightWords: ['the', 'and', 'said'], isOffered: (id) => id !== 'reading' })).not.toBe('reading');
    expect(suggest(CVC, { isOffered: (id) => id !== 'cvc' })).toBe('hearing_sounds');
  });

  it('knows what an activity cannot run without, and when a starting point is not offered', () => {
    expect(core.activityBlockedBy('decoding', { pictures: false })).toBe('pictures');
    expect(core.activityBlockedBy('read_passage', { sentences: false })).toBe('sentences');
    expect(core.activityBlockedBy('blending', { pictures: false, sentences: false })).toBe('');
    expect(core.activityBlockedBy('letter_tracing', { language: 'es' })).toBe('language');
    expect(core.activityRunsInLanguage('spelling_bee', 'es')).toBe(true);
    expect(core.activityRunsInLanguage('spelling_bee', 'ar')).toBe(false);
    expect(core.activityRunsInLanguage('mapping', 'he')).toBe(false);
    expect(IDS.every((id) => core.activityRunsInLanguage(id, 'English') && core.activityRunsInLanguage(id, 'en-GB'))).toBe(true);
    expect(core.startingPointStatus('reading', { pictures: false, sentences: false }).disabled).toBe(true);
    const cvc = core.startingPointStatus('cvc', { pictures: false });
    expect(cvc.disabled).toBe(false);
    expect(cvc.dropped).toEqual([{ id: 'decoding', reason: 'pictures' }]);
    expect(core.startingPointPlan('cvc', { unavailable: ['decoding'] }).order).toEqual(['blending', 'segmentation', 'mapping', 'spelling_bee']);
    expect(core.lessonPlanItems(core.startingPointPlan('cvc', { unavailable: ['decoding'] }).activities), 'the items go to the activities that are left').toBe(20);
    expect(core.startingPointStatus('hearing_sounds', {}).dropped).toEqual([]);
  });

  it('the language rule is the player\'s own', () => {
    // The player's gate, read from its source: the same three lists.
    for (const id of ['sound_sort', 'word_families', 'letter_tracing', 'read_sentence', 'read_passage', 'sentence_match']) {
      expect(moduleSource).toContain('case "' + id + '":');
      expect(core.activityRunsInLanguage(id, 'es')).toBe(false);
    }
    const nonAlphabetic = [...moduleSource.match(/const NON_ALPHABETIC = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(nonAlphabetic.length).toBeGreaterThan(30);
    nonAlphabetic.forEach((code) => expect(core.activityRunsInLanguage('word_scramble', code), code).toBe(false));
    const rtl = [...moduleSource.match(/const RTL = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    rtl.forEach((code) => expect(core.activityRunsInLanguage('mapping', code), code).toBe(false));
  });
});

// ── The setup screen ──────────────────────────────────────────────────────────
const icons = [...new Set([...setupSource.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map((m) => m[1] || m[2]))]
  .filter((name) => !new RegExp('(?:function|const) ' + name + '\\b').test(setupSource));
const compiled = transformSync(setupSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const Generator = new Function('React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...icons,
  compiled + '\nreturn WordSoundsGenerator;')(React, () => {}, () => {}, (_t, key) => key, () => {}, ...icons.map(() => () => null));
const analysis = vi.fn(async (prompt) => {
  const word = (String(prompt).match(/Analyze the word "([^"]+)"/) || [])[1];
  if (!word) return '{}';
  return JSON.stringify({ word, phonemes: word.split(''), graphemes: word.split(''), phonemeCount: word.length, syllables: [word],
    syllableBlendingOptions: ['window', 'pencil', 'basket'], rhymeWord: 'bat', rhymeDistractors: ['dog', 'sun', 'bed', 'pig', 'cup'],
    blendingDistractors: ['cot', 'cut', 'bit', 'map', 'pen'], orthographyDistractors: ['kat', 'catt', 'cta'], wordFamily: '-at', familyEnding: '-at',
    familyMembers: ['bat', 'mat', 'sat'], firstSound: word[0], lastSound: word[word.length - 1], definition: 'a word', imagePrompt: 'icon' });
});

const picture = vi.fn(async () => 'data:image/png;base64,AAAA');

describe('setup: the plan is the lesson', () => {
  let root, container;
  const mount = async (extra = {}) => {
    const props = { glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false, wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => key,
      selectedVoice: 'Kore', ttsSpeed: 1, onStartGame: vi.fn(), callGemini: analysis, callImagen: picture,
      syllableReviewSession: { key: 1, setupDraft: { sessionType: 'practice' } }, ...extra };
    await act(async () => root.render(React.createElement(Generator, props)));
    return props;
  };
  const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  const until = async (check, label) => { for (let i = 0; i < 600; i++) { if (check()) return; await tick(); } throw Error('Timed out: ' + label); };
  const all = (selector) => [...container.querySelectorAll(selector)];
  const one = (selector) => container.querySelector(selector);
  const click = (el) => { expect(el, 'control to click').toBeTruthy(); return act(async () => { el.click(); }); };
  const session = (words, extra = {}) => ({ key: 1, setupDraft: { sessionType: 'practice', includeCustom: words.length > 0, customText: words.join(' '), ...extra } });
  const mountWords = async (words = CVC, extra = {}, props = {}) => {
    const mounted = await mount({ syllableReviewSession: session(words, extra), ...props });
    await until(() => !/Loading pronunciation dictionary/.test(container.textContent), 'the dictionary loads');
    await tick();
    return mounted;
  };
  const card = () => one('[data-ws-plan-card]');
  const point = (id) => one('[data-ws-starting-point="' + id + '"]');
  const pressedPoints = () => all('[data-ws-starting-point][aria-pressed="true"]').map((b) => b.getAttribute('data-ws-starting-point'));
  const summary = () => one('[data-ws-plan-summary]');
  const summaryActivities = () => all('[data-ws-plan-summary-activity]').map((li) => li.textContent);
  const summaryIds = () => all('[data-ws-plan-summary-activity]').map((li) => li.getAttribute('data-ws-plan-summary-activity'));
  const minutes = () => Number(one('[data-ws-plan-minutes]')?.getAttribute('data-ws-plan-minutes'));
  const startButtons = () => all('button').filter((b) => /^(Prepare lesson|Start Activity|Start teacher-led activity)$/.test(b.textContent.trim()));
  const prepare = async (props) => {
    const before = props.onStartGame.mock.calls.length;
    await click(startButtons()[0]);
    await until(() => props.onStartGame.mock.calls.length > before, 'the lesson is prepared');
    const [words, sequence, plan, configSummary, probe, config] = props.onStartGame.mock.calls.at(-1);
    return { words, sequence, plan, configSummary, probe, config };
  };
  const openEditor = async () => { if (!one('[data-ws-lesson-activities]')) await click(one('[data-ws-change-activities]')); };
  const tickBox = (id) => one('#ws-activity-check-' + id);

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
// The sound dictionary is loaded but holds none of these words, so each word takes the AI analysis this file
    // tests. The dictionary route (no AI call) is tested in word_sounds_ai_free_prepare.test.js.
    window.AlloModules = { WordSoundsPronunciations: pronunciations, WordSoundsPhonemes: { lookup: () => [] } };
    window.WORD_FAMILY_PRESETS = {}; window.SIGHT_WORD_PRESETS = {};
    delete window.__alloAiUsable; delete window.__alloWordSoundsAddActivity;
    analysis.mockClear(); picture.mockClear();
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); delete window.__alloAiUsable; delete window.__alloWordSoundsAddActivity; });

  it('has no plan switch, no per-session sliders and no "Activities to prepare" choice', async () => {
    await mountWords();
    expect(container.textContent).not.toMatch(/Enable Lesson Plan|word_sounds\.enable_lesson_plan|Sound Activities per Session|Spelling Activities per Session|Activities to prepare|Quick Practice/);
    expect(one('#ws-prepare-scope')).toBeNull();
    expect(all('input[type="range"]'), 'no slider on the default view').toHaveLength(0);
    expect(card()).toBeTruthy();
    expect(all('[data-ws-starting-point]')).toHaveLength(6);
    expect(all('[data-ws-starting-point]').map((b) => b.firstChild.textContent)).toEqual(core.startingPoints().map((p) => p.name));
    expect(all('[data-ws-length]').map((b) => b.getAttribute('data-ws-length'))).toEqual(['short', 'regular', 'long']);
    expect(one('[data-ws-free-roaming]').checked, 'only the plan is prepared by default').toBe(false);
    expect(one('[data-ws-lesson-activities]'), 'the full editor is one tap away').toBeNull();
  });

  it('with no words the suggestion is Hearing sounds, shown as a suggestion with its activities and length', async () => {
    await mountWords([]);
    expect(pressedPoints()).toEqual(['hearing_sounds']);
    expect(point('hearing_sounds').querySelector('[data-ws-plan-suggested]').textContent).toBe('Suggested for your words');
    expect(one('[data-ws-plan-name]').textContent).toBe('Hearing sounds');
    expect(summary().getAttribute('data-ws-plan-summary')).toBe('hearing_sounds');
    expect(one('[data-ws-lesson-length]').getAttribute('data-ws-lesson-length')).toBe('regular');
  });

  it('suggests from the selected words, and follows them until the teacher chooses', async () => {
    const props = await mountWords(CVC);
    expect(pressedPoints()).toEqual(['cvc']);
    expect(summaryActivities()).toEqual(names(['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']));
    expect(one('[data-ws-plan-minutes]').textContent).toBe('About 10 min');
    expect(props.syllableReviewSession.setupDraft.lessonPlan, 'a suggestion writes nothing to the draft').toBeUndefined();
    await act(async () => Simulate.change(one('[data-ws-my-words]'), { target: { value: 'ship shop chat fish thin' } }));
    await tick();
    expect(pressedPoints(), 'new words, new suggestion').toEqual(['digraphs_blends']);
    expect(summaryActivities()).toEqual(names(['isolation', 'sound_sort', 'blending', 'mapping', 'missing_letter', 'spelling_bee']));
    await act(async () => Simulate.change(one('[data-ws-my-words]'), { target: { value: 'rabbit sunset banana elephant' } }));
    await until(() => pressedPoints()[0] === 'syllables', 'long words suggest Syllables');
    expect(one('[data-ws-plan-suggested]')).toBeTruthy();
  });

  it('a suggested plan is what gets prepared', async () => {
    const props = await mountWords(CVC);
    const { sequence, plan, config, configSummary } = await prepare(props);
    expect(plan.order).toEqual(['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']);
    expect(plan.activities.map((a) => a.count)).toEqual([5, 4, 4, 3, 4]);
    expect(plan.masteryThreshold).toBe(3);
    expect(sequence).toHaveLength(20);
    expect(config.preparedActivities).toEqual(plan.order);
    expect(config.startingPoint).toBe('cvc');
    expect(configSummary).not.toMatch(/Quick Practice/);
  });

  it('with the sound dictionary loaded, the suggested CVC lesson is prepared without analysing any word with AI', async () => {
    window.AlloModules = { WordSoundsPronunciations: pronunciations, WordSoundsPhonemes: require(resolve('word_sounds_phonemes_en.js')) };
    const props = await mountWords(CVC);
    const { words, plan } = await prepare(props);
    expect(plan.order).toEqual(['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']);
    expect(analysis, 'no AI text call at all').not.toHaveBeenCalled();
    expect(words.map((w) => [w.word, w.phonemeSource, w.phonemes.join('-'), w.activityItems.mapping.graphemes.join('-')])).toEqual([
      ['cat', 'dictionary', 'k-a-t', 'c-a-t'], ['hat', 'dictionary', 'h-a-t', 'h-a-t'], ['map', 'dictionary', 'm-a-p', 'm-a-p'],
      ['sun', 'dictionary', 's-u-n', 's-u-n'], ['pig', 'dictionary', 'p-i-g', 'p-i-g'], ['dog', 'dictionary', 'd-o-g', 'd-o-g']]);
    words.forEach((w) => {
      expect(Object.keys(w.activityItems).sort(), w.word).toEqual([...plan.order].sort());
      expect(w.activityItems.blending.options, w.word).toContain(w.word);
      expect(w._fallbackUsed, w.word).toBeFalsy();
    });
    // The picture request is unchanged: Read & Match needs one for each word.
    expect(picture).toHaveBeenCalled();
  });

  it('picking a starting point fills the plan and the summary, and the app never changes it back', async () => {
    const props = await mountWords(CVC);
    await click(point('first_sounds_letters'));
    expect(pressedPoints()).toEqual(['first_sounds_letters']);
    expect(one('[data-ws-plan-suggested]'), 'a choice is not a suggestion').toBeNull();
    expect(one('[data-ws-plan-name]').textContent).toBe('First sounds and letters');
    expect(summaryActivities()).toEqual(['Find Sounds', 'Sound Sort', 'Blend Sounds', 'Letter Trace']);
    expect(minutes()).toBe(10);
    const draft = props.syllableReviewSession.setupDraft;
    expect(IDS.filter((id) => draft.lessonPlan[id].enabled).sort()).toEqual(['blending', 'isolation', 'letter_tracing', 'sound_sort']);
    expect(draft.lessonPlanOrder.filter((id) => draft.lessonPlan[id].enabled)).toEqual(['isolation', 'sound_sort', 'blending', 'letter_tracing']);
    expect(draft.masteryThreshold).toBe(3);
    expect(draft.planChoice).toBe('first_sounds_letters');
    // Words that would suggest something else do not move a teacher's choice.
    await act(async () => Simulate.change(one('[data-ws-my-words]'), { target: { value: 'rabbit sunset banana elephant' } }));
    await tick(); await tick();
    expect(pressedPoints()).toEqual(['first_sounds_letters']);
    await click(point('hearing_sounds'));
    expect(draft.masteryThreshold, 'Hearing sounds moves on after 2 in a row').toBe(2);
    const { plan, config } = await prepare(props);
    expect(plan.masteryThreshold).toBe(2);
    expect(plan.order[0]).toBe('rhyming');
    expect(config.startingPoint).toBe('hearing_sounds');
  });

  it('lesson length scales the counts of the plan on screen, suggested or chosen', async () => {
    const props = await mountWords(CVC);
    await click(one('[data-ws-length="short"]'));
    expect(one('[data-ws-length="short"]').getAttribute('aria-pressed')).toBe('true');
    expect(pressedPoints(), 'still the suggestion').toEqual(['cvc']);
    expect(one('[data-ws-plan-suggested]')).toBeTruthy();
    expect(minutes()).toBe(5);
    let run = await prepare(props);
    expect(run.plan.activities.map((a) => a.count)).toEqual([2, 2, 2, 2, 2]);
    await click(point('digraphs_blends'));
    expect(minutes(), 'a starting point picked later keeps the length').toBe(5);
    await click(one('[data-ws-length="long"]'));
    expect(pressedPoints(), 'length is not an edit').toEqual(['digraphs_blends']);
    expect(minutes()).toBe(15);
    run = await prepare(props);
    expect(run.plan.activities.reduce((sum, a) => sum + a.count, 0)).toBe(30);
    expect(run.plan.order).toEqual(['isolation', 'sound_sort', 'blending', 'mapping', 'missing_letter', 'spelling_bee']);
    expect(run.plan.estimatedMinutes).toBe(15);
  });

  it('the session goal can no longer cut a plan short', async () => {
    const props = await mountWords(CVC);
    const { plan, config } = await prepare(props);
    const most = plan.activities.reduce((sum, a) => sum + core.lessonItemCeiling(a.count, plan.masteryThreshold), 0);
    expect(config.sessionGoal).toBe(most);
    expect(config.sessionGoal).toBeGreaterThanOrEqual(plan.totalItems * 2);
    expect(config.orthoSessionGoal).toBe(0);
  });

  it('free roaming off prepares only the plan; on prepares everything and the plan is the order', async () => {
    const props = await mountWords(CVC);
    let run = await prepare(props);
    expect(run.config.preparedActivities).toEqual(['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']);
    expect(run.config.freeRoaming).toBe(false);
    run.words.forEach((item) => {
      expect(item._preparedActivities).toEqual(run.config.preparedActivities);
      Object.keys(item.activityItems || {}).forEach((id) => expect(run.config.preparedActivities).toContain(id));
    });
    await click(one('[data-ws-free-roaming]'));
    expect(one('[data-ws-free-roaming]').checked).toBe(true);
    run = await prepare(props);
    expect(run.config.preparedActivities, 'everything is available').toBeUndefined();
    expect(run.config.freeRoaming).toBe(true);
    expect(run.words[0]._preparedActivities).toBeUndefined();
    expect(run.plan.order, 'the plan is still the suggested order').toEqual(['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']);
    expect(Object.keys(run.words[0].activityItems)).toEqual(expect.arrayContaining(['rhyming', 'blending']));
  });

  it('"Change activities" opens the editor; any edit makes the plan "My own mix"; counts and the streak are under Fine-tune', async () => {
    const props = await mountWords(CVC);
    await openEditor();
    expect(one('[data-ws-change-activities]').getAttribute('aria-expanded')).toBe('true');
    expect(all('[data-ws-lesson-activity]').length).toBeGreaterThanOrEqual(19);
    expect(all('[data-ws-lesson-strand]').length, 'grouped by strand').toBeGreaterThanOrEqual(5);
    expect(IDS.filter((id) => tickBox(id) && tickBox(id).checked)).toEqual(expect.arrayContaining(['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']));
    expect(all('[data-ws-lesson-activities] input[type="range"]'), 'no counts until Fine-tune').toHaveLength(0);
    expect(one('[data-ws-mastery-threshold]')).toBeNull();
    expect(container.textContent).not.toMatch(/session goal can end it sooner/);
    await act(async () => Simulate.change(tickBox('rhyming'), { target: { checked: true } }));
    expect(pressedPoints(), 'no starting point is selected any more').toEqual([]);
    expect(one('[data-ws-plan-name]').textContent).toBe('My own mix');
    expect(summaryActivities()[0]).toBe('Rhyme Time');
    expect(summaryActivities()).toHaveLength(6);
    expect(props.syllableReviewSession.setupDraft.planChoice).toBe('custom');
    await click(one('[data-ws-plan-fine-tune]'));
    expect(all('[data-ws-lesson-activities] input[type="range"]')).toHaveLength(6);
    expect(one('[data-ws-mastery-threshold] select').value).toBe('3');
    expect(one('[data-ws-lesson-minimum-note]').textContent).toBe('Each number is the fewest items for that activity. It stops at about double.');
    await act(async () => Simulate.change(one('[data-ws-mastery-threshold] select'), { target: { value: '4' } }));
    const slider = one('[data-ws-lesson-activity="rhyming"] input[type="range"]');
    await act(async () => Simulate.change(slider, { target: { value: '7' } }));
    expect(one('[data-ws-lesson-length]').getAttribute('data-ws-lesson-length'), 'an exact count is no longer one of the three lengths').toBe('custom');
    expect(all('[data-ws-length][aria-pressed="true"]')).toHaveLength(0);
    const { plan } = await prepare(props);
    expect(plan.masteryThreshold).toBe(4);
    expect(plan.activities[0]).toMatchObject({ id: 'rhyming', count: 7 });
    expect(plan.order).toEqual(['rhyming', 'blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']);
    // A length tapped afterwards rescales the teacher's own mix and keeps it theirs.
    await click(one('[data-ws-length="regular"]'));
    expect(one('[data-ws-plan-name]').textContent).toBe('My own mix');
    expect(minutes()).toBe(10);
  });

  it('an empty plan blocks Prepare with a link that opens the editor', async () => {
    await mountWords(CVC);
    await openEditor();
    for (const id of ['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']) await act(async () => Simulate.change(tickBox(id), { target: { checked: false } }));
    expect(one('[data-ws-plan-empty]')).toBeTruthy();
    startButtons().forEach((button) => expect(button.disabled).toBe(true));
    await click(one('[data-ws-change-activities]'));
    expect(one('[data-ws-lesson-activities]')).toBeNull();
    await click(one('[data-ws-start-blocked-plan]'));
    expect(one('[data-ws-lesson-activities]'), 'the link opens the editor').toBeTruthy();
  });

  it('with AI off, a starting point that needs pictures and sentences is not offered, and others leave those activities out with a note', async () => {
    window.__alloAiUsable = () => false;
    await mountWords(CVC);
    const reading = point('reading');
    expect(reading.getAttribute('aria-disabled')).toBe('true');
    expect(reading.querySelector('[data-ws-starting-point-off]').textContent).toBe('Needs AI pictures and sentences, which are off here.');
    await click(reading);
    expect(pressedPoints(), 'tapping it does nothing').toEqual(['cvc']);
    expect(summaryIds(), 'Read & Match is left out').toEqual(['blending', 'segmentation', 'mapping', 'spelling_bee']);
    expect(one('[data-ws-plan-dropped="pictures"]').textContent).toBe('Left out, because no pictures can be made here: Read & Match');
    expect(minutes(), 'the items go to the activities that are left').toBe(10);
  });

  it('in another language, starting points lose the English-only activities or are not offered', async () => {
    await mountWords(['gato', 'perro', 'mesa'], {}, { wordSoundsLanguage: 'es' });
    expect(pressedPoints()).toEqual(['hearing_sounds']);
    expect(point('reading').getAttribute('aria-disabled')).toBe('true');
    expect(point('reading').querySelector('[data-ws-starting-point-off]').textContent).toBe('Not available in this language.');
    await click(point('first_sounds_letters'));
    expect(summaryIds()).toEqual(['isolation', 'blending']);
    expect(one('[data-ws-plan-dropped="language"]').textContent).toBe('Left out, because they are not available in this language: Sound Sort, Letter Trace');
  });

  it('an assessment has no plan card, and practice gets its plan back afterwards', async () => {
    const props = await mountWords(CVC);
    await click(all('button').find((b) => /Assessment$/.test(b.textContent.trim())));
    expect(card()).toBeNull();
    await click(all('button').find((b) => /Practice$/.test(b.textContent.trim())));
    expect(pressedPoints()).toEqual(['cvc']);
    expect(props.syllableReviewSession.setupDraft.includeLessonPlan, 'the assessment did not switch the plan off').not.toBe(false);
  });

  // ── AlloBot planner ──
  const changeReply = (changes, reply = 'Done.') => JSON.stringify({ kind: 'change', reply, changes });
  const send = async (message) => {
    const planner = one('[data-ws-goal-plan]');
    await act(async () => Simulate.change(planner.querySelector('textarea'), { target: { value: message } }));
    await act(async () => { planner.querySelector('[data-ws-planner-change]').click(); });
    await tick();
  };

  it('the planner reads the plan on screen and says who chose it', async () => {
    const callGemini = vi.fn(async () => changeReply({ enable: ['rhyming'] }));
    await mountWords(CVC, {}, { callGemini });
    await send('Add Rhyme Time.');
    const prompt = callGemini.mock.calls.find((call) => /CURRENT_SETUP_JSON/.test(call[0]))[0];
    const setup = JSON.parse(prompt.match(/CURRENT_SETUP_JSON: (.*)\n/)[1]);
    expect(setup.lessonPlanOn).toBe(true);
    expect(setup.planChosenBy).toBe('app');
    expect(setup.activitiesInOrder.filter((a) => a.on).map((a) => [a.id, a.count])).toEqual([['blending', 5], ['segmentation', 4], ['mapping', 4], ['spelling_bee', 3], ['decoding', 4]]);
    expect(prompt).toContain('planChosenBy');
  });

  it('applying a proposal writes the plan (on/off, counts, order) and marks it "My own mix"; the preview is what is applied', async () => {
    const callGemini = vi.fn(async (prompt) => /CURRENT_SETUP_JSON/.test(prompt)
      ? changeReply({ enable: ['rhyming'], disable: ['decoding'], counts: { blending: 6 }, order: ['spelling_bee', 'rhyming', 'blending', 'segmentation', 'mapping'] }) : analysis(prompt));
    const props = await mountWords(CVC, {}, { callGemini });
    await send('Start with spelling, add Rhyme Time, no Read & Match, 6 blending items.');
    const rows = all('[data-ws-goal-effect-activities] li').map((li) => li.textContent.replace(/:.*$/, ''));
    expect(rows).toEqual(['Spelling Bee', 'Rhyme Time', 'Blend Sounds', 'Break it Down', 'Sound Mapping']);
    expect(one('[data-ws-goal-effect-off]').textContent).toBe('Turned off: Read & Match');
    expect(pressedPoints(), 'nothing changes until Use this').toEqual(['cvc']);
    await click(one('[data-ws-goal-apply]'));
    expect(one('[data-ws-plan-name]').textContent).toBe('My own mix');
    expect(pressedPoints()).toEqual([]);
    expect(summaryActivities()).toEqual(rows);
    const draft = props.syllableReviewSession.setupDraft;
    expect(draft.planChoice).toBe('custom');
    expect(draft.lessonPlan.blending).toEqual({ enabled: true, count: 6 });
    expect(draft.lessonPlan.decoding.enabled).toBe(false);
    const { plan, config } = await prepare(props);
    expect(plan.order).toEqual(['spelling_bee', 'rhyming', 'blending', 'segmentation', 'mapping']);
    expect(plan.activities.find((a) => a.id === 'blending').count).toBe(6);
    expect(config.preparedActivities).toEqual(plan.order);
    // The next message goes out with the teacher's plan.
    await send('Thanks.');
    const last = callGemini.mock.calls.filter((call) => /CURRENT_SETUP_JSON/.test(call[0])).at(-1)[0];
    expect(JSON.parse(last.match(/CURRENT_SETUP_JSON: (.*)\n/)[1]).planChosenBy).toBe('teacher');
  });

  // ── Saved lessons ──
  const savedWords = (words, prepared) => words.map((word, index) => ({ id: 'w' + index, term: word, word, targetWord: word, displayWord: word,
    phonemes: word.split(''), graphemes: word.split(''), phonemeCount: word.length, syllables: [word], rhymeWord: 'bat', rhymeDistractors: ['dog', 'sun', 'bed'],
    blendingDistractors: ['cot', 'cut', 'bit'], orthographyDistractors: ['kat', 'catt', 'cta'], familyEnding: '-at', familyMembers: ['bat', 'mat', 'sat'],
    firstSound: word[0], lastSound: word[word.length - 1], definition: 'a word', image: 'data:image/png;base64,AAAA', ttsReady: true,
    ...(prepared ? { _preparedActivities: prepared } : {}),
    activityItems: Object.fromEntries((prepared || ['blending', 'segmentation', 'rhyming', 'counting', 'isolation']).map((id) => [id, { options: [word, 'cot', 'cut', 'bat'], answer: word }])) }));
  const savedPlan = (entries, mastery = 3) => ({ masteryMode: 'consecutive', masteryThreshold: mastery, activities: entries.map(([id, count]) => ({ id, count, enabled: true })),
    order: entries.map(([id]) => id), totalItems: entries.reduce((sum, entry) => sum + entry[1], 0) });
  const reopen = async (props) => {
    const mounted = await mount({ syllableReviewSession: { key: 1 }, ...props });
    await until(() => !/Loading pronunciation dictionary/.test(container.textContent), 'the dictionary loads');
    await tick();
    return mounted;
  };

  it('an old lesson without a plan opens as "All activities" with free roaming on, and is prepared as it was', async () => {
    const props = await reopen({ preloadedWords: savedWords(CVC), preparedLessonPlan: null,
      preparedSessionConfig: { schema: 'alloflow-word-sounds-session/v1', sessionGoal: 45, orthoSessionGoal: 10, imageVisibilityMode: 'smart' } });
    expect(one('[data-ws-plan-name]').textContent).toBe('All activities');
    expect(summary().getAttribute('data-ws-plan-summary')).toBe('all');
    expect(pressedPoints()).toEqual([]);
    expect(one('[data-ws-plan-all-note]')).toBeTruthy();
    expect(one('[data-ws-free-roaming]').checked).toBe(true);
    expect(one('[data-ws-plan-changed]'), 'nothing changed').toBeNull();
    expect(one('[data-ws-lesson-length]'), 'no plan, no length').toBeNull();
    const run = await prepare(props);
    expect(run.plan).toBeNull();
    expect(run.sequence).toEqual([]);
    expect(run.configSummary).toBe('Quick Practice Mode');
    expect(run.config.sessionGoal).toBe(45);
    expect(run.config.orthoSessionGoal).toBe(10);
    expect(run.config.preparedActivities).toBeUndefined();
    expect('freeRoaming' in run.config).toBe(false);
  });

  it('an old lesson with a plan and everything prepared opens with its plan and free roaming on', async () => {
    const plan = savedPlan([['counting', 6], ['blending', 4]], 4);
    const props = await reopen({ preloadedWords: savedWords(CVC), preparedLessonPlan: plan, preparedSessionConfig: { sessionGoal: 30, orthoSessionGoal: 0 } });
    expect(one('[data-ws-plan-name]').textContent).toBe('My own mix');
    expect(summaryIds()).toEqual(['counting', 'blending']);
    expect(one('[data-ws-free-roaming]').checked).toBe(true);
    expect(one('[data-ws-plan-changed]')).toBeNull();
    const run = await prepare(props);
    expect(run.plan.activities.map((a) => [a.id, a.count])).toEqual([['counting', 6], ['blending', 4]]);
    expect(run.plan.masteryThreshold).toBe(4);
    expect(run.config.preparedActivities).toBeUndefined();
  });

  it('a saved lesson that matches a starting point shows it selected', async () => {
    const start = core.startingPointPlan('first_sounds_letters', { length: 'short' });
    const plan = savedPlan(start.activities.map((a) => [a.id, a.count]));
    await reopen({ preloadedWords: savedWords(CVC, start.order), preparedLessonPlan: plan, preparedSessionConfig: { preparedActivities: start.order, freeRoaming: false } });
    expect(pressedPoints()).toEqual(['first_sounds_letters']);
    expect(one('[data-ws-plan-suggested]'), 'a saved plan is the teacher\'s, not a suggestion').toBeNull();
    expect(one('[data-ws-lesson-length]').getAttribute('data-ws-lesson-length')).toBe('short');
    expect(one('[data-ws-free-roaming]').checked).toBe(false);
    expect(one('[data-ws-plan-changed]')).toBeNull();
  });

  it('says when the plan differs from the prepared lesson, and "Prepare again" prepares it', async () => {
    const entries = [['blending', 5], ['segmentation', 5]];
    const props = await reopen({ preloadedWords: savedWords(CVC, ['blending', 'segmentation']), preparedLessonPlan: savedPlan(entries),
      preparedSessionConfig: { preparedActivities: ['blending', 'segmentation'], freeRoaming: false } });
    expect(one('[data-ws-plan-changed]')).toBeNull();
    await openEditor();
    await act(async () => Simulate.change(tickBox('rhyming'), { target: { checked: true } }));
    const notice = one('[data-ws-plan-changed]');
    expect(notice.textContent).toContain('The plan changed since this lesson was prepared.');
    expect(notice.getAttribute('role')).toBe('status');
    await act(async () => Simulate.change(tickBox('rhyming'), { target: { checked: false } }));
    expect(one('[data-ws-plan-changed]'), 'back to the prepared plan').toBeNull();
    await click(one('[data-ws-free-roaming]'));
    expect(one('[data-ws-plan-changed]'), 'preparing everything is a change too').toBeTruthy();
    await click(one('[data-ws-free-roaming]'));
    await click(one('[data-ws-length="long"]'));
    expect(one('[data-ws-plan-changed]'), 'so is a new length').toBeTruthy();
    const before = props.onStartGame.mock.calls.length;
    await click(one('[data-ws-plan-prepare-again]'));
    await until(() => props.onStartGame.mock.calls.length > before, 'prepared again');
    expect(props.onStartGame.mock.calls.at(-1)[2].activities.reduce((sum, a) => sum + a.count, 0)).toBe(30);
  });

  it('an AlloBot proposal applied after preparing brings up the same notice', async () => {
    const callGemini = vi.fn(async (prompt) => /CURRENT_SETUP_JSON/.test(prompt) ? changeReply({ enable: ['rhyming'] }) : analysis(prompt));
    await reopen({ callGemini, preloadedWords: savedWords(CVC, ['blending', 'segmentation']), preparedLessonPlan: savedPlan([['blending', 5], ['segmentation', 5]]),
      preparedSessionConfig: { preparedActivities: ['blending', 'segmentation'], freeRoaming: false } });
    await send('Add Rhyme Time.');
    expect(one('[data-ws-plan-changed]')).toBeNull();
    await click(one('[data-ws-goal-apply]'));
    expect(one('[data-ws-plan-changed]')).toBeTruthy();
  });

  it('"Prepare this activity" from the player adds it to the plan and prepares again without new AI text or pictures for the words it has', async () => {
    const callImagen = vi.fn(async () => 'data:image/png;base64,AAAA');
    const callGemini = vi.fn(analysis);
    window.__alloWordSoundsAddActivity = 'rhyming';
    const props = await mount({ syllableReviewSession: { key: 1 }, callGemini, callImagen, callTTS: vi.fn(async () => 'data:audio/wav;base64,AAAA'),
      preloadedWords: savedWords(CVC, ['blending', 'segmentation']), preparedLessonPlan: savedPlan([['blending', 5], ['segmentation', 5]]),
      preparedSessionConfig: { preparedActivities: ['blending', 'segmentation'], freeRoaming: false } });
    await until(() => props.onStartGame.mock.calls.length > 0, 'setup prepares again by itself');
    expect(window.__alloWordSoundsAddActivity, 'taken once').toBeNull();
    const [words, , plan, , , config] = props.onStartGame.mock.calls[0];
    expect(plan.order, 'after the activities of the saved plan').toEqual(['blending', 'segmentation', 'rhyming']);
    expect(config.preparedActivities).toEqual(['blending', 'segmentation', 'rhyming']);
    expect(words.map((item) => item.targetWord)).toEqual(CVC);
    words.forEach((item) => expect(item.activityItems.rhyming, item.targetWord + ' has a Rhyme Time item').toBeTruthy());
    expect(callGemini.mock.calls.filter((call) => /Analyze the word/.test(call[0])), 'no word is analysed again').toHaveLength(0);
    expect(callImagen, 'no picture is made again').not.toHaveBeenCalled();
    expect(one('[data-ws-plan-name]').textContent).toBe('My own mix');
  });

  // ── Requirement scoping ──
  it('a plan without a syllable activity shows no syllable requirement anywhere on the setup screen', async () => {
    await mountWords(['cat', 'hat', 'every', 'zzyxq', 'sunset', 'rabbit']);
    await click(point('cvc'));
    expect(all('[data-ws-chip-syllables]'), 'no count or "needs review" on the word chips').toHaveLength(0);
    expect(all('[data-ws-syllable-plan]')).toHaveLength(0);
    expect(one('[data-ws-start-blocked]')).toBeNull();
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
    expect(container.textContent).not.toMatch(/syllable count|Syllable count|syllable check|Review syllable counts|syllable recordings|Loading pronunciation dictionary|Sound Swap is hidden|saved rhyme/);
    expect(all('[data-ws-word-chip]').every((chip) => !chip.getAttribute('title')), 'no count source in a tooltip either').toBe(true);
  });

  it('the same words with Syllable Claps in the plan show its line and the chip states', async () => {
    await mountWords(['cat', 'hat', 'every', 'zzyxq', 'sunset', 'rabbit']);
    await click(point('syllables'));
    await until(() => !!one('[data-ws-chip-syllables="review"]'), 'chips show what needs a check');
    expect(all('[data-ws-syllable-plan]').map((n) => n.getAttribute('data-ws-syllable-plan'))).toEqual(['syllable_blending', 'syllable_counting']);
    expect(one('[data-ws-syllable-plan="syllable_counting"]').textContent).toMatch(/need a syllable check/);
    startButtons().forEach((button) => expect(button.disabled, 'a note, never a block').toBe(false));
  });

  it('an assessment of a skill that is not a syllable skill shows no syllable counts either', async () => {
    await mountWords(['cat', 'hat', 'every'], { sessionType: 'assessment', probeActivitySel: 'segmentation' });
    expect(all('[data-ws-chip-syllables]')).toHaveLength(0);
    act(() => root.unmount()); root = createRoot(container);
    await mountWords(['cat', 'hat', 'every'], { sessionType: 'assessment', probeActivitySel: 'syllable_counting' });
    await until(() => all('[data-ws-chip-syllables]').length === 3, 'a syllable probe shows them');
  });

  it('new text goes through the translation helper with an English fallback', () => {
    const keys = JSON.parse(readFileSync('C:/tmp/ws_screen_1109/keys_planfirst.json', 'utf8'));
    const sources = setupSource + moduleSource + coreSource;
    for (const [key, text] of Object.entries(keys)) {
      const built = ["'word_sounds.starting_point_' + ", "'word_sounds.lesson_length_' + "].some((prefix) => sources.includes(prefix) && key.startsWith(prefix.slice(1, -4)));
      expect(sources.includes("'" + key + "'") || sources.includes('"' + key + '"') || built, key + ' is used').toBe(true);
      expect(typeof text === 'string' && text.length > 0, key).toBe(true);
    }
    expect(setupSource).not.toMatch(/tf\('word_sounds\.(plan_|starting_point|lesson_length)[a-z_]*'\)/);
  });
});

// ── The player ────────────────────────────────────────────────────────────────
describe('player: follows the plan', () => {
  let Modal, root, container, current;
  const strings = (_t, key, params = {}) => {
    let text = english[String(key).replace('word_sounds.', '')] || '';
    for (const [name, value] of Object.entries(params || {})) text = text.split('{' + name + '}').join(String(value));
    return text;
  };
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
  let originalAudio, originalGlobalAudio;
  const PLAN = ['blending', 'segmentation', 'mapping', 'spelling_bee'];
  const packWord = (word, phonemes, prepared) => {
    const cat = makePackItem();
    const item = word === 'cat' ? cat : { ...cat, id: word, term: word, word, targetWord: word, displayWord: word, phonemes, graphemes: phonemes, phonemeCount: phonemes.length,
      syllables: [word], firstSound: phonemes[0], lastSound: phonemes[phonemes.length - 1], _ttsAssets: undefined,
      activityItems: { ...cat.activityItems, counting: { options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '11+'], answer: phonemes.length } } };
    return prepared ? { ...item, _preparedActivities: prepared, activityItems: Object.fromEntries(Object.entries(item.activityItems).filter(([id]) => prepared.includes(id))) } : item;
  };
  const pack = (prepared) => [packWord('cat', ['k', 'a', 't'], prepared), packWord('map', ['m', 'a', 'p'], prepared), packWord('sun', ['s', 'u', 'n'], prepared), packWord('pig', ['p', 'i', 'g'], prepared)];
  function Host(overrides) {
    const [activity, setActivity] = React.useState(overrides.activity || 'counting');
    const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
    const started = React.useRef([]);
    const setActivityLogged = React.useCallback((next) => { started.current.push(next); setActivity(next); }, []);
    current = { activity, word, data, score, history, feedback, started: started.current, setActivity };
    const { activity: _ignored, ...rest } = overrides;
    return React.createElement(Modal, { ...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false, disableAnimations: true, sessionId: 'plan-first',
      wsPreloadedWords: pack(), wordSoundsDifficulty: 'easy', wordSoundsSessionGoal: 10, onClose: () => {}, getWordSoundsString: strings, ...rest,
      wordSoundsActivity: activity, setWordSoundsActivity: setActivityLogged, currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
      wordSoundsPhonemes: data, setWordSoundsPhonemes: setData, wordSoundsScore: score, setWordSoundsScore: setScore,
      wordSoundsHistory: history, setWordSoundsHistory: setHistory, wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback });
  }
  const tick = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));
  const mount = async (overrides = {}) => {
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Host, overrides))); await tick(150);
  };
  const q = (selector) => container.querySelector(selector);
  const qa = (selector) => [...container.querySelectorAll(selector)];
  const click = async (element) => { expect(element, 'control to click').toBeTruthy(); await act(async () => element.click()); };
  const count = (value) => click(q('[role="button"][aria-label="Number ' + value + '"]'));
  const morePanel = () => q('[data-ws-student-more-panel]:not([hidden])');
  const openMore = () => click(q('[data-ws-student-more]') || qa('button').find((b) => /More/.test(b.getAttribute('aria-label') || b.textContent)));
  const tabLabels = (scope) => [...scope.querySelectorAll('[data-ws-activity-tabs] button')].filter((b) => !b.hasAttribute('data-ws-unprepared-activity') && !/AAC/.test(b.textContent)).map((b) => b.textContent.replace(/^[^A-Za-z]+/, '').trim());
  const title = () => q('[data-ws-header-subtitle]').textContent;
  const recap = () => q('[aria-labelledby="word-sounds-session-complete-title"]');

  beforeAll(() => { installCanvasStub(); ({ WordSoundsModal: Modal } = setupWordSounds()); });
  beforeEach(() => {
    vi.useFakeTimers({ now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
    window.Audio = globalThis.Audio = CompleteAudio;
    delete window.__alloWordSoundsAddActivity;
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    root = null; container?.remove();
    window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
    vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
    delete window.__alloWordSoundsAddActivity;
  });

  it('a student device with a lesson-only pack lists exactly the plan, print activities included', async () => {
    // No plan config travelled with this pack, and the spelling goal is 0: the menu is the prepared set.
    await mount({ activity: 'blending', wsPreloadedWords: pack(PLAN), sessionConfig: { preparedActivities: PLAN, orthoSessionGoal: 0 }, orthoSessionGoal: 0 });
    await openMore();
    expect(tabLabels(morePanel())).toEqual(names(['blending', 'segmentation', 'mapping', 'spelling_bee']));
    expect(morePanel().textContent).toContain('Change activity');
    expect(q('[data-ws-unprepared-activity]'), 'nothing greyed for a student').toBeNull();
    expect(container.textContent).not.toContain('Not in this lesson');
  });

  it('the same pack read from the words alone (no session config) gives the same menu', async () => {
    await mount({ activity: 'blending', wsPreloadedWords: pack(PLAN) });
    await openMore();
    expect(tabLabels(morePanel())).toEqual(names(PLAN));
  });

  it('a student in a planned lesson has no activity list; with free roaming every activity is offered', async () => {
    const plan = { lessonPlanConfig: { activities: PLAN.map((id) => ({ id, count: 2 })), masteryThreshold: 2 }, initialActivitySequence: PLAN.flatMap((id) => [id, id]) };
    await mount({ activity: 'blending', wsPreloadedWords: pack(PLAN), sessionConfig: { preparedActivities: PLAN, freeRoaming: false }, ...plan });
    await openMore();
    expect(morePanel().textContent).not.toContain('Change activity');
    expect(tabLabels(morePanel())).toEqual([]);
    expect(morePanel().querySelector('[data-ws-lesson-next]').textContent).toBe('Next: Break it Down');
    await act(async () => root.unmount()); container.remove();
    await mount({ activity: 'blending', sessionConfig: { freeRoaming: true }, ...plan });
    await openMore();
    expect(morePanel().textContent).toContain('Change activity');
    expect(tabLabels(morePanel())).toEqual(expect.arrayContaining(names(['rhyming', 'blending', 'spelling_bee', 'decoding', 'read_sentence'])));
    expect(tabLabels(morePanel()).length).toBeGreaterThanOrEqual(18);
  });

  it('an old lesson with a plan and no prepared list still lists its planned spelling activity for the teacher', async () => {
    await mount({ activity: 'blending', isTeacherMode: true, lessonPlanConfig: { activities: PLAN.map((id) => ({ id, count: 2 })), masteryThreshold: 2 },
      initialActivitySequence: PLAN.flatMap((id) => [id, id]), sessionConfig: { orthoSessionGoal: 0 }, orthoSessionGoal: 0 });
    const labels = tabLabels(container);
    expect(labels).toEqual(expect.arrayContaining(['Sound Mapping', 'Spelling Bee', 'Rhyme Time']));
    expect(labels, 'unplanned print activities stay out, as before').not.toContain('Word Scramble');
    expect(q('[data-ws-unprepared-activity]'), 'everything was prepared: nothing is greyed').toBeNull();
  });

  it('an old lesson without a plan (Quick Practice) keeps the sound activities and its goal', async () => {
    await mount({ activity: 'counting', isTeacherMode: true, wsPreloadedWords: pack(), sessionConfig: { sessionGoal: 30, orthoSessionGoal: 0 } });
    const labels = tabLabels(container);
    expect(labels).toEqual(expect.arrayContaining(['Sound Counting', 'Find Sounds', 'Blend Sounds', 'Rhyme Time']));
    expect(labels).not.toContain('Spelling Bee');
    expect(q('[data-ws-unprepared-activity]')).toBeNull();
    expect(q('[data-ws-lesson-only-note]')).toBeNull();
  });

  it('the teacher sees the activities that were not prepared, greyed, under "Not in this lesson"', async () => {
    const onBackToSetup = vi.fn();
    await mount({ activity: 'blending', isTeacherMode: true, onBackToSetup, wsPreloadedWords: pack(PLAN), sessionConfig: { preparedActivities: PLAN }, autoReview: false });
    expect(tabLabels(container)).toEqual(names(PLAN));
    expect(q('[data-ws-unprepared-heading]').textContent).toBe('Not in this lesson');
    const greyed = qa('[data-ws-unprepared-activity]');
    expect(greyed.length).toBeGreaterThanOrEqual(14);
    expect(greyed.map((b) => b.getAttribute('data-ws-unprepared-activity'))).toEqual(expect.arrayContaining(['rhyming', 'counting', 'decoding', 'word_scramble']));
    PLAN.forEach((id) => expect(q('[data-ws-unprepared-activity="' + id + '"]')).toBeNull());
    expect(greyed[0].getAttribute('aria-label')).toMatch(/: Not in this lesson$/);
    expect(greyed[0].className).toContain('border-dashed');
    // A tap does not start it: it offers the way to add it.
    await click(q('[data-ws-unprepared-activity="rhyming"]'));
    expect(current.activity).toBe('blending');
    const offer = q('[data-ws-prepare-offer="rhyming"]');
    expect(offer.textContent).toContain('Rhyme Time is not in this lesson.');
    await click(offer.querySelector('[data-ws-prepare-activity="rhyming"]'));
    expect(offer.querySelector('[data-ws-prepare-activity]').textContent).toBe('Prepare this activity');
    expect(onBackToSetup).toHaveBeenCalledTimes(1);
    expect(window.__alloWordSoundsAddActivity).toBe('rhyming');
  });

  it('an unprepared activity is never started: asking for one starts a prepared one', async () => {
    await mount({ activity: 'rhyming', wsPreloadedWords: pack(PLAN), sessionConfig: { preparedActivities: PLAN } });
    expect(PLAN).toContain(current.started.at(-1) || current.activity);
    expect(title()).not.toBe('Rhyme Time');
    expect(PLAN.map((id) => core.activityEnglishName(id))).toContain(title());
  });

  it('auto-advance follows the plan and passes over an activity that was not prepared', async () => {
    const order = ['counting', 'rhyming', 'isolation'];
    await mount({ activity: 'counting', wsPreloadedWords: pack(['counting', 'isolation']), sessionConfig: { preparedActivities: ['counting', 'isolation'], sessionGoal: 99 },
      lessonPlanConfig: { activities: order.map((id) => ({ id, count: 1 })), masteryThreshold: 1 }, initialActivitySequence: order });
    await openMore();
    expect(morePanel().querySelector('[data-ws-lesson-next]').textContent, 'Rhyme Time was not prepared').toBe('Next: Find Sounds');
    // Answer Sound Counting correctly until the lesson moves on.
    for (let turn = 0; turn < 6 && current.activity === 'counting'; turn++) {
      const answer = (current.data && current.data.phonemes ? current.data.phonemes.length : 3);
      await count(answer);
      await tick(3200);
    }
    expect(current.activity).toBe('isolation');
    expect(current.started).not.toContain('rhyming');
    expect(title()).toBe('Find Sounds');
  });

  it('"Practice Missed Words" replays in the activity the word was missed in, which is always a prepared one', async () => {
    await mount({ activity: 'counting', isParentMode: true, wsPreloadedWords: [packWord('cat', ['k', 'a', 't'], ['counting', 'isolation'])],
      sessionConfig: { preparedActivities: ['counting', 'isolation'], sessionGoal: 1 }, wordSoundsSessionGoal: 1 });
    await count(2); await count(5);              // Sound Counting: cat missed
    await tick(3200);
    await act(async () => current.setActivity('isolation')); await tick(150);
    expect(title()).toBe('Find Sounds');
    const iso = current.data.activityItems.isolation;
    await click(q('button[aria-label="Choose Sound ' + (iso.options.indexOf(iso.correctSound) + 1) + '"]'));
    await click(q('[data-ws-card-check]'));
    await tick(2200);                            // Find Sounds: cat right, the goal of 1 is met
    expect(recap()).toBeTruthy();
    const replay = recap().querySelector('[data-ws-practice-missed]');
    expect(replay).toBeTruthy();
    current.started.length = 0;
    await click(replay);
    await tick(150);
    expect(current.activity).toBe('counting');
    current.started.forEach((id) => expect(['counting', 'isolation']).toContain(id));
  });

  it('print materials say that only this lesson\'s activities are listed', async () => {
    await mount({ activity: 'blending', isTeacherMode: true, wsPreloadedWords: pack(PLAN), sessionConfig: { preparedActivities: PLAN }, autoReview: false });
    const menu = qa('button').find((b) => /Print & share/.test(b.textContent));
    await click(menu);
    await click(qa('button, [role="menuitem"]').find((b) => /Print materials/.test(b.textContent)));
    await tick(50);
    const note = q('[data-ws-print-dialog] [data-ws-lesson-only-note="print"]');
    expect(note.textContent).toBe('Only the activities in this lesson are listed. Add an activity in setup.');
  });
});

describe('the lesson-only line and the review scope (source contracts)', () => {
  it('Present and the take-home dialog carry the same one line, only for a lesson-only pack', () => {
    expect(moduleSource).toContain('"data-ws-lesson-only-note": "present"');
    expect(moduleSource).toContain('"data-ws-lesson-only-note": "take-home"');
    expect(moduleSource).toContain('lessonOnly: isTeacherMode && lessonPreparedOnly,');
    expect(moduleSource.match(/"word_sounds\.lesson_only_note", "Only the activities in this lesson are listed\. Add an activity in setup\."/g)).toHaveLength(3);
  });

  it('the check-words panel follows the plan, then the prepared activities', () => {
    expect(reviewSource).toContain(`const reviewActivities = Array.isArray(activitySequence) && activitySequence.length ? activitySequence
        : Array.isArray(preparedActivities) && preparedActivities.length ? preparedActivities
            : currentActivity ? [currentActivity] : null;`);
    expect(moduleSource).toContain('preparedActivities: lessonPreparedOnly ? lessonPreparedList : null,');
    // Every activity-specific gap names its activities, so the scope applies to it.
    const gaps = [...reviewSource.matchAll(/addGap\(\{\s*key: '([a-z_]+)',\s*(activities: \[[^\]]*\])?/g)].map((m) => [m[1], !!m[2]]);
    const scoped = Object.fromEntries(gaps);
    for (const key of ['rhyme', 'task', 'images', 'sentence_audio', 'tile_images', 'unverified', 'phonemes']) expect(scoped[key], key).toBe(true);
    for (const part of ['rhyming', 'blending', 'manipulation', 'isolation']) expect(reviewSource).toContain(`hidden={!reviewsActivity('${part}')} data-ws-review-part="${part}"`);
    for (const id of ['read_sentence', 'read_passage', 'sentence_match']) expect(reviewSource).toContain(`reviewsActivity('${id}') && _ct.${id} &&`);
    expect(moduleSource).toContain("if (!lessonNeeds('syllable_counting', 'syllable_blending')) return null;");
  });
});
