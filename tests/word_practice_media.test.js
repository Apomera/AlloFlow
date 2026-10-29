import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const coreSource = fs.readFileSync('word_practice_core.js', 'utf8');
const mediaSource = fs.readFileSync('word_practice_media.js', 'utf8');
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const webm = 'data:audio/webm;base64,' + Buffer.from([26, 69, 223, 163, ...Array(24).fill(0)]).toString('base64');
const flattenText = value => Array.isArray(value) ? value.map(run => { expect(typeof run.text).toBe('string'); return run.text; }).join('') : value;
let root, media, core, closeAudio, decodeAudio;
class Presentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], sounds: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(options) { this.sounds.push(options); }, addNotes(text) { this.notes.push(text); } };
    this.slides.push(slide); return slide;
  }
}
beforeEach(() => {
  closeAudio = vi.fn(async () => {});
  decodeAudio = vi.fn(async () => ({ sampleRate: 8000, length: 80, duration: 0.01, numberOfChannels: 1, getChannelData: () => new Float32Array(80).fill(0.2) }));
  root = { PptxGenJS: Presentation, AudioContext: class { decodeAudioData = decodeAudio; close = closeAudio; } };
  const sandbox = { window: root, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView, Float32Array };
  vm.runInNewContext(coreSource + '\n' + mediaSource, sandbox);
  core = root.AlloWordPracticeCore; media = root.AlloWordPracticeMedia;
});
describe('portable word practice audio', () => {
  it('preserves prepared clips, takes missing words from the recorded bank, and only synthesizes remaining words', async () => {
    root._CACHE_WORD_AUDIO_BANK = { rain: wav };
    root.__ALLO_PHONEME_AUDIO_BANK = { sh: wav };
    const callTTS = vi.fn(async () => wav), progress = vi.fn();
    const result = await media.prepareAudio(core.normalizeInput({ words: [{ word: 'ship', wordAudio: wav, phonemes: [{ label: 'sh', soundKey: '\u0283' }, { label: 'unknown' }] }, 'rain', 'light'] }), { callTTS, selectedVoice: 'af_heart', ttsSpeed: 0.9 }, progress);
    expect(result.items.every(item => item.wordAudio === wav)).toBe(true);
    expect(result.items[0].phonemes[0].audio).toBe(wav);
    expect(result.items[0].phonemes[1].audio).toBe('');
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(callTTS).toHaveBeenCalledWith('light', 'af_heart', 0.9, expect.objectContaining({ language: 'en', allowProviderFallback: false }));
    expect(progress).toHaveBeenCalledTimes(3);
    expect(result.audioStatus).toMatchObject({ words: 3, phonemes: 1, totalPhonemes: 2, completePhonemeWords: 0 });
  });
  it('never substitutes English bank clips for another language or synthesizes phoneme labels', async () => {
    root._CACHE_WORD_AUDIO_BANK = { pan: wav };
    root.__ALLO_PHONEME_AUDIO_BANK = { p: wav };
    const callTTS = vi.fn(async () => wav);
    const result = await media.prepareAudio({ words: [{ word: 'pan', phonemes: ['p'] }], language: 'Spanish' }, { callTTS });
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(callTTS.mock.calls[0][0]).toBe('pan');
    expect(callTTS.mock.calls[0][3].language).toBe('Spanish');
    expect(result.items[0].phonemes[0].audio).toBe('');
  });
  it('reuses the Word Sounds ai/ea bank aliases while respecting explicit sound keys', async () => {
    root.__ALLO_PHONEME_AUDIO_BANK = { ay: wav, ee: wav, e: webm };
    const result = await media.prepareAudio({ words: [{ word: 'rain', wordAudio: wav, phonemes: ['ai'] }, { word: 'head', wordAudio: wav, phonemes: [{ label: 'ea', soundKey: 'e' }] }] });
    expect(result.items[0].phonemes[0].audio).toBe(wav);
    expect(result.items[1].phonemes[0].audio).toBe(webm);
  });
  it('accepts explicit phoneme recordings in the teaching language and waits for lazy English bank loading once', async () => {
    const spanish = await media.prepareAudio({ language: 'Spanish', words: [{ word: 'pan', wordAudio: wav, phonemes: ['p'] }] }, { phonemeBank: { p: wav } });
    expect(spanish.items[0].phonemes[0].audio).toBe(wav);
    const events = new EventTarget(); let ready = false, scheduled = false;
    root.addEventListener = events.addEventListener.bind(events); root.removeEventListener = events.removeEventListener.bind(events);
    root.getAudio = vi.fn(() => {
      if (ready) return wav;
      if (!scheduled) { scheduled = true; setTimeout(() => { ready = true; events.dispatchEvent(new Event('audio_bank_loaded')); }, 5); }
      return null;
    });
    const english = await media.prepareAudio({ words: [{ word: 'rain', wordAudio: wav, phonemes: [{ label: 'ai', soundKey: 'e\u026a' }] }] });
    expect(english.items[0].phonemes[0].audio).toBe(wav);
    expect(english.audioStatus.message).toMatch(/All word/);
  });
  it('keeps partial results and stops repeated quota requests without claiming missing words are ready', async () => {
    const callTTS = vi.fn(async () => { throw new Error('429 quota exceeded'); });
    const result = await media.prepareAudio({ words: [{ word: 'ship', wordAudio: wav }, 'rain', 'light'] }, { callTTS });
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(result.audioStatus.words).toBe(1);
    expect(result.audioStatus.errors).toHaveLength(2);
    expect(result.items[0].wordAudio).toBe(wav);
  });
  it('cancels between words and does not request the remaining audio', async () => {
    const controller = new AbortController(), callTTS = vi.fn(async () => wav);
    await expect(media.prepareAudio({ words: ['ship', 'rain'] }, { callTTS, signal: controller.signal }, () => controller.abort())).rejects.toMatchObject({ name: 'AbortError' });
    expect(callTTS).toHaveBeenCalledTimes(1);
  });
  it('copies a returned blob recording into the pack and rejects malformed content', async () => {
    const fetch = vi.fn(async () => ({ ok: true, headers: new Headers({ 'content-type': 'audio/wav' }), blob: async () => new Blob([Buffer.from(wav.split(',')[1], 'base64')], { type: 'audio/wav' }) }));
    const result = await media.prepareAudio({ words: ['ship'] }, { callTTS: async () => 'blob:https://alloflow.test/recording', fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.items[0].wordAudio).toBe(wav);
    const bad = await media.prepareAudio({ words: ['ship'] }, { callTTS: async () => 'data:audio/wav;base64,PHNjcmlwdD4=' });
    expect(bad.items[0].wordAudio).toBe('');
    expect(bad.audioStatus.errors).toHaveLength(1);
  });
});
describe('editable PowerPoint practice', () => {
  it('uses the supplied display order/placement and adds no audio or synthesis when disabled', async () => {
    const pack = core.normalizeInput({ words: [{ word: 'ship', wordAudio: wav }, 'rain'] });
    const callTTS = vi.fn();
    const pptx = await media.buildPptx(pack, { mode: 'popup', includeAudio: false }, [{ itemId: 'w2', position: 'top-right', scale: 0.8 }, { itemId: 'w1', position: 'bottom-left', scale: 1 }], { callTTS });
    expect(pptx.slides).toHaveLength(2);
    expect(pptx.slides[0].texts.find(item => flattenText(item.text) === 'rain').options.x).toBe(6.7);
    expect(pptx.slides[1].texts.find(item => flattenText(item.text) === 'ship').options.y).toBe(3.65);
    expect(pptx.slides.flatMap(slide => slide.sounds)).toHaveLength(0);
    expect(callTTS).not.toHaveBeenCalled();
    expect(decodeAudio).not.toHaveBeenCalled();
  });
  it('converts WebM word audio and concatenates complete sound sequences as WAV only once', async () => {
    const pack = core.normalizeInput({ words: [{ word: 'ship', wordAudio: webm, phonemes: [{ label: 'sh', audio: wav }, { label: 'i', audio: wav }] }] });
    const pptx = await media.buildPptx(pack, { mode: 'blend', repetitions: 2 });
    expect(pptx.slides).toHaveLength(2);
    expect(pptx.slides[0].sounds).toHaveLength(2);
    for (const item of pptx.slides.flatMap(slide => slide.sounds)) {
      expect(item.data).toMatch(/^audio\/wav;base64,/);
      const bytes = Buffer.from(item.data.split(',')[1], 'base64');
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString()).toBe('WAVE');
    }
    const joined = Buffer.from(pptx.slides[0].sounds[1].data.split(',')[1], 'base64');
    expect(joined.readUInt32LE(40)).toBe((80 * 2 + 1600) * 2);
    expect(decodeAudio).toHaveBeenCalledTimes(2);
    expect(closeAudio).toHaveBeenCalledTimes(1);
    expect(pptx.wordPracticeWarnings).toHaveLength(0);
  });
  it('reports missing clips and never exports a misleading partial phoneme sequence', async () => {
    const pack = core.normalizeInput({ words: [{ word: 'ship', phonemes: [{ label: 'sh', audio: wav }, { label: 'i' }] }] });
    const pptx = await media.buildPptx(pack, { repetitions: 1 });
    expect(pptx.slides[0].sounds).toHaveLength(0);
    expect(pptx.wordPracticeWarnings).toHaveLength(2);
  });
  it('exports spelling and prepared sentence prompts with separate answer slides', async () => {
    const pack = core.normalizeInput({ words: [{ word: 'ship', wordAudio: wav, sentenceActivity: { prompt: 'The ____ is big.', choices: ['ship', 'rain'], answer: 'ship' } }] });
    const spelling = await media.buildPptx(pack, { mode: 'spelling', repetitions: 1 });
    expect(spelling.slides).toHaveLength(2);
    expect(spelling.slides[0].texts.some(item => flattenText(item.text) === 'ship')).toBe(false);
    expect(spelling.slides[1].texts.some(item => flattenText(item.text) === 'ship')).toBe(true);
    const sentence = await media.buildPptx(pack, { mode: 'sentence', repetitions: 1 });
    expect(sentence.slides).toHaveLength(2);
    expect(sentence.slides[0].texts.some(item => flattenText(item.text) === 'The ____ is big.')).toBe(true);
    expect(sentence.slides[0].sounds).toHaveLength(0);
    expect(sentence.slides[1].sounds).toHaveLength(1);
  });
  it('retains long glossary content across continuation slides and keeps media failures recoverable', async () => {
    const definition = Array.from({ length: 170 }, (_, index) => 'term' + index).join(' ');
    const pack = core.normalizeInput({ words: [{ term: 'ship', def: definition, translations: { Spanish: 'barco' }, wordAudio: webm }] });
    decodeAudio.mockRejectedValue(new Error('Unsupported codec'));
    const pptx = await media.buildPptx(pack, { mode: 'vocabulary', repetitions: 1 });
    expect(pptx.slides.length).toBeGreaterThan(1);
    const body = pptx.slides.flatMap(slide => slide.texts.map(item => flattenText(item.text))).join(' ');
    expect(body).toContain('term169');
    expect(body).toContain('Spanish:\nbarco');
    expect(pptx.wordPracticeWarnings).toHaveLength(1);
    expect(closeAudio).toHaveBeenCalledTimes(1);
  });
});
