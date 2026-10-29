import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const lanes = {
  source: ['word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
class Presentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addNotes(text) { this.notes.push(text); }, addMedia() {} };
    this.slides.push(slide); return slide;
  }
}
function load(lane) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only' });
  windows.push(dom.window); dom.window.eval(lanes[lane]);
  return dom.window.AlloWordPracticeMedia;
}
const sentenceActivity = { prompt: 'La ____ es verde.', choices: ['hoja', 'mesa'], answer: 'hoja' };
const words = [{ word: 'hoja', definition: 'Parte de una planta.', example: 'La hoja es verde.', sentenceActivity, phonemes: [{ label: 'h' }], translations: { 'pa-Arab': 'پتا', 'ar-Latn': 'waraqa', 'zh-Hant': '葉子' } }];
const spanish = JSON.parse(fs.readFileSync('lang/spanish_latin_america.js', 'utf8')).word_practice;
const t = key => spanish[key.replace('word_practice.', '')] || key;

describe.each(Object.keys(lanes))('PowerPoint language and guidance (%s)', lane => {
  it.each(['popup', 'blend', 'vocabulary', 'spelling', 'sentence'])('tags actual %s text options and keeps source/UI languages separate', async mode => {
    const pptx = await load(lane).buildPptx({ language: 'es-MX', words }, { mode, repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation, currentUiLanguage: 'French', t: key => key === 'word_practice.card_progress' ? 'Carte {n} sur {total}' : key });
    for (const entry of pptx.slides.flatMap(slide => slide.texts)) {
      expect(entry.options.lang).toBeTruthy();
      if (Array.isArray(entry.text)) for (const run of entry.text) expect(run.options.lang).toBeTruthy();
    }
    const texts = pptx.slides.flatMap(slide => slide.texts);
    const target = texts.find(entry => flatten(entry.text) === 'hoja');
    expect(target.options).toMatchObject({ lang: 'es-MX', rtlMode: false });
    const footer = texts.find(entry => Array.isArray(entry.text) && flatten(entry.text).includes('Carte 1 sur 1'));
    expect(footer.text[0].options.lang).toBe('fr');
    // The missing mode translation falls back to English rather than French.
    expect(footer.text[1].options.lang).toBe('en');
  });

  it('preserves full translated tags and script-aware paragraph direction', async () => {
    const pptx = await load(lane).buildPptx({ language: 'Spanish', words }, { mode: 'vocabulary', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation });
    const texts = pptx.slides.flatMap(slide => slide.texts);
    for (const [text, lang, rtlMode] of [['پتا', 'pa-Arab', true], ['waraqa', 'ar-Latn', false], ['葉子', 'zh-Hant', false]]) {
      const paragraph = texts.find(entry => Array.isArray(entry.text) && entry.text.some(run => run.text === text));
      expect(paragraph.options).toMatchObject({ lang, rtlMode });
      expect(paragraph.text.at(-1).options).toMatchObject({ lang, rtlMode });
      expect(paragraph.text[0].options.rtlMode).toBe(false);
      expect(paragraph.text[0].options.lang).toBe('en');
    }
  });

  it.each(['ar', 'az-Arab', 'ar-Latn', 'ar-u-nu-latn'])('applies source direction to %s words and sentence text', async language => {
    const pptx = await load(lane).buildPptx({ language, words }, { mode: 'sentence', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation });
    const prompt = pptx.slides[0].texts.find(entry => entry.text === sentenceActivity.prompt);
    expect(prompt.options.lang).toBe(language);
    expect(prompt.options.rtlMode).toBe(language !== 'ar-Latn');
  });

  it('uses actual Spanish UI translations for spelling guidance, answer/footer and teacher notes', async () => {
    const pptx = await load(lane).buildPptx({ language: 'Spanish', words }, { mode: 'spelling', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation, currentUiLanguage: 'Spanish', t });
    const prompt = pptx.slides[0], answer = pptx.slides[1];
    expect(prompt.texts.map(entry => flatten(entry.text))).toContain(spanish.spell_teacher);
    expect(prompt.texts.map(entry => flatten(entry.text))).toContain(spanish.pptx_spell_advance);
    expect(flatten(answer.texts.find(entry => entry.options.y === 6.96).text)).toContain('Respuesta');
    expect(flatten(prompt.texts.find(entry => entry.options.y === 6.96).text)).toContain('Tarjeta 1 de 1');
    expect(prompt.notes).toEqual([spanish.pptx_say_word_note.replace('{word}', 'hoja')]);
    expect(prompt.texts.some(entry => entry.text === 'hoja')).toBe(false);
    expect(answer.texts.find(entry => entry.text === 'hoja').options.lang).toBe('es');
  });

  it('translates continuation/example labels, missing sound guidance and recording warnings', async () => {
    const media = load(lane), context = { PptxGenJS: Presentation, currentUiLanguage: 'Spanish', t };
    const pptx = await media.buildPptx({ words: [{ word: 'hoja', definition: 'Palabra '.repeat(100), example: 'La hoja es verde.' }] }, { mode: 'vocabulary', repetitions: 1 }, undefined, context);
    const allText = pptx.slides.flatMap(slide => slide.texts.map(entry => flatten(entry.text))).join('\n');
    expect(allText).toContain('Parte 1/'); expect(allText).toContain('Ejemplo: La hoja es verde.');
    expect(pptx.wordPracticeWarnings).toEqual(['No se incluye una grabación de «hoja».']);
    const blend = await media.buildPptx({ words: ['hoja'] }, { mode: 'blend', repetitions: 1, includeAudio: false }, undefined, context);
    expect(blend.slides[0].texts.map(entry => flatten(entry.text))).toContain(spanish.pptx_no_sounds);
  });

  it.each([undefined, key => key, () => { throw new Error('Unavailable translator'); }, () => ({ invalid: true })])('keeps readable English fallbacks when translation lookup is unavailable', async translator => {
    const pptx = await load(lane).buildPptx({ words: ['hoja'] }, { mode: 'spelling', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation, currentUiLanguage: 'Spanish', t: translator });
    const prompt = pptx.slides[0].texts.find(entry => entry.options.y === 2);
    expect(prompt.text).toBe('Ask your teacher to say the word, then spell it.');
    expect(prompt.options.lang).toBe('en');
  });

  it('does not invent an English tag for an unknown teaching language or translated UI locale', async () => {
    const pptx = await load(lane).buildPptx({ language: 'Unlisted language', words: ['hoja'] }, { mode: 'spelling', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation, t: key => key === 'word_practice.spell_teacher' ? 'Translated prompt' : key });
    expect(pptx.slides[0].texts.find(entry => entry.text === 'Translated prompt').options.lang).toBe('und');
    expect(pptx.slides[1].texts.find(entry => entry.text === 'hoja').options.lang).toBe('und');
  });

  it('localizes the default title as UI text and keeps its English fallback out of Arabic source metadata', async () => {
    const media = load(lane), options = { mode: 'popup', repetitions: 1, includeAudio: false };
    const fallback = await media.buildPptx({ language: 'Arabic', words: ['ورقة'] }, options, undefined, { PptxGenJS: Presentation });
    expect(fallback.slides[0].texts[0]).toMatchObject({ text: 'Word Fluency Pop-Up', options: { lang: 'en', rtlMode: false } });
    const localized = await media.buildPptx({ language: 'Arabic', words: ['ورقة'] }, options, undefined, { PptxGenJS: Presentation, currentUiLanguage: 'Spanish', t });
    expect(localized.slides[0].texts[0]).toMatchObject({ text: spanish.mode_popup, options: { lang: 'es', rtlMode: false } });
  });
});
