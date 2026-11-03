import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const source = ['word_practice_core.js', 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const bundled = require('../_build_word_practice_module.js').buildWordPracticeModule();
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXwkAAAAASUVORK5CYII=';
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
class Deck {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], images: [], addText(text, options) { this.texts.push({ text, options }); }, addImage(options) { this.images.push(options); }, addShape() {}, addNotes() {} };
    this.slides.push(slide); return slide;
  }
}
function load(code) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(code);
  return { core: window.AlloWordPracticeCore, media: window.AlloWordPracticeMedia };
}
const flatten = text => Array.isArray(text) ? text.map(run => run.text).join('') : text;
const allText = deck => deck.slides.flatMap(slide => slide.texts.map(entry => flatten(entry.text))).join('\n');
const translatedPassages = deck => deck.slides.flatMap(slide => slide.texts).filter(entry => entry.options.y >= 2.15 && entry.options.y < 5.65 && Array.isArray(entry.text) && entry.text[0]?.options.fontSize);
const values = { French: 'FRENCH_PASSAGE', Arabic: 'ARABIC_PASSAGE', Japanese: 'JAPANESE_PASSAGE' };
const input = () => ({ title: 'Practice', words: [{ word: 'Leaf', definition: 'A plant part.', translations: { ...values } }] });
const options = { mode: 'vocabulary', repetitions: 1, includeAudio: false };
const context = { PptxGenJS: Deck };

