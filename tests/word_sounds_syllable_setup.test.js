import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const pronunciations = { lookup: word => ({ apple: ['10'], table: ['10'], elephant: ['100'], fire: ['1', '10'] }[word] || []) };
const core = new Function('pronunciations', coreSource + ';return createWordSoundsCore({pronunciations});')(pronunciations);
const noAudio = core.createSyllableCountAudioContext({ language: 'en' });
const audioAsset = { mime: 'audio/wav', base64: 'UklGRklYVFVSRQ==' };
const clipContext = core.createSyllableCountAudioContext({ asset: audioAsset, language: 'en' });
function compile(words, reviews = {}, language = 'en') {
  const compiler = new Function('pronunciations', 'reviewedSyllableCounts', 'wordSoundsLanguage', `
    ${coreSource}
    const window = {AlloModules:{AlloData:{}}};
    const WS_CORE = createWordSoundsCore({pronunciations});
    const instructionalProfile = {};
    ${between('const PACK_COMMON_WORDS =', '// ── eSpeak G2P')}
    ${between('const normalizePackKey =', 'const handleStart =')}
    return compileActivityItems;
  `)(pronunciations, reviews, language);
  return compiler(structuredClone(words));
}
const item = (word, extra = {}) => ({ word, targetWord: word, phonemes: ['a'], ...extra });
const choosePreviewWords = new Function(between('function chooseWordSoundsPreviewWords(', 'const WordSoundsGenerator =') + ';return chooseWordSoundsPreviewWords;')();

describe('Studio counting-bank selection', () => {
  const bank = ['sunset', 'sunrise', 'sunlight', 'sunshine', 'raincoat', 'elephant', 'banana', 'alligator', 'caterpillar', 'responsibility'];
  const counts = { sunset: 2, sunrise: 2, sunlight: 2, sunshine: 2, raincoat: 2, elephant: 3, banana: 3, alligator: 4, caterpillar: 4, responsibility: 6 };
  const resolved = word => ({ supported: counts[word] != null, count: counts[word] });
  it('balances supported counts while preserving unrelated source slots and ordinary selection', () => {
    const picked = [...choosePreviewWords(bank, 6, bank, resolved, { min: 1, max: 4 })];
    expect(picked.map(word => counts[word]).sort()).toEqual([2, 2, 3, 3, 4, 4]);
    const mixed = [...choosePreviewWords(['custom', ...bank], 4, bank, resolved, { min: 1, max: 4 })];
    expect(mixed).toContain('custom');
    expect(mixed.filter(word => word !== 'custom').map(word => counts[word]).sort()).toEqual([2, 3, 4]);
    expect([...choosePreviewWords(bank, 4, null, resolved, { min: 1, max: 4 })]).toEqual(bank.slice(0, 4));
    expect([...choosePreviewWords(['responsibility'], 4, bank, resolved, { min: 5, max: 6 })]).toEqual(['responsibility']);
  });

  it('keeps manual word identities through dictionary/count updates and preview reordering without a render loop', async () => {
    const code = between('const previewWordsKey =', 'const normalizePackKey =');
    const Host = new Function('React', 'chooseWordSoundsPreviewWords', `return function Host({words,ready}) {
      const [selectedWords,setSelectedWords]=React.useState(new Set());
      const selectionControl=React.useRef({manual:false,inputsKey:null});
      const previewList=words,selectionInputsKey='same-source',wordCount=4,includeSyllableCountWords=true,syllableCountingSelected=true,syllableRange={min:1,max:4};
      const selectedIndices=new Set(words.map((word,index)=>selectedWords.has(word)?index:-1).filter(index=>index>=0));
      const WS_CORE={syllableCountWords:()=>words};
      const syllableCountFor=word=>({supported:ready||word.startsWith('sun'),count:word==='elephant'?3:word==='alligator'?4:2});
      ${code}
      return React.createElement('div',null,words.map((word,index)=>React.createElement('button',{key:word,'aria-pressed':selectedWords.has(word),onClick:()=>toggleSelection(index)},word)));
    }`)(React, choosePreviewWords);
    const words = ['sunset', 'sunrise', 'sunlight', 'sunshine', 'elephant', 'alligator'];
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Host, { words, ready: false })));
    await act(async () => button('sunset').click());
    await act(async () => button('alligator').click());
    const chosen = () => [...container.querySelectorAll('button[aria-pressed="true"]')].map(node => node.textContent).sort();
    const manual = chosen();
    await act(async () => root.render(React.createElement(Host, { words: [...words].reverse(), ready: true })));
    expect(chosen()).toEqual(manual);
  });

  it('lets both range controls reach twelve while retaining the one-to-four default', async () => {
    const minStart = source.indexOf('<input aria-label={t(\'common.min\')}');
    const maxStart = source.indexOf('<input aria-label={t(\'common.max\')}');
    const input = start => source.slice(start, source.indexOf('/>', start) + 2);
    const code = transformSync(`return <div>${input(minStart)}${input(maxStart)}</div>;`, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false, parserOpts: { allowReturnOutsideFunction: true } }).code;
    const render = new Function('React', 't', 'syllableRange', 'setSyllableRange', 'aiSuggestions', code);
    const aiSuggestions = { cancel: vi.fn() };
    let range;
    function Host() { const [value, setValue] = React.useState({ min: 1, max: 4 }); range = value; return render(React, key => key, value, setValue, aiSuggestions); }
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
    expect(range).toEqual({ min: 1, max: 4 });
    const [min, max] = container.querySelectorAll('input');
    expect(min.max).toBe('12'); expect(max.max).toBe('12');
    await act(async () => Simulate.change(max, { target: { value: '12' } }));
    await act(async () => Simulate.change(min, { target: { value: '5' } }));
    expect(range).toEqual({ min: 5, max: 12 });
    expect(aiSuggestions.cancel).toHaveBeenCalledTimes(2);
  });
});

