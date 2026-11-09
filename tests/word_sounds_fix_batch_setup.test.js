// @vitest-environment jsdom
// Word Sounds setup fix batch (2026-11-09). Each block mounts the real setup component and checks one fix:
// 1 an empty lesson plan blocks Start in every scope; 2 a new assessment follows Word Count; 3 a Word Count change keeps
// the teacher's own picks; 4 strings go through the translation helper and the saved summary uses the list's names;
// 5 source wording, Glossary row hidden when empty; 6 sidebar words seed "My words" once; 7 the empty state has an action;
// 8 "Prepare lesson", Cancel, and a plain summary when audio or pictures are missing; 9 AI-off notes, assessment settings.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8').replace(/\r\n/g, '\n');
const icons = [...new Set([...source.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map((m) => m[1] || m[2]))]
  .filter((name) => !new RegExp('(?:function|const) ' + name + '\\b').test(source));
const compiled = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const Generator = new Function('React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...icons,
  compiled + '\nreturn WordSoundsGenerator;')(React, () => {}, () => {}, (_t, key) => key, () => {}, ...icons.map(() => () => null));

const IDS = ['isolation', 'blending', 'segmentation', 'orthography', 'rhyming', 'letter_tracing', 'counting', 'mapping', 'sound_sort', 'word_families',
  'word_scramble', 'manipulation', 'syllable_counting', 'syllable_blending', 'spelling_bee', 'missing_letter', 'decoding', 'read_sentence', 'read_passage', 'sentence_match'];
const plan = (on = []) => Object.fromEntries(IDS.map((id) => [id, { enabled: on.includes(id), count: 5 }]));
const TWENTY = ['ant', 'bee', 'cub', 'dot', 'elf', 'fig', 'gum', 'hen', 'ink', 'jam', 'kit', 'log', 'mud', 'nut', 'owl', 'pan', 'rug', 'sip', 'tub', 'van'];
const glossary = (words) => words.map((term) => ({ term }));
const prepared = (word, extra = {}) => ({ word, targetWord: word, phonemes: word.split(''), ...extra });

let root, container;
const mount = async (extra = {}) => {
  const props = { glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false, wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => key,
    selectedVoice: 'Kore', ttsSpeed: 1, onStartGame: vi.fn(), callGemini: vi.fn(async () => '{}'),
    syllableReviewSession: { key: 1, setupDraft: { sessionType: 'practice' } }, ...extra };
  await act(async () => root.render(React.createElement(Generator, props)));
  return props;
};
const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const until = async (check, label) => { for (let i = 0; i < 200; i++) { if (check()) return; await tick(); } throw Error('Timed out: ' + label); };
const all = (selector) => [...container.querySelectorAll(selector)];
const one = (selector) => container.querySelector(selector);
const click = (el) => { expect(el).toBeTruthy(); return act(async () => { el.click(); }); };
const startButtons = () => all('button').filter((b) => /^(Prepare lesson|Start Activity|Start teacher-led activity|Generating\.\.\.)$/.test(b.textContent.trim()));
const selected = () => all('button[aria-pressed="true"][aria-label$=": selected"]').map((b) => b.getAttribute('aria-label').split(':')[0]).sort();
const setCount = (value) => act(async () => Simulate.change(one('[data-help-key="ws_gen_count_slider"]'), { target: { value: String(value) } }));

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  window.AlloModules = {}; window.WORD_FAMILY_PRESETS = {}; window.SIGHT_WORD_PRESETS = {};
  delete window.__alloAiUsable;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); delete window.__alloAiUsable; });

