// @vitest-environment jsdom
// Word Sounds setup, 2026-11-10: one "Add a ready-made list" picker replaces the two syllable bank cards, Word Family and
// Sight Words; the Word Count slider is gone. Ticks follow the sources (typed words: all; each list and the glossary: the
// first ten; a new assessment: ten in all) and the teacher's own ticks always stay. Compound words: the original 64 plus a
// machine-vetted set whose parts resolve to part audio the same way.
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
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const pronunciations = require(resolve('word_sounds_pronunciations.js'));
const core = new Function('pronunciations', coreSource + ';return createWordSoundsCore({pronunciations});')(pronunciations);

// The real preset data, as the app's data module defines it.
const data = readFileSync('allo_data_source.jsx', 'utf8');
const presetText = data.slice(data.indexOf('const WORD_FAMILY_PRESETS = {'), data.indexOf('};', data.indexOf('const SIGHT_WORD_PRESETS = {')) + 2);
const PRESETS = new Function(presetText + '\nreturn { families: WORD_FAMILY_PRESETS, sightWords: SIGHT_WORD_PRESETS };')();

const icons = [...new Set([...source.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map((m) => m[1] || m[2]))]
  .filter((name) => !new RegExp('(?:function|const) ' + name + '\\b').test(source));
const compiled = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const Generator = new Function('React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...icons,
  compiled + '\nreturn WordSoundsGenerator;')(React, () => {}, () => {}, (_t, key) => key, () => {}, ...icons.map(() => () => null));

let root, container;
const mount = async (extra = {}) => {
  const props = { glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false, wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => key,
    selectedVoice: 'Kore', ttsSpeed: 1, onStartGame: vi.fn(), callGemini: vi.fn(async () => '{}'),
    syllableReviewSession: { key: 1, setupDraft: { sessionType: 'practice' } }, ...extra };
  await act(async () => root.render(React.createElement(Generator, props)));
  return props;
};
const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const all = (selector) => [...container.querySelectorAll(selector)];
const one = (selector) => container.querySelector(selector);
const click = (el) => { expect(el).toBeTruthy(); return act(async () => { el.click(); }); };
const selected = () => all('button[aria-pressed="true"][aria-label$=": selected"]').map((b) => b.getAttribute('aria-label').split(':')[0]);
const gridWords = () => all('button[aria-pressed][aria-label*=": "]').filter((b) => /: (not )?selected$/.test(b.getAttribute('aria-label'))).map((b) => b.getAttribute('aria-label').split(':')[0]);
const picker = () => one('#ws-ready-list-select');
const addList = async (id) => {
  await act(async () => Simulate.change(picker(), { target: { value: id } }));
  await click(one('[data-ws-ready-list-add]'));
  await tick();
};
const chip = (id) => one('[data-ws-ready-list="' + id + '"]');
const progress = (id) => chip(id).querySelector('[data-ws-ready-list-progress]').textContent;
const typeWords = async (value) => {
  const box = all('input[type="checkbox"]').find((input) => input.closest('label')?.getAttribute('data-help-key') === 'ws_gen_src_custom');
  if (!box.checked) await act(async () => Simulate.change(box, { target: { checked: true } }));
  await act(async () => Simulate.change(one('[data-ws-my-words]'), { target: { value } }));
};
const AT = 'family:Short A (-at)', AN = 'family:Short A (-an)';

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  window.AlloModules = { WordSoundsPronunciations: pronunciations };
  window.WORD_FAMILY_PRESETS = PRESETS.families; window.SIGHT_WORD_PRESETS = PRESETS.sightWords;
  delete window.__alloAiUsable;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe('the list catalogue', () => {
  const groups = core.readyMadeListGroups({ ...PRESETS, language: 'English' });
  const group = (id) => groups.find((entry) => entry.id === id);
  it('files every existing preset under an honest group name', () => {
    expect(groups.map((entry) => [entry.label, entry.lists.length])).toEqual([['Rhyming families', 21], ['Digraphs', 3], ['Blends', 5], ['Sight words', 7], ['Compound and longer words', 2]]);
    expect(group('rhyme').lists.map((list) => list.label).slice(0, 3)).toEqual(['-at (short a)', '-an (short a)', '-am (short a)']);
    expect(group('digraph').lists.map((list) => list.label)).toEqual(['ch', 'sh', 'th']);
    expect(group('blend').lists.map((list) => list.label)).toEqual(['bl', 'br', 'cr', 'dr', 'gr']);
    group('digraph').lists.forEach((list) => list.words.forEach((word) => expect(word.startsWith(list.label), word).toBe(true)));
    group('blend').lists.forEach((list) => list.words.forEach((word) => expect(word.startsWith(list.label), word).toBe(true)));
    // Every preset is offered exactly once, with its own words.
    const offered = groups.flatMap((entry) => entry.lists).filter((list) => /^(family|sight):/.test(list.id));
    expect(offered.length).toBe(Object.keys(PRESETS.families).length + Object.keys(PRESETS.sightWords).length);
    offered.forEach((list) => {
      const [kind, name] = [list.id.slice(0, list.id.indexOf(':')), list.id.slice(list.id.indexOf(':') + 1)];
      expect(list.words, list.id).toEqual([...new Set((kind === 'family' ? PRESETS.families : PRESETS.sightWords)[name])]);
    });
  });

  it('labels the two Fry lists by what they hold: 50 words each', () => {
    const fry = group('sight').lists.filter((list) => /Fry/.test(list.id));
    expect(fry.map((list) => [list.label, list.labelKey, list.words.length])).toEqual([
      ['Fry words 1 to 50', 'word_sounds.list_fry_1_50', 50], ['Fry words 51 to 100', 'word_sounds.list_fry_51_100', 50]]);
    expect(fry[0].words.slice(0, 5)).toEqual(['the', 'of', 'and', 'a', 'to']);
    expect(group('sight').lists.map((list) => list.label)).not.toContain('Fry First 100');
  });

  it('offers the compound and longer-word lists for English only', () => {
    expect(group('syllable').lists.map((list) => [list.id, list.activity, list.words.length])).toEqual([['compound', 'syllable_blending', core.compoundWords().length], ['longer', 'syllable_counting', 37]]);
    const spanish = core.readyMadeListGroups({ ...PRESETS, language: 'Spanish' });
    expect(spanish.map((entry) => entry.id)).toEqual(['rhyme', 'digraph', 'blend', 'sight']);
    expect(core.readyMadeListGroups({}).map((entry) => entry.id), 'no presets loaded yet').toEqual(['syllable']);
  });

  it('every longer word has an agreed dictionary count that matches its written hint', () => {
    core.longerSyllableWords().forEach((word) => {
      const count = core.resolveSyllableCount(word, { language: 'en' });
      expect(count.supported, word).toBe(true);
      expect(count.count, word).toBe(core.syllableRecordingTemplate(word, 'en').syllables.length);
    });
  });
});

describe('compound words', () => {
  const original = core.syllableWords(), vetted = Object.keys(core.SYLLABLE_COMPOUNDS_VETTED);
  it('keeps the original 64 first and unchanged, then the vetted additions', () => {
    expect(original.length).toBe(64);
    expect(original.slice(0, 4)).toEqual(['sunset', 'sunrise', 'sunlight', 'sunshine']);
    expect(core.compoundWords().slice(0, 64)).toEqual(original);
    expect(core.compoundWords().slice(64)).toEqual(vetted);
    expect(vetted.length).toBeGreaterThan(0);
    expect(vetted.filter((word) => original.includes(word))).toEqual([]);
    expect(core.syllableCountWords().length, 'the counting inventory is unchanged').toBe(101);
    expect(coreSource).toMatch(/Machine-vetted; accepted by the owner 2026-11-10/);
  });

  it('every vetted compound resolves to part audio exactly as an original does', () => {
    const bank = JSON.parse(readFileSync('word_audio_kokoro_bank.json', 'utf8')).words;
    const shape = (word) => { const task = core.resolveSyllableTask(word, null, 'en'); return { ...task, targetWord: '', syllables: task.syllables.length, audioUnits: task.audioUnits.map((unit) => Object.keys(unit)) }; };
    const partsReady = (word) => {
      const task = core.resolveSyllableTask(word, null, 'en');
      expect(task.supported, word).toBe(true);
      expect(task.contentStatus, word).toBe('curated_compound');
      expect(task.syllables.join(''), word).toBe(word);
      expect(core.syllableReady(task), word).toBe(true);
      task.audioUnits.forEach((unit, index) => {
        expect(unit, word).toEqual({ key: task.syllables[index], text: task.syllables[index] });
        // The part is a whole word with its own recorded clip, and one syllable in the dictionary.
        expect(bank[unit.text], word + ' part ' + unit.text).toMatch(/^data:audio\//);
        expect([...new Set((pronunciations.lookup(unit.text) || []).map((stress) => stress.length))], word + ' part ' + unit.text).toEqual([1]);
      });
      expect(core.resolveSyllableCount(word, { language: 'en' })).toMatchObject({ supported: true, count: 2, source: 'compound_bank' });
    };
    original.forEach(partsReady);
    vetted.forEach(partsReady);
    vetted.forEach((word) => expect(shape(word), word).toEqual(shape('sunset')));
    // A vetted word needs no recording; an unknown compound and a non-English lesson still do.
    expect(core.resolveSyllableTask('moonlight', null, 'en').supported).toBe(true);
    expect(core.resolveSyllableTask('moonlight', null, 'es').supported).toBe(false);
    expect(core.resolveSyllableTask('rainbow', null, 'en').supported).toBe(false);
  });
});

describe('tick rules (pure)', () => {
  it('typed words all start ticked; a list and the glossary start with ten; a cap limits the total', () => {
    const list = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12'];
    const typed = Array.from({ length: 15 }, (_, i) => 't' + i);
    const sources = [{ id: 'custom', words: typed }, { id: 'x', first: 10, words: list }];
    const preview = [...typed, ...list];
    expect(core.defaultTickedWords(preview, sources, null)).toEqual([...typed, ...list.slice(0, 10)]);
    expect(core.defaultTickedWords(preview, sources, 10)).toEqual(typed.slice(0, 10));
    expect(core.READY_LIST_FIRST).toBe(10);
  });
  it('a merge keeps the teacher\'s ticks, adds only newly offered words and drops words that left the grid', () => {
    const before = core.defaultTickOffers([{ id: 'a', first: 2, words: ['cat', 'hat', 'mat'] }]);
    const after = core.defaultTickOffers([{ id: 'a', first: 2, words: ['cat', 'hat', 'mat'] }, { id: 'b', first: 2, words: ['Cat', 'pig', 'wig'] }]);
    const merged = core.mergeTickedWords(new Set(['hat', 'mat', 'gone']), ['cat', 'hat', 'mat', 'pig', 'wig'], before, after);
    // cat was unticked by the teacher, but list b newly offers it; mat was the teacher's own tick; gone left the grid.
    expect([...merged].sort()).toEqual(['cat', 'hat', 'mat', 'pig']);
    expect([...core.mergeTickedWords(new Set(['hat', 'mat']), ['cat', 'hat', 'mat', 'pig', 'wig'], before, after, 2)].sort(), 'an assessment cap').toEqual(['hat', 'mat']);
  });
});

describe('the picker on the setup screen', () => {
  it('is one labelled select with groups and an Add button, in place of the old cards and the Word Count slider', async () => {
    await mount();
    const text = container.textContent;
    for (const gone of ['Syllable blending word bank', 'Syllable counting word bank', 'Word Family', 'Sight Words', 'Word Count', 'Auto-selects'])
      expect(text, gone).not.toContain(gone);
    expect(one('[data-help-key="ws_gen_count_slider"]')).toBeNull();
    expect(one('label[for="ws-ready-list-select"]').textContent).toBe('Add a ready-made list');
    expect(all('#ws-ready-list-select optgroup').map((node) => [node.label, node.children.length])).toEqual(
      [['Rhyming families', 21], ['Digraphs', 3], ['Blends', 5], ['Sight words', 7], ['Compound and longer words', 2]]);
    expect(all('#ws-ready-list-select option').map((node) => node.textContent)).toEqual(expect.arrayContaining(['-at (short a) (30)', 'ch (30)', 'Fry words 1 to 50 (50)',
      'Compound words (for Syllable Blending) (' + core.compoundWords().length + ')', 'Longer words (for Syllable Claps) (37)']));
    expect(one('[data-ws-ready-list-add]').disabled, 'nothing chosen yet').toBe(true);
    // The source area holds My words, the picker and the AI topic; no Glossary row without a glossary.
    const sources = one('[aria-labelledby="word-sounds-active-sources-label"]');
    expect([...sources.children].filter((node) => !node.id).length).toBe(3);
    expect(all('[data-ws-ready-list]').length).toBe(0);
  });

  it('adding a list ticks its first ten and shows "10 of N"; Add all ticks the rest; Remove takes its words away', async () => {
    await mount();
    await addList(AT);
    const at = PRESETS.families['Short A (-at)'];
    expect(selected()).toEqual(at.slice(0, 10));
    expect(gridWords()).toEqual(at);
    expect(chip(AT).textContent).toContain('-at (short a)');
    expect(progress(AT)).toBe('10 of 30 in the lesson');
    expect(document.activeElement, 'focus returns to the picker').toBe(picker());
    expect(picker().value).toBe('');
    expect([...picker().options].find((option) => option.value === AT).disabled, 'a list is added once').toBe(true);
    expect(one('[data-ws-ready-list-status]').textContent).toBe('Added: -at (short a)');
    const addAll = chip(AT).querySelector('[data-ws-ready-list-add-all]');
    expect(addAll.textContent).toBe('Add all 30');
    expect(addAll.getAttribute('aria-label')).toBe('Add all 30 words: -at (short a)');
    await click(addAll);
    expect(selected()).toEqual(at);
    expect(progress(AT)).toBe('30 of 30 in the lesson');
    expect(chip(AT).querySelector('[data-ws-ready-list-add-all]'), 'nothing left to add').toBeNull();
    const remove = chip(AT).querySelector('[data-ws-ready-list-remove]');
    expect(remove.getAttribute('aria-label')).toBe('Remove list: -at (short a)');
    await click(remove);
    await tick();
    expect(chip(AT)).toBeNull();
    expect(gridWords()).toEqual([]);
    expect(selected()).toEqual([]);
    expect([...picker().options].find((option) => option.value === AT).disabled).toBe(false);
  });

  it('several lists can be added; a word in two sources appears once; the teacher\'s ticks survive', async () => {
    await mount();
    await typeWords('cat zebra');
    expect(selected()).toEqual(['cat', 'zebra']);
    await addList(AT);
    const at = PRESETS.families['Short A (-at)'], an = PRESETS.families['Short A (-an)'];
    expect(gridWords().filter((word) => word === 'cat').length, 'cat is not duplicated').toBe(1);
    expect(gridWords().length).toBe(new Set(['cat', 'zebra', ...at]).size);
    expect(selected().sort()).toEqual([...new Set(['cat', 'zebra', ...at.slice(0, 10)])].sort());
    expect(progress(AT)).toBe('10 of 30 in the lesson');
    // The teacher unticks one list word and ticks a later one, then adds a second list.
    await click(one('button[aria-label="' + at[0] + ': selected"]'));
    await click(one('button[aria-label="' + at[20] + ': not selected"]'));
    await addList(AN);
    expect(all('[data-ws-ready-list]').map((node) => node.getAttribute('data-ws-ready-list'))).toEqual([AT, AN]);
    const want = new Set(['cat', 'zebra', ...at.slice(0, 10), at[20], ...an.slice(0, 10)]); want.delete(at[0]);
    expect(selected().sort()).toEqual([...want].sort());
    expect(progress(AN)).toBe('10 of ' + an.length + ' in the lesson');
    expect(progress(AT)).toBe('10 of 30 in the lesson');
    // Removing the first list keeps the typed words and the second list's ticks.
    await click(chip(AT).querySelector('[data-ws-ready-list-remove]'));
    await tick();
    expect(selected().sort()).toEqual(['cat', 'zebra', ...an.slice(0, 10)].sort());
  });

  it('typed words are all ticked, however many', async () => {
    await mount();
    const typed = Array.from({ length: 23 }, (_, i) => 'w' + String.fromCharCode(97 + i) + 'x');
    await typeWords(typed.join(', '));
    expect(selected()).toEqual(typed);
  });

  it('the compound list adds words Syllable Blending can play without recordings', async () => {
    const IDS = ['isolation', 'blending', 'segmentation', 'orthography', 'rhyming', 'letter_tracing', 'counting', 'mapping', 'sound_sort', 'word_families',
      'word_scramble', 'manipulation', 'syllable_counting', 'syllable_blending', 'spelling_bee', 'missing_letter', 'decoding', 'read_sentence', 'read_passage', 'sentence_match'];
    const lessonPlan = Object.fromEntries(IDS.map((id) => [id, { enabled: id === 'syllable_blending', count: 5 }]));
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeLessonPlan: true, lessonPlan } };
    await mount({ syllableReviewSession: session });
    await addList('compound');
    expect(selected()).toEqual(core.compoundWords().slice(0, 10));
    await click(chip('compound').querySelector('[data-ws-ready-list-add-all]'));
    expect(selected().length).toBe(core.compoundWords().length);
    expect(container.textContent, 'no word needs a recording').not.toMatch(/Add syllable recordings for \d+ word/);
    const start = all('button').filter((b) => b.textContent.trim() === 'Prepare lesson');
    expect(start.length).toBeGreaterThan(0);
    start.forEach((button) => expect(button.disabled).toBe(false));
    // 2026-11-10: a word outside the compound list no longer blocks; Syllable Blending leaves it out and says so.
    await typeWords('cat');
    expect(container.textContent).not.toMatch(/Add syllable recordings for/);
    expect(one('[data-ws-syllable-plan="syllable_blending"] [data-ws-syllable-plan-text]').textContent).toBe('Syllable Blending will use ' + core.compoundWords().length + ' of your words.');
    all('button').filter((b) => b.textContent.trim() === 'Prepare lesson').forEach((button) => expect(button.disabled).toBe(false));
  });

  it('a new assessment stays at ten ticked words when a list is added, with Add all beside the note', async () => {
    await mount({ syllableReviewSession: { key: 1, setupDraft: { sessionType: 'assessment' } } });
    await typeWords('ab ac ad ae af ag');
    await addList(AT);
    const at = PRESETS.families['Short A (-at)'];
    expect(selected()).toEqual(['ab', 'ac', 'ad', 'ae', 'af', 'ag', ...at.slice(0, 4)]);
    expect(one('[data-ws-assessment-cap]').textContent).toContain('first 10 words ticked');
    await click(one('[data-ws-assessment-add-all]'));
    expect(selected().length).toBe(36);
  });
});

