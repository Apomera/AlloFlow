// Local-only speech: with the host switch on, no caller can reach the browser's
// cloud recognizer. The real engine runs in a browser check; these pin the rules.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
let nativeInstances = [];

class CloudRecognition {
  constructor() { nativeInstances.push(this); }
  start() {}
  stop() {}
  abort() {}
}
class OnDeviceRecognition extends CloudRecognition {
  get processLocally() { return this._local === true; }
  set processLocally(value) { this._local = value; }
}

function installFakeMic() {
  let processor = null;
  const track = { stop: vi.fn() };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [track] })) },
  });
  window.AudioContext = function AudioContext() {
    return {
      sampleRate: 16000,
      state: 'running',
      destination: {},
      createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
      createScriptProcessor: () => { processor = { connect() {}, disconnect() {}, onaudioprocess: null }; return processor; },
      createGain: () => ({ gain: {}, connect() {}, disconnect() {} }),
      resume: () => Promise.resolve(),
      close: () => Promise.resolve(),
    };
  };
  const frame = (value) => processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(960).fill(value) } });
  return {
    track,
    ready: () => !!processor,
    speak: () => { for (let i = 0; i < 6; i++) frame(0.08); },
    pause: () => { for (let i = 0; i < 13; i++) frame(0); },
  };
}

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

beforeAll(() => loadAlloModule('voice_module.js'));

beforeEach(() => {
  nativeInstances = [];
  localStorage.removeItem('alloflow_voice_pref');
  localStorage.removeItem('allo_voice_engine');
  delete window.__alloLocalSRShim;
  delete window.__alloLocalSpeechOnly;
  delete window._isCanvasEnv;
  delete window._isIOSCanvasEnv;
});

afterEach(() => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  delete window.AudioContext;
  delete window.__alloLocalSpeechOnly;
  delete window.__alloResolveGeminiAudioCapability;
  delete window._isCanvasEnv;
  delete window._isIOSCanvasEnv;
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  else delete navigator.mediaDevices;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the engine resolver in local-only mode', () => {
  const setup = () => {
    window.SpeechRecognition = CloudRecognition;
    installFakeMic();
    window.__alloLocalSpeechOnly = true;
  };

  it('never resolves to the browser service, whatever was requested', () => {
    setup();
    const voice = window.AlloFlowVoice;
    for (const engine of ['auto', 'webspeech', 'browser', 'fast']) {
      expect(voice.resolveHandsFreeEngine({ engine }).resolved, engine).toBe('whisper');
    }
  });
  it('Auto without a prepared model is off instead of an implicit download', () => {
    setup();
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'auto' })).toMatchObject({ supported: false });
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'webspeech' })).toMatchObject({ supported: false });
  });
  it('an explicit Whisper choice may still download', () => {
    setup();
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'whisper' })).toMatchObject({ resolved: 'whisper', supported: true });
  });
  it('a prepared model satisfies Auto', () => {
    setup();
    const voice = window.AlloFlowVoice;
    const { modelId } = voice.resolveWhisperProfile('en-US', 'tiny');
    voice.savePreference({ ...voice.loadPreference(), whisperPreparedModelId: modelId });
    expect(voice.resolveHandsFreeEngine({ engine: 'auto', lang: 'en-US' })).toMatchObject({ resolved: 'whisper', supported: true });
  });
  it('stays off on iPhone or iPad Canvas, where Whisper can restart the Canvas', () => {
    setup();
    window._isCanvasEnv = true;
    window._isIOSCanvasEnv = true;
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'auto' }).supported).toBe(false);
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'whisper' }).supported).toBe(false);
  });
  it('with the switch off, today\'s behaviour is unchanged', () => {
    window.SpeechRecognition = CloudRecognition;
    installFakeMic();
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'auto' })).toMatchObject({ resolved: 'webspeech', supported: true });
  });
});

