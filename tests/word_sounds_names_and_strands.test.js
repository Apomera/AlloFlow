// @vitest-environment jsdom
// Word Sounds, 2026-11-09: one name per activity and six skill strands.
// The player's activity names (word_sounds.activity_<id>) are the only names a teacher or child reads:
// setup rows, the planner preview, the check-skill list, the lesson script, the player tabs, the print
// pickers and the take-home list all resolve the same key, with the English in the core table as fallback.
// The six strands (core table, teaching order) are the one grouping.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { loadModal, mount as mountPlayer, unmountAll, click, settle, makeHatItem } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const IDS = ['counting', 'isolation', 'blending', 'segmentation', 'rhyming', 'manipulation', 'syllable_blending', 'syllable_counting', 'orthography', 'mapping',
  'spelling_bee', 'word_scramble', 'missing_letter', 'sound_sort', 'letter_tracing', 'word_families', 'decoding', 'read_sentence', 'read_passage', 'sentence_match'];
const STRANDS = ['syllables_rhyme', 'hearing_sounds', 'letters_sounds', 'spelling', 'reading_words', 'reading_sentences'];
const STRAND_NAMES = ['Syllables and rhyme', 'Hearing sounds', 'Letters and sounds', 'Spelling', 'Reading words', 'Reading sentences'];
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
// A marker translation: a surface that shows it reads the player key, not a table of its own.
const marker = (id) => 'NAME<' + id + '>';
const markerLookup = (key) => (/^word_sounds\.activity_/.test(key) && IDS.includes(key.slice(21)) ? marker(key.slice(21)) : '');

