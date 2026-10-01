// The saved narration voice reset to Kore on every Canvas refresh.
// Root cause: the Canvas validator accepted a saved voice only if it matched a
// LOADED catalog, and the catalogs fill from a CDN module — so in the window
// where the Gemini list has loaded and the Kokoro list has not, a saved
// af_/am_ voice matched neither branch and fell through to the default.
// The desktop branch already reasoned correctly about this; Canvas did not.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];
const read = (f) => readFileSync(f, 'utf-8');

describe('saved narration voice survives a refresh', () => {
  it('a Kokoro voice is valid in Canvas without consulting a catalog', () => {
    for (const f of COPIES) {
      const app = read(f);
      const canvas = app.slice(app.indexOf('if (_isCanvasEnv) {'), app.indexOf("return 'Kore'; // Gemini TTS default"));
      // Shape test, not catalog test: the engine is local and needs no backend.
      expect(canvas, f).toContain('if (/^(af_|am_|bf_|bm_)/.test(saved)) return saved;');
      // And it must be checked BEFORE the catalog lookups that were the bug.
      expect(canvas.indexOf('/^(af_|am_|bf_|bm_)/')).toBeLessThan(canvas.indexOf('KOKORO_VOICES.some'));
    }
  });

  it('a partially-loaded catalog never discards a stored preference', () => {
    for (const f of COPIES) {
      const app = read(f);
      const canvas = app.slice(app.indexOf('if (_isCanvasEnv) {'), app.indexOf("return 'Kore'; // Gemini TTS default"));
      expect(canvas, f).toContain('if (AVAILABLE_VOICES.length === 0 || KOKORO_VOICES.length === 0) return saved;');
    }
  });

  it('the persistence effect cannot overwrite a real preference with a transient default', () => {
    // Without this guard the reset became PERMANENT: the validator returned
    // 'Kore' while catalogs loaded, and the effect immediately wrote 'Kore'
    // over the stored pick, so even a later correct load had nothing to read.
    for (const f of COPIES) {
      const app = read(f);
      expect(app, f).toContain("const storedVoice = safeGetItem('allo_voice_preference');");
      expect(app, f).toContain('if (storedVoice && storedVoice !== selectedVoice && !catalogsReady) return;');
    }
  });

  it('a cached Kokoro model is not described as downloading', () => {
    for (const f of COPIES) {
      const app = read(f);
      expect(app, f).toContain('_mc.hasKokoro()');
      // Hydrating a cached model is intentionally silent. The progress
      // takeover is reserved for a genuine model download.
      expect(app, f).toContain('if (_kokoroCached) return;');
      expect(app, f).not.toMatch(/_kokoroCached && progress && typeof progress\.stage === 'string' && \/download\/i\.test\(progress\.stage\)/);
    }
  });

  it('does not activate the Kokoro WASM runtime inside iPhone Canvas', () => {
    for (const f of COPIES) {
      const app = read(f);
      expect(app, f).toContain('const _isIOSCanvasEnv = (() => {');
      const loader = app.slice(app.indexOf('window.__loadKokoroTTS = async'), app.indexOf('// â”€â”€ Local SpeechRecognition shim'));
      expect(loader, f).toContain("window.__kokoroTTSUnavailableReason = 'ios-canvas'");
      expect(loader.indexOf('if (_isIOSCanvasEnv)')).toBeLessThan(loader.indexOf('window._kokoroTTS?.ready'));
    }
    const directLoader = read('kokoro_tts_loader.js');
    expect(directLoader).toContain('function isIosCanvasRuntime()');
    expect(directLoader.indexOf('if (isIosCanvasRuntime())')).toBeLessThan(directLoader.indexOf('window.__kokoroTTSLoading'));
  });
});

describe('voice output diagnostics', () => {
  it('offers a Test voice control wired to real playback-start signals', () => {
    const header = read('view_header_source.jsx');
    expect(header).toContain('Test voice');
    expect(header).toContain('window.__alloTestVoice');
    for (const f of COPIES) {
      const app = read(f);
      expect(app, f).toContain('window.__alloTestVoice = handleTestVoice;');
      expect(app, f).toContain('audio.onplaying = () =>');
      expect(app, f).toContain('utterance.onstart = () =>');
      expect(app, f).toContain('Voice volume is set to zero');
      expect(app, f).toContain('Voice test blocked by global mute');
    }
  });

  it('persists bot voice and effects independently', () => {
    for (const f of COPIES) {
      const app = read(f);
      expect(app, f).toContain("safeGetItem('alloflow-effects-enabled') !== 'false'");
      expect(app, f).toContain("safeGetItem('alloflow-bot-voice-enabled') !== 'false'");
      expect(app, f).toContain('setBotVoiceEnabled(prev =>');
      expect(app, f).toContain('soundEnabled={botVoiceEnabled}');
    }
  });
});
