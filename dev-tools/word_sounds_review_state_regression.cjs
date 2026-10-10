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
let decodePlan = [], loadPlan = [], savePlan = [], saveArguments = [], saveCalls = 0;
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
  value.save = (...args) => { saveArguments.push(args); return savePlan.length ? savePlan.shift()(...args) : Promise.reject(new Error("Unexpected library save")); };
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

const summary = () => document.querySelector('details > summary').textContent;
function state(value) { assert.ok(summary().endsWith(' — ' + value), 'Expected ' + value + ', got ' + summary()); }
function guidance() {
  const preview = button('Preview syllables in order'), save = button('Save reviewed syllables');
  const id = preview.getAttribute('aria-describedby');
  assert.ok(id, 'Preview references next-step guidance');
  assert.equal(save.getAttribute('aria-describedby'), id, 'Save references the same guidance');
  const node = document.getElementById(id); assert.ok(node, 'Referenced next-step guidance exists'); return node.textContent;
}
const statusText = () => [...document.querySelectorAll('[role=status]')].map(el => el.textContent).join(' ');
const remember = () => [...document.querySelectorAll('label')].find(el => el.textContent.includes('Also save or replace'))?.querySelector('input[type=checkbox]');
async function previewOnly(expectedAssets) {
  const first = played.length; await click(button('Preview syllables in order'));
  for (let i = 0; i < expectedAssets.length; i++) await settle(() => {
    assert.equal(played[first + i]?.src, context.WS_CORE.syllableAssetSource(expectedAssets[i])); played[first + i].finish();
  });
}
async function run() {
  await mount(); state('saved in lesson');
  assert.match(guidance(), /lesson already has this reviewed set/i);
  assert.equal(confirm().disabled, true); assert.equal(button('Save reviewed syllables').disabled, true);
  assert.equal(button('Download saved recording set').disabled, false);
  console.log('PASS existing lesson recordings are truthfully saved without granting a fresh draft review');

  await mount({ word: 'tomato' }); state('not saved'); assert.deepEqual(labels(), ['', '']);
  await mount({ language: 'fr' }); state('not saved'); assert.deepEqual(labels(), ['', '']);
  const corrupt = plain(board); corrupt.review.signature += '-changed'; await mount({ board: corrupt }); state('not saved');
  await mount({ word: ' WATERMELON ', language: 'English' }); state('saved in lesson');
  console.log('PASS saved state requires a valid task for the current word and supported language, including normalized aliases');

  await mount({ board: null }); state('not saved');
  assert.match(guidance(), /labels for syllables 1, 2/i); assert.match(guidance(), /recordings for syllables 1, 2/i);
  await label(0, 'one'); await upload(1, assets[1]);
  assert.match(guidance(), /labels for syllable 2\./i); assert.match(guidance(), /recordings for syllable 1\./i);
  await label(1, 'two'); await upload(0, assets[0]); assert.match(guidance(), /preview the full sequence/i);
  await previewOnly(assets.slice(0, 2)); assert.match(guidance(), /confirm that you listened/i); assert.equal(button('Save reviewed syllables').disabled, true);
  await click(confirm()); assert.match(guidance(), /ready to save/i); assert.equal(button('Save reviewed syllables').disabled, false);
  console.log('PASS next-step guidance identifies exact missing positions and advances through complete preview and confirmation');

  await mount(); await label(0, 'one revised'); state('unsaved changes'); await label(0, ' one '); state('saved in lesson');
  await count(2); state('unsaved changes'); await count(4); state('saved in lesson');
  await click(move(0, 'later')); state('unsaved changes'); await click(move(1, 'earlier')); state('saved in lesson');
  await upload(0, freshAssets[0]); state('unsaved changes'); await upload(0, assets[0]); state('saved in lesson');
  console.log('PASS displayed label, count, order and clip edits mark unsaved changes while exact restoration and trimmed labels match');

  const shortBoard = task('watermelon', assets.slice(0, 2), ['one', 'two']);
  await mount({ board: shortBoard }); await count(4); await label(2, 'hidden'); await upload(2, assets[2]); await count(2); state('saved in lesson');
  await click(button('Clean up syllable 1')); state('unsaved changes'); await click(button('Undo cleanup syllable 1')); state('saved in lesson');
  await rerender({ board: { ...shortBoard, blendingOptions: ['watermelon', 'dinosaur', 'tomato'], unrelated: 'changed' } }); state('saved in lesson');
  await rerender({ board: task('watermelon', assets.slice(0, 2), ['one', 'two'], 123) }); state('saved in lesson');
  console.log('PASS omitted units, cleanup history, answer choices and revision metadata do not falsely mark the displayed set unsaved');

  await act(async () => { root.unmount(); }); root = createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(React.Fragment, null,
    React.createElement(context.Editor, { word: 'watermelon', language: 'en-US', board, onSave() {} }),
    React.createElement(context.Editor, { word: 'tomato', language: 'en-US', board: null, onSave() {} }))); await delay(); });
  const editors = [...document.querySelectorAll('#root > details')]; assert.equal(editors.length, 2);
  const guidanceIds = editors.map(editor => {
    const controls = [...editor.querySelectorAll('button')]; const preview = controls.find(el => el.textContent === 'Preview syllables in order');
    const save = controls.find(el => el.textContent === 'Save reviewed syllables'); const id = preview.getAttribute('aria-describedby');
    assert.ok(id); assert.equal(save.getAttribute('aria-describedby'), id); assert.ok(editor.contains(document.getElementById(id))); return id;
  });
  assert.equal(new Set(guidanceIds).size, 2, 'Each mounted editor owns unique guidance');
  assert.match(document.getElementById(guidanceIds[0]).textContent, /lesson already has/i);
  assert.match(document.getElementById(guidanceIds[1]).textContent, /labels for syllables 1, 2/i);
  console.log('PASS simultaneous word editors link preview and save to unique, correctly scoped guidance');

  await mount(); await click(button('Preview syllables in order')); assert.match(guidance(), /listen.*stop the preview/i); await click(button('Stop preview'));
  const decodeGate = deferred(); decodePlan = [() => decodeGate.promise]; await upload(0, freshAssets[0]); assert.match(guidance(), /wait for the audio check.*cancel/i);
  await click(button('Cancel audio check')); await settle(decodeGate.resolve); state('saved in lesson');
  const libraryGate = deferred(); loadPlan = [() => libraryGate.promise]; await click(button('Find saved recording')); assert.match(guidance(), /wait for the local library/i);
  await settle(() => libraryGate.resolve({ task: null, token: null })); assert.match(guidance(), /lesson already has/i);
  console.log('PASS ongoing playback, checking and library work show actionable waiting guidance and recover on cancellation/completion');

  let failLesson = true, attempts = 0;
  await mount({ onSave: value => { attempts++; if (failLesson) throw new Error('lesson-store-failed'); saved = value; } });
  await count(2); await previewAndConfirm(assets.slice(0, 2)); await click(button('Save reviewed syllables'));
  assert.equal(attempts, 1); state('unsaved changes'); assert.match(statusText(), /could not be applied to this lesson.*draft is kept/i);
  assert.equal(confirm().checked, true); assert.equal(button('Save reviewed syllables').disabled, false);
  await count(4); assert.deepEqual(labels(), ['one', 'two', 'three', 'four']); await hear(2, assets[2]); await hear(3, assets[3]);
  await count(2); await previewAndConfirm(assets.slice(0, 2)); failLesson = false; await click(button('Save reviewed syllables')); assert.equal(attempts, 2);
  await count(4); assertBlankTail();
  console.log('PASS synchronous lesson-save failures retain reviewed retry state and omitted clips; successful retry alone clears extras');

  failLesson = true;
  await mount({ onSave: value => { if (failLesson) throw new Error('lesson-store-failed'); saved = value; } });
  await label(0, 'current draft'); await count(2); loadPlan = [() => Promise.resolve({ task: imported, token: 'found-token' })]; await click(button('Find saved recording'));
  await click(button('Use saved recordings in this lesson')); assert.deepEqual(labels(), ['current draft', 'two']); state('unsaved changes');
  assert.match(statusText(), /saved recordings could not be applied.*current draft is kept/i);
  assert.doesNotMatch(statusText(), /unavailable|saved recordings applied/i);
  await count(4); assert.deepEqual(labels(), ['current draft', 'two', 'three', 'four']); await hear(2, assets[2]);
  await count(2); failLesson = false; await click(button('Use saved recordings in this lesson')); assert.deepEqual(labels(), ['new first', 'new second']);
  await count(4); assertBlankTail();
  console.log('PASS applying library recordings commits before replacing the draft and preserves all visible/hidden clips when rejected');

  failLesson = true; saveArguments = [];
  await mount({ onSave: value => { if (failLesson) throw new Error('lesson-store-failed'); saved = value; } });
  await count(2); await previewAndConfirm(assets.slice(0, 2)); loadPlan = [() => Promise.resolve({ task: null, token: 'old-token' })]; await click(remember());
  savePlan = [(_word, _language, value) => Promise.resolve({ task: value, token: 'new-token' })]; await click(button('Save reviewed syllables'));
  assert.equal(saveArguments[0][3].expectedToken, 'old-token');
  assert.match(statusText(), /saved in the local library, but could not be applied to this lesson/i);
  assert.match(statusText(), /draft is kept/i); assert.doesNotMatch(statusText(), /saved with this lesson and in the local library/i);
  assert.equal(confirm().checked, true); assert.equal(button('Save reviewed syllables').disabled, false);
  failLesson = false; savePlan = [(_word, _language, value) => Promise.resolve({ task: value, token: 'latest-token' })]; await click(button('Save reviewed syllables'));
  assert.equal(saveArguments[1][3].expectedToken, 'new-token', 'Retry uses the successfully persisted local token');
  assert.match(statusText(), /saved with this lesson and in the local library/i);
  await rerender({ board: saved }); state('saved in lesson'); await count(4); assertBlankTail();
  console.log('PASS local save success followed by lesson failure retains the new storage token and truthful separate outcomes for retry');

  failLesson = true; saveArguments = [];
  await mount({ onSave: value => { if (failLesson) throw new Error('lesson-store-failed'); saved = value; } });
  await label(0, 'revised'); await previewAndConfirm(assets); loadPlan = [() => Promise.resolve({ task: board, token: 'stable-token' })]; await click(remember());
  savePlan = [() => Promise.reject(Object.assign(new Error('storage quota'), { code: 'quota' }))]; await click(button('Save reviewed syllables'));
  assert.match(statusText(), /could not be applied to this lesson.*draft is kept/i); assert.doesNotMatch(statusText(), /lesson recordings saved|saved with this lesson/i);
  assert.equal(confirm().checked, true); failLesson = false;
  savePlan = [(_word, _language, value) => Promise.resolve({ task: value, token: 'retried-token' })]; await click(button('Save reviewed syllables'));
  assert.equal(saveArguments[1][3].expectedToken, 'stable-token', 'Failed local write cannot advance the token');
  console.log('PASS combined storage and lesson failures keep the draft and old token without claiming a successful save');

  await mount(); await label(0, 'pending acknowledgement'); await previewAndConfirm(assets); await click(button('Save reviewed syllables'));
  state('unsaved changes'); await rerender({ board: saved }); state('saved in lesson');
  assert.match(guidance(), /lesson already has this reviewed set/i); assert.equal(button('Save reviewed syllables').disabled, true);
  console.log('PASS saved summary reflects the actual lesson board after parent acknowledgement rather than optimistic callback success');
  console.log('PASS recording review guidance and truthful saved state: 12 regression groups');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (root) await act(async () => root.unmount());
  for (const timer of timers.keys()) clearTimeout(timer); dom.window.close();
});
