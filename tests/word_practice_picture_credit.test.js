import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const source = ['word_practice_core.js', 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const bundled = require('../_build_word_practice_module.js').buildWordPracticeModule();
const vendor = fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXwkAAAAASUVORK5CYII=';
const wav = (() => {
  const bytes = Buffer.alloc(44 + 1600); bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(1600, 40);
  for (let n = 0; n < 800; n++) bytes.writeInt16LE(Math.round(Math.sin(n * Math.PI * 2 * 440 / 8000) * 1500), 44 + n * 2);
  return 'data:audio/wav;base64,' + bytes.toString('base64');
})();
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
class Deck {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], images: [], media: [], addText(text, options) { this.texts.push({ text, options }); }, addImage(options) { this.images.push(options); }, addMedia(options) { this.media.push(options); }, addNotes() {} };
    this.slides.push(slide); return slide;
  }
}
function load(code) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(code);
  return { win: window, media: window.AlloWordPracticeMedia };
}
const flatten = text => Array.isArray(text) ? text.map(run => run.text).join('') : text;
const pack = credit => ({ title: 'Practice', words: [{ word: 'Leaf', definition: 'A plant part.', picture: { src: png, alt: 'A green leaf', credit } }] });
const options = { mode: 'vocabulary', repetitions: 1, includeAudio: false };
const creditParts = deck => deck.slides.flatMap(slide => slide.texts).filter(entry => entry.options.lang === 'und' && entry.options.fontSize === 12 && entry.options.x === 1 && entry.options.y >= 2.15 && entry.options.y <= 6.15);
const latin = ('Photo by the Community Garden Collective, CC BY 4.0. Source https://example.test/garden/leaf — full attribution details. ').repeat(5).slice(0, 400);
const arabic = ('الصورة من حديقة المدرسة، تصوير فريق المجتمع المحلي. يحفظ هذا النص اسم المصور وتفاصيل الترخيص والمصدر. ').repeat(5).slice(0, 400);