describe('the core table', () => {
  it('covers the 20 activities exactly once, each in one of the six strands', () => {
    expect(core.activityIds().slice().sort()).toEqual(IDS.slice().sort());
    expect(core.strandOrder()).toEqual(STRANDS);
    IDS.forEach((id) => {
      expect(STRANDS, id).toContain(core.activityStrand(id));
      expect(core.activityBig5(id).length, id).toBeGreaterThan(0);
      core.activityBig5(id).forEach((tag) => expect(Object.keys(core.BIG5_NAMES), id).toContain(tag));
      expect(core.activitySkillLabel(id), id).toMatch(/^[A-Z][^.]{10,70}$/);
    });
    const grouped = core.groupActivitiesByStrand(IDS);
    expect(grouped.map((g) => g.strand)).toEqual(STRANDS);
    expect(grouped.flatMap((g) => g.ids).sort()).toEqual(IDS.slice().sort());
    expect(STRANDS.map((key) => core.strandLabel(key))).toEqual(STRAND_NAMES);
  });
  it('keeps the given order inside a strand and puts unknown ids last', () => {
    expect(core.groupActivitiesByStrand(['decoding', 'blending', 'nope', 'rhyming', 'counting'])).toEqual([
      { strand: 'syllables_rhyme', ids: ['rhyming'] }, { strand: 'hearing_sounds', ids: ['blending', 'counting'] },
      { strand: 'reading_words', ids: ['decoding'] }, { strand: '', ids: ['nope'] }]);
  });
  it('uses the player strings as its English names', () => {
    IDS.forEach((id) => expect(core.activityEnglishName(id), id).toBe(english['activity_' + id]));
  });
  it('reads the translation first and falls back to English on a miss or a raw key', () => {
    expect(core.activityLabel('blending', markerLookup)).toBe(marker('blending'));
    expect(core.activityLabel('blending', (key) => key)).toBe('Blend Sounds');
    expect(core.activityLabel('blending', () => '')).toBe('Blend Sounds');
    expect(core.activityLabel('blending')).toBe('Blend Sounds');
    expect(core.activityLabel('new_thing')).toBe('New thing');
    expect(core.strandLabel('spelling', (key) => (key === 'word_sounds.strand_spelling' ? 'Ortografía' : ''))).toBe('Ortografía');
    // Owner decisions 2026-11-10: syllables and rhyme are phonological awareness; reading sentences shows comprehension only.
    expect(core.strandBig5Label('reading_sentences')).toBe('comprehension');
    expect(core.strandBig5Label('syllables_rhyme')).toBe('phonological awareness');
    expect(core.strandBig5Label('hearing_sounds')).toBe('phonemic awareness');
    expect(core.BIG5_NAMES.phonological_awareness).toBe('phonological awareness');
    expect(core.big5Label('phonological_awareness', (key) => (key === 'word_sounds.big5_phonological_awareness' ? 'conciencia fonológica' : ''))).toBe('conciencia fonológica');
    expect(['rhyming', 'syllable_counting', 'syllable_blending', 'word_families'].map((id) => core.activityBig5(id).join())).toEqual(Array(4).fill('phonological_awareness'));
    expect(['read_sentence', 'sentence_match', 'read_passage'].map((id) => core.activityBig5(id).join())).toEqual(Array(3).fill('comprehension'));
  });
  it('is the copy embedded in the module, the setup source and the script loader', () => {
    expect(() => execFileSync(process.execPath, ['dev-tools/sync_word_sounds_core.cjs', '--check'], { stdio: 'pipe' })).not.toThrow();
  });
  it('agrees with the recommended lesson order: sorting by it never splits a strand', () => {
    const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
    const order = JSON.parse('[' + setup.match(/const WS_RECOMMENDED_LESSON_ORDER = \[([^\]]+)\]/)[1].replace(/'/g, '"') + ']');
    expect(order.slice().sort()).toEqual(IDS.slice().sort());
    expect(core.groupActivitiesByStrand(order).flatMap((g) => g.ids)).toEqual(order);
  });
});

describe('no second name table, and no "Studio"', () => {
  const files = ['word_sounds_module.js', 'word_sounds_setup_module.js', 'word_sounds_di_loader.js', 'view_word_sounds_preview_module.js'];
  it('"Word Sounds Studio" is in no string of the built modules', () => {
    files.forEach((file) => {
      const code = readFileSync(file, 'utf8').split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
      expect(code.includes('Word Sounds Studio'), file).toBe(false);
    });
  });
  it('the old tables and the keys that never existed are gone', () => {
    const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8'), player = readFileSync('word_sounds_module.js', 'utf8');
    expect(setup).not.toMatch(/WS_SETUP_ACTIVITY_LABELS|word_sounds\.act_/);
    expect(player).not.toMatch(/ACTIVITY_GROUP_(OF|ORDER|LABELS|FULL)/);
    // the saved summary names activities through the same helper
    expect(setup).toMatch(/Assessment · \$\{wsActivityName\(probeActivitySel\)\} probe/);
    expect(setup).toMatch(/enabledActivities\.map\(a => `\$\{wsActivityName\(a\.id\)\} \(/);
  });
});

describe('the lesson script', () => {
  const DI = require(resolve('word_sounds_di_loader.js'));
  const w = (word, phonemes) => ({ word, targetWord: word, phonemes, graphemes: phonemes });
  const words = [w('cat', ['k', 'a', 't']), w('map', ['m', 'a', 'p']), w('sun', ['s', 'u', 'n'])];
  const plan = { masteryThreshold: 3, activities: IDS.map((id) => ({ id, count: 2 })) };
  it('titles each block with the player name and the six-strand name', () => {
    const analysis = DI.analyzeWordSet(words, { language: 'en', grade: 'Grade 1' });
    const marked = DI.buildLessonScript(analysis, plan, { translate: markerLookup }).sections.filter((s) => /^test_/.test(s.id));
    expect(marked.map((s) => s.title)).toEqual(IDS.map((id, i) => 'Your turn ' + (i + 1) + '. ' + marker(id)));
    const plainScript = DI.buildLessonScript(analysis, plan).sections.filter((s) => /^test_/.test(s.id));
    expect(plainScript.map((s) => s.title.replace(/^Your turn \d+\. /, ''))).toEqual(IDS.map((id) => english['activity_' + id]));
    expect(plainScript.map((s) => s.strand)).toEqual(IDS.map((id) => core.strandLabel(core.activityStrand(id))));
    expect(DI.activityName('isolation', null)).toBe('Find Sounds');
  });
});

describe('setup', () => {
  const source = readFileSync('word_sounds_setup_source.jsx', 'utf8').replace(/\r\n/g, '\n');
  const icons = [...new Set([...source.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map((m) => m[1] || m[2]))]
    .filter((name) => !new RegExp('(?:function|const) ' + name + '\\b').test(source));
  const compiled = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
  const Generator = new Function('React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...icons,
    compiled + '\nreturn WordSoundsGenerator;')(React, () => {}, () => {}, (_t, key) => markerLookup(key) || key, () => {}, ...icons.map(() => () => null));
  let root, container;
  const mount = async (setupDraft, extra = {}) => {
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    const props = { glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false, wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => markerLookup(key) || key,
      selectedVoice: 'Kore', ttsSpeed: 1, callTTS: vi.fn(), onStartGame: vi.fn(), callGemini: vi.fn(async () => JSON.stringify({ kind: 'change', reply: 'Done.', changes: { enable: ['blending', 'segmentation'] } })),
      syllableReviewSession: { key: 1, setupDraft }, ...extra };
    await act(async () => root.render(React.createElement(Generator, props)));
  };
  afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; });
  const rows = () => [...container.querySelectorAll('[data-ws-lesson-activities] [data-ws-lesson-activity]')];
  // 2026-11-10 (plan first): the activity list is the editor behind "Change activities".
  const openEditor = () => act(async () => { container.querySelector('[data-ws-change-activities]').click(); });

  it('lists every activity under its strand, in teaching order, with the player name and the one-line skill', async () => {
    await mount({ sessionType: 'practice', includeCustom: true, customText: 'cat dog', includeLessonPlan: true });
    await openEditor();
    const list = container.querySelector('[data-ws-lesson-activities]');
    const headings = [...list.querySelectorAll('[data-ws-lesson-strand]')];
    expect(headings.map((h) => h.getAttribute('data-ws-lesson-strand'))).toEqual(STRANDS);
    expect(headings.map((h) => h.textContent.trim())).toEqual(['Syllables and rhyme · phonological awareness', 'Hearing sounds · phonemic awareness', 'Letters and sounds · phonics',
      'Spelling · phonics', 'Reading words · phonics', 'Reading sentences · comprehension']);
    // Sound Swap is hidden until a word has a checked one-sound change; the other 19 are there.
    const shown = rows().map((row) => row.getAttribute('data-ws-lesson-activity'));
    expect(shown.slice().sort()).toEqual(IDS.filter((id) => id !== 'manipulation').sort());
    rows().forEach((row) => {
      const id = row.getAttribute('data-ws-lesson-activity');
      expect(row.querySelector('#ws-activity-label-' + id).textContent, id).toBe(marker(id));
      const skill = row.querySelector('[data-ws-activity-skill]');
      expect(skill.textContent, id).toBe(core.activitySkillLabel(id));
      expect(row.querySelector('#ws-activity-check-' + id).getAttribute('aria-describedby'), id).toBe(skill.id);
      expect(row.querySelector('[aria-label="Move ' + marker(id) + ' up"]'), id).toBeTruthy();
    });
    // each row sits after its own strand heading and before the next one
    const sequence = [...list.querySelectorAll('[data-ws-lesson-strand],[data-ws-lesson-activity]')];
    let current = '';
    sequence.forEach((node) => {
      if (node.hasAttribute('data-ws-lesson-strand')) current = node.getAttribute('data-ws-lesson-strand');
      else expect(core.activityStrand(node.getAttribute('data-ws-lesson-activity'))).toBe(current);
    });
  });

  it('a saved order that crosses strands keeps its order: the heading follows the rows, it does not move them', async () => {
    const order = ['blending', 'rhyming', 'segmentation', ...IDS.filter((id) => !['blending', 'rhyming', 'segmentation'].includes(id))];
    await mount({ sessionType: 'practice', includeCustom: true, customText: 'cat dog', includeLessonPlan: true, lessonPlanOrder: order });
    await openEditor();
    expect(rows().slice(0, 3).map((row) => row.getAttribute('data-ws-lesson-activity'))).toEqual(['blending', 'rhyming', 'segmentation']);
    const list = container.querySelector('[data-ws-lesson-activities]');
    expect([...list.querySelectorAll('[data-ws-lesson-strand]')].slice(0, 3).map((h) => h.getAttribute('data-ws-lesson-strand'))).toEqual(['hearing_sounds', 'syllables_rhyme', 'hearing_sounds']);
  });

  it('the planner preview uses the same names', async () => {
    await mount({ sessionType: 'practice', includeCustom: true, customText: 'cat dog', includeLessonPlan: true });
    const card = container.querySelector('[data-ws-goal-plan]');
    await act(async () => Simulate.change(card.querySelector('textarea'), { target: { value: 'blend and segment' } }));
    await act(async () => { card.querySelector('[data-ws-planner-change]').click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const names = [...card.querySelectorAll('[data-ws-goal-effect-activities] li')].map((li) => li.textContent.split(':')[0]);
    expect(names.length).toBeGreaterThan(0);
    names.forEach((name) => expect(name).toMatch(/^NAME<[a-z_]+>$/));
    expect(names).toContain(marker('blending'));
  });

  it('the check-skill list and its heading use the same names', async () => {
    await mount({ sessionType: 'assessment' });
    const select = [...container.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'syllable_counting') && [...s.options].some((o) => o.value === 'segmentation'));
    expect([...select.options].map((o) => o.textContent)).toEqual([...select.options].map((o) => marker(o.value)));
    expect([...select.options].map((o) => o.value).sort()).toEqual(['blending', 'counting', 'isolation', 'rhyming', 'segmentation', 'syllable_blending', 'syllable_counting']);
  });
});

describe('the player', () => {
  beforeAll(() => { loadModal(); });
  afterEach(() => { unmountAll(); vi.restoreAllMocks(); delete window.AlloWordSoundsTakeHome; });
  const teacher = { isTeacherMode: true, allowRuntimeAi: true, callGemini: async () => '', callTTS: async () => null };

  it('groups the activity tabs under the six strands, in order, with the player names', async () => {
    const { host } = await mountPlayer({ ...teacher, orthoSessionGoal: 5, words: [makePackItem(), makeHatItem()] });
    const headings = [...host.querySelectorAll('[data-ws-strand]')];
    expect(headings.map((h) => h.getAttribute('data-ws-strand'))).toEqual(STRANDS);
    expect(headings.map((h) => h.textContent)).toEqual(STRAND_NAMES);
    const bar = headings[0].parentElement;
    const tabText = [...bar.querySelectorAll('button')].map((b) => b.textContent);
    IDS.filter((id) => id !== 'manipulation').forEach((id) => expect(tabText.some((text) => text.endsWith(english['activity_' + id])), id).toBe(true));
    // a tab sits after its own strand heading
    let current = '';
    [...bar.children].forEach((node) => {
      if (node.hasAttribute('data-ws-strand')) { current = node.getAttribute('data-ws-strand'); return; }
      const id = IDS.find((x) => node.tagName === 'BUTTON' && node.textContent.endsWith(english['activity_' + x]));
      if (id) expect(core.activityStrand(id), id).toBe(current);
    });
    expect(host.textContent).not.toMatch(/phonemic awareness|phonics/i);
  });

  it('groups the print pickers by strand and names the activities the same way', async () => {
    const { host } = await mountPlayer({ ...teacher, orthoSessionGoal: 5, words: [makePackItem(), makeHatItem()] });
    await click(host.querySelector('[data-ws-share-open]'));
    await click(host.querySelector('[data-ws-print-open]'));
    await settle(10);
    const dialog = host.querySelector('[data-ws-print-dialog]');
    const select = dialog.querySelector('[data-ws-print-activity]');
    const groups = [...select.querySelectorAll('optgroup')];
    expect(groups.length).toBeGreaterThan(1);
    const keys = groups.map((g) => g.getAttribute('data-ws-print-strand'));
    expect(keys).toEqual(STRANDS.filter((key) => keys.includes(key)));
    groups.forEach((g) => {
      expect(g.label).toBe(core.strandLabel(g.getAttribute('data-ws-print-strand')));
      [...g.querySelectorAll('option')].forEach((o) => {
        expect(o.textContent, o.value).toBe(english['activity_' + o.value]);
        expect(core.activityStrand(o.value), o.value).toBe(g.getAttribute('data-ws-print-strand'));
      });
    });
    const reviewHeads = [...dialog.querySelectorAll('[data-ws-print-review-strand]')].map((h) => h.getAttribute('data-ws-print-review-strand'));
    expect(reviewHeads).toEqual(keys);
    [...dialog.querySelectorAll('[data-ws-print-review]')].forEach((box) => expect(box.parentElement.textContent).toBe(english['activity_' + box.getAttribute('data-ws-print-review')]));
  });

  it('groups the take-home list by strand and names the activities the same way', async () => {
    new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
    const { host } = await mountPlayer({ ...teacher, wordSoundsLanguage: 'en', words: [makePackItem(), makeHatItem()] });
    await click(host.querySelector('[data-ws-share-open]'));
    await click(host.querySelector('[data-ws-take-home-open]'));
    await settle(60);
    const dialog = host.querySelector('[data-ws-take-home-dialog]');
    const boxes = [...dialog.querySelectorAll('[data-ws-take-home-activity]')];
    expect(boxes.length).toBeGreaterThan(5);
    boxes.forEach((box) => {
      const id = box.getAttribute('data-ws-take-home-activity');
      expect(box.parentElement.textContent.startsWith(english['activity_' + id]), id).toBe(true);
    });
    const heads = [...dialog.querySelectorAll('[data-ws-take-home-strand]')];
    const keys = heads.map((h) => h.getAttribute('data-ws-take-home-strand'));
    expect(keys).toEqual(STRANDS.filter((key) => keys.includes(key)));
    expect(heads.map((h) => h.textContent)).toEqual(keys.map((key) => core.strandLabel(key)));
    let current = '';
    [...heads[0].parentElement.children].forEach((node) => {
      if (node.hasAttribute('data-ws-take-home-strand')) { current = node.getAttribute('data-ws-take-home-strand'); return; }
      const box = node.querySelector('[data-ws-take-home-activity]');
      if (box) expect(core.activityStrand(box.getAttribute('data-ws-take-home-activity'))).toBe(current);
    });
  });
});
