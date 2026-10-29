import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const sources = {
  source: ['word_practice_core.js', 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8'),
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
function load(lane) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window);
  window.eval(sources[lane]);
  return { win: window, core: window.AlloWordPracticeCore, media: window.AlloWordPracticeMedia };
}
class Deck {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], addText(text, options) { this.texts.push({ text, options }); } };
    this.slides.push(slide); return slide;
  }
}

describe.each(Object.keys(sources))('readable practice language names (%s)', lane => {
  it.each([['Spanish', 'es', false], ['Arabic', 'ar', true], ['Japanese', 'ja', false]])('names language, script and region in %s', (locale, tag, rtl) => {
    const { core } = load(lane), names = new Intl.DisplayNames([tag], { type: 'language', languageDisplay: 'standard', fallback: 'none' });
    for (const [value, code] of [['French', 'fr'], ['ar-Latn', 'ar-Latn'], ['zh-Hant-TW', 'zh-Hant-TW']]) {
      expect(core.languageLabel(value, locale)).toEqual({ text: names.of(code), language: { tag, dir: rtl ? 'rtl' : 'ltr' } });
    }
    expect(core.languageLabel('ar-Latn', locale).text).not.toBe(core.languageLabel('Arabic', locale).text);
    expect(core.languageLabel('zh-Hant-TW', locale).text).not.toBe(core.languageLabel('zh-Hans-CN', locale).text);
  });

  it('keeps unknown names intact and labels a default-English fallback as English', () => {
    const { core } = load(lane);
    for (const value of ['Family language', 'qzz', '']) expect(core.languageLabel(value, 'Spanish')).toEqual({ text: value, language: { tag: '', dir: 'auto' } });
    expect(core.languageLabel('French', 'Unknown UI language')).toEqual({ text: 'French', language: { tag: 'en', dir: 'ltr' } });
  });

  it.each(['missing', 'throws', 'no-intl'])('keeps original names when Intl is %s', reason => {
    const { win, core } = load(lane);
    if (reason === 'no-intl') win.Intl = undefined;
    else {
      const localIntl = Object.create(win.Intl);
      localIntl.DisplayNames = reason === 'missing' ? undefined : class { constructor() { throw new Error('Unavailable locale data'); } };
      win.Intl = localIntl;
    }
    expect(core.languageLabel('zh-Hant-TW', 'Spanish')).toEqual({ text: 'zh-Hant-TW', language: { tag: '', dir: 'auto' } });
  });

  it.each([['Spanish', 'es', false], ['Arabic', 'ar', true]])('exports %s labels while keeping text languages, direction and saved identities', async (locale, tag, rtlMode) => {
    const { core, media } = load(lane);
    const pack = core.normalizeInput({ language: 'English', words: [{ word: 'leaf', translations: { 'ar-Latn': 'waraqa', 'pa-Arab': 'پتا', 'zh-Hant-TW': '葉子' } }] });
    const saved = core.serializePack(pack), audioKeys = pack.items[0].translations.map(value => core.audioLanguageKey(value.language));
    const deck = await media.buildPptx(pack, { mode: 'vocabulary', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Deck, currentUiLanguage: locale });
    for (const value of pack.items[0].translations) {
      const paragraph = deck.slides.flatMap(slide => slide.texts).find(entry => Array.isArray(entry.text) && entry.text.some(run => run.text === value.text));
      const language = core.languageInfo(value.language);
      expect(paragraph.text[0]).toMatchObject({ text: core.languageLabel(value.language, locale).text + ':\n', options: { lang: tag, rtlMode } });
      expect(paragraph.text[1]).toMatchObject({ text: value.text, options: { lang: language.tag, rtlMode: language.dir === 'rtl' } });
      expect(paragraph.options).toMatchObject({ lang: language.tag, rtlMode: language.dir === 'rtl', align: language.dir === 'rtl' ? 'right' : 'left' });
    }
    expect(core.serializePack(pack)).toBe(saved);
    expect(core.normalizeInput(JSON.parse(saved)).items[0].translations.map(value => core.audioLanguageKey(value.language))).toEqual(audioKeys);
  });
});
