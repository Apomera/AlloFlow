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
  addSlide() { const slide = { texts: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addNotes(value) { this.notes.push(value); } }; this.slides.push(slide); return slide; }
}
function load(code) { const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(code); return window.AlloWordPracticeMedia; }
const fixture = (prompt, language) => ({ title: 'Practice', words: [{ word: 'Leaf', termLanguage: 'English', sentenceActivity: { prompt, choices: ['Leaf', 'Root'], answer: 'Leaf', language } }] });
const options = { mode: 'sentence', repetitions: 1, includeAudio: false };
const cases = [
  ['English', 'en', 'Read the sentence.\nThen choose ____.', 'left'],
  ['Arabic', 'ar', 'اقرأ الجملة كاملة.\nثم اختر كلمة ____.', 'right'],
  ['ar-Latn', 'ar-Latn', 'Iqra al-jumla.\nThumma ikhtar ____.', 'left'],
  ['English', 'en', 'A '.repeat(60) + '____', 'left'],
  ['Japanese', 'ja', '葉'.repeat(61) + '____', 'left'],
  ['Korean', 'ko', '잎'.repeat(61) + '____', 'left'],
];

describe.each(Object.entries(sources))('sentence prose alignment (%s)', (_, code) => {
  it.each(cases)('starts %s compact prose at its own reading edge', async (language, lang, prompt, align) => {
    const input = fixture(prompt, language), before = JSON.stringify(input);
    const deck = await load(code).buildPptx(input, options, undefined, { PptxGenJS: Deck, currentUiLanguage: language === 'Arabic' ? 'English' : 'Arabic' });
    expect(deck.slides).toHaveLength(2);
    const passage = deck.slides[0].texts.find(entry => entry.text === prompt);
    expect(passage.options).toMatchObject({ y: 1.25, align, lang, rtlMode: align === 'right' });
    expect(deck.slides[0].texts.find(entry => entry.options.y === 4.05).options.align).toBe('center');
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    ['English', 'A plant has a ____.'], ['Arabic', 'هذه ____ خضراء.'], ['Japanese', '葉'.repeat(58) + '____'],
  ])('keeps %s prompts centered through the existing short-text threshold', async (language, prompt) => {
    const deck = await load(code).buildPptx(fixture(prompt, language), options, undefined, { PptxGenJS: Deck });
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0].texts.find(entry => entry.text === prompt).options).toMatchObject({ y: 1.25, align: 'center' });
  });

  it.each([['Arabic', 'right'], ['English', 'left']])('keeps %s continuation pages aligned to the same reading edge', async (language, align) => {
    const prompt = (language === 'Arabic' ? 'اقرأ النص بعناية. ' : 'Read the passage carefully. ').repeat(35) + '____';
    const deck = await load(code).buildPptx(fixture(prompt, language), options, undefined, { PptxGenJS: Deck });
    const passages = deck.slides.flatMap(slide => slide.texts).filter(entry => entry.options.y === 1 && entry.options.color === '172554');
    expect(passages.length).toBeGreaterThan(1);
    expect(passages.map(entry => entry.text).join('')).toBe(prompt);
    expect(passages.every(entry => entry.options.align === align)).toBe(true);
  });
});
