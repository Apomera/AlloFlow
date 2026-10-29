import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const sources = {
  source: ['word_practice_core.js', 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8'),
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
class Deck {
  constructor() { this.slides = []; }
  addSlide() { const slide = { texts: [], addText(text, options) { this.texts.push({ text, options }); }, addNotes() {} }; this.slides.push(slide); return slide; }
}
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
function load(lane) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(sources[lane]);
  return { core: window.AlloWordPracticeCore, media: window.AlloWordPracticeMedia };
}
const luminance = hex => hex.match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((total, value, i) => total + value * [0.2126, 0.7152, 0.0722][i], 0);

describe.each(Object.keys(sources))('portable card appearance (%s)', lane => {
  it('uses saved practice settings by default and preserves them when one export option changes', async () => {
    const { core, media } = load(lane);
    const saved = JSON.parse(core.serializePack({ words: [{ word: 'ورقة', termLanguage: 'Arabic', definition: 'A leaf.', definitionLanguage: 'English' }], options: { mode: 'vocabulary', repetitions: 2, includeAudio: false, cardFont: 'georgia', cardTheme: 'mist', cardTextScale: 1.2 } }));
    const context = { PptxGenJS: Deck };
    for (const overrides of [undefined, {}, { includeAudio: false }]) {
      const deck = await media.buildPptx(saved, overrides, undefined, context);
      expect(deck.slides).toHaveLength(2);
      expect(deck.theme.bodyFontFace).toBe('Georgia');
      expect(deck.slides[0].background.color).toBe(core.cardAppearance(saved.options).background);
      const meaning = deck.slides[0].texts.find(entry => entry.text === 'A leaf.');
      expect(meaning.options.fontSize).toBeCloseTo(31.2);
      expect(meaning.options.lang).toBe('en');
    }
    const override = await media.buildPptx(saved, { repetitions: 1, cardFont: 'verdana' }, undefined, context);
    expect(override.slides).toHaveLength(1); expect(override.theme.bodyFontFace).toBe('Verdana');
    expect(override.slides[0].background.color).toBe(core.cardAppearance(saved.options).background);
  });

  it.each([
    ['English', 'Words for an inclusive learning community with observation, comparison, explanation, collaboration, and discussion. '.repeat(2).slice(0, 160)],
    ['Chinese (Simplified)', '学习词语观察周围世界'.repeat(16)],
    ['Arabic', 'نتعلم كلمات جديدة معًا ونلاحظ العالم من حولنا ونقارن بين الأشياء. '.repeat(3).slice(0, 160)],
  ])('fits the complete long %s title above the card and keeps its language', async (language, title) => {
    const { core, media } = load(lane);
    const deck = await media.buildPptx({ title, language, words: ['Word'] }, { repetitions: 1, includeAudio: false, cardFont: 'verdana' }, undefined, { PptxGenJS: Deck });
    const header = deck.slides[0].texts[0];
    expect(header.text).toBe(title.trim());
    expect(header.options.fontSize).toBeGreaterThanOrEqual(10);
    expect(header.options.fontSize).toBeLessThanOrEqual(16);
    expect(header.options.y + header.options.h).toBeLessThanOrEqual(0.81);
    expect(header.options).toMatchObject({ lang: core.languageInfo(language).tag, valign: 'top', align: language === 'Arabic' ? 'right' : 'left' });
    expect(header.options.fit).toBeUndefined();
  });

  it('bounds imported appearance values and preserves valid styling with multilingual content', () => {
    const { core } = load(lane);
    expect(core.normalizeOptions({ cardFont: 'url(https://example.com)', cardTheme: '#fff', cardTextScale: Infinity })).toMatchObject({ cardFont: 'default', cardTheme: 'paper', cardTextScale: 1 });
    expect(core.normalizeOptions({ cardTextScale: -100 }).cardTextScale).toBe(0.85);
    expect(core.normalizeOptions({ cardTextScale: 500 }).cardTextScale).toBe(1.4);
    const pack = core.normalizeInput({ words: [{ word: 'كتاب', termLanguage: 'Arabic', definition: 'A book.', definitionLanguage: 'English', translations: { Spanish: 'libro' } }], options: { cardFont: 'verdana', cardTheme: 'cream', cardTextScale: 1.4 } });
    const restored = core.normalizeInput(JSON.parse(core.serializePack(pack)));
    expect(restored.options).toMatchObject({ cardFont: 'verdana', cardTheme: 'cream', cardTextScale: 1.4 });
    expect(restored.items).toEqual(pack.items);
  });

  it.each(['paper', 'cream', 'mist'])('keeps all %s text colors above normal-text contrast requirements', cardTheme => {
    const { core } = load(lane), palette = core.cardAppearance({ cardTheme });
    const background = luminance(palette.background);
    for (const key of ['heading', 'text', 'accent', 'muted']) {
      const color = luminance(palette[key]);
      expect((Math.max(background, color) + 0.05) / (Math.min(background, color) + 0.05), key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([0.85, 1, 1.4])('keeps language captions distinct from the translated text at %s scale', async cardTextScale => {
    const { core, media } = load(lane), options = { mode: 'vocabulary', repetitions: 1, includeAudio: false, cardFont: 'georgia', cardTheme: 'cream', cardTextScale };
    const palette = core.cardAppearance(options);
    const deck = await media.buildPptx({ words: [{ word: 'leaf', translations: { Arabic: 'ورقة', Japanese: '葉' } }] }, options, undefined, { PptxGenJS: Deck, currentUiLanguage: 'French' });
    const paragraphs = deck.slides.flatMap(slide => slide.texts).filter(entry => Array.isArray(entry.text) && entry.options.y >= 2.15 && entry.options.y < 5.65);
    expect(paragraphs).toHaveLength(2);
    for (const paragraph of paragraphs) {
      expect(paragraph.options).toMatchObject({ fontFace: 'Georgia', fontSize: 26 * cardTextScale, color: palette.text });
      expect(paragraph.text[0].options).toMatchObject({ fontSize: 20 * cardTextScale, bold: true, color: palette.muted, lang: 'fr', rtlMode: false });
      expect(paragraph.text[1].options.lang).toBe(paragraph.options.lang);
      expect(paragraph.text[0].text.endsWith('\n')).toBe(true);
    }
  });

  it.each([['arial', 'paper', 'Arial'], ['verdana', 'cream', 'Verdana'], ['georgia', 'mist', 'Georgia']])('exports %s at the selected size and paginates complete multilingual meanings', async (cardFont, cardTheme, fontFace) => {
    const { core, media } = load(lane);
    const definition = '生物依赖周围的水、土壤、阳光和其他生物。'.repeat(22);
    const input = { words: [{ word: '生态系统', termLanguage: 'zh-Hans', definitionLanguage: 'zh-Hans', definition, translations: { Arabic: 'النظام البيئي' } }] };
    const options = { mode: 'vocabulary', repetitions: 1, includeAudio: false, cardFont, cardTheme, cardTextScale: 1.4 };
    const palette = core.cardAppearance(options), context = { PptxGenJS: Deck };
    const pptx = await media.buildPptx(input, options, undefined, context);
    const standard = await media.buildPptx(input, { ...options, cardTextScale: 1 }, undefined, context);
    expect(pptx.slides.length).toBeGreaterThan(standard.slides.length);
    expect(pptx.theme).toEqual({ headFontFace: fontFace, bodyFontFace: fontFace });
    const bodies = pptx.slides.flatMap(slide => slide.texts.filter(entry => entry.options.y >= 2.15 && entry.options.y < 5.65));
    expect(bodies.filter(entry => entry.options.lang === 'zh-Hans').map(entry => flatten(entry.text)).join('')).toBe(definition);
    for (const body of bodies) expect(body.options).toMatchObject({ fontFace, fontSize: 36.4, color: palette.text });
    for (const slide of pptx.slides) expect(slide.background.color).toBe(palette.background);
    expect(bodies.find(entry => entry.options.lang === 'ar').options).toMatchObject({ align: 'right', rtlMode: true });
  });

  it('preserves the whole sentence before choices when enlarged text needs extra slides', async () => {
    const { core, media } = load(lane), options = { mode: 'sentence', repetitions: 1, includeAudio: false, cardTextScale: 1.4, cardFont: 'verdana', cardTheme: 'mist' };
    const prompt = 'Read the whole sentence, compare the possibilities, and choose the word that fits. '.repeat(8) + 'A plant has a ____.';
    const palette = core.cardAppearance(options);
    const pptx = await media.buildPptx({ words: [{ word: 'leaf', sentenceActivity: { prompt, choices: ['leaf', 'rock'], answer: 'leaf' } }] }, options, undefined, { PptxGenJS: Deck });
    const paragraphs = pptx.slides.flatMap(slide => slide.texts.filter(entry => entry.options.y === 1));
    const prompts = paragraphs.filter(entry => entry.options.color === palette.heading);
    expect(prompts.map(entry => flatten(entry.text)).join('')).toBe(prompt);
    expect(prompts.length).toBeGreaterThan(1);
    expect(paragraphs.every(entry => Math.abs(entry.options.fontSize - 39.2) < 0.001)).toBe(true);
    expect(paragraphs.findIndex(entry => entry.options.color === palette.accent)).toBe(prompts.length);
  });
});