describe('Studio syllable count preparation', () => {
  it('uses pronunciation-backed answers despite an unsupported blending board', () => {
    for (const word of ['apple', 'table']) {
      const prepared = compile([item(word, { activityItems: {
        syllable_counting: { answer: 2, syllables: [word.slice(0, 2), word.slice(2)] },
        syllable_blending: { supported: false, syllables: [], contentStatus: 'syllable_audio_required' },
      } })])[0];
      expect(prepared.activityItems.syllable_counting).toMatchObject({ supported: true, count: 2, answer: 2, status: 'dictionary' });
      expect(prepared.syllables).toEqual([]);
    }
  });

  it('uses curated compound syllables instead of conflicting AI chunks', () => {
    const prepared = compile([item('sunset', { syllables: ['s', 'un', 'set'] })])[0];
    expect(prepared.syllables).toEqual(['sun', 'set']);
    expect(prepared.activityItems.syllable_counting).toMatchObject({ supported: true, count: 2, answer: 2 });
    expect(prepared.activityItems.syllable_blending.syllables).toEqual(['sun', 'set']);
  });

  it('does not turn AI splits or a spelling estimate into an unknown grading answer', () => {
    const prepared = compile([item('unlistedword', { syllables: ['un', 'listed', 'word'] })])[0];
    expect(prepared.activityItems.syllable_counting).toMatchObject({ supported: false, count: null, answer: null, status: 'needs_review' });
    expect(prepared.syllables).toEqual([]);
  });

  it('requires a reviewed choice for pronunciation variants', () => {
    expect(compile([item('fire')])[0].activityItems.syllable_counting).toMatchObject({ supported: false, answer: null, counts: [1, 2] });
    const review = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 2, revision: 1, reviewed: true, audioContext: noAudio });
    const prepared = compile([item('fire')], { 'en:fire': review })[0];
    expect(prepared.activityItems.syllable_counting).toMatchObject(review);
    expect(compile([prepared])[0].activityItems.syllable_counting).toMatchObject(review);
  });

  it('preserves an explicitly reviewed author count and rejects a changed target', () => {
    const review = core.createReviewedSyllableCount({ targetWord: 'unlistedword', language: 'en', count: 4, revision: 1, reviewed: true, audioContext: noAudio });
    const prepared = compile([item('unlistedword', { activityItems: { syllable_counting: review } })])[0];
    expect(prepared.activityItems.syllable_counting).toMatchObject(review);
    expect(compile([{ ...prepared, word: 'anotherunknown', targetWord: 'anotherunknown' }])[0].activityItems.syllable_counting.supported).toBe(false);
  });
});

