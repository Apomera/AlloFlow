import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const audio = tag => { const bytes = Buffer.alloc(80, tag); bytes.write('RIFF'); bytes.write('WAVE', 8); return { mime: 'audio/wav', base64: bytes.toString('base64') }; };
// Persisted shape produced by the old recording-to-count auto-approval path.
// This is intentionally not a new explicit whole-word pronunciation approval.
const legacyRecordingCount = (recording, wholeWord) => {
  const task = { ...core.createReviewedSyllableCount({ targetWord: recording.targetWord, language: recording.language,
    count: recording.syllables.length, revision: recording.revision, reviewed: true,
    audioContext: core.createSyllableCountAudioContext({ asset: wholeWord, language: recording.language }) }),
    source: 'teacher_recording', recordingSignature: recording.review.signature };
  task.review = { confirmed: true, signature: JSON.stringify([task.targetWord, task.language, task.revision,
    task.count, task.source, task.recordingSignature, task.audioContext.signature]) };
  return task;
};
let Modal, root, container, originalPanel, originalAudio, lastClip, state;
beforeAll(() => { Modal = setupWordSounds().WordSoundsModal; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; container?.remove();
  window.WordSoundsReviewPanel = originalPanel;
  window.Audio = originalAudio; globalThis.Audio = originalAudio;
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function mount(initial) {
  originalPanel = window.WordSoundsReviewPanel;
  originalAudio = window.Audio;
  window.AlloModules.WordSoundsPronunciations = { lookup: word => word === 'fire' ? ['1', '10'] : [] };
  class Clip {
    constructor(src) { this.src = src; lastClip = this; }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  window.Audio = Clip; globalThis.Audio = Clip;
  // Keep production modal logic and editors; replace only the surrounding
  // review layout so this test can inspect its public integration contract.
  window.WordSoundsReviewPanel = props => {
    const [expanded, setExpanded] = React.useState(true);
    state.panel = props;
    return React.createElement('main', { onKeyDown: event => {
      if (event.key === 'Escape') { event.preventDefault(); props.onBackToSetup(); }
    } }, props.packMaintenance,
      React.createElement('button', { onClick: props.onClose }, 'Close fixture review'),
      React.createElement('button', { onClick: props.onBackToSetup }, 'Back to fixture setup'),
      React.createElement('button', { onClick: () => setExpanded(value => !value) }, 'Toggle fixture review'),
      ...(expanded ? props.preloadedWords.map((item, index) => React.createElement('section', { key: index }, props.renderSyllableEditor(item, index))) : []),
      React.createElement('button', { onClick: props.onStartActivity }, 'Start fixture lesson'));
  };
  state = { close: vi.fn(), back: vi.fn() };
  function Host() {
    const [words, setWords] = React.useState(initial);
    const [current, setCurrent] = React.useState(initial[0]);
    const [learner, setLearner] = React.useState('first-learner');
    state.words = words; state.replace = setWords; state.setLearner = setLearner;
    return React.createElement(Modal, { ...baseProps('syllable_counting'), isTeacherMode: true,
      learnerId: learner,
      initialShowReviewPanel: true, initialActivitySequence: ['syllable_counting'], playInstructions: false,
      currentWordSoundsWord: 'fire', wordSoundsPhonemes: current, setWordSoundsPhonemes: setCurrent,
      wsPreloadedWords: words, setWsPreloadedWords: setWords, selectedVoice: 'new-default-voice',
      onClose: state.close, onBackToSetup: state.back,
    });
  }
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Host)));
  await openReviews();
}
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);
async function openReviews() {
  await act(async () => {
    container.querySelectorAll('details[id^="ws-syllables-"]').forEach(details => {
      details.open = true; Simulate.toggle(details);
    });
  });
}
async function toggleFixtureReview() {
  await act(async () => button('Toggle fixture review').click());
  await openReviews();
}

