import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Student AI off (owner decision 2026-11-04): Word Sounds plays prepared clips
// first, then an on-device voice already installed (callTTS), then the browser
// DEVICE voice for whole words. Isolated phonemes are never
// synthesized, and the cloud callTTS leg is skipped for these learners.
const source = readFileSync(process.env.WS_STUDENT_VOICE_MODULE || 'word_sounds_module.js', 'utf8').replace(/\r\n/g, '\n');
function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error('Missing production boundary: ' + startMarker);
  return source.slice(start, end);
}
const helpers = () => new Function(between('  function wsStudentDeviceVoiceOnly() {', '  function wsAnnounce(message) {')
  + '\nreturn { wsStudentDeviceVoiceOnly, wsSpeakDeviceVoice };')();

class FakeUtterance { constructor(text) { this.text = text; } }
function fakeSynth({ start = true } = {}) {
  const spoken = [];
  return { spoken, cancel: vi.fn(), speak: vi.fn(u => { spoken.push(u); if (start) { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 0); } }) };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); delete window.__alloStudentAiDisabled; });

describe('Word Sounds device voice for student AI-off learners', () => {
  it('speaks a whole word with the lesson language on the device voice', async () => {
    const synth = fakeSynth(); vi.stubGlobal('speechSynthesis', synth); vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    window.speechSynthesis = synth;
    const { wsStudentDeviceVoiceOnly, wsSpeakDeviceVoice } = helpers();
    expect(wsStudentDeviceVoiceOnly()).toBe(false);
    window.__alloStudentAiDisabled = true;
    expect(wsStudentDeviceVoiceOnly()).toBe(true);
    await expect(wsSpeakDeviceVoice('ship', 'es', 1)).resolves.toBe(true);
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0]).toMatchObject({ text: 'ship', lang: 'es' });
  });
  it('reports a device that never starts speaking instead of hanging', async () => {
    vi.useFakeTimers();
    const synth = fakeSynth({ start: false }); window.speechSynthesis = synth; vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    const { wsSpeakDeviceVoice } = helpers();
    const pending = wsSpeakDeviceVoice('ship', 'English', 1);
    await vi.advanceTimersByTimeAsync(8001);
    await expect(pending).resolves.toBe(false);
    expect(synth.spoken[0].lang).toBe('en-US');
  });

  const audio = between('      const handleAudio = React.useCallback(', '      const handleManualAudio = React.useCallback(');
  it('never sends an isolated phoneme to any voice', () => {
    const phonemeSkip = audio.indexOf('skipping (no TTS for phonemes)');
    const device = audio.indexOf('wsSpeakDeviceVoice(text');
    expect(phonemeSkip).toBeGreaterThan(0);
    expect(device).toBeGreaterThan(phonemeSkip);
    expect(audio).toContain('if (playImmediately && !isPhoneme && ttsWholeWord && wsStudentDeviceVoiceOnly() && !playbackStale() && (await waitForFeedback())) {');
  });
  it('skips the cloud callTTS leg for student AI-off learners and tries prepared clips first', () => {
    expect(audio).toContain('if (callTTS && voiceForTts && !isPhoneme && ttsWholeWord && !wsStudentDeviceVoiceOnly()) {');
    const library = audio.indexOf('liveLibrary[lower]');
    const stored = audio.indexOf('loadAudioFromStorage(text)');
    const device = audio.indexOf('wsSpeakDeviceVoice(text');
    expect(library).toBeGreaterThan(0); expect(stored).toBeGreaterThan(library); expect(device).toBeGreaterThan(stored);
  });
  // Owner follow-up 2026-11-04: an on-device voice ALREADY installed (Kokoro/Piper via
  // callTTS, which never downloads for these learners) reads whole words before the
  // browser voice. Prepared clips still come first; phonemes never reach any voice.
  it('tries the on-device voice through callTTS after prepared clips and before the browser voice', () => {
    const onDevice = audio.indexOf('if (playImmediately && callTTS && voiceForTts && !isPhoneme && ttsWholeWord && wsStudentDeviceVoiceOnly() && !playbackStale()) {');
    expect(onDevice).toBeGreaterThan(audio.indexOf('loadAudioFromStorage(text)'));
    expect(onDevice).toBeGreaterThan(audio.indexOf('skipping (no TTS for phonemes)'));
    expect(onDevice).toBeGreaterThan(audio.indexOf('!wsStudentDeviceVoiceOnly()) {'));
    expect(onDevice).toBeLessThan(audio.indexOf('wsSpeakDeviceVoice(text'));
  });
  const studentLeg = () => {
    const body = between('          let onDeviceFailed = false;', '          if (playImmediately && !playbackStale()) {\n            if (!isPhoneme) {');
    return new Function('deps', 'const { playImmediately, callTTS, voiceForTts, isPhoneme, ttsWholeWord, wsStudentDeviceVoiceOnly, playbackStale, waitForFeedback, text, wordSoundsLanguage, ttsSpeed, loadAndPlay, wsSpeakDeviceVoice, warnLog, clearAudioNotice } = deps;\n'
      + 'return (async () => {\n' + body + '\nreturn "fell-through";\n})();');
  };
  const legDeps = (over = {}) => ({ playImmediately: true, voiceForTts: 'af_heart', isPhoneme: false, ttsWholeWord: true, text: 'ship', wordSoundsLanguage: 'English', ttsSpeed: 1,
    wsStudentDeviceVoiceOnly: () => true, playbackStale: () => false, waitForFeedback: async () => true, warnLog: vi.fn(), clearAudioNotice: vi.fn(),
    callTTS: vi.fn(async () => 'blob:kokoro'), loadAndPlay: vi.fn(async (src) => src), wsSpeakDeviceVoice: vi.fn(async () => true), ...over });
  it('plays the on-device clip and skips the browser voice; never stores it or asks the cloud', async () => {
    const deps = legDeps();
    await expect(studentLeg()(deps)).resolves.toBe('blob:kokoro');
    expect(deps.callTTS).toHaveBeenCalledWith('ship', 'af_heart', 1, { language: 'English', maxRetries: 0 });
    expect(deps.loadAndPlay).toHaveBeenCalledWith('blob:kokoro');
    expect(deps.wsSpeakDeviceVoice).not.toHaveBeenCalled();
    expect(between('          let onDeviceFailed = false;', '          if (playImmediately && !isPhoneme && ttsWholeWord && wsStudentDeviceVoiceOnly()')).not.toContain('saveAudioToStorage');
  });
  it.each([
    ['no on-device voice', { callTTS: vi.fn(async () => null) }, false],
    ['callTTS throws', { callTTS: vi.fn(async () => { throw new Error('engine'); }) }, false],
    ['the on-device clip fails to load', { loadAndPlay: vi.fn(async () => null) }, true],
  ])('falls back to the browser voice when %s', async (_label, over, clearsNotice) => {
    const deps = legDeps(over);
    await expect(studentLeg()(deps)).resolves.toEqual({ ok: true, status: 'ready' });
    expect(deps.wsSpeakDeviceVoice).toHaveBeenCalledWith('ship', 'English', 1);
    expect(deps.clearAudioNotice).toHaveBeenCalledTimes(clearsNotice ? 1 : 0);
  });
  it.each([
    ['an isolated phoneme', { isPhoneme: true }],
    ['a vowel-less sound chunk', { ttsWholeWord: false }],
    ['a teacher or AI-on learner', { wsStudentDeviceVoiceOnly: () => false }],
    ['a silent preload', { playImmediately: false }],
  ])('never voices %s on this leg', async (_label, over) => {
    const deps = legDeps(over);
    await expect(studentLeg()(deps)).resolves.toBe('fell-through');
    expect(deps.callTTS).not.toHaveBeenCalled(); expect(deps.wsSpeakDeviceVoice).not.toHaveBeenCalled();
  });
  it('a request replaced while the on-device voice prepares is cancelled, not played', async () => {
    let stale = false;
    const deps = legDeps({ playbackStale: () => stale, callTTS: vi.fn(async () => { stale = true; return 'blob:kokoro'; }) });
    await expect(studentLeg()(deps)).resolves.toEqual({ ok: false, status: 'cancelled' });
    expect(deps.loadAndPlay).not.toHaveBeenCalled(); expect(deps.wsSpeakDeviceVoice).not.toHaveBeenCalled();
  });
  it('reads the isolation instruction on the device voice when no clip exists', () => {
    const instruction = between('      const playIsolationInstruction = React.useCallback(', '      const playSyllables = React.useCallback(');
    expect(instruction).toContain('if (wsStudentDeviceVoiceOnly() && await wsSpeakDeviceVoice(instruction, "en-US", 0.9)) return;');
  });
});
