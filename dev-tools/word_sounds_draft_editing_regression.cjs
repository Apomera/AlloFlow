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
const timers = new Map(), played = [], downloads = [];
let decodePlan = [], loadPlan = [], saveCalls = 0;
class Audio {
  constructor(src) { this.src = src; this.ended = false; this.paused = true; }
  play() { this.paused = false; played.push(this); return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.paused = true; this.onpause?.(); this.onended?.(); }
}
class OfflineAudioContext {
  async decodeAudioData(bytes) {
    const step = decodePlan.shift(); if (step) await step();
    const view = new DataView(bytes), sampleRate = view.getUint32(24, true), channels = view.getUint16(22, true), frames = view.getUint32(40, true) / (channels * 2);
    return { sampleRate, duration: frames / sampleRate, numberOfChannels: channels,
      getChannelData(channel) { return Float32Array.from({ length: frames }, (_, frame) => view.getInt16(44 + (frame * channels + channel) * 2, true) / 32768); } };
  }
}
dom.window.OfflineAudioContext = OfflineAudioContext;
dom.window.URL.createObjectURL = blob => { const url = 'blob:draft-set-' + downloads.length; downloads.push({ blob, url }); return url; };
dom.window.URL.revokeObjectURL = () => {};
dom.window.HTMLAnchorElement.prototype.click = function () { assert.ok(downloads.some(entry => entry.url === this.href)); };
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
const library = context.createWordSoundsReviewedLibrary(context.WS_CORE, null), makeLibrary = context.createWordSoundsReviewedLibrary;
context.createWordSoundsReviewedLibrary = (...args) => {
  const value = makeLibrary(...args);
  // Exercise editor transitions with deterministic storage latency. IndexedDB integrity
  // and conflict handling are covered by the existing recording-library suite.
  value.load = (...loadArgs) => loadPlan.length ? loadPlan.shift()(...loadArgs) : Promise.resolve({ task: null, token: null });
  return value;
};
const plain = value => JSON.parse(JSON.stringify(value));
const makeAsset = gain => {
  const pcm = new Float32Array(16000); for (let i = 4000; i < 12000; i++) pcm[i] = gain * Math.sin(i * Math.PI / 16);
  return { mime: 'audio/wav', base64: Buffer.from(context.encodeWordSoundsSyllableWav([pcm], 16000)).toString('base64'), durationSeconds: 1, decoded: true, source: 'teacher_recording' };
};
const assets = [.11, .17, .23, .31].map(makeAsset), freshAssets = [.37, .41].map(makeAsset);
const task = (word, useAssets = assets, labels = ['one', 'two', 'three', 'four'], revision = 1) => {
  const result = context.WS_CORE.createReviewedSyllableTask({ targetWord: word, language: 'en', syllables: labels, assets: useAssets, revision, reviewed: true });
  assert.ok(result, 'Fixture is a reviewed syllable task'); return result;
};
const board = task('watermelon'), imported = task('watermelon', freshAssets, ['new first', 'new second'], 2), incomingText = library.exportSet(imported, 'watermelon', 'en-US');
let root, saved, props;
const delay = () => new Promise(resolve => setTimeout(resolve, 10));
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);
const move = (index, direction) => [...document.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === `Move syllable ${index + 1} ${direction}`);
const hints = () => [...document.querySelectorAll('input[placeholder="Written hint"]')];
const labels = () => hints().map(el => el.value);
const row = index => hints()[index].parentElement.parentElement;
const select = () => document.querySelector('select');
const confirm = () => [...document.querySelectorAll('label')].find(el => el.textContent.includes('I listened to the sequence'))?.querySelector('input');
const importInput = () => [...document.querySelectorAll('label')].find(el => el.textContent.includes('Import recording set'))?.querySelector('input[type=file]');
async function click(node) { assert.ok(node, 'Requested control exists'); await act(async () => { node.click(); await delay(); }); }
async function settle(fn = () => {}) { await act(async () => { fn(); await delay(); }); }
async function mount(next = {}) {
  if (root) await act(async () => root.unmount());
  root = createRoot(document.getElementById('root'));
  props = { word: 'watermelon', language: 'en-US', board, onSave: value => { saved = value; saveCalls++; }, ...next };
  await act(async () => { root.render(React.createElement(context.Editor, props)); await delay(); });
}
async function rerender(next) { props = { ...props, ...next }; await act(async () => { root.render(React.createElement(context.Editor, props)); await delay(); }); }
async function count(value) { const input = select(); assert.equal(input.disabled, false, 'Count change is available'); await settle(() => { input.value = String(value); input.dispatchEvent(new dom.window.Event('change', { bubbles: true })); }); assert.equal(hints().length, value); }
async function label(index, value) {
  const input = hints()[index]; assert.ok(input); await settle(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  }); assert.equal(hints()[index].value, value);
}
async function load(text = incomingText) {
  const input = importInput(); assert.ok(input);
  Object.defineProperty(input, 'files', { configurable: true, value: [new Blob([text], { type: 'application/json' })] });
  await settle(() => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
}
async function upload(index, asset) {
  const input = [...document.querySelectorAll('label')].find(el => el.textContent.startsWith('Upload syllable ' + (index + 1)))?.querySelector('input[type=file]');
  assert.ok(input); Object.defineProperty(input, 'files', { configurable: true, value: [new Blob([Buffer.from(asset.base64, 'base64')], { type: asset.mime })] });
  await settle(() => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
}
async function hear(index, asset, original = false) {
  await click(button((original ? 'Hear original syllable ' : 'Hear syllable ') + (index + 1)));
  const result = played.at(-1).src; if (asset) assert.equal(result, context.WS_CORE.syllableAssetSource(asset));
  await settle(() => played.at(-1).finish()); return result;
}
async function previewAndConfirm(expectedAssets) {
  const first = played.length; await click(button('Preview syllables in order'));
  for (let i = 0; i < expectedAssets.length; i++) await settle(() => {
    assert.ok(played[first + i], 'Sequence clip ' + (i + 1) + ' started');
    assert.equal(played[first + i].src, typeof expectedAssets[i] === 'string' ? expectedAssets[i] : context.WS_CORE.syllableAssetSource(expectedAssets[i]));
    played[first + i].finish();
  });
  assert.equal(played.length, first + expectedAssets.length, 'Only active units are played');
  await click(confirm()); assert.equal(button('Save reviewed syllables').disabled, false);
}
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function assertBlankTail() { assert.deepEqual(labels().slice(2), ['', '']); assert.equal(button('Hear syllable 3').disabled, true); assert.equal(button('Hear syllable 4').disabled, true); }
function assertEditingLocked() { assert.equal(select().disabled, true); for (let i = 0; i < hints().length; i++) { assert.equal(move(i, 'earlier')?.disabled, true); assert.equal(move(i, 'later')?.disabled, true); } }
async function run() {
  await mount(); await click(button('Clean up syllable 3')); const cleanThird = await hear(2), summary = row(2).querySelector('span').textContent;
  assert.notEqual(cleanThird, context.WS_CORE.syllableAssetSource(assets[2]));
  await count(2); await count(4); assert.deepEqual(labels(), ['one', 'two', 'three', 'four']);
  assert.equal(await hear(2), cleanThird); await hear(2, assets[2], true); assert.equal(row(2).querySelector('span').textContent, summary);
  assert.ok(button('Undo cleanup syllable 3')); await hear(3, assets[3]);
  console.log('PASS reducing and restoring count retains labels, checked audio, original comparison, cleanup summary and undo');

  await count(2); await count(3); await label(2, 'third revised'); await upload(2, freshAssets[0]);
  assert.equal(button('Hear original syllable 3'), undefined); await count(2); await count(4);
  assert.deepEqual(labels(), ['one', 'two', 'third revised', 'four']); await hear(2, freshAssets[0]); await hear(3, assets[3]);
  assert.equal(button('Hear original syllable 3'), undefined, 'Older restored cleanup cannot overwrite a new recording');
  await label(3, 'fourth revised'); await count(3); await count(4); assert.equal(labels()[3], 'fourth revised');
  console.log('PASS partial restores and repeated count changes recover the latest edited unit without reviving stale assets');

  await mount(); await count(2); await previewAndConfirm(assets.slice(0, 2)); await click(button('Save reviewed syllables'));
  assert.deepEqual(plain(saved.syllables), ['one', 'two']); assert.equal(saved.audioUnits.length, 2);
  assert.deepEqual(plain(saved.audioUnits.map(unit => unit.asset.base64)), assets.slice(0, 2).map(asset => asset.base64));
  await count(4); assertBlankTail();
  await rerender({ board: saved }); await click(button('Download saved recording set'));
  const downloaded = library.parseSet(await downloads.at(-1).blob.text(), 'watermelon', 'en-US');
  assert.equal(downloaded.audioUnits.length, 2); assert.deepEqual(plain(downloaded.syllables), ['one', 'two']);
  await count(4); assertBlankTail();
  console.log('PASS hidden draft units are excluded from playback, lesson save and saved portable export');

  await mount(); await click(button('Clean up syllable 2')); const cleanedSecond = await hear(1), secondSummary = row(1).querySelector('span').textContent;
  assert.equal(move(0, 'earlier').disabled, true); assert.equal(move(3, 'later').disabled, true);
  await click(move(1, 'earlier')); assert.deepEqual(labels(), ['two', 'one', 'three', 'four']);
  assert.equal(document.activeElement, hints()[0], 'Focus follows moved unit to its written hint');
  assert.equal(await hear(0), cleanedSecond); await hear(0, assets[1], true); assert.equal(row(0).querySelector('span').textContent, secondSummary);
  assert.equal(button('Hear original syllable 2'), undefined); await hear(1, assets[0]);
  await click(button('Undo cleanup syllable 1')); await hear(0, assets[1]);
  console.log('PASS moving earlier carries the complete recording unit, keeps undo attached, respects boundaries and moves focus');

  await previewAndConfirm([assets[1], assets[0], assets[2], assets[3]]); await click(move(0, 'later'));
  assert.equal(document.activeElement, hints()[1]); assert.deepEqual(labels(), ['one', 'two', 'three', 'four']);
  assert.equal(confirm().checked, false); assert.equal(confirm().disabled, true); assert.equal(button('Save reviewed syllables').disabled, true);
  await previewAndConfirm(assets); await click(button('Save reviewed syllables')); assert.deepEqual(plain(saved.syllables), ['one', 'two', 'three', 'four']);
  assert.deepEqual(plain(saved.audioUnits.map(unit => unit.asset.base64)), assets.map(asset => asset.base64));
  console.log('PASS moving later invalidates prior sequence approval and saves only after review of the new order');

  await mount(); await click(button('Preview syllables in order')); assertEditingLocked(); await click(button('Stop preview'));
  const decodeGate = deferred(); decodePlan = [() => decodeGate.promise]; await upload(0, freshAssets[0]); assertEditingLocked();
  await click(button('Cancel audio check')); await settle(decodeGate.resolve); assert.equal(select().disabled, false); assert.equal(move(1, 'earlier').disabled, false);
  await hear(0, assets[0]);
  console.log('PASS count and move controls cannot race active playback or audio checking and unlock after cancellation');

  await mount(); const libraryGate = deferred(); loadPlan = [() => libraryGate.promise]; await click(button('Find saved recording')); assertEditingLocked();
  await settle(() => libraryGate.resolve({ task: imported, token: 'library-token' }));
  assert.equal(select().disabled, false); assert.equal(move(1, 'earlier').disabled, false);
  console.log('PASS count and move controls wait for pending library work');

  await mount({ board: null }); await count(4); await label(2, 'old word'); await upload(2, assets[2]); await count(2);
  await rerender({ word: 'tomato' }); await count(4); assert.deepEqual(labels(), ['to', 'ma', 'to', '']);
  assert.equal(button('Hear syllable 3').disabled, true); assert.equal(button('Hear syllable 4').disabled, true);
  console.log('PASS changing the word discards hidden recordings from the previous word');

  await mount({ board: null }); await count(4); await label(2, 'old language'); await upload(2, assets[2]); await count(2);
  await rerender({ language: 'en-GB' }); await count(4); assert.deepEqual(labels(), ['wa', 'ter', 'mel', 'on']);
  assert.equal(button('Hear syllable 3').disabled, true); assert.equal(button('Hear syllable 4').disabled, true);
  console.log('PASS changing recording language discards hidden recordings from the previous language');

  await mount(); await count(2); await rerender({ board: imported }); await count(4); assert.deepEqual(labels().slice(0, 2), ['new first', 'new second']); assertBlankTail();
  console.log('PASS a new saved board revision cannot recover stale hidden draft recordings');

  await mount(); await count(2); await load(); await settle(); assert.deepEqual(labels(), ['new first', 'new second']); await count(4); assertBlankTail();
  await hear(0, freshAssets[0]); await hear(1, freshAssets[1]); assert.equal(button('Save reviewed syllables').disabled, true);
  console.log('PASS successful import replaces the draft and clears recordings hidden by an earlier count change');

  await mount(); await count(2); decodePlan = [() => Promise.resolve(), () => Promise.reject(new Error('Bad imported clip'))]; await load(); await settle(); await count(4);
  assert.deepEqual(labels(), ['one', 'two', 'three', 'four']); await hear(2, assets[2]); await hear(3, assets[3]);
  await count(2); const cancelGate = deferred(); decodePlan = [() => cancelGate.promise]; await load(); await click(button('Cancel audio check'));
  await settle(cancelGate.resolve); await count(4); assert.deepEqual(labels(), ['one', 'two', 'three', 'four']); await hear(2, assets[2]); await hear(3, assets[3]);
  console.log('PASS failed and cancelled imports preserve recoverable hidden units as well as visible recordings');

  await mount(); await count(2); loadPlan = [() => Promise.resolve({ task: imported, token: 'saved-two' })]; await click(button('Find saved recording'));
  const beforeLibrarySave = saveCalls; await click(button('Use saved recordings in this lesson')); assert.equal(saveCalls, beforeLibrarySave + 1);
  assert.deepEqual(labels(), ['new first', 'new second']); await count(4); assertBlankTail(); await hear(0, freshAssets[0]); await hear(1, freshAssets[1]);
  console.log('PASS applying a saved library set clears hidden units from the replaced draft');
  const eightAssets = [...assets, ...freshAssets, assets[0], assets[1]];
  const eightLabels = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  await mount({ board: task('watermelon', eightAssets, eightLabels) });
  await count(2); await count(8); assert.deepEqual(labels(), eightLabels);
  await previewAndConfirm(eightAssets); await click(button('Save reviewed syllables'));
  assert.deepEqual(plain(saved.syllables), eightLabels);
  assert.equal(context.WS_CORE.reviewedSyllableReady(saved), true);
  console.log('PASS eight recording slots survive count changes, ordered preview, review and saving');
  console.log('PASS recording draft count recovery and reordering: 14 regression groups');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (root) await act(async () => root.unmount());
  for (const timer of timers.keys()) clearTimeout(timer); dom.window.close();
});
