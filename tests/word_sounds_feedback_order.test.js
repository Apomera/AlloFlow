import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modulesDir, 'react-dom/client'));
const { act } = require(resolve(modulesDir, 'react-dom/test-utils'));

const WORD = 'data:audio/mp3;base64,WORD_corn';
const NEXT_WORD = 'data:audio/mp3;base64,WORD_tin';
const INSTRUCTION = 'data:audio/mp3;base64,INSTRUCTION_counting';
const FEEDBACK = 'data:audio/mp3;base64,FEEDBACK_try_again';
const CACHED_WORD = 'https://audio.invalid/corn.mp3';
let WordSoundsModal;
let container;
let root;
let currentProps;
let clips;
let events;
let overlaps;
let originalAudio;
let originalGlobalAudio;
let originalInstructionBank;
let originalPhonemeBank;
let originalActEnvironment;

// A clip stays audible until the test explicitly ends it. Recording the
// active set at play() catches transient overlaps even if a later effect
// eventually pauses one of the clips.
class FakeAudio {
  constructor(src) {
    this.src = String(src || '');
    this.currentTime = 0;
    this.playbackRate = 1;
    this.paused = true;
    this.ended = false;
    this.listeners = new Map();
    clips.push(this);
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type) {
    const event = { type, target: this };
    this['on' + type]?.(event);
    for (const listener of [...(this.listeners.get(type) || [])]) listener(event);
  }
  play() {
    const audible = clips.filter((clip) => clip !== this && !clip.paused);
    if (audible.length) overlaps.push([this.src, ...audible.map((clip) => clip.src)]);
    this.paused = false;
    this.ended = false;
    events.push({ type: 'play', clip: this });
    return Promise.resolve();
  }
  pause() {
    const wasPlaying = !this.paused;
    this.paused = true;
    events.push({ type: 'pause', clip: this });
    if (wasPlaying) this.dispatch('pause');
  }
  finish() {
    this.paused = true;
    this.ended = true;
    events.push({ type: 'ended', clip: this });
    this.dispatch('ended');
  }
  load() {}
}

function makeProps(overrides = {}) {
  const corn = { word: 'corn', targetWord: 'corn', phonemeCount: 3, phonemes: ['k', 'or', 'n'] };
  return {
    ...baseProps('counting'),
    currentWordSoundsWord: 'corn',
    wordSoundsPhonemes: corn,
    wsPreloadedWords: [corn],
    isProbeMode: false,
    isTeacherMode: false,
    ...overrides,
  };
}

async function advance(ms) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

async function click(selector) {
  const element = container.querySelector(selector);
  expect(element, `missing interactive control: ${selector}`).not.toBeNull();
  expect(element.disabled, `disabled control: ${selector}`).not.toBe(true);
  await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

async function mount(overrides = {}) {
  currentProps = makeProps(overrides);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(React.createElement(WordSoundsModal, currentProps)); });
}

async function render(overrides) {
  currentProps = { ...currentProps, ...overrides };
  await act(async () => { root.render(React.createElement(WordSoundsModal, currentProps)); });
}

// Complete only instruction clips, then leave the stimulus playing/loading.
// Polling virtual time avoids depending on the particular instruction delay.
async function reachStimulus(src = WORD) {
  for (let step = 0; step < 40; step++) {
    const found = clips.find((clip) => clip.src === src);
    if (found) return found;
    for (const instruction of clips.filter((clip) => clip.src === INSTRUCTION && !clip.paused)) {
      await act(async () => { instruction.finish(); });
    }
    await advance(100);
  }
  throw new Error(`No stimulus ${src}; clips: ${clips.map((clip) => clip.src).join(', ')}`);
}

function playCount(src) { return events.filter((event) => event.type === 'play' && event.clip.src === src).length; }
function activeFeedback() {
  const feedback = clips.findLast((clip) => clip.src === FEEDBACK && !clip.paused);
  expect(feedback, 'first wrong answer must play its feedback clip').toBeDefined();
  return feedback;
}

