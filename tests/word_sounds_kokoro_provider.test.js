// Word Sounds preparation must keep an explicitly selected Kokoro voice on
// new/retried clips. Exercise the actual built TTS module with local synthesis
// and all network responses controlled; no network requests leave the test.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';

const MODULE_PATH = resolve(process.cwd(), 'tts_module.js');
const MODULE_SOURCE = readFileSync(MODULE_PATH, 'utf8');
const SETUP_SOURCE = readFileSync(resolve(process.cwd(), 'word_sounds_setup_source.jsx'), 'utf8');

function makeTts({ canvas = false, speak = async () => null } = {}) {
  const cloudRequests = [];
  const localRequests = [];
  const profiles = [];
  const localWindow = {
    AlloModules: {}, atob, btoa,
    _kokoroTTS: {
      ready: true,
      resolveVoice: (voice) => voice,
      speak: async (...args) => {
        localRequests.push(args);
        return speak(...args);
      },
    },
  };
  runInNewContext(MODULE_SOURCE, {
    window: localWindow,
    console: { log() {}, warn() {}, error() {}, debug() {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Blob, AbortController, atob, btoa, TextEncoder, TextDecoder,
    URL: { createObjectURL: () => 'blob:gemini-test-audio', revokeObjectURL() {} },
    fetch: async (url) => {
      cloudRequests.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=' } }] } }] }),
      };
    },
  }, { filename: MODULE_PATH });
  const api = localWindow.AlloModules.createTTS({
    state: { queue: [], botQueue: [], urlCache: new Map(), rateLimitedUntil: 0 },
    apiKey: 'test-key',
    GEMINI_MODELS: { tts: 'test-tts-model' },
    AVAILABLE_VOICES: ['Kore'],
    _isCanvasEnv: canvas,
    languageToTTSCode: () => 'en',
    isGlobalMuted: () => false,
    warnLog() {}, debugLog() {},
    // Deliberately different from the activity: explicit Word Sounds language
    // must outrank unrelated host state.
    getLeveledTextLanguage: () => 'Spanish',
    getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => ({ backend: 'gemini', ttsProvider: 'auto' }),
    getAi: () => null,
    getSelectedVoice: () => 'af_heart',
    setShowKokoroOfferModal() {},
  });
  const strictOptions = {
    language: 'English',
    maxRetries: 0,
    allowProviderFallback: false,
    onResolvedProfile: (profile) => profiles.push(profile),
  };
  return { api, strictOptions, cloudRequests, localRequests, profiles };
}

describe.each([
  ['desktop', false],
  ['Canvas', true],
])('Word Sounds selected Kokoro on %s', (_name, canvas) => {
  it('uses the selected local voice when synthesis succeeds', async () => {
    const h = makeTts({ canvas, speak: async () => 'blob:kokoro-test-audio' });
    const result = await h.api.callTTS('corn', 'af_heart', 1, h.strictOptions);
    expect(result).toBe('blob:kokoro-test-audio');
    expect(h.localRequests).toHaveLength(1);
    expect(h.localRequests[0][1]).toBe('af_heart');
    expect(h.cloudRequests).toHaveLength(0);
    expect(h.profiles).toHaveLength(1);
    expect(h.profiles[0].provider).toBe('local');
  });

  it('leaves a missing clip retryable when local synthesis returns no audio', async () => {
    const h = makeTts({ canvas });
    expect(await h.api.callTTS('corn', 'af_heart', 1, h.strictOptions)).toBeNull();
    expect(h.localRequests).toHaveLength(1);
    expect(h.cloudRequests).toHaveLength(0);
    expect(h.profiles).toHaveLength(0);
  });

  it('does not switch to Gemini after a local synthesis error', async () => {
    const h = makeTts({ canvas, speak: async () => { throw new Error('local synthesis failed'); } });
    expect(await h.api.callTTS('corn', 'af_heart', 1, h.strictOptions)).toBeNull();
    expect(h.localRequests).toHaveLength(1);
    expect(h.cloudRequests).toHaveLength(0);
  });
});

describe('strict provider requests remain isolated from general fallback', () => {
  it('preserves ordinary desktop caller fallback to Gemini', async () => {
    const h = makeTts();
    const result = await h.api.callTTS('ordinary phrase', 'af_heart', 1, { language: 'English', maxRetries: 0 });
    expect(result).toBe('blob:gemini-test-audio');
    expect(h.cloudRequests).toHaveLength(1);
  });

  it('cannot reuse a previous Gemini fallback cached for the same requested voice and text', async () => {
    const h = makeTts();
    expect(await h.api.callTTS('same phrase', 'af_heart', 1, { language: 'English', maxRetries: 0 }))
      .toBe('blob:gemini-test-audio');
    expect(h.cloudRequests).toHaveLength(1);
    expect(await h.api.callTTS('same phrase', 'af_heart', 1, h.strictOptions)).toBeNull();
    expect(h.cloudRequests).toHaveLength(1);
    expect(h.localRequests).toHaveLength(2);
    expect(h.profiles).toHaveLength(0);
  });

  it('preserves cancellation instead of swallowing AbortError as a local miss', async () => {
    const h = makeTts({ speak: async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    } });
    await expect(h.api.callTTS('corn', 'af_heart', 1, h.strictOptions)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.cloudRequests).toHaveLength(0);
  });

  it('does not silently change providers for a language unsupported by the chosen local voice', async () => {
    const h = makeTts({ speak: async () => 'blob:kokoro-test-audio' });
    expect(await h.api.callTTS('hola', 'af_heart', 1, { ...h.strictOptions, language: 'Spanish' })).toBeNull();
    expect(h.localRequests).toHaveLength(0);
    expect(h.cloudRequests).toHaveLength(0);
  });
});

describe('Word Sounds setup passes its current voice and language', () => {
  it('applies a voice selected during preparation to subsequent missing clips and retries', async () => {
    // Execute the actual call site. The surrounding preparation loop also
    // packages images/boards; those are not involved in provider selection.
    const start = SETUP_SOURCE.indexOf('const voiceForTts = generationVoiceRef.current || undefined;');
    const end = SETUP_SOURCE.indexOf('const asset = await packTtsSource(src);', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const issueRequest = new AsyncFunction(
      'generationVoiceRef', 'callTTS', 'text', 'speedForTts', 'wordSoundsLanguage',
      SETUP_SOURCE.slice(start, end),
    );
    const requests = [];
    const voice = { current: 'Kore' };
    const record = async (...args) => { requests.push(args); return 'blob:prepared-test-audio'; };
    await issueRequest(voice, record, 'first word', 1, 'English');
    voice.current = 'af_heart';
    await issueRequest(voice, record, 'retry word', 1, 'English');
    expect(requests[0][1]).toBe('Kore');
    expect(requests[0][3].allowProviderFallback).toBe(true);
    expect(requests[1][1]).toBe('af_heart');
    expect(requests[1][3].allowProviderFallback).toBe(false);
    expect(requests[1][3].language).toBe('English');
  });
});
