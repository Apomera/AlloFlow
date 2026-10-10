const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const installed = fs.existsSync(path.join(__dirname, '..', 'word_sounds_core.js'));
const repo = installed ? path.resolve(__dirname, '..') : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const staged = !installed && !process.argv.includes('--repo'), transform = staged && require('./transform.cjs');
const read = (name, kind) => { const text = fs.readFileSync(path.join(repo, name), 'utf8'); return staged && kind ? transform[kind](text) : text; };
const coreSource = read('word_sounds_core.js', 'core'), runtime = read('word_sounds_module.js', 'runtime');
const core = vm.runInNewContext(coreSource + '\ncreateWordSoundsCore()', { Buffer, atob, btoa, Intl });
let readinessSource = read('word_sounds_readiness_contract.js', 'readiness');
if (staged) readinessSource = readinessSource.replace(/\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/, '// BEGIN GENERATED WORD SOUNDS CORE\n' + coreSource.trim() + '\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE');
const context = { module: { exports: {} }, Buffer, atob, btoa, Intl }; vm.runInNewContext(readinessSource, context);
const readiness = context.module.exports, plain = value => JSON.parse(JSON.stringify(value));
const wav = Buffer.alloc(4844); wav.write('RIFF'); wav.writeUInt32LE(4836, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(4800, 40);
const asset = { mime: 'audio/wav', base64: wav.toString('base64'), source: 'teacher_recording', decoded: true, durationSeconds: 0.1 };
const board = (word = 'sunset', parts = ['sun', 'set'], language = 'English') => ({ ...core.createReviewedSyllableTask({ targetWord: word, syllables: parts, language, revision: 1, assets: parts.map(() => asset), reviewed: true }), options: [word, 'backpack', 'raincoat'], answer: word });
const fixture = () => [{ targetWord: 'sunset', syllables: ['sun', 'set'], activityItems: { syllable_blending: board() }, _ttsRequiredKeys: ['sunset', 'sun', 'set', 'backpack', 'raincoat', 'opaque teacher prompt'] }];
const keys = words => plain(words.flatMap(item => item._ttsRequiredKeys || []));
const normalize = (words, previous) => core.normalizeRecordedSyllableDependencies(words, 'English', previous);
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
test('valid reviewed audio removes stale standalone syllables without mutating boards or assets', () => {
  const words = fixture(), before = JSON.stringify(words), next = normalize(words);
  assert.deepEqual(keys(next), ['sunset', 'backpack', 'raincoat', 'opaque teacher prompt']);
  assert.equal(JSON.stringify(words), before); assert.equal(next[0].activityItems, words[0].activityItems);
  assert.equal(next[0].activityItems.syllable_blending.audioUnits, words[0].activityItems.syllable_blending.audioUnits);
  assert.equal(normalize(next), next);
});
test('lesson-wide first-item manifest drops obsolete dependencies belonging to later items', () => {
  const words = fixture(); words[0].targetWord = 'raincoat'; words[0].syllables = ['rain', 'coat']; words[0].activityItems.syllable_blending = { ...core.resolveSyllableTask('raincoat', null, 'English'), options: ['raincoat', 'sunset', 'backpack'], answer: 'raincoat' };
  words[0]._ttsRequiredKeys.push('rain', 'coat'); words.push({ targetWord: 'sunset', syllables: ['sun', 'set'], activityItems: { syllable_blending: board() } });
  assert.deepEqual(keys(normalize(words)), ['sunset', 'backpack', 'raincoat', 'opaque teacher prompt', 'rain', 'coat']);
});
test('cross-item targets and authored response choices retain matching fragment keys', () => {
  const words = fixture(); words.push({ targetWord: 'set' }); words[0].activityItems.syllable_blending.options.push('sun');
  assert.equal(normalize(words), words);
  words[0].activityItems.syllable_blending.options.pop(); assert.deepEqual(keys(normalize(words)), ['sunset', 'set', 'backpack', 'raincoat', 'opaque teacher prompt']);
});
test('other activities and curated words retain every consumed fragment', () => {
  for (const [activity, extra] of Object.entries({ word_families: { options: ['sun'], distractors: ['set'], rime: 'un' }, sentence_match: { sequence: ['sun'], extras: ['set'] }, syllable_counting: { syllables: ['sun', 'set'] }, read_passage: { story: 'sun', options: ['set'] }, custom: { prompt: { speech: ['sun', 'set'] } } })) {
    const words = fixture(); words[0].activityItems[activity] = extra; assert.equal(normalize(words), words, activity);
  }
  const words = fixture(); words.push({ targetWord: 'sunset', activityItems: { syllable_blending: { ...core.resolveSyllableTask('sunset', null, 'English'), options: ['sunset', 'backpack', 'raincoat'], answer: 'sunset' } } });
  assert.equal(normalize(words), words);
});
test('invalid or mismatched recording review cannot hide missing audio dependencies', () => {
  for (const alter of [b => { b.review.signature = 'stale'; }, b => { b.targetWord = 'sunrise'; }, b => { b.audioUnits[0].asset.base64 = ''; }, b => { b.options = ['sunset']; }]) {
    const words = plain(fixture()); alter(words[0].activityItems.syllable_blending); assert.equal(normalize(words), words);
  }
  const words = fixture(); assert.equal(core.normalizeRecordedSyllableDependencies(words, 'Spanish'), words);
});
test('save can prune replaced labels using prior matching word while preserving opaque keys', () => {
  const previous = fixture(); previous[0].syllables = ['suhn', 'seht']; previous[0].activityItems.syllable_blending = { targetWord: 'sunset', syllables: ['suhn', 'seht'], audioUnits: [{ key: 'suhn', text: 'suhn' }, { key: 'seht', text: 'seht' }] }; previous[0]._ttsRequiredKeys.push('suhn', 'seht');
  const next = [{ ...previous[0], syllables: ['sun', 'set'], activityItems: { syllable_blending: board() } }];
  assert.deepEqual(keys(normalize(next, previous)), ['sunset', 'backpack', 'raincoat', 'opaque teacher prompt']);
  previous[0].targetWord = 'different'; assert.ok(keys(normalize(next, previous)).includes('suhn'));
});
test('opaque unrelated keys, duplicate form and retained ordering stay unchanged', () => {
  const words = fixture(); words[0]._ttsRequiredKeys = [' SET ', 'Opaque:Prefix/key', 'sunset', 'Opaque:Prefix/key', 'sun'];
  assert.deepEqual(keys(normalize(words)), ['Opaque:Prefix/key', 'sunset', 'Opaque:Prefix/key']);
  assert.equal(core.normalizeRecordedSyllableDependencies(null, 'English'), null);
});
test('real runtime prepared audio memo does not request nonexistent standalone recorded parts', () => {
  const start = runtime.indexOf('      const preparedAudioTargets = React.useMemo('), end = runtime.indexOf('      const preparedAudioStartupTargets', start);
  const run = words => vm.runInNewContext(runtime.slice(start, end) + '\npreparedAudioTargets', { WS_CORE: core, React: { useMemo: fn => fn() }, preloadedWords: words, wordSoundsLanguage: 'English' });
  assert.deepEqual(plain(run(fixture())), ['sunset', 'backpack', 'raincoat', 'opaque teacher prompt']);
  const words = fixture(); words.push({ targetWord: 'set' }); assert.ok(run(words).includes('set'));
});
test('runtime teacher save persists normalized whole-lesson manifest including old syllable labels', () => {
  const start = runtime.indexOf('onSave: (task) => {', runtime.indexOf('renderSyllableEditor:')), end = runtime.indexOf('\n              }\n', start) + '\n              }'.length;
  const words = fixture(); words[0].activityItems.syllable_blending = { targetWord: 'sunset', syllables: ['suhn', 'seht'], options: ['sunset', 'backpack', 'raincoat'] }; words[0].syllables = ['suhn', 'seht']; words[0]._ttsRequiredKeys.push('suhn', 'seht');
  let saved, active; const save = vm.runInNewContext('({' + runtime.slice(start, end) + '}).onSave', { WS_CORE: core, target: 'sunset', preloadedWords: words, wordSoundsLanguage: 'English', buildSyllableOptions: (target, options) => options, fisherYatesShuffle: x => x, isHomophone: () => false, preloadedWordCache: { current: new Map() }, setWsPreloadedWords: update => { saved = update(words); }, setWordSoundsPhonemes: update => { active = update(words[0]); } });
  save(board()); assert.deepEqual(keys(saved), ['sunset', 'backpack', 'raincoat', 'opaque teacher prompt']); assert.deepEqual(keys([active]), keys(saved)); assert.equal(saved[0].activityItems.syllable_blending.contentStatus, 'teacher_recorded');
});
test('readiness and portable round trip no longer demand obsolete standalone clips', () => {
  const resource = { type: 'word-sounds', data: fixture(), lessonPlanSequence: ['syllable_blending'], sessionConfig: { wordSoundsLanguage: 'English' } };
  for (const value of [resource, readiness.portable(resource)]) {
    const result = readiness.requirements(value), speech = result.entries.filter(row => row.category === 'speech').map(row => row.key);
    assert.equal(result.contentIssues.length, 0); assert.ok(!speech.includes('sun')); assert.ok(!speech.includes('set')); assert.ok(speech.includes('opaque teacher prompt')); assert.ok(speech.includes('backpack'));
  }
  resource.data.push({ targetWord: 'set', activityItems: { syllable_blending: board('set', ['s', 'et']) } });
  assert.ok(readiness.requirements(resource).entries.some(row => row.category === 'speech' && row.key === 'set'));
});
test('readiness refresh replaces old cached contract version', () => {
  const old = { VERSION: 5, portable() {} }; const host = { AlloModules: { WordSoundsReadiness: old }, Buffer, atob, btoa, Intl };
  vm.runInNewContext(readinessSource, host); assert.equal(host.AlloModules.WordSoundsReadiness.VERSION, 6); assert.notEqual(host.AlloModules.WordSoundsReadiness, old);
});
test('readiness accepts absent and empty resources without throwing', () => {
  for (const value of [null, undefined, {}]) {
    const result = readiness.requirements(value);
    assert.equal(result.wordCount, 0);
    assert.equal(result.contentIssues.length, 0);
  }
});
test('all changed production sources parse', () => {
  const parser = require(path.join(repo, 'node_modules/@babel/parser')); for (const source of [coreSource, runtime, readinessSource]) parser.parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] });
});
console.log(JSON.stringify({ passed, failed: 0 }));
