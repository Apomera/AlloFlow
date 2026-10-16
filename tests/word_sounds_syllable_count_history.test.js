import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';
import { installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
let Modal, root, container, originalAudio;
beforeAll(() => { installCanvasStub(); Modal = setupWordSounds().WordSoundsModal; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; container?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalAudio;
  vi.clearAllTimers(); vi.useRealTimers();
});
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

async function mount(recorded = false, options = {}) {
  vi.useFakeTimers();
  originalAudio = window.Audio;
  const clips = [], rows = [];
  class Clip {
    constructor(src) { this.src = src; this.paused = true; this.ended = false; clips.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; this.onpause?.(); }
    end() { this.paused = true; this.ended = true; this.onended?.(); }
  }
  window.Audio = Clip; globalThis.Audio = Clip;
  const bytes = Buffer.alloc(80); bytes.write('RIFF'); bytes.write('WAVE', 8);
  const asset = { mime: 'audio/wav', base64: bytes.toString('base64'), decoded: true, durationSeconds: 0.4, source: 'teacher_recording' };
  const prepared = core.createReviewedSyllableCount({ targetWord: 'quuxzz', count: 2, language: 'en', reviewed: true, revision: 1,
    audioContext: core.createSyllableCountAudioContext({ language: 'en', ...(recorded ? { asset } : {}) }) });
  const pack = { word: 'quuxzz', targetWord: 'quuxzz', term: 'quuxzz', phonemes: Object.hasOwn(options, 'phonemes') ? options.phonemes : ['k'], phonemeCount: 1, ttsReady: true,
    _preparedActivities: ['syllable_counting'], activityItems: { syllable_counting: prepared },
    ...(recorded ? { _ttsAssets: { quuxzz: asset } } : {}) };
  if (options.syllableRecording) pack.activityItems.syllable_blending = core.createReviewedSyllableTask({
    targetWord: pack.word, language: 'en', reviewed: true, revision: 1, syllables: ['quux', 'zz'], assets: [asset, asset],
  });
  let currentItem;
  function Host() {
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [history, setHistory] = React.useState([]);
    const [word, setWord] = React.useState(pack.word);
    const [current, setCurrent] = React.useState(pack);
    currentItem = current;
    const [feedback, setFeedback] = React.useState(null);
    return React.createElement(Modal, { ...baseProps('syllable_counting'), isTeacherMode: true,
      playInstructions: false, initialActivitySequence: ['syllable_counting'],
      glossaryTerms: [{ term: pack.word }], currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
      wordSoundsPhonemes: current, setWordSoundsPhonemes: setCurrent, wsPreloadedWords: [pack],
      wordSoundsScore: score, setWordSoundsScore: setScore, wordSoundsHistory: history,
      setWordSoundsHistory: update => setHistory(previous => { const next = typeof update === 'function' ? update(previous) : update; rows.splice(0, rows.length, ...next); return next; }),
      wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
    });
  }
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(React.createElement(Host)); await flush(); });
  await act(async () => { container.querySelector('[title="Instructions are ON"]').click(); await flush(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); await flush(); });
  const finish = async () => {
    await act(async () => { for (const clip of clips) clip.oncanplaythrough?.(); await flush(); });
    await act(async () => { for (const clip of clips) if (!clip.paused) clip.end(); await flush(); });
  };
  return { rows, clips, finish, pack, currentItem: () => currentItem };
}
const button = pattern => [...container.querySelectorAll('button')].find(node => pattern.test(node.textContent));
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.click(); await flush(); }); }
async function tap(count) { for (let i = 0; i < count; i++) await click(container.querySelector('[aria-label="Tap to count syllables"]')); }