const componentCode = transformSync(between('function WordSoundsSyllableCountReview(', 'function buildWordPracticeSelection('), {
  plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false,
}).code;
const RecordingEditor = ({ word, board, onSave }) => React.createElement('details', null, React.createElement('summary', null, 'Repair ' + word), React.createElement('button', { onClick: () => onSave(board) }, 'Save repaired recording'));
const { Review, Queue } = new Function('React', 'WS_CORE', 'WordSoundsSyllableRecordingEditor', 'let wordSoundsSyllableEditorPlayback = null;' + between('function wordSoundsSyllableDraftBoardIdentity(', '// Conservative, optional edits') + componentCode + ';return {Review:WordSoundsSyllableCountReview,Queue:WordSoundsSyllableCountQueue};')(React, core, RecordingEditor);
const translate = (_key, fallback, params = {}) => Object.entries(params).reduce((text, [key, value]) => text.replaceAll('{' + key + '}', String(value)), fallback);
let root, container, lastClip;
async function mount(props = {}) {
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Review, { word: 'fire', language: 'en', resolution: core.resolveSyllableCount('fire', { language: 'en' }), audioContext: noAudio, translate, ...props })));
  return container;
}
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; container?.remove(); container = null;
  vi.unstubAllGlobals();
});
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);
const checkbox = text => [...container.querySelectorAll('label')].find(node => node.textContent.includes(text))?.querySelector('input[type="checkbox"]');
const checked = (text, value = true) => act(async () => Simulate.change(checkbox(text), { target: { checked: value } }));
function audioStub() {
  vi.stubGlobal('Audio', class {
    constructor(source) { this.source = source; lastClip = this; }
    play() { return Promise.resolve(); }
    pause() {}
  });
}
const preview = async () => ({ source: 'data:audio/wav;base64,' + audioAsset.base64, asset: audioAsset, audioContext: clipContext });

