const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const installed = fs.existsSync(path.join(__dirname, '..', 'word_sounds_core.js'));
const root = installed ? path.resolve(__dirname, '..') : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const integrated = installed || process.argv.includes('--repo');
const transforms = integrated ? null : require('./transforms.cjs');
const rawCore = fs.readFileSync(path.join(root, 'word_sounds_core.js'), 'utf8');
const coreSource = integrated ? rawCore : transforms.transformCore(rawCore);
const core = vm.runInNewContext(coreSource + '\ncreateWordSoundsCore()', { atob, btoa, Buffer });
const plain = value => JSON.parse(JSON.stringify(value));
const wav = Buffer.alloc(4844); wav.write('RIFF'); wav.writeUInt32LE(4836, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(4800, 40); for(let i=44;i<wav.length;i+=2) wav.writeInt16LE(Math.round(Math.sin(i/10)*3000),i); const clipData = wav.toString('base64'), clipUrl = 'data:audio/wav;base64,' + clipData;
const asset = (voice, source = 'synthesized') => ({ mime: 'audio/wav', base64: clipData, ...(voice ? { provenance: { provider: 'kokoro', resolvedVoice: voice, source } } : {}) });
let passed = 0;
function test(name, fn) { return Promise.resolve().then(fn).then(() => { passed++; console.log('PASS ' + name); }); }
function fixture() { return [{ id: 'custom-1', targetWord: 'sunset', phonemes: ['s','u','n','s','e','t'], image: 'custom-picture', teacherNote: 'Keep my note', activityItems: { rhyming: { answer: 'jet', options: ['jet','moon','book'] }, syllable_blending: { options: ['moonlight','sunset','backpack'], answer: 'sunset', syllables: ['sun','set'] } }, _ttsAssets: { sunset: asset('af_heart'), moonlight: asset(), jet: asset('af_bella') }, records: [{ response: 'sunset', correct: true }] }]; }
function harness(words, tts, teacher = true) {
  const state = { words, applied: [], notices: [], refs: [], mounted: { current: true } };
  function render(voice = 'af_bella', language = 'English') {
    let refIndex = 0;
    const context = { WS_CORE: core, React: { useState: initial => [initial, value => state.notices.push(value)], useRef: initial => state.refs[refIndex++] ||= { current: initial }, useEffect: () => {} },
      wordSoundsPackInventory: (words, voice, language) => core.packAudioInventory(words, voice, language),
      preloadedWords: state.words, selectedVoice: voice, wordSoundsLanguage: language, activitySequence: ['syllable_blending'], isTeacherMode: teacher, showReviewPanel: state.review !== false, runtimeAiAllowed: true, callTTS: tts,
      isMountedRef: state.mounted, packAudioInvalidatedRef: { current: new Set() }, audioCache: { current: new Map() }, audioInstances: { current: new Map() }, ttsInflight: { current: new Map() },
      setPreloadedWords: next => { state.words = typeof next === 'function' ? next(state.words) : next; state.applied.push(state.words); }, setWsPreloadedWords: () => {}, AbortController, setTimeout, clearTimeout, fetch, FileReader: undefined, atob, Uint8Array,
      window: { OfflineAudioContext: class { async decodeAudioData() { if (state.badAudio) throw new Error('Damaged bytes'); return { duration: 1, numberOfChannels: 1, getChannelData: () => new Float32Array([0, 0.05, -0.04]) }; } } } };
    const panel = fs.readFileSync(path.join(integrated ? root : __dirname, integrated ? 'word_sounds_module.js' : 'runtime-panel.js'), 'utf8');
    const resolverStart = panel.indexOf('    const resolveWordSoundsReplacement =');
    const resolver = panel.slice(resolverStart, integrated ? panel.indexOf('    const WordSoundsReviewPanel =', resolverStart) : undefined);
    const actionSource = integrated ? panel.slice(panel.indexOf('      const [packRepairState,'), panel.indexOf('      const handleRegenerateWord =', panel.indexOf('      const [packRepairState,'))) : fs.readFileSync(path.join(__dirname, 'runtime-actions.js'), 'utf8');
    vm.runInNewContext(resolver + '\n' + actionSource + '\nthis.actions={run:handlePackAudioUpdate,cancel:cancelPackAudioUpdate};', context);
    state.actions = context.actions; return state.actions;
  }
  state.render = render; render(); return state;
}
async function main() {
  await test('actual resolved voice distinguishes mixed, unknown, and bank clips', () => {
    const words = fixture(), inventory = core.packAudioInventory(words, 'af_bella');
    assert.equal(inventory.find(row => row.key === 'sunset').mismatch, true);
    assert.equal(inventory.find(row => row.key === 'jet').mismatch, false);
    assert.equal(inventory.find(row => row.key === 'moonlight').unknown, true);
    words[0]._ttsAssets.sunset.provenance = { provider: 'gemini', voice: 'af_bella', source: 'unknown' };
    assert.equal(core.packAudioInventory(words, 'af_bella').find(row => row.key === 'sunset').unknown, true);
  });
  await test('repair upgrades old syllable data while preserving authored words, choices, records and images', () => {
    const before = fixture(), snapshot = plain(before), plan = core.planPackRepair(before, 'English');
    assert.deepEqual(plain(before), snapshot);
    assert.equal(plan.upgraded.length, 1); assert.equal(core.validSyllableBoard(plan.words[0].activityItems.syllable_blending), true);
    assert.deepEqual(plain(plan.words[0].activityItems.syllable_blending.options), snapshot[0].activityItems.syllable_blending.options);
    assert.deepEqual(plain(plan.words[0].records), snapshot[0].records);
    assert.deepEqual(plain(plan.words[0].activityItems.rhyming), snapshot[0].activityItems.rhyming);
    assert.equal(plan.words[0].teacherNote, before[0].teacherNote); assert.equal(plan.words[0].image, before[0].image);
  });
  await test('repair supports older packs with no activityItems without inventing new choices', () => {
    const words = [{ targetWord: 'sunset', syllableBlendingOptions: ['sunset', 'backpack'] }];
    assert.equal(core.planPackRepair(words, 'English', ['syllable_blending']).upgraded.length, 1);
    delete words[0].syllableBlendingOptions;
    assert.equal(core.planPackRepair(words, 'English', ['syllable_blending']).upgraded.length, 0);
  });
  await test('unsupported custom words and invalid teacher recordings stay flagged and unchanged', () => {
    const words = [{ targetWord: 'banana', activityItems: { syllable_blending: { options: ['banana', 'sunset'], contentStatus: 'teacher_recorded', audioUnits: [{ key: 'part', text: 'buh', asset: asset() }] } } }];
    const plan = core.planPackRepair(words, 'English');
    assert.equal(plan.words[0], words[0]); assert.equal(plan.issues.length, 1);
    const inventory = core.packAudioInventory(words);
    assert.equal(inventory.find(row => row.key === 'part').regeneratable, false);
    assert.equal(plan.missing.some(row => row.key === 'buh' || row.key === 'part'), false);
  });
  await test('invalid replacements never discard existing good audio', () => {
    const words = fixture(), next = core.replacePackAssets(words, { sunset: null, jet: { mime: 'text/plain', base64: 'bad' } });
    assert.deepEqual(plain(next[0]._ttsAssets), plain(words[0]._ttsAssets));
  });
  await test('targeted replacement bypasses bank/cache with strict provider routing and saves actual profile', async () => {
    let opts;
    const state = harness(fixture(), async (text, voice, speed, options) => { opts = options; options.onResolvedProfile({ provider: 'kokoro', resolvedVoice: voice }); return clipUrl; });
    await state.actions.run('replace', ['sunset']);
    assert.equal(opts.force, true); assert.equal(opts.allowProviderFallback, false);
    assert.equal(state.words[0]._ttsAssets.sunset.provenance.resolvedVoice, 'af_bella');
    assert.equal(state.words[0]._ttsAssets.moonlight.provenance, undefined);
    assert.equal(state.words[0].teacherNote, 'Keep my note');
  });
  await test('failed targeted regeneration keeps old clip and reports the failure', async () => {
    const words = fixture(), old = plain(words), state = harness(words, async () => null);
    await state.actions.run('replace', ['sunset']);
    assert.equal(state.applied.length, 0); assert.deepEqual(plain(state.words), old);
    assert.match(state.notices.at(-1).notice, /Previous clips were kept/);
  });
  await test('cancelled late generation cannot overwrite the lesson', async () => {
    let finish;
    const state = harness(fixture(), () => new Promise(resolve => { finish = resolve; }));
    const pending = state.actions.run('replace', ['sunset']);
    state.actions.cancel(); finish(clipUrl); await pending;
    assert.equal(state.applied.length, 0);
  });
  await test('damaged replacement audio cannot discard the previous good clip', async () => {
    const words = fixture(), state = harness(words, async () => clipUrl); state.badAudio = true;
    await state.actions.run('replace', ['sunset']);
    assert.equal(state.applied.length, 0); assert.equal(state.words, words);
  });
  await test('editing the lesson during generation invalidates pending audio', async () => {
    let finish;
    const state = harness(fixture(), () => new Promise(resolve => { finish = resolve; }));
    const pending = state.actions.run('replace', ['sunset']);
    state.words = state.words.map(word => ({ ...word, teacherNote: 'New edit' })); state.render();
    finish(clipUrl); await pending;
    assert.equal(state.applied.length, 0); assert.equal(state.words[0].teacherNote, 'New edit');
  });
  await test('students cannot invoke synthesis even if a handler is called', async () => {
    let calls = 0;
    const state = harness(fixture(), async () => { calls++; return null; }, false);
    await state.actions.run('repair'); assert.equal(calls, 0); assert.equal(state.applied.length, 0);
  });
  await test('teacher recordings cannot be regenerated by selected keys', async () => {
    let calls = 0; const words = fixture();
    words[0].activityItems.syllable_blending = { contentStatus: 'teacher_recorded', audioUnits: [{ key: 'syllable:sunset:1:0', text: 'sun', asset: asset() }], options: ['sunset','moonlight'] };
    const state = harness(words, async () => { calls++; return null; });
    await state.actions.run('replace', ['syllable:sunset:1:0']); assert.equal(calls, 0);
  });
  await test('legacy fragment requirements and synthetic recording keys never reach repair synthesis', () => {
    const words = [{ targetWord: 'banana', syllables: ['buh','na','nuh'], _ttsRequiredKeys: ['buh','na','nuh','syllable:banana:0'], _ttsAssets: { buh: asset() }, activityItems: { syllable_blending: { syllables: ['buh','na','nuh'], audioUnits: [{ text: 'buh', key: 'syllable:banana:0' }], options: ['banana','sunset'] } } }];
    const plan = core.planPackRepair(words, 'English');
    assert.equal(plan.missing.some(row => ['buh','na','nuh','syllable:banana:0'].includes(row.key)), false);
    assert.equal(core.packAudioInventory(words).find(row => row.key === 'buh').regeneratable, false);
  });
  await test('literal object-property word keys survive repair without prototype mutation', () => {
    const words = [{ targetWord: '__proto__', _ttsAssets: Object.create(null) }]; words[0]._ttsAssets['__proto__'] = asset(); words[0]._ttsAssets.constructor = asset();
    const next = core.replacePackAssets(words, {});
    assert.equal(Object.getPrototypeOf(next[0]._ttsAssets), null);
    assert.equal(core.packAudioInventory(next).find(row => row.key === '__proto__').present, true);
    assert.equal(core.portablePackAsset({ mime: 'audio/wav', base64: 'bad%%%' }), false);
    assert.equal(core.portablePackAsset({ mime: 'audio/wav', base64: 'A'.repeat(512 * 1024 + 4) }), false);
  });
  await test('provenance transport preserves actual voice and removes unrelated fields', () => {
    const source = integrated ? fs.readFileSync(path.join(root, 'live_aac_source.jsx'), 'utf8').split('function sanitizeWordSoundsAudioProvenance')[1].split('\n}\n')[0] : fs.readFileSync(path.join(__dirname, 'provenance-transport.js'), 'utf8').split('function sanitizeWordSoundsAudioProvenance')[1].split('\n}\n')[0];
    const sanitize = vm.runInNewContext('(function sanitizeWordSoundsAudioProvenance' + source + '\n})');
    const result = sanitize({ provider: 'kokoro', resolvedVoice: 'af_heart', source: 'recorded_bank', privateStudentName: 'must be removed', base64: 'not metadata', voice: 'x'.repeat(121) });
    assert.deepEqual(plain(result), { version: 1, provider: 'kokoro', resolvedVoice: 'af_heart', source: 'recorded_bank' });
  });
  await test('leaving teacher review cancels late audio replacement', async () => {
    let finish; const state = harness(fixture(), () => new Promise(resolve => { finish = resolve; }));
    const pending = state.actions.run('replace', ['sunset']); state.review = false; state.render();
    finish(clipUrl); await pending; assert.equal(state.applied.length, 0);
  });
  await test('canonical readiness portable roundtrip retains bounded metadata and literal keys', () => {
    const raw = fs.readFileSync(path.join(root, 'word_sounds_readiness_contract.js'), 'utf8');
    const context = { module: { exports: {} }, Buffer, atob, btoa }; context.globalThis = context;
    vm.runInNewContext(integrated ? raw : transforms.transformReadiness(raw), context);
    const speech = asset('af_heart', 'recorded_bank'); speech.provenance.privateStudentName = 'omit';
    const words = [{ targetWord: 'sunset', _ttsAssets: Object.assign(Object.create(null), { sunset: speech }) }];
    Object.defineProperty(words[0]._ttsAssets, '__proto__', { value: speech, enumerable: true });
    const result = context.module.exports.portable({ type: 'word-sounds', data: words });
    assert.equal(result.data[0]._ttsAssets.sunset.provenance.resolvedVoice, 'af_heart');
    assert.equal(result.data[0]._ttsAssets.sunset.provenance.privateStudentName, undefined);
    assert.equal(result.data[0]._ttsAssets.__proto__.provenance.source, 'recorded_bank');
  });
  const parser = require(path.join(root, 'node_modules/@babel/parser'));
  await test('guarded edits parse against all canonical current sources', () => {
    const cases = [['word_sounds_core.js', 'transformCore'], ['word_sounds_module.js', 'transformRuntime'], ['word_sounds_setup_source.jsx', 'transformSetup'], ['misc_components_source.jsx', 'transformReview'], ['view_word_sounds_preview_source.jsx', 'transformPreview'], ['live_aac_source.jsx', 'transformLiveAac'], ['module_scope_extras_source.jsx', 'transformExtras'], ['word_sounds_readiness_contract.js', 'transformReadiness']];
    for (const [file, transform] of cases) { const raw = fs.readFileSync(path.join(root, file), 'utf8'); const candidate = integrated ? raw : transforms[transform](raw); parser.parse(candidate, { sourceType: 'unambiguous', plugins: ['jsx'] }); if (!integrated) fs.writeFileSync(path.join(__dirname, file), candidate); }
  });
  console.log(JSON.stringify({ passed, failed: 0 }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