describe('the stand-in recognizer', () => {
  const make = (native = CloudRecognition) => {
    window.__alloLocalSpeechOnly = true;
    installFakeMic();
    const rec = window.AlloFlowVoice.createLocalSpeechRecognition(native);
    const events = [];
    rec.onerror = (e) => events.push('error:' + e.error);
    rec.onend = () => events.push('end');
    rec.onstart = () => events.push('start');
    return { rec, events };
  };

  it('without a model it reports the error and ends, and never builds the cloud recognizer', async () => {
    const { rec, events } = make();
    const needed = vi.fn();
    window.addEventListener('alloflow:speech-setup-needed', needed);
    rec.start();
    await new Promise((r) => setTimeout(r, 5));
    window.removeEventListener('alloflow:speech-setup-needed', needed);
    expect(events).toEqual(['error:service-not-allowed', 'end']);
    expect(needed).toHaveBeenCalledOnce();
    expect(nativeInstances).toHaveLength(0);
  });
  it('refuses a language Whisper cannot do, rather than guessing', async () => {
    const { rec, events } = make();
    rec.lang = 'hmn';
    rec.start();
    await new Promise((r) => setTimeout(r, 5));
    expect(events).toEqual(['error:language-not-supported', 'end']);
    expect(nativeInstances).toHaveLength(0);
  });
  it('can start again after ending, and refuses a double start like the browser does', async () => {
    const { rec, events } = make();
    rec.start();
    expect(() => rec.start()).toThrow(/already started/);
    await new Promise((r) => setTimeout(r, 5));
    expect(events).toEqual(['error:service-not-allowed', 'end']);
    expect(() => rec.start()).not.toThrow();
  });
  it('a caller asking for on-device gets the browser engine, locked to on-device', () => {
    const { rec } = make(OnDeviceRecognition);
    expect('processLocally' in rec).toBe(true);
    rec.processLocally = true;
    rec.lang = 'es-ES';
    rec.continuous = true;
    const results = [];
    rec.onresult = (e) => results.push(e);
    rec.start();
    expect(nativeInstances).toHaveLength(1);
    expect(nativeInstances[0].processLocally).toBe(true);
    expect(nativeInstances[0].lang).toBe('es-ES');
    expect(nativeInstances[0].continuous).toBe(true);
    nativeInstances[0].onresult({ results: [], resultIndex: 0 });
    expect(results).toHaveLength(1);
  });
  it('a caller not asking for on-device never touches the browser engine', async () => {
    const { rec } = make(OnDeviceRecognition);
    rec.start();
    await new Promise((r) => setTimeout(r, 5));
    expect(nativeInstances).toHaveLength(0);
  });
  it('offers no on-device flag when the browser has none, so local-only tools see it as absent', () => {
    const { rec } = make(CloudRecognition);
    expect('processLocally' in rec).toBe(false);
  });
});

describe('capture that keeps speech', () => {
  const pending = [];
  const callGeminiAudio = vi.fn(() => new Promise((resolve) => pending.push(resolve)));
  const nextText = (text) => pending.shift()(JSON.stringify({ transcript: text }));
  const start = (extra) => {
    const mic = installFakeMic();
    window.__alloResolveGeminiAudioCapability = () => ({ available: true, reason: 'gemini-key' });
    const heard = [];
    const ended = [];
    const controller = window.AlloFlowVoice.createHandsFreeRecognizer({
      engine: 'gemini', callGeminiAudio, continuous: true,
      onTranscript: (text) => heard.push(text),
      onEnd: (detail) => ended.push(detail.reason),
      ...extra,
    });
    controller.start();
    return { mic, heard, ended, controller };
  };
  beforeEach(() => { pending.length = 0; callGeminiAudio.mockClear(); });

  it('dictation keeps every segment in order while the transcriber is busy', async () => {
    const { mic, heard } = start({ keepAllSegments: true });
    await flush();
    for (let i = 0; i < 3; i++) { mic.speak(); mic.pause(); }
    await flush();
    expect(pending).toHaveLength(1);
    for (const text of ['one', 'two', 'three']) { nextText(text); await flush(); }
    expect(heard).toEqual(['one', 'two', 'three']);
  });
  it('commands still keep only the newest, so a stale one cannot run late', async () => {
    const { mic, heard } = start({});
    await flush();
    for (let i = 0; i < 3; i++) { mic.speak(); mic.pause(); }
    await flush();
    nextText('first'); await flush();
    nextText('latest'); await flush();
    expect(heard).toEqual(['first', 'latest']);
    expect(pending).toHaveLength(0);
  });
  it('stopping mid-sentence still transcribes the speech captured so far, then ends', async () => {
    const { mic, heard, ended, controller } = start({ keepAllSegments: true });
    await flush();
    mic.speak();
    controller.drain();
    await flush();
    expect(mic.track.stop).toHaveBeenCalled();
    expect(ended).toEqual([]);
    nextText('last words'); await flush();
    expect(heard).toEqual(['last words']);
    expect(ended).toEqual(['completed']);
  });
  it('stopping while silent ends at once', async () => {
    const { ended, controller } = start({ keepAllSegments: true });
    await flush();
    controller.drain();
    await flush();
    expect(ended).toEqual(['completed']);
    expect(callGeminiAudio).not.toHaveBeenCalled();
  });
  it('drops an invented stock phrase on a quiet segment when the filter is on', async () => {
    const { mic, heard } = start({ filterHallucinations: true });
    await flush();
    mic.speak(); mic.pause();
    await flush();
    nextText('Hello class'); await flush();
    expect(heard).toEqual(['Hello class']);
  });
});

