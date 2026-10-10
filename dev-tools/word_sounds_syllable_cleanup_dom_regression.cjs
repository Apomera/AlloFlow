const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_REPO || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = process.argv.includes('--repo') ? path.join(repo, 'word_sounds_module.js') : path.join(__dirname, 'candidate/word_sounds_module.js');
const { JSDOM } = require(path.join(repo, 'node_modules/jsdom'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
global.window = dom.window; global.document = dom.window.document; Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true }); global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(path.join(repo, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.join(repo, 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(path.join(repo, 'desktop/web-app/node_modules/react-dom/test-utils')).act;
const played = [];
class Audio {
  constructor(src) { this.src = src; this.ended = false; this.paused = true; }
  play() { this.paused = false; played.push(this); return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.paused = true; this.onpause?.(); this.onended?.(); }
}
let decodeFailure = false, decodeGate = null;
class OfflineAudioContext {
  async decodeAudioData(bytes) {
    if (decodeFailure) throw new Error('Simulated corrupt audio');
    if (decodeGate) { const gate = decodeGate; decodeGate = null; await gate; }
    const view = new DataView(bytes), sampleRate = view.getUint32(24, true), channels = view.getUint16(22, true), frames = view.getUint32(40, true) / (channels * 2);
    return { sampleRate, duration: frames / sampleRate, numberOfChannels: channels,
      getChannelData(channel) { return Float32Array.from({ length: frames }, (_, frame) => view.getInt16(44 + (frame * channels + channel) * 2, true) / 32768); } };
  }
}
dom.window.OfflineAudioContext = OfflineAudioContext;
const context = { React, window: dom.window, navigator: dom.window.navigator, document: dom.window.document, console, Audio, Blob, Uint8Array, Float32Array, ArrayBuffer, DataView, Array, Math, Number, Error, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: (fn, ms) => setTimeout(fn, ms === 350 ? 0 : ms), clearTimeout };
vm.createContext(context); vm.runInContext(fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8') + '\nglobalThis.WS_CORE = createWordSoundsCore();', context);
const source = fs.readFileSync(file, 'utf8');
const libraryStart = source.indexOf('// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY');
const editorStart = source.indexOf('// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR');
vm.runInContext(source.slice(libraryStart >= 0 ? libraryStart : editorStart, source.indexOf('// END WORD SOUNDS SYLLABLE RECORDING EDITOR')) + '\nglobalThis.Editor = WordSoundsSyllableRecordingEditor;', context);
const originalPcm = new Float32Array(16000); for (let i = 4800; i < 11200; i++) originalPcm[i] = .2 * Math.sin(i * Math.PI / 16);
const wav = context.encodeWordSoundsSyllableWav([originalPcm], 16000);
const original = { mime: 'audio/wav', base64: Buffer.from(wav).toString('base64'), durationSeconds: 1, decoded: true, source: 'teacher_recording' };
const board = context.WS_CORE.createReviewedSyllableTask({ targetWord: 'sunset', language: 'en', syllables: ['sun', 'set'], assets: [original, original], revision: 1, reviewed: true });
assert.ok(board);
let root, saved;
const delay = () => new Promise(resolve => setTimeout(resolve, 10));
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);
const editorStatus = () => [...document.querySelectorAll('[role=status]')].at(-1);
const confirm = () => [...document.querySelectorAll('label')].find(el => el.textContent.includes('I listened to the sequence')).querySelector('input');
async function click(node) { await act(async () => { node.click(); await delay(); }); }
async function fullPreview() {
  const start = played.length; await click(button('Preview syllables in order'));
  for (let i = 0; i < 2; i++) await act(async () => { assert.ok(played[start + i]); played[start + i].finish(); await delay(); });
  await click(confirm()); assert.equal(button('Save reviewed syllables').disabled, false);
}
async function run() {
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(context.Editor, { word: 'sunset', language: 'en', board, onSave: task => { saved = task; } })));
  await fullPreview();
  await click(button('Clean up syllable 1'));
  assert.equal(button('Save reviewed syllables').disabled, true); assert.equal(confirm().checked, false); assert.equal(confirm().disabled, true);
  assert.match(editorStatus().textContent, /Compare with the original/);
  assert.ok(button('Hear original syllable 1')); assert.ok(button('Undo cleanup syllable 1'));
  console.log('PASS cleanup invalidates full-sequence review and exposes comparison/undo');
  await click(button('Hear original syllable 1')); assert.equal(played.at(-1).src, context.WS_CORE.syllableAssetSource(original));
  await act(async () => { played.at(-1).finish(); await delay(); }); assert.equal(confirm().disabled, true);
  await fullPreview(); await click(button('Save reviewed syllables'));
  assert.ok(saved); assert.equal(context.WS_CORE.reviewedSyllableReady(saved), true); assert.notEqual(saved.audioUnits[0].asset.base64, original.base64);
  assert.equal(saved.audioUnits[1].asset.base64, original.base64); assert.equal(saved.audioUnits[0].asset.mime, 'audio/wav');
  assert.ok(!JSON.stringify(saved).includes('originalAsset')); assert.ok(!JSON.stringify(saved).includes('cleanupSummary'));
  const cleanedOnce = saved.audioUnits[0].asset.base64;
  console.log('PASS original preview cannot approve; cleaned bytes save only after full preview/review');
  await click(button('Clean up syllable 1')); await fullPreview(); await click(button('Save reviewed syllables'));
  assert.equal(saved.audioUnits[0].asset.base64, cleanedOnce);
  console.log('PASS repeated cleanup starts from preserved original, avoiding accumulated edits');
  await click(button('Undo cleanup syllable 1')); assert.equal(button('Save reviewed syllables').disabled, true); assert.equal(button('Hear original syllable 1'), undefined);
  await fullPreview(); await click(button('Save reviewed syllables')); assert.equal(saved.audioUnits[0].asset.base64, original.base64);
  console.log('PASS undo restores exact original bytes and requires fresh sequence review');
  const trim = [...document.querySelectorAll('label')].find(el => el.textContent.trim() === 'Trim outer silence').querySelector('input');
  const level = [...document.querySelectorAll('label')].find(el => el.textContent.trim() === 'Level volume').querySelector('input');
  await click(trim); await click(level); assert.equal(button('Clean up syllable 1').disabled, true);
  await click(level); assert.equal(button('Clean up syllable 1').disabled, false);
  console.log('PASS cleanup options are explicit and disabled when neither operation is selected');
  decodeFailure = true;
  await click(button('Clean up syllable 1'));
  decodeFailure = false;
  assert.match(editorStatus().textContent, /could not be decoded/);
  assert.equal(button('Hear original syllable 1'), undefined);
  assert.equal(button('Save reviewed syllables').disabled, true);
  await fullPreview(); await click(button('Save reviewed syllables'));
  assert.equal(saved.audioUnits[0].asset.base64, original.base64);
  console.log('PASS failed cleanup preserves exact previous recording and requires renewed review');
  let releaseDecode;
  decodeGate = new Promise(resolve => { releaseDecode = resolve; });
  await click(button('Clean up syllable 1'));
  assert.equal(button('Clean up syllable 1').disabled, true);
  await act(async () => root.render(React.createElement(context.Editor, { word: 'rainbow', language: 'en', board: null, onSave: task => { saved = task; } })));
  await act(async () => { releaseDecode(); await delay(); });
  assert.equal(editorStatus().textContent, '');
  assert.equal(button('Hear original syllable 1'), undefined);
  assert.equal(button('Hear syllable 1').disabled, true);
  assert.equal(button('Save reviewed syllables').disabled, true);
  console.log('PASS changing target during asynchronous cleanup discards stale output');
  await act(async () => root.unmount());
  console.log('PASS recording cleanup DOM workflow: 7 groups');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
