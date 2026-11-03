import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const mediaPath = process.env.WORD_PRACTICE_MEDIA || 'word_practice_media.js';
const lanes = { source: ['word_practice_core.js', mediaPath].map(file => fs.readFileSync(file, 'utf8')).join('\n') };
if (!process.env.WORD_PRACTICE_MEDIA) lanes.runtime = fs.readFileSync('word_practice_module.js', 'utf8');
const vendor = fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8');
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const secret = 'ANSWER_ONLY';
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
const modes = [
  ['blend', 'blend_help', 4.8, true, 2],
  ['spelling', 'pptx_spell_advance', 3.8, false, 2],
  ['blend', 'pptx_no_sounds', 4.85, false, 1],
];
const AudioContext = class {
  async decodeAudioData() { return { sampleRate: 8000, length: 80, duration: 0.01, numberOfChannels: 1, getChannelData: () => new Float32Array(80) }; }
  async close() {}
};
function fixture(sounds = true, annotations = false) {
  return { title: 'Instruction capacity', words: [{ word: secret, termLanguage: 'English', wordAudio: wav,
    phonemes: sounds ? [{ label: 'a', audio: wav }, { label: 'b', audio: wav }] : [],
    annotations: annotations ? [{ id: 'n1', kind: 'note', content: 'Teacher note after the answer.', x: 50, y: 50 }] : [] }] };
}
function load(code, native = false, segmentation = 'native') {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window);
  if (segmentation === 'missing') window.Intl.Segmenter = undefined;
  window.eval(code);
  const captured = [];
  let Constructor;
  if (native) {
    window.eval(vendor + '\nwindow.NativeDeck = PptxGenJS;');
    Constructor = function () {
      const deck = new window.NativeDeck(), addSlide = deck.addSlide.bind(deck);
      deck.addSlide = (...args) => {
        const slide = addSlide(...args), texts = [], media = [], notes = [], addText = slide.addText.bind(slide), addMedia = slide.addMedia.bind(slide), addNotes = slide.addNotes.bind(slide);
        captured.push({ texts, media, notes });
        slide.addText = (text, options) => { texts.push({ text, options }); return addText(text, options); };
        slide.addMedia = options => { media.push(options); return addMedia(options); };
        slide.addNotes = value => { notes.push(value); return addNotes(value); };
        return slide;
      };
      return deck;
    };
  } else Constructor = class {
    addSlide() { const slide = { texts: [], media: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(options) { this.media.push(options); }, addNotes(text) { this.notes.push(text); }, addShape() {}, addImage() {} }; captured.push(slide); return slide; }
  };
  return { window, captured, Constructor, media: window.AlloWordPracticeMedia };
}
const options = mode => ({ mode, repetitions: 1, shuffle: false, includeAudio: false, cardFont: 'verdana', cardTextStyle: 'italic', cardTextScale: 1.4 });
const readerSettings = { baseFontSize: 48 };
function instructionParts(context, y) {
  const answer = context.captured.findIndex(slide => slide.texts.some(entry => flatten(entry.text) === secret));
  const prompts = y === 4.85 || answer < 0 ? context.captured : context.captured.slice(0, answer);
  return prompts.flatMap((slide, index) => slide.texts.filter(entry => entry.options.y === y || (entry.options.y === 1 && entry.options.h === 5.5)).map(entry => ({ ...entry, slide: index })));
}
function verifyParts(context, y, value, language, rtl) {
  const parts = instructionParts(context, y);
  expect(parts.length).toBeGreaterThan(0);
  expect(parts.map(part => flatten(part.text)).join('')).toBe(value);
  const boundaries = new Set([0, ...[...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(part => part.index + part.segment.length)]);
  let offset = 0;
  for (const part of parts) {
    expect(part.options.fontSize).toBeGreaterThanOrEqual(12);
    expect(part.options).toMatchObject({ lang: language, rtlMode: rtl });
    expect(part.options.fit).toBeUndefined();
    if (part.options.y !== 1) expect(part.options.y + part.options.h).toBeLessThanOrEqual(5.9000001);
    else expect(part.options.y + part.options.h).toBeLessThan(6.96);
    expect(boundaries.has(offset)).toBe(true);
    const runs = Array.isArray(part.text) ? part.text : [{ text: part.text }];
    for (const run of runs) { offset += run.text.length; expect(boundaries.has(offset)).toBe(true); }
  }
  expect(offset).toBe(value.length);
  return parts;
}

describe.each(Object.entries(lanes))('readable instruction captions (%s)', (_, code) => {
  it('retains ordinary short-label geometry, styles, phase counts and audio slots', async () => {
    for (const [mode, key, y, sounds, count] of modes) for (const style of ['regular', 'italic', 'bold-italic']) {
      const context = load(code);
      await context.media.buildPptx(fixture(sounds), { ...options(mode), cardTextStyle: style, cardTextScale: 1, includeAudio: true }, undefined, { PptxGenJS: context.Constructor, AudioContext, currentUiLanguage: 'English' });
      expect(context.captured).toHaveLength(count);
      const caption = context.captured[0].texts.find(entry => entry.options.y === y);
      expect(caption.options).toMatchObject({ x: key === 'pptx_no_sounds' ? 0.8 : 1, y, w: key === 'pptx_no_sounds' ? 11.7 : 11.3, h: 0.7, align: 'center', lang: 'en', rtlMode: false, italic: style !== 'regular', bold: style === 'bold-italic' });
      expect(typeof caption.text).toBe('string');
      expect(context.captured[0].media).toHaveLength(1);
      for (const media of context.captured.flatMap(slide => slide.media)) expect(media).toMatchObject({ y: 6.03, h: 0.48 });
    }
  });

  it.each([
    ['Korean', 'ko', '각'], ['Hindi', 'hi', 'क्षि'], ['Arabic', 'ar', 'بَّ'],
  ])('uses the reserved caption room before the audio lane for long %s instructions', async (currentUiLanguage, language, cluster) => {
    const context = load(code, false, 'missing'), help = cluster.repeat(80) + '\r\n' + cluster.repeat(12);
    const input = fixture(), original = JSON.stringify(input);
    await context.media.buildPptx(input, options('blend'), undefined, { PptxGenJS: context.Constructor, currentUiLanguage, labels: { blend_help: help }, readerSettings });
    const parts = verifyParts(context, 4.8, help, language, language === 'ar');
    expect(parts[0].options.h).toBeGreaterThan(0.7);
    expect(parts[0].options).toMatchObject({ italic: true, bold: false, align: language === 'ar' ? 'right' : 'left' });
    expect(Array.isArray(parts[0].text)).toBe(true);
    expect(JSON.stringify(input)).toBe(original);
    if (language === 'ko') expect(parts.length).toBeGreaterThan(1);
  });

  it('preserves 400-plus clusters, whitespace, audio phase and annotation placement through continuations', async () => {
    const context = load(code), help = '각'.repeat(410) + '\r\n  ' + 'क्षि'.repeat(12);
    await context.media.buildPptx(fixture(true, true), { ...options('blend'), includeAudio: true, cardTextStyle: 'bold-italic' }, undefined, { PptxGenJS: context.Constructor, AudioContext, currentUiLanguage: 'Korean', labels: { blend_help: help }, readerSettings });
    const parts = verifyParts(context, 4.8, help, 'ko', false), answer = context.captured.findIndex(slide => slide.texts.some(entry => flatten(entry.text) === secret));
    expect(parts.length).toBeGreaterThan(2); expect(answer).toBeGreaterThan(parts.at(-1).slide);
    for (const part of parts) {
      expect(part.options).toMatchObject({ italic: true, bold: true });
      if (part.slide) { expect(context.captured[part.slide].media).toHaveLength(0); expect(context.captured[part.slide].texts.map(entry => flatten(entry.text)).join('')).not.toContain(secret); }
    }
    expect(context.captured[0].media).toHaveLength(1); expect(context.captured[answer].media).toHaveLength(1);
    const annotation = context.captured.findIndex(slide => slide.texts.some(entry => flatten(entry.text).includes('Teacher note after the answer.')));
    expect(annotation).toBeGreaterThan(answer);
    expect(flatten(context.captured[0].texts.find(entry => entry.options.y === 6.96).text)).toContain('Part 1/');
    expect(flatten(context.captured[parts.at(-1).slide].texts.find(entry => entry.options.y === 6.96).text)).toContain('Part ' + parts.length + '/' + parts.length);
  });

  it('keeps spelling instructions before reveal and no-sound cards on their original word phase', async () => {
    for (const [mode, key, y, sounds] of modes.slice(1)) {
      const context = load(code), help = 'تعليمات '.repeat(140) + '\r\n' + 'خاتمة.';
      await context.media.buildPptx(fixture(sounds), { ...options(mode), includeAudio: true }, undefined, { PptxGenJS: context.Constructor, AudioContext, currentUiLanguage: 'Arabic', labels: { [key]: help }, readerSettings });
      const parts = verifyParts(context, y, help, 'ar', true), answer = context.captured.findIndex(slide => slide.texts.some(entry => flatten(entry.text) === secret));
      expect(parts.length).toBeGreaterThan(1); expect(context.captured[0].media).toHaveLength(1);
      for (const part of parts.slice(1)) expect(context.captured[part.slide].media).toHaveLength(0);
      if (mode === 'spelling') { expect(answer).toBeGreaterThan(parts.at(-1).slide); for (const part of parts) expect(context.captured[part.slide].texts.map(entry => flatten(entry.text)).join('')).not.toContain(secret); }
      else expect(answer).toBe(0);
    }
  });

  it('keeps unknown and fallback language metadata and a 12pt minimum at small reader settings', async () => {
    const unknown = load(code), help = 'Saved community instruction '.repeat(45);
    await unknown.media.buildPptx(fixture(), options('blend'), undefined, { PptxGenJS: unknown.Constructor, currentUiLanguage: 'Unmapped Community Language', labels: { blend_help: help }, readerSettings });
    verifyParts(unknown, 4.8, help, 'und', false);
    const small = load(code);
    await small.media.buildPptx(fixture(), { ...options('blend'), cardTextScale: 0.85 }, undefined, { PptxGenJS: small.Constructor, currentUiLanguage: 'Arabic', readerSettings: { baseFontSize: 10 } });
    const caption = small.captured[0].texts.find(entry => entry.options.y === 4.8);
    expect(caption.options).toMatchObject({ lang: 'en', rtlMode: false, fontSize: 12 });
  });

  it('serializes exact instruction content and own language/style without leaking the answer', async () => {
    const context = load(code, true), help = '각'.repeat(120) + '\r\n  ' + 'क्षि'.repeat(12) + ' & <end>';
    const deck = await context.media.buildPptx(fixture(), { ...options('blend'), cardTextStyle: 'bold-italic' }, undefined, { PptxGenJS: context.Constructor, currentUiLanguage: 'Korean', labels: { blend_help: help }, readerSettings });
    const parts = verifyParts(context, 4.8, help, 'ko', false);
    const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' }))), a = 'http://schemas.openxmlformats.org/drawingml/2006/main', p = 'http://schemas.openxmlformats.org/presentationml/2006/main';
    const serialized = [];
    for (const part of parts) {
      const xml = await zip.file('ppt/slides/slide' + (part.slide + 1) + '.xml').async('string');
      const doc = new context.window.DOMParser().parseFromString(xml, 'application/xml'); expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
      const shapes = [...doc.getElementsByTagNameNS(p, 'sp')].filter(shape => [...shape.getElementsByTagNameNS(a, 'off')].some(off => Math.abs(Number(off.getAttribute('y')) / 914400 - part.options.y) < 0.00001));
      expect(shapes).toHaveLength(1);
      const shape = shapes[0], runs = [...shape.getElementsByTagNameNS(a, 'rPr')];
      expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) { expect(run.getAttribute('lang')).toBe('ko'); expect(Number(run.getAttribute('sz'))).toBeGreaterThanOrEqual(1200); expect(run.getAttribute('b')).toBe('1'); expect(run.getAttribute('i')).toBe('1'); }
      serialized.push([...shape.getElementsByTagNameNS(a, 't')].map(node => node.textContent).join(''));
      expect(xml).not.toContain('normAutofit');
    }
    expect(serialized.join('').replace(/[\r\n]/g, '')).toBe(help.replace(/[\r\n]/g, ''));
  }, 60_000);
});
