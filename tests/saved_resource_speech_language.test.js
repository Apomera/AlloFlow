import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { transformSync } = require('@babel/core');
let PhaseK, audio;
beforeAll(() => {
  global.React = window.React = React;
  window.speechSynthesis = { cancel() {}, speak() {}, getVoices: () => [] };
  window.matchMedia ||= () => ({ matches: false });
  global.requestAnimationFrame = window.requestAnimationFrame = () => 0;
  audio = vi.fn(function (src) { this.src = src; this.play = () => Promise.resolve(); this.pause = () => {}; this.addEventListener = () => {}; });
  global.Audio = window.Audio = audio;
  loadAlloModule('text_pipeline_helpers_module.js');
  const compiled = transformSync(readFileSync('phase_k_helpers_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, compact: false
  }).code;
  new Function(compiled)();
  PhaseK = window.AlloModules.PhaseKHelpers;
}, 60000);
afterEach(() => { vi.restoreAllMocks(); audio.mockClear(); });
const ref = (current = null) => ({ current });
function deps(extra = {}) {
  return {
    isPlaying: false, isPaused: false, selectedVoice: 'Kore', voiceSpeed: 1, voiceVolume: 1,
    currentUiLanguage: 'French', leveledTextLanguage: 'French', playingContentId: null, textFormat: 'Standard Text',
    adventureState: {}, personaState: {}, _ttsState: {}, glossaryAudioCache: ref(new Map()),
    audioRef: ref(), isPlayingRef: ref(false), isSystemAudioActiveRef: ref(false), playbackRateRef: ref(1), persistentVoiceMapRef: ref({}),
    lastReadTurnRef: ref(), lastHandleSpeakRef: ref(), playbackTimeoutRef: ref(), recognitionRef: ref(), playbackSessionRef: ref(0),
    alloBotRef: ref(), audioBufferRef: ref({}), activeBlobUrlsRef: ref([]),
    setIsPlaying: vi.fn(), setIsPaused: vi.fn(), setPlayingContentId: vi.fn(), setError: vi.fn(), setIsGeneratingAudio: vi.fn(), setPlaybackState: vi.fn(),
    addToast: vi.fn(), t: key => key, warnLog() {}, debugLog() {},
    callTTS: vi.fn(async () => 'blob:live'), stopPlayback: vi.fn(),
    splitTextToSentences: text => [String(text)], getSideBySideContent: () => null,
    playSequence: vi.fn(), addBlobUrl: vi.fn(), releaseBlob: vi.fn(), _isCanvasEnv: false, AVAILABLE_VOICES: ['Kore'],
    generatedContent: { id: 'saved', type: 'simplified', data: 'Saved English sentence.', config: { language: 'English' } },
    ...extra
  };
}
async function speak(d, text = 'Saved English sentence.', contentId = 'simplified-main') {
  await PhaseK.handleSpeak(text, contentId, 0, d, true);
}

describe('saved resource speech languages', () => {
  it.each(['simplified-main', 'faq-active'])('keeps %s in saved English after app and output change to French', async contentId => {
    const d = deps(contentId === 'faq-active' ? { generatedContent: { id: 'faq', type: 'faq', config: { language: 'English' }, data: [{ question: 'English question?', answer: 'English answer.' }] } } : {});
    await speak(d, 'Saved English sentence.', contentId);
    const descriptors = d.playSequence.mock.calls[0][1];
    expect(descriptors.length).toBeGreaterThan(0);
    expect(descriptors.every(value => value.language === 'English')).toBe(true);
  });

  it('uses the saved Arabic companion rather than the old English assumption', async () => {
    const d = deps({ generatedContent: { id: 'saved', type: 'simplified', config: { language: 'English', translationPolicy: { target: 'Arabic' } } },
      getSideBySideContent: () => ({ source: ['Saved English sentence.'], target: ['جملة عربية.'] }) });
    await speak(d);
    expect(d.playSequence.mock.calls[0][1].map(value => value.language)).toEqual(['English', 'Arabic']);
  });

  it('honors an explicit speech override without rewriting resource metadata', async () => {
    const d = deps({ speechLanguageOverride: 'German' });
    const before = JSON.stringify(d.generatedContent);
    await speak(d);
    expect(d.playSequence.mock.calls[0][1].every(value => value.language === 'German')).toBe(true);
    expect(JSON.stringify(d.generatedContent)).toBe(before);
    const direct = deps({ speechLanguageOverride: 'Arabic' });
    await speak(direct, 'Saved text.', 'term-0');
    expect(direct.callTTS).toHaveBeenCalledWith('Saved text.', 'Kore', 1, expect.objectContaining({ language: 'Arabic' }));
  });

  it('reads the original pane in its saved source language', async () => {
    const d = deps({ generatedContent: { type: 'simplified', config: { language: 'English' }, sourceSnapshot: { language: 'Spanish', text: 'Texto original.' } } });
    await speak(d, 'Texto original.', 'simplified-source');
    expect(d.playSequence.mock.calls[0][1][0].language).toBe('Spanish');
  });

  it('keeps help/UI speech in the app language while leaving authored words untouched', async () => {
    const ui = deps({ t: () => 'Titre' });
    await speak(ui, 'common.title', 'help-title');
    expect(ui.callTTS).toHaveBeenCalledWith('Titre', 'Kore', 1, expect.objectContaining({ language: 'French' }));
    const content = deps({ t: () => 'WRONG LOCALIZATION', generatedContent: { type: 'glossary', baseLanguage: 'French', data: [{ term: 'Pain' }] } });
    await speak(content, 'Pain', 'term-0');
    expect(content.callTTS).toHaveBeenCalledWith('Pain', 'Kore', 1, expect.objectContaining({ language: 'French' }));
  });

  it('separates native-language homograph caches and keeps the English legacy lane', async () => {
    const native = deps({ generatedContent: { type: 'glossary', baseLanguage: 'French', data: [{ term: 'pain' }] },
      glossaryAudioCache: ref(new Map([['pain', 'blob:old-English'], ['French\u241fpain', 'blob:French']])) });
    await speak(native, 'pain', 'term-0');
    expect(native.callTTS).not.toHaveBeenCalled();
    expect(audio).toHaveBeenLastCalledWith('blob:French');
    const legacy = deps({ generatedContent: { type: 'glossary', config: { language: 'Spanish' }, data: [{ term: 'Leaf' }] },
      glossaryAudioCache: ref(new Map([['Leaf', 'blob:English']])) });
    await speak(legacy, 'Leaf', 'term-0');
    expect(legacy.callTTS).not.toHaveBeenCalled();
    expect(audio).toHaveBeenLastCalledWith('blob:English');
  });
});
