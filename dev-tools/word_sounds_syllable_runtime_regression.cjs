const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, 'syllable-runtime-candidate.js'), 'utf8');
const helperStart = source.indexOf('    function buildSyllableOptions(');
const helperEnd = source.indexOf('    const SyllableBlendingView =', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'patched helpers are present');
const context = vm.createContext({ Set });
vm.runInContext(source.slice(helperStart, helperEnd) + ';globalThis.api={buildSyllableOptions,runSyllableSequence};', context);
const { buildSyllableOptions, runSyllableSequence } = context.api;
const plain = value => JSON.parse(JSON.stringify(value));
const identity = value => value;
const sameSound = (a, b) => a === 'sunset' && b === 'sunsett';
const task = { supported: true, syllables: ['sun', 'set'], audioUnits: [{ text: 'sun' }, { text: 'set' }] };
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

test('a prepared target is retained exactly once with its authored option order', () => {
  const authored = ['raincoat', 'sunset', 'bedtime'];
  const options = buildSyllableOptions('sunset', authored, ['backpack'], values => values.reverse(), sameSound);
  assert.deepEqual(plain(options), authored);
  assert.deepEqual(authored, ['raincoat', 'sunset', 'bedtime']);
});
test('a malformed board is repaired without losing the target or adding a homophone', () => {
  const options = plain(buildSyllableOptions('sunset', ['sunsett', 'raincoat', 'raincoat'], ['sunset', 'bedtime', 'backpack'], identity, sameSound));
  assert.deepEqual(options, ['sunset', 'raincoat', 'bedtime', 'backpack']);
});
test('options containing a duplicated target keep exactly one correct answer', () => {
  const options = plain(buildSyllableOptions('SUNSET', ['sunset', 'sunset', 'sunsett', 'raincoat'], ['bedtime', 'backpack'], identity, sameSound));
  assert.equal(options.filter(value => value === 'sunset').length, 1);
  assert.equal(options.length, 4);
});
test('a long first clip must finish before the next syllable starts', async () => {
  const first = deferred(); const calls = []; const highlights = []; const gaps = [];
  const pending = runSyllableSequence(task, word => { calls.push(word); return calls.length === 1 ? first.promise : Promise.resolve({ ok: true }); }, i => highlights.push(i), () => false, async ms => gaps.push(ms));
  await Promise.resolve();
  assert.deepEqual(calls, ['sun']);
  first.resolve({ ok: true });
  assert.equal(await pending, true);
  assert.deepEqual(calls, ['sun', 'set']);
  assert.deepEqual(gaps, [350]);
  assert.deepEqual(highlights, [0, 1, null]);
});
test('answering or changing words during a clip cancels all later syllables', async () => {
  const first = deferred(); const calls = []; let stale = false;
  const pending = runSyllableSequence(task, word => { calls.push(word); return first.promise; }, () => {}, () => stale, async () => {});
  stale = true; first.resolve({ ok: true });
  assert.equal(await pending, false);
  assert.deepEqual(calls, ['sun']);
});
test('cancelling in the gap cannot start the next clip', async () => {
  const gap = deferred(); const calls = []; let stale = false;
  const pending = runSyllableSequence(task, async word => { calls.push(word); return 'data:audio/wav;base64,ok'; }, () => {}, () => stale, () => gap.promise);
  await Promise.resolve(); await Promise.resolve();
  stale = true; gap.resolve();
  assert.equal(await pending, false);
  assert.deepEqual(calls, ['sun']);
});
test('missing or damaged syllable audio stops the task instead of skipping into the answer', async () => {
  for (const outcome of [null, undefined, { ok: false, status: 'damaged' }]) {
    const calls = []; const highlights = [];
    assert.equal(await runSyllableSequence(task, async word => { calls.push(word); return outcome; }, i => highlights.push(i), () => false, async () => {}), false);
    assert.deepEqual(calls, ['sun']);
    assert.deepEqual(highlights, [0, null]);
  }
});
test('unsupported or malformed tasks never start playback', async () => {
  let calls = 0;
  for (const invalid of [{ supported: false }, { ...task, audioUnits: [{ text: 'sun' }] }, { ...task, syllables: [] }]) {
    assert.equal(await runSyllableSequence(invalid, async () => { calls++; }, () => {}, () => false, async () => {}), false);
  }
  assert.equal(calls, 0);
});
test('a missing middle clip cannot be skipped in a longer reviewed sequence', async () => {
  const calls = [];
  const longer = { supported: true, syllables: ['one', 'two', 'three'], audioUnits: [{ text: 'one' }, { text: 'two' }, { text: 'three' }] };
  const completed = await runSyllableSequence(longer, async word => { calls.push(word); return word === 'two' ? null : { ok: true }; }, () => {}, () => false, async () => {});
  assert.equal(completed, false);
  assert.deepEqual(calls, ['one', 'two']);
});
test('a later same-run replay owns the sequence and prevents older remaining clips', async () => {
  const first = deferred(); const second = deferred(); const calls = [];
  const ownerContext = vm.createContext({
    React: { useCallback: callback => callback }, WS_CORE: { syllableReady: data => data.supported },
    audioRunIdRef: { current: 1 }, syllableDataRef: { current: task }, syllableSequenceRef: { current: null },
    isMountedRef: { current: true }, audioCancelledRef: { current: false }, syllableDeliveredRef: { current: null }, setSyllableDelivered() {},
    setIsSyllableSequenceBusy() {}, setHighlightedSyllableIndex() {},
    runSyllableSequence, setTimeout: callback => callback(),
    handleAudio: word => { calls.push(word); return calls.length === 1 ? first.promise : calls.length === 2 ? second.promise : Promise.resolve({ ok: true }); },
  });
  const start = source.indexOf('      const playSyllables = React.useCallback(');
  const end = source.indexOf('      React.useEffect(() => {', start);
  vm.runInContext(source.slice(start, end) + ';globalThis.play=playSyllables;', ownerContext);
  const oldSequence = ownerContext.play(); const newSequence = ownerContext.play();
  first.resolve({ ok: true });
  assert.equal(await oldSequence, false);
  assert.deepEqual(calls, ['sun', 'sun']);
  second.resolve({ ok: true });
  assert.equal(await newSequence, true);
  assert.deepEqual(calls, ['sun', 'sun', 'set']);
});

