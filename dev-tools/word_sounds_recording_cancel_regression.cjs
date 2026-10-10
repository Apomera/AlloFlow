const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_REPO || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = process.argv.includes('--repo') ? path.join(repo, 'word_sounds_module.js') : path.join(__dirname, 'candidate/word_sounds_module.js');
const { JSDOM } = require(path.join(repo, 'node_modules/jsdom'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
global.window = dom.window; global.document = dom.window.document; Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true }); global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(path.join(repo, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.join(repo, 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(path.join(repo, 'desktop/web-app/node_modules/react-dom/test-utils')).act;
const played = [], captures = [], timers = new Map();
class Audio {
  constructor(src) { this.src = src; this.ended = false; this.paused = true; }
  play() { this.paused = false; played.push(this); return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.paused = true; this.onpause?.(); this.onended?.(); }
}
let decodeGate = null, microphoneGate = null, microphoneStream = null;
class OfflineAudioContext {
  async decodeAudioData(bytes) {
    if (decodeGate) { const gate = decodeGate; decodeGate = null; await gate; }
    const view = new DataView(bytes), sampleRate = view.getUint32(24, true), channels = view.getUint16(22, true), frames = view.getUint32(40, true) / (channels * 2);
    return { sampleRate, duration: frames / sampleRate, numberOfChannels: channels,
      getChannelData(channel) { return Float32Array.from({ length: frames }, (_, frame) => view.getInt16(44 + (frame * channels + channel) * 2, true) / 32768); } };
  }
}
class MediaRecorder {
  constructor(stream) { this.stream = stream; this.state = 'inactive'; this.mimeType = 'audio/wav'; captures.push(this); }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.onstop?.(); }
  chunk(blob) { this.ondataavailable?.({ data: blob }); }
  fail() { this.state = 'inactive'; this.onerror?.(); this.onstop?.(); }
}
const makeStream = () => { const track = { stopped: false, stop() { this.stopped = true; } }; return { track, getTracks: () => [track] }; };
dom.window.OfflineAudioContext = OfflineAudioContext;
Object.defineProperty(dom.window.navigator, 'mediaDevices', { value: { getUserMedia: () => microphoneGate || Promise.resolve(microphoneStream) }, configurable: true });
const context = { React, window: dom.window, navigator: dom.window.navigator, document: dom.window.document, console, Audio, MediaRecorder, Blob, Uint8Array, Float32Array, ArrayBuffer, DataView, Array, Math, Number, Error, AbortController,
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
  setTimeout: (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms === 350 ? 0 : ms); timers.set(timer, ms); return timer; },
  clearTimeout: timer => { timers.delete(timer); clearTimeout(timer); } };
vm.createContext(context); vm.runInContext(fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8') + '\nglobalThis.WS_CORE = createWordSoundsCore();', context);
const source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY');
const end = source.indexOf('// END WORD SOUNDS SYLLABLE RECORDING EDITOR');
vm.runInContext(source.slice(start, end) + '\nglobalThis.Editor = WordSoundsSyllableRecordingEditor;', context);
const pcm = new Float32Array(16000); for (let i = 4800; i < 11200; i++) pcm[i] = .2 * Math.sin(i * Math.PI / 16);
const wav = context.encodeWordSoundsSyllableWav([pcm], 16000);
const original = { mime: 'audio/wav', base64: Buffer.from(wav).toString('base64'), durationSeconds: 1, decoded: true, source: 'teacher_recording' };
const board = context.WS_CORE.createReviewedSyllableTask({ targetWord: 'sunset', language: 'en', syllables: ['sun', 'set'], assets: [original, original], revision: 1, reviewed: true });
const modifiedPcm = new Float32Array(pcm); for (let i = 0; i < modifiedPcm.length; i++) modifiedPcm[i] *= .5;
const modifiedWav = context.encodeWordSoundsSyllableWav([modifiedPcm], 16000);
const modifiedBlob = () => new Blob([modifiedWav], { type: 'audio/wav' });
let root, saved;
const delay = () => new Promise(resolve => setTimeout(resolve, 10));
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);
const status = () => [...document.querySelectorAll('[role=status]')].at(-1).textContent;
const confirm = () => [...document.querySelectorAll('label')].find(el => el.textContent.includes('I listened to the sequence')).querySelector('input');
async function click(node) { assert.ok(node, 'Requested control exists'); await act(async () => { node.click(); await delay(); }); }
async function settle(fn) { await act(async () => { fn(); await delay(); }); }
async function assertOriginal() {
  await click(button('Hear syllable 1')); assert.equal(played.at(-1).src, context.WS_CORE.syllableAssetSource(original)); await settle(() => played.at(-1).finish());
}
async function fullPreview() {
  const first = played.length; await click(button('Preview syllables in order'));
  for (let index = 0; index < 2; index++) await settle(() => { assert.ok(played[first + index]); played[first + index].finish(); });
  await click(confirm()); assert.equal(button('Save reviewed syllables').disabled, false);
}
async function run() {
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(context.Editor, { word: 'sunset', language: 'en', board, onSave: task => { saved = task; } })));
  let resolveMicrophone;
  microphoneGate = new Promise(resolve => { resolveMicrophone = resolve; });
  const lateStream = makeStream();
  await click(button('Record syllable 1'));
  assert.equal(button('Stop recording'), undefined); assert.equal(button('Cancel microphone request').disabled, false);
  await click(button('Cancel microphone request'));
  assert.equal(button('Record syllable 1').disabled, false); assert.match(status(), /Recording cancelled/);
  await settle(() => resolveMicrophone(lateStream)); microphoneGate = null;
  assert.equal(lateStream.track.stopped, true); assert.equal(captures.length, 0); assert.match(status(), /Recording cancelled/);
  await assertOriginal();
  console.log('PASS pending microphone cancellation restores controls, stops late stream, preserves original');

  microphoneStream = makeStream(); await click(button('Record syllable 1'));
  const cancelledCapture = captures.at(-1); cancelledCapture.chunk(modifiedBlob());
  assert.ok(button('Stop recording')); assert.ok(button('Cancel recording'));
  await click(button('Cancel recording'));
  assert.equal(microphoneStream.track.stopped, true); assert.equal(cancelledCapture.state, 'inactive');
  assert.equal([...timers.values()].includes(7800), false); assert.equal(confirm().disabled, true);
  await assertOriginal();
  console.log('PASS cancelling active recording discards partial chunks, ends track and timer');

  let releaseDecode; decodeGate = new Promise(resolve => { releaseDecode = resolve; });
  const upload = document.querySelector('input[type=file][accept="audio/*"]');
  Object.defineProperty(upload, 'files', { configurable: true, value: [modifiedBlob()] });
  await settle(() => upload.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
  await click(button('Cancel audio check'));
  const cancelledStatus = status(); await settle(releaseDecode);
  assert.equal(status(), cancelledStatus); await assertOriginal();
  console.log('PASS cancelling file validation ignores late decoded output and preserves original');

  decodeGate = new Promise(resolve => { releaseDecode = resolve; });
  await click(button('Clean up syllable 1')); await click(button('Cancel cleanup'));
  await settle(releaseDecode);
  assert.equal(button('Hear original syllable 1'), undefined); await assertOriginal();
  console.log('PASS cancelling cleanup discards late processed audio and keeps previous checked clip');

  await fullPreview();
  const previewStart = played.length; await click(button('Preview syllables in order'));
  await click(button('Stop preview'));
  assert.equal(played[previewStart].paused, true); assert.equal(played.length, previewStart + 1);
  assert.equal(confirm().checked, false); assert.equal(confirm().disabled, true); assert.equal(button('Save reviewed syllables').disabled, true);
  await delay(); assert.equal(played.length, previewStart + 1); assert.equal([...timers.values()].includes(12000), false);
  await fullPreview(); await click(button('Save reviewed syllables')); assert.equal(saved.audioUnits[0].asset.base64, original.base64);
  console.log('PASS stopping preview ends audio, prevents later syllables and requires full review again');

  microphoneStream = makeStream(); await click(button('Record syllable 1'));
  const failedCapture = captures.at(-1); failedCapture.chunk(modifiedBlob());
  await settle(() => failedCapture.fail());
  assert.match(status(), /Microphone recording failed/); assert.equal(microphoneStream.track.stopped, true);
  assert.equal([...timers.values()].includes(7800), false); assert.equal(confirm().disabled, true);
  await assertOriginal();
  console.log('PASS MediaRecorder error followed by stop cannot install partial recording');

  microphoneStream = makeStream(); await click(button('Record syllable 1'));
  captures.at(-1).chunk(modifiedBlob()); await click(button('Stop recording'));
  assert.match(status(), /Clip checked/); await click(button('Hear syllable 1'));
  assert.equal(played.at(-1).src, 'data:audio/wav;base64,' + Buffer.from(modifiedWav).toString('base64'));
  await settle(() => played.at(-1).finish()); await fullPreview(); await click(button('Save reviewed syllables'));
  assert.equal(saved.audioUnits[0].asset.base64, Buffer.from(modifiedWav).toString('base64'));
  console.log('PASS Stop recording retains intended clip and normal review/save remains usable');

  let resolveUnmounted; microphoneGate = new Promise(resolve => { resolveUnmounted = resolve; });
  await click(button('Record syllable 1')); const unmountedStream = makeStream();
  await act(async () => root.unmount()); await settle(() => resolveUnmounted(unmountedStream));
  assert.equal(unmountedStream.track.stopped, true);
  console.log('PASS unmount also discards a pending microphone result');
  console.log('PASS editor cancellation DOM workflow: 8 groups');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { for (const timer of timers.keys()) clearTimeout(timer); dom.window.close(); });
