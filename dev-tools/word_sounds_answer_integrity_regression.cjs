/* Executes the production construction activity renderers and submission/support
 * helpers. Audio and grading are observed boundaries; UI handlers are not copied. */
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
const views = between('          case "spelling_bee": {', '          case "manipulation": {');
const support = between('// BEGIN WORD SOUNDS SPELLING SUPPORT', '// END WORD SOUNDS SPELLING SUPPORT');
const submissions = between('// BEGIN WORD SOUNDS CONSTRUCTION ANSWERS', '// END WORD SOUNDS CONSTRUCTION ANSWERS');
const realReact = require(path.join(repo, 'desktop/web-app/node_modules/react'));
const activities = ['spelling_bee', 'word_scramble', 'missing_letter'];
const clone = value => JSON.parse(JSON.stringify(value));
function flatten(value, nodes = []) {
  if (Array.isArray(value)) value.forEach(child => flatten(child, nodes));
  else if (value && typeof value === 'object') { nodes.push(value); flatten(value.props?.children, nodes); }
  return nodes;
}
function text(value) {
  if (Array.isArray(value)) return value.map(text).join(' ');
  if (value && typeof value === 'object') return text(value.props?.children);
  return value === null || value === undefined || typeof value === 'boolean' ? '' : String(value);
}
function fixture(activity = 'spelling_bee', overrides = {}) {
  const events = [], refs = [], calls = [], timers = [];
  let nodes = [], refIndex = 0;
  const record = (kind, value) => events.push({ kind, value });
  const env = {
    currentWordSoundsWord: 'cat', wordSoundsActivity: activity, userAnswer: '',
    wordSoundsScore: { streak: 0 }, wordSoundsFeedback: null, currentStreak: 0, attempts: 0,
    useMicInput: false, isProbeMode: false, isMountedRef: { current: true },
    advanceEpochRef: { current: 7 }, submissionLockRef: { current: false }, supportSeenRef: { current: {} },
    scrambledLetters: ['t', 'c', 'a'], usedScrambleIndices: [], hiddenIndex: 1,
    correctLetter: 'a', letterOptions: ['a', 'e', 'i'],
    renderPrompt: () => null, renderVoiceInputOverlay: () => null, toggleMicInputMode: () => record('mode'),
    ts: () => '', t: key => key, Volume2: () => null, Mic: () => null,
    handleAudio: (...args) => record('audio', args), playSpellingWord: rate => record('audio', rate),
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; },
    setUserAnswer: value => {
      env.userAnswer = typeof value === 'function' ? value(env.userAnswer) : value;
      record('answer', { value: env.userAnswer, support: clone(env.supportSeenRef.current) });
    },
    setUsedScrambleIndices: value => {
      env.usedScrambleIndices = typeof value === 'function' ? value(env.usedScrambleIndices) : value;
      record('tiles', env.usedScrambleIndices);
    },
    setWordSoundsFeedback: value => { env.wordSoundsFeedback = value; record('feedback', value); },
    checkAnswer: (...args) => {
      calls.push({ args, support: clone(env.supportSeenRef.current) }); record('check', args);
      if (args[0] === args[1] || env.attempts >= 1 || env.isProbeMode) env.submissionLockRef.current = true;
    },
    ...overrides,
  };
  const React = {
    ...realReact, useCallback: fn => fn, useMemo: fn => fn(),
    useRef: value => { const index = refIndex++; return refs[index] || (refs[index] = { current: value }); },
    useEffect: () => {},
  };
  let helpers;
  function render() {
    refIndex = 0;
    const code = `${support}\n${submissions}\nreturn { helpers: { recordSpellingSupport, submitConstructionAnswer }, element: (() => { switch(wordSoundsActivity) { ${views}\n} })() };`;
    const result = new Function('React', ...Object.keys(env), code)(React, ...Object.values(env));
    helpers = result.helpers; nodes = flatten(result.element); return api;
  }
  const api = {
    env, events, calls, timers, render,
    get nodes() { return nodes; }, get helpers() { return helpers; },
    input() { const input = nodes.find(node => node.type === 'input'); assert.ok(input, activity + ' input'); return input; },
    check() {
      const button = nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Check Answer');
      assert.ok(button, activity + ' check button'); return button;
    },
    button(label) {
      const button = nodes.find(node => node.type === 'button' && text(node) === label);
      assert.ok(button, activity + ' button: ' + label); return button;
    },
    tiles() { return nodes.filter(node => node.props?.role === 'button'); },
    letters() { return nodes.filter(node => node.type === 'div' && /w-11 h-13/.test(node.props?.className || '')); },
    clearEvents() { events.length = 0; },
  };
  return render();
}
function key(overrides = {}) { return { key: 'Enter', preventDefault() {}, ...overrides }; }
function scoreIs(f, expected) {
  assert.equal(f.calls.length, 1, 'Exactly one synchronous shared grading call');
  assert.deepEqual(f.calls[0].args.slice(0, 2), [expected ? 'correct' : 'incorrect', 'correct']);
  assert.equal(f.timers.length, 0, 'Renderer does not delay scoring in a timer');
}
function noMutation(f, message) {
  assert.deepEqual(f.events, [], message); assert.deepEqual(f.calls, []); assert.deepEqual(f.timers, []);
}
function evidence(f) { return f.env.supportSeenRef.current.taskEvidence || {}; }
function clues(f) { return evidence(f).cluesShown || []; }
let passed = 0;
function group(name, fn) { fn(); passed++; console.log('PASS ' + name); }

