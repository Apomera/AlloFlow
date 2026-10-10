/* Exercises production Word Sounds voice target selectors, ownership hooks,
 * transcript handling, overlay and mode controls. Recognition is simulated;
 * this verifies application behavior, not speech-to-text accuracy. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_REPO || path.resolve(__dirname, '..');
const sourceArg = process.argv.find(value => value.startsWith('--source='));
const source = fs.readFileSync(sourceArg ? path.resolve(sourceArg.slice(9)) : path.join(repo, 'word_sounds_module.js'), 'utf8');
function between(first, last) {
  const start = source.indexOf(first), end = source.indexOf(last, start + first.length);
  assert.ok(start >= 0 && end > start, 'Production extraction markers: ' + first);
  return source.slice(start, end);
}
const selectors = between('      const packForCurrentWord =', '      // BEGIN WORD SOUNDS MICROPHONE ANSWERS');
const targets = between('// BEGIN WORD SOUNDS MICROPHONE ANSWERS', '// END WORD SOUNDS MICROPHONE ANSWERS');
const lifecycle = between('// BEGIN WORD SOUNDS MICROPHONE LIFECYCLE', '// END WORD SOUNDS MICROPHONE LIFECYCLE');
const handler = between('      const handleMicInput = React.useCallback(', '      // BEGIN WORD SOUNDS MICROPHONE CONTROLS');
const controls = between('// BEGIN WORD SOUNDS MICROPHONE CONTROLS', '// END WORD SOUNDS MICROPHONE CONTROLS');
const homophones = between('    const HOMOPHONE_CLUSTERS =', '    // Rhyme Time variety:');
const spellingView = between('          case "spelling_bee": {', '          case "word_scramble": {');
const grading = between('            const safeAnswer = (answer ?? "")', '            // Several activities grade locally');
const grade = new Function('answer', 'expectedAnswer', 'opts', grading + '\nreturn isCorrect;');
const WS_CORE = new Function(fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8') + '\nreturn createWordSoundsCore();')();
const { JSDOM } = require(path.join(repo, 'node_modules/jsdom'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(path.join(repo, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.join(repo, 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(path.join(repo, 'desktop/web-app/node_modules/react-dom/test-utils')).act;
function spellingFixture(inheritedMode, answer = '') {
  const typed = [], checked = [], timers = [], playback = [];
  const env = {
    currentWordSoundsWord: 'cat', wordSoundsScore: { streak: 0 }, wordSoundsFeedback: null, currentStreak: 0,
    useMicInput: inheritedMode, userAnswer: answer, renderPrompt: () => null, ts: () => '', t: key => key,
    handleAudio: word => playback.push(word), checkAnswer: (...args) => checked.push(args),
    setWordSoundsFeedback: () => {}, setUserAnswer: value => typed.push(value),
    isMountedRef: { current: true }, advanceEpochRef: { current: 1 }, setTimeout: fn => timers.push(fn),
    isProbeMode: false, Volume2: () => null,
  };
  const element = new Function('React', ...Object.keys(env), 'switch ("spelling_bee") {\n' + spellingView + '\n}')(
    React, ...Object.values(env));
  const nodes = [];
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    nodes.push(value); visit(value.props?.children);
  }
  visit(element);
  return { nodes, typed, checked, playback, timers, env };
}
let api, root, props, instances = [], scores = [], grades = [], answers = [], toasts = [], events = [];
class Recognition {
  constructor() { this.starts = 0; this.stops = 0; this.aborts = 0; instances.push(this); }
  start() { this.starts++; events.push('start'); }
  stop() { this.stops++; events.push('stop'); }
  abort() { this.aborts++; events.push('abort'); }
  result(text, isFinal = true) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] }); }
  error(error = 'not-allowed') { this.onerror?.({ error }); }
  end() { this.onend?.(); }
}
const hooks = {
  expose(value) { api = value; }, score(...values) { scores.push(values); grades.push(grade(...values)); }, answer(value) { answers.push(value); },
  toast(...values) { toasts.push(values); }, pause() { events.push('pause'); },
};
const Harness = new Function('React', 'window', 'WS_CORE', 'hooks', `${homophones}
  return function Harness(props) {
    const { currentWordSoundsWord, wordSoundsActivity, wordSoundsLanguage, wordSoundsPhonemes,
      isMinimized, isEditing, showReviewPanel, isProbeMode, isTeacherMode,
      historyLearnerId, configuredSessionId, historyResourceId, isolationState, manipulationState } = props;
    const [useMicInput, setUseMicInput] = React.useState(props.useMicInput);
    const [isListening, setIsListening] = React.useState(false);
    const [userAnswer, setAnswer] = React.useState('');
    const setUserAnswer = value => { hooks.answer(value); setAnswer(value); };
    const recognitionRef = React.useRef(null), isMountedRef = React.useRef(true);
    const activityRegionRef = React.useRef(null);
    const audioRunIdRef = React.useRef(0), advanceEpochRef = React.useRef(0), submissionLockRef = React.useRef(false);
    const isolationStateRef = React.useRef(isolationState), manipulationStateRef = React.useRef(manipulationState);
    isolationStateRef.current = isolationState; manipulationStateRef.current = manipulationState;
    const syllableDataRef = React.useRef(null), syllableDeliveredRef = React.useRef(null);
    const pauseResponseAudio = hooks.pause, setIsPlayingAudio = () => {};
    const wordSoundsSyllableEditorPlayback = { stop() { } };
    const addToast = hooks.toast, ts = () => '', t = () => '', warnLog = () => {}, debugLog = () => {};
    const Mic = ({ size, ...attrs }) => React.createElement('span', { ...attrs, 'data-icon': 'microphone' });
    const MicOff = Mic;
    React.useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
    ${selectors}
    ${targets}
    ${lifecycle}
    const checkAnswer = hooks.score;
    ${handler}
    ${controls}
    hooks.expose({ handleMicInput, cancelMicInput, toggleMicInputMode, renderVoiceInputOverlay,
      micAnswerTarget, micAllowsHomophones, hiddenIndex, correctLetter, useMicInput, isListening,
      pendingMicAnswer, pendingMicAnswerRef, confirmMicAnswer, usePointerInput, activityRegionRef,
      recognitionRef, micAttemptRef, audioRunIdRef, advanceEpochRef, submissionLockRef, isMountedRef });
    return React.createElement('div', { ref: activityRegionRef, tabIndex: -1, 'data-activity-region': true },
      renderMicReview(),
      renderVoiceInputOverlay('Speak your answer'),
      props.pointerTextInput && !useMicInput && React.createElement('input', { 'data-pointer-answer': true, 'aria-label': 'Typed answer' }),
      React.createElement('button', { 'data-mode-toggle': true, onClick: toggleMicInputMode }, 'Switch response mode'));
  };`)(React, dom.window, WS_CORE, hooks);
const defaults = {
  currentWordSoundsWord: 'cat', wordSoundsActivity: 'blending', wordSoundsLanguage: 'en-US',
  wordSoundsPhonemes: { word: 'cat', rhymeWord: 'hat' },
  isolationState: { word: 'cat', currentPosition: 0, correctSound: 'k', isoOptions: ['k', 'a', 't'] },
  manipulationState: WS_CORE.resolveManipulationTask('cat', null, 'en'),
  useMicInput: false, isMinimized: false, isEditing: false, showReviewPanel: false, isProbeMode: false, isTeacherMode: false,
  historyLearnerId: 'learner', configuredSessionId: 'session', historyResourceId: 'resource',
};
async function settle(fn = () => {}) { await act(async () => { await fn(); }); }
async function mount(route = 'native', overrides = {}) {
  if (root) await settle(() => root.unmount());
  root = null; instances = []; scores = []; grades = []; answers = []; toasts = []; events = [];
  dom.window.SpeechRecognition = Recognition; delete dom.window.webkitSpeechRecognition;
  if (route === 'shared') dom.window.AlloFlowVoice = {
    initWebSpeechCapture(options) {
      const rec = new Recognition();
      rec.result = (text, isFinal = true) => options.onRichResult?.(isFinal ? { final: text } : { interim: text });
      rec.error = error => options.onError?.({ error });
      rec.end = () => options.onEnd?.();
      return { supported: true, start() { rec.start(); return true; }, stop() { rec.stop(); } };
    },
  };
  else delete dom.window.AlloFlowVoice;
  props = { ...defaults, ...overrides };
  root = createRoot(document.getElementById('root'));
  await settle(() => root.render(React.createElement(Harness, props)));
}
async function rerender(changes) { props = { ...props, ...changes }; await settle(() => root.render(React.createElement(Harness, props))); }
async function start() { await settle(() => api.handleMicInput()); }
const last = () => instances.at(-1);
async function submit(text) { await start(); assert.ok(last(), 'An eligible attempt starts capture'); await settle(() => last().result(text)); }
function reviewButton(label) { return [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label); }
async function confirm() {
  const button = reviewButton('Use this answer'); assert.ok(button, 'Production review offers explicit confirmation');
  await settle(() => button.click());
}
async function submitAndConfirm(text) {
  await submit(text); assert.deepEqual(scores, [], 'Recognition alone cannot score this answer');
  assert.equal(api.isListening, false); assert.ok(api.pendingMicAnswerRef.current, 'A reviewable answer exists');
  assert.match(document.body.textContent, /I heard:/); assert.match(document.body.textContent, /Is that what you said/);
  await confirm(); assert.equal(api.pendingMicAnswerRef.current, null, 'Confirmation consumes ownership');
}
const board = (hiddenIndex, correctLetter, options = ['a', 'e', 't']) => ({ word: 'cat', activityItems: { missing_letter: { hiddenIndex, correctLetter, options } } });
let passed = 0;
async function group(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
async function run() {
  await group('production overlay mounts a labeled start/cancel control, listening state and recognized transcript', async () => {
    await mount();
    assert.match(document.body.textContent, /Speak your answer/);
    let button = document.querySelector('button[aria-pressed]'); assert.ok(button, 'Overlay exposes pressed state');
    assert.equal(button.getAttribute('aria-pressed'), 'false'); assert.ok(button.getAttribute('aria-label'));
    await settle(() => button.click()); assert.equal(api.isListening, true);
    button = document.querySelector('button[aria-pressed]'); assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.match(document.body.textContent, /Listening/i);
    await settle(() => last().result('CAT!'));
    assert.equal(api.isListening, false); assert.match(document.body.textContent, /CAT!/);
    assert.deepEqual(scores, [['correct', 'correct']]);
  });
  await group('changing response mode never opens a recognizer and cancels existing capture before switching', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); assert.equal(api.useMicInput, false);
      await settle(() => api.toggleMicInputMode()); assert.equal(api.useMicInput, true); assert.equal(instances.length, 0);
      await start(); const rec = last(); assert.equal(api.isListening, true);
      await settle(() => api.toggleMicInputMode()); assert.equal(api.useMicInput, false); assert.equal(api.isListening, false);
      assert.equal(rec.stops + rec.aborts, 1); assert.equal(instances.length, 1);
      await settle(() => rec.result('cat')); assert.deepEqual(scores, []); assert.deepEqual(answers, []);
    }
  });
  await group('isolation targets the displayed sound and never accepts the whole anchor word', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route, { wordSoundsActivity: 'isolation' }); assert.equal(api.micAnswerTarget, 'k');
      await submitAndConfirm('k'); assert.deepEqual(scores, [['correct', 'correct']]);
      await mount(route, { wordSoundsActivity: 'isolation' }); await submitAndConfirm('cat');
      assert.deepEqual(grades, [false]);
      await mount(route, { wordSoundsActivity: 'isolation', isolationState: { word: 'cat', currentPosition: 0, correctSound: '/k/' } });
      await submitAndConfirm('k'); assert.deepEqual(scores, [['correct', 'correct']]);
    }
  });
  await group('isolation rejects stale word state and suppresses late results after same-word sound or position changes', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route, { wordSoundsActivity: 'isolation', isolationState: { word: 'dog', correctSound: 'd', currentPosition: 0 } });
      assert.equal(api.micAnswerTarget, ''); await start(); if (last()) await settle(() => last().result('d')); assert.deepEqual(scores, []);
      for (const change of [{ correctSound: 't', currentPosition: 2 }, { correctSound: 'k', currentPosition: 1 }]) {
        await mount(route, { wordSoundsActivity: 'isolation' }); await start(); const rec = last();
        await rerender({ isolationState: { ...defaults.isolationState, ...change } });
        assert.equal(api.isListening, false); await settle(() => rec.result('k')); assert.deepEqual(scores, []);
      }
    }
  });
  await group('Missing Letter uses the displayed prepared slot rather than the whole word', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route, { wordSoundsActivity: 'missing_letter', wordSoundsPhonemes: board(1, 'a') });
      assert.equal(api.micAnswerTarget, 'a'); assert.equal(api.hiddenIndex, 1);
      await submitAndConfirm('A!'); assert.deepEqual(scores, [['correct', 'correct']]);
      await mount(route, { wordSoundsActivity: 'missing_letter', wordSoundsPhonemes: board(1, 'a') }); await submitAndConfirm('cat');
      assert.deepEqual(grades, [false]);
    }
  });
  await group('invalid or stale prepared Missing Letter boards fall back atomically to the displayed word', async () => {
    for (const prepared of [board(20, 'a'), board(1, 'c'), board(1, 'a', ['a', 'a']),
      { ...board(1, 'a'), word: 'dog' }, { word: 'cat' }]) {
      await mount('native', { wordSoundsActivity: 'missing_letter', wordSoundsPhonemes: prepared });
      assert.equal(api.hiddenIndex, 0); assert.equal(api.correctLetter, 'c'); assert.equal(api.micAnswerTarget, 'c');
      await submitAndConfirm('c'); assert.deepEqual(scores, [['correct', 'correct']]);
    }
  });
  await group('same-word Missing Letter answer edits invalidate pending capture', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route, { wordSoundsActivity: 'missing_letter', wordSoundsPhonemes: board(1, 'a') });
      await start(); const rec = last(); await rerender({ wordSoundsPhonemes: board(2, 't') });
      assert.equal(api.micAnswerTarget, 't'); assert.equal(api.isListening, false);
      await settle(() => rec.result('a')); assert.deepEqual(scores, []);
      await submitAndConfirm('t'); assert.deepEqual(scores, [['correct', 'correct']]);
    }
  });
  await group('Sound Swap accepts the reviewed changed word and rejects the unchanged anchor', async () => {
    const task = WS_CORE.resolveManipulationTask('cat', null, 'en');
    assert.equal(WS_CORE.manipulationReady(task), true); assert.notEqual(task.answer, 'cat');
    for (const route of ['native', 'shared']) {
      await mount(route, { wordSoundsActivity: 'manipulation', manipulationState: task });
      assert.equal(api.micAnswerTarget, task.answer); await submit(task.answer); assert.deepEqual(scores, [['correct', 'correct']]);
      await mount(route, { wordSoundsActivity: 'manipulation', manipulationState: task }); await submitAndConfirm('cat');
      assert.deepEqual(grades, [false]);
    }
  });
  await group('Sound Swap will not grade missing, unreviewed, tampered or wrong-word tasks', async () => {
    const task = WS_CORE.resolveManipulationTask('cat', null, 'en');
    for (const state of [null, { ...task, contentStatus: 'teacher_review_required' }, { ...task, answer: 'cat' },
      WS_CORE.resolveManipulationTask('dog', null, 'en')]) {
      await mount('native', { wordSoundsActivity: 'manipulation', manipulationState: state });
      assert.equal(api.micAnswerTarget, ''); await start(); if (last()) await settle(() => last().result('cat')); assert.deepEqual(scores, []);
    }
  });
  await group('scramble requires the actual spelling while oral blending preserves homophone acceptance', async () => {
    for (const route of ['native', 'shared']) for (const activity of ['word_scramble', 'blending']) {
      await mount(route, { currentWordSoundsWord: 'blue', wordSoundsActivity: activity, wordSoundsPhonemes: { word: 'blue' } });
      if (activity === 'blending') await submit('blew'); else await submitAndConfirm('blew');
      assert.deepEqual(grades, [activity === 'blending']);
      await mount(route, { currentWordSoundsWord: 'blue', wordSoundsActivity: activity, wordSoundsPhonemes: { word: 'blue' } });
      await submit('BLUE!'); assert.deepEqual(scores, [['correct', 'correct']]);
    }
  });
  await group('letter and isolated-sound answers do not inherit whole-word homophone aliases', async () => {
    for (const activity of ['missing_letter', 'isolation']) {
      const overrides = { currentWordSoundsWord: 'be', wordSoundsActivity: activity,
        wordSoundsPhonemes: { word: 'be', activityItems: { missing_letter: { hiddenIndex: 0, correctLetter: 'b', options: ['b', 'd', 'p'] } } },
        isolationState: { word: 'be', correctSound: 'b', currentPosition: 0 } };
      await mount('native', overrides); assert.equal(api.micAllowsHomophones, false); await submitAndConfirm('bee');
      assert.deepEqual(grades, [false]);
    }
  });
  await group('strict microphone mismatches cannot become correct through the shared phoneme-equivalence grader', async () => {
    const cases = [
      { activity: 'missing_letter', word: 'key', expected: 'k', transcript: 'ck' },
      { activity: 'missing_letter', word: 'fan', expected: 'f', transcript: 'ph' },
      { activity: 'isolation', word: 'key', expected: 'k', transcript: 'ck' },
      { activity: 'word_scramble', word: 'aw', expected: 'aw', transcript: 'au' },
    ];
    for (const route of ['native', 'shared']) for (const example of cases) {
      await mount(route, { currentWordSoundsWord: example.word, wordSoundsActivity: example.activity,
        wordSoundsPhonemes: { word: example.word, activityItems: { missing_letter: {
          hiddenIndex: 0, correctLetter: example.expected, options: [example.expected, 'd', 'p'],
        } } }, isolationState: { word: example.word, correctSound: example.expected, currentPosition: 0 } });
      assert.equal(api.micAnswerTarget, example.expected); assert.equal(api.micAllowsHomophones, false);
      await submitAndConfirm(example.transcript); assert.deepEqual(grades, [false], example.activity + ': ' + example.transcript);
      assert.deepEqual(answers, [example.transcript], 'Keep the recognized transcript visible');
    }
  });
  await group('rhyming requires a matching prepared word and rejects obsolete rhyme targets', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route, { wordSoundsActivity: 'rhyming' }); assert.equal(api.micAnswerTarget, 'hat');
      await submit('hat'); assert.deepEqual(scores, [['correct', 'correct']]);
      await mount(route, { wordSoundsActivity: 'rhyming', wordSoundsPhonemes: { word: 'dog', rhymeWord: 'log' } });
      assert.equal(api.micAnswerTarget, ''); await start(); if (last()) await settle(() => last().result('log')); assert.deepEqual(scores, []);
    }
  });
  await group('Spelling Bee refuses microphone scoring regardless of inherited response mode', async () => {
    for (const route of ['native', 'shared']) for (const inheritedMode of [false, true]) {
      await mount(route, { wordSoundsActivity: 'spelling_bee', useMicInput: inheritedMode });
      assert.equal(api.micAnswerTarget, ''); await start();
      assert.equal(instances.length, 0); assert.deepEqual(scores, []); assert.equal(api.pendingMicAnswerRef.current, null);
    }
  });
  await group('the actual Spelling Bee view retains keyboard entry, explicit Check and audio prompts with inherited voice mode', async () => {
    for (const inheritedMode of [false, true]) {
      const empty = spellingFixture(inheritedMode);
      const input = empty.nodes.find(node => node.type === 'input'); assert.ok(input, 'Typed answer remains available');
      assert.equal(input.props.spellCheck, false); assert.equal(input.props.autoCorrect, 'off');
      input.props.onChange({ target: { value: 'cat' } }); assert.deepEqual(empty.typed, ['cat']);
      const emptyCheck = empty.nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Check Answer');
      assert.ok(emptyCheck); assert.equal(emptyCheck.props.disabled, true);
      const filled = spellingFixture(inheritedMode, 'cat');
      const check = filled.nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Check Answer');
      assert.equal(check.props.disabled, false); check.props.onClick();
      assert.equal(filled.timers.length, 1); filled.timers.shift()(); assert.deepEqual(filled.checked, [['correct', 'correct']]);
      const audio = filled.nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'common.volume');
      assert.ok(audio); audio.props.onClick(); assert.deepEqual(filled.playback, ['cat']);
    }
  });
  await group('incorrect whole-word recognition waits for confirmation and then grades once', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); await submit('dog');
      assert.deepEqual(scores, []); assert.deepEqual(grades, []); assert.equal(api.isListening, false);
      const pending = api.pendingMicAnswerRef.current; assert.equal(pending.answer, 'dog');
      await confirm(); assert.deepEqual(grades, [false]);
      await settle(() => api.confirmMicAnswer(pending)); assert.deepEqual(grades, [false], 'Duplicate confirmation is ignored');
    }
  });
  await group('retry discards an unscored transcript and a late old confirmation cannot consume the newer answer', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route, { wordSoundsActivity: 'isolation' }); await submit('wrong');
      const oldPending = api.pendingMicAnswerRef.current, oldCapture = last();
      const retry = reviewButton('Try again'); assert.ok(retry); await settle(() => retry.click());
      assert.equal(instances.length, 2); assert.equal(api.pendingMicAnswerRef.current, null); assert.equal(api.isListening, true);
      await settle(() => oldCapture.result('k')); assert.deepEqual(scores, []);
      await settle(() => last().result('k')); const nextPending = api.pendingMicAnswerRef.current;
      assert.ok(nextPending); assert.notEqual(nextPending, oldPending); assert.deepEqual(scores, []);
      await settle(() => api.confirmMicAnswer(oldPending)); assert.deepEqual(scores, []); assert.equal(api.pendingMicAnswerRef.current, nextPending);
      await confirm(); assert.deepEqual(grades, [true]);
    }
  });
  await group('switching to pointer input clears pending speech without grading or opening a recognizer', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route, { useMicInput: true, wordSoundsActivity: 'missing_letter', wordSoundsPhonemes: board(1, 'a') });
      await submit('a'); const pending = api.pendingMicAnswerRef.current;
      const fallback = reviewButton('Use buttons'); assert.ok(fallback); await settle(() => fallback.click());
      assert.equal(api.useMicInput, false); assert.equal(api.pendingMicAnswerRef.current, null); assert.equal(instances.length, 1);
      await settle(() => api.confirmMicAnswer(pending)); assert.deepEqual(scores, []);
    }
    await mount('native', { useMicInput: true, wordSoundsActivity: 'word_scramble' }); await submit('dog');
    assert.ok(reviewButton('Type answer')); await settle(() => reviewButton('Type answer').click()); assert.equal(api.useMicInput, false);
  });
  await group('pending confirmation is invalidated by word, slot, learner, language and activity changes', async () => {
    const changes = [{ currentWordSoundsWord: 'dog' }, { wordSoundsActivity: 'blending' }, { wordSoundsLanguage: 'fr' },
      { historyLearnerId: 'another-learner' }, { configuredSessionId: 'another-session' }, { historyResourceId: 'another-resource' },
      { isMinimized: true }, { isEditing: true }, { showReviewPanel: true },
      { wordSoundsPhonemes: board(2, 't') }];
    for (const change of changes) {
      await mount('native', { wordSoundsActivity: 'missing_letter', wordSoundsPhonemes: board(1, 'a') });
      await submit('a'); const pending = api.pendingMicAnswerRef.current;
      await rerender(change); assert.equal(api.pendingMicAnswerRef.current, null);
      await settle(() => api.confirmMicAnswer(pending)); assert.deepEqual(scores, []);
    }
  });
  await group('run, advance, lock and unmount guards reject pending confirmation before effects can act', async () => {
    for (const ref of ['audioRunIdRef', 'advanceEpochRef', 'submissionLockRef', 'isMountedRef']) {
      await mount('native', { wordSoundsActivity: 'isolation' }); await submit('k'); const pending = api.pendingMicAnswerRef.current;
      api[ref].current = ref === 'submissionLockRef' ? true : ref === 'isMountedRef' ? false : api[ref].current + 1;
      await settle(() => api.confirmMicAnswer(pending)); assert.deepEqual(scores, []);
      api.isMountedRef.current = true;
    }
    await mount('native', { wordSoundsActivity: 'isolation' }); await submit('k');
    const pending = api.pendingMicAnswerRef.current, confirmAfterUnmount = api.confirmMicAnswer;
    await settle(() => root.unmount()); root = null; await settle(() => confirmAfterUnmount(pending)); assert.deepEqual(scores, []);
  });
  await group('microphone failures and silence present recovery without recording an answer', async () => {
    for (const route of ['native', 'shared']) for (const event of ['not-allowed', 'no-speech', 'end']) {
      await mount(route, { useMicInput: true, wordSoundsActivity: 'isolation' }); await start();
      await settle(() => event === 'end' ? last().end() : last().error(event));
      assert.equal(api.isListening, false); assert.deepEqual(scores, []); assert.equal(api.pendingMicAnswerRef.current, null);
      assert.ok(reviewButton('Try again'), 'Offer a visible recovery action'); assert.ok(reviewButton('Use buttons'));
      await settle(() => reviewButton('Use buttons').click()); assert.equal(api.useMicInput, false); assert.deepEqual(scores, []);
    }
  });
  await group('a new review or recovery notice suppresses the previous confirmed transcript', async () => {
    await mount('native', { useMicInput: true, wordSoundsActivity: 'isolation' });
    await submitAndConfirm('old-transcript'); assert.deepEqual(grades, [false]);
    assert.match(document.body.textContent, /old-transcript/);
    await start(); await settle(() => last().result('k'));
    assert.ok(api.pendingMicAnswerRef.current); assert.match(document.body.textContent, /I heard:/);
    assert.doesNotMatch(document.body.textContent, /old-transcript/);
    await settle(() => reviewButton('Try again').click()); await settle(() => last().error('no-speech'));
    assert.doesNotMatch(document.body.textContent, /old-transcript/); assert.ok(reviewButton('Use buttons'));
    assert.deepEqual(grades, [false], 'Further recognition and notices do not score');
  });
  await group('pointer fallback moves focus from the review to the activity or newly rendered text input', async () => {
    await mount('native', { useMicInput: true, wordSoundsActivity: 'missing_letter', wordSoundsPhonemes: board(1, 'a') });
    await submit('a'); assert.equal(document.activeElement?.getAttribute('aria-label'), 'Check what I heard');
    await settle(() => reviewButton('Use buttons').click());
    assert.equal(document.activeElement, api.activityRegionRef.current); assert.deepEqual(scores, []);
    await mount('native', { useMicInput: true, wordSoundsActivity: 'word_scramble', pointerTextInput: true });
    await submit('dog'); assert.equal(document.activeElement?.getAttribute('aria-label'), 'Check what I heard');
    assert.equal(document.querySelector('[data-pointer-answer]'), null, 'Text input appears only after the switch');
    await settle(() => reviewButton('Type answer').click());
    assert.equal(document.activeElement, document.querySelector('[data-pointer-answer]')); assert.deepEqual(scores, []);
  });
  if (root) await settle(() => root.unmount());
  dom.window.close(); console.log(passed + ' voice-mode regression groups passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
