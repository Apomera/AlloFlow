// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const between = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Missing production source boundary: ${start} / ${end}`);
  return source.slice(from, to);
};
const core = new Function(coreSource + ';return createWordSoundsCore();')();
const bytes = Buffer.alloc(364);
bytes.write('RIFF'); bytes.writeUInt32LE(356, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(1600, 24); bytes.writeUInt32LE(3200, 28);
bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(320, 40);
const asset = { mime: 'audio/wav', base64: bytes.toString('base64'), durationSeconds: 0.1, decoded: true, source: 'teacher_recording' };
const secondAsset = { ...asset, base64: (() => { const next = Buffer.from(bytes); next[80] = 1; return next.toString('base64'); })() };
const context = clip => core.createSyllableCountAudioContext({ asset: clip, language: 'en', voice: '' });
const count = (word, value, clip = asset, revision = 1) => core.createReviewedSyllableCount({
  targetWord: word, language: 'en', count: value, reviewed: true, revision, audioContext: context(clip),
});
const recording = (word = 'fire', revision = 1) => ({ ...core.createReviewedSyllableTask({
  targetWord: word, language: 'en', reviewed: true, revision, syllables: ['fi', 're'], assets: [asset, asset],
}), options: [word, 'apple', 'table'], answer: word });
const row = (word = 'fire', extra = {}) => ({ word, targetWord: word, phonemes: ['f', 'ire'],
  activityItems: { counting: { options: [4, 2, 3], answer: 2 }, orthography: { options: ['fir', word], answer: word } }, ...extra });
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};

// Compose the production session hook, selection logic, save/detach/undo
// handlers, compiler and handoff in a small React host. This isolates the
// persistence contract from the Studio's unrelated network/audio loaders.
const Host = new Function('React', 'WS_CORE', `
  ${between('function chooseWordSoundsPreviewWords(', 'const WordSoundsGenerator =')}
  ${between('function useWordSoundsSyllableExitGuard(', 'function WordSoundsSyllableDraftNotice(')}
  ${between('const PACK_COMMON_WORDS =', '// ── eSpeak G2P')}
  return function Host({ session: reviewSession, words: preloadedWords = [], dirty = [], capture, onShowReview, onClose }) {
    const wordSoundsLanguage = 'en', selectedVoice = '', instructionalProfile = {};
    const tf = (_key, fallback) => fallback;
    ${between('const [selectedWords, setSelectedWords] =', 'const [wordPracticeStatus,')}
    ${between('const [reviewedSyllableTasks, setReviewedSyllableTasks] =', 'const syllableSessionDrafts =')}
    const pendingUndoFocus = React.useRef(false);
    const countReviewLibrary = {save: () => false};
    const setCountLibraryNotice = () => {}, setCountLibraryRevision = () => {};
    const recordingDraftKey = (word, language = wordSoundsLanguage) => JSON.stringify([WS_CORE.packAudioKey(word), WS_CORE.packAudioLanguageKey(language)]);
    const syllableCountReviewKey = word => wordSoundsLanguage + ':' + WS_CORE.packAudioKey(word);
    const preparedSyllableFor = word => detachedSyllableRecordings[syllableCountReviewKey(word)] ? null :
      reviewedSyllableTasks[recordingDraftKey(word)] || preloadedWords.find(item => item.targetWord === word)?.activityItems?.syllable_blending;
    const syllableCountAudioFor = word => reviewedCountAudio[syllableCountReviewKey(word)] || WS_CORE.packAudioAssets(preloadedWords)[word];
    const preparedCountFor = word => reviewedSyllableCounts[syllableCountReviewKey(word)] || preloadedWords.find(item => item.targetWord === word)?.activityItems?.syllable_counting;
    const syllableCountFor = word => WS_CORE.resolveSyllableCount(word, {language:wordSoundsLanguage, prepared:preparedCountFor(word),
      recordedTask:preparedSyllableFor(word), audioContext:WS_CORE.createSyllableCountAudioContext({asset:syllableCountAudioFor(word), language:wordSoundsLanguage, voice:selectedVoice})});
    ${between('const saveSyllableCount =', 'const selectionInputsKey =')}
    const wordCount = 10, includeSyllableWords = false, includeSyllableCountWords = false, includeGlossary = false;
    const includeFamily = false, includeCustom = false, includeSightWords = false, includeAI = false;
    const selectedFamily = '', selectedSightWordList = '', customText = '', aiTerms = [], glossaryTerms = [];
    const syllableRange = {min:1,max:4}, withinSyllableRange = () => true;
    const syllableCountingSelected = true;
    ${between('const selectionInputsKey =', 'const syllableBlendingSelected =')}
    ${between('const previewWordsKey =', 'const normalizePackKey =')}
    ${between('const normalizePackKey =', 'const applySetupSyllableReviews =')}
    const syllableExitGuard = useWordSoundsSyllableExitGuard(() => dirty, tf);
    ${between('const applySetupSyllableReviews =', 'const handleStart =')}
    capture({selectedWords,previewList,reviewedSyllableTasks,reviewedSyllableCounts,reviewedCountAudio,detachedSyllableRecordings,
      saveSyllableCount,saveReviewedSyllableRecording,useCountWithoutRecording,undoCountRecordingExclusion,applySetupSyllableReviews,
      select: word => { selectionControl.current.manual=true; setSelectedWords(previous => new Set([...previous,word])); }});
    return React.createElement('div',null,
      React.createElement('output',null,JSON.stringify({words:[...selectedWords],counts:reviewedSyllableCounts})),
      React.createElement('button',{onClick:handleShowReview},'Review Words'),
      React.createElement('button',{onClick:()=>syllableExitGuard.requestExit(onClose)},'Close'),
      syllableExitGuard.notice);
  };
`)(React, core);