describe.each([['source', source], ['bundled in memory', bundled]])('readable PowerPoint picture credits (%s)', (_, code) => {
  it('keeps the existing picture space and short-credit position', async () => {
    const { media } = load(code);
    const bare = await media.buildPptx(pack(''), options, undefined, { PptxGenJS: Deck });
    expect(bare.slides).toHaveLength(2);
    expect(bare.slides[0].images[0]).toMatchObject({ y: 2.15, h: 4.35 });
    expect(creditParts(bare)).toHaveLength(0);
    const short = await media.buildPptx(pack('Teacher photo · CC BY 4.0'), options, undefined, { PptxGenJS: Deck });
    expect(short.slides).toHaveLength(2);
    expect(short.slides[0].images[0]).toMatchObject({ y: 2.15, h: 3.9 });
    const [credit] = creditParts(short);
    expect(credit.text).toBe('Teacher photo · CC BY 4.0');
    expect(credit.options).toMatchObject({ y: 6.15, h: 0.4, fontSize: 12, align: 'center', lang: 'und', rtlMode: false });
    expect(credit.options.fit).toBeUndefined();
  });

  it.each([[latin, false], [arabic, true], ['123 · \n«حقوق الصورة محفوظة للمصور» — https://example.test', true], ['2026 · https://example.test/source\r\nحقوق الصورة محفوظة للمصور\r\nCC BY 4.0', false], ['https://example.test/' + 'very-long-source-address-'.repeat(20), false]])('reserves readable credit space and keeps unknown language for its writing direction', async (raw, rtlMode) => {
    const { media } = load(code), input = pack(raw), saved = JSON.stringify(input);
    const deck = await media.buildPptx(input, { ...options, cardFont: 'verdana' }, undefined, { PptxGenJS: Deck });
    const credits = creditParts(deck);
    expect(credits.map(entry => flatten(entry.text)).join('')).toBe(raw.trim().slice(0, 400));
    for (const credit of credits) {
      expect(credit.options).toMatchObject({ fontSize: 12, lang: 'und', rtlMode });
      expect(credit.options.fit).toBeUndefined();
      expect(credit.options.y + credit.options.h).toBeLessThanOrEqual(6.55 + 1e-9);
    }
    const image = deck.slides[0].images[0], first = credits[0];
    expect(image.y + image.h + 0.09).toBeLessThanOrEqual(first.options.y);
    expect(image.w / image.h).toBeCloseTo(1);
    if (raw === latin || raw === arabic) expect(first.options.h).toBeGreaterThan(0.4);
    expect(JSON.stringify(input)).toBe(saved);
  });

  it('continues pathological line breaks before the meaning without shrinking or losing characters', async () => {
    const { media } = load(code), credit = Array.from({ length: 55 }, (_, n) => 'Line ' + n).join('\r\n').slice(0, 400).trim();
    const deck = await media.buildPptx(pack(credit), { ...options, cardTextStyle: 'italic', cardTextScale: 1.4 }, undefined, { PptxGenJS: Deck, readerSettings: { baseFontSize: 48 } });
    const credits = creditParts(deck);
    expect(credits.length).toBeGreaterThan(2);
    expect(credits.map(entry => flatten(entry.text)).join('')).toBe(credit);
    const meanings = deck.slides.flatMap(slide => slide.texts).filter(entry => entry.options.color === '1E293B');
    expect(meanings.map(entry => flatten(entry.text)).join('')).toBe('A plant part.');
    const lastCredit = deck.slides.findLastIndex(slide => slide.texts.some(entry => credits.includes(entry)));
    const firstMeaning = deck.slides.findIndex(slide => slide.texts.some(entry => meanings.includes(entry)));
    expect(lastCredit).toBeLessThan(firstMeaning);
    for (const entry of credits) {
      expect(entry.options).toMatchObject({ italic: true, bold: false, fontSize: 12 });
      expect(entry.options.y + entry.options.h).toBeLessThanOrEqual(6.55 + 1e-9);
    }
  });

  it.each(['', 'Teacher photo · CC BY 4.0', latin, Array.from({ length: 30 }, (_, n) => 'Line ' + n).join('\n')])('reserves the first picture slide audio lane without repeating playable recordings on continuations', async credit => {
    const { media } = load(code), input = pack(credit); input.words[0].wordAudio = wav;
    const deck = await media.buildPptx(input, { ...options, includeAudio: true }, undefined, { PptxGenJS: Deck });
    const first = deck.slides[0], audioTop = Math.min(...first.media.map(entry => entry.y));
    expect(first.media).toHaveLength(1);
    expect(first.media[0].data).toBe(wav.replace(/^data:/, ''));
    expect(deck.slides.slice(1).flatMap(slide => slide.media)).toHaveLength(0);
    const image = first.images[0];
    expect(image.y + image.h + 0.1).toBeLessThanOrEqual(audioTop);
    for (const entry of first.texts.filter(entry => creditParts(deck).includes(entry))) expect(entry.options.y + entry.options.h + 0.1).toBeLessThanOrEqual(audioTop);
    expect(creditParts(deck).map(entry => flatten(entry.text)).join('')).toBe(credit);
  });

  it('reserves the lane for sound-only recordings and keeps recall picture slides free of answer audio', async () => {
    const { media } = load(code), input = pack(latin);
    input.words[0].phonemes = [{ label: 'l', audio: wav }];
    const AudioContext = class {
      async decodeAudioData() { return { sampleRate: 8000, length: 800, duration: 0.1, numberOfChannels: 1, getChannelData: () => new Float32Array(800) }; }
      async close() {}
    };
    const sounds = await media.buildPptx(input, { ...options, includeAudio: true }, undefined, { PptxGenJS: Deck, AudioContext });
    expect(sounds.slides[0].media).toHaveLength(1);
    for (const entry of creditParts(sounds).filter(entry => sounds.slides[0].texts.includes(entry))) expect(entry.options.y + entry.options.h + 0.1).toBeLessThanOrEqual(sounds.slides[0].media[0].y);
    delete input.words[0].phonemes; input.words[0].wordAudio = wav;
    const recall = await media.buildPptx(input, { ...options, includeAudio: true, vocabularyFirst: 'meaning' }, undefined, { PptxGenJS: Deck });
    const answer = recall.slides.findIndex(slide => slide.texts.some(entry => entry.text === 'Leaf'));
    expect(answer).toBeGreaterThan(0);
    expect(recall.slides.slice(0, answer).flatMap(slide => slide.media)).toHaveLength(0);
    expect(recall.slides[answer].media).toHaveLength(1);
    expect(recall.slides.filter((_, index) => index !== answer).flatMap(slide => slide.media)).toHaveLength(0);
    expect(creditParts(recall)[0].options.y + creditParts(recall)[0].options.h).toBeCloseTo(6.55);
  });

  it.each([
    [undefined, 'Crédits photo', 'fr'],
    [{ picture_credits: 'Crédits personnalisés' }, 'Crédits personnalisés', 'fr'],
    [null, 'Picture credits', 'en'],
  ])('uses existing localized credit captions and keeps explicit overrides and English fallback', async (labels, caption, lang) => {
    const { media } = load(code), credit = Array.from({ length: 30 }, (_, n) => 'Line ' + n).join('\n');
    const t = key => labels === null ? key : key === 'flashcards.picture_credits' ? 'Crédits photo' : key;
    const deck = await media.buildPptx(pack(credit), options, undefined, { PptxGenJS: Deck, currentUiLanguage: 'French', t, labels });
    const footer = deck.slides[1].texts.find(entry => Array.isArray(entry.text) && entry.text.some(run => run.text.includes(caption)));
    expect(footer).toBeTruthy();
    expect(footer.text.find(run => run.text.includes(caption)).options).toMatchObject({ lang, rtlMode: false });
  });

  it('writes full rich-text credit runs and unknown language into actual PowerPoint XML', async () => {
    const { win, media } = load(code); win.eval(vendor + '\nwindow.NativeDeck = PptxGenJS;');
    const deck = await media.buildPptx(pack(arabic), options, undefined, { PptxGenJS: win.NativeDeck });
    const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
    const xml = await zip.file('ppt/slides/slide1.xml').async('string');
    const doc = new win.DOMParser().parseFromString(xml, 'application/xml'), ns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const text = [...doc.getElementsByTagNameNS(ns, 'r')].filter(run => run.getElementsByTagNameNS(ns, 'rPr')[0]?.getAttribute('lang') === 'und');
    expect(text.map(run => run.getElementsByTagNameNS(ns, 't')[0]?.textContent || '').join('')).toBe(arabic);
    expect(xml).not.toContain('normAutofit');
  });
});
