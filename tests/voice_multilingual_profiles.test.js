import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (fn) => fn,
  });
  loadAlloModule('allo_commands_module.js');
  loadAlloModule('voice_module.js');
});

afterAll(() => vi.unstubAllGlobals());

describe('multilingual Whisper profiles', () => {
  it('keeps English small and selects the multilingual model for supported locales', () => {
    const resolve = window.AlloModules.AlloCommands.modelCache.resolveWhisperProfile;
    expect(resolve('en-US')).toMatchObject({ supported: true, key: 'english', modelId: 'Xenova/whisper-tiny.en', language: 'en' });
    expect(resolve('es-MX')).toMatchObject({ supported: true, key: 'multilingual', modelId: 'Xenova/whisper-tiny', language: 'es' });
    expect(resolve('fr-CA')).toMatchObject({ supported: true, key: 'multilingual', language: 'fr' });
    expect(resolve('zh-HK')).toMatchObject({ supported: true, key: 'multilingual', language: 'yue' });
    expect(resolve('fil-PH')).toMatchObject({ supported: true, key: 'multilingual', language: 'tl' });
    expect(resolve('ga-IE')).toMatchObject({ supported: false, key: null, modelId: null });
    expect(resolve('en-US').files.at(-1)).toContain('whisper-tiny.en');
    expect(resolve('es-MX').files.at(-1)).not.toContain('whisper-tiny.en');
  });

  it('uses the same profile rules in the general voice module, including friendly UI names', () => {
    window.AlloFlowLang = { bcp47Full: (name) => name === 'Spanish' ? 'es-ES' : 'en-US' };
    expect(window.AlloFlowVoice.resolveWhisperProfile('Spanish', 'tiny')).toMatchObject({
      supported: true,
      key: 'multilingual',
      language: 'es',
      modelId: 'Xenova/whisper-tiny',
    });
    expect(window.AlloFlowVoice.resolveWhisperProfile('en-GB', 'base')).toMatchObject({
      key: 'english',
      modelId: 'Xenova/whisper-base.en',
    });
  });

  it('transcribes in the selected language and never sends non-English speech through English Kokoro', () => {
    const commands = readFileSync('allo_commands_source.jsx', 'utf8');
    const voice = readFileSync('voice_module.js', 'utf8');
    expect(commands).toContain('{ language: profile.language, task: "transcribe", return_timestamps: false }');
    expect(voice).toContain("{ language: whisperProfile.language, task: 'transcribe', return_timestamps: false }");
    expect(voice).not.toContain("language: 'english'");
    expect(commands).toContain('/^en(?:-|$)/.test(replyLanguage)');
    expect(commands).toContain('window.speechSynthesis.getVoices');
  });

  it('checks and downloads the launch-pad profile for the selected interface language', () => {
    const launch = readFileSync('view_launch_pad_source.jsx', 'utf8');
    expect(launch).toContain("mc.resolveWhisperProfile(selectedVoiceLanguageTag())");
    expect(launch).toContain("mc.hasWhisper(profile || selectedVoiceLanguageTag())");
    expect(launch).toContain("voice.preloadWhisper('tiny', { lang: selectedVoiceLanguageTag() })");
    expect(launch).toContain("}, [currentUiLanguage]);");
  });

  it('maps friendly UI names before hands-free browser or Whisper recognition starts', () => {
    for (const path of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(path, 'utf8');
      expect(app).toContain("return getSpeechLangCode(currentUiLanguage) || 'en-US'");
      expect(app).not.toContain("const s = String(currentUiLanguage || '').replace('_', '-')");
    }
  });
});