describe('count approvals in the actual pre-activity modal', () => {
  const reviewedWord = (clip = audio(12), count = 2, recording) => {
    const audioContext = core.createSyllableCountAudioContext({ asset: clip, language: 'en' });
    const approval = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count, revision: 1, reviewed: true, audioContext });
    return { word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: clip },
      activityItems: { syllable_counting: approval, ...(recording ? { syllable_blending: recording } : {}) } };
  };

  it('requires a completed whole-word preview and explicit count confirmation after saving syllable recordings', async () => {
    const wholeWord = audio(21);
    const syllableClip = { ...audio(22), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
    const recording = core.createReviewedSyllableTask({ targetWord: 'fire', language: 'en', syllables: ['fi', 're'],
      assets: [syllableClip, syllableClip], revision: 1, reviewed: true });
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: wholeWord } }]);
    const recordingEditor = state.panel.renderSyllableEditor(state.words[0], 0).props.children().props.children
      .find(child => child?.type?.name === 'WordSoundsSyllableRecordingEditor');
    // A recording editor supplies this task only after its syllable sequence
    // was heard and approved. Exercise the modal's actual save integration.
    await act(async () => recordingEditor.props.onSave(recording));
    expect(state.words[0].activityItems.syllable_blending.review.signature).toBe(recording.review.signature);
    expect(container.textContent).toContain('Review count: fire');
    await act(async () => button('Start fixture lesson').click());
    expect(button('Start fixture lesson')).toBeTruthy();
    expect(state.panel.syllableReviewRequest.index).toBe(0);
    const confirmation = () => [...container.querySelectorAll('label')]
      .find(node => node.textContent.includes('I checked this spoken pronunciation')).querySelector('input');
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '2' } }));
    expect(confirmation().disabled).toBe(true);
    expect(button('Save reviewed count').disabled).toBe(true);
    await act(async () => button('Listen to whole word').click());
    expect(lastClip.src).toBe('data:audio/wav;base64,' + wholeWord.base64);
    expect(confirmation().disabled).toBe(true);
    expect(button('Save reviewed count').disabled).toBe(true);
    await act(async () => lastClip.onended());
    expect(confirmation().disabled).toBe(false);
    expect(button('Save reviewed count').disabled).toBe(true);
    await act(async () => Simulate.change(confirmation(), { target: { checked: true } }));
    await act(async () => button('Save reviewed count').click());
    expect(state.words[0].activityItems.syllable_counting).toMatchObject({
      supported: true, source: 'teacher_review', count: 2,
      audioContext: core.createSyllableCountAudioContext({ asset: wholeWord, language: 'en' }),
    });
    expect(container.textContent).not.toContain('Review count: fire');
    vi.useFakeTimers();
    await act(async () => button('Start fixture lesson').click());
    expect(button('Start fixture lesson')).toBeUndefined();
  });

  it.each([true, false])('blocks historical recording-derived count approvals when saved syllable clips are present: %s', async includeRecording => {
    const wholeWord = audio(23);
    const syllableClip = { ...audio(24), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
    const recording = core.createReviewedSyllableTask({ targetWord: 'fire', language: 'en', syllables: ['fi', 're'],
      assets: [syllableClip, syllableClip], revision: 1, reviewed: true });
    const approval = legacyRecordingCount(recording, wholeWord);
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: wholeWord },
      activityItems: { syllable_counting: approval, ...(includeRecording ? { syllable_blending: recording } : {}) } }]);
    const countEditor = state.panel.renderSyllableEditor(state.words[0], 0).props.children().props.children
      .find(child => child?.type?.name === 'WordSoundsSyllableCountReview');
    expect(countEditor.props.resolution).toMatchObject({ supported: false, reason: 'count_recording_review_required', counts: [2] });
    await act(async () => button('Start fixture lesson').click());
    expect(button('Start fixture lesson')).toBeTruthy();
    expect(container.textContent).toContain('Review count: fire');
    expect(button('Save reviewed count').disabled).toBe(true);
    expect(state.words[0].activityItems.syllable_counting).toEqual(approval);
  });

  it('offers an explicit recording exclusion when whole-word review finds a different count', async () => {
    const wholeWord = audio(25);
    const syllableClip = { ...audio(26), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
    const recording = { ...core.createReviewedSyllableTask({ targetWord: 'fire', language: 'en', syllables: ['fi', 're'],
      assets: [syllableClip, syllableClip], revision: 1, reviewed: true }), options: ['fire', 'sunset'], answer: 'fire' };
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: wholeWord },
      activityItems: { syllable_blending: recording } }]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    expect(button('Inspect or repair the syllable recording')).toBeTruthy();
    expect(button('Use this count without the old syllable recording').disabled).toBe(true);
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    const confirm = [...container.querySelectorAll('label')]
      .find(node => node.textContent.includes('I checked this spoken pronunciation')).querySelector('input');
    await act(async () => Simulate.change(confirm, { target: { checked: true } }));
    await act(async () => button('Save reviewed count').click());
    expect(state.words[0].activityItems.syllable_counting).toBeUndefined();
    expect(container.textContent).toContain('count still conflicts');
    await act(async () => button('Use this count without the old syllable recording').click());
    expect(state.words[0].activityItems.syllable_blending).toBeUndefined();
    expect(state.words[0].activityItems.syllable_counting).toMatchObject({ source: 'teacher_review', count: 1 });
    expect(container.textContent).not.toContain('Review count: fire');
    expect(button('Undo recording exclusion')).toBeTruthy();
  });

  it('protects an unfinished count on Close, restores focus on Keep editing, and discards only on request', async () => {
    await mount([reviewedWord()]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    const close = button('Close fixture review');
    await act(async () => { close.focus(); close.click(); });
    expect(container.textContent).toContain('Discard unfinished syllable edits?');
    expect(state.close).not.toHaveBeenCalled();
    expect(state.back).not.toHaveBeenCalled();
    expect(button('Keep editing')).toBe(document.activeElement);
    await act(async () => button('Keep editing').click());
    expect(container.textContent).not.toContain('Discard unfinished syllable edits?');
    expect(document.activeElement).toBe(close);
    expect(container.querySelector('input[type="number"]').value).toBe('1');
    expect(state.words[0].activityItems.syllable_counting.count).toBe(2);
    await act(async () => close.click());
    await act(async () => button('Discard edits').click());
    expect(state.close).toHaveBeenCalledTimes(1);
    expect(state.back).not.toHaveBeenCalled();
    expect(state.words[0].activityItems.syllable_counting.count).toBe(2);
  });

  it('protects unfinished recording edits on Back and preserves the saved recording when discarded', async () => {
    const clip = { ...audio(15), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
    const recording = core.createReviewedSyllableTask({ targetWord: 'fire', language: 'en', syllables: ['fi', 're'], assets: [clip, clip], revision: 1, reviewed: true });
    await mount([reviewedWord(clip, 2, recording)]);
    await act(async () => Simulate.change(container.querySelector('input[maxlength="40"]'), { target: { value: 'fye' } }));
    const back = button('Back to fixture setup');
    await act(async () => { back.focus(); back.click(); });
    expect(container.textContent).toContain('Discard unfinished syllable edits?');
    expect(state.back).not.toHaveBeenCalled();
    await act(async () => button('Keep editing').click());
    expect(document.activeElement).toBe(back);
    expect(container.querySelector('input[maxlength="40"]').value).toBe('fye');
    await act(async () => back.click());
    await act(async () => button('Discard edits').click());
    expect(state.back).toHaveBeenCalledTimes(1);
    expect(state.close).not.toHaveBeenCalled();
    expect(state.words[0].activityItems.syllable_blending).toEqual(recording);
  });

  it('treats Escape from the discard notice as Keep editing without closing the review', async () => {
    await mount([reviewedWord()]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    const close = button('Close fixture review');
    await act(async () => { close.focus(); close.click(); });
    await act(async () => button('Keep editing').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(button('Keep editing')).toBeUndefined();
    expect(document.activeElement).toBe(close);
    expect(container.querySelector('input[type="number"]').value).toBe('1');
    expect(state.close).not.toHaveBeenCalled();
    expect(state.back).not.toHaveBeenCalled();
  });

  it('opens the discard choice on review Escape and lets a second Escape cancel it', async () => {
    await mount([reviewedWord()]);
    const input = container.querySelector('input[type="number"]');
    await act(async () => Simulate.change(input, { target: { value: '1' } }));
    await act(async () => {
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(button('Keep editing')).toBe(document.activeElement);
    expect(state.back).not.toHaveBeenCalled();
    await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(button('Keep editing')).toBeUndefined();
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('1');
    expect(state.close).not.toHaveBeenCalled();
    expect(state.back).not.toHaveBeenCalled();
  });

  it('keeps protecting a count draft while its editor is collapsed', async () => {
    await mount([reviewedWord()]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await toggleFixtureReview();
    expect(container.querySelector('input[type="number"]')).toBeNull();
    await act(async () => button('Close fixture review').click());
    expect(container.textContent).toContain('Discard unfinished syllable edits?');
    expect(state.close).not.toHaveBeenCalled();
    await act(async () => button('Keep editing').click());
    await toggleFixtureReview();
    expect(container.querySelector('input[type="number"]').value).toBe('1');
  });

  it.each([
    ['Close fixture review', 'close'],
    ['Back to fixture setup', 'back'],
  ])('allows %s immediately when no edits are pending', async (label, callback) => {
    await mount([reviewedWord()]);
    await act(async () => button(label).click());
    expect(button('Keep editing')).toBeUndefined();
    expect(state[callback]).toHaveBeenCalledTimes(1);
  });

  it('allows closing after a count change is reverted to the saved value', async () => {
    await mount([reviewedWord()]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '2' } }));
    await act(async () => button('Close fixture review').click());
    expect(button('Keep editing')).toBeUndefined();
    expect(state.close).toHaveBeenCalledTimes(1);
  });

  it('ignores a draft from a replaced pronunciation when closing the review', async () => {
    await mount([reviewedWord()]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await act(async () => state.replace([reviewedWord(audio(16))]));
    expect(container.querySelector('input[type="number"]').value).toBe('2');
    await act(async () => button('Close fixture review').click());
    expect(button('Keep editing')).toBeUndefined();
    expect(state.close).toHaveBeenCalledTimes(1);
  });

  it('requires a choice before starting with an unsaved count and preserves the saved answer', async () => {
    await mount([reviewedWord()]);
    vi.useFakeTimers();
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    expect(container.textContent).toContain('Unsaved');
    await act(async () => button('Start fixture lesson').click());
    expect(container.querySelector('[data-syllable-unsaved-notice]')?.textContent).toContain('fire');
    expect(document.activeElement).toBe(container.querySelector('[data-syllable-unsaved-notice]'));
    expect(state.words[0].activityItems.syllable_counting.count).toBe(2);
    await act(async () => button('Review edits').click());
    expect(state.panel.syllableReviewRequest.index).toBe(0);
    expect(container.querySelector('input[type="number"]').value).toBe('1');
    await act(async () => button('Start fixture lesson').click());
    await act(async () => button('Use saved version').click());
    expect(button('Start fixture lesson')).toBeUndefined();
    expect(state.words[0].activityItems.syllable_counting.count).toBe(2);
  });

  it('includes unfinished recording edits in the Start choice without modifying approved clips', async () => {
    const clip = { ...audio(13), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
    const recording = core.createReviewedSyllableTask({ targetWord: 'fire', language: 'en', syllables: ['fi', 're'], assets: [clip, clip], revision: 1, reviewed: true });
    await mount([reviewedWord(clip, 2, recording)]);
    vi.useFakeTimers();
    await act(async () => Simulate.change(container.querySelector('input[maxlength="40"]'), { target: { value: 'fye' } }));
    await act(async () => button('Start fixture lesson').click());
    expect(button('Review edits')).toBeTruthy();
    await act(async () => button('Review edits').click());
    const editor = container.querySelector('#ws-recordings-0');
    expect(editor.open).toBe(true);
    expect(editor.contains(document.activeElement)).toBe(true);
    expect(editor.querySelector('input[maxlength="40"]').value).toBe('fye');
    await act(async () => button('Start fixture lesson').click());
    await act(async () => button('Use saved version').click());
    expect(button('Start fixture lesson')).toBeUndefined();
    expect(state.words[0].activityItems.syllable_blending).toEqual(recording);
  });

  it('does not prompt after a count edit is reverted to its saved value', async () => {
    await mount([reviewedWord()]);
    vi.useFakeTimers();
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '2' } }));
    await act(async () => button('Start fixture lesson').click());
    expect(button('Start fixture lesson')).toBeUndefined();
    expect(container.querySelector('[data-syllable-unsaved-notice]')).toBeNull();
  });

  it('ignores an old draft after the pronunciation has a new saved approval', async () => {
    await mount([reviewedWord()]);
    vi.useFakeTimers();
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    await act(async () => state.replace([reviewedWord(audio(14))]));
    expect(container.querySelector('input[type="number"]').value).toBe('2');
    await act(async () => button('Start fixture lesson').click());
    expect(button('Start fixture lesson')).toBeUndefined();
    expect(container.querySelector('[data-syllable-unsaved-notice]')).toBeNull();
  });

  it('stops hidden playback when the inner review is collapsed and restores only its draft', async () => {
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: audio(11) } }]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '3' } }));
    await act(async () => button('Listen to whole word').click());
    const playing = lastClip;
    const details = container.querySelector('#ws-syllables-0');
    await act(async () => { details.open = false; Simulate.toggle(details); });
    expect(playing.paused).toBe(true);
    expect(container.querySelector('input[type="number"]')).toBeNull();
    await act(async () => playing.onended());
    await openReviews();
    expect(container.querySelector('input[type="number"]').value).toBe('3');
    expect(button('Save reviewed count').disabled).toBe(true);
  });

  it('restores collapsed review drafts without restoring approval and clears them for another learner', async () => {
    const clip = audio(8);
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: clip } }]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '3' } }));
    await act(async () => Simulate.change(container.querySelector('input[maxlength="40"]'), { target: { value: 'fye' } }));
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    const confirmation = () => [...container.querySelectorAll('label')].find(node => node.textContent.includes('I checked this spoken pronunciation')).querySelector('input');
    await act(async () => Simulate.change(confirmation(), { target: { checked: true } }));
    expect(button('Save reviewed count').disabled).toBe(false);
    await toggleFixtureReview();
    expect(container.querySelector('input[type="number"]')).toBeNull();
    await toggleFixtureReview();
    expect(container.querySelector('input[type="number"]').value).toBe('3');
    expect(container.querySelector('input[maxlength="40"]').value).toBe('fye');
    expect(confirmation().checked).toBe(false);
    expect(confirmation().disabled).toBe(true);
    expect(button('Save reviewed count').disabled).toBe(true);
    await toggleFixtureReview();
    await act(async () => state.setLearner('second-learner'));
    await toggleFixtureReview();
    expect(container.querySelector('input[type="number"]').value).toBe('');
    expect(container.querySelector('input[maxlength="40"]').value).not.toBe('fye');
  });

  it('discards a collapsed numeric draft when its reviewed audio changes', async () => {
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: audio(9) } }]);
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '3' } }));
    await toggleFixtureReview();
    await act(async () => state.replace(previous => previous.map(item => ({ ...item, _ttsAssets: { fire: audio(10) } }))));
    await toggleFixtureReview();
    expect(container.querySelector('input[type="number"]').value).toBe('');
    expect(button('Save reviewed count').disabled).toBe(true);
  });

  it('opens the conflicting recording and allows a confirmed count-only exclusion with undo', async () => {
    const clip = { ...audio(7), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
    const context = core.createSyllableCountAudioContext({ asset: clip, language: 'en' });
    const approval = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: context });
    const recording = { ...core.createReviewedSyllableTask({ targetWord: 'fire', language: 'en', syllables: ['fi', 're'], assets: [clip, clip], revision: 1, reviewed: true }), options: ['fire', 'sunset'], answer: 'fire' };
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], syllables: ['fi', 're'], ttsReady: true, _ttsAssets: { fire: clip },
      activityItems: { syllable_counting: approval, syllable_blending: recording } }]);
    expect(container.textContent).toContain('differs from the recorded syllables');
    await act(async () => button('Inspect or repair the syllable recording').click());
    expect(container.querySelector('#ws-recordings-0').open).toBe(true);
    expect(container.querySelector('#ws-recordings-0').contains(document.activeElement)).toBe(true);
    expect(button('Use this count without the old syllable recording').disabled).toBe(true);
    await act(async () => button('Listen to whole word').click());
    await act(async () => lastClip.onended());
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '1' } }));
    const confirm = [...container.querySelectorAll('label')].find(node => node.textContent.includes('I checked this spoken pronunciation')).querySelector('input');
    await act(async () => Simulate.change(confirm, { target: { checked: true } }));
    await act(async () => button('Use this count without the old syllable recording').click());
    expect(state.words[0].activityItems.syllable_blending).toBeUndefined();
    expect(state.words[0].activityItems.syllable_counting.count).toBe(1);
    expect(container.textContent).not.toContain('Review count: fire');
    expect(recording.audioUnits[0].asset.base64).toBe(clip.base64);
    await act(async () => button('Undo recording exclusion').click());
    expect(state.words[0].activityItems.syllable_blending).toEqual(recording);
    expect(state.words[0].activityItems.syllable_counting).toEqual(approval);
    expect(state.words[0].syllables).toEqual(['fi', 're']);
    expect(container.textContent).toContain('Review count: fire');
  });

  it('blocks a changed clip, lets the teacher listen and approve, and persists the reviewed clip', async () => {
    const oldAudio = audio(1), replacement = audio(2);
    const oldContext = core.createSyllableCountAudioContext({ asset: oldAudio, language: 'en', voice: 'old-voice' });
    const approval = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: oldContext });
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: replacement }, activityItems: { syllable_counting: approval } }]);
    expect(container.textContent).toContain('Review count: fire');
    await act(async () => button('Start fixture lesson').click());
    expect(container.textContent).toContain('Start fixture lesson');
    expect(state.panel.syllableReviewRequest.index).toBe(0);
    await act(async () => button('Listen to whole word').click());
    expect(lastClip.src).toBe('data:audio/wav;base64,' + replacement.base64);
    await act(async () => lastClip.onended());
    await act(async () => Simulate.change(container.querySelector('input[type="number"]'), { target: { value: '2' } }));
    const confirm = [...container.querySelectorAll('label')].find(node => node.textContent.includes('I checked this spoken pronunciation')).querySelector('input');
    await act(async () => Simulate.change(confirm, { target: { checked: true } }));
    await act(async () => button('Save reviewed count').click());
    expect(container.textContent).not.toContain('Review count: fire');
    expect(state.words[0].activityItems.syllable_counting.count).toBe(2);
    expect(state.words[0]._ttsAssets.fire.base64).toBe(replacement.base64);
    expect(core.resolveSyllableCount('fire', { language: 'en', prepared: state.words[0].activityItems.syllable_counting,
      audioContext: core.createSyllableCountAudioContext({ asset: replacement, language: 'en' }) }).supported).toBe(true);
  });

  it('keeps approval valid when the student default voice changes but the saved clip is identical', async () => {
    const clip = audio(3);
    const context = core.createSyllableCountAudioContext({ asset: clip, language: 'en', voice: 'teacher-voice' });
    const approval = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, revision: 1, reviewed: true, audioContext: context });
    await mount([{ word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: clip }, activityItems: { syllable_counting: approval } }]);
    expect(container.textContent).not.toContain('Review count: fire');
  });

  it('replaces a later per-word asset bucket with the exact newly approved clip', async () => {
    const oldClip = audio(4), reviewedClip = audio(5), otherClip = audio(6);
    await mount([
      { word: 'sunset', phonemes: ['s'], ttsReady: true, _ttsAssets: { sunset: otherClip } },
      { word: 'fire', phonemes: ['f', 'ire'], ttsReady: true, _ttsAssets: { fire: oldClip } },
    ]);
    const context = core.createSyllableCountAudioContext({ asset: reviewedClip, language: 'en' });
    const approval = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 2, revision: 3, reviewed: true, audioContext: context });
    const editor = state.panel.renderSyllableEditor(state.words[1], 1).props.children().props.children
      .find(child => child?.type?.name === 'WordSoundsSyllableCountReview');
    expect(editor).toBeTruthy();
    // Exercise the modal's actual save callback with the reviewed playback
    // result, as the child supplies after a completed preview and confirmation.
    await act(async () => editor.props.onSave(approval, { asset: reviewedClip, source: 'data:audio/wav;base64,' + reviewedClip.base64 }));
    expect(state.words[0]._ttsAssets.sunset).toEqual(otherClip);
    expect(state.words[0]._ttsAssets.fire).toEqual(reviewedClip);
    expect(state.words[1]._ttsAssets).toBeUndefined();
    expect(state.words[1].activityItems.syllable_counting).toMatchObject({ supported: true, count: 2, audioContext: context });
    expect(container.textContent).not.toContain('Review count: fire');
    const savedEditor = state.panel.renderSyllableEditor(state.words[1], 1).props.children().props.children
      .find(child => child?.type?.name === 'WordSoundsSyllableCountReview');
    const playback = await savedEditor.props.previewWord();
    expect(playback.source).toBe('data:audio/wav;base64,' + reviewedClip.base64);
    expect(playback.audioContext.signature).toBe(context.signature);
  });
});