const viewEnd = source.indexOf('    // SyllableCountingView', helperEnd);
const viewContext = vm.createContext({ React: { memo: fn => fn, createElement: (type, props, ...children) => ({ type, props: props || {}, children }) } });
vm.runInContext(source.slice(helperEnd, viewEnd) + ';globalThis.View=SyllableBlendingView;', viewContext);
const view = overrides => viewContext.View({ data: { ...task, blendingOptions: ['sunset', 'raincoat'] }, canAnswer: true, t: () => '', ts: () => '', ...overrides });
const all = node => typeof node === 'object' && node ? [node, ...node.children.flatMap(all)] : [];
test('unsupported words show a review message with no answer controls', () => {
  const output = view({ data: { supported: false } });
  assert.equal(output.props.role, 'status');
  assert.equal(all(output).filter(node => node.type === 'button').length, 0);
});
test('the response button grades the chosen word; the separate listen button only plays it', () => {
  const heard = []; const answered = [];
  const output = view({ onPlayAudio: word => heard.push(word), onCheckAnswer: word => answered.push(word) });
  all(output).find(node => node.props['aria-label'] === 'sunset').props.onClick();
  assert.deepEqual(answered, ['sunset']); assert.deepEqual(heard, []);
  all(output).find(node => node.props['aria-label'] === 'Hear sunset').props.onClick();
  assert.deepEqual(heard, ['sunset']); assert.deepEqual(answered, ['sunset']);
});
test('responses and replay stay disabled for the entire syllable sequence', () => {
  const output = view({ isAudioBusy: true });
  assert(all(output).filter(node => node.type === 'button').every(node => node.props.disabled === true));
});
test('failed or incomplete stimulus delivery disables answers while replay stays available', () => {
  const output = view({ isAudioBusy: false, canAnswer: false });
  assert.equal(all(output).find(node => node.props['aria-label'] === 'sunset').props.disabled, true);
  assert.equal(all(output).find(node => node.children.includes('▶ Play Syllables')).props.disabled, false);
});
test('AAC base64 images use valid data URLs', () => {
  const output = view({ optionImages: { sunset: 'abc123' } });
  assert.equal(all(output).find(node => node.type === 'img').props.src, 'data:image/png;base64,abc123');
});
test('blending render does not include the target-revealing generic prompt', () => {
  const start = source.indexOf('          case "syllable_blending": {');
  const end = source.indexOf('          case "syllable_counting": {', start);
  const rendering = source.slice(start, end);
  assert(!rendering.includes('renderPrompt()'));
  assert(rendering.includes('onPlaySyllables:'));
  assert(rendering.includes('isPlayingAudio || isSyllableSequenceBusy'));
});
test('instructions on and off both use the managed syllable sequence', () => {
  assert(source.includes('if (wordSoundsActivity !== "syllable_blending") await handleAudio(currentWordSoundsWord);'));
  assert(source.includes('await playSyllables(() => cancelled);'));
  assert(source.includes('await playSyllables(seqStale);'));
});
