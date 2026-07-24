// handleSpeak crash class, field-reported 2026-07-21: clicking an emoji in the
// FAQ threw "Cannot read properties of undefined (reading 'split')".
//
// Root cause: handleSpeak treats a short single token as a possible i18n key
// (glossary terms ARE spoken that way) and calls t(). t() returns undefined on
// a MISS by design — the caller owns the fallback — and this call site had
// none. So EVERY one-token sentence that isn't a translation key resolved to
// undefined and threw on .split(): an emoji, but equally "Yes.",
// "Photosynthesis.", "Absolutely!" — ordinary classroom text.
//
// These drive the REAL built module through its real dependency object; only
// the browser/audio/network boundary is faked.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let PhaseK;

beforeAll(() => {
  const React = require(resolve(MODULES_DIR, 'react'));
  global.React = window.React = React;
  window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  global.requestAnimationFrame = window.requestAnimationFrame = () => 0;
  // jsdom ships neither of these; handleSpeak touches both before it branches.
  window.speechSynthesis = { cancel: () => {}, speak: () => {}, getVoices: () => [], cancelled: 0 };
  window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) { this.text = text; };
  global.Audio = window.Audio = function Audio(src) {
    this.src = src; this.currentTime = 0; this.duration = 1; this.playbackRate = 1; this.volume = 1;
    this.play = () => Promise.resolve(); this.pause = () => {};
    this.addEventListener = () => {}; this.removeEventListener = () => {};
  };
  loadAlloModule('phase_k_helpers_module.js');
  PhaseK = window.AlloModules && window.AlloModules.PhaseKHelpers;
  if (!PhaseK || typeof PhaseK.handleSpeak !== 'function') throw new Error('PhaseKHelpers.handleSpeak did not register');
});

afterEach(() => { vi.restoreAllMocks(); });

// A dependency object shaped like the host's, with the audio/network edges
// stubbed. `t` mimics the real one: undefined for any key it does not know.
function makeDeps(overrides = {}) {
  const calls = { callTTS: [], playSequence: [], toasts: [] };
  const ref = (value = null) => ({ current: value });
  const deps = {
    calls,
    isPlaying: false, isPaused: false, isMuted: false,
    selectedVoice: 'Kore', voiceSpeed: 1, voiceVolume: 1,
    currentUiLanguage: 'English', leveledTextLanguage: 'English',
    playingContentId: null,
    adventureState: {}, personaState: {}, _ttsState: {},
    glossaryAudioCache: ref(new Map()),
    audioRef: ref(null), isPlayingRef: ref(false), isSystemAudioActiveRef: ref(false),
    playbackRateRef: ref(1), persistentVoiceMapRef: ref({}), lastReadTurnRef: ref(null),
    lastHandleSpeakRef: ref(null), playbackTimeoutRef: ref(null), recognitionRef: ref(null),
    playbackSessionRef: ref(0),
    alloBotRef: ref(null), audioBufferRef: ref({}), activeBlobUrlsRef: ref([]),
    setIsPlaying: vi.fn(), setIsPaused: vi.fn(), setPlayingContentId: vi.fn(),
    setError: vi.fn(), setIsGeneratingAudio: vi.fn(), setPlaybackState: vi.fn(),
    addToast: (msg, kind) => calls.toasts.push({ msg, kind }),
    // the real t(): a miss yields undefined, NOT the key
    t: (key) => (key === 'known.key' ? 'translated value' : undefined),
    warnLog: () => {}, debugLog: () => {},
    callTTS: vi.fn(async (text) => { calls.callTTS.push(text); return 'blob:spoken'; }),
    fetchTTSBytes: vi.fn(async () => null),
    stopPlayback: vi.fn(),
    splitTextToSentences: (p) => String(p || '').split(/(?<=[.!?])\s+/).filter(Boolean),
    getSideBySideContent: () => null,
    playSequence: vi.fn(async (sentences) => { calls.playSequence.push(sentences); }),
    addBlobUrl: vi.fn(), releaseBlob: vi.fn(),
    isCanvas: false, _isCanvasEnv: false,
    AVAILABLE_VOICES: ['Kore'],
    ...overrides
  };
  return deps;
}