let root, container, state, props;
const render = async next => {
  props = { ...props, ...next };
  await act(async () => root.render(React.createElement(Host, props)));
};
const invoke = action => act(async () => action(state));
const click = text => act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === text).click());
const remount = async next => {
  await act(async () => root.unmount());
  root = createRoot(container);
  await render(next);
};
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  props = {session:{},words:[],capture:value=>{state=value;},onShowReview:vi.fn(),onClose:vi.fn()};
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
});

describe('approved setup work belongs to its host session', () => {
  it('retains a saved count, its exact audio and selected custom word through Close and remount', async () => {
    const session = {}, approved = count('customword', 3);
    await render({session});
    await invoke(state => state.select('customword'));
    await invoke(state => state.saveSyllableCount('customword', approved, {asset}));
    await click('Close');
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    await remount({session});
    expect(state.reviewedSyllableCounts['en:customword']).toBe(approved);
    expect(state.reviewedCountAudio['en:customword']).toBe(asset);
    expect([...state.selectedWords]).toEqual(['customword']);
    expect(state.previewList).toContain('customword');
  });

  it('starts a fresh host session without importing the previous approvals or selection', async () => {
    const first = {};
    await render({session:first});
    await invoke(state => { state.select('customword'); state.saveSyllableCount('customword', count('customword',3), {asset}); });
    await remount({session:{}});
    expect(state.reviewedSyllableCounts).toEqual({});
    expect(state.reviewedCountAudio).toEqual({});
    expect([...state.selectedWords]).toEqual([]);
    expect(state.previewList).toEqual([]);
    expect(first.counts['en:customword'].count).toBe(3);
  });

  it('preserves recorded syllables and detachment undo history across remount', async () => {
    const session = {}, board = recording(), original = count('fire',2), replacement = count('fire',1,secondAsset,2);
    await render({session,words:[row()]});
    await invoke(state => { state.saveReviewedSyllableRecording('fire',board); state.saveSyllableCount('fire',original,{asset}); });
    await invoke(state => state.useCountWithoutRecording('fire',replacement,{asset:secondAsset}));
    await remount({session});
    expect(state.reviewedSyllableTasks[JSON.stringify(['fire',core.packAudioLanguageKey('en')])]).toBe(board);
    expect(state.detachedSyllableRecordings['en:fire']).toMatchObject({count:original,audio:asset,replacementAudio:secondAsset});
    expect(state.reviewedSyllableCounts['en:fire']).toBe(replacement);
    await invoke(state => state.undoCountRecordingExclusion('en:fire'));
    expect(state.detachedSyllableRecordings).toEqual({});
    expect(state.reviewedSyllableCounts['en:fire']).toBe(original);
    expect(state.reviewedCountAudio['en:fire']).toBe(asset);
    await remount({session});
    expect(state.detachedSyllableRecordings).toEqual({});
    expect(state.reviewedSyllableCounts['en:fire']).toBe(original);
  });
});

