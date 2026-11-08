import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

// Clips a teacher hears in the Word Sounds preview used to live only in the tab, so the student copy,
// Word Practice and the take-home file generated (or dropped) the same audio again. The preview now
// saves them into the lesson's clip map, teachers only, without overriding a recording or the budget.
const MODULE = readFileSync('word_sounds_module.js', 'utf8');
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const start = MODULE.indexOf('    const packHeardWordSoundsClip = async');
const end = MODULE.indexOf('    const WordSoundsReviewPanel = (props) => {', start);
const helpers = new Function('WS_CORE', MODULE.slice(start, end) + '\nreturn { packHeardWordSoundsClip, mergeHeardWordSoundsClips };')(core);

// The pack only accepts bytes that start like real audio (here an ID3-tagged MP3).
const mp3 = (seed, bytes = 24) => Buffer.from('ID3\x03\x00' + seed.repeat(bytes - 5), 'binary').toString('base64');
const clip = (seed = 'A') => ({ mime: 'audio/mpeg', base64: mp3(seed) });
const pack = (words, assets = {}) => {
  const base = core.replacePackAssets(words.map((word) => ({ targetWord: word })), {});
  if (Object.keys(assets).length) base[0] = { ...base[0], _ttsAssets: { ...base[0]._ttsAssets, ...assets } };
  return base;
};

afterEach(() => { delete window.OfflineAudioContext; });

describe('Word Sounds saves clips the teacher heard', () => {
  it('lists the target words as clips the lesson needs', () => {
    expect(pack(['cat', 'dog'])[0]._ttsRequiredKeys).toEqual(expect.arrayContaining(['cat', 'dog']));
  });

  it('adds a heard clip the lesson needs, and the word becomes genuinely ready', () => {
    const before = pack(['cat', 'dog']);
    expect(before[0].ttsReady).toBe(false);
    const after = helpers.mergeHeardWordSoundsClips(before, { cat: clip('B') }, {});
    expect(after[0]._ttsAssets.cat.base64).toBe(clip('B').base64);
    expect(after[0].ttsReady).toBe(true);
    expect(after[1].ttsReady).toBe(false);
  });

  it('never replaces a clip the lesson already holds', () => {
    const before = pack(['cat'], { cat: clip('C') });
    const after = helpers.mergeHeardWordSoundsClips(before, { cat: clip('D') }, {});
    expect(after).toBe(before);
    expect(after[0]._ttsAssets.cat.base64).toBe(clip('C').base64);
  });

  it('leaves a word with a recorded clip to that recording', () => {
    const before = pack(['cat']);
    expect(helpers.mergeHeardWordSoundsClips(before, { cat: clip('E') }, { cat: 'blob:recorded' })).toBe(before);
  });

  it('ignores text the lesson does not ask for', () => {
    const before = pack(['cat']);
    expect(helpers.mergeHeardWordSoundsClips(before, { 'good job everyone': clip('F') }, {})).toBe(before);
  });

  it('rejects an invalid clip', () => {
    const before = pack(['cat']);
    expect(helpers.mergeHeardWordSoundsClips(before, { cat: { mime: 'text/plain', base64: 'AAAA' } }, {})).toBe(before);
  });

  it('stays inside the student delivery budget', () => {
    const big = (n) => ({ mime: 'audio/mpeg', base64: mp3(String.fromCharCode(65 + n), 375 * 1024) });
    const full = {};
    for (let i = 0; i < 11; i++) full['filler ' + i] = big(i);
    const before = pack(['cat'], full);
    expect(helpers.mergeHeardWordSoundsClips(before, { cat: clip('G') }, {})).toBe(before);
  });

  it('packs a heard data clip with the voice it was made with', async () => {
    const asset = await helpers.packHeardWordSoundsClip('data:audio/mpeg;base64,' + clip('H').base64, { provider: 'gemini', voice: 'Kore', language: 'en' });
    expect(asset).toMatchObject({ mime: 'audio/mpeg', base64: clip('H').base64 });
    expect(asset.provenance).toMatchObject({ source: 'synthesized', provider: 'gemini', voice: 'Kore', language: 'en' });
  });

  it('refuses a clip with no voice profile, a non-audio source, or silence', async () => {
    expect(await helpers.packHeardWordSoundsClip('data:audio/mpeg;base64,' + clip('I').base64, null)).toBeNull();
    expect(await helpers.packHeardWordSoundsClip('data:text/plain;base64,AAAA', { voice: 'Kore' })).toBeNull();
    window.OfflineAudioContext = function () {
      return { decodeAudioData: async () => ({ duration: 0.5, numberOfChannels: 1, getChannelData: () => new Float32Array(64) }) };
    };
    expect(await helpers.packHeardWordSoundsClip('data:audio/mpeg;base64,' + clip('J').base64, { voice: 'Kore' })).toBeNull();
    window.OfflineAudioContext = function () {
      return { decodeAudioData: async () => ({ duration: 0.5, numberOfChannels: 1, getChannelData: () => Float32Array.from({ length: 64 }, () => 0.2) }) };
    };
    expect(await helpers.packHeardWordSoundsClip('data:audio/mpeg;base64,' + clip('K').base64, { voice: 'Kore' })).not.toBeNull();
  });

  it('only teachers save into the class lesson, and handleAudio offers clips through a guarded ref', () => {
    expect(MODULE).toContain('const canSaveHeardClips = !!isTeacherMode && !isProbeMode && !isParentMode && typeof setWsPreloadedWords === "function" && !wsStudentDeviceVoiceOnly();');
    expect(MODULE).toContain('heardClipSinkRef.current = canSaveHeardClips ?');
    const audio = MODULE.slice(MODULE.indexOf('      const handleAudio = React.useCallback('), MODULE.indexOf('      const handleManualAudio = React.useCallback('));
    expect(audio.match(/typeof heardClipSinkRef !== "undefined" && heardClipSinkRef\.current/g)).toHaveLength(2);
  });

  it('keeps the public copy identical', () => {
    expect(readFileSync('desktop/web-app/public/word_sounds_module.js', 'utf8')).toBe(MODULE);
  });
});
