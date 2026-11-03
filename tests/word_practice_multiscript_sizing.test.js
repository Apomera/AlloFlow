import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const source = [process.env.CARD_CORE_PATH || 'word_practice_core.js', process.env.CARD_MEDIA_PATH || 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const lanes = { source };
if (!process.env.CARD_MEDIA_PATH) lanes.runtime = fs.readFileSync('word_practice_module.js', 'utf8');
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
class Deck {
  constructor() { this.slides = []; }
  addSlide() { const slide = { texts: [], addText(text, options) { this.texts.push({ text, options }); }, addNotes() {} }; this.slides.push(slide); return slide; }
}
function load(code, segmenter) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window);
  if (segmenter === 'missing') window.Intl.Segmenter = undefined;
  if (segmenter === 'throwing') window.Intl.Segmenter = class { constructor() { throw new Error('Unavailable'); } };
  window.eval(code); return window.AlloWordPracticeMedia;
}
async function term(media, word, language = 'Arabic', position = 'center', context = {}) {
  const deck = await media.buildPptx({ words: [{ word, termLanguage: language }] }, { mode: 'popup', repetitions: 1, includeAudio: false, cardFont: 'verdana' }, [{ itemId: 'w1', position, scale: 1 }], { PptxGenJS: Deck, ...context });
  return deck.slides[0].texts.at(-1);
}

describe.each(Object.entries(lanes))('multiscript word sizing (%s)', (_, code) => {
  it.each(['native', 'missing', 'throwing'])('sizes Arabic vowel marks with their letters when segmentation is %s', async segmenter => {
    const media = load(code, segmenter);
    for (const position of ['center', 'top-right']) {
      const plain = await term(media, 'مستشفيات', 'Arabic', position), marked = await term(media, 'مُسْتَشْفَيَات', 'Arabic', position);
      expect(marked.options.fontSize).toBeCloseTo(plain.options.fontSize);
      expect(marked.options).toMatchObject({ fontFace: 'Verdana', lang: 'ar', rtlMode: true });
      expect(marked.text).toBe('مُسْتَشْفَيَات');
    }
  });

  it('gives Hindi conjuncts a grapheme-based cap without dropping marks or changing the saved word', async () => {
    const media = load(code), word = 'किंकर्तव्यविमूढ़';
    const result = await term(media, word, 'Hindi');
    expect(result.text).toBe(word.normalize('NFC'));
    expect(result.options).toMatchObject({ fontSize: 100, lang: 'hi', rtlMode: false });
    const large = await term(media, word, 'Hindi', 'center', { readerSettings: { baseFontSize: 48 } });
    expect(large.options.fontSize).toBeGreaterThanOrEqual(result.options.fontSize);
    expect(large.options.fontSize).toBeLessThanOrEqual(large.options.h * 72 / 1.35);
  });

  it.each([['Internationalisation', 48.21428571428571, 25.89285714285714], ['多言語コミュニケーション', 66.35714285714285, 43.154761904761905]])('preserves the existing Latin/CJK fit and position for %s', async (word, centered, corner) => {
    const media = load(code);
    for (const position of ['center', 'top-left']) {
      const result = await term(media, word, word.startsWith('I') ? 'English' : 'Japanese', position);
      // These observed baseline sizes include the existing final wrap/height fit.
      expect(result.options.fontSize).toBeCloseTo(position === 'center' ? centered : corner);
      expect(result.options.x).toBe(position === 'center' ? 0.7 : 0.6);
      expect(result.text).toBe(word);
    }
  });
});
