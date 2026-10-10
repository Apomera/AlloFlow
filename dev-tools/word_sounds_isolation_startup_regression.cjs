// Executes the actual production isolation setup effect. Prepared boards return
// before fallback generation; any unexpected fallback is an explicit failure.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_TEST_ROOT || process.env.WORD_SOUNDS_REPO || path.resolve(__dirname, '..');
const sourceArg = process.argv.find(value => value.startsWith('--source='));
const source = fs.readFileSync(sourceArg ? path.resolve(sourceArg.slice(9)) : path.join(repo, 'word_sounds_module.js'), 'utf8');
const condition = source.indexOf('        if (wordSoundsActivity !== "isolation" || !wordSoundsPhonemes || !currentWordSoundsWord');
const start = source.lastIndexOf('      React.useEffect(() => {', condition);
const endMarker = '      }, [wordSoundsActivity, wordSoundsPhonemes, currentWordSoundsWord]);';
const end = source.indexOf(endMarker, condition);
assert.ok(condition >= 0 && start >= 0 && end > condition, 'Production isolation effect extraction boundaries');
const effectSource = source.slice(start, end + endMarker.length);
const core = new Function(fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8') + '\nreturn createWordSoundsCore();')();
function board(word = 'cat', correct = 'k', options = ['k', 's', 'm'], position = 0) {
  return Object.freeze({ word, phonemes: Object.freeze(['k', 'a', 't']), activityItems: Object.freeze({
    isolation: Object.freeze({ correctSound: correct, options: Object.freeze(options), position }),
  }) });
}
function harness() {
  const writes = [], effects = [];
  const env = {
    React: { useEffect(fn) { effects.push(fn); } }, WS_CORE: core,
    wordSoundsActivity: 'isolation', wordSoundsPhonemes: board(), currentWordSoundsWord: 'cat',
    lastWordForIsolation: { current: null }, isolationStateRef: { current: null },
    isolationPositionRef: { current: null }, isolationState: null,
    setIsolationState(value) { env.isolationState = value; writes.push(value); },
    debugLog() {}, warnLog() {},
    phonemeKey() { throw Error('Unexpected fallback generation for a checked prepared board'); },
    handleAudio() { throw Error('Prepared startup must not start fallback prefetch'); },
  };
  function run(changes = {}) {
    Object.assign(env, changes); effects.length = 0;
    new Function(...Object.keys(env), effectSource)(...Object.values(env));
    assert.equal(effects.length, 1, 'Exactly the production startup effect runs');
    effects[0]();
    return env.isolationState;
  }
  function ready(word = 'cat', correct = 'k', options = ['k', 's', 'm']) {
    assert.ok(env.isolationState, 'Prepared isolation board is installed');
    assert.equal(env.isolationState.word, word);
    assert.equal(env.isolationState.correctSound, correct);
    assert.equal(env.isolationState.correctAnswer, correct);
    assert.deepEqual(env.isolationState.isoOptions, options);
    assert.equal(env.isolationStateRef.current, env.isolationState, 'Playback ref matches the visible board');
  }
  function empty() {
    assert.equal(env.isolationState, null);
    assert.equal(env.isolationStateRef.current, null);
    assert.equal(env.lastWordForIsolation.current, null, 'A cleared board cannot retain its initialized-word marker');
  }
  return { env, writes, run, ready, empty };
}
let passed = 0;
function group(name, fn) { fn(); passed++; console.log('PASS ' + name); }
group('normal prepared startup preserves checked options and does not mutate the source', () => {
  const h = harness(), original = h.env.wordSoundsPhonemes.activityItems.isolation.options;
  h.run(); h.ready(); assert.equal(h.env.lastWordForIsolation.current, 'cat');
  assert.equal(h.env.isolationPositionRef.current, 0);
  assert.notEqual(h.env.isolationState.isoOptions, original);
  assert.deepEqual(original, ['k', 's', 'm']);
});
group('temporary phoneme reset restores the same word instead of leaving loading state', () => {
  const h = harness(), prepared = h.env.wordSoundsPhonemes;
  h.run(); h.ready(); h.run({ wordSoundsPhonemes: null }); h.empty();
  h.run({ wordSoundsPhonemes: prepared }); h.ready();
  assert.equal(h.writes.length, 3, 'Install, clear and restore each update the visible board');
});
group('leaving isolation and returning to the same word reinstalls the prepared board', () => {
  const h = harness(); h.run(); h.ready();
  h.run({ wordSoundsActivity: 'blending' }); h.empty();
  h.run({ wordSoundsActivity: 'isolation' }); h.ready();
});
group('lagging data for another word cannot install a wrong answer under the current word', () => {
  const h = harness(); h.run(); h.ready();
  h.run({ wordSoundsPhonemes: board('dog', 'd', ['d', 'b', 'g']) }); h.empty();
  h.run({ wordSoundsPhonemes: board() }); h.ready();
});
group('an empty current item clears both visible and playback state before restoration', () => {
  const h = harness(); h.run(); h.ready();
  h.run({ currentWordSoundsWord: '' }); h.empty();
  h.run({ currentWordSoundsWord: 'cat' }); h.ready();
});
group('ordinary rerenders keep a ready board stable and a new item initializes once', () => {
  const h = harness(); h.run(); const installed = h.env.isolationState, writes = h.writes.length;
  h.run({ wordSoundsPhonemes: board() }); h.ready();
  assert.equal(h.env.isolationState, installed); assert.equal(h.writes.length, writes);
  h.run({ currentWordSoundsWord: 'dog', wordSoundsPhonemes: board('dog', 'g', ['g', 'd', 's'], 2) });
  h.ready('dog', 'g', ['g', 'd', 's']); assert.equal(h.env.isolationPositionRef.current, 2);
});
group('normalized same-word data remains valid while repeated empty resets stay quiet', () => {
  const h = harness(); h.run({ currentWordSoundsWord: ' CAT ' }); h.ready(' CAT ');
  h.run({ wordSoundsPhonemes: null }); h.empty(); const writes = h.writes.length;
  h.run(); h.empty(); assert.equal(h.writes.length, writes);
  h.run({ currentWordSoundsWord: 'cat', wordSoundsPhonemes: board() }); h.ready();
});
console.log('PASS isolation startup: ' + passed + ' regression groups');
