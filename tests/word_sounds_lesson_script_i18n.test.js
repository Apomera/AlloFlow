// The lesson script's own status text (title, subtitle line, "Before you teach
// this" caveats and the copy-text headings) follows the UI language through
// the host's ts(). The scripted teacher speech stays English on purpose.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const w = (word, phonemes, graphemes, extra) => Object.assign({ word, targetWord: word, phonemes, graphemes, syllables: [word] }, extra || {});
const PACK = [
  w('corn', ['k', 'or', 'n'], ['c', 'or', 'n'], { rhymeWord: 'horn', familyEnding: '-orn' }),
  w('horn', ['h', 'or', 'n'], ['h', 'or', 'n'], { rhymeWord: 'corn', familyEnding: '-orn' }),
];
const SHAKY = [Object.assign(w('yacht', ['y', 'a', 'c', 'h', 't'], null), { _fallbackUsed: true, _phonemeSource: 'estimated' })];
const PLAN = { masteryMode: 'consecutive', masteryThreshold: 3, activities: [{ id: 'counting', count: 2 }], order: ['counting'], totalItems: 2, estimatedMinutes: 2 };
// ts()-shaped: (key, params) -> text, '' on a miss.
const ts = (key, params = {}) => key.startsWith('word_sounds.di_') ? '[' + key.slice(12) + ']' + Object.values(params).map((v) => ' ' + v).join('') : '';

// The English script and copy text from before the strings were made translatable.
const BEFORE = JSON.parse(require('node:fs').readFileSync(resolve(REPO, 'tests/fixtures/word_sounds_lesson_script_english.json'), 'utf8'));
let DI;
beforeAll(() => {
  delete window.AlloWordSoundsDI;
  DI = require(resolve(REPO, DIR, 'word_sounds_di_loader.js'));
});

describe('lesson script status text', () => {
  const build = (loader, words, opts) => loader.buildLessonScript(loader.analyzeWordSet(words, { language: 'en', grade: 'Grade 1' }), PLAN, opts);

  it('takes the title, subtitle and caveats from the translator', () => {
    const script = build(DI, SHAKY, { translate: ts });
    expect(script.title).toBe('[di_script_full_title]');
    expect(script.subtitle).toBe('Grade 1  ·  [di_subtitle_planned] 1 1');
    expect(script.caveats).toContain('[di_caveat_estimated] yacht');
    expect(script.caveats).toContain('[di_caveat_generated]');
    expect(script.caveats.filter((c) => !/^\[di_caveat_(estimated|unaligned|no_pattern|generated)\]/.test(c))).toEqual([]);
    expect(build(DI, PACK, { translate: ts }).caveats).toEqual(['[di_caveat_generated]']);
    const quick = DI.buildLessonScript(DI.analyzeWordSet(PACK, { language: 'en' }), null, { translate: ts });
    expect(quick.subtitle).toBe('[di_subtitle_quick] 2');
  });

  it('leaves the teacher speech, steps and word list untouched', () => {
    const plain = build(DI, SHAKY), translated = build(DI, SHAKY, { translate: ts });
    expect(JSON.stringify(translated.sections)).toBe(JSON.stringify(plain.sections));
    expect(JSON.stringify(translated.wordList)).toBe(JSON.stringify(plain.wordList));
    expect(translated.objective).toBe(plain.objective);
  });

  it('is byte-identical to before when there is no translator or it misses', () => {
    for (const [name, words] of [['PACK', PACK], ['SHAKY', SHAKY]]) {
      for (const opts of [undefined, {}, { translate: () => '' }]) {
        const after = build(DI, words, opts);
        expect(JSON.stringify(after)).toBe(BEFORE[name].script);
        expect(DI.scriptToText(after, opts)).toBe(BEFORE[name].text);
      }
    }
  });

  it('translates the copy-text headings and timing line', () => {
    const script = build(DI, SHAKY, { translate: ts });
    const text = DI.scriptToText(script, { translate: ts });
    for (const line of ['[DI_HEADING_OBJECTIVE]', '[DI_HEADING_MATERIALS]', '[DI_HEADING_WORD_LIST]', '[DI_HEADING_CAVEATS]', '[di_timing] ' + script.estimatedMinutes + ' 3', '  - [di_caveat_estimated] yacht']) {
      expect(text.split('\n'), line).toContain(line);
    }
    expect(text.includes('OBJECTIVE\n'), 'no English heading left').toBe(false);
  });
});

describe('the mounted lesson script panel passes the UI language through', () => {
  let WordSoundsModal, root = null, host = null;
  beforeAll(() => {
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(DIR);
    try { ({ WordSoundsModal } = setupWordSounds()); } finally { cwd.mockRestore(); }
    window.AlloWordSoundsDI = DI;
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    root = null; host = null;
    delete window.alloCopyText;
  });
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const getWordSoundsString = (_t, key, params) => ts(key, params) || key;

  it('shows the translated title and caveats and copies translated headings', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(WordSoundsModal, Object.assign(baseProps('counting'), {
      isTeacherMode: true, isProbeMode: false, wsPreloadedWords: [...PACK, ...SHAKY], wordSoundsLanguage: 'en', lessonPlanConfig: PLAN, getWordSoundsString,
    }))));
    await act(async () => { host.querySelector('#word-sounds-di-script-open').click(); await flush(); });
    expect(host.querySelector('#word-sounds-di-script-title').textContent).toBe('[di_script_full_title]');
    const caveats = [...host.querySelectorAll('#ws-di-print section:last-of-type li')].map((li) => li.textContent);
    expect(caveats).toContain('[di_caveat_generated]');
    expect(caveats.some((c) => c.startsWith('[di_caveat_estimated] '))).toBe(true);
    const copy = vi.fn().mockResolvedValue(true);
    window.alloCopyText = copy;
    const copyButton = [...host.querySelectorAll('button')].find((b) => /^(Copy text|Copy)$/.test(b.textContent.trim()));
    await act(async () => { copyButton.click(); await flush(); });
    expect(copy).toHaveBeenCalledOnce();
    const copied = copy.mock.calls[0][0].split('\n');
    expect(copied[0]).toBe('[di_script_full_title]');
    expect(copied).toContain('[DI_HEADING_CAVEATS]');
  });
});
