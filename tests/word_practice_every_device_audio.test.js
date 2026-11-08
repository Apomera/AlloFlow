// Word Practice HTML downloads carry WAV sounds, so the offline file also
// plays on iPads and older Safari (the sound bank and browser recordings are
// WebM/Opus). Conversion keeps WAV/MP3 as they are, stops before the set's
// audio limit, and never drops a sound it cannot convert.
// Real decoding of the WebM bank is covered for the take-home file by
// C:\tmp\mini_app_all\tests\e2e_portable_audio.cjs; this file uses a stand-in
// Web Audio so the conversion path runs in Node.
import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const coreSource = fs.readFileSync('word_practice_core.js', 'utf8');
const mediaSource = fs.readFileSync('word_practice_media.js', 'utf8');
const uiSource = fs.readFileSync('word_practice_ui.js', 'utf8');
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const webm = (tag) => 'data:audio/webm;base64,' + Buffer.concat([Buffer.from([26, 69, 223, 163]), Buffer.from(tag.padEnd(24, '.'))]).toString('base64');
let root, media, core, decoded;

function webAudio({ failOn = '', seconds = 0.2 } = {}) {
  decoded = [];
  root.AudioContext = class {
    async decodeAudioData(buffer) {
      const tag = Buffer.from(buffer).subarray(4).toString('latin1').replace(/\.+$/, '');
      decoded.push(tag);
      if (failOn && tag === failOn) throw new Error('cannot decode');
      return { duration: seconds, sampleRate: 48000, numberOfChannels: 1, length: Math.ceil(seconds * 48000), getChannelData: () => new Float32Array(Math.ceil(seconds * 48000)) };
    }
    async close() {}
  };
  root.OfflineAudioContext = class {
    constructor(channels, length, rate) { this.channels = channels; this.length = length; this.rate = rate; this.destination = {}; }
    createBufferSource() { return { connect() {}, start() {} }; }
    async startRendering() {
      const data = new Float32Array(this.length).map((_, i) => Math.sin(i / 10) * 0.5);
      return { sampleRate: this.rate, numberOfChannels: this.channels, length: this.length, duration: this.length / this.rate, getChannelData: () => data };
    }
  };
}
const header = (uri) => {
  const b = Buffer.from(uri.split(',')[1], 'base64');
  return { riff: b.toString('latin1', 0, 4), channels: b.readUInt16LE(22), rate: b.readUInt32LE(24), bits: b.readUInt16LE(34) };
};

beforeEach(() => {
  root = {};
  const sandbox = { window: root, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView, Float32Array };
  vm.runInNewContext(coreSource + '\n' + mediaSource, sandbox);
  core = root.AlloWordPracticeCore; media = root.AlloWordPracticeMedia;
});

describe('Word Practice sounds that play on every device', () => {
  it('turns WebM word and sound clips into 16-bit mono 22,050 Hz WAV, once per clip, and keeps WAV', async () => {
    webAudio();
    const shared = webm('sh');
    const input = { title: 'Practice', words: [
      { word: 'ship', wordAudio: webm('ship'), phonemes: [{ label: 'sh', audio: shared }, { label: 'i', audio: wav }, { label: 'p', audio: webm('p') }] },
      { word: 'shop', wordAudio: wav, phonemes: [{ label: 'sh', audio: shared }] },
    ] };
    const result = await media.everyDeviceAudio(input);
    expect(result).toMatchObject({ converted: 3, failed: 0, kept: 0 });
    expect(decoded.sort()).toEqual(['p', 'sh', 'ship']);
    const [ship, shop] = result.pack.items;
    for (const clip of [ship.wordAudio, ship.phonemes[0].audio, ship.phonemes[2].audio, shop.phonemes[0].audio]) {
      expect(clip).toMatch(/^data:audio\/wav;base64,/);
      expect(header(clip)).toEqual({ riff: 'RIFF', channels: 1, rate: 22050, bits: 16 });
    }
    expect(ship.phonemes[1].audio).toBe(wav);
    expect(shop.wordAudio).toBe(wav);
    expect(ship.phonemes[0].audio).toBe(shop.phonemes[0].audio);
    // The converted set is still a valid pack.
    expect(() => core.normalizeInput(result.pack)).not.toThrow();
    expect(core.normalizeInput(result.pack).items[0].wordAudio).toBe(ship.wordAudio);
  });

  it('keeps a clip it cannot decode, and counts it', async () => {
    webAudio({ failOn: 'ship' });
    const input = { title: 'Practice', words: [{ word: 'ship', wordAudio: webm('ship'), phonemes: [{ label: 'p', audio: webm('p') }] }] };
    const result = await media.everyDeviceAudio(input);
    expect(result).toMatchObject({ converted: 1, failed: 1 });
    expect(result.pack.items[0].wordAudio).toBe(core.normalizeInput(input).items[0].wordAudio);
    expect(result.pack.items[0].phonemes[0].audio).toMatch(/^data:audio\/wav;/);
  });

  it('stops converting before the set would pass its audio limit', async () => {
    // Long clips: each WAV would be far larger than its WebM.
    webAudio({ seconds: 50 });
    const words = Array.from({ length: 12 }, (_, i) => ({ word: 'word' + i, wordAudio: webm('w' + i), phonemes: [] }));
    const result = await media.everyDeviceAudio({ title: 'Big', words });
    expect(result.kept).toBeGreaterThan(0);
    expect(result.converted + result.kept).toBe(12);
    const total = result.pack.items.reduce((n, item) => n + item.wordAudio.length, 0);
    expect(total).toBeLessThanOrEqual(core.LIMITS.totalAudioChars);
    expect(() => core.normalizeInput(result.pack)).not.toThrow();
  }, 90000);

  it('without Web Audio, every clip is kept and counted', async () => {
    const input = { title: 'Practice', words: [{ word: 'ship', wordAudio: webm('ship'), phonemes: [] }] };
    const result = await media.everyDeviceAudio(input);
    expect(result).toMatchObject({ converted: 0, failed: 1 });
    expect(result.pack.items[0].wordAudio).toMatch(/^data:audio\/webm;/);
  });

  it('knows when there is nothing to convert, so such a set still downloads at once', () => {
    expect(media.needsEveryDeviceAudio({ title: 'P', words: [{ word: 'ship', wordAudio: wav, phonemes: [{ label: 'sh', audio: wav }] }] })).toBe(false);
    expect(media.needsEveryDeviceAudio({ title: 'P', words: [{ word: 'ship', phonemes: [] }] })).toBe(false);
    expect(media.needsEveryDeviceAudio({ title: 'P', words: [{ word: 'ship', wordAudio: wav, phonemes: [{ label: 'sh', audio: webm('sh') }] }] })).toBe(true);
  });

  it('the Download HTML button converts before building, and says how many could not be converted', () => {
    const handler = uiSource.slice(uiSource.indexOf("tx('word_practice.download_html', 'Download HTML')"), uiSource.indexOf("tx('word_practice.download_pptx'"));
    expect(handler.indexOf('media.everyDeviceAudio(current)')).toBeGreaterThan(-1);
    expect(handler.indexOf('media.everyDeviceAudio(current)')).toBeLessThan(handler.indexOf('buildHtml(fileInput'));
    expect(handler).toContain("word_practice.audio_not_converted");
  });
});