beforeAll(() => { ({ WordSoundsModal } = setupWordSounds()); });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  clips = [];
  events = [];
  overlaps = [];
  originalAudio = window.Audio;
  originalGlobalAudio = globalThis.Audio;
  originalInstructionBank = window.__ALLO_INSTRUCTION_AUDIO;
  originalPhonemeBank = window.__ALLO_PHONEME_AUDIO_BANK;
  originalActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.Audio = globalThis.Audio = FakeAudio;
  window.__ALLO_INSTRUCTION_AUDIO = { inst_counting: INSTRUCTION, fb_try_again_listen: FEEDBACK };
  window.__ALLO_PHONEME_AUDIO_BANK = { corn: WORD, tin: NEXT_WORD };
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null;
  container?.remove();
  container = null;
  window.Audio = originalAudio;
  globalThis.Audio = originalGlobalAudio;
  window.__ALLO_INSTRUCTION_AUDIO = originalInstructionBank;
  window.__ALLO_PHONEME_AUDIO_BANK = originalPhonemeBank;
  globalThis.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Word Sounds feedback has exclusive use of the audio channel', () => {
  it('stops the current stimulus before feedback and replays only after feedback ends', async () => {
    await mount();
    const stimulus = await reachStimulus();
    expect(stimulus.paused).toBe(false);

    await click('[role="button"][aria-label="Number 1"]');
    const feedback = activeFeedback();
    expect(stimulus.paused).toBe(true);
    expect(events.findIndex((event) => event.type === 'pause' && event.clip === stimulus))
      .toBeLessThan(events.findIndex((event) => event.type === 'play' && event.clip === feedback));
    expect(overlaps).toEqual([]);

    const beforeReplay = playCount(WORD);
    await advance(1500);
    expect(playCount(WORD)).toBe(beforeReplay);
    await act(async () => { feedback.finish(); });
    await advance(500);
    expect(playCount(WORD)).toBe(beforeReplay + 1);
    expect(overlaps).toEqual([]);
  });

  it('does not start an in-flight cached clip after an answer has superseded it', async () => {
    delete window.__ALLO_PHONEME_AUDIO_BANK.corn;
    await mount({ audioCache: { current: new Map([['corn', CACHED_WORD]]) } });
    const pending = await reachStimulus(CACHED_WORD);
    expect(playCount(CACHED_WORD)).toBe(0);

    await click('[role="button"][aria-label="Number 1"]');
    activeFeedback();
    await act(async () => { pending.dispatch('canplaythrough'); });
    await advance(1200);
    expect(playCount(CACHED_WORD)).toBe(0);
    expect(overlaps).toEqual([]);
  });

  it('queues a listen request during feedback and stops feedback on the next answer', async () => {
    await mount();
    await reachStimulus();
    await click('[role="button"][aria-label="Number 1"]');
    const feedback = activeFeedback();
    const beforeListen = playCount(WORD);
    await click('button[aria-label="word_sounds.play_word"]');
    await advance(100);
    expect(playCount(WORD)).toBe(beforeListen);
    expect(feedback.paused).toBe(false);
    expect(overlaps).toEqual([]);

    // A subsequent correct response cancels both the feedback replay and the
    // queued listen request. Even a late ended event must not resurrect them.
    await click('[role="button"][aria-label="Number 3"]');
    expect(feedback.paused).toBe(true);
    await act(async () => { feedback.finish(); });
    await advance(500);
    expect(playCount(WORD)).toBe(beforeListen);
    expect(overlaps).toEqual([]);
  });

  it.each(['advance', 'minimize', 'unmount'])('cancels feedback and its delayed replay on %s', async (transition) => {
    await mount();
    await reachStimulus();
    await click('[role="button"][aria-label="Number 1"]');
    const feedback = activeFeedback();
    const beforeTransition = playCount(WORD);

    if (transition === 'advance') {
      await render({ currentWordSoundsWord: 'tin', wordSoundsPhonemes: { word: 'tin', phonemeCount: 3, phonemes: ['t', 'i', 'n'] } });
    } else if (transition === 'minimize') {
      await click('button[aria-label="common.minimize_to_background"]');
    } else {
      await act(async () => { root.unmount(); });
      root = null;
    }
    expect(feedback.paused).toBe(true);
    await act(async () => { feedback.finish(); });
    await advance(500);
    expect(playCount(WORD)).toBe(beforeTransition);
    expect(overlaps).toEqual([]);
  });
// Append inside the describe() in tests/word_sounds_feedback_order.test.js.
// Reuses that file's real-component mount/render/click/audio helpers.
it.each(['loaded', 'absent'])(
  'keeps feedback exclusive when the host mirrors incorrect feedback and the phoneme bank is %s',
  async (bankState) => {
    const ANCHOR = 'data:audio/mp3;base64,ANCHOR_short_a';
    const ant = { word: 'ant', targetWord: 'ant', phonemeCount: 3, phonemes: ['a', 'n', 't'] };
    const speakWord = vi.fn();
    const setFeedback = vi.fn();
    window.__ALLO_PHONEME_AUDIO_BANK = { ant: WORD, a: ANCHOR };
    await mount({
      currentWordSoundsWord: 'ant',
      wordSoundsPhonemes: ant,
      wsPreloadedWords: [ant],
      speakWord,
      setWordSoundsFeedback: setFeedback,
    });
    await reachStimulus();
    if (bankState === 'absent') delete window.__ALLO_PHONEME_AUDIO_BANK;

    await click('[role="button"][aria-label="Number 1"]');
    const feedback = activeFeedback();
    const incorrectFeedback = setFeedback.mock.calls.findLast(([value]) => value?.isCorrect === false)?.[0];
    expect(incorrectFeedback, 'the host must receive incorrect feedback').toBeDefined();
    // The production host writes this value back as a prop. A no-op setter
    // leaves the anchor-remediation effect unexercised, hiding its 400ms audio.
    await render({ wordSoundsFeedback: incorrectFeedback });
    const beforeReplay = playCount(WORD);
    await advance(900);

    expect(feedback.paused).toBe(false);
    expect(clips.filter((clip) => !clip.paused)).toEqual([feedback]);
    expect(playCount(WORD)).toBe(beforeReplay);
    expect(playCount(ANCHOR)).toBe(0);
    expect(speakWord).not.toHaveBeenCalled();
    expect(overlaps).toEqual([]);

    await act(async () => { feedback.finish(); });
    await advance(500);
    // Removing the competing automatic anchor also avoids an extra delayed
    // phoneme after feedback. The ordinary word replay owns this correction.
    expect(playCount(ANCHOR)).toBe(0);
    expect(speakWord).not.toHaveBeenCalled();
    if (bankState === 'loaded') expect(playCount(WORD)).toBe(beforeReplay + 1);
    expect(overlaps).toEqual([]);
  },
);

