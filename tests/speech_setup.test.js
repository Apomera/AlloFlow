// Speech setup: the rules behind the panel. The panel itself, real downloads and real
// Whisper run in a browser check; these pin the logic and the wiring.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const read = (path) => readFileSync(path, 'utf8');

describe('voice rules behind Speech setup', () => {
  let V;
  beforeAll(() => {
    loadAlloModule('voice_module.js');
    V = window.AlloFlowVoice;
  });
  beforeEach(() => {
    localStorage.clear();
    delete window.__alloLocalSpeechOnly;
    delete window.AlloModules.AlloCommands;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new Error('unused')) } });
    window.AudioContext = function AudioContext() {};
  });

  it('judges speed against what a whole lesson needs', () => {
    expect(V.assessWhisperSpeed(8, 4000, 'tiny').verdict).toBe('lesson');
    expect(V.assessWhisperSpeed(8, 5333, 'tiny').verdict).toBe('lesson');
    expect(V.assessWhisperSpeed(8, 6000, 'tiny').verdict).toBe('short');
    expect(V.assessWhisperSpeed(8, 8000, 'tiny').verdict).toBe('short');
    expect(V.assessWhisperSpeed(8, 9000, 'tiny').verdict).toBe('slow');
    expect(V.assessWhisperSpeed(8, 0, 'tiny').verdict).toBe('slow');
  });

  it('suggests a bigger size only when it would still keep up', () => {
    expect(V.assessWhisperSpeed(8, 2000, 'tiny').biggerTier).toBe('base');
    expect(V.assessWhisperSpeed(8, 5000, 'tiny').biggerTier).toBe(null);
    expect(V.assessWhisperSpeed(8, 1000, 'base').biggerTier).toBe('small');
    expect(V.assessWhisperSpeed(8, 3000, 'base').biggerTier).toBe(null);
    expect(V.assessWhisperSpeed(8, 100, 'small').biggerTier).toBe(null);
  });

  it('stores only numbers for known models', () => {
    const saved = V.savePreference({ whisperSpeedByModel: { 'Xenova/whisper-tiny.en': 3.14159, 'Xenova/whisper-base': 'fast', 'photosynthesis is how plants': 2, 'Xenova/whisper-small': -1 } });
    expect(saved.whisperSpeedByModel).toEqual({ 'Xenova/whisper-tiny.en': 3.1 });
  });

  it('keeps a language working at any downloaded size', () => {
    V.savePreference({ whisperTier: 'base', whisperPreparedModelIds: ['Xenova/whisper-base.en', 'Xenova/whisper-tiny'] });
    expect(V.preparedWhisperTier('base', 'en-US')).toBe('base');
    expect(V.preparedWhisperTier('base', 'es')).toBe('tiny');
    expect(V.preparedWhisperTier('small', 'en-US')).toBe('base');
    expect(V.preparedWhisperTier('base', 'hmn')).toBe(null);
    const spanish = V.resolveHandsFreeEngine({ engine: 'auto', lang: 'es' });
    expect(spanish.tier).toBe('tiny');
    expect(spanish.resolved).toBe('whisper');
  });

  it('prefers the smaller size when the chosen one is missing', () => {
    V.savePreference({ whisperPreparedModelIds: ['Xenova/whisper-small.en', 'Xenova/whisper-tiny.en'] });
    expect(V.preparedWhisperTier('base', 'en-US')).toBe('tiny');
  });

  it('local-only Auto says where to go when nothing is downloaded', () => {
    window.__alloLocalSpeechOnly = true;
    const choice = V.resolveHandsFreeEngine({ engine: 'auto', lang: 'en-US' });
    expect(choice.supported).toBe(false);
    expect(choice.reason).toMatch(/Speech setup/);
  });

  it('ignores progress from a load that already failed', () => {
    const voice = readFileSync('voice_module.js', 'utf8');
    const start = voice.indexOf('var progressCallback = function (p) {');
    const body = voice.slice(start, voice.indexOf("phase: 'model-fetch-progress'", start));
    expect(body).toContain('if (loadSerial !== whisperLoadSerial || whisperLoadedModelId !== profile.modelId) return;');
  });

  describe('the one status check', () => {
    function fakeDurable(keys) {
      window.AlloModules.AlloCommands = { modelCache: { hasUrlLike: async (fragment) => {
        const needles = fragment.map((f) => f.toLowerCase());
        return keys.some((key) => needles.every((n) => key.toLowerCase().includes(n)));
      } } };
    }
    const emptyBrowserCache = { open: async () => ({ match: async () => undefined }) };

    it('drops a flag only when every store says the model is gone', async () => {
      window.caches = emptyBrowserCache;
      fakeDurable([]);
      V.savePreference({ whisperPreparedModelIds: ['Xenova/whisper-base.en'] });
      const status = await V.getWhisperModelStatus();
      expect(status.base.english).toBe(false);
      expect(V.loadPreference().whisperPreparedModelIds).toEqual([]);
    });

    it('keeps a flag when a store could not be asked', async () => {
      delete window.caches;
      fakeDurable([]);
      V.savePreference({ whisperPreparedModelIds: ['Xenova/whisper-base.en'] });
      const status = await V.getWhisperModelStatus();
      expect(status.base.english).toBe(true);
      expect(V.loadPreference().whisperPreparedModelIds).toContain('Xenova/whisper-base.en');
    });

    it('does not confuse the English model with the multilingual one', async () => {
      window.caches = emptyBrowserCache;
      fakeDurable(['u:https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/onnx/decoder_model_merged_quantized.onnx']);
      const status = await V.getWhisperModelStatus();
      expect(status.tiny.english).toBe(true);
      expect(status.tiny.multilingual).toBe(false);
      expect(V.loadPreference().whisperPreparedModelIds).toEqual(['Xenova/whisper-tiny.en']);
    });

    it('does not count a partial download', async () => {
      window.caches = emptyBrowserCache;
      fakeDurable(['u:https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/config.json']);
      const status = await V.getWhisperModelStatus();
      expect(status.tiny.english).toBe(false);
    });
  });
});