group('all three correct answers enter shared grading immediately without local feedback or delayed scoring', () => {
  for (const activity of activities) {
    const f = fixture(activity, { userAnswer: activity === 'missing_letter' ? ' A ' : ' CAT ' });
    f.check().props.onClick(); scoreIs(f, true);
    assert.deepEqual(f.events.map(event => event.kind), ['check']);
  }
});
group('wrong answers use one shared grading path and record spelling support before grading', () => {
  for (const activity of activities) for (const attempts of [0, 1]) {
    const f = fixture(activity, { attempts, userAnswer: activity === 'missing_letter' ? 'e' : 'cot' });
    f.check().props.onClick(); scoreIs(f, false);
    assert.equal(f.events[0].kind, 'check', 'Shared grading owns feedback before optional retry cleanup');
    assert.equal(f.events.some(event => event.kind === 'audio' || event.kind === 'feedback'), false, 'No direct replay or competing feedback');
    if (attempts === 1) {
      assert.equal(f.env.submissionLockRef.current, true, 'The second incorrect presentation finalizes the item');
      assert.deepEqual(f.events.map(event => event.kind), ['check'], 'Final feedback retains the submitted answer');
    }
    if (activity === 'spelling_bee') {
      assert.equal(f.calls[0].support.key, '7|spelling_bee|cat');
      assert.equal(f.calls[0].support.taskEvidence.textSupported, true);
      assert.ok(f.calls[0].support.taskEvidence.cluesShown.includes('spelling_letter_feedback'));
    }
  }
});
group('empty answers disable checks and empty answers or missing targets cannot submit through handlers', () => {
  for (const activity of activities) for (const userAnswer of ['', '   ', '\t\n', null]) {
    const f = fixture(activity, { userAnswer });
    assert.equal(f.check().props.disabled, true); f.check().props.onClick(); noMutation(f);
  }
  for (const activity of activities) {
    const f = fixture(activity, { userAnswer: 'cat', currentWordSoundsWord: '', correctLetter: '' });
    f.check().props.onClick(); noMutation(f);
  }
});
group('repeated checks cannot grade the same unchanged correct or incorrect answer twice', () => {
  for (const activity of activities) for (const correct of [true, false]) {
    const f = fixture(activity, { userAnswer: correct ? (activity === 'missing_letter' ? 'a' : 'cat') : 'x' });
    const check = f.check().props.onClick; check(); check(); f.render(); f.check().props.onClick();
    scoreIs(f, correct);
  }
});
group('live submission locks and unmounted activities reject previously rendered checks without mutation', () => {
  for (const activity of activities) for (const lock of ['submission', 'unmounted']) {
    const f = fixture(activity, { userAnswer: activity === 'missing_letter' ? 'a' : 'cat' });
    if (lock === 'submission') f.env.submissionLockRef.current = true;
    else f.env.isMountedRef.current = false;
    f.check().props.onClick(); noMutation(f);
  }
});
group('rendered locks disable construction inputs checks options hints clear controls and scramble tiles', () => {
  for (const activity of activities) {
    const f = fixture(activity, { userAnswer: 'c', submissionLockRef: { current: true } });
    assert.equal(f.check().props.disabled, true);
    if (activity !== 'missing_letter') assert.equal(f.input().props.disabled, true);
    if (activity === 'spelling_bee') for (const label of ['Hint: first letter', '💡 Show Vowels']) assert.equal(f.button(label).props.disabled, true);
    if (activity === 'word_scramble') {
      assert.equal(f.button('Clear').props.disabled, true);
      for (const tile of f.tiles()) { assert.equal(tile.props['aria-disabled'], true); assert.equal(tile.props.tabIndex, -1); }
    }
    if (activity === 'missing_letter') for (const letter of ['A', 'E', 'I']) assert.equal(f.button(letter).props.disabled, true);
  }
});
group('previously rendered input hint clear option and tile handlers respect a newly acquired lock', () => {
  for (const activity of activities) {
    const f = fixture(activity, { userAnswer: 'c' }); f.env.submissionLockRef.current = true;
    if (activity !== 'missing_letter') f.input().props.onChange({ target: { value: 'cat' } });
    if (activity === 'spelling_bee') {
      f.button('Hint: first letter').props.onClick(); f.button('💡 Show Vowels').props.onClick();
    }
    if (activity === 'word_scramble') {
      f.button('Clear').props.onClick();
      for (const tile of f.tiles()) { tile.props.onClick(); tile.props.onKeyDown(key()); }
    }
    if (activity === 'missing_letter') for (const letter of ['A', 'E', 'I']) f.button(letter).props.onClick();
    noMutation(f); assert.deepEqual(f.env.supportSeenRef.current, {});
  }
});
group('Enter ignores composition and keyboard repetition and submits an ordinary complete answer', () => {
  for (const activity of ['spelling_bee', 'word_scramble']) {
    const f = fixture(activity, { userAnswer: 'cat' });
    for (const ignored of [{ isComposing: true }, { nativeEvent: { isComposing: true } }, { repeat: true }, { keyCode: 229 }, { key: 'Escape' }]) f.input().props.onKeyDown(key(ignored));
    noMutation(f); f.input().props.onKeyDown(key()); scoreIs(f, true);
  }
});
group('actual answer edits reset duplicate protection and preserve normal tile and option interaction', () => {
  for (const activity of activities) {
    const f = fixture(activity, { userAnswer: 'x' }); f.check().props.onClick();
    if (activity === 'missing_letter') f.button('A').props.onClick();
    else f.input().props.onChange({ target: { value: 'cat' } });
    f.render(); f.check().props.onClick();
    assert.equal(f.calls.length, 2); assert.deepEqual(f.calls[1].args.slice(0, 2), ['correct', 'correct']);
  }
  const f = fixture('word_scramble'); f.tiles()[1].props.onClick(); f.render();
  assert.equal(f.env.userAnswer, 'c'); assert.deepEqual(f.env.usedScrambleIndices, [1]);
  f.tiles()[1].props.onClick(); assert.equal(f.env.userAnswer, 'c');
  f.button('Clear').props.onClick(); assert.equal(f.env.userAnswer, ''); assert.deepEqual(f.env.usedScrambleIndices, []);
});
group('spelling letter boxes reveal no correctness before a checked attempt or during a probe', () => {
  for (const overrides of [{ attempts: 0 }, { attempts: 0, wordSoundsFeedback: { type: 'incorrect' } }, { attempts: 1, isProbeMode: true }, { attempts: 3, isProbeMode: true }]) {
    const f = fixture('spelling_bee', { userAnswer: 'cot', ...overrides });
    assert.equal(f.letters().length, 3);
    for (const letter of f.letters()) assert.doesNotMatch(letter.props.className, /(?:green|rose)-/, 'Unchecked/probe tiles are neutral');
    assert.doesNotMatch(f.nodes.map(text).join(' '), /letters correct/);
  }
});
group('checked practice spelling provides letter feedback only after an incorrect attempt', () => {
  const f = fixture('spelling_bee', { userAnswer: 'cot', attempts: 1, wordSoundsFeedback: { type: 'incorrect' } });
  assert.match(f.letters()[0].props.className, /green-/); assert.match(f.letters()[1].props.className, /rose-/);
  assert.match(f.nodes.map(text).join(' '), /2\/3 letters correct/);
});
group('probe mode omits spelling hints and does not record letter-feedback support when checking', () => {
  const f = fixture('spelling_bee', { userAnswer: 'cot', attempts: 1, isProbeMode: true });
  assert.equal(f.nodes.filter(node => node.type === 'button' && /Hint: first letter|Show Vowels|Show More/.test(text(node))).length, 0);
  f.check().props.onClick(); scoreIs(f, false); assert.deepEqual(f.env.supportSeenRef.current, {});
});
group('first-letter hints synchronously record support before changing the answer and mark full exposure', () => {
  for (const target of ['cat', 'a']) {
    const f = fixture('spelling_bee', { currentWordSoundsWord: target }); f.button('Hint: first letter').props.onClick();
    assert.equal(f.env.userAnswer, target[0]); assert.equal(f.env.supportSeenRef.current.key, '7|spelling_bee|' + target);
    const change = f.events.find(event => event.kind === 'answer'); assert.ok(change);
    assert.equal(change.value.support.taskEvidence.textSupported, true);
    assert.ok(change.value.support.taskEvidence.cluesShown.includes('spelling_first_letter'));
    assert.equal(!!change.value.support.taskEvidence.answerExposed, target.length === 1);
  }
});
group('vowel and more-letter hints accumulate progress and deduplicate evidence through full exposure', () => {
  const f = fixture('spelling_bee'); f.button('💡 Show Vowels').props.onClick();
  assert.equal(f.env.userAnswer, '_a_'); assert.ok(clues(f).includes('spelling_vowels')); assert.equal(!!evidence(f).answerExposed, false);
  f.render(); f.button('💡 Show More').props.onClick(); assert.equal(f.env.userAnswer, 'ca_');
  f.render(); f.button('💡 Show More').props.onClick(); assert.equal(f.env.userAnswer, 'cat');
  assert.equal(evidence(f).answerExposed, true); assert.ok(clues(f).includes('spelling_more_letters'));
  assert.equal(clues(f).length, new Set(clues(f)).size, 'Repeated more-letter hint is a single evidence clue');
  for (const event of f.events.filter(event => event.kind === 'answer')) assert.equal(event.value.support.taskEvidence.textSupported, true);
});
group('production support helper owns evidence by item and preserves prior clues and true support flags', () => {
  const f = fixture('spelling_bee', { supportSeenRef: { current: { key: '7|spelling_bee|cat', showWordText: true, showLetterHints: true,
    taskEvidence: { answerExposed: true, otherSupport: true, cluesShown: ['existing_hint'] } } } });
  f.helpers.recordSpellingSupport('spelling_vowels'); f.helpers.recordSpellingSupport('spelling_vowels');
  assert.equal(f.env.supportSeenRef.current.showWordText, true); assert.equal(f.env.supportSeenRef.current.showLetterHints, true);
  assert.equal(evidence(f).answerExposed, true); assert.equal(evidence(f).otherSupport, true);
  assert.deepEqual(clues(f), ['existing_hint', 'spelling_vowels']);
  f.env.advanceEpochRef.current = 8; f.env.currentWordSoundsWord = 'dog'; f.render();
  f.helpers.recordSpellingSupport('spelling_first_letter');
  assert.equal(f.env.supportSeenRef.current.key, '8|spelling_bee|dog');
  assert.deepEqual(clues(f), ['spelling_first_letter']); assert.equal(!!evidence(f).answerExposed, false);
});
console.log(`PASS ${passed} construction integrity regression groups`);