describe('1. lesson plan on with no activity ticked', () => {
  it('blocks Start in every prepare scope, says why beside Start, and the message goes to the activity list', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeCustom: true, customText: 'cat dog', includeLessonPlan: true, lessonPlan: plan(), prepareScope: 'all' } };
    const props = await mount({ syllableReviewSession: session });
    expect(selected()).toEqual(['cat', 'dog']);
    expect(startButtons().length).toBe(2);
    startButtons().forEach((button) => expect(button.disabled, 'Start is unavailable').toBe(true));
    const reasons = all('[data-ws-start-blocked-plan]');
    expect(reasons.length, 'under the wide Start and in the narrow Start bar').toBe(2);
    expect(reasons[0].textContent).toBe('Choose at least one lesson activity before preparing.');
    expect(one('[data-ws-start-bar]').contains(reasons[1])).toBe(true);
    await click(startButtons()[0]);
    expect(props.onStartGame).not.toHaveBeenCalled();
    one('[data-ws-lesson-activities]').scrollIntoView = vi.fn();
    await click(reasons[0]);
    await tick();
    expect(document.activeElement.id).toBe('ws-activity-check-isolation');
    await act(async () => Simulate.change(one('#ws-activity-check-blending'), { target: { checked: true } }));
    expect(all('[data-ws-start-blocked-plan]').length).toBe(0);
    startButtons().forEach((button) => expect(button.disabled).toBe(false));
  });

  it('still blocks when the only ticked activity cannot run (Sound Swap with no checked word)', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeCustom: true, customText: 'zzyx', includeLessonPlan: true, lessonPlan: plan(['manipulation']) } };
    await mount({ syllableReviewSession: session });
    expect(all('[data-ws-start-blocked-plan]').length).toBe(2);
  });
});

describe('2. assessment word count', () => {
  it('a new assessment selects Word Count words, not the whole list', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'assessment' } };
    await mount({ glossaryTerms: glossary(TWENTY), syllableReviewSession: session });
    expect(selected()).toEqual(TWENTY.slice(0, 10).sort());
    await setCount(6);
    expect(selected()).toEqual(TWENTY.slice(0, 6).sort());
  });

  it('a reopened probe keeps its whole authored list', async () => {
    const words = TWENTY.slice(0, 14).map((word) => prepared(word));
    const session = { key: 1, setupDraft: { sessionType: 'assessment' } };
    await mount({ preloadedWords: words, preparedSessionConfig: { fixedForm: true, itemIds: words.map((_, i) => 'segmentation:' + (i + 1)) }, syllableReviewSession: session });
    expect(selected()).toEqual(TWENTY.slice(0, 14).sort());
  });

  it('prepared practice words opened as an assessment follow Word Count', async () => {
    const words = TWENTY.slice(0, 14).map((word) => prepared(word));
    await mount({ preloadedWords: words, preparedSessionConfig: {}, syllableReviewSession: { key: 1, setupDraft: { sessionType: 'assessment' } } });
    expect(selected().length).toBe(10);
  });
});

describe('3. Word Count keeps the teacher\'s own picks', () => {
  it('a removed word stays out and an added word stays in while only the count changes', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    await mount({ glossaryTerms: glossary(TWENTY), syllableReviewSession: session });
    expect(selected()).toEqual(TWENTY.slice(0, 10).sort());
    await click(one('button[aria-label="cub: selected"]'));
    await click(one('button[aria-label="owl: not selected"]'));
    const without = (count) => [...TWENTY.slice(0, count).filter((word) => word !== 'cub'), 'owl'].sort();
    await setCount(11);
    expect(selected(), 'one more automatic word, cub still out, owl still in').toEqual(without(11));
    await setCount(5);
    expect(selected()).toEqual(['ant', 'bee', 'dot', 'elf', 'owl']);
    await setCount(6);
    await setCount(12);
    expect(selected(), 'cub stays out after the slider passed below it').toEqual(without(12));
    await setCount(10);
    expect(selected(), 'back at the first count: exactly what the teacher left').toEqual(without(10));
  });

  it('a word the teacher puts back is no longer held out', async () => {
    await mount({ glossaryTerms: glossary(TWENTY) });
    await click(one('button[aria-label="cub: selected"]'));
    await setCount(11);
    await click(one('button[aria-label="cub: not selected"]'));
    await setCount(12);
    expect(selected()).toEqual(TWENTY.slice(0, 12).sort());
  });

  it('with no manual pick the count still re-picks, and a source change still starts a new automatic pick', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    await mount({ glossaryTerms: glossary(TWENTY), syllableReviewSession: session });
    await setCount(7);
    expect(selected()).toEqual(TWENTY.slice(0, 7).sort());
    await click(one('button[aria-label="cub: selected"]'));
    const customBox = all('input[type="checkbox"]').find((input) => input.closest('label')?.getAttribute('data-help-key') === 'ws_gen_src_custom');
    await act(async () => Simulate.change(customBox, { target: { checked: true } }));
    expect(selected(), 'today\'s behaviour for a source change').toEqual(TWENTY.slice(0, 7).sort());
  });
});

