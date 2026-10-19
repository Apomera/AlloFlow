import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const setup = read('word_sounds_setup_source.jsx'), runtime = read('word_sounds_module.js');
const core = new Function(read('word_sounds_core.js') + '\nreturn createWordSoundsCore();')();
const slice = (source, begin, end) => {
  const start = source.indexOf(begin), finish = source.indexOf(end, start);
  if (start < 0 || finish < 0) throw new Error('Missing production boundary: ' + begin);
  return source.slice(start, finish);
};
const setupAudio = slice(setup, '        const syllableCountAudioFor = React.useCallback(', '        const syllableCountContextFor =');
const setupPreview = slice(setup, '        const previewSyllableCountWord = async', '        const saveSyllableCount =');
const runtimeAudio = slice(runtime, '    const syllableCountWordKey =', '    // SyllableCountingView');
const clip = (byte = 1, profile) => {
  const bytes = Buffer.alloc(68); bytes.write('RIFF'); bytes.write('WAVE', 8); bytes[60] = byte;
  return { mime: 'audio/wav', base64: bytes.toString('base64'), ...(profile ? { provenance: core.packAudioProvenance(profile, 'synthesized') } : {}) };
};
const uri = asset => 'data:' + asset.mime + ';base64,' + asset.base64;
const us = { provider: 'kokoro', resolvedVoice: 'af_heart', language: 'en' };
const gb = { provider: 'kokoro', resolvedVoice: 'bf_emma', language: 'en-GB' };

function setupHarness(overrides = {}) {
  const generated = clip(8);
  const env = {
    React: { useCallback: fn => fn }, WS_CORE: core,
    reviewedCountAudio: {}, reviewedSyllableCounts: {}, reviewedSyllableTasks: {}, detachedSyllableRecordings: {},
    preloadedWords: [], wordSoundsLanguage: 'en-GB', selectedVoice: 'bf_emma',
    countBankAssetCache: { current: new Map() }, preparedSyllableFor: () => undefined,
    window: { _CACHE_WORD_AUDIO_BANK: { apple: uri(clip(1)) } },
    generationVoiceRef: { current: 'bf_emma' }, ttsSpeed: 1.1,
    callTTS: vi.fn(async (_word, _voice, _speed, options) => { options.onResolvedProfile(gb); return uri(generated); }),
    packTtsSource: vi.fn(async source => {
      const match = source?.match(/^data:(audio\/[^;,]+);base64,(.+)$/);
      return match ? { mime: match[1], base64: match[2] } : null;
    }), ...overrides,
  };
  const build = () => new Function(...Object.keys(env), `
    const syllableCountReviewKey = word => String(wordSoundsLanguage || 'en').toLowerCase() + ':' + WS_CORE.packAudioKey(word);
    const savedCountAudioAssets = WS_CORE.packAudioAssets(preloadedWords);
    ${setupAudio}
    ${setupPreview}
    return { syllableCountAudioFor, previewSyllableCountWord };
  `)(...Object.values(env));
  return { env, build, ...build() };
}

