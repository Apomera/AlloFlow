/* Runs actual extracted Word Sounds microphone hooks, answer/replay entry code,
 * durable audio cleanup and the production shared Web Speech wrapper. The speech
 * engine is deterministic: these tests verify ownership and scoring, not device
 * permissions, speech recognition quality, or physical microphone release. */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_REPO || path.resolve(__dirname, '..');
const sourceArg = process.argv.find(value => value.startsWith('--source='));
const file = sourceArg ? path.resolve(sourceArg.slice(9)) : path.join(repo, 'word_sounds_module.js');
const source = fs.readFileSync(file, 'utf8');
const voice = fs.readFileSync(path.join(repo, 'voice_module.js'), 'utf8');
function between(text, first, last) {
  const start = text.indexOf(first), end = text.indexOf(last, start + first.length);
  assert.ok(start >= 0 && end > start, 'Production extraction markers: ' + first);
  return text.slice(start, end);
}
const selectors = between(source, '      const packForCurrentWord =', '      // BEGIN WORD SOUNDS MICROPHONE ANSWERS');
const targets = between(source, '// BEGIN WORD SOUNDS MICROPHONE ANSWERS', '// END WORD SOUNDS MICROPHONE ANSWERS');
const lifecycle = between(source, '// BEGIN WORD SOUNDS MICROPHONE LIFECYCLE', '// END WORD SOUNDS MICROPHONE LIFECYCLE');
const productionCore = new Function(fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8') + '\nreturn createWordSoundsCore();')();
const handler = between(source, '      const handleMicInput = React.useCallback(', '      // BEGIN WORD SOUNDS MICROPHONE CONTROLS');
const controls = between(source, '// BEGIN WORD SOUNDS MICROPHONE CONTROLS', '// END WORD SOUNDS MICROPHONE CONTROLS');
const shutdown = between(source, '      const stopAllWordSoundsAudio = React.useCallback(', '      // Ref-mirror of wordSoundsAudioLibrary');
const answerBody = between(source, '        (answer, expectedAnswer, opts) => {', '          try {').replace('        (answer, expectedAnswer, opts) => {', '');
const replayBody = between(source, '        async (input, playImmediately = true) => {', '          const voiceForTts =').replace('        async (input, playImmediately = true) => {', '');
const homophones = between(source, '    const HOMOPHONE_CLUSTERS =', '    // Rhyme Time variety:');
const sharedSource = between(voice, '  function nullableRecognitionConfidence(', '  // ── Stubs for upcoming phases');
const automaticSource = between(source, '      React.useEffect(() => {\n        if (playInstructions) return;', '      const startActivity = React.useCallback(');
assert.ok(answerBody.includes('cancelMicInput();'), 'Pointer answer entry cancels capture');
assert.ok(replayBody.includes('if (playImmediately) cancelMicInput();'), 'Playback entry cancels capture but preload does not');
assert.match(between(source, '      const resetRuntimeSession = React.useCallback(', '      const runtimeIdentityKey'), /cancelMicInput\(\)/, 'Session reset cancels capture');
assert.match(between(source, '      const startActivity = React.useCallback(', '      // Recovery for the "Loading your words'), /cancelMicInput\(\);[\s\S]*Stop all ongoing audio/, 'Activity start cancels capture');
const { JSDOM } = require(path.join(repo, 'node_modules/jsdom'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(path.join(repo, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.join(repo, 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(path.join(repo, 'desktop/web-app/node_modules/react-dom/test-utils')).act;
let api, root, props, instances = [], plan = [], scores = [], answers = [], toasts = [], events = [], sharedOptions = [];
class Recognition {
  constructor() {
    this.plan = plan.shift() || {};
    if (this.plan.constructError) throw Error('constructor rejected');
    this.starts = 0; this.stops = 0; this.aborts = 0; instances.push(this);
  }
  start() { this.starts++; events.push('start'); if (this.plan.startError) throw Error('start rejected'); this.plan.onStart?.(this); }
  stop() { this.stops++; events.push('stop'); this.plan.onStop?.(this); }
  abort() { this.aborts++; events.push('abort'); this.plan.onStop?.(this); }
  result(text, isFinal = true) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] }); }
  end() { this.onend?.(); }
  error(error = 'not-allowed') { this.onerror?.({ error }); }
}
const initWebSpeechCapture = new Function('window', 'getCapabilities', 'setTimeout', sharedSource + '\nreturn initWebSpeechCapture;')(
  dom.window, () => ({ webSpeech: typeof dom.window.SpeechRecognition === 'function' || typeof dom.window.webkitSpeechRecognition === 'function' }), setTimeout);
const hooks = { expose(value) { api = value; }, score(...values) { scores.push(values); }, answer(value) { answers.push(value); },
  toast(...values) { toasts.push(values); }, pause() { events.push('pause audio'); }, editorStop() { events.push('stop editor preview'); }, playing(value) { events.push('playing:' + value); } };
const Harness = new Function('React', 'window', 'hooks', 'WS_CORE', `${homophones}
  return function Harness(props) {
    const { currentWordSoundsWord, wordSoundsActivity, wordSoundsLanguage, wordSoundsPhonemes,
      useMicInput, isMinimized, isEditing, showReviewPanel, isProbeMode, isTeacherMode,
      historyLearnerId, configuredSessionId, historyResourceId, isolationState, manipulationState } = props;
    const [isListening, setIsListening] = React.useState(false);
    const recognitionRef = React.useRef(null), isMountedRef = React.useRef(true);
    const activityRegionRef = React.useRef(null);
    const audioRunIdRef = React.useRef(0), advanceEpochRef = React.useRef(0), submissionLockRef = React.useRef(false);
    const audioCancelledRef = React.useRef(false), currentActiveAudio = React.useRef(null), audioInstances = React.useRef(new Map());
    const feedbackAudioRef = React.useRef(null), anchorReplayTimeoutRef = React.useRef(null);
    const manipulationStateRef = React.useRef(null), syllableDataRef = React.useRef(null), syllableDeliveredRef = React.useRef(null);
    const pauseResponseAudio = hooks.pause, setIsPlayingAudio = hooks.playing, setUserAnswer = hooks.answer;
    const wordSoundsSyllableEditorPlayback = { stop: hooks.editorStop };
    const addToast = hooks.toast, ts = () => 'Microphone error', warnLog = () => {}, debugLog = () => {};
    React.useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
    ${selectors}
    ${targets}
    ${lifecycle}
    ${shutdown}
    const checkAnswer = (answer, expectedAnswer, opts) => { ${answerBody} hooks.score(answer, expectedAnswer); };
    const replay = async (input, playImmediately = true) => { ${replayBody} };
    ${handler}
    ${controls}
    hooks.expose({ handleMicInput, cancelMicInput, stopAllWordSoundsAudio, checkAnswer, replay, isListening,
      recognitionRef, micAttemptRef, pendingMicAnswerRef, confirmMicAnswer, audioRunIdRef, advanceEpochRef, submissionLockRef, isMountedRef });
    return React.createElement('button', { onClick: handleMicInput, 'aria-pressed': isListening }, isListening ? 'Cancel microphone' : 'Use Microphone');
  };`)(React, dom.window, hooks, productionCore);
const defaults = { currentWordSoundsWord: 'blue', wordSoundsActivity: 'blending', wordSoundsLanguage: 'en-US', wordSoundsPhonemes: { word: 'blue', rhymeWord: 'cat' }, isolationState: null, manipulationState: null,
  useMicInput: true, isMinimized: false, isEditing: false, showReviewPanel: false, isProbeMode: false, isTeacherMode: false,
  historyLearnerId: 'learner-a', configuredSessionId: 'session-a', historyResourceId: 'resource-a' };
async function settle(fn = () => {}) { await act(async () => { await fn(); }); }
async function mount(route = 'native', overrides = {}) {
  if (root) await settle(() => root.unmount());
  root = null; instances = []; plan = []; scores = []; answers = []; toasts = []; events = []; sharedOptions = [];
  dom.window.SpeechRecognition = Recognition; delete dom.window.webkitSpeechRecognition;
  if (route === 'shared') dom.window.AlloFlowVoice = { initWebSpeechCapture(options) { sharedOptions.push(options); return initWebSpeechCapture(options); } };
  else delete dom.window.AlloFlowVoice;
  props = { ...defaults, ...overrides };
  root = createRoot(document.getElementById('root'));
  await settle(() => root.render(React.createElement(Harness, props)));
}
async function rerender(changes) { props = { ...props, ...changes }; await settle(() => root.render(React.createElement(Harness, props))); }
async function click() { await settle(() => api.handleMicInput()); }
const last = () => instances.at(-1);
function inactive() { assert.equal(api.isListening, false); assert.equal(api.micAttemptRef.current, null); assert.equal(api.recognitionRef.current, null); }
function active() { assert.equal(api.isListening, true); assert.ok(api.micAttemptRef.current); assert.ok(api.recognitionRef.current); }
function stopped(rec, route) { assert.equal(route === 'shared' ? rec.stops : rec.aborts, 1); }
let passed = 0;
async function group(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
// Run the real instructions-off effect with an explicit timer queue. Advancing
// a timer flushes async continuations, but leaves blocked audio controllable.
function automaticHarness(activity = 'counting') {
  const timers = new Map(), calls = [], highlights = [], errors = [];
  let nextTimer = 0, cleanup, syllableStale, audioHook = async () => ({ ok: true });
  const state = {
    React: { useEffect(fn) { cleanup = fn(); } }, playInstructions: false,
    wordSoundsActivity: activity, wordFamilyItemSkipped: () => false,
    currentWordSoundsWord: 'blue', wordSoundsPhonemes: {}, isLoadingPhonemes: false,
    lastPlayedWord: { current: null }, isMountedRef: { current: true },
    audioCancelledRef: { current: false }, micAttemptRef: { current: null },
    submissionLockRef: { current: false }, audioRunIdRef: { current: 0 },
    isolationStateRef: { current: { isoOptions: [] } }, rhymeOptionsRef: { current: [] },
    manipulationOptionsRef: { current: [] }, rhymeOptions: [],
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    handleAudio(text) { calls.push(text); return audioHook(text); },
    async playBlending() { calls.push('managed blending'); },
    async playSyllables(stale) { syllableStale = stale; if (!stale()) calls.push('managed syllables'); },
    setHighlightedIsoIndex(index) { highlights.push(['isolation', index]); },
    setHighlightedRhymeIndex(index) { highlights.push(['rhyming', index]); },
    setHighlightedManipIndex(index) { highlights.push(['manipulation', index]); },
    warnLog(...values) { errors.push(values); },
  };
  new Function(...Object.keys(state), automaticSource)(...Object.values(state));
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const next = async () => {
    const entry = timers.entries().next().value;
    assert.ok(entry, 'An expected production timer remains');
    const [id, timer] = entry; timers.delete(id);
    Promise.resolve(timer.fn()).catch(error => errors.push(error));
    await flush();
    assert.deepEqual(errors, [], 'The production timer must not swallow an error');
    return timer.delay;
  };
  return { state, calls, highlights, errors, timers, next, flush,
    setAudioHook(fn) { audioHook = fn; },
    stale: () => syllableStale,
    async drain() { for (let i = 0; timers.size && i < 100; i++) await next(); assert.equal(timers.size, 0, 'Timer queue settles'); },
    cleanup() { cleanup?.(); },
  };
}
async function run() {
  await group('native fallback and actual shared wrapper reserve ownership before recognition begins and stop playback', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); await click(); active();
      assert.equal(instances.length, 1); assert.equal(last().starts, 1);
      assert.equal(last().lang, 'en-US'); assert.equal(last().continuous, false); assert.equal(last().interimResults, false);
      assert.deepEqual(events, ['pause audio', 'stop editor preview', 'playing:false', 'start']);
      assert.equal(document.querySelector('button').getAttribute('aria-pressed'), 'true');
      if (route === 'shared') assert.equal(sharedOptions.length, 1);
    }
  });
  await group('two immediate taps cancel the pending start without opening a second recognizer', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); const start = api.handleMicInput;
      await settle(() => { start(); start(); }); inactive(); assert.equal(instances.length, 1); stopped(last(), route);
      await settle(() => { last().result('blue'); last().error(); last().end(); });
      assert.deepEqual(scores, []); assert.deepEqual(answers, []); assert.deepEqual(toasts, []);
      await click(); active(); assert.equal(instances.length, 2);
    }
  });
  await group('cancelled callbacks cannot score, notify or end a newer capture', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); await click(); const old = last(); await click(); await click(); const next = last();
      await settle(() => { old.result('blue'); old.error(); old.end(); }); active(); assert.equal(api.recognitionRef.current === old, false);
      assert.deepEqual(scores, []); assert.deepEqual(toasts, []); await settle(() => next.result('blue')); inactive();
      assert.deepEqual(scores, [['correct', 'correct']]);
    }
  });
  await group('one final response is consumed before stop callbacks and duplicate finals', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); plan.push({ onStop(rec) { rec.result('wrong'); rec.error(); rec.end(); } }); await click(); const rec = last();
      await settle(() => { rec.result('  BLUE!  '); rec.result('blue'); rec.error(); rec.end(); });
      inactive(); stopped(rec, route); assert.deepEqual(answers, ['BLUE!']); assert.deepEqual(scores, [['correct', 'correct']]); assert.deepEqual(toasts, []);
    }
  });
  await group('interim, empty and malformed native results never submit; resultIndex selects the new final', async () => {
    await mount(); await click(); const rec = last();
    await settle(() => {
      for (const event of [undefined, null, {}, { results: [] }, { results: [null] }, { results: [{ isFinal: true }] },
        { results: [Object.assign([{ transcript: 42 }], { isFinal: true })] }]) rec.onresult(event);
      rec.result('blue', false); rec.result('   ', true); rec.result(' .,!? ', true);
    });
    active(); assert.deepEqual(scores, []); assert.deepEqual(answers, []);
    await settle(() => rec.onresult({ resultIndex: 1, results: [Object.assign([{ transcript: 'wrong' }], { isFinal: true }), Object.assign([{ transcript: 'blue' }], { isFinal: true })] }));
    assert.deepEqual(scores, [['correct', 'correct']]); inactive();
  });
  await group('shared rich callback ignores interim, malformed and empty text and scores only the finalized part', async () => {
    await mount('shared'); await click(); const options = sharedOptions[0];
    assert.equal(options.onTranscript, undefined, 'Do not subscribe to combined final/interim text');
    assert.equal(typeof options.onRichResult, 'function');
    await settle(() => {
      for (const result of [undefined, null, {}, { interim: 'blue' }, { final: null }, { final: 42 }, { final: {} },
        { final: '  ' }, { final: ' .,!? ', interim: 'blue' }]) options.onRichResult(result);
      last().result('blue', false);
    });
    active(); assert.deepEqual(scores, []); assert.deepEqual(answers, []);
    await settle(() => last().onresult({ resultIndex: 0, results: [
      Object.assign([{ transcript: 'blue' }], { isFinal: true }),
      Object.assign([{ transcript: 'unfinished noise' }], { isFinal: false }),
    ] }));
    inactive(); assert.deepEqual(answers, ['blue']); assert.deepEqual(scores, [['correct', 'correct']]);
  });
  await group('actual homophone and punctuation scoring, rhyme target and wrong-answer payload are preserved', async () => {
    for (const route of ['native', 'shared']) {
      for (const example of [
        { word: 'blue', text: 'blew', expected: ['correct', 'correct'] },
        { word: 'one', text: ' Won! ', expected: ['correct', 'correct'] },
        { word: 'blue', text: 'green', expected: ['green', 'blue'] },
        { word: 'hat', activity: 'rhyming', text: 'cat', expected: ['correct', 'correct'] },
        { word: 'hat', activity: 'rhyming', text: 'hat', expected: ['hat', 'cat'] },
      ]) {
        await mount(route, { currentWordSoundsWord: example.word, wordSoundsActivity: example.activity || 'blending', wordSoundsPhonemes: { word: example.word, rhymeWord: 'cat' } });
        await click(); await settle(() => last().result(example.text));
        if (api.pendingMicAnswerRef.current) {
          assert.deepEqual(scores, [], 'A suspected mismatch waits for student confirmation');
          await settle(() => api.confirmMicAnswer(api.pendingMicAnswerRef.current));
        }
        assert.deepEqual(scores, [example.expected]);
      }
      await mount(route, { wordSoundsActivity: 'rhyming', wordSoundsPhonemes: {} }); await click(); inactive();
      assert.equal(instances.length, 0, 'An unresolved rhyme answer cannot start recognition');
      assert.deepEqual(scores, []); assert.deepEqual(answers, []); await click(); inactive();
    }
  });
  await group('word, activity, language, rhyme, input mode, visibility and learner/session context changes discard the old capture', async () => {
    const contexts = [
      { currentWordSoundsWord: 'red' }, { wordSoundsActivity: 'rhyming' }, { wordSoundsLanguage: 'fr' },
      { wordSoundsPhonemes: { rhymeWord: 'bat' } }, { useMicInput: false }, { isMinimized: true },
      { isEditing: true }, { showReviewPanel: true }, { isProbeMode: true }, { isTeacherMode: true },
      { historyLearnerId: 'learner-b' }, { configuredSessionId: 'session-b' }, { historyResourceId: 'resource-b' },
    ];
    for (const route of ['native', 'shared']) for (const changes of contexts) {
      await mount(route); await click(); const rec = last(); await rerender(changes); inactive(); stopped(rec, route);
      await settle(() => { rec.result('blue'); rec.error(); rec.end(); }); assert.deepEqual(scores, []); assert.deepEqual(toasts, []);
      await rerender(defaults); await click(); active();
    }
  });
  await group('run, advance, submission-lock and mounted guards reject callbacks before effects catch up', async () => {
    for (const route of ['native', 'shared']) for (const ref of ['audioRunIdRef', 'advanceEpochRef', 'submissionLockRef', 'isMountedRef']) {
      await mount(route); await click(); const rec = last();
      api[ref].current = ref === 'submissionLockRef' ? true : ref === 'isMountedRef' ? false : api[ref].current + 1;
      await settle(() => { rec.result('blue'); rec.error(); rec.end(); }); assert.deepEqual(scores, []); assert.deepEqual(answers, []); assert.deepEqual(toasts, []);
      api.isMountedRef.current = true; api.submissionLockRef.current = false; await settle(() => api.cancelMicInput()); inactive();
      await click(); await settle(() => last().result('blue')); assert.deepEqual(scores, [['correct', 'correct']]);
    }
  });
  await group('pointer-answer and replay entry code cancel speech while preload keeps it active', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); await click(); const rec = last(); await settle(() => api.replay('blue', false)); active();
      assert.equal(rec.stops + rec.aborts, 0); await settle(() => api.replay('blue')); inactive(); stopped(rec, route);
      await settle(() => rec.result('blue')); assert.deepEqual(scores, []);
      await click(); const second = last(); await settle(() => api.checkAnswer('pointer', 'blue')); inactive(); stopped(second, route);
      await settle(() => second.result('blue')); assert.deepEqual(scores, [['pointer', 'blue']]);
    }
  });
  await group('production stop-all and unmount cleanup release capture before late events', async () => {
    for (const route of ['native', 'shared']) {
      await mount(route); await click(); const rec = last(); await settle(() => api.stopAllWordSoundsAudio()); inactive(); stopped(rec, route);
      await click(); const second = last(); await settle(() => root.unmount()); root = null; stopped(second, route);
      await settle(() => { rec.result('blue'); second.result('blue'); second.error(); second.end(); });
      assert.deepEqual(scores, []); assert.deepEqual(answers, []); assert.deepEqual(toasts, []);
    }
  });
  await group('constructor and start exceptions leave retryable state in native and shared paths', async () => {
    for (const route of ['native', 'shared']) for (const failure of ['constructError', 'startError']) {
      await mount(route); plan.push({ [failure]: true }); await click(); inactive(); assert.equal(toasts.length, 1);
      await click(); active(); await settle(() => last().result('blue')); inactive(); assert.deepEqual(scores, [['correct', 'correct']]);
    }
  });
  await group('unsupported or malformed shared controllers and synchronous startup callbacks recover safely', async () => {
    for (const factory of [() => null, () => ({ supported: false }), () => ({ supported: true, start() { return true; } }),
      () => ({ supported: true, start() { return false; }, stop() {} }), () => { throw Error('wrapper failed'); }]) {
      await mount('shared'); dom.window.AlloFlowVoice.initWebSpeechCapture = factory; await click(); inactive(); assert.equal(toasts.length, 1);
    }
    for (const route of ['native', 'shared']) {
      await mount(route); plan.push({ onStart(rec) { rec.result('blue'); } }); await click(); inactive(); assert.deepEqual(scores, [['correct', 'correct']]);
      await mount(route); plan.push({ onStart(rec) { rec.error(); } }); await click(); inactive(); assert.equal(toasts.length, 1);
      await click(); active();
    }
    await mount(); delete dom.window.SpeechRecognition; await click(); inactive(); assert.equal(toasts.length, 1);
    dom.window.webkitSpeechRecognition = Recognition; await click(); active();
  });
  await group('natural end and no-speech or aborted errors permit retry without a misleading error toast', async () => {
    for (const route of ['native', 'shared']) for (const event of ['end', 'no-speech', 'aborted', 'not-allowed']) {
      await mount(route); await click(); const rec = last();
      await settle(() => event === 'end' ? rec.end() : rec.error(event)); inactive(); stopped(rec, route);
      assert.equal(toasts.length, event === 'not-allowed' ? 1 : 0); await click(); active();
    }
  });
  await group('hidden, editing, review, empty-item and locked states cannot open capture', async () => {
    for (const changes of [{ isMinimized: true }, { isEditing: true }, { showReviewPanel: true }, { currentWordSoundsWord: '' }, { wordSoundsActivity: '' }]) {
      await mount('native', changes); await click(); inactive(); assert.equal(instances.length, 0);
    }
    await mount(); api.submissionLockRef.current = true; await click(); inactive(); assert.equal(instances.length, 0);
    api.submissionLockRef.current = false; api.isMountedRef.current = false; await click(); inactive(); assert.equal(instances.length, 0);
  });
  await group('instructions-off playback captures ownership after mount teardown advances the run', async () => {
    for (const activity of ['counting', 'blending', 'syllable_blending']) {
      const h = automaticHarness(activity);
      h.state.audioRunIdRef.current++; // The later word-change effect runs before this timer.
      assert.equal(await h.next(), 50);
      await h.drain();
      assert.deepEqual(h.calls, [activity === 'blending' ? 'managed blending' : activity === 'syllable_blending' ? 'managed syllables' : 'blue']);
      assert.equal(h.state.lastPlayedWord.current, 'blue-' + activity);
      if (activity === 'syllable_blending') {
        assert.equal(h.stale()(), false);
        h.state.audioRunIdRef.current++;
        assert.equal(h.stale()(), true, 'Managed syllable playback sees later ownership changes');
      }
      h.cleanup();
    }
  });
  await group('a microphone attempt before the instructions-off timer suppresses automatic speech', async () => {
    for (const activity of ['counting', 'blending', 'syllable_blending', 'rhyming']) {
      const h = automaticHarness(activity);
      h.state.micAttemptRef.current = { pending: true };
      await h.drain();
      assert.deepEqual(h.calls, []);
      assert.deepEqual(h.highlights, []);
      assert.equal(h.state.lastPlayedWord.current, null, 'Suppressed audio is not marked played');
      h.cleanup();
    }
  });
  await group('instructions-off option waits and in-flight options stop after audio ownership changes', async () => {
    for (const activity of ['isolation', 'rhyming', 'manipulation']) {
      const setOptions = h => {
        if (activity === 'isolation') h.state.isolationStateRef.current = { isoOptions: ['first', 'second'] };
        else h.state[activity === 'rhyming' ? 'rhymeOptionsRef' : 'manipulationOptionsRef'].current = ['first', 'second'];
      };
      const waiting = automaticHarness(activity);
      await waiting.next();
      assert.deepEqual(waiting.calls, ['blue']);
      assert.equal(waiting.timers.size, 1, 'Production is waiting for its option data');
      waiting.state.audioRunIdRef.current++;
      setOptions(waiting);
      await waiting.drain();
      assert.deepEqual(waiting.calls, ['blue']);
      assert.deepEqual(waiting.highlights, []);
      waiting.cleanup();

      const playing = automaticHarness(activity);
      setOptions(playing);
      let finishFirst;
      const firstClip = new Promise(resolve => { finishFirst = resolve; });
      playing.setAudioHook(text => text === 'first' ? firstClip : Promise.resolve({ ok: true }));
      await playing.next(); // Target word, then the gap before the options.
      await playing.next(); // First option waits for its clip to finish.
      assert.deepEqual(playing.calls, ['blue', 'first']);
      playing.state.audioRunIdRef.current++;
      finishFirst({ ok: true });
      await playing.flush();
      await playing.drain();
      assert.deepEqual(playing.calls, ['blue', 'first'], 'The second option cannot start after microphone or answer takes ownership');
      assert.deepEqual(playing.highlights, [[activity, 0]], 'A stale sequence does not overwrite a newer highlight');
      playing.cleanup();
    }
  });
  console.log('PASS microphone lifecycle: ' + passed + ' regression groups');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (root) await settle(() => root.unmount());
  dom.window.close();
});
