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
  constructor() { this.slides = []; Deck.last = this; }
  addSlide() {
    const slide = { texts: [], media: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(media) { this.media.push(media); }, addNotes(text) { this.notes.push(text); } };
    this.slides.push(slide); return slide;
  }
}
function load(lane) {
  const { window } = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  windows.push(window); window.eval(sources[lane]); return window;
}
const audio = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const choices = ['Leaf', ...Array.from({ length: 5 }, (_, n) => 'Option ' + (n + 2) + ': ' + 'prepared choice '.repeat(7))];
const fixture = (prompt, values = choices) => ({ language: 'en', words: [{ word: 'Leaf', wordAudio: audio, sentenceActivity: { prompt, choices: values, answer: 'Leaf' } }] });
const opts = { mode: 'sentence', repetitions: 1, shuffle: false, includeAudio: true };
const body = slide => slide.texts.find(entry => entry.options.y === 1.0);
const flatten = text => Array.isArray(text) ? text.map(run => run.text).join('') : text;

describe.each(Object.keys(sources))('sentence PowerPoint pagination (%s)', lane => {
  it('preserves a short sentence card and keeps answer audio on the reveal', async () => {
    const win = load(lane);
    const deck = await win.AlloWordPracticeMedia.buildPptx(fixture('A plant has a ____.', ['Leaf', 'Stem']), opts, undefined, { PptxGenJS: Deck });
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0].texts.find(entry => entry.text === 'A plant has a ____.').options).toMatchObject({ y: 1.25, fontSize: 34 });
    expect(deck.slides[0].media).toHaveLength(0); expect(deck.slides[1].media).toHaveLength(1);
  });

  it.each([
    ['a 400-character wide-script prompt', '植'.repeat(395) + ' ____', ['Leaf', 'Stem']],
    ['four choices with wide-script text', 'The plant has a ____.', ['Leaf', '植物'.repeat(25), '阳光'.repeat(25), '水分'.repeat(25)]],
  ])('uses readable continuation pages for %s even below the character limits', async (_, prompt, values) => {
    const win = load(lane);
    const deck = await win.AlloWordPracticeMedia.buildPptx(fixture(prompt, values), opts, undefined, { PptxGenJS: Deck });
    expect(deck.slides.length).toBeGreaterThan(2);
    expect(deck.slides.slice(0, -1).every(slide => body(slide)?.options.fontSize === 28)).toBe(true);
    const prompts = deck.slides.filter(slide => body(slide)?.options.color === '172554');
    expect(prompts.map(slide => body(slide).text).join('')).toBe(prompt);
  });

  it.each([
    ['English', 'First paragraph.\n\n' + 'A leaf catches sunlight to help the plant grow. '.repeat(80) + '\nThe plant has a ____.'],
    ['Arabic', 'نص عن النباتات.\n\n' + 'تحتاج النباتات إلى الضوء والماء لتنمو. '.repeat(70) + '\n____'],
    ['Chinese (Simplified)', '观察植物。\n\n' + '植物需要阳光和水才能健康生长。'.repeat(100) + '\n____'],
    ['English', ('e\u0301 👩🏽‍🔬 知識 ' + '\n').repeat(180) + '____'],
  ])('preserves complete %s prompt before any choices, with readable fixed-size pages', async (language, prompt) => {
    const win = load(lane), input = fixture(prompt); input.language = language;
    const deck = await win.AlloWordPracticeMedia.buildPptx(input, opts, undefined, { PptxGenJS: Deck, labels: { pptx_part: 'Section {n}/{total}' } });
    const promptPages = deck.slides.filter(slide => body(slide)?.options.color === '172554');
    const choicePages = deck.slides.filter(slide => body(slide)?.options.color === '1E3A8A');
    expect(promptPages.length).toBeGreaterThan(1); expect(choicePages.length).toBeGreaterThan(0);
    expect(promptPages.map(slide => body(slide).text).join('')).toBe(prompt);
    expect(deck.slides.slice(0, promptPages.length)).toEqual(promptPages);
    const expected = win.AlloWordPracticeCore.normalizeInput(input).items[0].sentenceActivity.choices.map((choice, n) => String.fromCharCode(65 + n) + '. ' + choice).join('\n');
    expect(choicePages.map(slide => body(slide).text).join('\n')).toBe(expected);
    const boundaries = new Set(Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(prompt), part => part.index));
    let offset = 0;
    for (const slide of promptPages) { expect(boundaries.has(offset)).toBe(true); offset += body(slide).text.length; }
    for (const slide of deck.slides.slice(0, -1)) {
      const content = body(slide); expect(content.options.fontSize).toBeGreaterThanOrEqual(24); expect(content.options.fit).toBeUndefined();
      expect(content.options.rtlMode).toBe(language === 'Arabic');
      expect(slide.media).toHaveLength(0);
      expect(flatten(slide.texts[1].text)).toContain('Section ');
    }
    const answer = deck.slides.at(-1); expect(answer.texts.some(entry => entry.text === 'Leaf')).toBe(true); expect(answer.media).toHaveLength(1);
    expect(flatten(answer.texts[1].text)).toContain('Answer');
  });

  it('honors explicit blank lines and yields to cancellation before creating more pages', async () => {
    const win = load(lane), signal = new win.AbortController();
    const prompt = 'Start\n' + '\n'.repeat(100) + 'End ____';
    const promise = win.AlloWordPracticeMedia.buildPptx(fixture(prompt), opts, undefined, { PptxGenJS: Deck, signal: signal.signal });
    win.setTimeout(() => signal.abort(), 0);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(Deck.last.slides.length).toBeLessThan(4);
    expect(Deck.last.slides.every(slide => slide.media.length === 0)).toBe(true);
  });

  it('sizes the entire answer phrase and corner words instead of overflowing a fixed text box', async () => {
    const win = load(lane);
    const phrase = 'A community of organisms interacting with their surroundings';
    const input = { words: [{ word: phrase, sentenceActivity: { prompt: 'An ecosystem is ____.', choices: [phrase, 'One organism'], answer: phrase } }] };
    const deck = await win.AlloWordPracticeMedia.buildPptx(input, opts, undefined, { PptxGenJS: Deck });
    const answer = deck.slides.at(-1).texts.find(entry => entry.text === phrase);
    expect(answer.options.fontSize).toBeGreaterThanOrEqual(24); expect(answer.options.fontSize).toBeLessThan(60); expect(answer.options.fit).toBeUndefined();
    const pack = win.AlloWordPracticeCore.normalizeInput({ words: [(phrase + ' in a shared environment with many living and nonliving parts').slice(0, 120)] });
    const popup = await win.AlloWordPracticeMedia.buildPptx(pack, { mode: 'popup', includeAudio: false }, [{ itemId: pack.items[0].id, position: 'bottom-right', scale: 1.3 }], { PptxGenJS: Deck });
    const corner = popup.slides[0].texts.find(entry => entry.options.y === 3.65);
    expect(corner.text).toBe(pack.items[0].word); expect(corner.options.fontSize).toBeLessThan(30); expect(corner.options.fontSize).toBeGreaterThanOrEqual(19);
  });
});
