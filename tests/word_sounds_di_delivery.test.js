// @vitest-environment jsdom
// Word Sounds lesson script, delivery mode (2026-11-08). The script always said "The child works in the app" and listed
// "The device running Word Sounds", which is wrong for a class without a device per child. The teacher now picks how
// students work (in the app, Present to class, on paper, out loud only, mixed); the "Your turn" instruction and the
// materials follow. "In the app" stays the default and gives the same script as before.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act, Simulate } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));
const DI = require(resolve(process.cwd(), 'word_sounds_di_loader.js'));

const PACK = [
  { word: 'corn', targetWord: 'corn', phonemes: ['k', 'or', 'n'], graphemes: ['c', 'or', 'n'], syllables: ['corn'], rhymeWord: 'horn', familyEnding: '-orn' },
  { word: 'horn', targetWord: 'horn', phonemes: ['h', 'or', 'n'], graphemes: ['h', 'or', 'n'], syllables: ['horn'], rhymeWord: 'corn', familyEnding: '-orn' },
  { word: 'fork', targetWord: 'fork', phonemes: ['f', 'or', 'k'], graphemes: ['f', 'or', 'k'], syllables: ['fork'] },
  { word: 'storm', targetWord: 'storm', phonemes: ['s', 't', 'or', 'm'], graphemes: ['s', 't', 'or', 'm'], syllables: ['storm'] },
];
const PLAN = { masteryMode: 'consecutive', masteryThreshold: 3, activities: [{ id: 'counting', count: 2 }, { id: 'mapping', count: 2 }], order: ['counting', 'mapping'], totalItems: 4, estimatedMinutes: 2 };
const build = (delivery, plan = PLAN) => DI.buildLessonScript(DI.analyzeWordSet(PACK, { language: 'en' }), plan, delivery === undefined ? {} : { delivery });
const turns = (script) => script.sections.filter((s) => /^test_/.test(s.id));

describe('the generator', () => {
  it('defaults to the app, unchanged, and ignores an unknown mode', () => {
    expect(JSON.stringify(build('app'))).toBe(JSON.stringify(build()));
    expect(JSON.stringify(build('hologram'))).toBe(JSON.stringify(build()));
    const s = build();
    expect(s.delivery, 'the default adds no field').toBeUndefined();
    expect(s.materials).toContain('The device running Word Sounds, with this pack loaded.');
    for (const t of turns(s)) expect(t.teacherDoes[0]).toBe('The child works in the app. You watch and score, you do not prompt unless there is an error.');
  });
  it.each([
    ['present', /Present to class/, /projector or large screen/],
    ['paper', /printed sheet/, /printed worksheet or sound boxes/],
    ['oral', /answers aloud: no screen or paper/, /No screen or paper/],
    ['mixed', /Use what you have/, /whichever you use/],
  ])('%s: every Your turn block and the materials match', (mode, work, material) => {
    const s = build(mode);
    expect(s.delivery).toBe(mode);
    expect(turns(s).length).toBe(2);
    for (const t of turns(s)) expect(t.teacherDoes[0]).toMatch(work);
    expect(s.materials.some((m) => material.test(m))).toBe(true);
    const text = DI.scriptToText(s);
    if (mode !== 'mixed') expect(text).not.toMatch(/works in the app|device running Word Sounds/);
  });
  it('without a plan, paper and oral do not send the teacher to Quick Practice mode', () => {
    const noPlan = { masteryThreshold: 3, activities: [] };
    expect(build('app', noPlan).materials).toContain('Quick Practice mode.');
    for (const mode of ['paper', 'oral']) {
      expect(build(mode, noPlan).materials).not.toContain('Quick Practice mode.');
      expect(build(mode, noPlan).materials).toContain('The words in the word list, in order.');
    }
  });
  it('lists the five modes', () => {
    expect(DI.DELIVERY_MODES).toEqual(['app', 'present', 'paper', 'oral', 'mixed']);
  });
});

describe('the script panel', () => {
  let WordSoundsModal, container, root;
  beforeAll(() => {
    WordSoundsModal = setupWordSounds().WordSoundsModal;
    window.AlloWordSoundsDI = DI;
  });
  afterEach(() => {
    if (root) act(() => { root.unmount(); });
    if (container) container.remove();
    try { window.localStorage.removeItem('allo_ws_di_delivery'); } catch (_) {}
  });
  const open = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
    act(() => { root.render(React.createElement(WordSoundsModal, Object.assign(baseProps('counting'), {
      isTeacherMode: true, isProbeMode: false, wsPreloadedWords: PACK, lessonPlanConfig: PLAN, wordSoundsLanguage: 'en' }))); });
    const btn = container.querySelector('[aria-label="Open the lesson script"]');
    act(() => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    return container.querySelector('[data-ws-di-delivery]');
  };
  it('offers the choice outside the printed sheet and rewrites the script when it changes', () => {
    const select = open();
    expect(select).toBeTruthy();
    expect(select.closest('#ws-di-print'), 'the control does not print').toBeNull();
    expect(select.closest('label').textContent).toContain('Students work');
    expect([...select.options].map((o) => o.textContent)).toEqual(['In the app', 'With Present to class', 'On paper', 'Out loud only', 'Mixed']);
    expect(select.value).toBe('app');
    const sheet = () => container.querySelector('#ws-di-print').textContent;
    expect(sheet()).toContain('The child works in the app.');
    act(() => { Simulate.change(select, { target: { value: 'paper' } }); });
    expect(container.querySelector('[data-ws-di-delivery]').value).toBe('paper');
    expect(sheet()).not.toContain('The child works in the app.');
    expect(sheet()).toContain('The child answers on the printed sheet.');
    expect(sheet()).toContain('a pencil, and counters for the sound boxes');
    expect(window.localStorage.getItem('allo_ws_di_delivery')).toBe('paper');
  });
  it('opens with the remembered choice', () => {
    window.localStorage.setItem('allo_ws_di_delivery', 'oral');
    const select = open();
    expect(select.value).toBe('oral');
    expect(container.querySelector('#ws-di-print').textContent).toContain('Read each item aloud.');
  });
});