describe.each([['source', source], ['bundled in memory', bundled]])('PowerPoint language choices (%s)', (_, code) => {
  it('keeps all translations by default and follows selected language order and aliases', async () => {
    const { core, media } = load(code), pack = input(), saved = JSON.stringify(pack);
    const original = await media.buildPptx(pack, options, undefined, context);
    expect(translatedPassages(original).map(entry => entry.text[1].text)).toEqual(Object.values(values));
    const selected = await media.buildPptx(pack, { ...options, translationLanguages: ['ja', 'Arabic'] }, undefined, context);
    const passages = translatedPassages(selected);
    expect(passages.map(entry => entry.text[1].text)).toEqual([values.Japanese, values.Arabic]);
    expect(passages.map(entry => [entry.options.lang, entry.options.rtlMode, entry.options.align])).toEqual([['ja', false, 'left'], ['ar', true, 'right']]);
    expect(allText(selected)).not.toContain(values.French);
    expect(JSON.stringify(pack)).toBe(saved);
    expect(core.normalizeInput(JSON.parse(core.serializePack(pack))).items[0].translations.map(entry => entry.text)).toEqual(Object.values(values));
  });

  it('treats none as a display choice and preserves definitions, origins and annotations', async () => {
    const { media } = load(code), pack = input();
    pack.words[0].origin = 'An independently authored origin.';
    pack.words[0].annotations = [{ kind: 'note', content: 'Teacher commentary stays available.', x: 40, y: 30 }];
    const deck = await media.buildPptx(pack, { ...options, translationLanguages: [] }, undefined, context);
    const text = allText(deck);
    for (const value of Object.values(values)) expect(text).not.toContain(value);
    expect(translatedPassages(deck)).toHaveLength(0);
    expect(text).toContain('A plant part.');
    expect(text).toContain('An independently authored origin.');
    expect(text).toContain('Teacher commentary stays available.');
  });

  it('keeps regional/script translations distinct and leaves unknown language prose intact', async () => {
    const { media } = load(code);
    const pack = { words: [{ word: 'Leaf', translations: { French: 'FR_BASE', 'fr-CA': 'FR_CA', 'ar-Latn': 'AR_LATIN', 'Community language': 'COMMUNITY' } }] };
    const deck = await media.buildPptx(pack, { ...options, translationLanguages: ['fr_CA', 'Community language', 'ar-Latn'] }, undefined, context);
    const passages = translatedPassages(deck);
    expect(passages.map(entry => entry.text[1].text)).toEqual(['FR_CA', 'COMMUNITY', 'AR_LATIN']);
    expect(passages.map(entry => [entry.options.lang, entry.options.rtlMode])).toEqual([['fr-CA', false], ['und', false], ['ar-Latn', false]]);
    expect(allText(deck)).not.toContain('FR_BASE');
  });

  it('falls back to word first when all translation-only meanings are hidden', async () => {
    const { media } = load(code);
    const deck = await media.buildPptx({ words: [{ word: 'radio', translations: { Spanish: 'radio: un aparato', Arabic: 'HIDDEN_ARABIC' } }] }, { ...options, vocabularyFirst: 'meaning', translationLanguages: [] }, undefined, context);
    expect(deck.slides).toHaveLength(1);
    expect(allText(deck)).toContain('radio');
    expect(allText(deck)).not.toContain('Which word matches this meaning?');
    expect(allText(deck)).not.toContain('No meaning or example has been prepared');
    expect(allText(deck)).not.toContain('HIDDEN_ARABIC');
    expect(allText(deck)).not.toContain('un aparato');
    const empty = await media.buildPptx({ words: ['radio'] }, { ...options, translationLanguages: [] }, undefined, context);
    expect(allText(empty)).toContain('No meaning or example has been prepared');
  });

  it('masks selected recall clues, restores only selected originals after the answer and never mutates the set', async () => {
    const { media } = load(code);
    const pack = { words: [{ word: 'radio', translations: { Spanish: 'radio: un aparato', Arabic: 'HIDDEN_ARABIC' } }] };
    const saved = JSON.stringify(pack);
    const deck = await media.buildPptx(pack, { ...options, vocabularyFirst: 'meaning', translationLanguages: ['es'] }, undefined, context);
    const answer = deck.slides.findIndex(slide => slide.texts.some(entry => entry.text === 'radio'));
    expect(answer).toBeGreaterThan(0);
    const clueText = deck.slides.slice(0, answer).flatMap(slide => slide.texts.map(entry => flatten(entry.text))).join('\n');
    expect(clueText).toContain('____: un aparato');
    expect(clueText).not.toContain('radio');
    expect(allText(deck)).toContain('radio: un aparato');
    expect(allText(deck)).not.toContain('HIDDEN_ARABIC');
    expect(JSON.stringify(pack)).toBe(saved);
  });

  it('uses only displayable pictures as recall clues and avoids empty pages from hidden translations', async () => {
    const { core, media } = load(code);
    const make = src => ({ words: [{ word: 'Leaf', picture: { src, alt: 'A leaf' }, translations: { Arabic: 'HIDDEN_ARABIC' } }] });
    const selected = { ...options, vocabularyFirst: 'meaning', translationLanguages: [] };
    const supported = await media.buildPptx(make(png), selected, undefined, context);
    expect(supported.slides).toHaveLength(3);
    expect(supported.slides.map(slide => slide.images.length)).toEqual([1, 0, 1]);
    expect(allText(supported)).toContain('Which word matches this meaning?');
    expect(allText(supported)).not.toContain('No meaning or example has been prepared');
    expect(allText(supported)).not.toContain('HIDDEN_ARABIC');
    for (const src of ['https://example.test/leaf.png', 'data:image/webp;base64,UklGRgAAAABXRUJQ']) {
      const pack = make(src);
      expect(core.normalizeInput(pack).items[0].picture).toBeTruthy();
      const unsupported = await media.buildPptx(pack, selected, undefined, context);
      expect(unsupported.slides).toHaveLength(1);
      expect(allText(unsupported)).toContain('Leaf');
      expect(allText(unsupported)).not.toContain('Which word matches this meaning?');
      expect(allText(unsupported)).not.toContain('No meaning or example has been prepared');
      expect(allText(unsupported)).not.toContain('HIDDEN_ARABIC');
      expect(pack.words[0].picture.src).toBe(src);
    }
  });
});
