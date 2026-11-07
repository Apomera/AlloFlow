// The first spoken instruction of an activity could be lost while Repeat still
// worked, because the two take different routes. These mount the real player
// with the real audio bank loader and a fake Audio/network, and start cold: the
// bank has never been read on this page, as on a first load.
// TEMPORARY investigation probe. Deleted when finished. Prints what really plays.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));


const b64 = (s) => Buffer.from(s).toString('base64');
const bankClip = (k) => 'data:audio/mp3;base64,' + b64('BANK:' + k);
const label = (src) => {
  const m = String(src).match(/base64,(.*)$/);
  if (!m) return String(src).slice(0, 60);
  return Buffer.from(m[1], 'base64').toString('utf8').slice(0, 70);
};

let Modal, root, host, state, currentOverrides, originalAudio, originalGlobalAudio, originalFetch;
let log = [];
let policy = { clipMs: 1000, reject: () => false };
let t0 = 0;
const now = () => Date.now() - t0;

class RecAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.ended = false; this.currentTime = 0; this.listeners = new Map(); queueMicrotask(() => { if (String(src).startsWith('blob:dead')) { log.push({ t: now(), ev: 'LOADERR', clip: src }); this.dispatch('error'); } else this.dispatch('canplaythrough'); }); }
  addEventListener(n, f) { if (!this.listeners.has(n)) this.listeners.set(n, new Set()); this.listeners.get(n).add(f); }
  removeEventListener(n, f) { this.listeners.get(n)?.delete(f); }
  dispatch(n) { this['on' + n]?.(); for (const f of this.listeners.get(n) || []) f(); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(() => { this.dispatch('loadedmetadata'); this.dispatch('canplaythrough'); this.dispatch('canplay'); }); }
  removeAttribute() {}
  play() {
    if (policy.reject(this.src)) {
      log.push({ t: now(), ev: 'REJECT', clip: label(this.src) });
      const e = new Error('blocked'); e.name = 'NotAllowedError';
      return Promise.reject(e);
    }
    log.push({ t: now(), ev: 'play', clip: label(this.src) });
    this.paused = false; this.ended = false;
    setTimeout(() => {
      if (!this.paused) { this.paused = true; this.ended = true; log.push({ t: now(), ev: 'end', clip: label(this.src) }); this.dispatch('ended'); }
    }, policy.clipMs);
    return Promise.resolve();
  }
  pause() {
    if (!this.paused) log.push({ t: now(), ev: 'PAUSED', clip: label(this.src) });
    this.paused = true;
    // The media spec queues the pause event as a task; it never fires inside pause().
    queueMicrotask(() => this.dispatch('pause'));
  }
}

function fmt() { return log.map((e) => `${String(e.t).padStart(6)}ms ${e.ev.padEnd(7)} ${e.clip}`).join('\n'); }
function plays() { return log.filter((e) => e.ev === 'play').map((e) => e.clip); }