describe('the silence filter', () => {
  const filter = (text, pcm) => window.AlloFlowVoice._handsFreePure.filterWhisperHallucination(text, pcm);
  const loud = new Float32Array(16000).fill(0.1);
  const quiet = new Float32Array(16000).fill(0.012);

  it('drops wrapped sound labels and empty punctuation', () => {
    for (const label of ['(music)', '[Music]', '[BLANK_AUDIO]', '♪♪', '♪ la la ♪', '*coughs*', '...', ' - ', '(speaking foreign language)']) {
      expect(filter(label, loud), label).toBe('');
    }
  });
  it('keeps bare words that happen to name a sound: they can be answers', () => {
    for (const word of ['music', 'Music.', 'silence', 'noise', 'applause']) {
      expect(filter(word, loud), word).toBe(word);
    }
  });
  it('drops a stock phrase only when there was almost no real voice', () => {
    for (const phrase of ['Thank you.', 'Thanks for watching!', 'you', 'Please subscribe', 'Subtitles by the Amara.org community']) {
      expect(filter(phrase, quiet), phrase).toBe('');
      expect(filter(phrase, loud), phrase).toBe(phrase);
    }
  });
  it('keeps a short real word with a long quiet tail', () => {
    const okay = new Float32Array(16000 * 2);
    okay.fill(0.1, 3200, 7000);
    expect(filter('Okay.', okay)).toBe('Okay.');
  });
  it('never touches ordinary speech, even quiet speech', () => {
    expect(filter('The mitochondria makes energy.', quiet)).toBe('The mitochondria makes energy.');
  });
});

describe('restart loops', () => {
  it('a permanent error does not restart in a loop; a silence timeout still does', () => {
    vi.useFakeTimers();
    const builds = [];
    window.SpeechRecognition = class { constructor() { builds.push(this); } start() {} stop() {} };
    const run = (code) => {
      builds.length = 0;
      const capture = window.AlloFlowVoice.initWebSpeechCapture({ continuous: true, restartOnEnd: true, onError() {} });
      capture.start();
      const rec = builds[builds.length - 1];
      const startsBefore = builds.length;
      const spy = vi.spyOn(rec, 'start');
      rec.onerror({ error: code });
      rec.onend();
      vi.advanceTimersByTime(200);
      return { capture, restarted: builds.length > startsBefore || spy.mock.calls.length > 0 };
    };
    for (const code of ['service-not-allowed', 'not-allowed', 'language-not-supported']) {
      expect(run(code).restarted, code).toBe(false);
    }
    expect(run('no-speech').restarted).toBe(true);
  });
});

describe('host wiring', () => {
  const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  it('is off unless this device opted in, and leaves the desktop app alone', () => {
    expect(anti.includes("localSpeechOnly = localStorage.getItem('alloflow_voice_local_only') === '1';")).toBe(true);
    const block = anti.slice(anti.indexOf('if (!_isDesktopBundledApp) {\n        let localSpeechOnly'), anti.indexOf('window.__alloLocalSpeechOnly = true;'));
    expect(block.length).toBeGreaterThan(100);
  });
  it('replaces both constructor names, so no || chain can find the native one', () => {
    expect(anti.includes('window.SpeechRecognition = AlloLocalOnlySpeechRecognition;')).toBe(true);
    expect(anti.includes('window.webkitSpeechRecognition = AlloLocalOnlySpeechRecognition;')).toBe(true);
  });
  it('installs before any module can capture the native constructor', () => {
    expect(anti.indexOf('window.__alloLocalSpeechOnly = true;')).toBeLessThan(anti.indexOf("loadModule('Voice'"));
  });
});
