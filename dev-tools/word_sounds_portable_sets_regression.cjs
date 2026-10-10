const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_REPO || path.resolve(__dirname, '..');
const sourceArg = process.argv.find(arg => arg.startsWith('--source='));
const file = sourceArg ? path.resolve(sourceArg.slice('--source='.length)) : path.join(repo, 'word_sounds_module.js');
const { JSDOM } = require(path.join(repo, 'node_modules/jsdom'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(path.join(repo, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.join(repo, 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(path.join(repo, 'desktop/web-app/node_modules/react-dom/test-utils')).act;
const timers = new Map(), played = [], downloads = [], revoked = [], decodeLog = [];
let decodePlan = [], activeDecodes = 0, maxActiveDecodes = 0, saveCalls = 0, libraryWrites = 0;
class Audio {
  constructor(src) { this.src = src; this.ended = false; this.paused = true; }
  play() { this.paused = false; played.push(this); return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.paused = true; this.onpause?.(); this.onended?.(); }
}
class OfflineAudioContext {
  async decodeAudioData(bytes) {
    const step = decodePlan.shift(), call = { bytes: bytes.byteLength, finished: false };
    decodeLog.push(call); activeDecodes++; maxActiveDecodes = Math.max(maxActiveDecodes, activeDecodes);
    try {
      if (step) await step();
      const view = new DataView(bytes), sampleRate = view.getUint32(24, true), channels = view.getUint16(22, true), frames = view.getUint32(40, true) / (channels * 2);
      return { sampleRate, duration: frames / sampleRate, numberOfChannels: channels,
        getChannelData(channel) { return Float32Array.from({ length: frames }, (_, frame) => view.getInt16(44 + (frame * channels + channel) * 2, true) / 32768); } };
    } finally { activeDecodes--; call.finished = true; }
  }
}
dom.window.OfflineAudioContext = OfflineAudioContext;
dom.window.URL.createObjectURL = blob => { const url = 'blob:recording-set-' + downloads.length; downloads.push({ blob, url }); return url; };
dom.window.URL.revokeObjectURL = url => revoked.push(url);
dom.window.HTMLAnchorElement.prototype.click = function () {
  const entry = downloads.find(item => item.url === this.href); assert.ok(entry, 'Download uses its own object URL'); entry.filename = this.download; entry.clicked = true;
};
const context = { React, window: dom.window, navigator: dom.window.navigator, document: dom.window.document, console, Audio,
  Blob, URL: dom.window.URL, TextEncoder, TextDecoder, Uint8Array, Float32Array, ArrayBuffer, DataView, Array, Math, Number, Error, AbortController,
  btoa: text => Buffer.from(text, 'binary').toString('base64'), atob: text => Buffer.from(text, 'base64').toString('binary'),
  setTimeout: (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms === 350 ? 0 : ms); timers.set(timer, ms); return timer; },
  clearTimeout: timer => { timers.delete(timer); clearTimeout(timer); } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8') + '\nglobalThis.WS_CORE = createWordSoundsCore();', context);
const source = fs.readFileSync(file, 'utf8'), start = source.indexOf('// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY'), end = source.indexOf('// END WORD SOUNDS SYLLABLE RECORDING EDITOR');
assert.ok(start >= 0 && end > start, 'Current library and editor extraction markers exist');
vm.runInContext(source.slice(start, end) + '\nglobalThis.Editor = WordSoundsSyllableRecordingEditor;', context);
const library = context.createWordSoundsReviewedLibrary(context.WS_CORE, null);
assert.equal(typeof library.exportSet, 'function', 'Portable export API exists');
assert.equal(typeof library.parseSet, 'function', 'Portable import parser exists');
const makeLibrary = context.createWordSoundsReviewedLibrary;
context.createWordSoundsReviewedLibrary = (...args) => {
  const value = makeLibrary(...args), save = value.save;
  value.save = (...saveArgs) => { libraryWrites++; return save(...saveArgs); };
  return value;
};
const plain = value => JSON.parse(JSON.stringify(value));
const makeAsset = gain => {
  const pcm = new Float32Array(16000); for (let i = 4000; i < 12000; i++) pcm[i] = gain * Math.sin(i * Math.PI / 16);
  return { mime: 'audio/wav', base64: Buffer.from(context.encodeWordSoundsSyllableWav([pcm], 16000)).toString('base64'), durationSeconds: 1, decoded: true, source: 'teacher_recording' };
};
const oldAssets = [makeAsset(.11), makeAsset(.13)], newAssets = [makeAsset(.23), makeAsset(.31)];
const task = (word, assets, revision = 1) => context.WS_CORE.createReviewedSyllableTask({ targetWord: word, language: 'en', syllables: ['first', 'second'], assets, revision, reviewed: true });
const board = task('sunset', oldAssets), imported = task('sunset', newAssets, 2), incomingText = library.exportSet(imported, 'sunset', 'en-US');
let root, saved, props;
const delay = () => new Promise(resolve => setTimeout(resolve, 10));
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);
const status = () => [...document.querySelectorAll('[role=status]')].at(-1)?.textContent || '';
const confirm = () => [...document.querySelectorAll('label')].find(el => el.textContent.includes('I listened to the sequence'))?.querySelector('input');
const importInput = () => [...document.querySelectorAll('label')].find(el => el.textContent.includes('Import recording set'))?.querySelector('input[type=file]');
async function click(node) { assert.ok(node, 'Requested control exists'); await act(async () => { node.click(); await delay(); }); }
async function settle(fn = () => {}) { await act(async () => { fn(); await delay(); }); }
async function mount(next = {}) {
  if (root) await act(async () => root.unmount());
  root = createRoot(document.getElementById('root'));
  props = { word: 'sunset', language: 'en-US', board, onSave: value => { saved = value; saveCalls++; }, ...next };
  await act(async () => { root.render(React.createElement(context.Editor, props)); await delay(); });
}
async function rerender(next) { props = { ...props, ...next }; await act(async () => { root.render(React.createElement(context.Editor, props)); await delay(); }); }
async function load(text = incomingText) {
  const input = importInput(); assert.ok(input, 'Import recording set file control exists');
  Object.defineProperty(input, 'files', { configurable: true, value: [new Blob([text], { type: 'application/json' })] });
  await settle(() => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
}
async function hear(index, asset) {
  await click(button('Hear syllable ' + (index + 1)));
  assert.equal(played.at(-1).src, context.WS_CORE.syllableAssetSource(asset)); await settle(() => played.at(-1).finish());
}
async function previewAndConfirm() {
  const first = played.length; await click(button('Preview syllables in order'));
  for (let i = 0; i < 2; i++) await settle(() => { assert.ok(played[first + i], 'Sequence clip ' + (i + 1) + ' started'); played[first + i].finish(); });
  await click(confirm()); assert.equal(button('Save reviewed syllables').disabled, false);
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function rejectEnvelope(patch) { const envelope = JSON.parse(incomingText); patch(envelope); assert.throws(() => library.parseSet(JSON.stringify(envelope), 'sunset', 'en-US')); }
async function run() {
  const extra = plain(imported); extra.options = ['sunset', 'other']; extra.privateNote = 'excluded'; extra.audioUnits[0].asset.originalAsset = oldAssets[0];
  const exported = JSON.parse(library.exportSet(extra, ' SUNSET ', 'English'));
  assert.deepEqual(Object.keys(exported).sort(), ['format', 'language', 'task', 'version', 'word']);
  assert.equal(exported.format, 'alloflow.word-sounds-recordings'); assert.equal(exported.version, 1); assert.equal(exported.word, 'sunset'); assert.equal(exported.language, 'en-us');
  assert.equal(exported.task.options, undefined); assert.equal(exported.task.privateNote, undefined); assert.equal(exported.task.audioUnits[0].asset.originalAsset, undefined);
  assert.deepEqual(exported.task.audioUnits.map(unit => unit.asset.base64), newAssets.map(asset => asset.base64));
  assert.deepEqual(plain(library.parseSet(JSON.stringify(exported), 'SUNSET', 'en_US')), plain(library.cleanTask(imported, 'sunset', 'en-US')));
  console.log('PASS export whitelists one normalized word and qualified language while preserving clip order and round-trip');

  assert.throws(() => library.parseSet(incomingText, 'tomato', 'en-US')); assert.throws(() => library.parseSet(incomingText, 'sunset', 'en-GB'));
  rejectEnvelope(value => { value.format = 'unknown'; }); rejectEnvelope(value => { value.version = 2; });
  rejectEnvelope(value => { value.task.audioUnits[0].asset.base64 = oldAssets[0].base64; });
  for (const invalid of ['{', 'null', '[]', '42', '"text"']) assert.throws(() => library.parseSet(invalid, 'sunset', 'en-US'));
  console.log('PASS parser rejects another word/dialect, format/version, tampered reviewed clips and malformed envelopes');

  const large = JSON.parse(incomingText); large.padding = 'x'.repeat(2 * 1024 * 1024); assert.throws(() => library.parseSet(JSON.stringify(large), 'sunset', 'en-US'));
  large.padding = '😀'.repeat(600000); const unicodeLarge = JSON.stringify(large);
  assert.ok(unicodeLarge.length < 2 * 1024 * 1024 && Buffer.byteLength(unicodeLarge, 'utf8') > 2 * 1024 * 1024);
  assert.throws(() => library.parseSet(unicodeLarge, 'sunset', 'en-US'));
  console.log('PASS parser enforces serialized UTF-8 byte limit including multibyte JSON');

  await mount(); await click(button('Download saved recording set'));
  assert.equal(downloads.length, 1); assert.equal(downloads[0].clicked, true); assert.ok(downloads[0].filename);
  const downloaded = library.parseSet(await downloads[0].blob.text(), 'sunset', 'en-US');
  assert.deepEqual(downloaded.audioUnits.map(unit => unit.asset.base64).join(','), oldAssets.map(asset => asset.base64).join(','));
  assert.equal(saveCalls, 0); assert.equal(libraryWrites, 0);
  console.log('PASS saved set download contains the saved lesson recordings without mutating lesson/library');

  await previewAndConfirm(); const gate = deferred(), decodeStart = decodeLog.length;
  decodePlan = [() => gate.promise]; await load();
  assert.equal(decodeLog.length, decodeStart + 1, 'Only first decoder starts before its completion');
  assert.equal(button('Save reviewed syllables').disabled, true); assert.equal(confirm().checked, false);
  assert.equal(saveCalls, 0); assert.equal(libraryWrites, 0);
  await settle(gate.resolve); await settle();
  assert.equal(decodeLog.length, decodeStart + 2); assert.equal(maxActiveDecodes, 1); assert.ok(decodeLog.slice(decodeStart).every(call => call.finished));
  assert.equal(confirm().disabled, true); assert.equal(confirm().checked, false); assert.equal(button('Save reviewed syllables').disabled, true);
  await hear(0, newAssets[0]); await hear(1, newAssets[1]);
  assert.equal(button('Save reviewed syllables').disabled, true, 'Individual previews cannot approve imported sequence');
  assert.equal(saveCalls, 0); assert.equal(libraryWrites, 0);
  await click(button('Download saved recording set'));
  const stillSaved = library.parseSet(await downloads.at(-1).blob.text(), 'sunset', 'en-US');
  assert.equal(stillSaved.audioUnits[0].asset.base64, oldAssets[0].base64, 'Download exports the saved board, never an unreviewed imported draft');
  await previewAndConfirm(); await click(button('Save reviewed syllables'));
  assert.equal(saveCalls, 1); assert.equal(libraryWrites, 0);
  assert.deepEqual(plain(saved.audioUnits.map(unit => unit.asset.base64)), newAssets.map(asset => asset.base64));
  console.log('PASS import decodes sequentially, stages atomically, requires fresh complete preview and confirmation before saving');

  await mount(); const beforeInvalid = decodeLog.length; await load('{');
  assert.equal(decodeLog.length, beforeInvalid); await hear(0, oldAssets[0]); await hear(1, oldAssets[1]);
  assert.equal(saveCalls, 1); assert.equal(libraryWrites, 0);
  console.log('PASS invalid import does not decode or replace any existing clip');

  await mount(); decodePlan = [() => Promise.resolve(), () => Promise.reject(new Error('Invalid clip two'))]; await load(); await settle();
  await hear(0, oldAssets[0]); await hear(1, oldAssets[1]); assert.equal(button('Save reviewed syllables').disabled, true);
  assert.equal(saveCalls, 1); assert.equal(libraryWrites, 0);
  console.log('PASS second-clip decode failure preserves the complete previous recording set');

  await mount(); const cancelGate = deferred(); decodePlan = [() => cancelGate.promise]; const cancelledStart = decodeLog.length; await load();
  await click(button('Cancel audio check')); const cancelledStatus = status(); await settle(cancelGate.resolve); await settle();
  assert.equal(status(), cancelledStatus); assert.equal(decodeLog.length, cancelledStart + 1, 'Cancelled import does not begin the next decode');
  await hear(0, oldAssets[0]); await hear(1, oldAssets[1]); assert.equal(saveCalls, 1); assert.equal(libraryWrites, 0);
  console.log('PASS cancelled import ignores late decode, stops subsequent work and preserves prior units');

  await mount(); const wordGate = deferred(); decodePlan = [() => wordGate.promise]; await load();
  await rerender({ word: 'tomato', board: task('tomato', oldAssets, 8) }); const wordStatus = status(); await settle(wordGate.resolve); await settle();
  assert.equal(status(), wordStatus); await hear(0, oldAssets[0]); await hear(1, oldAssets[1]); assert.equal(saveCalls, 1);
  console.log('PASS word change prevents a late import from replacing the new word recordings');

  await mount(); const languageGate = deferred(); decodePlan = [() => languageGate.promise]; await load();
  await rerender({ language: 'en-GB' }); const languageStatus = status(); await settle(languageGate.resolve); await settle();
  assert.equal(status(), languageStatus); await hear(0, oldAssets[0]); await hear(1, oldAssets[1]); assert.equal(saveCalls, 1);
  console.log('PASS qualified language change invalidates pending import output');

  await mount(); const unmountGate = deferred(); decodePlan = [() => unmountGate.promise]; const unmountedStart = decodeLog.length; await load();
  await act(async () => root.unmount()); root = null; await settle(unmountGate.resolve); await settle();
  assert.equal(decodeLog.length, unmountedStart + 1); assert.equal(document.getElementById('root').childElementCount, 0);
  assert.equal(saveCalls, 1); assert.equal(libraryWrites, 0); assert.equal(activeDecodes, 0);
  console.log('PASS unmount discards pending import without lesson/library writes or further decoding');
  console.log('PASS portable reviewed recording sets: 11 regression groups');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (root) await act(async () => root.unmount());
  for (const timer of timers.keys()) clearTimeout(timer); dom.window.close();
});
