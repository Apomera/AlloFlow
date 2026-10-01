import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { core, compileWords } from './helpers/word_sounds_core.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const source = readFileSync('word_sounds_module.js', 'utf8');
const coreSource = readFileSync('word_sounds_core.js', 'utf8').trim();
const embeddedSource = source.replace(/\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/,
  () => '// BEGIN GENERATED WORD SOUNDS CORE\n' + coreSource + '\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE');
const between = (a, b, body = embeddedSource) => {
  const start = body.indexOf(a), end = body.indexOf(b, start + a.length);
  if (start < 0 || end <= start) throw Error('Missing actual-path anchor ' + a);
  return body.slice(start, end);
};
const invalid = {type: 'substitution', instruction: "Say migrate. Now change the m sound to a v sound.", targetPhoneme: 'm', answer: 'vibrate', distractors: ['create', 'relate', 'late']};
const word = (target = 'migrate', extra = {}) => ({...makePackItem(), word: target, targetWord: target, term: target, ...extra});
let React, client, act;
const originalRandom = Math.random, originalNow = Date.now;
const mounts = [];
beforeAll(() => {
  const modules = resolve('desktop/web-app/node_modules');
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({act} = require(resolve(modules, 'react-dom/test-utils')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => {
  for (const item of mounts.splice(0)) { act(() => item.root.unmount()); item.host.remove(); }
  delete window.WordSoundsReviewPanel;
});
afterAll(() => { Math.random = originalRandom; Date.now = originalNow; delete globalThis.IS_REACT_ACT_ENVIRONMENT; });
function mount(View, props) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = client.createRoot(host); const item = {host, root, props}; mounts.push(item);
  item.render = next => { Object.assign(props, next); act(() => root.render(React.createElement(View, props))); };
  item.render({}); return item;
}
function generation(language = 'en', gemini = vi.fn()) {
  const body = between('      const generateManipulationTask =', '      // Stateful wrapper:');
  return new Function('React', 'WS_CORE', 'wordSoundsLanguage', 'callGemini', body + '\nreturn generateManipulationTask;')({useCallback: fn => fn}, core, language, gemini);
}
function manipulationView(body = embeddedSource) {
  return new Function('React', 'WS_CORE', 'Volume2', between('    const ManipulationView =', '    // Syllable', body) + '\nreturn ManipulationView;')(React, core, () => null);
}
function preloadEffect(task, target = 'migrate', language = 'en') {
  const state = {}, lastWordForManipulation = {current: null};
  const body = between('      // Trigger generation whenever the word changes while in manipulation mode.', '      React.useEffect(() => {\n        console.log(');
  new Function('React', 'WS_CORE', 'wordSoundsActivity', 'currentWordSoundsWord', 'wordSoundsPhonemes', 'wordSoundsLanguage', 'lastWordForManipulation', 'manipulationOptions', 'setManipulationState', 'manipulationStateRef', 'setManipulationOptions', 'manipulationOptionsRef', 'fisherYatesShuffle', 'padManipOpts', 'generateManipulationData', body)(
    {useEffect: fn => fn()}, core, 'manipulation', target, {word: target, manipulationTask: task, activityItems: {manipulation: {task, options: ['vibrate', 'late']}}}, language, lastWordForManipulation, [], value => {state.task = value;}, {current: null}, value => {state.options = value;}, {current: []}, values => values, values => values, vi.fn());
  return state;
}

describe('Word Sounds content readiness uses provenance, not schema or spelling guesses', () => {
  it('blocks the migrate/vibrate single-sound counterexample even with AI review assertions', () => {
    for (const supplied of [invalid, {...invalid, teacherReviewed: true, reviewed: true, contentStatus: 'curated'}]) {
      const result = core.resolveManipulationTask('migrate', supplied, 'en');
      expect(result.contentStatus).toBe('teacher_review_required');
      expect(result.answer).toBe(''); expect(result.distractors).toEqual([]);
      expect(core.manipulationReady(result)).toBe(false);
    }
  });
  it.each(['', 'en', 'en-US', 'en_GB'])('retains matching English curated examples with locale %s', language => {
    const task = core.resolveManipulationTask('cat', null, language);
    expect(task.answer).toBe('at'); expect(core.manipulationReady(task)).toBe(true);
    expect(core.resolveManipulationTask('cat', task, language)).toEqual(task);
  });
  it.each(['es', 'enochian', 'fr'])('does not put English curated tasks on other-language boards: %s', language => {
    expect(core.resolveManipulationTask('cat', null, language).contentStatus).toBe('teacher_review_required');
  });
  it('checks changed content again rather than trusting a retained readiness marker', () => {
    const task = core.resolveManipulationTask('cat', null, 'en');
    expect(core.manipulationReady({...task, answer: 'vibrate'})).toBe(false);
    expect(core.manipulationReady({...task, instruction: invalid.instruction})).toBe(false);
    expect(core.manipulationReady({...task, distractors: ['at', 'it']})).toBe(false);
  });
  it('copies curated examples so one teacher edit cannot mutate later items', () => {
    const first = core.resolveManipulationTask('cat', null, 'en'); first.distractors.push('vibrate');
    const next = core.resolveManipulationTask('cat', null, 'en'); expect(next.distractors).not.toContain('vibrate');
  });
  it('treats inherited object-property names as unsupported words without throwing', () => {
    for (const term of ['constructor', '__proto__', 'tostring']) {
      const task = core.resolveManipulationTask(term, null, 'en');
      expect(task.contentStatus).toBe('teacher_review_required');
      expect(task.answer).toBe(''); expect(task.distractors).toEqual([]);
      expect(core.manipulationReady(task)).toBe(false);
    }
  });
  it('on-demand preparation never asks AI to certify a new sound task', async () => {
    const gemini = vi.fn(async () => JSON.stringify(invalid));
    const generate = generation('en', gemini);
    expect((await generate('migrate', ['m','ai','g','r','ay','t'])).contentStatus).toBe('teacher_review_required');
    expect((await generate('cat', ['k','a','t'])).answer).toBe('at');
    expect(gemini).not.toHaveBeenCalled();
  });
  it('compiles unsupported drafts without answer options while preserving editable data and other activities', () => {
    const item = compileWords([word('migrate', {manipulationTask: invalid, sentence: '', story: []})])[0];
    expect(item.manipulationTask).toEqual(invalid);
    expect(item.activityItems.manipulation.options).toEqual([]);
    expect(item.activityItems.manipulation.task.contentStatus).toBe('teacher_review_required');
    expect(item.activityItems.blending.options).toContain('migrate');
    expect(item.activityItems.mapping.graphemes.length).toBeGreaterThan(0);
  });
  it('does not manufacture noun-only sentences, stories or pairs for missing examples', () => {
    const items = compileWords([word('migrate', {sentence: '', story: []}), word('plants', {sentence: '', story: []})]);
    for (const item of items) for (const key of ['read_sentence', 'read_passage', 'sentence_match']) expect(item.activityItems[key]).toBeUndefined();
  });
  it('preserves supplied usable connected text without declaring grammatical validation', () => {
    const item = compileWords([word('migrate', {sentence: 'Birds migrate in fall.', story: [], manipulationTask: invalid}), word('birds'), word('in'), word('fall')])[0];
    expect(item.activityItems.read_sentence.sentence).toBe('Birds migrate in fall.');
    expect(item.sentence).toBe('Birds migrate in fall.');
    expect(item.activityItems.read_sentence.grammarValidated).toBeUndefined();
  });
  it('guards legacy prepared tasks and repeated imports without overwriting the draft', () => {
    const before = structuredClone(invalid);
    for (let n = 0; n < 3; n++) {
      const state = preloadEffect(invalid);
      expect(state.options).toEqual([]); expect(state.task.contentStatus).toBe('teacher_review_required');
    }
    expect(invalid).toEqual(before);
  });
  it('supports a curated legacy task only when its instruction and answer agree with the local example', () => {
    const task = core.resolveManipulationTask('cat', null, 'en');
    expect(preloadEffect(task, 'cat').options).toContain('at');
    expect(preloadEffect({...task, answer: 'vibrate'}, 'cat').options).toEqual([]);
  });
});

describe('Actual play and teacher-review render paths', () => {
  it('shows actionable status and no answer controls for unsupported or altered tasks', () => {
    const View = manipulationView(); const onCheckAnswer = vi.fn();
    const state = preloadEffect(invalid);
    const m = mount(View, {data: {...state.task, options: ['vibrate']}, ts: () => '', onCheckAnswer});
    expect(m.host.querySelector('[role="status"]').textContent).toContain('teacher verifies a one-sound change');
    expect(m.host.querySelectorAll('button').length).toBe(0);
    const curated = core.resolveManipulationTask('cat', null, 'en');
    m.render({data: {...curated, answer: 'vibrate', options: ['vibrate']}});
    expect(m.host.querySelectorAll('button').length).toBe(0); expect(onCheckAnswer).not.toHaveBeenCalled();
  });
  it('a curated board remains playable after returning from a blocked word', () => {
    const View = manipulationView(); const onCheckAnswer = vi.fn();
    const m = mount(View, {data: core.resolveManipulationTask('migrate', invalid, 'en'), ts: () => '', t: () => '', onCheckAnswer, onPlayAudio: vi.fn(async () => {}), speakInstructionWithPhonemes: vi.fn(), showLetterHints: true});
    const task = core.resolveManipulationTask('cat', null, 'en');
    m.render({data: {...task, options: ['at', 'it']}});
    const answer = [...m.host.querySelectorAll('button')].find(button => button.textContent.trim() === 'at');
    expect(answer).toBeTruthy(); act(() => answer.click()); expect(onCheckAnswer).toHaveBeenCalledExactlyOnceWith('at');
  });
  it('the real review adapter retains custom task payload through repeated render', () => {
    const captures = []; window.WordSoundsReviewPanel = props => {captures.push(props.preloadedWords); return React.createElement('div', null, 'Teacher review');};
    const adapter = new Function('React', 'window', between('    const WordSoundsReviewPanel =', '    const loadWordAudioBank =') + '\nreturn WordSoundsReviewPanel;')(React, window);
    const item = compileWords([word('migrate', {manipulationTask: invalid})])[0];
    const m = mount(adapter, {preloadedWords: [item], ts: () => ''}); m.render({preloadedWords: [item]});
    expect(captures).toHaveLength(2); for (const words of captures) expect(words[0].manipulationTask).toEqual(invalid);
  });
  it('the actual grading callback refuses an altered curated answer', () => {
    const body = between('                onCheckAnswer: (ans) => {\n                  if (!WS_CORE.manipulationReady', '                t: t,');
    const checkAnswer = vi.fn();
    const task = core.resolveManipulationTask('cat', null, 'en');
    const handler = new Function('WS_CORE', 'manipulationState', 'checkAnswer', 'return ({' + body + '}).onCheckAnswer;')(core, {...task, answer: 'vibrate'}, checkAnswer);
    handler('vibrate'); expect(checkAnswer).not.toHaveBeenCalled();
  });
  it('fails when the ready-task guard is removed in memory (mutation check)', () => {
    const body = between('                onCheckAnswer: (ans) => {\n                  if (!WS_CORE.manipulationReady', '                t: t,');
    const altered = body.replace('if (!WS_CORE.manipulationReady(manipulationState)) return;', '');
    const task = {...core.resolveManipulationTask('cat', null, 'en'), answer: 'vibrate'};
    const checkAnswer = vi.fn();
    new Function('WS_CORE', 'manipulationState', 'checkAnswer', 'return ({' + altered + '}).onCheckAnswer;')(core, task, checkAnswer)('vibrate');
    expect(checkAnswer).toHaveBeenCalled();
  });
  it('does not prewarm an unsupported instruction or answer from the real task collection block', () => {
    const item = compileWords([word('migrate', {manipulationTask: invalid, sentence: '', story: []})])[0];
    const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
    const body = between('                 const tasks = new Set([word]);', '                 if (boards.read_sentence?.sentence)', setup);
    const added = [];
    const tasks = new Function('word', 'boards', 'WS_CORE', 'addInstructionParts', body + '\nreturn [...tasks];')('migrate', item.activityItems, core, (_tasks, text) => added.push(text));
    expect(tasks).not.toContain('vibrate'); expect(added).toEqual([]);
  });
  it('central grading also guards microphone/direct responses before recording or scoring', () => {
    const body = between('      const checkAnswer = React.useCallback(', '          if (submissionLockRef.current) return;');
    const earlyFunction = body + '        });\nreturn checkAnswer;';
    const debugLog = vi.fn();
    const callback = new Function('React', 'wordSoundsActivity', 'WS_CORE', 'manipulationStateRef', 'debugLog', 'submissionLockRef', earlyFunction)(
      {useCallback: fn => fn}, 'manipulation', core, {current: {...invalid, contentStatus: 'curated', targetWord: 'migrate'}}, debugLog, {current: false});
    callback('correct', 'correct'); expect(debugLog).not.toHaveBeenCalled();
  });
  it('full player exposes an unscored next route, then permits another activity', async () => {
    setupWordSounds();
    delete window.AlloModules.WordSoundsModal;
    new Function(embeddedSource)();
    const Modal = window.AlloModules.WordSoundsModal;
    const item = compileWords([word('migrate', {manipulationTask: invalid, sentence: '', story: [], ttsReady: true})])[0];
    const history = vi.fn(), score = vi.fn(), setActivity = vi.fn();
    const props = {...baseProps('manipulation'), currentWordSoundsWord: 'migrate', wordSoundsPhonemes: item,
      wsPreloadedWords: [item], initialActivitySequence: ['manipulation', 'counting', 'blending', 'read_sentence', 'sentence_match'],
      setWordSoundsActivity: setActivity, setWordSoundsHistory: history, setWordSoundsScore: score,
      callGemini: null, callTTS: null, callImagen: null, fetchTTSBytes: null, speakWord: vi.fn(),
      t: () => '', getWordSoundsString: () => ''};
    const m = mount(Modal, props);
    await act(async () => { await Promise.resolve(); });
    expect(m.host.textContent).toContain('This item will not be scored');
    const skip = [...m.host.querySelectorAll('button')].find(button => button.textContent === 'Skip unscored item and continue');
    expect(skip?.type).toBe('button'); act(() => skip.click());
    expect(setActivity).toHaveBeenCalledWith('counting'); expect(history).not.toHaveBeenCalled();
    expect(score.mock.calls.flat().some(value => value?.correct > 0)).toBe(false);
    m.render({wordSoundsActivity: 'counting'});
    expect(m.host.querySelector('[aria-label="Number 1"]')).toBeTruthy();
  });
});