describe('drafts from before the picker', () => {
  it('maps the old flags to added lists', () => {
    expect(core.readyListIdsFromDraft({ includeSyllableWords: true })).toEqual(['compound']);
    expect(core.readyListIdsFromDraft({ includeSyllableCountWords: true })).toEqual(['compound', 'longer']);
    expect(core.readyListIdsFromDraft({ includeFamily: true, selectedFamily: 'Blend (bl)', includeSightWords: true, selectedSightWordList: 'Fry First 100', wordCount: 25 }))
      .toEqual(['family:Blend (bl)', 'sight:Fry First 100']);
    expect(core.readyListIdsFromDraft({ includeFamily: true, selectedFamily: '' })).toEqual([]);
    expect(core.readyListIdsFromDraft({ readyLists: ['compound', 'compound', 7], includeSyllableCountWords: true })).toEqual(['compound']);
    expect(core.readyListIdsFromDraft(undefined)).toEqual([]);
  });

  it('a draft with both bank flags, a family, a sight list and Word Count loads and keeps its words', async () => {
    const kept = ['sunset', 'apple', 'cat', 'the', 'responsibility'];
    const session = { key: 1, selection: new Set(kept), setupDraft: { sessionType: 'practice', wordCount: 25, includeSyllableWords: true, includeSyllableCountWords: true,
      includeFamily: true, selectedFamily: 'Short A (-at)', includeSightWords: true, selectedSightWordList: 'Fry First 100', syllableRange: { min: 1, max: 6 } } };
    await mount({ syllableReviewSession: session });
    await tick();
    expect(all('[data-ws-ready-list]').map((node) => node.getAttribute('data-ws-ready-list'))).toEqual(['compound', 'longer', AT, 'sight:Fry First 100']);
    expect(selected().sort()).toEqual([...kept].sort());
    expect(chip('sight:Fry First 100').textContent).toContain('Fry words 1 to 50');
    expect(progress('longer')).toBe('2 of 37 in the lesson');
    // A list that no longer exists is ignored without error.
    const stale = { key: 2, setupDraft: { sessionType: 'practice', includeFamily: true, selectedFamily: 'Not a list', readyLists: ['nope', AT] } };
    await mount({ syllableReviewSession: stale });
    await tick();
    expect(all('[data-ws-ready-list]').map((node) => node.getAttribute('data-ws-ready-list'))).toEqual([AT]);
  });

  it('the lesson handed to the app carries no bank flags or Word Count', async () => {
    const session = { key: 1, setupDraft: { sessionType: 'practice', includeSyllableWords: true, wordCount: 5 } };
    const props = await mount({ syllableReviewSession: session, preloadedWords: [{ word: 'cat', targetWord: 'cat', phonemes: ['k', 'a', 't'] }] });
    await click(all('button').find((b) => b.textContent.trim() === 'Prepare lesson'));
    for (let i = 0; i < 200 && !props.onStartGame.mock.calls.length; i++) await tick();
    expect(props.onStartGame).toHaveBeenCalled();
    const sent = JSON.stringify(props.onStartGame.mock.calls[0], (key, value) => (typeof value === 'string' && value.length > 200 ? '' : value));
    expect(sent).not.toMatch(/includeSyllableWords|includeSyllableCountWords|wordCount|readyLists/);
  });
});

