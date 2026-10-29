import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const lanes = {
  source: ['word_practice_core.js', 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8'),
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
const paragraphs = pptx => pptx.slides.flatMap(slide => slide.texts.filter(entry => entry.options.color === '1E293B'));
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(48)).toString('base64');
function setup(lane, { noSegmenter = false, onSlide } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  const win = dom.window; windows.push(win);
  if (noSegmenter) win.Intl.Segmenter = undefined;
  win.eval(lanes[lane]);
  let presentation;
  class Presentation {
    constructor() { this.slides = []; presentation = this; }
    addSlide() {
      const slide = { texts: [], media: [], notes: [],
        addText(text, options) { this.texts.push({ text, options }); },
        addMedia(options) { this.media.push(options); },
        addNotes(text) { this.notes.push(text); },
      };
      this.slides.push(slide); onSlide?.(this.slides.length, win); return slide;
    }
  }
  return { win, presentation: () => presentation,
    build: (words, context = {}, options = {}) => win.AlloWordPracticeMedia.buildPptx({ words }, { mode: 'vocabulary', repetitions: 1, includeAudio: false, ...options }, undefined, { PptxGenJS: Presentation, ...context }) };
}
function expectReadable(pptx) {
  expect(paragraphs(pptx).length).toBeGreaterThan(0);
  for (const entry of paragraphs(pptx)) {
    expect(entry.options.fontSize).toBe(26);
    expect(entry.options.fit).toBeUndefined();
    expect(entry.options.h).toBeGreaterThan(0);
    expect(entry.options.y).toBeGreaterThanOrEqual(2.15);
    expect(entry.options.y + entry.options.h).toBeLessThanOrEqual(5.651);
  }
}

describe.each(Object.keys(lanes))('vocabulary PowerPoint pagination (%s)', lane => {
  it('splits 650 uninterrupted CJK characters into readable pages without dropping text', async () => {
    const definition = '漢'.repeat(650);
    const pptx = await setup(lane).build([{ word: '漢字', termLanguage: 'zh-Hant', definitionLanguage: 'zh-Hant', definition }]);
    expect(pptx.slides.length).toBeGreaterThanOrEqual(4);
    expect(paragraphs(pptx).map(entry => flatten(entry.text)).join('')).toBe(definition);
    // 26-point square glyphs cannot all fit a 3.5-inch body on one slide.
    for (const entry of paragraphs(pptx)) expect(flatten(entry.text).length).toBeLessThanOrEqual(180);
    expectReadable(pptx);
  });

  it.each([false, true])('respects 16 authored lines and preserves CRLF, tabs and spaces (fallback=%s)', async noSegmenter => {
    const definition = Array.from({ length: 16 }, (_, index) => 'Line ' + index + '  \t detail').join('\r\n');
    const pptx = await setup(lane, { noSegmenter }).build([{ word: 'Lines', definition }]);
    expect(pptx.slides.length).toBeGreaterThanOrEqual(3);
    const chunks = paragraphs(pptx).map(entry => flatten(entry.text));
    expect(chunks.join('')).toBe(definition);
    for (const chunk of chunks) expect(chunk.split(/\r\n|[\r\n]/).length).toBeLessThanOrEqual(6);
    expectReadable(pptx);
  });

  it.each([false, true])('keeps joined emoji, accents, flag pairs and whitespace across boundaries (fallback=%s)', async noSegmenter => {
    // The long unbroken run forces page cuts inside the repeated sequence;
    // line breaks alone could conceal a code-point-only fallback regression.
    const definition = ('漢👩🏽‍🏫e\u0301🇺🇸🇨🇦👨‍👩‍👧‍👦').repeat(80) + '  \t end\r\nfinish';
    const pptx = await setup(lane, { noSegmenter }).build([{ word: 'Graphemes', definition }]);
    const chunks = paragraphs(pptx).map(entry => flatten(entry.text));
    expect(chunks.join('')).toBe(definition);
    const boundaries = new Set([...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(definition)].map(part => part.index));
    let offset = 0;
    for (const chunk of chunks) { expect(boundaries.has(offset)).toBe(true); offset += chunk.length; }
    expect(offset).toBe(definition.length);
    expectReadable(pptx);
  });

  it('preserves example/translation labels and paragraph/run language metadata on continuation pages', async () => {
    const definition = ('Definición  con espacios.\n').repeat(25) + 'Fin.';
    const example = ('Exemple  avec espaces.\n').repeat(25) + 'Fin.';
    const translation = ('كلمة  عربية\n').repeat(30) + 'نهاية';
    const pptx = await setup(lane).build([{ word: 'Palabra', termLanguage: 'es', definition, definitionLanguage: 'es', example, exampleLanguage: 'fr-CA', translations: { 'pa-Arab': translation } }], {
      currentUiLanguage: 'German', labels: { pptx_example: 'Beispiel: ', pptx_part: 'Teil {n}/{total}' },
    });
    const blocks = paragraphs(pptx);
    const inLanguage = language => blocks.filter(entry => entry.options.lang === language);
    expect(inLanguage('es').map(entry => flatten(entry.text)).join('')).toBe(definition);
    expect(inLanguage('fr-CA').map(entry => flatten(entry.text)).join('')).toBe('Beispiel: ' + example);
    const translationLabel = new Intl.DisplayNames(['de'], { type: 'language', languageDisplay: 'standard' }).of('pa-Arab');
    expect(inLanguage('pa-Arab').map(entry => flatten(entry.text)).join('')).toBe(translationLabel + ':\n' + translation);
    expect(inLanguage('fr-CA').length).toBeGreaterThan(1);
    expect(inLanguage('pa-Arab').length).toBeGreaterThan(1);
    const exampleLabel = inLanguage('fr-CA')[0];
    expect(exampleLabel.text[0]).toMatchObject({ text: 'Beispiel: ', options: { lang: 'de', rtlMode: false } });
    expect(exampleLabel.text[1].options.lang).toBe('fr-CA');
    for (const entry of inLanguage('pa-Arab')) {
      expect(entry.options).toMatchObject({ rtlMode: true, align: 'right' });
      if (Array.isArray(entry.text)) {
        expect(entry.text[0].options).toMatchObject({ lang: 'de', rtlMode: false });
        expect(entry.text[1].options).toMatchObject({ lang: 'pa-Arab', rtlMode: true });
      }
    }
    for (const slide of pptx.slides) {
      const footer = slide.texts.find(entry => entry.options.y === 6.96);
      expect(flatten(footer.text)).toContain('Teil ');
      expect(footer.text.at(-1).options.lang).toBe('de');
    }
    expectReadable(pptx);
  });

  it('sizes a 120-character CJK heading for its box while retaining all heading text', async () => {
    const word = '漢'.repeat(120);
    const pptx = await setup(lane).build([{ word, termLanguage: 'zh-Hant', definition: 'Short definition.' }]);
    const heading = pptx.slides[0].texts.find(entry => entry.text === word);
    expect(heading).toBeTruthy();
    expect(heading.options.fontSize).toBeLessThanOrEqual(20);
    expect(heading.options.fontSize).toBeGreaterThanOrEqual(12);
    expect(heading.options.fit).toBeUndefined();
    expect(heading.options.lang).toBe('zh-Hant');
    // A square CJK glyph has about one em of advance; allow 35% leading.
    const estimatedLines = Math.ceil(word.length / Math.floor(heading.options.w * 72 / heading.options.fontSize));
    expect(estimatedLines * heading.options.fontSize * 1.35).toBeLessThanOrEqual(heading.options.h * 72);
  });

  it('treats pasted heading line breaks as word spacing without changing the authored meaning', async () => {
    const word = 'New\r\n  York\tCity';
    const definition = 'First line.\r\nSecond  line\twith spaces.';
    const original = { word, definition };
    const pptx = await setup(lane).build([original]);
    const heading = pptx.slides[0].texts.find(entry => entry.options.bold);
    expect(heading.text).toBe('New York City');
    expect(heading.options.fontSize).toBeGreaterThan(20);
    expect(heading.options.fit).toBeUndefined();
    expect(paragraphs(pptx).map(entry => flatten(entry.text)).join('')).toBe(definition);
    expect(original).toEqual({ word, definition });
  });

  it('avoids a continuation page containing only the final character of an unbroken field', async () => {
    const definition = '漢'.repeat(145);
    const pptx = await setup(lane).build([{ word: 'Tail', definition }]);
    const chunks = paragraphs(pptx).map(entry => flatten(entry.text));
    expect(pptx.slides).toHaveLength(2);
    expect(chunks.join('')).toBe(definition);
    expect(chunks.at(-1).length).toBeGreaterThan(1);
    expectReadable(pptx);
  });

  it('keeps a short meaning, example and translation together on one slide', async () => {
    const pptx = await setup(lane).build([{ word: 'Leaf', definition: 'A plant part.', example: 'The leaf is green.', translations: { Spanish: 'Hoja' } }]);
    expect(pptx.slides).toHaveLength(1);
    expect(paragraphs(pptx).map(entry => flatten(entry.text))).toEqual(['A plant part.', 'Example: The leaf is green.', 'Spanish:\nHoja']);
    expectReadable(pptx);
  });

  it('yields for cancellation before producing many continuation pages', async () => {
    let controller;
    const context = setup(lane, { onSlide: (count, win) => { if (count === 1) win.setTimeout(() => controller.abort(), 0); } });
    controller = new context.win.AbortController();
    await expect(context.build([{ word: 'Long', definition: '漢'.repeat(11000) }], { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(context.presentation().slides.length).toBeGreaterThan(0);
    expect(context.presentation().slides.length).toBeLessThanOrEqual(2);
  });

  it('attaches prepared audio only to the first continuation page', async () => {
    const pptx = await setup(lane).build([{ word: 'Leaf', definition: '漢'.repeat(650), wordAudio: wav }], {}, { includeAudio: true });
    expect(pptx.slides.length).toBeGreaterThan(1);
    expect(pptx.slides[0].media).toHaveLength(1);
    expect(pptx.slides[0].media[0]).toMatchObject({ type: 'audio', data: wav.replace(/^data:/, '') });
    expect(pptx.slides.slice(1).every(slide => slide.media.length === 0)).toBe(true);
  });
});
