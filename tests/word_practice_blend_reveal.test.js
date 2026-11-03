import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const source = ['word_practice_core.js', 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
// Build in memory while another owner is working on the shared UI/generated file.
const bundled = require('../_build_word_practice_module.js').buildWordPracticeModule();
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
class Deck {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], sounds: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(options) { this.sounds.push(options); }, addNotes(text) { this.notes.push(text); }, addShape() {} };
    this.slides.push(slide); return slide;
  }
}
function load(code) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(code);
  return window.AlloWordPracticeMedia;
}
const AudioContext = class {
  async decodeAudioData() { return { sampleRate: 8000, length: 80, duration: 0.01, numberOfChannels: 1, getChannelData: () => new Float32Array(80) }; }
  async close() {}
};

describe.each([['source', source], ['bundled in memory', bundled]])('PowerPoint reveal and independent sizes (%s)', (_, code) => {
  it.each([
    ['English', 'ship', ['sh', 'i', 'p'], 'en', false],
    ['Arabic', 'كتب', ['ك', 'ت', 'ب'], 'ar', true],
  ])('keeps %s words and their recordings off the sound prompt, with notes after the answer', async (language, word, labels, lang, rtlMode) => {
    const input = { title: 'Practice', words: [{ word, termLanguage: language, wordAudio: wav, phonemes: labels.map(label => ({ label, audio: wav })), annotations: [{ kind: 'note', content: 'Teacher clue stays after the answer.', x: 50, y: 40 }] }] };
    const before = JSON.stringify(input);
    const deck = await load(code).buildPptx(input, { mode: 'blend', repetitions: 1 }, undefined, { PptxGenJS: Deck, AudioContext });
    expect(deck.slides.length).toBeGreaterThan(2);
    const [prompt, answer, ...notes] = deck.slides;
    const visible = slide => slide.texts.map(entry => flatten(entry.text));
    expect(visible(prompt).join('\n')).not.toContain(word);
    expect(visible(prompt)).toContain(labels.join('  ·  '));
    expect(visible(prompt)).toContain('Say the sounds, then blend the word.');
    expect(visible(prompt)).toContain('Hear sounds');
    expect(visible(prompt)).not.toContain('Hear word');
    expect(prompt.sounds).toHaveLength(1);
    expect(prompt.sounds[0].data).not.toBe(wav.replace(/^data:/, ''));
    expect(visible(answer)).toContain(word);
    expect(visible(answer)).toContain('Hear word');
    expect(visible(answer)).not.toContain('Hear sounds');
    expect(answer.sounds).toHaveLength(1);
    expect(answer.sounds[0].data).toBe(wav.replace(/^data:/, ''));
    expect(prompt.texts.find(entry => entry.text === labels.join('  ·  ')).options).toMatchObject({ lang, rtlMode });
    expect(answer.texts.find(entry => entry.text === word).options).toMatchObject({ lang, rtlMode });
    expect(notes.flatMap(visible)).toContain('Teacher clue stays after the answer.');
    expect([...visible(prompt), ...visible(answer)]).not.toContain('Teacher clue stays after the answer.');
    expect(JSON.stringify(input)).toBe(before);
  });

  it('keeps words with no prepared phonemes on one slide and avoids partial sound recordings', async () => {
    const media = load(code);
    const wordOnly = await media.buildPptx({ words: [{ word: 'leaf', wordAudio: wav }] }, { mode: 'blend', repetitions: 1 }, undefined, { PptxGenJS: Deck, AudioContext });
    expect(wordOnly.slides).toHaveLength(1);
    expect(wordOnly.slides[0].texts.map(entry => flatten(entry.text))).toContain('leaf');
    expect(wordOnly.slides[0].texts.map(entry => flatten(entry.text))).toContain('No sound sequence is prepared for this word.');
    const incomplete = await media.buildPptx({ words: [{ word: 'leaf', wordAudio: wav, phonemes: [{ label: 'l', audio: wav }, { label: 'ea' }] }] }, { mode: 'blend', repetitions: 1 }, undefined, { PptxGenJS: Deck, AudioContext });
    expect(incomplete.slides).toHaveLength(2);
    expect(incomplete.slides[0].sounds).toHaveLength(0);
    expect(incomplete.slides[1].sounds).toHaveLength(1);
    expect(incomplete.wordPracticeWarnings).toHaveLength(1);
  });

  it('uses each learning-text size once and keeps translation captions proportional', async () => {
    const input = { words: [{ word: 'Leaf', termLanguage: 'English', definition: 'A plant part.', definitionLanguage: 'English', translations: { Arabic: 'ورقة النبات' } }] };
    const options = { mode: 'vocabulary', repetitions: 1, includeAudio: false, wordTextScale: 0.85, meaningTextScale: 1.2, translationTextScale: 1.4 };
    for (const baseFontSize of [16, 32]) {
      const deck = await load(code).buildPptx(input, options, undefined, { PptxGenJS: Deck, readerSettings: { baseFontSize } });
      const scale = baseFontSize / 16, all = deck.slides.flatMap(slide => slide.texts);
      const word = all.find(entry => entry.text === 'Leaf'), definition = all.find(entry => entry.text === 'A plant part.');
      const translation = all.find(entry => Array.isArray(entry.text) && entry.text[1]?.text === 'ورقة النبات');
      if (baseFontSize === 16) expect(word.options.fontSize).toBeCloseTo(48 * 0.85);
      expect(definition.options.fontSize).toBeCloseTo(26 * 1.2 * scale);
      expect(translation.options.fontSize).toBeCloseTo(26 * 1.4 * scale);
      expect(translation.text[0].options.fontSize).toBeCloseTo(20 * 1.4 * scale);
      expect(translation.options).toMatchObject({ lang: 'ar', rtlMode: true, align: 'right' });
    }
  });

  it('preserves every multilingual character when independently enlarged sections paginate', async () => {
    const definition = '植物は光を受けて育ちます。\n\n葉を観察します。'.repeat(16);
    const translated = 'تلتقط الورقة الضوء.\nتنمو النباتات. '.repeat(16);
    const deck = await load(code).buildPptx({ words: [{ word: '葉', termLanguage: 'Japanese', definition, definitionLanguage: 'Japanese', translations: { Arabic: translated } }] }, { mode: 'vocabulary', repetitions: 1, includeAudio: false, cardTextScale: 1.4, meaningTextScale: 1.4, translationTextScale: 0.85 }, undefined, { PptxGenJS: Deck, readerSettings: { baseFontSize: 48 } });
    const passages = deck.slides.flatMap(slide => slide.texts).filter(entry => entry.options.y >= 2.15 && entry.options.y < 5.65);
    const body = entry => Array.isArray(entry.text) ? entry.text[1].text : entry.text;
    expect(passages.filter(entry => entry.options.lang === 'ja').map(body).join('')).toBe(definition);
    expect(passages.filter(entry => entry.options.lang === 'ar').map(body).join('')).toBe(translated.trim());
    const caption = passages.find(entry => Array.isArray(entry.text));
    expect(caption.text[1].text.trim()).not.toBe('');
    expect(passages.every(entry => entry.options.fontSize >= 12 && entry.options.y + entry.options.h <= 5.65 + 0.001)).toBe(true);
  });
});