describe('the planner without Word Count', () => {
  const reply = JSON.stringify({ kind: 'change', reply: 'Added two words.', changes: { addWords: ['map', 'sat'], removeWords: ['bat'] } });
  it('is told about the added lists, and Use this adds and removes words', async () => {
    const callGemini = vi.fn(async () => reply);
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    await mount({ syllableReviewSession: session, callGemini });
    await addList(AT);
    const at = PRESETS.families['Short A (-at)'];
    const card = one('[data-ws-goal-plan]');
    await act(async () => Simulate.change(card.querySelector('textarea'), { target: { value: 'add two more words and drop bat' } }));
    await click(card.querySelector('[data-ws-planner-change]'));
    await tick();
    const prompt = callGemini.mock.calls.map((call) => String(call[0])).join('\n');
    expect(prompt).toContain('-at (short a)');
    expect(prompt).not.toMatch(/word bank|Word Count|wordCount/);
    const proposal = card.querySelector('[data-ws-goal-proposal]');
    expect(proposal.querySelector('[data-ws-goal-effect-words]').textContent).toBe('map, sat');
    await click(proposal.querySelector('[data-ws-goal-apply]'));
    await tick();
    expect(session.setupDraft.customText).toBe('map, sat');
    expect(selected().sort()).toEqual(['map', 'sat']);
    expect(gridWords().length, 'the list stays in the grid; sat is already in it').toBe(new Set([...at, 'map', 'sat']).size);
    expect(chip(AT)).toBeTruthy();
  });

  it('keeps the teacher\'s picks when a proposal adds words', async () => {
    const callGemini = vi.fn(async () => reply);
    const session = { key: 1, setupDraft: { sessionType: 'practice' } };
    await mount({ syllableReviewSession: session, callGemini });
    await addList(AT);
    const at = PRESETS.families['Short A (-at)'];
    await click(one('button[aria-label="' + at[15] + ': not selected"]'));
    const card = one('[data-ws-goal-plan]');
    await act(async () => Simulate.change(card.querySelector('textarea'), { target: { value: 'add two more words and drop bat' } }));
    await click(card.querySelector('[data-ws-planner-change]'));
    await tick();
    await click(card.querySelector('[data-ws-goal-apply]'));
    await tick();
    const want = new Set([...at.slice(0, 10), at[15], 'map', 'sat']); want.delete('bat');
    expect(selected().sort()).toEqual([...want].sort());
  });
});
