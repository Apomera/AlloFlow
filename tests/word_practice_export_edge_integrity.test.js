import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const sources = {
  source: ['word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const wav = marker => 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(40)).toString('base64');
const fallbackAudio = wav('fallback'), defaultAudio = wav('default');
function load(lane, { segmenter = true } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
  const win = dom.window; windows.push(win);
  if (!segmenter) {
    const localIntl = Object.create(win.Intl);
    Object.defineProperty(localIntl, 'Segmenter', { value: undefined });
    Object.defineProperty(win, 'Intl', { value: localIntl, configurable: true });
  }
  win.eval(sources[lane]);
  return { win, core: win.AlloWordPracticeCore, media: win.AlloWordPracticeMedia };
}
class Presentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], addText(text, options) { this.texts.push({ text, options }); } };
    this.slides.push(slide); return slide;
  }
}
const hasUnpairedSurrogate = text => Array.from(text).some(character => character.length === 1 && character.charCodeAt(0) >= 0xD800 && character.charCodeAt(0) <= 0xDFFF);

describe.each(Object.keys(sources))('Word Practice export edge integrity (%s)', lane => {
  it.each([
    ['ar-u-nu-latn', 'rtl'], ['ar-x-demo', 'rtl'], ['fa-IR-x-latn', 'rtl'],
    ['en-x-arab', 'ltr'], ['ar-Latn-u-nu-arab', 'ltr'], ['pa-Arab-u-nu-latn', 'rtl']
  ])('keeps script direction independent of extensions in %s', (tag, direction) => {
    const { core } = load(lane);
    expect(core.languageInfo(tag)).toMatchObject({ dir: direction });
    expect(core.languageInfo(tag).tag.toLowerCase()).toBe(tag.toLowerCase());
  });

  it.each([
    { prefix: 649, symbol: '🦋', label: 'surrogate pair' },
    { prefix: 649, symbol: '𝛼', label: 'astral mathematical symbol' },
    { prefix: 649, symbol: 'e\u0301', label: 'combining sequence' },
    { prefix: 648, symbol: '👩‍🏫', label: 'joined emoji' }
  ])('preserves a $label across PowerPoint continuation boundaries', async ({ prefix, symbol }) => {
    const { media } = load(lane), definition = 'a'.repeat(prefix) + symbol + 'b'.repeat(35);
    const pptx = await media.buildPptx({ words: [{ word: 'boundary', definition }] }, { mode: 'vocabulary', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation });
    const bodyParts = pptx.slides.flatMap(slide => slide.texts.filter(entry => entry.options.y === 2.15).map(entry => entry.text));
    expect(bodyParts.length).toBeGreaterThan(1);
    expect(bodyParts.join('')).toBe(definition);
    expect(bodyParts.some(text => text.includes(symbol))).toBe(true);
    expect(bodyParts.some(hasUnpairedSurrogate)).toBe(false);
  });

  it('keeps valid surrogate pairs in PowerPoint on browsers without Intl.Segmenter', async () => {
    const { media } = load(lane, { segmenter: false }), definition = 'a'.repeat(649) + '🦋' + 'b'.repeat(35);
    const pptx = await media.buildPptx({ words: [{ word: 'boundary', definition }] }, { mode: 'vocabulary', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation });
    const bodyParts = pptx.slides.flatMap(slide => slide.texts.filter(entry => entry.options.y === 2.15).map(entry => entry.text));
    expect(bodyParts.join('')).toBe(definition);
    expect(bodyParts.some(text => text.includes('🦋'))).toBe(true);
    expect(bodyParts.some(hasUnpairedSurrogate)).toBe(false);
  });

  it.each([
    { language: 'French', word: 'ami' },
    { language: 'English', word: 'New York' }
  ])('recovers from a failed custom fetch with TTS for $language / $word', async ({ language, word }) => {
    const { win, media, core } = load(lane); let fetchCalls = 0, ttsCalls = 0;
    win._CACHE_WORD_AUDIO_BANK = { [core.key(word)]: defaultAudio };
    const pack = await media.prepareAudio({ language, words: [word] }, {
      wordBank: { [word]: 'blob:https://alloflow.example/expired' },
      fetch: async () => { fetchCalls++; throw new Error('Expired recording'); },
      callTTS: async () => { ttsCalls++; return fallbackAudio; }
    });
    expect(fetchCalls).toBe(1); expect(ttsCalls).toBe(1);
    expect(pack.items[0].wordAudio).toBe(fallbackAudio);
    expect(pack.audioStatus.words).toBe(1);
    expect(pack.audioStatus.errors.join(' ')).toContain('custom recording');
  });

  it('uses the default English word recording after a failed custom fetch before requesting TTS', async () => {
    const { win, media } = load(lane); let ttsCalls = 0;
    win._CACHE_WORD_AUDIO_BANK = { ship: defaultAudio };
    const pack = await media.prepareAudio({ words: ['ship'] }, {
      wordBank: { ship: 'https://alloflow.example/missing.wav' },
      fetch: async () => ({ ok: false }),
      callTTS: async () => { ttsCalls++; return fallbackAudio; }
    });
    expect(pack.items[0].wordAudio).toBe(defaultAudio); expect(ttsCalls).toBe(0);
    expect(pack.audioStatus.errors.join(' ')).toContain('custom recording');
  });

  it('continues to another matching custom recording before trying TTS after a failed fetch', async () => {
    const { media } = load(lane); let ttsCalls = 0;
    const pack = await media.prepareAudio({ language: 'French', words: ['Ami'] }, {
      wordBank: { ami: 'blob:https://alloflow.example/expired', Ami: fallbackAudio },
      fetch: async () => { throw new Error('Expired recording'); },
      callTTS: async () => { ttsCalls++; return defaultAudio; }
    });
    expect(pack.items[0].wordAudio).toBe(fallbackAudio); expect(ttsCalls).toBe(0);
  });

  it('propagates a custom fetch AbortError without attempting fallback synthesis', async () => {
    const { media } = load(lane); let ttsCalls = 0;
    await expect(media.prepareAudio({ language: 'French', words: ['ami'] }, {
      wordBank: { ami: 'blob:https://alloflow.example/recording' },
      fetch: async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); },
      callTTS: async () => { ttsCalls++; return fallbackAudio; }
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(ttsCalls).toBe(0);
  });
});
