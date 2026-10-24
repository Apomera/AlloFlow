import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

// One synthetic PCM WAV is reused verbatim across every language profile.
const bytes = Buffer.alloc(204);
bytes.write('RIFF', 0); bytes.writeUInt32LE(196, 4); bytes.write('WAVEfmt ', 8);
bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28);
bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
bytes.write('data', 36); bytes.writeUInt32LE(160, 40);
const clip = { mime: 'audio/wav', base64: bytes.toString('base64') };
const uri = 'data:' + clip.mime + ';base64,' + clip.base64;
const cases = [
  ['missing provenance', undefined, false],
  ['missing language', { source: 'recorded_bank' }, false],
  ['empty language', { language: ' ' }, false],
  ['matching locale', { language: 'es-ES' }, true],
  ['matching friendly name', { language: 'Spanish' }, true],
  ['English mismatch', { language: 'en-US' }, false],
  ['regional mismatch', { language: 'es-419' }, false],
];
const assetFor = provenance => ({ ...clip, ...(provenance ? { provenance } : {}) });
const lesson = asset => ({
  type: 'word-sounds', id: 'synthetic-spanish', isProbeMode: true,
  lessonPlanSequence: ['blending'], sessionConfig: { wordSoundsLanguage: 'es' },
  data: [{ word: 'si', phonemes: [{ ipa: 'i', grapheme: 'i' }],
    activityItems: { blending: { answer: 'si', options: ['si'] } },
    _ttsAssets: { si: clip, i: asset } }],
});
function load(file, existing) {
  const host = { React: { createElement() {}, Fragment: null }, AlloModules: existing ? { WordSoundsReadiness: existing } : {} };
  new Function('window', 'globalThis', 'module', readFileSync(file, 'utf8'))(host, { window: host }, { exports: {} });
  return host.AlloModules.WordSoundsReadiness;
}
const decodedAudio = () => {
  const audio = {
    readyState: 2, duration: 0.01, canPlayType: () => 'probably', pause() {},
    removeAttribute() { audio.src = ''; },
    load() { if (audio.src) queueMicrotask(() => audio.oncanplay?.()); },
    play() { throw new Error('readiness must not play audio'); },
  };
  return audio;
};

for (const file of ['word_sounds_readiness_contract.js', 'view_word_sounds_preview_module.js']) {
  describe(file + ' native phoneme provenance', () => {
    for (const route of ['preview', 'student-pack', 'mailbox']) {
      it.each(cases)(route + ': %s', async (_label, provenance, matching) => {
        const api = load(file);
        const asset = assetFor(provenance), resource = lesson(asset);
        const before = JSON.stringify(resource);
        const initial = api.inspect(resource, { route }).clips.find(value => value.id === 'phoneme:i');
        expect(initial).toMatchObject({ source: 'resource', status: matching ? 'embedded-portable' : 'missing', checked: false });
        const result = await api.check(resource, { route, audioFactory: decodedAudio,
          banks: { phoneme: { i: uri } }, deviceCache: { i: uri } });
        expect(result.clips.find(value => value.id === 'phoneme:i')).toMatchObject({
          source: 'resource', status: matching ? 'embedded-portable' : 'missing', checked: matching, locallyChecked: matching,
        });
        expect(result.complete).toBe(false); // Other required instruction clips remain unavailable.
        expect(JSON.stringify(resource)).toBe(before);
      });
      it(route + ': an unlabelled legacy data URI cannot establish the native language', async () => {
        const api = load(file);
        const result = await api.check(lesson(uri), { route, audioFactory: decodedAudio });
        expect(result.clips.find(value => value.id === 'phoneme:i')).toMatchObject({ status: 'missing', checked: false });
      });
    }
    it('replaces a cached v8 validator rather than retaining its old acceptance or receipts', () => {
      const stale = { VERSION: 8, portable: value => value, inspect: () => ({ complete: true }) };
      const api = load(file, stale);
      expect(api).not.toBe(stale);
      expect(api.VERSION).toBeGreaterThan(8);
      expect(api.inspect(lesson(assetFor())).clips.find(value => value.id === 'phoneme:i').status).toBe('missing');
    });
    it('keeps ordinary English phoneme-bank playback on its existing route', async () => {
      const api = load(file), resource = lesson(assetFor());
      resource.sessionConfig.wordSoundsLanguage = 'en'; resource.data[0].phonemes = ['i'];
      const result = await api.check(resource, { audioFactory: decodedAudio, banks: { phoneme: { i: uri } } });
      expect(result.clips.find(value => value.id === 'phoneme:i')).toMatchObject({ source: 'app-audio-bank', status: 'device-only', locallyChecked: true });
    });
  });
}

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const runtime = readFileSync('word_sounds_module.js', 'utf8');
const nativeBranch = sliceBetween(runtime, '          if (!englishPhonemeAudio && isPhoneme) {', '          if (audioInstances.current.has(text))', { label: 'native phoneme selection' });
async function chooseNative(asset) {
  const env = {
    WS_CORE: core, englishPhonemeAudio: false, isPhoneme: true, text: 'i',
    preloadedWords: lesson(asset).data, voiceForTts: 'synthetic-test-voice', wordSoundsLanguage: 'es',
    portableTtsSrcFor: vi.fn(() => uri), loadAndPlay: vi.fn(async () => ({ ok: true })),
    nativePhonemeUnavailable: vi.fn(() => ({ ok: false, status: 'unavailable' })),
  };
  const run = new Function(...Object.keys(env), 'return (async () => {\n' + nativeBranch + '\nthrow new Error("native request escaped its gate"); })();');
  return { result: await run(...Object.values(env)), env };
}
describe('production native phoneme playback selection', () => {
  it.each(cases)('%s', async (_label, provenance, matching) => {
    const { result, env } = await chooseNative(assetFor(provenance));
    expect(result.ok).toBe(matching);
    expect(env.loadAndPlay).toHaveBeenCalledTimes(matching ? 1 : 0);
    expect(env.nativePhonemeUnavailable).toHaveBeenCalledTimes(matching ? 0 : 1);
    if (matching) expect(env.loadAndPlay).toHaveBeenCalledWith(uri, { prepared: true });
  });
  it('does not use a legacy data URI without language provenance', async () => {
    const { result, env } = await chooseNative(uri);
    expect(result).toMatchObject({ ok: false, status: 'unavailable' });
    expect(env.loadAndPlay).not.toHaveBeenCalled();
  });
});
