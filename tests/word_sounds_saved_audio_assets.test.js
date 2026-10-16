import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const clip = (byte = 0, voice = 'af_heart') => {
  const bytes = Buffer.alloc(68); bytes.write('RIFF'); bytes.write('WAVE', 8); bytes[60] = byte;
  return { mime: 'audio/wav', base64: bytes.toString('base64'),
    provenance: core.packAudioProvenance({ provider: 'kokoro', resolvedVoice: voice, language: 'en-US' }, 'synthesized') };
};

describe('saved lesson audio selection', () => {
  it('uses the last saved replacement across all word buckets', () => {
    const earlier = clip(1), replacement = clip(2, 'am_adam');
    const words = [
      { word: 'apple', _ttsAssets: { apple: earlier } },
      { word: 'pear', _ttsAssets: { apple: replacement, pear: clip(3) } },
    ];
    expect(core.packAudioAssets(words).apple).toBe(replacement);
    expect(core.packAudioInventory(words, 'am_adam', 'en-US').find(row => row.key === 'apple'))
      .toMatchObject({ asset: replacement, present: true, actualVoice: 'am_adam', voiceMismatch: false });
  });

  it('normalizes word and phrase keys before choosing the latest clip', () => {
    const earlier = clip(1), replacement = clip(2);
    const words = [{ word: 'Apple', _ttsAssets: { APPLE: earlier, 'Ice   cream': earlier } },
      { _ttsAssets: { ' apple ': replacement, ' ICE\tCREAM ': replacement } }];
    const assets = core.packAudioAssets(words);
    expect(Object.keys(assets)).toEqual(['apple', 'ice cream']);
    expect(assets.apple).toBe(replacement);
    expect(assets['ice cream']).toBe(replacement);
    expect(core.packAudioInventory(words).find(row => row.key === 'apple').asset).toBe(replacement);
  });

  it('retains earlier clips when later buckets have no replacement', () => {
    const asset = clip(1);
    const words = [{ _ttsAssets: { apple: asset } }, null, {},
      { _ttsAssets: { apple: null } }, { _ttsAssets: { apple: undefined } }, { _ttsAssets: { apple: '' } }];
    expect(core.packAudioAssets(words).apple).toBe(asset);
    expect(core.packAudioInventory(words).find(row => row.key === 'apple').asset).toBe(asset);
  });

  it('uses optional library assets only when saved lesson buckets have no replacement', () => {
    const fallback = clip(1), replacement = clip(2);
    const assets = core.packAudioAssets([{ _ttsAssets: { apple: replacement } }], { APPLE: fallback, pear: fallback });
    expect(assets.apple).toBe(replacement);
    expect(assets.pear).toBe(fallback);
    expect(core.packAudioAssets(undefined, { APPLE: fallback }).apple).toBe(fallback);
  });

  it('preserves exact asset objects and provenance without mutating inputs', () => {
    const asset = clip(1);
    Object.freeze(asset.provenance); Object.freeze(asset);
    const fallback = Object.freeze({ ' APPLE ': clip(2) });
    const bucket = Object.freeze({ ' Apple ': asset });
    const words = Object.freeze([Object.freeze({ _ttsAssets: bucket })]);
    const assets = core.packAudioAssets(words, fallback);
    expect(assets.apple).toBe(asset);
    expect(Object.keys(bucket)).toEqual([' Apple ']);
    expect(Object.keys(fallback)).toEqual([' APPLE ']);
    assets.apple = clip(3);
    expect(core.packAudioAssets(words, fallback).apple).toBe(asset);
  });

  it('leaves explicit saved strings and invalid clips to the audio validator', () => {
    const old = clip(1), savedSource = 'data:audio/wav;base64,' + old.base64;
    expect(core.packAudioAssets([{ _ttsAssets: { apple: savedSource } }]).apple).toBe(savedSource);
    const invalid = { mime: 'audio/wav', base64: 'invalid' };
    const words = [{ _ttsAssets: { apple: old } }, { _ttsAssets: { apple: invalid } }];
    expect(core.packAudioAssets(words).apple).toBe(invalid);
    expect(core.packAudioInventory(words).find(row => row.key === 'apple')).toMatchObject({ asset: invalid, present: false });
  });

  it('ignores inherited and empty keys and uses an isolated result map', () => {
    const asset = clip(1), bucket = Object.create({ apple: asset });
    bucket['  '] = asset;
    bucket.pear = asset;
    const assets = core.packAudioAssets([{ _ttsAssets: bucket }]);
    expect(Object.getPrototypeOf(assets)).toBeNull();
    expect(Object.keys(assets)).toEqual(['pear']);
    expect(core.packAudioAssets(null)).toEqual({});
  });
});
