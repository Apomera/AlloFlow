import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Student AI off (owner decision 2026-11-04): callTTS returns no URL for these
// learners, so every surface that only played a returned URL went silent. Each
// now reads with the device voice (speechSynthesis), respecting global mute and
// the "speech off" provider. Teachers (flag unset) keep the old behaviour.
// ALLO_TTS_CALLERS_ROOT lets this file run against pre-change copies.
const ROOT = process.env.ALLO_TTS_CALLERS_ROOT || process.cwd();
const read = (file) => readFileSync(resolve(ROOT, file), 'utf8');

function extract(src, name) {
  const starts = [`function ${name}(`, `var ${name} = function`, `const ${name} = (`];
  let at = -1;
  for (const s of starts) { at = src.indexOf(s); if (at >= 0) break; }
  if (at < 0) throw new Error(`${name} not found`);
  const open = src.indexOf('{', src.indexOf(')', at));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(at, i + 1);
  }
  throw new Error(`${name} has no end`);
}

function fakeWindow(extra = {}) {
  const spoken = [];
  const win = {
    speechSynthesis: { cancel: vi.fn(), speak: vi.fn((u) => spoken.push(u)) },
    localStorage: { getItem: () => extra.config ? JSON.stringify(extra.config) : null },
    __alloPlaybackRate: 1.25,
    ...extra,
  };
  return { win, spoken };
}
function Utterance(text) { this.text = text; }

const HELPERS = [
  ['sel_hub/sel_hub_module.js', '_selStudentDeviceVoice', (fn) => fn('Breathe slowly.', 0.9)],
  ['arcade_mode_modelun.js', 'modelUnStudentDeviceVoice', (fn) => fn('Breathe slowly.')],
  ['view_spotlight_tour_module.js', 'spotlightStudentDeviceVoice', (fn) => fn('Breathe slowly.')],
  ['view_guided_mode_banner_module.js', 'guidedStudentDeviceVoice', (fn) => fn('Breathe slowly.')],
  ['audio_helpers_module.js', '_audioStudentDeviceVoice', (fn) => fn('Breathe slowly.', { language: 'Spanish' })],
  ['view_simplified_module.js', 'simplifiedStudentDeviceVoice', (fn) => fn('Breathe slowly.', 'English', 1)],
  ['view_gemini_bridge_module.js', '_bridgeStudentDeviceVoice', (fn) => { fn('Breathe slowly.', 1, 'Spanish'); return true; }],
  ['live_aac_module.js', '_alloAacStudentDeviceVoice', (fn) => fn('Breathe slowly.', 'es-ES')],
];