// Real host bank loader (AlloFlowANTI.txt) + real audio_banks_module.js, with a
// fake network so each category can be slow.
const CATS = {
  instructions: ['inst_counting', 'inst_blending', 'inst_segmentation', 'inst_orthography', 'inst_spelling_bee', 'inst_word_scramble', 'inst_missing_letter', 'inst_rhyming', 'inst_letter_tracing', 'inst_word_families', 'mapping', 'trace_letter', 'for', 'sound_match_start', 'sound_match_end', 'which_word_did_you_hear', 'letter_c', 'fb_great_job', 'fb_nice', 'fb_correct'],
  isolation: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
  letters: ['a', 'b', 'c'],
  phonemes: ['k', 'a', 't', 'd', 'o', 'g', 'm', 's', 'b', 'aw', 'dh', 'ee', 'p', 'th', 'ue', 'zh', 'sh', 'ch', 'schwa', 'or', 'oo_short', 'u'],
  words: [],
};
let fetchLog = [];
function installRealBanks(delays = {}) {
  const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = anti.indexOf('let _AUDIO_BANK = null;');
  const end = anti.indexOf('// Keep the ~5.6 MB audio-bank');
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  const fakeFetch = (url) => new Promise((res) => {
    const name = String(url).split('/').pop();
    const cat = name.replace('.json', '');
    fetchLog.push({ t: now(), name });
    const body = () => {
      if (name === 'index.json') return { categories: Object.fromEntries(Object.keys(CATS).map((c) => [c, {}])) };
      if (name === 'audio_bank_kokoro.json') return { instructions: { as_in: bankClip('as_in'), inst_syllable_blending: bankClip('inst_syllable_blending'), inst_syllable_counting: bankClip('inst_syllable_counting') }, isolation: { last: bankClip('last'), middle: bankClip('middle') } };
      return Object.fromEntries((CATS[cat] || []).map((k) => [k, bankClip(k)]));
    };
    setTimeout(() => res({ ok: true, status: 200, json: async () => body() }), delays[cat] ?? delays.default ?? 0);
  });
  if (window.AlloModules) delete window.AlloModules.AudioBanks;
  const hostApi = new Function('window', 'fetch', 'console', anti.slice(start, end) + '\nreturn { kick() { _loadAudioBankIndex(); _initKokoroAudioBank(); }, getAudio };')(window, fakeFetch, { log() {}, warn() {} });
  new Function('console', readFileSync('audio_banks_module.js', 'utf8'))({ log() {}, warn() {} });
  hostApi.kick();
  return hostApi;
}

function pack(omit = []) {
  const base = makePackItem();
  const tts = {};
  Object.keys(base._ttsAssets).forEach((k) => { if (!omit.includes(k)) tts[k] = { mime: 'audio/webm', base64: b64('PACK:' + k) }; });
  return { ...base, itemId: 'cat', _ttsAssets: tts, ttsReady: true };
}

function PlayerHost(o) {
  const [activity, setActivity] = React.useState(o.activity);
  const [word, setWord] = React.useState(o.initialWord || null), [data, setData] = React.useState(o.initialData || null);
  const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 }), [history, setHistory] = React.useState([]);
  const [feedback, setFeedback] = React.useState(null);
  state = { activity, word, data, score, history, feedback };
  return React.createElement(Modal, {
    ...baseProps(activity), allowRuntimeAi: true, isTeacherMode: false, disableAnimations: true, sessionId: 'session-a',
    wordSoundsSessionGoal: 20, wsPreloadedWords: o.items, wordSoundsDifficulty: 'easy', isProbeMode: false,
    sessionConfig: { fixedForm: false, sessionGoal: 20 }, ...o,
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
    currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
    wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
  });
}
// act() defers React commits to the end of its scope, so step finely or effects run seconds late.
async function tick(ms) { for (let left = ms; left > 0; left -= 20) { await act(async () => vi.advanceTimersByTimeAsync(Math.min(20, left))); } }
async function render(o) { currentOverrides = { ...currentOverrides, ...o }; await act(async () => root.render(React.createElement(PlayerHost, currentOverrides))); }
async function mount(o) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); currentOverrides = {}; await render(o); }
const NOTICE = /Sound didn't load|audio_unavailable/;