describe('4. strings', () => {
  const hanging = () => vi.fn(() => new Promise(() => {}));
  it('the waiting state has its own Word Sounds wording, through the translation helper', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeCustom: true, customText: 'cat' } };
    await mount({ syllableReviewSession: session, callGemini: hanging() });
    await click(startButtons()[0]);
    expect(container.textContent).toContain('Getting the lesson ready...');
    expect(container.textContent).toContain('Building audio: "cat"');
    expect(container.textContent).not.toContain('status.analyzing');
  });

  it('translated values replace the English for the new keys', async () => {
    const words = { 'word_sounds.preparing_heading': 'PREPARANDO', 'word_sounds.preparing_word': 'AUDIO {word}', 'word_sounds.ai_go': 'IR',
      'word_sounds.family_range_empty': 'SIN PALABRAS {min}-{max}', 'word_sounds.lesson_plan_heading': 'PLAN', 'word_sounds.prepare_lesson_button': 'PREPARAR' };
    const t = (key, params) => { let v = words[key]; if (v == null) return key; Object.keys(params || {}).forEach((p) => { v = v.split('{' + p + '}').join(params[p]); }); return v; };
    window.AlloModules = { WordSoundsPronunciations: { lookup: () => ['1'] } };
    window.WORD_FAMILY_PRESETS = { at: ['cat', 'hat'] };
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeCustom: true, customText: 'cat', includeAI: true, includeFamily: true, selectedFamily: 'at',
      syllableRange: { min: 3, max: 4 } } };
    await mount({ syllableReviewSession: session, t, callGemini: hanging() });
    expect(all('button').some((b) => b.textContent.trim() === 'IR'), 'AI Go button').toBe(true);
    expect(container.textContent).toContain('PLAN');
    if (container.textContent.includes('SIN PALABRAS')) expect(container.textContent).toContain('SIN PALABRAS 3-4');
    const start = all('button').find((b) => b.textContent.trim() === 'PREPARAR');
    await click(start);
    expect(container.textContent).toContain('PREPARANDO');
    expect(container.textContent).toContain('AUDIO cat');
  });

  it('the family range warning is plain English by default', async () => {
    window.AlloModules = { WordSoundsPronunciations: { lookup: () => ['1'] } };
    window.WORD_FAMILY_PRESETS = { at: ['cat', 'hat'] };
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeFamily: true, selectedFamily: 'at', syllableRange: { min: 3, max: 4 } } };
    await mount({ syllableReviewSession: session });
    await tick();
    expect(container.textContent).toContain('No words in this family have 3 to 4 syllables. Change the syllable range or pick another family.');
  });

  it('the syllable recordings alert goes through the helper', () => {
    expect(source).toContain("tf('word_sounds.recordings_blocked', 'Add and review syllable recordings below, use a word from the syllable bank, or deselect: {words}.', { words: unsupportedSyllableWords.join(', ') })");
  });

  it('the saved summary names activities as the setup list does', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeLessonPlan: true, lessonPlan: plan(['orthography', 'spelling_bee', 'read_sentence']) } };
    const props = await mount({ preloadedWords: [prepared('cat'), prepared('dog')], syllableReviewSession: session });
    const label = (id) => one('#ws-activity-label-' + id).textContent;
    expect(label('orthography')).toBe('Sight & Spell');
    await click(startButtons()[0]);
    await until(() => props.onStartGame.mock.calls.length > 0, 'the run finishes');
    const summary = props.onStartGame.mock.calls[0][3];
    expect(summary).toContain(label('orthography') + ' (5-10) → ' + label('spelling_bee') + ' (5-10) → ' + label('read_sentence') + ' (5-10)');
    expect(summary).not.toMatch(/orthography|spelling_bee|spelling bee|read_sentence/);
    IDS.forEach((id) => expect(one('#ws-activity-label-' + id)?.textContent || 'Sound Swap', id).toBeTruthy());
  });
});

