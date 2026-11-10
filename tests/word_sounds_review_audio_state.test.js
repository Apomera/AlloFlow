// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

// The review panel used to say "Words missing audio" for words that play.
// Two facts are kept apart here and must never be conflated again:
//   PORTABLE: a clip is saved in the lesson (ttsReady / _ttsAssets; the pack compiler owns it)
//   RUNTIME:  the word can be spoken on this device now (_runtimeAudioReady);
//             _ttsFailed means a live attempt in this session really failed.
// Everything below runs the shipped code: the real handleAudio, prefetch effect,
// Retry handler, review play handler, review panel, core and setup generator.

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const act = React.act || require(resolve(modules, 'react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// WS_AUDIO_STATE_SOURCE_DIR points the same tests at another copy of the four files (used once to
// confirm they fail on the code before the fix).
const read = (name) => readFileSync(resolve(process.env.WS_AUDIO_STATE_SOURCE_DIR || '.', name), 'utf8');
const source = read('word_sounds_module.js').replace(/\r\n/g, '\n');
const createCore = new Function(read('word_sounds_core.js') + '\nreturn createWordSoundsCore;')();
const core = createCore();
function between(startMarker, endMarker, includeEnd = false) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing production boundary: ${startMarker}`);
  return source.slice(start, end + (includeEnd ? endMarker.length : 0));
}
const audioSource = between('      const latestAudioRequestRef = React.useRef(null);', '      // Manual isolation playback replaces an old stimulus');
const prefetchSource = between(
  '      const audioPrefetchRequestsRef = React.useRef(new Map());',
  '      }, [preloadedWords, setWsPreloadedWords, isTeacherSpokenWord]);', true,
);
const retrySource = between('      const handleRetryFailedTTS =', '      const handleGenerateWordImage =');
const REVIEW_PLAY_START = '      const handleReviewPlayAudio = React.useCallback(';
const hasReviewPlay = source.includes(REVIEW_PLAY_START);
const reviewPlaySource = hasReviewPlay ? between(REVIEW_PLAY_START, '      // END REVIEW PLAY AUDIO') : '';
const helpersSource = source.slice(source.indexOf('    const syllableCountWordKey ='), source.indexOf('    // SyllableCountingView'));
const helpers = new Function('WS_CORE', 'window', helpersSource + '\nreturn { syllableCountWordKey, syllableCountContextKey, syllableCountDeliveryReady };')(core, {});
const deviceVoiceSource = source.slice(source.indexOf('  function wsStudentDeviceVoiceOnly() {'), source.indexOf('  function wsAnnounce(message) {'));
const deviceVoice = win => new Function('window', 'SpeechSynthesisUtterance', deviceVoiceSource + '\nreturn { wsStudentDeviceVoiceOnly, wsSpeakDeviceVoice };')(win, function (text) { this.text = text; });

const previousReact = window.React;
window.React = React;
const Icon = () => null;
new Function('Volume2', 'CheckCircle2', 'Send', read('misc_components_module.js'))(Icon, Icon, Icon);
const ReviewPanel = window.WordSoundsReviewPanel;
window.React = previousReact;

const wav = (value) => {
  const bytes = Buffer.alloc(80, value); bytes.write('RIFF'); bytes.write('WAVE', 8);
  return { mime: 'audio/wav', base64: bytes.toString('base64') };
};
const word = (text, extra = {}) => ({ id: 'w-' + text, word: text, phonemes: text.split(''), ttsReady: false, ...extra });
const noop = () => {};
const mounted = [];

async function mount(initialWords, { fail = [] } = {}) {
  // tts.fail holds the words whose live request fails; audio.fail the clips that will not play.
  const tts = { fail: new Set(fail), calls: [] };
  const audio = { failPlay: false };
  class FakeAudio {
    constructor(src) {
      this.src = src; this.currentTime = 0; this.paused = true; this.ended = false;
      setTimeout(() => this.oncanplaythrough?.(), 10);
    }
    play() {
      if (audio.failPlay) return Promise.reject(new Error('decode failed'));
      this.paused = false;
      setTimeout(() => { this.ended = true; this.paused = true; this.onended?.(); }, 50);
      return Promise.resolve();
    }
    pause() { if (!this.paused) { this.paused = true; this.onpause?.(); } }
  }
  const envWindow = { __ALLO_PHONEME_AUDIO_BANK: {} };
  const audioRetryWordsRef = { current: initialWords };
  const env = {
    React, WS_CORE: core, Audio: FakeAudio, window: envWindow, _CACHE_WORD_AUDIO_BANK: {},
    ...helpers, ...deviceVoice(envWindow),
    syllableCountAudioRef: { current: null }, syllableCountContextRef: { current: null },
    syllableCountDeliveryRef: { current: null }, syllableCountAttemptRef: { current: 0 }, advanceEpochRef: { current: 1 },
    setSyllableCountDelivery: noop,
    wordSoundsLanguage: 'en-US', selectedVoice: 'af_heart', wordSoundsVoiceRef: { current: 'af_heart' }, ttsSpeed: 1,
    wordSoundsAudioLibrary: {}, wordSoundsAudioLibraryRef: { current: {} },
    audioRunIdRef: { current: 1 }, audioCancelledRef: { current: false }, isMountedRef: { current: true },
    feedbackPlaybackRef: { current: null }, currentActiveAudio: { current: null }, activePlaybackRef: { current: null },
    lastAudioRef: { current: null }, anchorReplayTimeoutRef: { current: null }, audioNotice: null,
    audioInstances: { current: new Map() }, preparedAudioInstances: { current: new Set() },
    audioCache: { current: new Map() }, ttsInflight: { current: new Map() },
    setIsPlayingAudio: noop, setAudioNotice: noop, clearAudioNotice: noop, notifyAudioUnavailable: vi.fn(),
    reportPreparedRuntimePlayback: noop, cancelMicInput: noop,
    callTTS: vi.fn(async (text) => {
      tts.calls.push(text);
      if (tts.fail.has(text)) throw new Error('503 Service Unavailable');
      return 'blob:tts-' + text;
    }),
    loadAudioFromStorage: () => null, saveAudioToStorage: noop,
    speakWord: noop, warnLog: noop, debugLog: noop, ts: () => '', addToast: noop,
    isTeacherSpokenWord: () => false, audioRetryWordsRef, setPreloadedWords: noop,
  };
  const useRuntime = new Function(...Object.keys(env), `return function useRuntime(props) {
    const { wordSoundsActivity, currentWordSoundsWord, wordSoundsPhonemes, preloadedWords, setWsPreloadedWords } = props;
    const packKeyOf = (value) => String(value || '').trim().toLowerCase().replace(/\\s+/g, ' ');
    const portableTtsLibrary = {};
    preloadedWords.forEach((item) => Object.entries((item && item._ttsAssets) || {}).forEach(([key, asset]) => { if (asset) portableTtsLibrary[packKeyOf(key)] = asset; }));
    const portableTtsSrcFor = (text) => {
      const asset = portableTtsLibrary[packKeyOf(text)];
      return asset && asset.base64 ? 'data:' + asset.mime + ';base64,' + asset.base64 : null;
    };
    ${audioSource}
    ${prefetchSource}
    ${reviewPlaySource}
    ${retrySource}
    return { handleAudio, retry: handleRetryFailedTTS, reviewPlay: ${hasReviewPlay ? 'handleReviewPlayAudio' : 'handleAudio'} };
  };`)(...Object.values(env));
  const element = document.createElement('div');
  document.body.appendChild(element);
  const root = createRoot(element);
  mounted.push({ root, element });
  const state = {};
  function Host() {
    const [words, setWords] = React.useState(initialWords);
    audioRetryWordsRef.current = words;
    const runtime = useRuntime({ wordSoundsActivity: 'blending', currentWordSoundsWord: null, wordSoundsPhonemes: null, preloadedWords: words, setWsPreloadedWords: setWords });
    state.words = words; state.runtime = runtime;
    return React.createElement(ReviewPanel, {
      preloadedWords: words, onPlayAudio: runtime.reviewPlay, onRetryFailedTTS: runtime.retry, onUpdateWord: noop,
      t: () => '', activitySequence: ['blending'], setActivitySequence: noop,
      isLoading: false, regeneratingIndex: null, generatingImageIndex: null,
    });
  }
  await act(async () => root.render(React.createElement(Host)));
  const text = () => element.textContent;
  const row = (target) => {
    const index = state.words.findIndex(item => item.word === target);
    const button = element.querySelectorAll('[data-help-key="word_sounds_review_play_word"]')[index];
    const chip = button && button.parentElement.querySelector('[data-ws-audio-state]');
    return { button, state: chip ? chip.getAttribute('data-ws-audio-state') : null, label: chip ? chip.lastElementChild.textContent.trim() : '' };
  };
  return {
    element, state, tts, audio, env, text, row,
    find: (target) => state.words.find(item => item.word === target),
    pill: () => element.querySelector('#word-sounds-review-description').textContent,
  };
}
async function advance(ms) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}
// One live attempt = request, 1.5 s, second request; three attempts with 0.6 s and 1.2 s between them.
const LIVE_ATTEMPTS_MS = 12000;

describe('review panel audio state: portable and runtime are separate facts', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    for (const { root, element } of mounted.splice(0)) { await act(async () => root.unmount()); element.remove(); }
    vi.clearAllTimers(); vi.useRealTimers();
  });

  it('tries a word live even when the pack marked it failed, and shows it as playing on this device', async () => {
    // `_ttsFailed: true` is what setup wrote for every word with no saved clip.
    const h = await mount([word('cat', { _ttsFailed: true }), word('dog')]);
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.tts.calls).toContain('cat');
    expect(h.tts.calls).toContain('dog');
    expect(h.find('cat')).toMatchObject({ ttsReady: false, _runtimeAudioReady: true, _ttsFailed: false });
    expect(h.pill()).not.toContain('Words missing audio');
    expect(h.text()).not.toContain('Words whose audio failed to load in this session');
    expect(h.row('cat').state).toBe('device');
    expect(h.row('cat').label).toBe('Plays on this device; not saved for student devices');
    expect(h.row('cat').button.disabled).toBe(false);
    // Student-device honesty stays: the portable line still counts both words.
    expect(h.text()).toContain('Words without portable audio: 2.');
  });

  it('shows a real failure after the live retries, keeps the play button usable, and Retry audio clears it', async () => {
    const h = await mount([word('cat')], { fail: ['cat'] });
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.tts.calls.filter(value => value === 'cat').length).toBeGreaterThanOrEqual(3);
    expect(h.find('cat')).toMatchObject({ ttsReady: false, _runtimeAudioReady: false, _ttsFailed: true });
    expect(h.pill()).toContain('Words missing audio: 1');
    expect(h.text()).toContain('Words whose audio failed to load in this session: 1');
    expect(h.row('cat').state).toBe('failed');
    expect(h.row('cat').label).toBe('Audio failed: try again');
    expect(h.row('cat').button.disabled).toBe(false);
    // A failure that was really attempted is not re-armed on its own.
    const attempts = h.tts.calls.length;
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.tts.calls.length).toBe(attempts);

    h.tts.fail.clear();
    const retryButton = h.element.querySelector('#word-sounds-review-description button');
    expect(retryButton.textContent).toBe('Retry audio');
    await act(async () => retryButton.click());
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.find('cat')).toMatchObject({ ttsReady: false, _runtimeAudioReady: true, _ttsFailed: false });
    expect(h.pill()).not.toContain('Words missing audio');
    expect(h.text()).not.toContain('Words whose audio failed to load in this session');
    expect(h.row('cat').state).toBe('device');
  });

  it('clears a failure the moment the teacher plays the word and it works', async () => {
    const h = await mount([word('cat')], { fail: ['cat'] });
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.row('cat').state).toBe('failed');
    h.tts.fail.clear();
    await act(async () => h.row('cat').button.click());
    expect(h.row('cat').button.getAttribute('aria-busy')).toBe('true');
    await advance(3000);
    expect(h.find('cat')).toMatchObject({ ttsReady: false, _runtimeAudioReady: true, _ttsFailed: false });
    expect(h.row('cat').state).toBe('device');
    expect(h.row('cat').button.getAttribute('aria-busy')).toBe('false');
    expect(h.pill()).not.toContain('Words missing audio');
  });

  it('a successful play anywhere in the player clears a stale failure without claiming a saved clip', async () => {
    const h = await mount([word('cat')], { fail: ['cat'] });
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.find('cat')._ttsFailed).toBe(true);
    h.tts.fail.clear();
    let outcome;
    await act(async () => { outcome = h.state.runtime.handleAudio('cat'); });
    await advance(3000);
    expect(await outcome).toBe('blob:tts-cat');
    expect(h.find('cat')).toMatchObject({ ttsReady: false, _runtimeAudioReady: true, _ttsFailed: false });
    expect(h.find('cat')._ttsAssets).toBeUndefined();
  });

  it('records a failed manual play as a failure and lets the teacher try again', async () => {
    const h = await mount([word('cat')]);
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.row('cat').state).toBe('device');
    h.audio.failPlay = true;
    await act(async () => h.row('cat').button.click());
    await advance(3000);
    expect(h.row('cat').state).toBe('failed');
    expect(h.find('cat')).toMatchObject({ ttsReady: false, _ttsFailed: true });
    expect(h.row('cat').button.disabled).toBe(false);
    h.audio.failPlay = false;
    await act(async () => h.row('cat').button.click());
    await advance(3000);
    expect(h.row('cat').state).toBe('device');
    expect(h.find('cat')).toMatchObject({ _runtimeAudioReady: true, _ttsFailed: false });
  });

  it('counts each word under one gap line only, and shows a saved clip as Ready', async () => {
    const h = await mount([
      word('sun', { ttsReady: true, _ttsAssets: { sun: wav(1) } }),
      word('cat', { _ttsFailed: true }),
      word('dog', { _ttsFailed: true }),
    ], { fail: ['dog'] });
    await advance(LIVE_ATTEMPTS_MS);
    expect(h.tts.calls).not.toContain('sun');
    expect(h.row('sun').state).toBe('ready');
    expect(h.row('sun').label).toBe('Ready');
    expect(h.row('cat').state).toBe('device');
    expect(h.row('dog').state).toBe('failed');
    // cat: plays here, not saved. dog: failed here. Neither is counted twice.
    expect(h.text()).toContain('Words without portable audio: 1.');
    expect(h.text()).toContain('Words whose audio failed to load in this session: 1');
    expect(h.text()).toContain('not saved for student devices either');
    expect(h.pill()).toContain('Words missing audio: 1');
    expect(h.element.querySelectorAll('[data-ws-audio-state]')).toHaveLength(3);
    // Each state has its own icon and its own words, not colour alone.
    const chips = [...h.element.querySelectorAll('[data-ws-audio-state]')];
    expect(new Set(chips.map(chip => chip.textContent)).size).toBe(3);
    expect(new Set(chips.map(chip => chip.querySelector('[aria-hidden="true"]').textContent)).size).toBe(3);
  });

  it('shows "No audio yet" with a usable play button before any attempt has finished', async () => {
    const h = await mount([word('cat')]);
    expect(h.row('cat').state).toBe('none');
    expect(h.row('cat').label).toBe('No audio yet');
    expect(h.row('cat').button.disabled).toBe(false);
    expect(h.pill()).not.toContain('Words missing audio');
  });

  it('never turns audio that only plays here into a claim of saved audio', async () => {
    const h = await mount([word('sun', { ttsReady: true, _ttsAssets: { sun: wav(1) } }), word('cat'), word('dog')], { fail: ['dog'] });
    await advance(LIVE_ATTEMPTS_MS);
    const saved = JSON.parse(JSON.stringify(h.state.words));
    expect(saved.map(item => item.ttsReady)).toEqual([true, false, false]);
    expect(Object.keys(core.packAudioAssets(saved))).toEqual(['sun']);
    // Rewriting the pack (repair, heard clips) recomputes the portable claim only.
    const rewritten = core.replacePackAssets(saved, {});
    expect(rewritten.map(item => item.ttsReady)).toEqual([true, false, false]);
    expect(rewritten[1]._ttsFailed, 'a word that plays here is not a failure').not.toBe(true);
    expect(rewritten[1]._runtimeAudioReady).toBe(true);
    expect(rewritten[2]._ttsFailed, 'a real runtime failure survives the rewrite').toBe(true);
    expect(rewritten[0]._ttsFailed).not.toBe(true);
  });

  it('the host gives the review panel the play handler that records the result', () => {
    expect(hasReviewPlay, 'handleReviewPlayAudio exists').toBe(true);
    expect(source).toMatch(/onRetryFailedTTS: handleRetryFailedTTS,[\s\S]{0,3000}onPlayAudio: handleReviewPlayAudio,/);
  });
});

describe('setup does not call a word failed because it has no saved clip', () => {
  const setupSource = read('word_sounds_setup_source.jsx');
  const host = readFileSync('AlloFlowANTI.txt', 'utf8');
  const section = (text, start, end) => {
    const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
    if (a < 0 || b < 0) throw Error('Missing production seam ' + start);
    return text.slice(a, b);
  };
  const iconNames = [...new Set([...setupSource.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map(match => match[1] || match[2]))]
    .filter(name => !new RegExp('(?:function|const) ' + name + '\\b').test(setupSource));
  const compiled = transformSync(setupSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
  const Generator = new Function('React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...iconNames,
    compiled + '\nreturn WordSoundsGenerator;')(React, () => {}, () => {}, (_t, key) => key, () => {}, ...iconNames.map(() => () => null));
  const ownership = section(host, 'const wordSoundsSetupReviewEpoch =', 'const setWsActivitySequence =');
  const callback = name => {
    const tail = host.slice(host.indexOf(name + '={') + (name + '={').length);
    return tail.slice(0, tail.search(/^\s+\}\}/m)) + '\n}';
  };
  // The production generator with the host's own launch callbacks (as in word_sounds_setup_media_retention).
  const Host = new Function('React', 'Generator', `
   const {useRef,useEffect}=React;
   const setTimeout=fn=>fn();
   return function Host({initialWords,draft={},capture,callTTS}) {
    const [wsPreloadedWords,setWords]=React.useState(initialWords);
    const [generatedContent,setGeneratedContent]=React.useState({id:'pack-a',type:'word-sounds',data:initialWords,sessionConfig:{}});
    const [history,setHistory]=React.useState([]), [activeView,setActiveView]=React.useState('word-sounds-generator');
    const [isWordSoundsMode,setIsWordSoundsMode]=React.useState(false);
    const [wsActivitySequence,setWsActivitySequence]=React.useState([]);
    const [isProbeMode,setIsProbeMode]=React.useState(false);
    const [probeActivity,setProbeActivity]=React.useState('segmentation');
    const probeGradeLevel='K', mathProbeForm='A';
    const setProbeGradeLevel=()=>{},setMathProbeForm=()=>{},setProbeTargetStudent=()=>{},prepareWordSoundsSession=()=>{};
    const setWordSoundsActivity=()=>{},setWordSoundsAutoReview=()=>{},setCurrentWordSoundsWord=()=>{},setWordSoundsPhonemes=()=>{},setWordSoundsFeedback=()=>{};
    const t=()=>undefined,wsDispatch=action=>setWords(action.value);
    ${ownership}
    const seededDraft=useRef(false);
    if(!seededDraft.current) { seededDraft.current=true;wordSoundsSetupReviewSession.setupDraft={...draft}; }
    const onShowReview=${callback('onShowReview')};
    const onStartGame=${callback('onStartGame')};
    capture({words:wsPreloadedWords,generatedContent});
    return activeView==='word-sounds-generator'
      ? React.createElement(Generator,{key:wordSoundsSetupReviewSession.key,syllableReviewSession:wordSoundsSetupReviewSession,
         preloadedWords:wsPreloadedWords,glossaryTerms:[],isTeacherMode:true,isProbeMode,probeActivity,wordSoundsLanguage:'en',
         preparedSessionConfig:generatedContent.sessionConfig||{},
         selectedVoice:'af_heart',gradeLevel:'K',t,onShowReview,onStartGame,callTTS,onClose:()=>setActiveView('output')})
      : React.createElement('div',null,'review');
   };
  `)(React, Generator);
  const clip = byte => { const bytes = Buffer.alloc(68); bytes.write('RIFF'); bytes.write('WAVE', 8); bytes[60] = byte; return { mime: 'audio/wav', base64: bytes.toString('base64'), source: 'teacher_recording' }; };
  let root, container, state;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.AlloModules = { WordSoundsPronunciations: { lookup: () => ['1'] } };
    window.WORD_FAMILY_PRESETS = { at: ['cat', 'hat'] }; window.SIGHT_WORD_PRESETS = { first: ['the'] };
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  const prepare = async (props) => {
    await act(async () => root.render(React.createElement(Host, {
      draft: { includeGlossary: false, includeLessonPlan: true, prepareScope: 'lesson', lessonPlan: { blending: { enabled: true, count: 2 } }, lessonPlanOrder: ['blending'], wordSoundsSessionGoal: 12 },
      capture: value => { state = value; }, ...props,
    })));
    const button = [...container.querySelectorAll('button')].find(item => item.textContent.trim() === 'Prepare lesson');
    expect(button).toBeTruthy();
    await act(async () => button.click());
    return state.generatedContent.data;
  };

  it('a word prepared with no saved clip is not marked failed; a saved clip is Ready', async () => {
    // No voice provider answered: nothing failed at runtime, there is just no clip to save.
    const saved = await prepare({
      callTTS: vi.fn(async () => null),
      initialWords: [
        { word: 'cat', targetWord: 'cat', phonemes: ['k', 'a', 't'], blendingDistractors: ['log', 'fog'], _ttsAssets: { cat: clip(1) } },
        { word: 'dog', targetWord: 'dog', phonemes: ['d', 'o', 'g'], blendingDistractors: ['log', 'fog'] },
      ],
    });
    const cat = saved.find(item => item.word === 'cat'), dog = saved.find(item => item.word === 'dog');
    expect(cat.ttsReady).toBe(true);
    expect(dog.ttsReady).toBe(false);
    expect(dog._ttsFailed, 'no saved clip is not a runtime failure').not.toBe(true);
    expect(cat._ttsFailed).not.toBe(true);
    expect(saved.some(item => item._runtimeAudioReady)).toBe(false);
  });
});