beforeAll(() => { installCanvasStub(); ({ WordSoundsModal: Modal } = setupWordSounds()); });
beforeEach(() => {
  vi.useFakeTimers({ now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  t0 = Date.now();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = RecAudio;
  log = []; fetchLog = []; policy = { clipMs: 1000, reject: () => false };
  try { window.localStorage.clear(); } catch (_) {}
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
  delete window.__ALLO_ISOLATION_AUDIO; delete window.__ALLO_INSTRUCTION_AUDIO; delete window.__ALLO_PHONEME_AUDIO_BANK; delete window.getAudio;
  vi.clearAllTimers(); vi.useRealTimers(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
});

const INST_EXPECT = {
  counting: 'BANK:inst_counting', blending: 'BANK:inst_blending', segmentation: 'BANK:inst_segmentation',
  orthography: 'BANK:inst_orthography', spelling_bee: 'BANK:inst_spelling_bee', word_scramble: 'BANK:inst_word_scramble',
  missing_letter: 'BANK:inst_missing_letter', mapping: 'BANK:mapping', rhyming: 'BANK:inst_rhyming', isolation: 'BANK:1st',
};


const LONG = 'what is the first sound in cat?';
const SHORT = 'what is the 1st sound?';
const NO_PROMPTS = [LONG, SHORT];
const BANK_NEVER = 600000;

describe('the first instruction in Find Sounds, starting cold', () => {
  it('waits for the bank instead of giving up when the pack has no prompt clip', async () => {
    installRealBanks({ isolation: 800 });
    await mount({ activity: 'isolation', items: [pack(NO_PROMPTS)], selectedVoice: 'af_heart', callTTS: async () => null });
    await tick(5000);
    expect(plays()[0]).toBe('BANK:1st');
    expect(NOTICE.test(host.textContent)).toBe(false);
  });

  it('uses the prepared short prompt when the bank never arrives and speech is unavailable', async () => {
    installRealBanks({ isolation: BANK_NEVER });
    const callTTS = vi.fn(async () => null);
    await mount({ activity: 'isolation', items: [pack([LONG])], selectedVoice: 'af_heart', callTTS });
    await tick(6000);
    expect(plays()[0]).toBe('PACK:' + SHORT);
    expect(callTTS).not.toHaveBeenCalledWith(LONG, expect.anything(), expect.anything(), expect.anything());
  });

  it('prefers the prepared word-specific prompt over the short one', async () => {
    installRealBanks({ isolation: BANK_NEVER });
    await mount({ activity: 'isolation', items: [pack()], selectedVoice: 'af_heart', callTTS: async () => null });
    await tick(6000);
    expect(plays()[0]).toBe('PACK:' + LONG);
  });

  it('falls back to speech after the wait when nothing prepared exists', async () => {
    installRealBanks({ isolation: BANK_NEVER });
    const callTTS = vi.fn(async (text) => bankClip('KOKORO:' + text));
    await mount({ activity: 'isolation', items: [pack(NO_PROMPTS)], selectedVoice: 'af_heart', callTTS });
    await tick(6000);
    expect(plays()[0]).toBe('BANK:KOKORO:' + LONG);
  });

  it('does not make every item wait when a loaded bank simply lacks this position', async () => {
    const saved = CATS.isolation;
    CATS.isolation = saved.filter((key) => key !== '1st');
    try {
      installRealBanks();
      void window.__ALLO_ISOLATION_AUDIO['2nd'];
      await tick(50);
      const asked = [];
      await mount({ activity: 'isolation', items: [pack(NO_PROMPTS)], selectedVoice: 'af_heart', callTTS: async (text) => { asked.push(now()); return bankClip('KOKORO:' + text); } });
      await tick(2500);
      expect(asked.length).toBeGreaterThan(0);
      expect(asked[0]).toBeLessThan(2000);
    } finally { CATS.isolation = saved; }
  });
});

describe('speech URLs saved between page loads', () => {
  it('drops a dead blob URL and asks for speech again, so it cannot fail on every load', async () => {
    window.localStorage.setItem('alloflow_audio_' + LONG, 'blob:dead/from-last-page-load');
    installRealBanks({ isolation: BANK_NEVER });
    const callTTS = vi.fn(async (text) => bankClip('KOKORO:' + text));
    await mount({ activity: 'isolation', items: [pack(NO_PROMPTS)], selectedVoice: 'af_heart', callTTS });
    await tick(6000);
    expect(plays()[0]).toBe('BANK:KOKORO:' + LONG);
    expect(window.localStorage.getItem('alloflow_audio_' + LONG)).not.toMatch(/^blob:/);
  });

  it('never saves a blob URL, which would not outlive this page', async () => {
    installRealBanks({ isolation: BANK_NEVER });
    await mount({ activity: 'isolation', items: [pack(NO_PROMPTS)], selectedVoice: 'af_heart', callTTS: async () => 'blob:live/abc' });
    await tick(5000);
    expect(window.localStorage.getItem('alloflow_audio_' + LONG)).toBeNull();
  });

  it('still keeps a durable clip', async () => {
    installRealBanks({ isolation: BANK_NEVER });
    const clip = bankClip('KOKORO:' + LONG);
    await mount({ activity: 'isolation', items: [pack(NO_PROMPTS)], selectedVoice: 'af_heart', callTTS: async () => clip });
    await tick(5000);
    expect(window.localStorage.getItem('alloflow_audio_' + LONG)).toBe(clip);
  });
});

describe('a browser refusing to play the instruction', () => {
  it('shows the notice instead of failing silently', async () => {
    installRealBanks();
    void window.__ALLO_INSTRUCTION_AUDIO.inst_counting;
    await tick(50);
    let rejected = 0;
    policy.reject = (src) => { if (label(src) === 'BANK:inst_counting' && rejected === 0) { rejected++; return true; } return false; };
    await mount({ activity: 'counting', items: [pack()], selectedVoice: 'af_heart', callTTS: async () => null });
    await tick(2000);
    expect(rejected).toBe(1);
    expect(NOTICE.test(host.textContent)).toBe(true);
  });
});

describe('waking the local voice early', () => {
  const logger = { log() {}, warn() {}, info() {}, error() {}, debug() {} };
  function realTTS() {
    new Function('console', readFileSync('tts_module.js', 'utf8'))(logger);
    window._kokoroTTS = undefined;
    return window.AlloModules.createTTS({
      state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 },
      apiKey: '', GEMINI_MODELS: { tts: 'x' }, AVAILABLE_VOICES: [], _isCanvasEnv: false, languageToTTSCode: () => 'en', isGlobalMuted: () => false,
      warnLog() {}, debugLog() {}, getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English', getAiUserConfig: () => ({}), getAi: () => null,
      getSelectedVoice: () => 'af_heart', getAvailableVoices: () => [], setShowKokoroOfferModal() {},
    });
  }
  const cleanUp = () => { if (window.AlloModules) { delete window.AlloModules.TTS; delete window.AlloModules.AlloCommands; } delete window.__loadKokoroTTS; delete window._kokoroTTS; delete window.__alloWarmOnDeviceKokoro; };

  it('wakes a model that is already on this device, so the first sentence finds it ready', async () => {
    realTTS();
    window.AlloModules.AlloCommands = { modelCache: { hasKokoro: async () => true } };
    const load = vi.fn(async () => { window._kokoroTTS = { ready: true, progress: 100 }; });
    window.__loadKokoroTTS = load;
    try {
      await window.__alloWarmOnDeviceKokoro();
      expect(load).toHaveBeenCalledOnce();
      expect(window._kokoroTTS.ready).toBe(true);
    } finally { cleanUp(); }
  });

  it('never starts a download for a model that is not on this device', async () => {
    realTTS();
    window.AlloModules.AlloCommands = { modelCache: { hasKokoro: async () => false } };
    const load = vi.fn();
    window.__loadKokoroTTS = load;
    window._isDesktopBundledApp = true;
    try {
      expect(await window.__alloWarmOnDeviceKokoro()).toBeNull();
      expect(load).not.toHaveBeenCalled();
    } finally { delete window._isDesktopBundledApp; cleanUp(); }
  });

  it('is asked for when the player opens with a Kokoro voice, and not otherwise', async () => {
    const warm = vi.fn(async () => null);
    window.__alloWarmOnDeviceKokoro = warm;
    try {
      installRealBanks();
      await mount({ activity: 'counting', items: [pack()], selectedVoice: 'af_heart', callTTS: async () => null });
      await tick(50);
      expect(warm).toHaveBeenCalled();
      await act(async () => root.unmount());
      host.remove();
      warm.mockClear();
      await mount({ activity: 'counting', items: [pack()], selectedVoice: 'Kore', callTTS: async () => null });
      await tick(50);
      expect(warm).not.toHaveBeenCalled();
    } finally { delete window.__alloWarmOnDeviceKokoro; }
  });
});

describe('opening the player', () => {
  it('starts both instruction banks downloading before any activity needs them', async () => {
    installRealBanks({ default: BANK_NEVER, index: 0 });
    await mount({ activity: 'counting', items: [pack()], selectedVoice: 'af_heart', callTTS: async () => null });
    await tick(100);
    const asked = fetchLog.map((entry) => entry.name);
    expect(asked).toContain('instructions.json');
    expect(asked).toContain('isolation.json');
  });
});
