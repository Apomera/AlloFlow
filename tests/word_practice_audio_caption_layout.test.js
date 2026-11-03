import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const source = [process.env.CARD_CORE_PATH || 'word_practice_core.js', process.env.CARD_MEDIA_PATH || 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const lanes = { source };
if (!process.env.CARD_MEDIA_PATH) lanes.runtime = fs.readFileSync('word_practice_module.js', 'utf8');
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXwkAAAAASUVORK5CYII=';
class Deck {
  constructor() { this.slides = []; }
  addSlide() { const slide = { texts: [], media: [], images: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(options) { this.media.push(options); }, addImage(options) { this.images.push(options); }, addNotes() {} }; this.slides.push(slide); return slide; }
}
const AudioContext = class {
  async decodeAudioData() { return { sampleRate: 8000, length: 80, duration: 0.01, numberOfChannels: 1, getChannelData: () => new Float32Array(80) }; }
  async close() {}
};
function load(code) { const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(code); return { win: window, media: window.AlloWordPracticeMedia }; }
const flatten = text => Array.isArray(text) ? text.map(run => run.text).join('') : text;
const input = () => ({ title: 'Practice', words: [{ word: 'Leaf', wordAudio: wav, phonemes: [{ label: 'l', audio: wav }, { label: 'ea', audio: wav }] }] });
const options = { mode: 'popup', repetitions: 1, includeAudio: true, cardFont: 'verdana' };
const labels = [
  ['French', 'fr', 'Écouter le mot', 'Écouter les sons'], ['Arabic', 'ar', 'استمع إلى الكلمة', 'استمع إلى الأصوات'],
  ['Hindi', 'hi', 'शब्द सुनो', 'ध्वनियाँ सुनो'], ['Tamil', 'ta', 'சொல்லைக் கேள்', 'ஒலிகளைக் கேள்'], ['Russian', 'ru', 'Послушать слово', 'Послушать звуки'],
];

describe.each(Object.entries(lanes))('multilingual audio-caption layout (%s)', (_, code) => {
  it.each(labels)('keeps real %s labels at 14 pt inside non-overlapping playback slots', async (currentUiLanguage, lang, hear_word, hear_sounds) => {
    const { media } = load(code), deck = await media.buildPptx(input(), options, undefined, { PptxGenJS: Deck, AudioContext, currentUiLanguage, labels: { hear_word, hear_sounds } });
    const first = deck.slides[0], captions = first.texts.filter(entry => entry.options.y === 6.06), rtl = lang === 'ar';
    expect(captions.map(entry => flatten(entry.text))).toEqual([hear_word, hear_sounds]);
    expect(first.media).toHaveLength(2);
    for (const [index, caption] of captions.entries()) {
      expect(caption.options).toMatchObject({ fontSize: 14, lang, rtlMode: rtl, align: rtl ? 'right' : 'left' });
      expect(caption.options.fit).toBeUndefined();
      expect(caption.options.y + caption.options.h).toBeLessThan(6.55);
      const icon = first.media[index];
      if (rtl) expect(caption.options.x + caption.options.w + 0.09).toBeLessThanOrEqual(icon.x);
      else expect(icon.x + icon.w + 0.09).toBeLessThanOrEqual(caption.options.x);
    }
    expect(Math.max(captions[0].options.x + captions[0].options.w, first.media[0].x + first.media[0].w)).toBeLessThan(Math.min(captions[1].options.x, first.media[1].x));
    expect(first.media[0].data).toBe(wav.replace(/^data:/, ''));
  });

  it('fits unusually long captions with explicit lines and preserves every source character', async () => {
    const { media } = load(code), hear_word = 'Écouter attentivement le mot enregistré avant de le prononcer à voix haute.', hear_sounds = 'Écouter chaque son enregistré, puis les assembler pour retrouver le mot entier.';
    const deck = await media.buildPptx(input(), options, undefined, { PptxGenJS: Deck, AudioContext, currentUiLanguage: 'French', labels: { hear_word, hear_sounds } });
    const captions = deck.slides[0].texts.filter(entry => entry.options.y === 6.06);
    expect(captions.map(entry => flatten(entry.text))).toEqual([hear_word, hear_sounds]);
    for (const caption of captions) {
      expect(Array.isArray(caption.text)).toBe(true);
      expect(caption.text.some(run => run.options.breakLine)).toBe(true);
      expect(caption.options.fontSize).toBeGreaterThanOrEqual(10);
      expect(caption.options.fontSize).toBeLessThanOrEqual(14);
      expect(caption.options.h).toBe(0.45);
    }
  });

  it('leaves picture credits above playback and keeps fallback captions in their actual language', async () => {
    const { media } = load(code), pack = input();
    pack.words[0].definition = 'A plant part.'; pack.words[0].picture = { src: png, alt: 'Leaf', credit: 'Photo credit '.repeat(30) };
    const deck = await media.buildPptx(pack, { ...options, mode: 'vocabulary' }, undefined, { PptxGenJS: Deck, AudioContext, currentUiLanguage: 'Arabic' });
    const first = deck.slides[0], audioTop = Math.min(...first.media.map(entry => entry.y));
    const credits = first.texts.filter(entry => entry.options.lang === 'und' && entry.options.fontSize === 12);
    expect(credits.length).toBeGreaterThan(0);
    for (const credit of credits) expect(credit.options.y + credit.options.h + 0.1).toBeLessThanOrEqual(audioTop);
    expect(first.texts.filter(entry => entry.options.y === 6.06).map(entry => [flatten(entry.text), entry.options.lang, entry.options.rtlMode])).toEqual([['Hear word', 'en', false], ['Hear sounds', 'en', false]]);
  });

  it('preserves full translated captions and metadata in real PowerPoint runs', async () => {
    const { win, media } = load(code); win.eval(fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8') + '\nwindow.NativeDeck = PptxGenJS;');
    const hear_word = 'Écouter attentivement le mot enregistré avant de le prononcer à voix haute.';
    const deck = await media.buildPptx(input(), options, undefined, { PptxGenJS: win.NativeDeck, AudioContext, currentUiLanguage: 'French', labels: { hear_word } });
    const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
    const xml = await zip.file('ppt/slides/slide1.xml').async('string'), doc = new win.DOMParser().parseFromString(xml, 'application/xml'), ns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const runs = [...doc.getElementsByTagNameNS(ns, 'r')].filter(run => run.getElementsByTagNameNS(ns, 'rPr')[0]?.getAttribute('lang') === 'fr');
    expect(runs.map(run => run.getElementsByTagNameNS(ns, 't')[0]?.textContent || '').join('')).toBe(hear_word);
    expect(xml).not.toContain('normAutofit');
  });
});