describe('5. source wording', () => {
  it('uses the plain names and hides the Glossary row while the glossary is empty', async () => {
    await mount();
    const text = container.textContent;
    expect(text).toContain('My words');
    expect(text).toContain('Words about a topic (AI)');
    expect(text).toContain('Word sources');
    expect(text).toContain('Lesson plan');
    for (const old of ['Custom Manual', 'AI Topic Gen', 'Active Sources', 'Lesson Plan (Advanced)']) expect(text, old).not.toContain(old);
    expect(one('[data-help-key="ws_gen_src_glossary"]'), 'no Glossary row').toBeNull();
    expect(text).not.toContain('Glossary (0)');
  });

  it('shows the Glossary row, ticked, when the glossary has words', async () => {
    await mount({ glossaryTerms: glossary(['sun', 'leaf']) });
    const row = one('[data-help-key="ws_gen_src_glossary"]');
    expect(row.textContent).toContain('Glossary (2)');
    expect(row.querySelector('input').checked).toBe(true);
    expect(selected()).toEqual(['leaf', 'sun']);
  });
});

describe('6. words typed in the sidebar', () => {
  it('start the My words box and tick that source', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    await mount({ initialCustomWords: ['map', ' sat ', 'map', '', 7], syllableReviewSession: session });
    expect(session.setupDraft.customText).toBe('map, sat');
    expect(session.setupDraft.includeCustom).toBe(true);
    expect(one('[data-ws-my-words]').value).toBe('map, sat');
    expect(selected()).toEqual(['map', 'sat']);
  });

  it('never replace what the teacher typed, and are taken once per setup session', async () => {
    const typed = { key: 1, setupDraft: { sessionType: 'practice', includeCustom: true, customText: 'pig' } };
    await mount({ initialCustomWords: ['map', 'sat'], syllableReviewSession: typed });
    expect(typed.setupDraft.customText).toBe('pig');
    await act(async () => root.unmount());
    root = createRoot(container);
    const session = { key: 2, setupDraft: { sessionType: 'practice' } };
    await mount({ initialCustomWords: ['map', 'sat'], syllableReviewSession: session });
    await act(async () => Simulate.change(one('[data-ws-my-words]'), { target: { value: '' } }));
    await act(async () => root.unmount());
    root = createRoot(container);
    await mount({ initialCustomWords: ['map', 'sat', 'tap'], syllableReviewSession: session });
    expect(session.setupDraft.customText, 'cleared by the teacher, not seeded again').toBe('');
  });

  it('are ignored when words are already chosen or prepared, and when the prop is absent or empty', async () => {
    const chosen = { key: 1, selection: new Set(['sun']), setupDraft: { sessionType: 'practice' } };
    await mount({ initialCustomWords: ['map'], glossaryTerms: glossary(['sun', 'leaf']), syllableReviewSession: chosen });
    expect(chosen.setupDraft.customText).toBeUndefined();
    const preparedSession = { key: 2, setupDraft: { sessionType: 'practice' } };
    await mount({ initialCustomWords: ['map'], preloadedWords: [prepared('cat')], syllableReviewSession: preparedSession });
    expect(preparedSession.setupDraft.customText).toBeUndefined();
    for (const value of [undefined, [], null]) {
      const session = { key: 3, setupDraft: { sessionType: 'practice' } };
      await mount({ initialCustomWords: value, syllableReviewSession: session });
      expect(session.setupDraft.customText).toBeUndefined();
      expect(session.setupDraft.includeCustom).toBeUndefined();
    }
  });
});