describe('Studio count preview uses selected or identified audio', () => {
  it('keeps the newly approved clip when generation consolidates legacy asset buckets', () => {
    const oldClip = clip(1, gb), latestClip = clip(2, gb), approvedClip = clip(3, gb);
    const processed = [{ word: 'apple', _ttsAssets: { apple: approvedClip } }, { word: 'football', _ttsAssets: { apple: latestClip, football: oldClip } }];
    const pack = slice(setup, '             const packedTtsAssets =', '             // ── Bank-first packing');
    const packed = new Function('WS_CORE', 'processed', 'reviewedCountAudio', 'syllableCountReviewKey', 'preloadedWords', pack + ';return packedTtsAssets;')(
      core, processed, { 'en-gb:apple': approvedClip }, word => 'en-gb:' + core.packAudioKey(word), processed);
    expect(packed.apple).toBe(approvedClip);
    expect(packed.football).toBe(oldClip);
    expect(processed.every(item => !item._ttsAssets)).toBe(true);
  });


  it('previews the same final saved clip as runtime when legacy buckets duplicate a word', () => {
    const oldClip = clip(1, gb), latestClip = clip(2, gb);
    const words = [{ word: 'apple', _ttsAssets: { apple: oldClip } }, { word: 'football', _ttsAssets: { ' APPLE ': latestClip } }];
    const h = setupHarness({ preloadedWords: words });
    expect(h.syllableCountAudioFor('apple')).toBe(latestClip);
    const player = new Function('WS_CORE', 'window', runtimeAudio + ';return syllableCountAudioFor;')(core, h.env.window);
    const delivery = player('apple', 'en-GB', words[0], words, {}, 'bf_emma');
    expect(delivery.asset).toBe(latestClip);
    expect(delivery.context.signature).toBe(core.createSyllableCountAudioContext({ asset: h.syllableCountAudioFor('apple'), language: 'en-GB', voice: 'bf_emma' }).signature);
  });


  it('does not auto-select the cached US bank for British English and requests the selected voice when listened to', async () => {
    const h = setupHarness();
    expect(h.syllableCountAudioFor('apple')).toBeNull();
    const preview = await h.previewSyllableCountWord('apple');
    expect(h.env.callTTS).toHaveBeenCalledWith('apple', 'bf_emma', 1.1, expect.objectContaining({ force: true, language: 'en-GB', allowProviderFallback: false }));
    expect(preview.audioProfile).toMatchObject({ compatible: true, actualVoice: 'bf_emma', actualLanguage: 'en-GB' });
    expect(preview.asset.base64).not.toBe(clip(1).base64);
    expect(preview.audioContext.fingerprint).not.toBeNull();
  });

  it('rechecks bank compatibility when the selected voice or locale changes', () => {
    const h = setupHarness({ wordSoundsLanguage: 'en-US', selectedVoice: 'af_heart' });
    expect(h.syllableCountAudioFor('apple')).not.toBeNull();
    h.env.wordSoundsLanguage = 'en-GB';
    expect(h.build().syllableCountAudioFor('apple')).toBeNull();
    h.env.wordSoundsLanguage = 'en-US'; h.env.selectedVoice = 'bf_emma';
    expect(h.build().syllableCountAudioFor('apple')).toBeNull();
  });

  it.each([
    us,
    { provider: 'kokoro', resolvedVoice: 'bf_emma', language: 'en-US' },
    { resolvedVoice: 'af_heart' },
  ])('rejects known mismatched generation instead of making it confirmable', async profile => {
    const h = setupHarness({ callTTS: vi.fn(async (_word, _voice, _speed, options) => { options.onResolvedProfile(profile); return uri(clip(2)); }) });
    expect(await h.previewSyllableCountWord('apple')).toBeNull();
  });

  it('keeps explicit requested generation with missing metadata visibly unknown', async () => {
    const h = setupHarness({ callTTS: vi.fn(async () => uri(clip(2))) });
    expect((await h.previewSyllableCountWord('apple')).audioProfile).toMatchObject({ unknown: true, compatible: false, mismatch: false });
  });

  it.each([us, undefined])('keeps an existing lesson clip audible with its actual profile', async profile => {
    const saved = clip(2, profile), h = setupHarness({ preloadedWords: [{ word: 'apple', _ttsAssets: { apple: saved } }] });
    expect(h.syllableCountAudioFor('apple')).toBe(saved);
    const preview = await h.previewSyllableCountWord('apple');
    expect(preview.asset).toBe(saved);
    expect(preview.audioProfile.compatible).toBe(false);
    expect(preview.audioProfile[profile ? 'languageMismatch' : 'unknown']).toBe(true);
    expect(h.env.callTTS).not.toHaveBeenCalled();
  });

  it('does not automatically attach cached audio to a teacher-spoken approval', () => {
    const prepared = core.createReviewedSyllableCount({ targetWord: 'apple', language: 'en-US', count: 2, revision: 1, reviewed: true,
      audioContext: core.createSyllableCountAudioContext({ language: 'en-US', voice: 'af_heart' }) });
    const h = setupHarness({ wordSoundsLanguage: 'en-US', selectedVoice: 'af_heart', reviewedSyllableCounts: { 'en-us:apple': prepared } });
    expect(h.syllableCountAudioFor('apple')).toBeNull();
    expect(h.syllableCountAudioFor('apple', { explicitListen: true })).not.toBeNull();
  });

  it('ignores generated audio when review is cancelled during preparation', async () => {
    const controller = new AbortController();
    const h = setupHarness({ callTTS: vi.fn(async (_word, _voice, _speed, options) => {
      options.onResolvedProfile(gb); controller.abort(); return uri(clip(2));
    }) });
    expect(await h.previewSyllableCountWord('apple', { signal: controller.signal })).toBeNull();
    expect(h.env.packTtsSource).not.toHaveBeenCalled();
  });
});

