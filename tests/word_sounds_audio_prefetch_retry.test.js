import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const act = React.act || require(resolve(modules, 'react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Exercise the shipped effect and handlers, not copies of their state logic.
// Deferred audio requests bound the old infinite-retry bug: an unexpected next
// request stays pending, so the regression fails without hanging the runner.
const source = readFileSync('word_sounds_module.js', 'utf8').replace(/\r\n/g, '\n');
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
function between(startMarker, endMarker, includeEnd = false) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing production boundary: ${startMarker}`);
  return source.slice(start, end + (includeEnd ? endMarker.length : 0));
}
const prefetch = between(
  '      const audioPrefetchRequestsRef = React.useRef(new Map());',
  '      }, [preloadedWords, setWsPreloadedWords, isTeacherSpokenWord]);', true,
);
const retry = between('      const handleRetryFailedTTS =', '      const handleGenerateWordImage =');
const edit = between('      const _ttsTextChanged =', '      const handleDeleteWord =');
const usePrefetch = new Function('React', 'preloadedWords', 'setWsPreloadedWords', 'handleAudio', 'audioInstances', 'audioCache', 'debugLog', 'warnLog', 'isTeacherSpokenWord', 'audioRetryWordsRef', 'isMountedRef', 'WS_CORE', prefetch);
const useHandlers = new Function('React', 'preloadedWords', 'setWsPreloadedWords', 'setPreloadedWords', 'portableTtsLibrary', 'addToast', 'preloadedWordCache', 'debugLog', 'warnLog', 'isTeacherSpokenWord', 'audioRetryWordsRef', 'isMountedRef',
  `${retry}\n${edit}\nreturn { retry: handleRetryFailedTTS, edit: handleUpdatePreloadedWord };`);

// Mount the actual shipped panel so warning visibility, retry-button wiring,
// and the row's accessible audio status are verified together with the effect.
const previousReact = window.React;
window.React = React;
const Icon = () => null;
new Function('Volume2', 'CheckCircle2', 'Send', readFileSync('misc_components_module.js', 'utf8'))(Icon, Icon, Icon);
const ReviewPanel = window.WordSoundsReviewPanel;
window.React = previousReact;
const noop = () => {};
const word = (extra = {}) => ({ word: 'cat', phonemes: ['k', 'a', 't'], ttsReady: false, ...extra });
const mounted = [];

async function mount(initialWords = [word()], isTeacherSpokenWord = () => false) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const root = createRoot(element);
  mounted.push({ root, element });
  const requests = [];
  const audioCache = { current: new Map() };
  const audioInstances = { current: new Map() };
  const preloadedWordCache = { current: new Map() };
  const portableTtsLibrary = {};
  const addToast = vi.fn();
  const warnLog = vi.fn();
  const handleAudio = vi.fn(text => new Promise((resolveRequest, rejectRequest) => {
    requests.push({ text, resolve: resolveRequest, reject: rejectRequest });
  }));
  const state = {};
  const audioRetryWordsRef = { current: null }, isMountedRef = { current: true };
  let revision = 0;
  function Host() {
    const [words, setWords] = React.useState(initialWords);
    audioRetryWordsRef.current = words;
    const handlers = useHandlers(React, words, setWords, setWords, portableTtsLibrary, addToast, preloadedWordCache, noop, warnLog, isTeacherSpokenWord, audioRetryWordsRef, isMountedRef);
    state.words = words;
    state.setWords = setWords;
    state.handlers = handlers;
    usePrefetch(React, words, setWords, handleAudio, audioInstances, audioCache, noop, warnLog, isTeacherSpokenWord, audioRetryWordsRef, isMountedRef, core);
    return React.createElement(ReviewPanel, {
      preloadedWords: words, onUpdateWord: handlers.edit, onRetryFailedTTS: handlers.retry,
      teacherSpokenWords: words.filter(isTeacherSpokenWord).map(value => value.word),
      t: () => '', activitySequence: [], setActivitySequence: noop,
      isLoading: false, regeneratingIndex: null, generatingImageIndex: null,
    });
  }
  const render = () => root.render(React.createElement(Host, { revision: revision++ }));
  await act(async () => render());
  return {
    element, requests, state, handleAudio, warnLog,
    async settle(index, { cached = false, error } = {}) {
      expect(requests[index], `Audio request ${index + 1} exists`).toBeDefined();
      await act(async () => {
        if (cached) audioCache.current.set(requests[index].text.toLowerCase(), 'blob:ready');
        if (error) requests[index].reject(error);
        else requests[index].resolve(cached ? { status: 'ready' } : { status: 'unavailable' });
      });
    },
    async rerender() { await act(async () => render()); },
    async changeMetadata() {
      await act(async () => state.setWords(previous => previous.map(item => ({ ...item, reviewedNote: 'Teacher note' }))));
    },
  };
}

async function advance(ms) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}
function expectFailedPanel(harness) {
  expect(harness.element.querySelector('#word-sounds-review-description').textContent).toContain('Words missing audio: 1');
  expect(harness.element.textContent).toContain('Words whose audio failed to load in this session: 1');
  expect(harness.element.querySelector('button[aria-label="Audio failed"]')).not.toBeNull();
  expect(harness.element.querySelector('button[aria-label="Loading audio"]')).toBeNull();
  expect(harness.state.words[0]).toMatchObject({ _audioRequested: false, _ttsFailed: true, _runtimeAudioReady: false });
}
function expectReadyPanel(harness) {
  expect(harness.element.textContent).not.toContain('Words missing audio:');
  expect(harness.element.textContent).not.toContain('Words whose audio failed to load in this session:');
  const play = harness.element.querySelector('button[aria-label="Play word"]');
  expect(play).not.toBeNull();
  expect(play.disabled).toBe(false);
  expect(harness.state.words[0]).toMatchObject({ ttsReady: false, _runtimeAudioReady: true, _audioRequested: false, _ttsFailed: false });
}

beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  for (const { root, element } of mounted.splice(0)) {
    await act(async () => root.unmount());
    element.remove();
  }
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Word Sounds prefetch failure and review warnings', () => {
  it('keeps teacher-spoken words out of prefetch, repair warnings, and loading announcements', async () => {
    const harness = await mount([word({ _ttsFailed: true })], () => true);
    await advance(5000);
    expect(harness.requests).toHaveLength(0);
    expect(harness.element.textContent).toContain('Teacher-led lesson: say these words aloud');
    expect(harness.element.textContent).not.toContain('Words missing audio: 1');
    const control = harness.element.querySelector('[aria-label="Teacher says this word aloud"]');
    expect(control).not.toBeNull(); expect(control.getAttribute('aria-busy')).toBe('false');
    await act(async () => harness.state.handlers.retry());
    expect(harness.requests).toHaveLength(0);
  });
  it('explicitly retries the recorded bank before rearming failed word requests', async () => {
    const original = window.loadWordAudioBank;
    let finishBank;
    window.loadWordAudioBank = vi.fn(() => new Promise(resolve => { finishBank = resolve; }));
    try {
      const harness = await mount([word({ _ttsFailed: true })]);
      let retrying;
      await act(async () => { retrying = harness.state.handlers.retry(); });
      expect(window.loadWordAudioBank).toHaveBeenCalledWith({ retry: true });
      expect(harness.requests).toHaveLength(0);
      await act(async () => { finishBank(); await retrying; });
      expect(harness.requests).toHaveLength(1);
    } finally { window.loadWordAudioBank = original; }
  });
  it('does not rearm an edited lesson after an old bank retry completes', async () => {
    const original = window.loadWordAudioBank;
    let finishBank;
    window.loadWordAudioBank = vi.fn(() => new Promise(resolve => { finishBank = resolve; }));
    try {
      const harness = await mount([word({ _ttsFailed: true })]);
      let retrying;
      await act(async () => { retrying = harness.state.handlers.retry(); });
      await harness.changeMetadata();
      await act(async () => { finishBank(); await retrying; });
      expect(harness.requests).toHaveLength(0);
      expect(harness.state.words[0]._ttsFailed).toBe(true);
    } finally { window.loadWordAudioBank = original; }
  });
  it('preserves a queued edit even before the retry context ref has rerendered', async () => {
    const original = window.loadWordAudioBank;
    let finishBank;
    window.loadWordAudioBank = vi.fn(() => new Promise(resolve => { finishBank = resolve; }));
    try {
      const harness = await mount([word({ _ttsFailed: true })]);
      let retrying;
      await act(async () => { retrying = harness.state.handlers.retry(); });
      await act(async () => {
        finishBank();
        harness.state.setWords(previous => previous.map(value => ({ ...value, reviewedNote: 'Queued edit' })));
        await retrying;
      });
      expect(harness.requests).toHaveLength(0);
      expect(harness.state.words[0]).toMatchObject({ _ttsFailed: true, reviewedNote: 'Queued edit' });
    } finally { window.loadWordAudioBank = original; }
  });
  it('stops after three unsuccessful attempts and retains the warning through renders and audio polling', async () => {
    const harness = await mount();
    expect(harness.requests).toHaveLength(1);
    await harness.settle(0);
    await advance(599);
    expect(harness.requests).toHaveLength(1);
    await advance(1);
    expect(harness.requests).toHaveLength(2);
    await harness.settle(1);
    await advance(1199);
    expect(harness.requests).toHaveLength(2);
    await advance(1);
    expect(harness.requests).toHaveLength(3);
    await harness.settle(2);
    expect(harness.requests).toHaveLength(3);
    expect(harness.warnLog).toHaveBeenCalledTimes(1);
    expectFailedPanel(harness);

    await harness.rerender();
    await harness.changeMetadata();
    await advance(5000); // Includes five actual review-panel audio polls.
    expect(harness.requests).toHaveLength(3);
    expectFailedPanel(harness);
  });

  it('keeps a rate-limit failure visible without starting another automatic round', async () => {
    const harness = await mount();
    await harness.settle(0, { error: new Error('429 Rate Limited') });
    expect(harness.requests).toHaveLength(1);
    expectFailedPanel(harness);
    await advance(5000);
    expect(harness.requests).toHaveLength(1);
    expectFailedPanel(harness);
  });

  it('keeps successful initial prefetch playable without claiming portable audio', async () => {
    const harness = await mount();
    await harness.settle(0, { cached: true });
    expectReadyPanel(harness);
    await harness.changeMetadata();
    await advance(5000);
    expect(harness.requests).toHaveLength(1);
    expectReadyPanel(harness);
  });

  it('does not revive a warning after a portable clip is repaired during an older request', async () => {
    const harness = await mount();
    const bytes = Buffer.alloc(80, 1); bytes.write('RIFF'); bytes.write('WAVE', 8);
    const asset = { mime: 'audio/wav', base64: bytes.toString('base64') };
    expect(core.portablePackAsset(asset)).toBeTruthy();
    await act(async () => harness.state.setWords(words => words.map(item => ({ ...item, ttsReady: true, _ttsAssets: { cat: asset } }))));
    await harness.settle(0, { error: new Error('429 Rate Limited') });
    expect(harness.state.words[0]).toMatchObject({ ttsReady: true, _audioRequested: false, _ttsFailed: false, _ttsAssets: { cat: asset } });
    expect(harness.element.textContent).not.toContain('Words whose audio failed to load in this session:');
    expect(harness.element.querySelector('button[aria-label="Audio failed"]')).toBeNull();
    await advance(5000);
    expect(harness.requests).toHaveLength(1);
  });

  it('honors a repaired packed asset even before its readiness flag is updated', async () => {
    const harness = await mount();
    const bytes = Buffer.alloc(80, 2); bytes.write('RIFF'); bytes.write('WAVE', 8);
    const asset = { mime: 'audio/wav', base64: bytes.toString('base64') };
    await act(async () => harness.state.setWords(words => words.map(item => ({ ...item, _ttsAssets: { cat: asset } }))));
    await harness.settle(0);
    await advance(600);
    expect(harness.requests).toHaveLength(1);
    expect(harness.state.words[0]).toMatchObject({ _audioRequested: false, _ttsFailed: false });
    expect(harness.state.words[0]._ttsAssets.cat).toBe(asset);
    expect(harness.element.querySelector('button[aria-label="Audio failed"]')).toBeNull();
  });

  it('keeps runtime audio ready when an older prefetch fails', async () => {
    const harness = await mount();
    await act(async () => harness.state.setWords(words => words.map(item => ({ ...item, _runtimeAudioReady: true }))));
    await harness.settle(0, { error: new Error('429 Rate Limited') });
    expectReadyPanel(harness);
    await advance(5000);
    expect(harness.requests).toHaveLength(1);
  });

  it('lets a newer request own readiness when an older request finishes later', async () => {
    const harness = await mount();
    await act(async () => harness.state.setWords(words => words.map(item => ({ ...item, _audioRequested: false }))));
    expect(harness.requests).toHaveLength(2);
    await harness.settle(0, { error: new Error('429 Rate Limited') });
    expect(harness.state.words[0]).toMatchObject({ _audioRequested: true, _ttsFailed: false });
    expect(harness.element.querySelector('button[aria-label="Audio failed"]')).toBeNull();
    await harness.settle(1, { cached: true });
    expectReadyPanel(harness);
  });

  it('does not transfer a deleted row request to a newly added word of the same name', async () => {
    const harness = await mount();
    await act(async () => harness.state.setWords([]));
    await act(async () => harness.state.setWords([word({ teacherNote: 'New row' })]));
    expect(harness.requests).toHaveLength(2);
    await harness.settle(0, { error: new Error('429 Rate Limited') });
    expect(harness.state.words[0]).toMatchObject({ teacherNote: 'New row', _audioRequested: true, _ttsFailed: false });
    await harness.settle(1, { cached: true });
    expectReadyPanel(harness);
  });

  it('lets the panel Retry audio button re-arm a failed word and recover', async () => {
    const harness = await mount([word({ _ttsFailed: true, _audioRequested: false, _runtimeAudioReady: false })]);
    expect(harness.requests).toHaveLength(0);
    expectFailedPanel(harness);
    await advance(3000);
    expect(harness.requests).toHaveLength(0);
    expectFailedPanel(harness);
    const retryButton = harness.element.querySelector('#word-sounds-review-description button');
    expect(retryButton.textContent).toBe('Retry audio');
    await act(async () => retryButton.click());
    expect(harness.requests).toHaveLength(1);
    expect(harness.state.words[0]).toMatchObject({ _audioRequested: true, _ttsFailed: false });
    await harness.settle(0, { cached: true });
    expectReadyPanel(harness);
    await advance(5000);
    expect(harness.requests).toHaveLength(1);
  });

  it('lets the existing edit handler re-arm a renamed failed word', async () => {
    const harness = await mount([word({ _ttsFailed: true, _audioRequested: false, _runtimeAudioReady: false })]);
    expect(harness.requests).toHaveLength(0);
    expectFailedPanel(harness);
    await act(async () => harness.state.handlers.edit(0, { word: 'dog' }));
    expect(harness.requests).toHaveLength(1);
    expect(harness.requests[0].text).toBe('dog');
    expect(harness.state.words[0]).toMatchObject({ word: 'dog', _audioRequested: true, _ttsFailed: false });
    await harness.settle(0, { cached: true });
    expectReadyPanel(harness);
  });
});
