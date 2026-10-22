import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(name, 'utf8');
const coreSource = read('word_practice_core.js');
const mediaSource = read('word_practice_media.js');
const liveSource = read('word_sounds_core.js');
const wav = marker => {
  const bytes = Buffer.alloc(48);
  bytes.write('RIFF'); bytes.writeUInt32LE(40, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36);
  bytes.writeUInt32LE(4, 40); bytes.writeInt16LE(marker, 44); bytes.writeInt16LE(-marker, 46);
  return 'data:audio/wav;base64,' + bytes.toString('base64');
};
const webmBytes = Buffer.from([26, 69, 223, 163, ...Array(32).fill(3)]);
const webm = 'data:audio/webm;base64,' + webmBytes.toString('base64');
const qualified = webm.replace(';base64,', ';codecs=opus;base64,');
const spokenWord = wav(20);
let root, core, media, live;
beforeEach(() => {
  root = {};
  const sandbox = { window: root, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView };
  vm.runInNewContext(coreSource + '\n' + mediaSource + '\n' + liveSource + '\nwindow.live = createWordSoundsCore();', sandbox);
  core = root.AlloWordPracticeCore; media = root.AlloWordPracticeMedia; live = root.live;
});

describe('portable sound identity', () => {
  it.each([
    [{ grapheme: 'ea', ipa: 'i' }, 'ee'],
    [{ grapheme: 'oo', ipa: 'u' }, 'oo'],
    [{ grapheme: 'y', ipa: 'j' }, 'y'],
    [{ grapheme: 'r', ipa: 'ɹ' }, 'r'],
    [{ grapheme: 'g', ipa: 'ɡ' }, 'g'],
    [{ grapheme: 'o', ipa: 'ɑ' }, 'o'],
    [{ grapheme: 'aw', ipa: 'ɔ' }, 'aw'],
    [{ grapheme: 'ir', ipa: 'ɜr' }, 'er']
  ])('uses the live recording for %j before and after serialization', (phoneme, expected) => {
    // Distinct recordings for each app-bank key expose a plausible but wrong
    // recording, not merely a missing clip or a same-fixture false positive.
    const keys = ['i', 'ee', 'u', 'oo', 'j', 'y', 'r', 'g', 'o', 'aw', 'er'];
    const bank = Object.fromEntries(keys.map((key, index) => [key, wav(index + 100)]));
    const pack = core.normalizeInput({ words: [{ word: 'probe', phonemes: [phoneme] }], phonemeBank: bank });
    expect(live.soundKey(phoneme)).toBe(expected);
    expect(pack.items[0].phonemes[0]).toMatchObject({ soundKey: expected, audio: bank[expected] });
    const roundtrip = core.normalizeInput(JSON.parse(core.serializePack(pack)));
    expect(roundtrip.items[0].phonemes[0]).toEqual(pack.items[0].phonemes[0]);
  });

  it('matches canonical Word Sounds notation and aliases without remapping bare i/u/j as IPA', () => {
    const tokens = ['i', 'u', 'j', 'c', 'ck', 'q', 'qu', 'ph', 'wh', 'tch', 'dge', 'ai', 'ea', 'ir', 'ur', 'au', 'oe', 'oi', 'ā', 'ē', 'ī', 'ō', 'ū', 'ɡ', 'ʃ', 'ʒ', 'θ', 'ð', 'ŋ', 'dʒ', 'ʤ', 'tʃ', 'ʧ', 'æ', 'ɛ', 'ɪ', 'ɒ', 'ɑ', 'ɑː', 'ʌ', 'ə', 'iː', 'uː', 'ʊ', 'eɪ', 'aɪ', 'oʊ', 'əʊ', 'aʊ', 'ɔɪ', 'ɹ', 'ɝ', 'ɚ', 'ɜr', 'ɜː', 'ɜ', 'ɑr', 'ɑːr', 'ɔr', 'ɔːr', 'ɔ', 'ɔː', 'ɐ', '/ˈt͡ʃ/'];
    for (const token of tokens) {
      expect(core.soundKey(token), token).toBe(live.soundKey(token));
      const phoneme = { grapheme: 'print', ipa: token };
      expect(core.soundKey(phoneme), 'IPA ' + token).toBe(live.soundKey(phoneme));
    }
    expect(['i', 'u', 'j'].map(core.soundKey)).toEqual(['i', 'u', 'j']);
    expect(['i', 'u', 'j'].map(ipa => core.soundKey({ ipa }))).toEqual(['ee', 'oo', 'y']);
  });

  it('prepares missing clips using canonical keys rather than ambiguous raw IPA keys', async () => {
    const bank = { i: wav(101), ee: wav(102), u: wav(103), oo: wav(104), j: wav(105), y: wav(106), k: wav(107), sh: wav(108) };
    root.getAudio = vi.fn((category, key) => bank[key]);
    const result = await media.prepareAudio({ words: [{ word: 'probe', wordAudio: spokenWord, phonemes: [{ ipa: 'i' }, { ipa: 'u' }, { ipa: 'j' }, 'ck', 'ʃ'] }] });
    expect(result.items[0].phonemes.map(sound => sound.audio)).toEqual(['ee', 'oo', 'y', 'k', 'sh'].map(key => bank[key]));
    expect(root.getAudio.mock.calls).toEqual(['ee', 'oo', 'y', 'k', 'sh'].map(key => ['phonemes', key]));
  });

  it('does not silently replace a missing explicit IPA recording with a different app sound', async () => {
    root.__ALLO_PHONEME_AUDIO_BANK = { i: wav(101), u: wav(102), j: wav(103) };
    const result = await media.prepareAudio({ words: [{ word: 'probe', wordAudio: spokenWord, phonemes: [{ ipa: 'i' }, { ipa: 'u' }, { ipa: 'j' }] }] });
    expect(result.items[0].phonemes.map(sound => sound.audio)).toEqual(['', '', '']);
    expect(result.audioStatus).toMatchObject({ phonemes: 0, totalPhonemes: 3 });
  });

  it.each(['input', 'context'])('retains equivalent alias-keyed custom recordings from the %s bank before defaults', async location => {
    const custom = { 'ʃ': wav(201), ai: wav(202), ea: wav(203), i: wav(204) };
    root.__ALLO_PHONEME_AUDIO_BANK = { sh: wav(301), ay: wav(302), ee: wav(303), i: wav(304) };
    const input = { words: [{ word: 'probe', wordAudio: spokenWord, phonemes: [{ label: 'sh', soundKey: 'ʃ' }, 'ai', 'ea', 'i'] }] };
    if (location === 'input') input.phonemeBank = custom;
    const result = await media.prepareAudio(input, location === 'context' ? { phonemeBank: custom } : {});
    expect(result.items[0].phonemes.map(sound => sound.audio)).toEqual([custom['ʃ'], custom.ai, custom.ea, custom.i]);
  });

  it.each(['input', 'context'])('prefers direct canonical keys over equivalent aliases in the %s bank', async location => {
    // Put aliases first to ensure insertion order cannot override canonical keys.
    const custom = { 'ʃ': wav(201), ai: wav(202), sh: wav(211), ay: wav(212) };
    const input = { words: [{ word: 'probe', wordAudio: spokenWord, phonemes: ['ʃ', 'ai'] }] };
    if (location === 'input') input.phonemeBank = custom;
    const result = await media.prepareAudio(input, location === 'context' ? { phonemeBank: custom } : {});
    expect(result.items[0].phonemes.map(sound => sound.audio)).toEqual([custom.sh, custom.ay]);
  });

  it.each(['input', 'context'])('does not use ambiguous caller-bank i/u/j keys for explicit IPA in the %s bank', async location => {
    const custom = { i: wav(201), u: wav(202), j: wav(203), ee: wav(211) };
    root.__ALLO_PHONEME_AUDIO_BANK = { ee: wav(301), oo: wav(302), y: wav(303) };
    const input = { words: [{ word: 'probe', wordAudio: spokenWord, phonemes: [{ ipa: 'i' }, { ipa: 'u' }, { ipa: 'j' }, 'i'] }] };
    if (location === 'input') input.phonemeBank = custom;
    const result = await media.prepareAudio(input, location === 'context' ? { phonemeBank: custom } : {});
    expect(result.items[0].phonemes.map(sound => sound.audio)).toEqual([custom.ee, root.__ALLO_PHONEME_AUDIO_BANK.oo, root.__ALLO_PHONEME_AUDIO_BANK.y, custom.i]);
  });

  it('respects an explicit app soundKey over a spelling while keeping IPA provenance authoritative', () => {
    expect(core.normalizeInput([{ word: 'head', phonemes: [{ label: 'ea', grapheme: 'ea', soundKey: 'e' }] }]).items[0].phonemes[0].soundKey).toBe('e');
    expect(core.normalizeInput([{ word: 'eat', phonemes: [{ grapheme: 'ea', ipa: 'i', soundKey: 'i' }] }]).items[0].phonemes[0].soundKey).toBe('ee');
  });

  it('retains canonical resolution inside the standalone factory without any live module', () => {
    const isolated = { atob };
    vm.runInNewContext('globalThis.portable = (' + core.createCore.toString() + ')();', isolated);
    expect(isolated.createWordSoundsCore).toBeUndefined();
    const pack = isolated.portable.normalizeInput([{ word: 'eat', phonemes: [{ grapheme: 'ea', ipa: 'i' }] }]);
    expect(pack.items[0].phonemes[0]).toMatchObject({ label: 'ea', soundKey: 'ee' });
    expect(isolated.portable.normalizeInput(JSON.parse(isolated.portable.serializePack(pack))).items[0].phonemes[0].soundKey).toBe('ee');
  });
});

