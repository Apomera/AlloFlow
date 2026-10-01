// Podcast voices follow the reading's own format, not the sidebar setting, and a
// preserved original is never read as a script (it would drop "MACBETH:" labels).
// The Both view's original pane plays as its own sentence sequence.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let PhaseK;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  global.React = window.React = React;
  window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  global.requestAnimationFrame = window.requestAnimationFrame = () => 0;
  window.speechSynthesis = { cancel: () => {}, speak: () => {}, getVoices: () => [] };
  window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) { this.text = text; };
  global.Audio = window.Audio = function Audio(src) { this.src = src; this.play = () => Promise.resolve(); this.pause = () => {}; this.addEventListener = () => {}; };
  loadAlloModule(process.env.ALLO_PHASE_K_CANDIDATE || 'phase_k_helpers_module.js');
  PhaseK = window.AlloModules.PhaseKHelpers;
});
afterEach(() => { vi.restoreAllMocks(); });

const ref = (value = null) => ({ current: value });
function deps(overrides) {
  return {
    isPlaying: false, isPaused: false, isMuted: false, selectedVoice: 'Kore', voiceSpeed: 1, voiceVolume: 1,
    currentUiLanguage: 'English', leveledTextLanguage: 'English', playingContentId: null, textFormat: 'Standard Text',
    adventureState: {}, personaState: {}, _ttsState: {}, glossaryAudioCache: ref(new Map()),
    audioRef: ref(), isPlayingRef: ref(false), isSystemAudioActiveRef: ref(false), playbackRateRef: ref(1), persistentVoiceMapRef: ref({}),
    lastReadTurnRef: ref(), lastHandleSpeakRef: ref(), playbackTimeoutRef: ref(), recognitionRef: ref(), playbackSessionRef: ref(0),
    alloBotRef: ref(), audioBufferRef: ref({}), activeBlobUrlsRef: ref([]),
    setIsPlaying: vi.fn(), setIsPaused: vi.fn(), setPlayingContentId: vi.fn(), setError: vi.fn(), setIsGeneratingAudio: vi.fn(), setPlaybackState: vi.fn(),
    addToast: vi.fn(), t: () => undefined, warnLog: () => {}, debugLog: () => {},
    callTTS: vi.fn(async () => 'blob:x'), fetchTTSBytes: vi.fn(async () => null), stopPlayback: vi.fn(),
    splitTextToSentences: p => String(p || '').split(/(?<=[.!?])\s+/).filter(Boolean), getSideBySideContent: () => null,
    playSequence: vi.fn(async () => {}), addBlobUrl: vi.fn(), releaseBlob: vi.fn(), isCanvas: false, _isCanvasEnv: false, AVAILABLE_VOICES: ['Kore'],
    ...overrides
  };
}
const TEXT = 'MACBETH: So foul and fair a day I have not seen. BANQUO: How far is it to Forres?';
async function play(contentId, overrides) {
  const d = deps(overrides);
  await PhaseK.handleSpeak(TEXT, contentId, 0, d, true);
  expect(d.playSequence).toHaveBeenCalledTimes(1);
  const args = d.playSequence.mock.calls[0];
  return { mode: args[3], contentId: args[10] };
}
const adapted = format => ({ id: 'a', type: 'simplified', data: TEXT, config: format ? { textFormat: format } : {}, instructionalText: { form: 'adapted' } });
const original = { id: 'o', type: 'simplified', data: TEXT, config: {}, instructionalText: { form: 'same-text-supported' } };

describe('read-aloud script mode', () => {
  it('reads a Podcast Script adaptation with script voices even when the sidebar says otherwise', async () => {
    expect((await play('simplified-main', { generatedContent: adapted('Podcast Script'), textFormat: 'Standard Text' })).mode).toBe('script');
  });
  it('reads a standard adaptation normally even when the sidebar is set to Podcast Script', async () => {
    expect((await play('simplified-main', { generatedContent: adapted('Standard Text'), textFormat: 'Podcast Script' })).mode).toBe('standard');
  });
  it('keeps the sidebar fallback for an adaptation saved without a format', async () => {
    expect((await play('simplified-main', { generatedContent: adapted(null), textFormat: 'Podcast Script' })).mode).toBe('script');
  });
  it('never reads a preserved original as a script', async () => {
    expect((await play('simplified-main', { generatedContent: original, textFormat: 'Podcast Script' })).mode).toBe('standard');
  });
  it('plays the Both view original pane as its own standard sequence, whatever the open adaptation is', async () => {
    const result = await play('simplified-source', { generatedContent: adapted('Podcast Script'), textFormat: 'Podcast Script' });
    expect(result).toEqual({ mode: 'standard', contentId: 'simplified-source' });
  });
});