describe('student AI off: each silent caller has a device-voice fallback', () => {
  const build = (file, name, win) => new Function('window', 'SpeechSynthesisUtterance', 'BRIDGE_LANG_CODES', 'setTimeout',
    `${extract(read(file), name)}\nreturn ${name};`)(win, Utterance, { Spanish: 'es-ES' }, () => 0);
  it.each(HELPERS)('%s %s speaks for a student-off learner only', (file, name, call) => {
    const student = fakeWindow({ __alloStudentAiDisabled: true });
    expect(call(build(file, name, student.win))).toBe(true);
    expect(student.spoken.map((u) => u.text)).toEqual(['Breathe slowly.']);
    const teacher = fakeWindow({});
    call(build(file, name, teacher.win));
    expect(teacher.win.speechSynthesis.speak).not.toHaveBeenCalled();
    const muted = fakeWindow({ __alloStudentAiDisabled: true, __alloIsGlobalMuted: () => true });
    call(build(file, name, muted.win));
    expect(muted.win.speechSynthesis.speak).not.toHaveBeenCalled();
    const off = fakeWindow({ __alloStudentAiDisabled: true, config: { ttsProvider: 'off' } });
    call(build(file, name, off.win));
    expect(off.win.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('each caller uses its fallback where the URL is missing', () => {
    expect(read('sel_hub/sel_hub_module.js')).toContain("if (url) { var a = new Audio(url); a.play().catch(function() {}); }\n              else _selStudentDeviceVoice(text, speed);");
    expect(read('sel_hub/sel_tool_somaticreset.js')).toContain("if (!url && window.__alloStudentAiDisabled !== true) toast('Voice guidance is unavailable right now.', 'info');");
    expect(read('arcade_mode_modelun.js')).toMatch(/if \(!audioUrl\) \{\s+var spoken = modelUnStudentDeviceVoice\(text\.slice\(0, 1500\)/);
    expect(read('view_spotlight_tour_source.jsx')).toMatch(/if \(!url\) \{\s+if \(spotlightStudentDeviceVoice\(plain,/);
    expect(read('view_guided_mode_banner_source.jsx')).toMatch(/if \(!url\) \{\s+if \(guidedStudentDeviceVoice\(plain,/);
    expect(read('view_math_source.jsx')).toContain("if (url || typeof window === 'undefined' || window.__alloStudentAiDisabled !== true) return;");
    expect(read('view_simplified_source.jsx')).toContain('if (!url && simplifiedStudentDeviceVoice(word, helpLanguage, voiceSpeed,');
    expect(read('view_gemini_bridge_source.jsx').match(/else if \(!\(await _bridgeStudentDeviceVoice\(cleanText,/g)).toHaveLength(2);
    expect(read('live_aac_source.jsx')).toContain('if (!played && tap === speakTapRef.current) _alloAacStudentDeviceVoice(phrase, locale);');
    expect(read('immersive_reader_source.jsx')).toContain("!kokoroUsesDeviceProvider && window.__alloStudentAiDisabled !== true) {");
  });
});

describe('student AI off: shared audio helpers (glossary card sequence, Download audio)', () => {
  let helpers;
  const load = () => {
    if (helpers) return helpers;
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.AudioHelpersModule;
    new Function(read('audio_helpers_module.js'))();
    helpers = window.AlloModules.AudioHelpers;
    return helpers;
  };
  const spoken = [];
  afterEach(() => {
    delete window.__alloStudentAiDisabled; delete window.__loadKokoroTTS; delete window._kokoroTTS;
    delete window.__alloActiveAudioDownloadController; spoken.length = 0; vi.unstubAllGlobals();
  });
  const stubSpeech = () => {
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel: vi.fn(), speak: vi.fn((u) => { spoken.push(u); setTimeout(() => u.onend && u.onend(), 0); }) } });
  };
  const cardDeps = (callTTS) => {
    const ref = (v) => ({ current: v });
    return {
      generatedContent: { data: [{ term: 'Photosynthesis', def: 'How plants make food.' }] }, flashcardIndex: 0, flashcardMode: 'standard',
      standardDeckLang: 'English Only', selectedVoice: 'Kore', setIsPlaying: vi.fn(), setPlayingContentId: vi.fn(), audioRef: ref(null),
      isPlayingRef: ref(false), playbackSessionRef: ref(0), playbackRateRef: ref(1), addBlobUrl: vi.fn(), callTTS, stopPlayback: vi.fn(),
      t: (k) => k, warnLog: vi.fn(),
    };
  };
  it('reads each flashcard item with the device voice for a student-off learner, without retrying the cloud', async () => {
    const { handleCardAudioSequence } = load(); stubSpeech();
    window.__alloStudentAiDisabled = true;
    const callTTS = vi.fn(async () => null);
    await handleCardAudioSequence(null, cardDeps(callTTS));
    await vi.waitFor(() => expect(spoken.map((u) => u.text)).toEqual(['Photosynthesis', 'How plants make food.']), { timeout: 3000 });
    expect(callTTS).toHaveBeenCalledTimes(2);
  });
  it('keeps the teacher sequence unchanged (no device voice)', async () => {
    const { handleCardAudioSequence } = load(); stubSpeech();
    vi.useFakeTimers();
    try {
      const deps = cardDeps(vi.fn(async () => null));
      const run = handleCardAudioSequence(null, deps);
      await vi.advanceTimersByTimeAsync(10000);
      await run;
      expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
      expect(deps.callTTS).toHaveBeenCalledTimes(4);
    } finally { vi.useRealTimers(); }
  });
  const downloadDeps = (extra) => ({
    AVAILABLE_VOICES: ['Kore'], downloadingContentId: null, textFormat: 'Plain', setDownloadingContentId: vi.fn(),
    persistentVoiceMapRef: { current: null }, addToast: vi.fn(), t: () => '', warnLog: vi.fn(), pcmToMp3: vi.fn(), pcmToWav: vi.fn(), ...extra,
  });
  const browserRequired = () => Object.assign(new Error('device voice'), { code: 'BROWSER_TTS_REQUIRED', useBrowserTts: true });
  it('Download audio never fetches the Kokoro model for a student and does not point them at a cloud voice', async () => {
    const { handleDownloadAudio } = load();
    window.__alloStudentAiDisabled = true;
    window.__loadKokoroTTS = vi.fn(async () => true);
    const deps = downloadDeps({ selectedVoice: 'af_heart', callTTS: vi.fn(async () => null), fetchTTSBytes: vi.fn(async () => { throw browserRequired(); }) });
    await handleDownloadAudio('The water cycle moves water.', 'lesson', 'c1', deps);
    expect(window.__loadKokoroTTS).not.toHaveBeenCalled();
    const message = deps.addToast.mock.calls.map((c) => c[0]).pop();
    expect(message).toMatch(/cannot be saved as a file/);
    expect(message).not.toMatch(/cloud/i);
  });
  it('a teacher keeps the cloud/on-device hint', async () => {
    const { handleDownloadAudio } = load();
    const deps = downloadDeps({ selectedVoice: 'browser', callTTS: vi.fn(), fetchTTSBytes: vi.fn(async () => { throw browserRequired(); }) });
    await handleDownloadAudio('The water cycle moves water.', 'lesson', 'c2', deps);
    expect(deps.addToast.mock.calls.map((c) => c[0]).pop()).toMatch(/cloud or on-device voice/);
  });
});