describe('Speech setup panel logic', () => {
  let pure;
  beforeAll(() => {
    window.React = window.React || { createElement() {}, createContext() { return {}; } };
    loadAlloModule('speech_setup_module.js');
    pure = window.AlloModules.SpeechSetup._pure;
  });

  it('measures the download against the known size so the bar cannot jump back', () => {
    const MB = 1024 * 1024;
    expect(pure.downloadSummary({ 'config.json': { loaded: MB } }, 39)).toEqual({ loadedMb: 1, percent: 2 });
    expect(pure.downloadSummary({ a: { loaded: 10 * MB }, b: { loaded: 29 * MB } }, 39).percent).toBe(99);
    expect(pure.downloadSummary({ a: { loaded: 60 * MB } }, 39)).toEqual({ loadedMb: 39, percent: 99 });
    expect(pure.downloadSummary({}, 39).percent).toBe(0);
  });

  it('sorts failures into what someone can do about them', () => {
    expect(pure.classifyDownloadError(new Error('Failed to fetch'))).toBe('network');
    expect(pure.classifyDownloadError(Object.assign(new Error('x'), { name: 'QuotaExceededError' }))).toBe('storage');
    expect(pure.classifyDownloadError(Object.assign(new Error('superseded'), { name: 'AbortError' }))).toBe('ignore');
    expect(pure.classifyMicError({ name: 'NotAllowedError' })).toBe('blocked');
    expect(pure.classifyMicError({ name: 'NotFoundError' })).toBe('missing');
    expect(pure.classifyMicError({ name: 'NotReadableError' })).toBe('busy');
    expect(pure.classifyMicError({ name: 'AbortError' })).toBe('ignore');
    expect(pure.classifyMicError(new Error('boom'))).toBe('failed');
  });

  it('never calls a device ready when it would use the cloud', () => {
    const caps = { getUserMedia: true };
    expect(pure.summaryKind({ requested: 'auto', resolved: 'webspeech', supported: true, capabilities: caps }, true)).toBe('browser');
    expect(pure.summaryKind({ requested: 'gemini', resolved: 'gemini', supported: true, capabilities: caps }, true)).toBe('gemini');
    expect(pure.summaryKind({ requested: 'whisper', resolved: 'whisper', supported: true, capabilities: caps }, false)).toBe('needs-model');
    expect(pure.summaryKind({ requested: 'whisper', resolved: 'whisper', supported: true, capabilities: caps }, true)).toBe('ready');
    expect(pure.summaryKind({ requested: 'off', resolved: 'off', supported: false, capabilities: caps }, true)).toBe('off');
  });

  it('falls back to English when a key has no translation yet', () => {
    expect(pure.say('speech_setup.title', 'Speech setup')).toBe('Speech setup');
    expect(pure.say('', 'Speech setup')).toBe('Speech setup');
    expect(pure.say('Configuración de voz', 'Speech setup')).toBe('Configuración de voz');
    expect(pure.say('Descargar ({size} MB)', 'Download ({size} MB)', { size: 39 })).toBe('Descargar (39 MB)');
  });
});

