const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const installed = fs.existsSync(path.join(__dirname, '..', 'word_sounds_core.js'));
const root = installed ? path.resolve(__dirname, '..') : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const source = fs.readFileSync(path.join(root, 'word_sounds_module.js'), 'utf8');
const runtime = installed || process.argv.includes('--repo') ? source : require('./transform.cjs').runtime(source);
const core = vm.runInNewContext(fs.readFileSync(path.join(root, 'word_sounds_core.js'), 'utf8') + '\ncreateWordSoundsCore()', { atob, btoa, Buffer, Intl });
const wav = Buffer.alloc(4844); wav.write('RIFF'); wav.writeUInt32LE(4836, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(4800, 40); for (let i = 44; i < wav.length; i += 2) wav.writeInt16LE(Math.round(Math.sin(i / 10) * 3000), i);
const clip = { mime: 'audio/wav', base64: wav.toString('base64'), provenance: { provider: 'kokoro', resolvedVoice: 'af_bella', language: 'English' } }, url = 'data:audio/wav;base64,' + clip.base64;
const fixture = () => [{ word: 'corn', targetWord: 'corn', ttsReady: true, teacherNote: 'Keep me', options: ['corn', 'horn'], _ttsAssets: { corn: clip, horn: clip } }];
const start = runtime.indexOf('    const resolveWordSoundsReplacement ='), end = runtime.indexOf('    const WordSoundsReviewPanel =', start);
const actionStart = runtime.indexOf('      const [packRepairState,'), actionEnd = runtime.indexOf('      const handleRegenerateWord =', actionStart);
assert(start >= 0 && end > start && actionStart >= 0 && actionEnd > actionStart);
function mount({ queued = false } = {}) {
  const state = { words: fixture(), refs: [], notices: [], applied: [], pending: [], calls: 0, setterCalls: 0, mounted: { current: true } };
  const props = { voice: 'af_heart', language: 'English', activities: ['word_sounds'], review: true, teacher: true, ai: true };
  const setter = update => {
    state.setterCalls++;
    const run = () => { const prior = state.words; state.words = typeof update === 'function' ? update(prior) : update; if (state.words !== prior) state.applied.push(state.words); };
    if (queued) state.pending.push(run); else run();
  };
  state.render = changes => {
    Object.assign(props, changes); let index = 0;
    const context = {
      WS_CORE: core, React: { useState: initial => [initial, value => state.notices.push(value)], useRef: initial => state.refs[index++] ||= { current: initial }, useEffect: () => {} },
      wordSoundsPackInventory: (words, voice, language, activities) => core.packAudioInventory(words, voice, language, activities),
      preloadedWords: state.words, selectedVoice: props.voice, wordSoundsLanguage: props.language, activitySequence: props.activities,
      isTeacherMode: props.teacher, showReviewPanel: props.review, runtimeAiAllowed: props.ai, isMountedRef: state.mounted,
      callTTS: (text, voice, speed, options) => { state.calls++; state.options = options; return new Promise(resolve => { state.finish = () => { options.onResolvedProfile({ provider: 'kokoro', resolvedVoice: voice, language: options.language }); resolve(url); }; }); },
      packAudioInvalidatedRef: { current: new Set() }, audioCache: { current: new Map() }, audioInstances: { current: new Map() }, ttsInflight: { current: new Map() },
      setPreloadedWords: setter, setWsPreloadedWords: setter, AbortController, setTimeout, clearTimeout, fetch, atob, Uint8Array,
      window: { OfflineAudioContext: class { async decodeAudioData() { return { duration: 1, numberOfChannels: 1, getChannelData: () => new Float32Array([0, .05, -.04]) }; } } },
    };
    vm.runInNewContext(runtime.slice(start, end) + '\n' + runtime.slice(actionStart, actionEnd) + '\nthis.actions = { run: handlePackAudioUpdate, cancel: cancelPackAudioUpdate };', context);
    state.actions = context.actions;
  };
  state.render(); state.begin = () => state.actions.run('replace', ['corn']); state.flush = () => { state.pending.splice(0).forEach(run => run()); }; return state;
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
async function main() {
  await test('rendered prefetch start/completion flags cannot cancel selected replacement', async () => {
    const state = mount(), originalOther = state.words[0]._ttsAssets.horn, pending = state.begin();
    state.words = state.words.map(word => ({ ...word, _audioRequested: true, _ttsFailed: false })); state.render();
    state.words = state.words.map(word => ({ ...word, _audioRequested: false, _runtimeAudioReady: true, _ttsFailed: false })); state.render({ activities: ['word_sounds'] });
    state.finish(); assert.equal(await pending, true);
    assert.equal(state.setterCalls, 1); assert.equal(state.applied.length, 1); assert.equal(state.words[0]._ttsAssets.corn.provenance.resolvedVoice, 'af_heart');
    assert.equal(state.words[0]._ttsAssets.horn, originalOther); assert.equal(state.words[0]._runtimeAudioReady, true); assert.equal(state.words[0]._audioRequested, false); assert.equal(state.words[0].teacherNote, 'Keep me');
    assert.equal(state.options.signal.aborted, false); assert.equal(state.notices.some(value => /cancelled/.test(value.notice)), false);
  });
  await test('queued host prefetch flags are read at commit without a render', async () => {
    const state = mount({ queued: true }), pending = state.begin(); state.finish(); await pending;
    state.words = state.words.map(word => ({ ...word, _audioRequested: true, _runtimeAudioReady: true, _ttsFailed: false })); state.flush();
    assert.equal(state.applied.length, 1); assert.equal(state.words[0]._audioRequested, true); assert.equal(state.words[0]._runtimeAudioReady, true); assert.equal(state.words[0]._ttsFailed, false); assert.equal(state.setterCalls, 1);
  });
  for (const [name, change] of [
    ['word', words => words.map(word => ({ ...word, targetWord: 'horn' }))],
    ['options', words => words.map(word => ({ ...word, options: ['corn', 'born'] }))],
    ['saved audio', words => words.map(word => ({ ...word, _ttsAssets: { ...word._ttsAssets, corn: { ...clip, provenance: { ...clip.provenance, resolvedVoice: 'other' } } } }))],
    ['portable readiness', words => words.map(word => ({ ...word, ttsReady: false }))],
    ['teacher note', words => words.map(word => ({ ...word, teacherNote: 'New note' }))],
    ['removed word', () => []],
  ]) await test(name + ' edit during synthesis cancels the replacement', async () => {
    const state = mount(), pending = state.begin(); state.words = change(state.words); const edit = state.words; state.render(); state.finish();
    assert.equal(await pending, false); assert.equal(state.words, edit); assert.equal(state.applied.length, 0); assert.equal(state.options.signal.aborted, true); assert.match(state.notices.at(-1).notice, /cancelled/);
  });
  for (const [name, props] of [['voice', { voice: 'af_bella' }], ['language', { language: 'German' }], ['activities', { activities: ['syllable_blending'] }], ['review navigation', { review: false }], ['teacher mode', { teacher: false }], ['AI permission', { ai: false }]]) await test(name + ' change still cancels pending generation', async () => {
    const state = mount(), pending = state.begin(); state.render(props); state.finish(); assert.equal(await pending, false); assert.equal(state.applied.length, 0); assert.equal(state.options.signal.aborted, true);
  });
  await test('queued substantive host edit wins even before it renders', async () => {
    const state = mount({ queued: true }), pending = state.begin(); state.finish(); await pending;
    state.words = state.words.map(word => ({ ...word, options: ['corn', 'born'], teacherNote: 'Queued edit' })); const edit = state.words; state.flush();
    assert.equal(state.words, edit); assert.equal(state.applied.length, 0); assert.equal(state.words[0]._ttsAssets.corn, clip);
  });
  await test('manual cancel and unmount keep saved audio', async () => {
    for (const cancel of [state => state.actions.cancel(), state => { state.mounted.current = false; }]) {
      const state = mount(), pending = state.begin(); cancel(state); state.finish(); assert.equal(await pending, false); assert.equal(state.applied.length, 0);
    }
  });
  await test('staged runtime parses', () => require(path.join(root, 'node_modules/@babel/parser')).parse(runtime, { sourceType: 'unambiguous', plugins: ['jsx'] }));
  console.log(JSON.stringify({ passed, failed: 0 }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