describe('Studio syllable count review controls', () => {
  it('requires an explicit count and confirmation, and saves versioned metadata', async () => {
    const onSave = vi.fn();
    audioStub(); await mount({ onSave, previewWord: preview, audioContext: clipContext });
    expect(container.textContent).toContain('Pronunciations use 1 / 2 syllables');
    expect(button('Save reviewed count').disabled).toBe(true);
    const count = container.querySelector('input[type="number"]');
    await act(async () => Simulate.change(count, { target: { value: '2' } }));
    expect(button('Save reviewed count').disabled).toBe(true);
    expect(checkbox('I checked').disabled).toBe(true);
    await act(async () => button('Listen to whole word').click());
    expect(checkbox('I checked').disabled).toBe(true);
    await act(async () => lastClip.onended());
    await checked('I checked');
    await act(async () => button('Save reviewed count').click());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ version: 2, targetWord: 'fire', language: 'en-us', count: 2, status: 'reviewed', review: { confirmed: true }, audioContext: clipContext });
    expect(onSave.mock.calls[0][1].asset).toBe(audioAsset);
    expect(core.resolveSyllableCount('fire', { language: 'en', prepared: onSave.mock.calls[0][0], audioContext: clipContext }).supported).toBe(true);
    await act(async () => Simulate.change(count, { target: { value: '1' } }));
    expect(button('Save reviewed count').disabled).toBe(true);
  });

  it('rejects out-of-range and fractional grading answers', async () => {
    const onSave = vi.fn(); await mount({ onSave });
    for (const value of ['', '0', '13', '2.5']) {
      await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value } }));
      await checked('Use my spoken'); await checked('I checked');
      expect(button('Save reviewed count').disabled).toBe(true);
    }
    expect(onSave).not.toHaveBeenCalled();
  });

  it('offers an explicitly bound teacher-spoken review when whole-word audio is missing', async () => {
    await mount({ onSave: vi.fn(), previewWord: async () => null });
    await act(async () => button('Listen to whole word').click());
    expect(container.querySelector('[role="status"]').textContent).toContain('Retry listening');
    expect(checkbox('Use my spoken')).toBeTruthy();
    expect(checkbox('I checked').disabled).toBe(true);
    await checked('Use my spoken');
    expect(checkbox('I checked').disabled).toBe(false);
  });

  it('cancels pending whole-word preview on unmount', async () => {
    let finish;
    const audio = vi.fn(); vi.stubGlobal('Audio', audio);
    await mount({ onSave: vi.fn(), previewWord: () => new Promise(resolve => { finish = resolve; }) });
    await act(async () => button('Listen to whole word').click());
    await act(async () => root.unmount()); root = null;
    await act(async () => finish('data:audio/wav;base64,example'));
    expect(audio).not.toHaveBeenCalled();
  });

  it('invalidates a completed listen and confirmation when the current clip changes', async () => {
    audioStub(); const onSave = vi.fn();
    const props = { word: 'fire', language: 'en', resolution: core.resolveSyllableCount('fire'), translate, onSave, previewWord: preview, audioContext: clipContext };
    await mount(props);
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await checked('I checked');
    expect(button('Save reviewed count').disabled).toBe(false);
    const changed = core.createSyllableCountAudioContext({ asset: { ...audioAsset, base64: 'Q0hBTkdFRA==' }, language: 'en' });
    await act(async () => root.render(React.createElement(Review, { ...props, audioContext: changed })));
    expect(button('Save reviewed count').disabled).toBe(true);
    expect(checkbox('I checked').disabled).toBe(true);
    expect(checkbox('Use my spoken')).toBeUndefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not approve failed playback or a conflicting recorded count', async () => {
    audioStub(); const onSave = vi.fn();
    await mount({ word: 'sunset', resolution: { supported: false, counts: [2, 3], reason: 'count_recording_conflict', reviewedCount: 3, recordedCount: 2 }, audioContext: clipContext, previewWord: preview, onSave });
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onerror());
    expect(checkbox('I checked').disabled).toBe(true);
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '3' } }));
    await checked('I checked');
    await act(async () => button('Save reviewed count').click());
    expect(onSave).not.toHaveBeenCalled();
    expect([...container.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('still conflicts'))).toBe(true);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '2' } }));
    await checked('I checked');
    await act(async () => button('Save reviewed count').click());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('explicitly resolves a one-syllable pronunciation without deleting its conflicting two-unit recording', async () => {
    const bytes = Buffer.alloc(364);
    bytes.write('RIFF'); bytes.writeUInt32LE(356, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(1600, 24); bytes.writeUInt32LE(3200, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(320, 40);
    const asset = { mime: 'audio/wav', base64: bytes.toString('base64'), durationSeconds: 0.1, decoded: true, source: 'teacher_recording' };
    const recordedTask = core.createReviewedSyllableTask({ targetWord: 'fire', language: 'en', revision: 1, reviewed: true, syllables: ['fi', 're'], assets: [asset, asset] });
    expect(recordedTask).not.toBeNull();
    const original = JSON.stringify(recordedTask), onSave = vi.fn(), onUseWithoutRecording = vi.fn();
    const prior = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: clipContext });
    const resolution = core.resolveSyllableCount('fire', { language: 'en', prepared: prior, recordedTask, audioContext: clipContext });
    expect(resolution.reason).toBe('count_recording_conflict');
    audioStub(); await mount({ onSave, recordedTask, resolution, audioContext: clipContext, previewWord: preview, onUseWithoutRecording, allowRemember: true });
    const action = 'Use this count without the old syllable recording';
    expect(button(action).disabled).toBe(true);
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await checked('I checked'); await checked('Remember this approval');
    await act(async () => button('Save reviewed count').click());
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => button(action).click());
    const [review, options] = onUseWithoutRecording.mock.calls[0];
    expect(core.resolveSyllableCount('fire', { language: 'en', prepared: review, audioContext: clipContext })).toMatchObject({ supported: true, count: 1 });
    expect(options).toMatchObject({ remember: false, asset: audioAsset });
    expect(JSON.stringify(recordedTask)).toBe(original);
  });

  it('does not offer removal of curated compound evidence', async () => {
    await mount({ word: 'sunset', onSave: vi.fn(), onUseWithoutRecording: vi.fn(),
      recordedTask: core.resolveSyllableTask('sunset', null, 'en'),
      resolution: { supported: false, counts: [2, 3], reason: 'count_recording_conflict', reviewedCount: 3, recordedCount: 2 } });
    expect(button('Use this count without the old syllable recording')).toBeUndefined();
  });

  it('requires opt-in to remember an approval and passes audio only to the lesson callback', async () => {
    audioStub(); const onSave = vi.fn();
    await mount({ onSave, previewWord: preview, allowRemember: true });
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    expect(checkbox('Remember this approval').checked).toBe(false);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await checked('I checked'); await checked('Remember this approval');
    await act(async () => button('Save reviewed count').click());
    expect(onSave.mock.calls[0][1]).toMatchObject({ remember: true, asset: audioAsset });
    expect(JSON.stringify(onSave.mock.calls[0][0])).not.toContain(audioAsset.base64);
  });
});