describe('7. empty state', () => {
  it('offers "Type or paste my words", which ticks My words and focuses its text box', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    await mount({ syllableReviewSession: session });
    const button = one('[data-ws-empty-my-words]');
    expect(button.textContent).toBe('Type or paste my words');
    expect(one('[data-ws-my-words]')).toBeNull();
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    await click(button);
    await tick();
    expect(session.setupDraft.includeCustom).toBe(true);
    expect(document.activeElement).toBe(one('[data-ws-my-words]'));
    expect(scrolled).toHaveBeenCalled();
    scrolled.mockRestore();
  });
});

describe('8. Start, Cancel and the run summary', () => {
  it('says "Prepare lesson" for practice and keeps "Start Activity" for an assessment', async () => {
    await mount({ glossaryTerms: glossary(['sun', 'leaf']) });
    expect(startButtons().map((b) => b.textContent.trim())).toEqual(['Prepare lesson', 'Prepare lesson']);
    await mount({ glossaryTerms: glossary(['sun', 'leaf']), syllableReviewSession: { key: 2, setupDraft: { sessionType: 'assessment' } } });
    expect(startButtons().map((b) => b.textContent.trim())).toEqual(['Start Activity', 'Start Activity']);
  });

  it('Cancel stops the run: the screen is usable again and a late reply starts nothing', async () => {
    let reply;
    const callGemini = vi.fn(() => new Promise((done) => { reply = done; }));
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeCustom: true, customText: 'cat' } };
    const props = await mount({ syllableReviewSession: session, callGemini });
    await click(startButtons()[0]);
    await until(() => callGemini.mock.calls.length > 0, 'the first word is requested');
    const signal = callGemini.mock.calls[0].find((arg) => arg && typeof arg === 'object' && 'aborted' in arg) || callGemini.mock.calls[0].map((arg) => arg && arg.signal).find(Boolean);
    const cancel = one('[data-ws-cancel-preparation]');
    expect(cancel.textContent).toBe('Cancel');
    await click(cancel);
    await tick();
    expect(one('[data-ws-cancel-preparation]'), 'progress is gone').toBeNull();
    expect(one('[data-ws-run-notice]').textContent).toBe('Preparation stopped. Nothing was changed.');
    expect(document.activeElement).toBe(one('[data-ws-run-notice]'));
    if (signal) expect(signal.aborted).toBe(true);
    startButtons().forEach((button) => { expect(button.disabled).toBe(false); expect(button.textContent.trim()).toBe('Prepare lesson'); });
    await act(async () => { reply(JSON.stringify({ word: 'cat', phonemes: ['k', 'a', 't'] })); await new Promise((r) => setTimeout(r, 20)); });
    expect(props.onStartGame, 'the cancelled run never reaches the lesson').not.toHaveBeenCalled();
    expect(session.setupDraft.customText).toBe('cat');
  });

  it('tells the teacher what is missing after a run, and "Try again for the rest" runs it again', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    const callImagen = vi.fn(async () => null);
    const props = await mount({ preloadedWords: [prepared('cat', { image: 'data:image/png;base64,AAAA' }), prepared('dog')], callImagen, syllableReviewSession: session });
    expect(one('[data-ws-run-summary]')).toBeNull();
    await click(startButtons()[0]);
    await until(() => props.onStartGame.mock.calls.length === 1, 'the run finishes');
    await tick();
    const summary = one('[data-ws-run-summary]');
    expect(summary.querySelector('p').textContent).toBe('Audio ready for 0 of 2 words. Pictures ready for 1 of 2.');
    expect(session.setupDraft.lastRunSummary, 'kept with the setup session for the return from Review').toEqual({ words: 2, audioReady: 0, pictures: true, picturesReady: 1 });
    const retry = summary.querySelector('[data-ws-run-retry]');
    expect(retry.textContent).toBe('Try again for the rest');
    await click(retry);
    await until(() => props.onStartGame.mock.calls.length === 2, 'the retry finishes');
  });

  it('leaves pictures out of the sentence when no picture service exists, and says nothing after a complete run', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    const props = await mount({ preloadedWords: [prepared('cat'), prepared('dog')], syllableReviewSession: session });
    await click(startButtons()[0]);
    await until(() => props.onStartGame.mock.calls.length === 1, 'the run finishes');
    await tick();
    expect(one('[data-ws-run-summary] p').textContent).toBe('Audio ready for 0 of 2 words.');
    const coverage = props.onStartGame.mock.calls[0][0][0]._ttsCoverage;
    expect(coverage.wordsWithAudio).toBe(0);
  });
});

