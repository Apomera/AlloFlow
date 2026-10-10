'use strict';
// Runs the actual Studio compiler and runtime choice/edit branches in VM contexts.
// Synthetic WAV fixtures exercise preservation/validation, not pronunciation.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const repo = process.env.WORD_SOUNDS_TEST_ROOT || path.resolve(__dirname, '..');
const coreSource = fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8');
const setupSource = fs.readFileSync(path.join(repo, 'word_sounds_setup_source.jsx'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(repo, 'word_sounds_module.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const normalize = value => String(value || '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const between = (source, start, end, offset = 0) => {
  const first = source.indexOf(start, offset);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, 'Cannot locate actual source branch: ' + start);
  return source.slice(first + start.length, last);
};
const coreContext = { module: { exports: {} }, console, Buffer };
vm.createContext(coreContext);
vm.runInContext(coreSource + '\nglobalThis.core = createWordSoundsCore();', coreContext);
const core = coreContext.core;
const compilerCode = 'const compileActivityItems = (items) => {' + between(setupSource,
  '        const compileActivityItems = (items) => {', '        const handleStart = async () => {') + '\nglobalThis.compile = compileActivityItems;';
const helperCode = 'function buildSyllableOptions(word, preferred, pool, shuffle, sameSound) {' + between(runtimeSource,
  '    function buildSyllableOptions(word, preferred, pool, shuffle, sameSound) {', '// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY');
const generateOffset = runtimeSource.indexOf('      const generateSyllableData = React.useCallback(');
assert.ok(generateOffset > 0);
const generateCode = between(runtimeSource,
  'if (wordSoundsActivity === "syllable_blending") {', '\n          }\n          setIsGeneratingSyllable(true);', generateOffset);
const editOffset = runtimeSource.indexOf('      const handleOptionUpdate = (index, newValue, type, ctx) => {');
assert.ok(editOffset > 0);
const editCode = between(runtimeSource,
  '} else if (wordSoundsActivity === "syllable_blending") {', '} else if (wordSoundsActivity === "sound_sort") {', editOffset);
const saveOffset = runtimeSource.indexOf('renderSyllableEditor: (item, index) => {');
assert.ok(saveOffset > 0);
const saveCode = between(runtimeSource, 'onSave: (task) => {', '\n              }\n            });', saveOffset);

function compile(items, language = 'en-US', reviewed = {}) {
  const context = {
    WS_CORE: core, packIsEnglish: core.isSyllableLanguageSupported(language), wordSoundsLanguage: language,
    PACK_COMMON_WORDS: ['cat', 'dog', 'fish', 'hat', 'sunset', 'bedtime'], reviewedSyllableTasks: reviewed,
    normalizePackKey: normalize,
    flatPackPhoneme: p => typeof p === 'string' ? p : p?.grapheme || p?.ipa || '',
    shuffleForPack: values => [...values].reverse(),
    estimatePackPhonemes: () => [],
    estimatePackSyllables: word => ({ banana: ['ba', 'na', 'na'], papaya: ['pa', 'pa', 'ya'], tomate: ['to', 'ma', 'te'] }[normalize(word)] || [word]),
    packSentenceIsUsable: () => false, packStoryIsUsable: () => false, splitPackSentence: () => null,
    instructionalProfile: {},
  };
  vm.createContext(context);
  vm.runInContext(compilerCode, context);
  return context.compile(items);
}
function itemFor(word, board) {
  return { word, phonemes: [], ...(board ? { activityItems: { syllable_blending: board } } : {}) };
}
const boardFor = (word, options) => ({ ...plain(core.resolveSyllableTask(word, null, 'en-US')), options: options || [word, 'raincoat', 'bedtime', 'teacup'] });
function assetFor(index) {
  const samples = 1600 + index * 160;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(4000 * Math.sin(i * Math.PI * 2 * (200 + index * 75) / 16000)), 44 + i * 2);
  return { mime: 'audio/wav', base64: wav.toString('base64'), durationSeconds: samples / 16000, decoded: true, source: 'teacher_recording' };
}
function recordingFor(word, language = 'en-US', options) {
  const syllables = word === 'sunset' ? ['sun', 'set'] : ['ba', 'na', 'na'];
  const result = core.createReviewedSyllableTask({ targetWord: word, language, revision: 17, syllables,
    assets: syllables.map((_, index) => assetFor(index)), reviewed: true });
  assert.ok(result, 'Valid reviewed fixture');
  return { ...plain(result), options: options || [word, 'papaya', 'tomate', 'bedtime'] };
}
function assertPlayable(board, word) {
  assert.equal(board.supported, true);
  assert.equal(board.targetWord, normalize(word));
  assert.equal(core.validSyllableBoard(board), true);
  assert.equal(board.options.filter(value => value === normalize(word)).length, 1);
}
function assertBlocked(board) {
  assert.equal(board.supported, false);
  assert.deepEqual(plain(board.audioUnits), []);
  assert.deepEqual(plain(board.syllables), []);
  assert.deepEqual(plain(board.options || board.blendingOptions), []);
}
function assertRecordingKept(board, original) {
  assert.equal(core.reviewedSyllableReady(board), true);
  for (const key of ['contentStatus', 'targetWord', 'language', 'revision', 'syllables', 'audioUnits', 'review']) {
    assert.deepEqual(plain(board[key]), plain(original[key]), key + ' preserved');
  }
}
function runtimeContext({ word, board, language = 'en-US', packWord = word, extraWords }) {
  const state = { item: itemFor(packWord, board), data: board ? { ...plain(board), blendingOptions: [...(board.options || [])] } : null,
    items: [itemFor(word, board), ...(extraWords ? extraWords.map(value => itemFor(value)) : [itemFor('raincoat', boardFor('raincoat', ['raincoat', 'sunset']))])], delivered: true, generating: true };
  const context = {
    WS_CORE: core, word, wordSoundsLanguage: language, currentWordSoundsWord: word,
    wordSoundsActivity: 'syllable_blending', wordSoundsPhonemes: state.item, preloadedWords: state.items,
    syllableData: state.data, syllableDataRef: { current: state.data }, syllableDeliveredRef: { current: 'previous' },
    fisherYatesShuffle: values => [...values].reverse(), isHomophone: (a, b) => normalize(a) === normalize(b),
    setSyllableDelivered: value => { state.delivered = value; },
    setIsGeneratingSyllable: value => { state.generating = value; },
    setSyllableData: change => { state.data = typeof change === 'function' ? change(state.data) : change; },
    setWordSoundsPhonemes: change => { state.item = typeof change === 'function' ? change(state.item) : change; },
    setPreloadedWords: change => { state.items = typeof change === 'function' ? change(state.items) : change; },
  };
  vm.createContext(context);
  vm.runInContext(helperCode + '\nglobalThis.generate = () => {' + generateCode + '};\nglobalThis.edit = (index, newValue) => {' + editCode + '};', context);
  return { state, context };
}
function recordingSaveContext(word, board, language, extraWords = ['papaya', 'tomate']) {
  const state = { items: [itemFor(word, board), ...extraWords.map(value => ({ word: value, syllables: ['a', 'b', 'c'] }))], item: itemFor(word, board) };
  const context = {
    WS_CORE: core, target: word, wordSoundsLanguage: language, preloadedWords: state.items,
    preloadedWordCache: { current: new Map([[word, 'old cache']]) },
    fisherYatesShuffle: values => [...values].reverse(), isHomophone: (a, b) => normalize(a) === normalize(b),
    setWsPreloadedWords: null,
    setPreloadedWords: change => { state.items = typeof change === 'function' ? change(state.items) : change; },
    setWordSoundsPhonemes: change => { state.item = typeof change === 'function' ? change(state.item) : change; },
  };
  vm.createContext(context);
  vm.runInContext(helperCode + '\nglobalThis.save = task => {' + saveCode + '};', context);
  return { state, context };
}

let passed = 0, failed = 0;
function test(name, run) {
  try { run(); passed++; console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
}

test('Studio rejects another curated word board and rebuilds a playable current answer', () => {
  const old = freeze(boardFor('snowman', ['snowman', 'raincoat', 'bedtime', 'teacup']));
  const before = plain(old);
  const board = compile([itemFor('sunset', old)])[0].activityItems.syllable_blending;
  assertPlayable(board, 'sunset');
  assert.deepEqual(plain(board.syllables), ['sun', 'set']);
  assert.notDeepEqual(plain(board.options), before.options);
  assert.deepEqual(plain(old), before);
});
test('Studio rejects another curated board identity even when its choices include the current target', () => {
  const old = freeze(boardFor('snowman', ['snowman', 'sunset', 'bedtime']));
  const board = compile([itemFor('sunset', old)])[0].activityItems.syllable_blending;
  assertPlayable(board, 'sunset');
  assert.notDeepEqual(plain(board.options), plain(old.options));
});
test('Studio retains exact valid same-word teacher choice order', () => {
  const old = freeze(boardFor('sunset', ['bedtime', 'teacup', 'sunset', 'raincoat']));
  const board = compile([itemFor(' SunSet ', old)])[0].activityItems.syllable_blending;
  assertPlayable(board, 'sunset');
  assert.deepEqual(plain(board.options), plain(old.options));
  assert.notEqual(board.options, old.options, 'options copied instead of shared');
});
test('Studio repairs duplicate, missing-answer, empty, oversized, and malformed choices', () => {
  for (const options of [['sunset', 'sunset'], ['bedtime', 'teacup'], [], ['sunset'], ['sunset', ''], ['sunset', 9], ['sunset', 'a', 'b', 'c', 'd', 'e', 'f']]) {
    const old = freeze(boardFor('sunset', options));
    const board = compile([itemFor('sunset', old)])[0].activityItems.syllable_blending;
    assertPlayable(board, 'sunset');
    assert.equal(board.options.length, 4);
  }
});
test('Studio preserves recorded units and review while repairing stale choices', () => {
  const old = freeze(recordingFor('banana', 'en-US', ['snowman', 'raincoat']));
  const before = plain(old);
  const board = compile([itemFor('banana', old)])[0].activityItems.syllable_blending;
  assertPlayable(board, 'banana');
  assertRecordingKept(board, old);
  assert.deepEqual(plain(old), before);
});
test('Studio retains exact valid choices for reviewed recordings', () => {
  const old = freeze(recordingFor('banana', 'en-US', ['papaya', 'banana', 'tomate']));
  const board = compile([itemFor('banana', old)])[0].activityItems.syllable_blending;
  assertRecordingKept(board, old);
  assert.deepEqual(plain(board.options), plain(old.options));
});
test('Studio uses the current reviewed recording override without changing its clip order', () => {
  const fresh = freeze(recordingFor('banana', 'en-US', ['tomate', 'banana', 'papaya']));
  const old = recordingFor('banana'); old.audioUnits[0].asset.base64 = assetFor(8).base64;
  const board = compile([itemFor('banana', old)], 'en-US', { banana: fresh })[0].activityItems.syllable_blending;
  assertPlayable(board, 'banana');
  assertRecordingKept(board, fresh);
  assert.deepEqual(plain(board.options), plain(fresh.options));
});
test('Studio keeps valid same-word lesson choices when newly reviewed clips omit options', () => {
  const fresh = recordingFor('banana'); delete fresh.options; freeze(fresh);
  const old = freeze(recordingFor('banana', 'en-US', ['papaya', 'banana', 'tomate']));
  const board = compile([itemFor('banana', old)], 'en-US', { banana: fresh })[0].activityItems.syllable_blending;
  assertPlayable(board, 'banana');
  assertRecordingKept(board, fresh);
  assert.deepEqual(plain(board.options), plain(old.options));
});
test('Studio does not invent audio for unsupported words or languages', () => {
  for (const [word, language, old] of [['banana', 'en-US', null], ['sunset', 'es', boardFor('sunset')], ['sunset', 'en-US', recordingFor('banana')], ['banana', 'es', recordingFor('banana', 'en-US')]]) {
    assertBlocked(compile([itemFor(word, old)], language)[0].activityItems.syllable_blending);
  }
});
test('Studio preserves valid reviewed foreign-language audio and authored choices', () => {
  const old = freeze(recordingFor('banana', 'es', ['tomate', 'banana', 'papaya']));
  const board = compile([itemFor('banana', old)], 'es')[0].activityItems.syllable_blending;
  assertPlayable(board, 'banana');
  assertRecordingKept(board, old);
  assert.deepEqual(plain(board.options), plain(old.options));
});
test('runtime rejects stale prepared board choices even when those choices include current word', () => {
  const old = freeze(boardFor('snowman', ['snowman', 'sunset', 'bedtime']));
  const { context, state } = runtimeContext({ word: 'sunset', board: old });
  context.generate();
  assert.equal(state.data.targetWord, 'sunset');
  assert.ok(state.data.blendingOptions.includes('sunset'));
  assert.notDeepEqual(plain(state.data.blendingOptions), plain(old.options));
  assert.equal(state.delivered, false);
  assert.equal(context.syllableDeliveredRef.current, null);
});
test('runtime keeps valid current reviewed choice order and exact audio', () => {
  const old = freeze(recordingFor('banana', 'en-US', ['papaya', 'banana', 'tomate']));
  const { context, state } = runtimeContext({ word: 'banana', board: old });
  context.generate();
  assertRecordingKept(state.data, old);
  assert.deepEqual(plain(state.data.blendingOptions), plain(old.options));
  assert.equal(state.generating, false);
});
test('runtime repairs unusable choices without changing reviewed clips', () => {
  for (const options of [['banana', 'banana'], ['papaya', 'tomate'], [], ['banana', '']]) {
    const old = freeze(recordingFor('banana', 'en-US', options));
    const { context, state } = runtimeContext({ word: 'banana', board: old });
    context.generate();
    assertRecordingKept(state.data, old);
    assertPlayable({ ...state.data, options: state.data.blendingOptions }, 'banana');
  }
});
test('runtime foreign-language generation repairs choices using only the supplied lesson vocabulary', () => {
  const old = freeze(recordingFor('banana', 'es', ['banana', 'banana']));
  const { context, state } = runtimeContext({ word: 'banana', board: old, language: 'es', extraWords: ['papaya', 'tomate'] });
  context.generate();
  assertRecordingKept(state.data, old);
  assertPlayable({ ...state.data, options: state.data.blendingOptions }, 'banana');
  assert.equal(state.data.blendingOptions.every(option => ['banana', 'papaya', 'tomate'].includes(option)), true);
});
test('runtime blocks unknown or wrong-language recordings without generating replacement audio', () => {
  for (const options of [{ word: 'banana' }, { word: 'banana', board: recordingFor('banana'), language: 'es' }, { word: 'sunset', board: recordingFor('banana') }]) {
    const { context, state } = runtimeContext(options);
    context.generate();
    assertBlocked({ ...state.data, options: state.data.blendingOptions });
  }
});
test('runtime ignores a lagging prepared item while generating current curated target', () => {
  const { context, state } = runtimeContext({ word: 'sunset', packWord: 'snowman', board: boardFor('snowman') });
  context.generate();
  assertPlayable({ ...state.data, options: state.data.blendingOptions }, 'sunset');
  assert.deepEqual(plain(state.data.syllables), ['sun', 'set']);
});
for (const [word, language] of [['banana', 'en-US'], ['sunset', 'en-US'], ['banana', 'es']]) {
  test('runtime choice edit preserves reviewed recordings for ' + word + ' (' + language + ') in live and saved data', () => {
    const old = freeze(recordingFor(word, language, ['papaya', word, 'tomate']));
    const before = plain(old);
    const { context, state } = runtimeContext({ word, language, board: old });
    const untouched = plain(state.items[1]);
    context.edit(0, 'bedtime');
    const saved = state.item.activityItems.syllable_blending;
    assertPlayable(saved, word);
    assertRecordingKept(saved, old);
    assertRecordingKept(state.items[0].activityItems.syllable_blending, old);
    assertRecordingKept(state.data, old);
    assert.deepEqual(plain(saved.options), ['bedtime', word, 'tomate']);
    assert.deepEqual(plain(state.data.blendingOptions), plain(saved.options));
    assert.deepEqual(plain(context.syllableDataRef.current), plain(state.data));
    assert.deepEqual(plain(state.items[1]), untouched);
    assert.deepEqual(plain(old), before);
    assert.equal(state.delivered, false);
    assert.equal(context.syllableDeliveredRef.current, null);
  });
}
test('runtime option edit cannot make an invalid or wrong-context recording supported', () => {
  const invalid = recordingFor('banana'); invalid.review.signature = 'stale';
  for (const fixture of [{ word: 'banana', board: invalid }, { word: 'banana', language: 'es', board: recordingFor('banana') }, { word: 'sunset', board: recordingFor('banana') }]) {
    const { context, state } = runtimeContext(fixture);
    context.edit(0, 'bedtime');
    const saved = state.item.activityItems.syllable_blending;
    assert.equal(core.resolveSyllableTask(fixture.word, saved, fixture.language || 'en-US').supported, false);
    assert.equal(core.reviewedSyllableReady(saved), fixture.board === invalid ? false : true);
  }
});
test('runtime generate then edit cannot promote an unsupported bank-word placeholder to curated audio', () => {
  const old = freeze(recordingFor('banana'));
  const { context, state } = runtimeContext({ word: 'sunset', board: old });
  const before = plain(state.items);
  context.generate();
  assertBlocked({ ...state.data, options: state.data.blendingOptions });
  context.edit(0, 'bedtime');
  assertBlocked({ ...state.data, options: state.data.blendingOptions });
  assert.deepEqual(plain(state.items), before);
  assert.deepEqual(plain(state.item.activityItems.syllable_blending), plain(old));
  assert.equal(core.resolveSyllableTask('sunset', state.item.activityItems.syllable_blending, 'en-US').supported, false);
});
test('saving new reviewed clips retains valid same-word options and synchronizes saved and current item', () => {
  const old = freeze(recordingFor('banana', 'en-US', ['tomate', 'banana', 'papaya']));
  const fresh = recordingFor('banana'); delete fresh.options;
  const { context, state } = recordingSaveContext('banana', old, 'en-US');
  context.save(fresh);
  const board = state.items[0].activityItems.syllable_blending;
  assertPlayable(board, 'banana');
  assertRecordingKept(board, fresh);
  assert.deepEqual(plain(board.options), plain(old.options));
  assert.deepEqual(plain(state.item.activityItems.syllable_blending), plain(board));
  assert.equal(context.preloadedWordCache.current.has('banana'), false);
});
test('saving reviewed clips rejects old options belonging to another target', () => {
  const old = freeze(boardFor('snowman', ['snowman', 'banana', 'teacup']));
  const fresh = recordingFor('banana'); delete fresh.options;
  const { context, state } = recordingSaveContext('banana', old, 'en-US');
  context.save(fresh);
  const board = state.items[0].activityItems.syllable_blending;
  assertPlayable(board, 'banana');
  assertRecordingKept(board, fresh);
  assert.notDeepEqual(plain(board.options), plain(old.options));
});
test('foreign-language recording saves reject old-language choices and use only lesson words as fallback', () => {
  const old = freeze(recordingFor('banana', 'en-US', ['bedtime', 'banana', 'raincoat']));
  const fresh = recordingFor('banana', 'es'); delete fresh.options;
  const { context, state } = recordingSaveContext('banana', old, 'es');
  context.save(fresh);
  const board = state.items[0].activityItems.syllable_blending;
  assertPlayable(board, 'banana');
  assertRecordingKept(board, fresh);
  assert.equal(board.options.every(option => ['banana', 'papaya', 'tomate'].includes(option)), true);
});
console.log('Passed ' + passed + ' syllable choice regression groups; failed ' + failed + '.');
if (failed) process.exitCode = 1;