describe('handleSpeak: a one-token sentence must never crash the click', () => {
  // The exact field repro plus the ordinary text that shared the bug.
  const cases = ['🎉', '🎉🎊', 'Yes.', 'Photosynthesis.', 'Absolutely!', 'Mitochondria'];

  for (const text of cases) {
    it(`survives ${JSON.stringify(text)} on the direct path (t() returns undefined for it)`, async () => {
      const deps = makeDeps();
      let thrown = null;
      await PhaseK.handleSpeak(text, 'glossary-term', 0, deps, true).catch(e => { thrown = e; });
      expect(thrown).toBe(null);
    });

    it(`survives ${JSON.stringify(text)} clicked in the FAQ`, async () => {
      const deps = makeDeps({
        generatedContent: { type: 'faq', data: [{ question: 'A question here?', answer: `Some real answer text. ${text}` }] }
      });
      let thrown = null;
      await PhaseK.handleSpeak(text, 'faq-active', 1, deps, true).catch(e => { thrown = e; });
      expect(thrown).toBe(null);
    });
  }

  it('speakable one-word text still reaches the speech path', async () => {
    const deps = makeDeps();
    await PhaseK.handleSpeak('Photosynthesis.', 'faq-active', 0, deps, true);
    const spoke = deps.calls.callTTS.length > 0 || deps.calls.playSequence.length > 0;
    expect(spoke).toBe(true);
  });

  it('an emoji-only token on the DIRECT path is skipped QUIETLY — no toast, no TTS request', async () => {
    const deps = makeDeps();
    await PhaseK.handleSpeak('🎉', 'glossary-term', 0, deps, true);
    expect(deps.calls.callTTS).toEqual([]);      // never ask a provider to voice a decoration
    expect(deps.calls.playSequence).toEqual([]);
    expect(deps.calls.toasts).toEqual([]);       // silence, not a scary error
    expect(deps.isPlayingRef.current).toBe(false);
    expect(deps.setPlayingContentId).toHaveBeenCalledWith(null);
  });

  it('emoji mixed WITH words is still spoken (only pure decoration is skipped)', async () => {
    const deps = makeDeps();
    await PhaseK.handleSpeak('🎉 Great job everyone!', 'glossary-term', 0, deps, true);
    const spoke = deps.calls.callTTS.length > 0 || deps.calls.playSequence.length > 0;
    expect(spoke).toBe(true);
  });

  // THE FIELD REPORT, precisely: FAQ answers commonly end in a one-token
  // flourish ("🌱", "Yes!", "Amazing.") — clicking it crashed, so line 2 of
  // every answer neither played NOR got captured, while line 1 worked fine.
  // For a sequence reader the clicked text is only a POSITION: the list is
  // rebuilt from the resource, so playback must still START THERE.
  describe('FAQ: clicking a decorative sentence still starts the sequence at that index', () => {
    const faqDeps = () => makeDeps({
      generatedContent: {
        type: 'faq',
        data: [
          { question: 'How do plants eat?', answer: 'Plants make food from sunlight. 🌱' },
          { question: 'Do they need water?', answer: 'Yes they do. Amazing.' }
        ]
      }
    });

    it('the emoji sentence starts playback rather than dying silently', async () => {
      const deps = faqDeps();
      // global index 2 = FAQ 0 answer sentence 2 (the 🌱)
      await PhaseK.handleSpeak('🌱', 'faq-active', 2, deps, true);
      expect(deps.calls.playSequence.length).toBeGreaterThan(0);
    });

    it('the rebuilt sentence list spans ALL FAQs, so global indices stay valid', async () => {
      const deps = faqDeps();
      // fixture yields 6 sentences: q0, a0s1, a0s2(🌱), q1, a1s1, a1s2("Amazing.")
      await PhaseK.handleSpeak('Amazing.', 'faq-active', 5, deps, true);
      const call = deps.playSequence.mock.calls[0];
      const startIndex = call[0];
      const sentences = call[1];
      expect(sentences).toHaveLength(6);
      expect(startIndex).toBe(5);                       // starts where the teacher clicked
      expect(sentences[0]).toContain('How do plants eat'); // ...within the WHOLE FAQ list
      expect(sentences[5]).toContain('Amazing');
    });
  });

  it('the glossary key path still translates (the reason t() is called at all)', async () => {
    const deps = makeDeps();
    await PhaseK.handleSpeak('known.key', 'glossary-term', 0, deps, true);
    const spokenTexts = deps.calls.callTTS.concat(deps.calls.playSequence.flat().map(String));
    expect(spokenTexts.join(' ')).toContain('translated value');
  });
});

describe('source pins', () => {
  const src = readFileSync(resolve(process.cwd(), 'phase_k_helpers_source.jsx'), 'utf8');
  const mod = readFileSync(resolve(process.cwd(), 'phase_k_helpers_module.js'), 'utf8');

  it('the t() result always has a raw-text fallback', () => {
    expect(src).toContain('const effectiveText = (_looksLikeTranslationKey ? t(text) : text) || text;');
    // the unguarded original must not creep back
    expect(src).not.toMatch(/const effectiveText = \(!text\.includes\(' '\) && text\.length < 100\) \? t\(text\) : text;/);
    expect(mod).toContain('(_looksLikeTranslationKey ? t(text) : text) || text');
  });

  it('built module and its deployed mirror agree', () => {
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/phase_k_helpers_module.js'), 'utf8')).toBe(mod);
  });
});