describe('Review Words handoff', () => {
  it('waits for the unfinished-edit decision and passes only approved edits after Discard', async () => {
    const words = freeze([row()]), approved = count('fire',1), callback = vi.fn();
    await render({words,onShowReview:callback});
    await invoke(state => state.saveSyllableCount('fire',approved,{asset}));
    await render({dirty:['fire']});
    await click('Review Words');
    expect(callback).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
    await click('Keep editing');
    expect(callback).not.toHaveBeenCalled();
    await click('Review Words');
    await click('Discard edits');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0][0].activityItems.syllable_counting).toMatchObject({supported:true,count:1,answer:1});
    expect(words[0].activityItems.syllable_counting).toBeUndefined();
  });

  it('merges count/audio updates without mutating the pack or changing unrelated tasks and choices', async () => {
    const words = freeze([row('fire',{_ttsAssets:{fire:asset,apple:asset}}),row('apple',{_ttsAssets:{fire:asset}})]);
    const before = structuredClone(words), callback = vi.fn(), approved = count('fire',1,secondAsset,2);
    await render({words,onShowReview:callback});
    await invoke(state => state.saveSyllableCount('fire',approved,{asset:secondAsset}));
    await click('Review Words');
    const next = callback.mock.calls[0][0];
    expect(next).not.toBe(words);
    expect(next[0].activityItems.syllable_counting).toMatchObject({supported:true,count:1,answer:1});
    expect(next[0].activityItems.counting).toBe(words[0].activityItems.counting);
    expect(next[0].activityItems.orthography).toBe(words[0].activityItems.orthography);
    expect(next[1].activityItems).toEqual(words[1].activityItems);
    expect(core.packAudioAssets(next).fire).toEqual(secondAsset);
    expect(core.packAudioAssets(next).apple).toEqual(asset);
    expect(words).toEqual(before);
  });

  it('preserves an existing recording board and its answer order during a count-only change', async () => {
    const board = recording();
    const words = freeze([row('fire',{activityItems:{syllable_blending:board},_ttsAssets:{fire:asset}})]);
    const approved = count('fire',2), callback = vi.fn();
    await render({words,onShowReview:callback});
    await invoke(state => state.saveSyllableCount('fire',approved,{asset}));
    await click('Review Words');
    const next = callback.mock.calls[0][0];
    expect(next[0].activityItems.syllable_blending).toEqual(board);
    expect(next[0].activityItems.syllable_blending.options).toEqual(['fire','apple','table']);
    expect(words[0].activityItems.syllable_counting).toBeUndefined();
  });

  it('hands off a saved recording or explicit removal while preserving non-syllable fields', async () => {
    const words = freeze([row()]), board = recording(), callback = vi.fn();
    await render({words,onShowReview:callback});
    await invoke(state => state.saveReviewedSyllableRecording('fire',board));
    await click('Review Words');
    let next = callback.mock.calls[0][0];
    expect(next[0].activityItems.syllable_blending).toMatchObject(board);
    expect(next[0].activityItems.counting).toBe(words[0].activityItems.counting);
    await invoke(state => state.useCountWithoutRecording('fire',count('fire',1),{asset}));
    await click('Review Words');
    next = callback.mock.calls[1][0];
    expect(next[0].activityItems.syllable_blending).toBeUndefined();
    expect(next[0].activityItems.syllable_counting).toMatchObject({supported:true,count:1,answer:1});
    expect(next[0].activityItems.orthography).toBe(words[0].activityItems.orthography);
  });

  it('retains new-word approvals across a mixed handoff without replaying transferred approvals over later edits', async () => {
    const frenchCount = core.createReviewedSyllableCount({targetWord:'apple',language:'fr',count:2,reviewed:true,revision:1,
      audioContext:core.createSyllableCountAudioContext({asset,language:'fr'})});
    const frenchBoard = core.createReviewedSyllableTask({targetWord:'apple',language:'fr',reviewed:true,revision:1,
      syllables:['ap','ple'],assets:[asset,asset]});
    const session = {counts:{'fr:apple':frenchCount},audio:{'fr:apple':asset},
      recordings:{[JSON.stringify(['apple',core.packAudioLanguageKey('fr')])]:frenchBoard}};
    const words = freeze([row('apple')]), apple = count('apple',2), fire = count('fire',2), board = recording();
    await render({session,words});
    await invoke(state => {
      state.select('apple'); state.select('fire');
      state.saveSyllableCount('apple',apple,{asset});
      state.saveReviewedSyllableRecording('fire',board);
      state.saveSyllableCount('fire',fire,{asset});
    });
    await click('Review Words');
    const handedOff = props.onShowReview.mock.calls[0][0];
    expect(handedOff.map(item=>item.word)).toEqual(['apple']);
    expect(handedOff[0].activityItems.syllable_counting).toMatchObject({supported:true,count:2});
    expect(session.counts['en:apple']).toBeUndefined();
    expect(session.audio['en:apple']).toBeUndefined();
    expect(session.counts['en:fire']).toBe(fire);
    expect(session.audio['en:fire']).toBe(asset);
    expect(session.recordings[JSON.stringify(['fire',core.packAudioLanguageKey('en')])]).toBe(board);
    expect(session.counts['fr:apple']).toBe(frenchCount);
    expect(session.recordings[JSON.stringify(['apple',core.packAudioLanguageKey('fr')])]).toBe(frenchBoard);
    // A later review-panel edit is authoritative on return to setup.
    const edited = handedOff.map(item=>({...item,activityItems:{...item.activityItems,
      syllable_counting:count('apple',3,secondAsset,2)},_ttsAssets:{apple:secondAsset}}));
    await remount({session,words:edited});
    expect([...state.selectedWords]).toEqual(['apple','fire']);
    expect(state.previewList).toContain('fire');
    expect(state.reviewedSyllableCounts['en:fire']).toBe(fire);
    expect(state.applySetupSyllableReviews()).toBe(edited);
    await click('Review Words');
    expect(props.onShowReview.mock.calls[1][0][0].activityItems.syllable_counting.count).toBe(3);
    expect(session.counts['en:fire']).toBe(fire);
    expect(words[0].activityItems.syllable_counting).toBeUndefined();
  });

  it('retains a custom word recording exclusion and undo until that word is handed off', async () => {
    const session = {}, words = [row('apple')], board = recording(), original = count('fire',2);
    await render({session,words});
    await invoke(state => {
      state.select('fire'); state.saveReviewedSyllableRecording('fire',board);
      state.saveSyllableCount('fire',original,{asset});
    });
    await invoke(state => state.useCountWithoutRecording('fire',count('fire',1,secondAsset,2),{asset:secondAsset}));
    await click('Review Words');
    await remount({session,words:props.onShowReview.mock.calls[0][0]});
    expect(state.detachedSyllableRecordings['en:fire']).toMatchObject({count:original,audio:asset,replacementAudio:secondAsset});
    await invoke(state => state.undoCountRecordingExclusion('en:fire'));
    expect(state.reviewedSyllableCounts['en:fire']).toBe(original);
    expect(state.reviewedSyllableTasks[JSON.stringify(['fire',core.packAudioLanguageKey('en')])]).toBe(board);
  });

  it('returns the existing pack by identity when no setup approval changed it', async () => {
    const words = freeze([row()]);
    await render({words});
    await click('Review Words');
    expect(props.onShowReview).toHaveBeenCalledWith(words);
  });
});