describe('9. AI off and assessment settings', () => {
  it('with AI off, the topic source, Image Style and AAC pictures are unavailable and each says why', async () => {
    window.__alloAiUsable = () => false;
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    await mount({ callImagen: vi.fn(), syllableReviewSession: session });
    expect(one('[data-ws-source-ai-off]').textContent).toBe('AI is off here, so this cannot make new words.');
    const topicBox = one('[aria-describedby="ws-source-ai-off"]');
    expect(topicBox.disabled).toBe(true);
    expect(one('[data-ws-image-ai-off]').textContent).toBe('AI pictures are off here, so no new pictures will be made.');
    expect(one('select[aria-label="Image style source"]').disabled).toBe(true);
    const aac = all('input[type="checkbox"]').find((input) => /Prepare AAC symbol images/.test(input.closest('label')?.textContent || ''));
    expect(aac.disabled).toBe(true);
    expect(one('[data-ws-goal-plan]'), 'the planner uses the same flag').toBeNull();
  });

  it('with AI on, nothing is disabled and there are no notes', async () => {
    await mount({ callImagen: vi.fn() });
    expect(one('[data-ws-source-ai-off]')).toBeNull();
    expect(one('[data-ws-image-ai-off]')).toBeNull();
    expect(one('select[aria-label="Image style source"]').disabled).toBe(false);
    const aac = all('input[type="checkbox"]').find((input) => /Prepare AAC symbol images/.test(input.closest('label')?.textContent || ''));
    expect(aac.disabled).toBe(false);
  });

  it('an assessment hides the session length and picture timing settings it ignores, and keeps Word Count', async () => {
    await mount({ glossaryTerms: glossary(['sun']), syllableReviewSession: { key: 1, setupDraft: { sessionType: 'assessment' } } });
    expect(one('[data-help-key="ws_gen_count_slider"]')).toBeTruthy();
    expect(one('[data-help-key="ws_gen_session_slider"]')).toBeNull();
    expect(one('[data-help-key="ws_gen_ortho_slider"]')).toBeNull();
    expect(all('select').some((s) => [...s.options].some((o) => o.value === 'afterCompletion'))).toBe(false);
    expect(one('[data-ws-assessment-settings-note]')).toBeTruthy();
    await mount({ glossaryTerms: glossary(['sun']), syllableReviewSession: { key: 2, setupDraft: { sessionType: 'practice' } } });
    expect(one('[data-help-key="ws_gen_session_slider"]')).toBeTruthy();
    expect(one('[data-help-key="ws_gen_ortho_slider"]')).toBeTruthy();
    expect(one('[data-ws-assessment-settings-note]')).toBeNull();
  });
});
