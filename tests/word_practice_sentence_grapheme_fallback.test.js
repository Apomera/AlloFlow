import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const mediaPath = process.env.WORD_PRACTICE_MEDIA || 'word_practice_media.js';
const lanes = { source: ['word_practice_core.js', mediaPath].map(file => fs.readFileSync(file, 'utf8')).join('\n') };
if (!process.env.WORD_PRACTICE_MEDIA) lanes.runtime = fs.readFileSync('word_practice_module.js', 'utf8');
const vendor = fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8');
const modes = ['native', 'missing', 'constructor', 'segment'];
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const ns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const pns = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
const boundaries = value => new Set([0, ...[...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(part => part.index + part.segment.length)]);

function load(code, mode) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window);
  if (mode === 'missing') window.Intl.Segmenter = undefined;
  if (mode === 'constructor') window.Intl.Segmenter = class { constructor() { throw Error('Unavailable'); } };
  if (mode === 'segment') window.Intl.Segmenter = class { segment() { throw Error('Unavailable'); } };
  window.eval(code);
  window.eval(vendor + '\nwindow.NativeDeck = PptxGenJS;');
  const captured = [];
  const NativeDeck = function () {
    const deck = new window.NativeDeck(), addSlide = deck.addSlide.bind(deck);
    deck.addSlide = (...args) => {
      const slide = addSlide(...args), addText = slide.addText.bind(slide), texts = [];
      captured.push(texts);
      slide.addText = (text, options) => { texts.push({ text: flatten(text), runs: Array.isArray(text) ? text.map(run => ({ text: run.text, breakLine: !!run.options?.breakLine })) : null, options }); return addText(text, options); };
      return slide;
    };
    return deck;
  };
  return { window, media: window.AlloWordPracticeMedia, NativeDeck, captured };
}

async function serialize(context, deck) {
  const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
  const files = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  const shapes = [];
  for (const [index, file] of files.entries()) {
    const doc = new context.window.DOMParser().parseFromString(await zip.file(file).async('string'), 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    const page = [...doc.getElementsByTagNameNS(pns, 'sp')].map(shape => [...shape.getElementsByTagNameNS(ns, 'p')].map(paragraph => [...paragraph.getElementsByTagNameNS(ns, 't')].map(node => node.textContent).join('')).join('\n'));
    expect(page).toHaveLength(context.captured[index].length);
    for (const [at, text] of page.entries()) {
      const entry = context.captured[index][at];
      const expected = entry.runs ? entry.runs.map(run => run.text.replace(/\r\n?/g, '\n') + (run.breakLine ? '\n' : '')).join('') : entry.text.replace(/\r\n?/g, '\n');
      expect(text).toBe(expected);
    }
    shapes.push(page);
  }
  expect(shapes).toHaveLength(context.captured.length);
  return shapes;
}

const options = { mode: 'sentence', repetitions: 1, shuffle: false, includeAudio: false, cardTextScale: 1.4, cardFont: 'verdana', cardTextStyle: 'italic' };
const readerSettings = { baseFontSize: 48 };
const passages = [
  ['Korean', 'ko', '각'],
  ['Korean', 'ko', '각'],
  ['Hindi', 'hi', 'क्षि'],
  ['Bengali', 'bn', 'ক্ষি'],
];
const captions = [
  ['Korean', '각'], ['Korean', '각'], ['Hindi', 'क्षि'], ['Bengali', 'ক্ষি'],
  ['Arabic', 'بَّ'], ['English', '👩🏽‍🌾'], ['English', '🇨🇦'],
];

describe.each(Object.entries(lanes))('PowerPoint grapheme fallbacks (%s)', (_, code) => {
  it.each(modes)('keeps full syllables at high-scale continuation boundaries when segmentation is %s', async mode => {
    const context = load(code, mode);
    for (const [language, tag, cluster] of passages) {
      const prompt = cluster.repeat(36) + '\r\n' + cluster.repeat(18) + '____';
      const input = { title: 'Continuation boundaries', words: [{ word: 'Leaf', termLanguage: 'English', sentenceActivity: { prompt, language, choices: ['Leaf', 'Root'], answer: 'Leaf' } }] };
      const before = JSON.stringify(input), first = context.captured.length;
      const deck = await context.media.buildPptx(input, options, undefined, { PptxGenJS: context.NativeDeck, readerSettings });
      const text = context.captured.slice(first).flat().filter(entry => entry.options.y === 1 && entry.options.lang === tag).map(entry => entry.text);
      expect(text.length).toBeGreaterThan(1);
      expect(text.join('')).toBe(prompt);
      const safe = boundaries(prompt); let at = 0;
      for (const part of text) { expect(safe.has(at), language + ' start').toBe(true); at += part.length; expect(safe.has(at), language + ' end').toBe(true); }
      // Each deck is serialized by the shipped exporter, not a stub layout.
      // Only the newly captured slides belong to this deck.
      const deckCapture = { ...context, captured: context.captured.slice(first) };
      await serialize(deckCapture, deck);
      expect(JSON.stringify(input)).toBe(before);
    }
  }, 60_000);

  it.each(modes)('keeps whole graphemes at fitted italic line breaks when segmentation is %s', async mode => {
    const context = load(code, mode);
    for (const [currentUiLanguage, cluster] of captions) {
      const help = cluster.repeat(80) + '\r\n' + cluster.repeat(12), first = context.captured.length;
      const input = { words: [{ word: 'Leaf', phonemes: ['l', 'ea', 'f'] }] };
      const deck = await context.media.buildPptx(input, { ...options, mode: 'blend' }, undefined, { PptxGenJS: context.NativeDeck, currentUiLanguage, labels: { blend_help: help }, readerSettings });
      const pages = context.captured.slice(first);
      const answer = pages.findIndex(page => page.some(entry => entry.options.x === 0.7 && entry.options.y === 2 && entry.text === 'Leaf'));
      expect(answer).toBeGreaterThan(0);
      const captions = pages.slice(0, answer).flat().filter(entry => entry.options.y === 4.8 || (entry.options.y === 1 && entry.options.h === 5.5));
      expect(captions.length).toBeGreaterThan(0);
      expect(captions.map(caption => caption.text).join('')).toBe(help);
      const safe = boundaries(help); let at = 0, lineCount = 0;
      for (const caption of captions) {
        expect(caption.options.italic).toBe(true); expect(caption.options.fontSize).toBeGreaterThanOrEqual(12);
        const lines = caption.runs ? caption.runs.map(run => run.text) : [caption.text]; lineCount += lines.length;
        for (const line of lines) { at += line.length; expect(safe.has(at), currentUiLanguage + ' line end').toBe(true); }
      }
      expect(lineCount).toBeGreaterThan(1);
      await serialize({ ...context, captured: context.captured.slice(first) }, deck);
    }
  }, 60_000);
});