describe('Studio review queue and reusable approvals', () => {
  it('undoes lesson-only recording exclusion without overwriting a later count or audio edit', () => {
    const make = new Function('initial', `
      let reviewedSyllableCounts={...initial.counts},reviewedCountAudio={...initial.audio},reviewedSyllableTasks={},detachedSyllableRecordings={};
      const selectionControl={current:{}},pendingUndoFocus={current:false},syllableCountReviewKey=word=>'en:'+word;
      const setReviewedSyllableCounts=fn=>reviewedSyllableCounts=fn(reviewedSyllableCounts),setReviewedCountAudio=fn=>reviewedCountAudio=fn(reviewedCountAudio);
      const setReviewedSyllableTasks=fn=>reviewedSyllableTasks=fn(reviewedSyllableTasks),setDetachedSyllableRecordings=fn=>detachedSyllableRecordings=fn(detachedSyllableRecordings);
      const saveSyllableCount=(word,task,options={})=>{reviewedSyllableCounts['en:'+word]=task;if(options.asset)reviewedCountAudio['en:'+word]=options.asset;};
      ${between('const saveReviewedSyllableRecording =', 'const selectionInputsKey =')}
      return {useCountWithoutRecording,undoCountRecordingExclusion,saveSyllableCount,read:()=>({counts:reviewedSyllableCounts,audio:reviewedCountAudio,detached:detachedSyllableRecordings})};
    `);
    const original = { review: { signature: 'old' } }, replacement = { review: { signature: 'replacement' } }, newer = { review: { signature: 'newer' } };
    const oldAudio = { base64: 'old' }, newAudio = { base64: 'new' }, laterAudio = { base64: 'later' };
    const state = make({ counts: { 'en:fire': original }, audio: { 'en:fire': oldAudio } });
    state.useCountWithoutRecording('fire', replacement, { asset: newAudio });
    expect(state.read().detached['en:fire'].count).toBe(original);
    state.undoCountRecordingExclusion('en:fire');
    expect(state.read()).toMatchObject({ counts: { 'en:fire': original }, audio: { 'en:fire': oldAudio }, detached: {} });
    state.useCountWithoutRecording('fire', replacement, { asset: newAudio });
    state.saveSyllableCount('fire', newer, { asset: laterAudio });
    state.undoCountRecordingExclusion('en:fire');
    expect(state.read()).toMatchObject({ counts: { 'en:fire': newer }, audio: { 'en:fire': laterAudio }, detached: {} });
  });
  it('opens a conflicting recording inline with focus and returns to count review after saving', async () => {
    const record = { targetWord: 'fire' }, onSaveRecording = vi.fn();
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Queue, { words: ['fire'], translate, contextFor: () => clipContext, recordedFor: () => record, previewWord: preview,
      resolveWord: () => ({ supported: false, counts: [1, 2], reason: 'count_recording_conflict', reviewedCount: 1, recordedCount: 2 }),
      onSave: vi.fn(), onSaveRecording })));
    await act(async () => button('Inspect or repair the syllable recording').click());
    expect(container.querySelector('details').open).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('summary'));
    await act(async () => button('Save repaired recording').click());
    expect(onSaveRecording).toHaveBeenCalledWith('fire', record);
    expect(container.querySelector('details')).toBeNull();
    expect(document.activeElement).toBe(button('Listen to whole word'));
  });
  it('confirms and advances through attention words without changing the selected vocabulary', async () => {
    audioStub(); const words = Object.freeze(['apple', 'fire', 'unknownword']);
    let saved = {};
    function Host() {
      const [records, setRecords] = React.useState({});
      const contextFor = word => records[word]?.audioContext || noAudio;
      return React.createElement(Queue, { words, translate, contextFor, previewWord: preview,
        resolveWord: word => core.resolveSyllableCount(word, { language: 'en', prepared: records[word], audioContext: contextFor(word) }),
        onSave: (word, task) => { saved[word] = task; setRecords(previous => ({ ...previous, [word]: task })); } });
    }
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
    expect(container.querySelector('legend').textContent).toBe('fire');
    expect(container.textContent).toContain('Needs attention only (2)');
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await checked('I checked');
    button('Confirm and next').focus();
    await act(async () => button('Confirm and next').click());
    expect(container.querySelector('legend').textContent).toBe('unknownword');
    expect(document.activeElement).toBe(button('Listen to whole word'));
    expect(container.textContent).toContain('Needs attention only (1)');
    expect(saved.fire.count).toBe(1);
    await checked('Needs attention only', false);
    expect(container.textContent).toContain('3 of 3');
    await act(async () => button('Previous word').click());
    expect(container.querySelector('legend').textContent).toBe('fire');
    expect(words).toEqual(['apple', 'fire', 'unknownword']);
  });

  it('keeps keyboard focus in the attention queue after Save and on its final completion message', async () => {
    audioStub();
    function Host() {
      const [records, setRecords] = React.useState({});
      return React.createElement(Queue, { words: ['fire', 'unknownword'], translate, contextFor: () => clipContext, previewWord: preview,
        resolveWord: word => core.resolveSyllableCount(word, { language: 'en', prepared: records[word], audioContext: clipContext }),
        onSave: (word, task) => setRecords(previous => ({ ...previous, [word]: task })) });
    }
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
    for (const action of ['Save reviewed count', 'Confirm and next']) {
      await act(async () => button('Listen to whole word').click());
      await act(async () => lastClip.onended());
      await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
      await checked('I checked');
      button(action).focus();
      await act(async () => button(action).click());
      expect(document.activeElement).toBe(action === 'Save reviewed count' ? button('Listen to whole word') : container.querySelector('[data-syllable-count-complete]'));
    }
    expect(document.activeElement.textContent).toContain('No selected words need count review');
  });

  it('shows incoming syllable probe skills as the selected option', async () => {
    const start = source.indexOf('<select aria-label={tf(\'word_sounds.probe_skill\'');
    const selector = source.slice(start, source.indexOf('</select>', start) + '</select>'.length);
    const code = transformSync('return ' + selector + ';', { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false, parserOpts: { allowReturnOutsideFunction: true } }).code;
    const Picker = new Function('React', 'tf', 'probeActivitySel', 'setProbeActivitySel', code);
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    for (const [mode, label] of [['syllable_counting', 'Syllable Counting'], ['syllable_blending', 'Syllable Blending']]) {
      await act(async () => root.render(Picker(React, translate, mode, () => {})));
      expect(container.querySelector('select').value).toBe(mode);
      expect(container.querySelector('select').selectedOptions[0].textContent).toBe(label);
    }
  });

  it('stores bounded metadata, and reuses it only for the same word, locale and clip', () => {
    const factory = new Function(between('function createWordSoundsCountReviewLibrary(', 'function WordSoundsSyllableCountReview(') + ';return createWordSoundsCountReviewLibrary;')();
    const storage = { value: '[null]', getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
    const library = factory(core, storage);
    const task = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: clipContext });
    expect(library.save(task)).toBe(true);
    expect(library.find('fire', 'en', clipContext)).toMatchObject(task);
    expect(library.find('apple', 'en', clipContext)).toBeNull();
    expect(library.find('fire', 'en-GB', core.createSyllableCountAudioContext({ asset: audioAsset, language: 'en-GB' }))).toBeNull();
    expect(library.find('fire', 'en', core.createSyllableCountAudioContext({ asset: { ...audioAsset, base64: 'Q0hBTkdFRA==' }, language: 'en' }))).toBeNull();
    expect(storage.value).not.toContain(audioAsset.base64);
    expect(storage.value).not.toContain('data:audio');
    for (let index = 0; index < 260; index++) library.save(core.createReviewedSyllableCount({ targetWord: 'word' + index, language: 'en', count: 2, revision: index + 1, reviewed: true, audioContext: clipContext }));
    expect(JSON.parse(storage.value)).toHaveLength(250);
    expect(library.find('fire', 'en', clipContext)).toBeNull();
  });

  it('marks a teacher-spoken approval for recheck when preparation creates a clip', () => {
    const finalize = new Function('WS_CORE', 'wordSoundsLanguage', 'const normalizePackKey=value=>String(value).trim().toLowerCase();' + between('const finalizeSyllableCountAudio =', 'const compileActivityItems =') + ';return finalizeSyllableCountAudio;')(core, 'en');
    const review = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: noAudio });
    const words = [item('fire', { activityItems: { syllable_counting: review } })];
    finalize(words, { fire: audioAsset }, '');
    expect(words[0].activityItems.syllable_counting).toMatchObject({ supported: false, answer: null, reason: 'count_audio_changed', reviewedEvidence: review });
  });

  it('preserves a validated teacher-spoken count only when no other activity requires the whole word', () => {
    const helpers = new Function('WS_CORE', 'wordSoundsLanguage', 'const normalizePackKey=value=>String(value).trim().toLowerCase();' + between('const teacherSpokenCountOnly =', 'const compileActivityItems =') + ';return {teacherSpokenCountOnly,finalizeSyllableCountAudio};')(core, 'en');
    const review = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: noAudio });
    const countOnly = item('fire', { activityItems: { syllable_counting: review }, _preparedActivities: ['syllable_counting'] });
    expect(helpers.teacherSpokenCountOnly(countOnly, {}, 'af_heart')).toBe(true);
    expect(helpers.teacherSpokenCountOnly({ ...countOnly, _preparedActivities: ['syllable_counting', 'counting'] }, {}, 'af_heart')).toBe(false);
    expect(helpers.teacherSpokenCountOnly(item('fire', { activityItems: { syllable_counting: review, counting: {} } }), {}, 'af_heart')).toBe(false);
    expect(helpers.teacherSpokenCountOnly(countOnly, { fire: audioAsset }, 'af_heart')).toBe(false);
    expect(helpers.teacherSpokenCountOnly(item('fire', { activityItems: { syllable_counting: { ...review, count: 7 } } }), {}, '')).toBe(false);
    helpers.finalizeSyllableCountAudio([countOnly], {}, 'af_heart');
    expect(countOnly.activityItems.syllable_counting).toMatchObject({ supported: true, answer: 1, deliveryMode: 'teacher_spoken' });
  });

  it('keeps incidental bank audio out of teacher-spoken review until explicit listening', () => {
    const bytes = Buffer.alloc(80); bytes.write('RIFF'); bytes.write('WAVE', 8);
    const bankAsset = { mime: 'audio/wav', base64: bytes.toString('base64') };
    const review = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: noAudio });
    const factory = new Function('React', 'WS_CORE', 'window', 'preloadedWords', 'reviewedSyllableCounts', `
      const reviewedCountAudio={},reviewedSyllableTasks={},detachedSyllableRecordings={},wordSoundsLanguage='en',selectedVoice='af_heart';
      const syllableCountReviewKey=word=>'en:'+word,preparedSyllableFor=()=>null,countBankAssetCache={current:new Map()};
      const savedCountAudioAssets=WS_CORE.packAudioAssets(preloadedWords);
      ${between('const syllableCountAudioFor =', 'const syllableCountContextFor =')}
      return syllableCountAudioFor;
    `);
    const host = { _CACHE_WORD_AUDIO_BANK: { fire: 'data:' + bankAsset.mime + ';base64,' + bankAsset.base64 } };
    const lookup = factory({ useCallback: value => value }, core, host, [], { 'en:fire': review });
    expect(lookup('fire')).toBeNull();
    expect(lookup('fire', { explicitListen: true })).toMatchObject(bankAsset);
    const missing = factory({ useCallback: value => value }, core, { _CACHE_WORD_AUDIO_BANK: {} }, [], {});
    expect(missing('fire')).toBeNull();
    expect(missing('fire')).toBeNull();
    const stored = factory({ useCallback: value => value }, core, host, [item('fire', { _ttsAssets: { fire: bankAsset } })], { 'en:fire': review });
    expect(stored('fire')).toBe(bankAsset);
  });

  it('keeps the newest pronunciation dictionary retry result when an older request finishes late', async () => {
    const requests = [];
    const loadingCore = { ...core, loadSyllablePronunciations: () => new Promise(resolve => requests.push(resolve)) };
    const code = between('const [syllableDictionaryState, setSyllableDictionaryState]', 'const syllableCountReviewKey =');
    const Loader = new Function('React', 'WS_CORE', `return function Loader(){${code};return React.createElement('button',{onClick:retrySyllableDictionary},syllableDictionaryState);}`)(React, loadingCore);
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Loader)));
    await act(async () => container.querySelector('button').click());
    expect(requests).toHaveLength(2);
    await act(async () => requests[1](true));
    expect(container.textContent).toBe('ready');
    await act(async () => requests[0](false));
    expect(container.textContent).toBe('ready');
  });
});
