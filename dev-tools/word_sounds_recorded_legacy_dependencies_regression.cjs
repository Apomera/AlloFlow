const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const installed = fs.existsSync(path.join(__dirname, '..', 'word_sounds_core.js'));
const repo = installed ? path.resolve(__dirname, '..') : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
let source = fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8');
if (!installed && !process.argv.includes('--repo')) source = require('./transform.cjs').core(source);
const core = vm.runInNewContext(source + '\ncreateWordSoundsCore()', { Buffer, atob, btoa, Intl });
const wav = Buffer.alloc(4844); wav.write('RIFF'); wav.writeUInt32LE(4836, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(4800, 40);
const asset = { mime: 'audio/wav', base64: wav.toString('base64'), source: 'teacher_recording', decoded: true, durationSeconds: .1 };
const board = { ...core.createReviewedSyllableTask({ targetWord: 'raincoat', syllables: ['rain', 'coat'], language: 'en', revision: 1, assets: [asset, asset], reviewed: true }), options: ['raincoat', 'backpack', 'sunset'], answer: 'raincoat' };
const fixture = () => [{ targetWord: 'raincoat', syllables: ['rain', 'coat'], activityItems: { syllable_blending: board }, _ttsRequiredKeys: ['raincoat', 'rain', 'coat', 'opaque prompt'] }];
const normalize = words => core.normalizeRecordedSyllableDependencies(words, 'en');
const keys = words => Array.from(words.flatMap(item => item._ttsRequiredKeys || []));
let groups = 0;
const test = (name, fn) => { fn(); groups++; console.log('PASS ' + name); };
test('top-level canonical Sound Swap response stays required alongside reviewed syllables', () => {
  const words = fixture(), task = core.resolveManipulationTask('train', null, 'en');
  assert.equal(task.answer, 'rain'); assert.ok(core.manipulationReady(task));
  words.push({ targetWord: 'train', manipulationTask: task, _preparedActivities: ['manipulation'] });
  assert.deepEqual(keys(normalize(words)), ['raincoat', 'rain', 'opaque prompt']);
});
test('legacy rhyme, blending, orthography and syllable response fields preserve matching speech', () => {
  for (const field of ['rhymeWord', 'rhymeWords', 'rhymes', 'rhymeDistractors', 'blendingDistractors', 'orthographyDistractors', 'syllableBlendingOptions']) {
    const words = fixture(); words.push({ targetWord: 'train', [field]: field === 'rhymeWord' ? 'rain' : ['rain'] });
    assert.deepEqual(keys(normalize(words)), ['raincoat', 'rain', 'opaque prompt'], field);
  }
});
test('split legacy Sound Swap prompt fragments retain their required speech key', () => {
  const words = fixture(); words.push({ targetWord: 'train', manipulationTask: { instruction: '/r/ rain /t/' } });
  assert.deepEqual(keys(normalize(words)), ['raincoat', 'rain', 'opaque prompt']);
});
test('ordinary recorded syllable parts still disappear and spare clips do not protect them', () => {
  const words = fixture(); words[0]._ttsAssets = { rain: asset, coat: asset };
  assert.deepEqual(keys(normalize(words)), ['raincoat', 'opaque prompt']);
  assert.equal(normalize(words)[0]._ttsAssets, words[0]._ttsAssets);
});
test('legacy protection is immutable, idempotent and valid syntax', () => {
  const words = fixture(); words[0].rhymeDistractors = ['rain']; const snapshot = JSON.stringify(words);
  const next = normalize(words); assert.equal(JSON.stringify(words), snapshot); assert.equal(normalize(next), next);
  require(path.join(repo, 'node_modules/@babel/parser')).parse(source, { sourceType: 'unambiguous' });
});
console.log(JSON.stringify({ passed: groups, failed: 0 }));