describe('codec-qualified custom recordings', () => {
  it.each([';codecs=opus', ';codecs="opus"', ';CODECS=OPUS', ';codecs="opus, vorbis"', ';codecs=opus;rate=48000', '; codecs = "opus" '])('normalizes %s while preserving exact container bytes', parameters => {
    const input = webm.replace(';base64,', parameters + ';base64,');
    expect(core.safeAudio(input)).toBe(webm);
    expect(core.safeAudio({ mime: 'audio/webm' + parameters, base64: webmBytes.toString('base64') })).toBe(webm);
    expect(Buffer.from(core.safeAudio(input).split(',')[1], 'base64')).toEqual(webmBytes);
  });

  it.each([
    'data:audio/webm;codecs=opus;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'data:text/html;codecs=opus;base64,' + webmBytes.toString('base64'),
    qualified.replace('codecs=opus', 'codecs="opus\n"'),
    qualified.replace('codecs=opus', 'codecs="<script>"'),
    qualified.replace('codecs=opus', 'base64'),
    qualified.slice(0, -2),
    qualified + '<script>'
  ])('continues to reject malformed or unsafe recordings: %s', input => {
    expect(core.safeAudio(input)).toBe('');
  });

  it('keeps custom word and phoneme clips through prepare and serialization without requesting defaults', async () => {
    root.getAudio = vi.fn(() => wav(500));
    const callTTS = vi.fn(() => spokenWord);
    const result = await media.prepareAudio({ words: [{ word: 'ship', wordAudio: qualified, phonemes: [{ label: 'sh', audio: qualified }, { label: 'i' }] }], phonemeBank: { i: qualified } }, { callTTS });
    expect(result.items[0].wordAudio).toBe(webm);
    expect(result.items[0].phonemes.map(sound => sound.audio)).toEqual([webm, webm]);
    const serialized = JSON.parse(core.serializePack(result));
    expect(serialized.items[0].wordAudio).toBe(webm);
    expect(serialized.items[0].phonemes.every(sound => sound.audio === webm)).toBe(true);
    expect(root.getAudio).not.toHaveBeenCalled();
    expect(callTTS).not.toHaveBeenCalled();
  });

  it('uses an exact codec-qualified caller recording before the app default in any teaching language', async () => {
    root.__ALLO_PHONEME_AUDIO_BANK = { sh: wav(500) };
    for (const language of ['English', 'Spanish']) {
      const result = await media.prepareAudio({ language, words: [{ word: 'probe', wordAudio: spokenWord, phonemes: ['sh'] }] }, { phonemeBank: { sh: qualified } });
      expect(result.items[0].phonemes[0].audio).toBe(webm);
    }
  });

  it('converts the original codec-qualified bytes for PowerPoint rather than substituting a default clip', async () => {
    const decodeAudioData = vi.fn(async () => ({ sampleRate: 8000, length: 8, duration: 0.001, numberOfChannels: 1, getChannelData: () => new Float32Array(8) }));
    const close = vi.fn(async () => {});
    const mediaItems = [];
    class Presentation {
      addSlide() { return { addText() {}, addMedia(value) { mediaItems.push(value); } }; }
    }
    await media.buildPptx({ words: [{ word: 'probe', wordAudio: qualified }] }, { repetitions: 1 }, undefined, {
      PptxGenJS: Presentation,
      AudioContext: class { decodeAudioData = decodeAudioData; close = close; }
    });
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
    expect(Buffer.from(decodeAudioData.mock.calls[0][0])).toEqual(webmBytes);
    expect(mediaItems).toHaveLength(1);
    expect(mediaItems[0].data).toMatch(/^audio\/wav;base64,/);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