// Append inside the describe() in tests/word_sounds_feedback_order.test.js.
it('does not let a finished cached playback timeout stop a later replay of the same Audio', async () => {
  delete window.__ALLO_PHONEME_AUDIO_BANK.corn;
  await mount({ audioCache: { current: new Map([['corn', CACHED_WORD]]) } });
  const cached = await reachStimulus(CACHED_WORD);
  await act(async () => { cached.dispatch('canplaythrough'); });
  // The generator prefetches this object before the instruction starts.
  // Complete the instruction and wait for the actual audible cache hit.
  for (let step = 0; step < 40 && cached.paused; step++) {
    for (const instruction of clips.filter(clip => clip.src === INSTRUCTION && !clip.paused)) {
      await act(async () => { instruction.finish(); });
    }
    await advance(100);
  }
  expect(cached.paused).toBe(false);
  await advance(100);
  await act(async () => { cached.finish(); });

  await click('button[aria-label="word_sounds.play_word"]');
  expect(playCount(CACHED_WORD)).toBe(2);
  expect(clips.filter((clip) => clip.src === CACHED_WORD)).toEqual([cached]);
  expect(cached.paused).toBe(false);
  // Pass the FIRST playback's safety deadline while the second play is still
  // inside its own deadline. The first play must relinquish its old timer.
  await advance(29950);
  expect(cached.paused).toBe(false);
  expect(container.querySelector('button[aria-label="word_sounds.play_word"]').disabled).toBe(true);
  expect(overlaps).toEqual([]);
  await act(async () => { cached.finish(); });
  expect(container.querySelector('button[aria-label="word_sounds.play_word"]').disabled).toBe(false);
});


  it('uses one level-up praise clip even when React evaluates the progress updater twice', async () => {
    const AMAZING = 'data:audio/mp3;base64,FEEDBACK_amazing';
    const GOT_IT = 'data:audio/mp3;base64,FEEDBACK_you_got_it';
    window.__ALLO_INSTRUCTION_AUDIO.fb_amazing = AMAZING;
    window.__ALLO_INSTRUCTION_AUDIO.fb_you_got_it = GOT_IT;
    const feedbackUpdates = [];
    await mount({
      wordSoundsScore: {correct: 0, total: 0, streak: 0},
      wordSoundsSessionProgress: 9,
      setWordSoundsSessionProgress: update => { if (typeof update === "function") { update(9); update(9); } },
      setWordSoundsFeedback: value => feedbackUpdates.push(value),
    });
    await reachStimulus();
    await click('[role="button"][aria-label="Number 3"]');
    expect(playCount(AMAZING)).toBe(1);
    expect(playCount(GOT_IT)).toBe(0);
    expect(feedbackUpdates.filter(value => value?.isCorrect)).toHaveLength(1);
    expect(overlaps).toEqual([]);
  });

  it('stops a long success clip before another item can play its success feedback', async () => {
    const GOT_IT = 'data:audio/mp3;base64,FEEDBACK_you_got_it';
    window.__ALLO_INSTRUCTION_AUDIO.fb_you_got_it = GOT_IT;
    await mount({wordSoundsScore: {correct: 0, total: 0, streak: 0}});
    await reachStimulus();
    await click('[role="button"][aria-label="Number 3"]');
    const first = clips.findLast(clip => clip.src === GOT_IT);
    expect(first.paused).toBe(false);
    await advance(2100); // Complete the normal answer-lock interval.
    await render({currentWordSoundsWord: 'tin', wordSoundsPhonemes: {word:'tin',phonemeCount:3,phonemes:['t','i','n']}});
    expect(first.paused).toBe(true);
    await click('[role="button"][aria-label="Number 3"]');
    expect(playCount(GOT_IT)).toBe(2);
    expect(clips.filter(clip => !clip.paused && clip.src === GOT_IT)).toHaveLength(1);
    expect(overlaps).toEqual([]);
  });
});
