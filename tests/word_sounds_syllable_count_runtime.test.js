import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_module.js', 'utf8').replace(/\r\n/g, '\n');
const createCore = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore;')();
function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing production boundary: ${startMarker}`);
  return source.slice(start, end);
}
const helpersSource = between('    const syllableCountWordKey =', '    // SyllableCountingView');
const makeHelpers = new Function('WS_CORE', 'window', helpersSource + '\nreturn { syllableCountWordKey, syllableCountAudioFor, syllableCountContextKey, syllableCountReady, syllableCountDeliveryReady };');
const helpers = makeHelpers(createCore(), {});
const generationSource = between('      const generateSyllableData = React.useCallback(', '      // Trigger syllable data generation');
const effectSource = between('      // Trigger syllable data generation', '      // Trigger generation whenever the word changes while in manipulation mode.');
const viewSource = between('    const SyllableCountingView =', '    // BEGIN WORD SOUNDS TILE ANSWER LIFECYCLE');
const renderSource = between('          case "syllable_counting": {', '          case "rhyming": {');
const React = {
  useCallback: fn => fn, useEffect: fn => fn(), memo: fn => fn,
  useRef: value => ({ current: value }), useLayoutEffect: () => {},
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
};
const textHelper = between('    const wordSoundsCountResultText =', '    const wordSoundsCountResultLine =');
const View = new Function('React', 'syllableCountReady', textHelper + viewSource + '\nreturn SyllableCountingView;')(React, helpers.syllableCountReady);
const all = node => node && typeof node === 'object' ? [node, ...node.children.flatMap(all)] : [];
const text = node => typeof node === 'string' ? node : node?.children?.map(text).join('') || '';
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { resolve, promise }; };
const dictionary = { apple: ['10'], table: ['10'], vehicle: ['100'], family: ['100', '10'] };
const item = (word, count) => ({ word, syllables: [word], activityItems: {
  syllable_blending: { supported: false, syllables: [], options: [] },
  ...(count ? { syllable_counting: { syllables: count === 2 ? ['ap', 'ple'] : [word], answer: count } } : {}),
} });
const audioAsset = (value = 0) => {
  const bytes = Buffer.alloc(68); bytes.write('RIFF'); bytes.write('WAVE', 8); bytes[60] = value;
  return { mime: 'audio/wav', base64: bytes.toString('base64'), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
};
const approve = (core, input) => core.createReviewedSyllableCount({ ...input,
  audioContext: input.audioContext || core.createSyllableCountAudioContext({ language: input.language }) });

function runtime(initialItem, { language = 'en', voice = '', core = createCore({ pronunciations: { lookup: word => dictionary[word] || [] } }) } = {}) {
  const state = { data: null, generating: false, writes: [] };
  const localHelpers = makeHelpers(core, {});
  const env = {
    React, ...localHelpers, WS_CORE: core, wordSoundsActivity: 'syllable_counting', wordSoundsLanguage: language, selectedVoice: voice,
    currentWordSoundsWord: initialItem.word, wordSoundsPhonemes: initialItem, preloadedWords: [initialItem],
    syllableData: null, syllableDataRef: { current: null }, lastWordForSyllable: { current: null },
    syllableGenInFlightRef: { current: null }, syllableCountContextRef: { current: null }, syllableCountAudioRef: { current: null }, isMountedRef: { current: true },
    syllableCountDelivery: null, syllableCountDeliveryRef: { current: null }, syllableCountAttemptRef: { current: 0 },
    advanceEpochRef: { current: 1 }, activePlaybackRef: { current: null }, submissionLockRef: { current: false },
    setSyllableCountDelivery: value => { env.syllableCountDelivery = value; },
    callGemini: vi.fn(), warnLog: vi.fn(), setSyllableTapCount: vi.fn(),
    setSyllableData: data => { state.data = data; state.writes.push(data); env.syllableData = data; },
    setIsGeneratingSyllable: value => { state.generating = value; },
  };
  const update = (nextItem, nextLanguage = env.wordSoundsLanguage, nextVoice = env.selectedVoice) => {
    env.wordSoundsPhonemes = nextItem; env.currentWordSoundsWord = nextItem.word; env.wordSoundsLanguage = nextLanguage;
    env.selectedVoice = nextVoice; env.preloadedWords = [nextItem];
    env.syllableCountAudio = localHelpers.syllableCountAudioFor(nextItem.word, nextLanguage, nextItem, env.preloadedWords, {}, nextVoice);
    env.syllableCountAudioRef.current = env.syllableCountAudio;
    env.syllableCountContextRef.current = localHelpers.syllableCountContextKey(nextItem.word, nextLanguage, nextItem, env.syllableCountAudio.context);
  };
  update(initialItem);
  const generate = word => {
    const dependencies = Object.fromEntries(Object.entries(env).filter(([key]) => key !== 'generateSyllableData'));
    return new Function(...Object.keys(dependencies), generationSource + '\nreturn generateSyllableData;')(...Object.values(dependencies))(word || env.currentWordSoundsWord);
  };
  const effect = async () => {
    let pending;
    env.generateSyllableData = word => { pending = generate(word); return pending; };
    new Function(...Object.keys(env), effectSource)(...Object.values(env));
    await pending;
  };
  return { state, env, core, update, generate, effect };
}

function deliver(harness, mode = 'recorded_audio') {
  const env = harness.env;
  env.syllableCountDelivery = env.syllableCountDeliveryRef.current = { delivered: true, deliveryMode: mode,
    contextKey: env.syllableCountContextRef.current, epoch: env.advanceEpochRef.current, attempt: env.syllableCountAttemptRef.current };
}

function renderCounting(harness) {
  const checkAnswer = vi.fn();
  const env = { ...harness.env, React, SyllableCountingView: 'counting-view', renderPrompt: () => null,
    isGeneratingSyllable: harness.state.generating, syllableTapCount: 2, setSyllableTapCount: vi.fn(),
    handleAudio: vi.fn(), isPlayingAudio: false, checkAnswer, ts: () => '' };
  const output = new Function(...Object.keys(env), `switch ('syllable_counting') { ${renderSource} }`)(...Object.values(env));
  return { props: all(output).find(node => node.type === 'counting-view').props, checkAnswer, setTapCount: env.setSyllableTapCount };
}

describe('shared syllable-count resolution in the runtime', () => {
  it.each(['apple', 'table'])('does not let an unsupported blending board mask the prepared count for %s', async word => {
    const harness = runtime(item(word, 2));
    const resolve = vi.spyOn(harness.core, 'resolveSyllableCount');
    const load = vi.spyOn(harness.core, 'loadSyllablePronunciations');
    await harness.generate();
    expect(resolve.mock.calls[0][1].prepared).toBe(harness.env.wordSoundsPhonemes.activityItems.syllable_counting);
    expect(harness.state.data).toMatchObject({ supported: true, count: 2, status: 'dictionary' });
    expect(harness.env.callGemini).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it('uses a signed teacher count immediately, including words outside English', async () => {
    const core = createCore({ pronunciations: { lookup: () => [] } });
    const prepared = approve(core, { targetWord: 'café', language: 'es', count: 2, revision: 1, reviewed: true });
    const harness = runtime({ ...item('café'), activityItems: { syllable_counting: prepared } }, { language: 'es', core });
    const load = vi.spyOn(core, 'loadSyllablePronunciations');
    await harness.generate();
    expect(harness.state.data).toMatchObject({ count: 2, status: 'reviewed', source: 'teacher_review' });
    expect(load).not.toHaveBeenCalled();
  });

  it('loads dictionary evidence before resolving and never asks Gemini to invent a count', async () => {
    let loaded = false;
    const core = createCore({ pronunciations: { lookup: () => loaded ? ['100'] : [] } });
    const pending = deferred();
    vi.spyOn(core, 'loadSyllablePronunciations').mockImplementation(async () => { await pending.promise; loaded = true; });
    const harness = runtime(item('vehicle'), { core });
    const request = harness.generate();
    expect(harness.state.data).toBeNull();
    expect(harness.state.generating).toBe(true);
    pending.resolve(); await request;
    expect(harness.state.data).toMatchObject({ supported: true, count: 3 });
    expect(harness.state.generating).toBe(false);
    expect(harness.env.callGemini).not.toHaveBeenCalled();
  });

  it.each(['inventedword', 'family'])('keeps unknown or pronunciation-dependent %s ungraded', async word => {
    const harness = runtime(item(word, 2));
    vi.spyOn(harness.core, 'loadSyllablePronunciations').mockResolvedValue(null);
    await harness.generate();
    expect(harness.state.data).toMatchObject({ supported: false, count: null, status: 'needs_review' });
    expect(harness.env.callGemini).not.toHaveBeenCalled();
    if (word === 'family') expect(harness.state.data.counts).toEqual([2, 3]);
    const rendered = renderCounting(harness);
    rendered.props.onCheckAnswer(2);
    expect(rendered.checkAnswer).not.toHaveBeenCalled();
  });

  it.each(['word', 'language', 'activity', 'review', 'audio', 'unmount'])('discards an awaited count after changing %s', async change => {
    const core = createCore({ pronunciations: { lookup: () => [] } });
    const pending = deferred();
    vi.spyOn(core, 'loadSyllablePronunciations').mockReturnValue(pending.promise);
    const harness = runtime(item('inventedword'), { core });
    const request = harness.generate();
    if (change === 'word') harness.update(item('apple'));
    if (change === 'language') harness.update(harness.env.wordSoundsPhonemes, 'es');
    if (change === 'activity') harness.env.syllableCountContextRef.current = null;
    if (change === 'review') harness.update({ ...item('inventedword'), activityItems: { syllable_counting:
      approve(core, { targetWord: 'inventedword', language: 'en', count: 3, revision: 2, reviewed: true }) } });
    if (change === 'audio') harness.update({ ...harness.env.wordSoundsPhonemes, _ttsAssets: { inventedword: audioAsset(1) } });
    if (change === 'unmount') harness.env.isMountedRef.current = false;
    pending.resolve(); await request;
    expect(harness.state.writes).toEqual([]);
    expect(harness.env.syllableDataRef.current).toBeNull();
  });

  it('refreshes the same word after a teacher reviews its count and grades only the current review', async () => {
    const harness = runtime(item('family'));
    vi.spyOn(harness.core, 'loadSyllablePronunciations').mockResolvedValue(null);
    await harness.effect();
    expect(harness.state.data.supported).toBe(false);
    const beforeReview = renderCounting(harness);
    const reviewed = approve(harness.core, { targetWord: 'family', language: 'en', count: 3, revision: 1, reviewed: true });
    harness.update({ ...item('family'), activityItems: { syllable_counting: reviewed } });
    beforeReview.props.onCheckAnswer(2);
    expect(beforeReview.checkAnswer).not.toHaveBeenCalled();
    await harness.effect();
    expect(harness.state.data).toMatchObject({ supported: true, count: 3, status: 'reviewed' });
    deliver(harness, 'teacher_spoken');
    const current = renderCounting(harness);
    current.props.onCheckAnswer(3);
    expect(current.checkAnswer).toHaveBeenCalledWith('correct', 'correct', { taskEvidence: { submittedCount: 3, expectedCount: 3, deliveryMode: 'teacher_spoken' } });
    current.props.onCheckAnswer(2);
    expect(current.checkAnswer).toHaveBeenLastCalledWith('incorrect', 'correct', { taskEvidence: { submittedCount: 2, expectedCount: 3, deliveryMode: 'teacher_spoken' } });
  });

  it('shows review guidance and listening but no tap or submit controls for unresolved data', () => {
    const hear = vi.fn();
    for (const data of [null, { supported: false, count: null, counts: [2, 3] }]) {
      const output = View({ data, word: 'family', tapCount: 3, onPlayAudio: hear, ts: () => '' });
      expect(text(output)).toContain('needs a reviewed syllable count');
      expect(all(output).some(node => node.props.role === 'status')).toBe(true);
      const buttons = all(output).filter(node => node.type === 'button');
      expect(buttons).toHaveLength(1);
      expect(text(buttons[0])).toBe('Hear the word again');
      buttons[0].props.onClick();
    }
    expect(hear).toHaveBeenCalledWith('family');
  });

  it('blocks grading immediately when whole-word audio changes and rejects an older pending refresh', async () => {
    const core = createCore({ pronunciations: { lookup: () => ['10'] } });
    const asset = audioAsset();
    const audioContext = core.createSyllableCountAudioContext({ asset, language: 'en-US' });
    const prepared = approve(core, { targetWord: 'apple', language: 'en-US', count: 2, revision: 1, reviewed: true, audioContext });
    const original = { ...item('apple'), _ttsAssets: { apple: asset }, activityItems: { syllable_counting: prepared } };
    const harness = runtime(original, { core, language: 'en-US' });
    await harness.effect();
    const beforeChange = renderCounting(harness);
    const pending = deferred();
    vi.spyOn(core, 'loadSyllablePronunciations').mockReturnValue(pending.promise);
    harness.update({ ...original, _ttsAssets: { apple: audioAsset(1) } });
    beforeChange.props.onCheckAnswer(2);
    expect(beforeChange.checkAnswer).not.toHaveBeenCalled();
    const request = harness.generate();
    harness.update({ ...original, _ttsAssets: { apple: audioAsset(2) } });
    const previousWrites = harness.state.writes.length;
    pending.resolve(); await request;
    expect(harness.state.writes).toHaveLength(previousWrites);
    await harness.generate();
    expect(harness.state.data).toMatchObject({ supported: false, count: null, reason: 'count_audio_changed' });
    const changed = renderCounting(harness);
    changed.props.onCheckAnswer(2);
    expect(changed.checkAnswer).not.toHaveBeenCalled();
  });

  it('keeps identical portable clips ready when the selected student voice differs', async () => {
    const core = createCore({ pronunciations: { lookup: () => ['100', '10'] } });
    const asset = { ...audioAsset(), provenance: { resolvedVoice: 'teacher-voice' } };
    const prepared = approve(core, { targetWord: 'family', language: 'en-US', count: 3, revision: 1, reviewed: true,
      audioContext: core.createSyllableCountAudioContext({ asset, language: 'en-US', voice: 'teacher-default' }) });
    const portable = JSON.parse(JSON.stringify({ ...item('family'), _ttsAssets: { family: asset }, activityItems: { syllable_counting: prepared } }));
    const harness = runtime(portable, { core, language: 'en-US', voice: 'student-default' });
    await harness.effect();
    expect(harness.state.data).toMatchObject({ supported: true, count: 3, status: 'reviewed' });
    const contextKey = harness.env.syllableCountContextRef.current;
    deliver(harness);
    const rendered = renderCounting(harness);
    harness.update(portable, 'en-US', 'another-student-voice');
    expect(harness.env.syllableCountContextRef.current).toBe(contextKey);
    rendered.props.onCheckAnswer(3);
    expect(rendered.checkAnswer).toHaveBeenCalledWith('correct', 'correct', { taskEvidence: { submittedCount: 3, expectedCount: 3, deliveryMode: 'recorded_audio' } });
  });

  it('refreshes a changed recording and prevents an older manual count from grading', async () => {
    const core = createCore({ pronunciations: { lookup: () => ['100', '10'] } });
    vi.spyOn(core, 'loadSyllablePronunciations').mockResolvedValue(true);
    const prepared = approve(core, { targetWord: 'family', language: 'en-US', count: 2, revision: 1, reviewed: true });
    const original = { ...item('family'), activityItems: { syllable_counting: prepared } };
    const harness = runtime(original, { core, language: 'en-US' });
    await harness.effect();
    const beforeChange = renderCounting(harness);
    const recordedTask = core.createReviewedSyllableTask({ targetWord: 'family', language: 'en-US', reviewed: true, revision: 2,
      syllables: ['fam', 'i', 'ly'], assets: [audioAsset(), audioAsset(), audioAsset()] });
    harness.update({ ...original, activityItems: { ...original.activityItems, syllable_blending: recordedTask } });
    beforeChange.props.onCheckAnswer(2);
    expect(beforeChange.checkAnswer).not.toHaveBeenCalled();
    await harness.effect();
    expect(harness.state.data).toMatchObject({ supported: false, reason: 'count_recording_conflict', reviewedCount: 2, recordedCount: 3 });
    const current = renderCounting(harness);
    current.props.onCheckAnswer(2);
    current.props.onCheckAnswer(3);
    expect(current.checkAnswer).not.toHaveBeenCalled();
  });

  it('allows a reviewed twelve-syllable answer without silently clamping extra taps', async () => {
    const harness = runtime(item('longword'));
    const reviewed = approve(harness.core, { targetWord: 'longword', language: 'en', count: 12, revision: 1, reviewed: true });
    harness.update({ ...item('longword'), activityItems: { syllable_counting: reviewed } });
    await harness.generate();
    deliver(harness, 'teacher_spoken');
    const rendered = renderCounting(harness);
    rendered.props.onCheckAnswer(12);
    expect(rendered.checkAnswer).toHaveBeenLastCalledWith('correct', 'correct', { taskEvidence: { submittedCount: 12, expectedCount: 12, deliveryMode: 'teacher_spoken' } });
    rendered.props.onCheckAnswer(13);
    expect(rendered.checkAnswer).toHaveBeenLastCalledWith('incorrect', 'correct', { taskEvidence: { submittedCount: 13, expectedCount: 12, deliveryMode: 'teacher_spoken' } });
    const view = View({ ...rendered.props, tapCount: 13 });
    expect(text(view)).toContain('You tapped 13 times. Ready to submit.');
  });

  it('keeps the shared grading entry point closed for unsupported or stale counting data', () => {
    const check = source.indexOf('      const checkAnswer = React.useCallback(');
    const start = source.indexOf('          if (wordSoundsActivity', check);
    const end = source.indexOf('          debugLog(', start);
    const guard = source.slice(start, end);
    const canGrade = (data, receipt = { delivered: true, contextKey: 'current', epoch: 1, attempt: 0, deliveryMode: 'recorded_audio' }) => {
      const env = { wordSoundsActivity: 'syllable_counting', ...helpers, syllableDataRef: { current: data },
        currentWordSoundsWord: 'apple', wordSoundsPhonemes: {}, syllableCountContextRef: { current: 'current' },
        isMountedRef: { current: true }, isPlayingAudio: false, activePlaybackRef: { current: null },
        syllableCountDeliveryRef: { current: receipt }, advanceEpochRef: { current: 1 }, syllableCountAttemptRef: { current: 0 },
        opts: { taskEvidence: { submittedCount: 2 } } };
      return new Function(...Object.keys(env), guard + '\nreturn true;')(...Object.values(env));
    };
    const valid = { supported: true, targetWord: 'apple', count: 2, _contextKey: 'current' };
    expect(canGrade(valid)).toBe(true);
    expect(canGrade(valid, null)).toBeUndefined();
    expect(canGrade(valid, { delivered: true, contextKey: 'current', epoch: 1, attempt: -1, deliveryMode: 'recorded_audio' })).toBeUndefined();
    for (const value of [{ ...valid, supported: false }, { ...valid, _contextKey: 'old' }, { ...valid, targetWord: 'table' }]) {
      expect(canGrade(value)).toBeUndefined();
    }
  });

  it('keeps taps available during playback but gates Submit until delivery', () => {
    const props = { data: { supported: true, targetWord: 'apple', count: 2 }, word: 'apple', tapCount: 2,
      isAudioBusy: true, canSubmit: false, ts: () => '' };
    const buttons = all(View(props)).filter(node => node.type === 'button');
    expect(buttons.find(node => node.props['aria-label'] === 'Tap to count syllables').props.disabled).not.toBe(true);
    expect(buttons.find(node => text(node).startsWith('Submit')).props.disabled).toBe(true);
    expect(all(View({ ...props, isAudioBusy: false, canSubmit: true })).find(node => node.type === 'button' && text(node).startsWith('Submit')).props.disabled).toBe(false);
  });

  it('requires explicit teacher acknowledgment and rejects acknowledgments retained from older attempts', async () => {
    const harness = runtime(item('family'));
    const prepared = approve(harness.core, { targetWord: 'family', language: 'en', count: 3, revision: 1, reviewed: true });
    harness.update({ ...item('family'), activityItems: { syllable_counting: prepared } });
    await harness.generate();
    const first = renderCounting(harness);
    expect(first.props.canSubmit).toBe(false);
    first.props.onCheckAnswer(3);
    expect(first.checkAnswer).not.toHaveBeenCalled();
    first.props.onTeacherReady();
    expect(harness.env.syllableCountDeliveryRef.current.deliveryMode).toBe('teacher_spoken');
    const ready = renderCounting(harness);
    expect(ready.props.canSubmit).toBe(true);
    ready.props.onCheckAnswer(3);
    expect(ready.checkAnswer).toHaveBeenCalledOnce();
    harness.env.syllableCountAttemptRef.current++;
    harness.env.syllableCountDeliveryRef.current = null;
    first.props.onTeacherReady();
    ready.props.onCheckAnswer(3);
    expect(harness.env.syllableCountDeliveryRef.current).toBeNull();
    expect(ready.checkAnswer).toHaveBeenCalledOnce();
  });

  it('undoes one tap without consuming the current delivery receipt', async () => {
    const harness = runtime(item('apple'));
    await harness.generate(); deliver(harness);
    const receipt = harness.env.syllableCountDeliveryRef.current;
    const rendered = renderCounting(harness);
    rendered.props.onUndo();
    // The setter owns only tap state; delivery remains ready for the same word.
    const update = rendered.setTapCount.mock.calls[0][0];
    expect(update(3)).toBe(2);
    expect(update(0)).toBe(0);
    expect(harness.env.syllableCountDeliveryRef.current).toBe(receipt);
    expect(rendered.props.canSubmit).toBe(true);
  });
});