describe('Speech setup wiring', () => {
  const source = read('speech_setup_source.jsx');
  const host = read('AlloFlowANTI.txt');
  const strings = JSON.parse(read('ui_strings.js')).speech_setup;

  it('registers every string the panel, header, launch screen and host use', () => {
    const used = new Set();
    for (const text of [source, host, read('view_header_source.jsx'), read('view_launch_pad_source.jsx')]) {
      for (const match of text.matchAll(/['"]speech_setup\.([a-z_]+)['"]/g)) used.add(match[1]);
    }
    expect(used.size).toBeGreaterThan(70);
    expect([...used].filter((key) => !strings[key])).toEqual([]);
  });

  it('keeps registered English the same as the panel fallback', () => {
    const drift = [];
    for (const match of source.matchAll(/say\(t\('speech_setup\.([a-z_]+)'\),\s*'((?:[^'\\]|\\.)*)'/g)) {
      if (strings[match[1]] !== match[2].replace(/\\'/g, "'")) drift.push(match[1]);
    }
    expect(drift).toEqual([]);
  });

  it('is on the build list and loads on demand', () => {
    expect(read('build.js')).toContain("filename: 'speech_setup_module.js'");
    expect(host).toMatch(/window\.__alloLazySpeechSetup = \(\) => loadModule\('SpeechSetup'/);
    expect(read('desktop/web-app/public/speech_setup_module.js')).toBe(read('speech_setup_module.js'));
  });

  it('sits above the Launch Pad', () => {
    const z = Number(source.match(/allo-ss-backdrop\{[^}]*z-index:(\d+)/)[1]);
    const launchPad = Number(host.match(/LaunchPad's zIndex (\d+)/)[1]);
    expect(z).toBeGreaterThan(launchPad);
  });

  it('never offers a dead button on an older host', () => {
    for (const file of ['view_header_source.jsx', 'view_launch_pad_source.jsx']) {
      const text = read(file);
      const open = text.indexOf("'alloflow:open-speech-setup'");
      expect(open).toBeGreaterThan(0);
      expect(text.lastIndexOf('window.__alloSpeechSetupHost === true', open)).toBeGreaterThan(open - 600);
    }
  });

  it('keeps the microphone test on this device', () => {
    const voice = read('voice_module.js');
    const check = voice.slice(voice.indexOf('function startMicrophoneCheck('), voice.indexOf('return { promise: promise, cancel: cancel };'));
    expect(check).not.toMatch(/callGeminiAudio|SpeechRecognition|initWebSpeechCapture|engine: 'gemini'/);
    expect(check).toContain("engine: 'whisper'");
    expect(check).not.toMatch(/localStorage|alloDeviceStorage/);
  });
});
