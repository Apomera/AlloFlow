const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const live = fs.readFileSync(path.join(root, 'live_aac_source.jsx'), 'utf8');
const win = {};
new Function('window', fs.readFileSync(path.join(root, 'firestore_sync_module.js'), 'utf8'))(win);
const start = live.indexOf('const _alloSerializeResourceForStudentPack = (item, deps = {}) => {');
const end = live.indexOf('const LiveAacBoardDialog =', start);
const audioStart = live.indexOf('function sanitizeWordSoundsAudioProvenance(');
const audioEnd = live.indexOf('const ALLO_AAC_BOARD_FORMAT', audioStart);
assert(start >= 0 && end > start && audioStart >= 0 && audioEnd > audioStart);
const raw = new Function('window', live.slice(audioStart, audioEnd) + live.slice(start, end) + '\nreturn _alloSerializeResourceForStudentPack;')(win);
const pack = item => raw(item, { sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined });
const input = {
  id: 'ws-1', type: 'word-sounds', title: 'Word Sounds (3 words)',
  data: [{ word: 'cat', _ttsAssets: {
    cat: { mime: 'audio/mpeg', base64: 'QUJDRA==' },
    unsafe: { mime: 'text/html', base64: 'PHNjcmlwdD4=' }
  } }, { word: 'dog' }, { word: 'sun' }],
  lessonPlanSequence: ['counting', 'blending'], lessonPlanConfig: { focus: 'short vowels' },
  configSummary: 'Planned practice', isProbeMode: true, probeActivity: 'blending', gameData: { board: [1, 2, 3] },
  karaokeAudio: { version: 4, entries: {} }, karaokeStudentAudio: { version: 4, entries: { x: { audio: 'base64' } } }
};
const packed = pack(input);
assert.deepEqual(packed.lessonPlanSequence, ['counting', 'blending']);
assert.deepEqual(packed.lessonPlanConfig, { focus: 'short vowels' });
assert.equal(packed.isProbeMode, true);
assert.equal(packed.probeActivity, 'blending');
assert.deepEqual(packed.gameData, { board: [1, 2, 3] });
assert.equal(packed.data.length, 3);
assert.deepEqual(packed.data[0]._ttsAssets, { cat: { mime: 'audio/mpeg', base64: 'QUJDRA==' } });
assert.equal(packed.karaokeStudentAudio, undefined);
assert(packed.karaokeAudio == null);
assert.equal(pack(null), null);
assert.equal(pack({ type: 'word-sounds' }), null);
const privateItem = {
  id: 'nested', type: 'quiz', data: { question: 'Public question' },
  sourceProvenance: { signature: 'SECRET source tail', title: 'SECRET file' },
  nested: { sourceSnapshot: { text: 'Public snapshot', signature: 'SECRET signature', preview: 'SECRET preview' } }
};
for (const delivered of [pack(privateItem), win.prepareSessionResourcesForWrite([privateItem]).resources[0]]) {
  assert(!JSON.stringify(delivered).includes('SECRET'));
  assert.equal(delivered.nested.sourceSnapshot.text, 'Public snapshot');
}
console.log('PASS: exact mailbox WordSounds fixture and nested provenance privacy smoke');