describe('runtime count audio selection', () => {
  const load = bank => new Function('WS_CORE', 'window', runtimeAudio + '\nreturn syllableCountAudioFor;')(core, { _CACHE_WORD_AUDIO_BANK: bank });

  it('rejects automatic bank audio that differs from the selected pronunciation', () => {
    const choose = load({ apple: uri(clip(1)) });
    expect(choose('apple', 'en-GB', { word: 'apple' }, [], {}, 'bf_emma')).toMatchObject({ source: null, context: { fingerprint: null } });
    expect(choose('apple', 'en-US', { word: 'apple' }, [], {}, 'af_heart').source).toBe(uri(clip(1)));
    expect(choose('apple', 'en-US', { word: 'apple' }, [], {}, 'bf_emma').source).toBeNull();
  });

  it.each([us, undefined])('exposes saved mismatched or unknown clips with profile diagnostics', profile => {
    const saved = clip(2, profile), item = { word: 'apple', _ttsAssets: { apple: saved } };
    const audio = load({ apple: uri(clip(1)) })('apple', 'en-GB', item, [item], {}, 'bf_emma');
    expect(audio.asset).toBe(saved);
    expect(audio.source).toBe(uri(saved));
    expect(audio.profile.compatible).toBe(false);
    expect(audio.profile[profile ? 'languageMismatch' : 'unknown']).toBe(true);
  });

  it('preserves a reviewed exact clip when the synthetic voice changes', () => {
    const saved = clip(2, us), prepared = core.createReviewedSyllableCount({ targetWord: 'apple', language: 'en-US', count: 2, revision: 1, reviewed: true,
      audioContext: core.createSyllableCountAudioContext({ asset: saved, language: 'en-US' }) });
    const item = { word: 'apple', _ttsAssets: { apple: saved }, activityItems: { syllable_counting: prepared } };
    const audio = load({ apple: uri(clip(1)) })('apple', 'en-US', item, [item], {}, 'bf_emma');
    expect(audio.asset).toBe(saved);
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared, audioContext: audio.context }).supported).toBe(true);
  });

  it.each([true, false])('blocks generic audio fallback after a count profile was rejected (play=%s)', async playImmediately => {
    const guard = slice(runtime, "          const countingTarget = wordSoundsActivity === 'syllable_counting'", '          if (!text) return Promise.resolve();');
    const env = {
      WS_CORE: core, wordSoundsActivity: 'syllable_counting', wordSoundsLanguage: 'en-GB',
      text: 'air', currentWordSoundsWord: 'air', wordSoundsPhonemes: { word: 'air' }, playImmediately,
      syllableCountWordKey: value => String(value || '').trim().toLowerCase(),
      syllableCountAudioRef: { current: { source: null, context: core.createSyllableCountAudioContext({ language: 'en-GB', voice: 'bf_emma' }) } },
      setIsPlayingAudio: vi.fn(), setAudioNotice: vi.fn(), playClip: vi.fn(), Audio: vi.fn(),
      window: { __ALLO_PHONEME_AUDIO_BANK: { air: 'blob:wrong-pronunciation' } },
    };
    const run = new Function(...Object.keys(env), 'return (async () => { ' + guard + '\nreturn { genericFallback: true }; })();');
    expect(await run(...Object.values(env))).toEqual({ ok: false, status: 'unavailable' });
    expect(env.playClip).not.toHaveBeenCalled();
    expect(env.Audio).not.toHaveBeenCalled();
    expect(env.setAudioNotice).toHaveBeenCalledTimes(playImmediately ? 1 : 0);
  });
});