describe('syllable count learning evidence in the actual modal', () => {
  it('requires teacher delivery per attempt and records both responses in one final history row', async () => {
    const h = await mount();
    await tap(3);
    expect(button(/^Submit/).disabled).toBe(true);
    await click(button(/Teacher has said the word/));
    await click(button(/^Submit/));
    expect(h.rows).toHaveLength(0);
    await tap(2);
    expect(button(/^Submit/).disabled).toBe(true);
    await click(button(/Teacher has said the word/));
    await click(button(/^Submit/));
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0]).toMatchObject({ correct: true, attempts: 2, submittedCount: 2, expectedCount: 2, deliveryMode: 'teacher_spoken',
      countResponses: [
        { submittedCount: 3, expectedCount: 2, deliveryMode: 'teacher_spoken', correct: false },
        { submittedCount: 2, expectedCount: 2, deliveryMode: 'teacher_spoken', correct: true },
      ] });
  });

  it('allows clapping during recorded playback but saves a grade only after ended', async () => {
    const h = await mount(true);
    await tap(2);
    expect(button(/^Submit/).disabled).toBe(true);
    await click(button(/^Submit/));
    expect(h.rows).toHaveLength(0);
    await h.finish();
    expect(button(/^Submit/).disabled).toBe(false);
    await click(button(/^Submit/));
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0]).toMatchObject({ correct: true, attempts: 1, submittedCount: 2, expectedCount: 2, deliveryMode: 'recorded_audio',
      countResponses: [{ submittedCount: 2, expectedCount: 2, deliveryMode: 'recorded_audio', correct: true }] });
  });

  it('requires fresh delivery and starts a new response record when a one-word queue repeats', async () => {
    const h = await mount();
    await click(button(/Teacher has said the word/));
    await tap(2);
    await click(button(/^Submit/));
    expect(h.rows).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(2400); await flush(); });
    expect(button(/^Submit/).disabled).toBe(true);
    await tap(2);
    expect(button(/^Submit/).disabled).toBe(true);
    await click(button(/^Submit/));
    expect(h.rows).toHaveLength(1);
    await click(button(/Teacher has said the word/));
    await click(button(/^Submit/));
    expect(h.rows).toHaveLength(2);
    expect(h.rows[1]).toMatchObject({ correct: true, attempts: 1, submittedCount: 2, expectedCount: 2, deliveryMode: 'teacher_spoken' });
    expect(h.rows[1].countResponses).toEqual([{ submittedCount: 2, expectedCount: 2, deliveryMode: 'teacher_spoken', correct: true }]);
  });

  it.each([
    ['empty', [], false], ['absent', undefined, false], ['null', null, false],
    ['empty', [], true], ['absent', undefined, true], ['null', null, true],
  ])('preserves reviewed count and recordings through %s phoneme fallback and repeat (recorded word %s)', async (_, phonemes, recorded) => {
    const h = await mount(recorded, { phonemes, syllableRecording: true });
    expect(h.pack.activityItems.syllable_blending).toBeTruthy();
    for (let presentation = 0; presentation < 2; presentation++) {
      const current = h.currentItem();
      expect(current.activityItems.syllable_counting).toBe(h.pack.activityItems.syllable_counting);
      expect(current.activityItems.syllable_blending).toBe(h.pack.activityItems.syllable_blending);
      if (recorded) expect(current._ttsAssets).toBe(h.pack._ttsAssets);
      expect(container.textContent).not.toContain('This word needs a reviewed syllable count');
      if (recorded) {
        await click(button(/Hear the word again/));
        await h.finish();
      }
      else await click(button(/Teacher has said the word/));
      await tap(2);
      expect(button(/^Submit/).disabled).toBe(false);
      await click(button(/^Submit/));
      expect(h.rows).toHaveLength(presentation + 1);
      expect(h.rows[presentation]).toMatchObject({ correct: true, submittedCount: 2, expectedCount: 2,
        deliveryMode: recorded ? 'recorded_audio' : 'teacher_spoken' });
      if (presentation === 0) await act(async () => { await vi.advanceTimersByTimeAsync(2400); await flush(); });
    }
  });
});
