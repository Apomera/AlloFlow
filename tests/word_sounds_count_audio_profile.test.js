import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const clip = (byte = 0, profile) => {
  const bytes = Buffer.alloc(68); bytes.write('RIFF'); bytes.write('WAVE', 8); bytes[60] = byte;
  return { mime: 'audio/wav', base64: bytes.toString('base64'), ...(profile ? { provenance: core.packAudioProvenance(profile, 'synthesized') } : {}) };
};
const us = { provider: 'kokoro', resolvedVoice: 'af_heart', language: 'en' };
const gb = { provider: 'kokoro', resolvedVoice: 'bf_emma', language: 'en-GB' };
const select = input => core.selectSyllableCountAudio({ word: 'apple', language: 'en-US', voice: 'af_heart', ...input });
const approve = (asset, language = 'en-US') => core.createReviewedSyllableCount({
  targetWord: 'apple', language, count: 2, reviewed: true, revision: 1,
  audioContext: core.createSyllableCountAudioContext({ asset, language }),
});

describe('syllable count pronunciation audio selection', () => {
  it.each(['en', 'en-US', 'en_US', 'English'])('uses the documented word-bank profile for %s', language => {
    const asset = clip();
    const result = select({ language, bankAsset: 'data:' + asset.mime + ';base64,' + asset.base64 });
    expect(result).toMatchObject({ source: 'bank', reviewed: false, profile: { compatible: true, actualVoice: 'af_heart', actualLanguage: 'en' } });
    expect(result.asset.base64).toBe(asset.base64);
    expect(result.asset.provenance.source).toBe('recorded_bank');
  });

  it.each([
    ['en-GB', 'af_heart'], ['en-US', 'bf_emma'], ['en-GB', 'bf_emma'], ['es', 'af_heart'], ['English (Southern)', 'af_heart'],
  ])('does not relabel the default bank as %s / %s', (language, voice) => {
    expect(select({ language, voice, bankAsset: clip() }).asset).toBeNull();
  });

  it('accepts explicit matching bank provenance and does not mutate the bank', () => {
    const asset = clip(1, gb), snapshot = JSON.stringify(asset);
    const result = select({ language: 'en-GB', voice: 'bf_emma', bankAsset: asset });
    expect(result).toMatchObject({ source: 'bank', profile: { compatible: true, actualVoice: 'bf_emma', actualLanguage: 'en-GB' } });
    expect(JSON.stringify(asset)).toBe(snapshot);
  });

  it('does not mistake a requested voice field for resolved bank provenance', () => {
    const asset = { ...clip(), provenance: { voice: 'bf_emma' } };
    expect(select({ voice: 'bf_emma', bankAsset: asset }).asset).toBeNull();
    expect(select({ bankAsset: asset }).profile.actualVoice).toBe('af_heart');
  });

  it('prefers a compatible saved clip without replacing its object', () => {
    const asset = clip(1, gb);
    const result = select({ language: 'en-GB', voice: 'bf_emma', savedAsset: asset, bankAsset: clip(2, gb) });
    expect(result).toMatchObject({ source: 'saved', reviewed: false, profile: { compatible: true } });
    expect(result.asset).toBe(asset);
  });

  it.each([
    [undefined, 'en-US', 'af_heart'], [us, 'en-GB', 'af_heart'], [us, 'en-US', 'bf_emma'],
  ])('does not silently reuse unknown or mismatched unreviewed saved audio', (profile, language, voice) => {
    expect(select({ savedAsset: clip(0, profile), language, voice }).asset).toBeNull();
  });

  it('falls back from incompatible saved audio to a compatible bank clip', () => {
    const bank = clip(2, gb);
    expect(select({ language: 'en-GB', voice: 'bf_emma', savedAsset: clip(1, us), bankAsset: bank })).toMatchObject({
      source: 'bank', asset: { base64: bank.base64 }, profile: { compatible: true },
    });
  });

  it('can explicitly expose an existing lesson clip with its real profile for review', () => {
    const asset = clip(1, us);
    const result = select({ language: 'en-GB', voice: 'bf_emma', savedAsset: asset, allowSavedProfileMismatch: true });
    expect(result.asset).toBe(asset);
    expect(result).toMatchObject({ source: 'saved', reviewed: false, profile: { compatible: false, languageMismatch: true, voiceMismatch: true } });
    expect(select({ language: 'en-GB', voice: 'bf_emma', bankAsset: asset, allowSavedProfileMismatch: true }).asset).toBeNull();
  });

  it('explicit saved-clip review retains unknown metadata without inventing provenance', () => {
    const asset = clip(1);
    const result = select({ savedAsset: asset, allowSavedProfileMismatch: true });
    expect(result.asset).toBe(asset);
    expect(result).toMatchObject({ reviewed: false, profile: { compatible: false, unknown: true, actualVoice: '', actualLanguage: '' } });
    expect(result.asset.provenance).toBeUndefined();
  });

  it.each([us, undefined])('retains the exact explicitly approved clip despite a new selected voice', profile => {
    const asset = clip(1, profile), prepared = approve(asset);
    const result = select({ savedAsset: asset, prepared, voice: 'bf_emma', bankAsset: clip(2, gb) });
    expect(result).toMatchObject({ source: 'saved', reviewed: true, profile: { compatible: false } });
    expect(result.asset).toBe(asset);
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared,
      audioContext: core.createSyllableCountAudioContext({ asset: result.asset, language: 'en-US', voice: 'bf_emma' }),
    }).supported).toBe(true);
  });

  it('retains an explicitly approved clip with different known provenance for the same teaching locale', () => {
    const asset = clip(1, us), prepared = approve(asset, 'en-GB');
    expect(select({ language: 'en-GB', voice: 'bf_emma', savedAsset: asset, prepared })).toMatchObject({
      source: 'saved', reviewed: true, profile: { compatible: false, languageMismatch: true },
    });
  });

  it('does not apply a previous pronunciation approval to a new locale', () => {
    const asset = clip(1, us);
    expect(select({ language: 'en-GB', voice: 'bf_emma', savedAsset: asset, prepared: approve(asset) }).asset).toBeNull();
  });

  it('rejects altered, unbound, wrong-word and invalid approvals for mismatched audio', () => {
    const asset = clip(1, us), prepared = approve(asset);
    const unbound = core.createReviewedSyllableCount({ targetWord: 'apple', language: 'en-US', count: 2, reviewed: true, revision: 1 });
    for (const approval of [approve(clip(2)), unbound, { ...prepared, count: 3 }, { ...prepared, targetWord: 'pear' }]) {
      expect(select({ savedAsset: asset, prepared: approval, voice: 'bf_emma' }).asset).toBeNull();
    }
  });

  it('requires whole-word review before recording-derived counts can approve a saved pronunciation', () => {
    const asset = clip(1, us);
    const recordedTask = core.createReviewedSyllableTask({ targetWord: 'apple', language: 'en-US', reviewed: true, revision: 2,
      syllables: ['ap', 'ple'], assets: [clip(3), clip(4)].map(value => ({ ...value, decoded: true, durationSeconds: 0.4, source: 'teacher_recording' })),
    });
    const prepared = core.resolveSyllableCount('apple', { language: 'en-US', recordedTask,
      audioContext: core.createSyllableCountAudioContext({ asset, language: 'en-US' }) });
    expect(prepared).toMatchObject({ source: 'teacher_recording', supported: false, reason: 'count_recording_review_required' });
    expect(select({ savedAsset: asset, prepared, voice: 'bf_emma' }).asset).toBeNull();
    expect(select({ savedAsset: asset, recordedTask, voice: 'bf_emma' }).asset).toBeNull();
    expect(select({ savedAsset: asset, prepared: approve(asset), recordedTask, voice: 'bf_emma' })).toMatchObject({ source: 'saved', reviewed: true });
  });

  it('never treats invalid media bytes as a compatible clip', () => {
    const invalid = { mime: 'audio/wav', base64: 'AAAA', provenance: us };
    expect(select({ savedAsset: invalid, bankAsset: invalid }).asset).toBeNull();
  });

  it('shares inventory profile diagnostics and exposes known generated fallback mismatches', () => {
    const asset = clip(1, us), profile = core.packAudioProfileStatus(asset, 'bf_emma', 'en-GB');
    expect(profile).toMatchObject({ present: true, mismatch: true, voiceMismatch: true, languageMismatch: true, compatible: false });
    const row = core.packAudioInventory([{ word: 'apple', _ttsAssets: { apple: asset } }], 'bf_emma', 'en-GB').find(value => value.key === 'apple');
    expect(row).toMatchObject(profile);
    expect(core.packAudioProfileStatus(clip(), 'bf_emma', 'en-GB')).toMatchObject({ unknown: true, mismatch: false, compatible: false });
    expect(core.packAudioProfileStatus({ ...clip(), provenance: { resolvedVoice: 'af_heart' } }, 'bf_emma', 'en-GB')).toMatchObject({ unknown: true, voiceMismatch: true });
  });
});
