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
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
class Deck {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], addText(text, options) { this.texts.push({ text, options }); }, addImage() {}, addShape() {}, addNotes() {} };
    this.slides.push(slide); return slide;
  }
}
function load(code) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(code);
  return { win: window, media: window.AlloWordPracticeMedia };
}
const input = { title: 'Practice', words: [{ word: 'Leaf', termLanguage: 'English', definition: 'A green plant part.', definitionLanguage: 'English', example: 'The leaf catches light.', origin: 'Old English.', translations: { Arabic: 'ورقة النبات' }, phonemes: ['l', 'ea', 'f'], sentenceActivity: { prompt: 'A ____ catches light.', choices: ['Leaf', 'Root'], answer: 'Leaf' }, picture: { src: png, alt: 'A green plant part', credit: 'Teacher photo' } }] };
const flatten = text => Array.isArray(text) ? text.map(run => run.text).join('') : text;
const modes = [{ mode: 'vocabulary' }, { mode: 'vocabulary', vocabularyFirst: 'meaning' }, { mode: 'popup' }, { mode: 'spelling' }, { mode: 'sentence' }, { mode: 'blend' }];
const styles = [['default', false, false, true], ['regular', false, false, false], ['bold', false, true, true], ['italic', true, false, false], ['bold-italic', true, true, true]];

describe.each([['source', source], ['bundled in memory', bundled]])('editable card text styles (%s)', (_, code) => {
  it.each(styles.flatMap(([style, italic, bold, heading]) => ['default', 'georgia'].map(font => [style, font, italic, bold, heading])))('exports %s in %s across terms, captions and every activity', async (cardTextStyle, cardFont, italic, bold, heading) => {
    const { media } = load(code);
    for (const activity of modes) {
      const deck = await media.buildPptx(input, { ...activity, repetitions: 1, includeAudio: false, cardTextStyle, cardFont }, undefined, { PptxGenJS: Deck, readerSettings: { fontFamily: 'Verdana, sans-serif' } });
      const teaching = deck.slides.flatMap(slide => slide.texts).filter(entry => entry.options.y > 0.8 && entry.options.y < 6.8);
      expect(teaching.length).toBeGreaterThan(0);
      for (const entry of teaching) {
        const title = entry.options.y === 0.92 || flatten(entry.text) === 'Leaf';
        expect(entry.options).toMatchObject({ fontFace: cardFont === 'default' ? 'Verdana' : 'Georgia', italic, bold: title ? heading : bold });
        if (Array.isArray(entry.text)) for (const run of entry.text) {
          if (run.options.fontSize) expect(run.options.bold).toBe(heading);
        }
      }
    }
  });

  it.each([['font-andika-italic', false], ['font-andika-bold-italic', true]])('keeps automatic %s hierarchy and lets explicit regular override it', async (fontClass, readerBold) => {
    const { media } = load(code), readerSettings = { fontFamily: "'Andika', sans-serif", fontClass };
    for (const cardFont of ['default', 'georgia']) for (const cardTextStyle of ['default', 'regular']) {
      const deck = await media.buildPptx(input, { mode: 'vocabulary', repetitions: 1, includeAudio: false, cardFont, cardTextStyle }, undefined, { PptxGenJS: Deck, readerSettings });
      const text = deck.slides.flatMap(slide => slide.texts), explicit = cardTextStyle === 'regular';
      const word = text.find(entry => entry.text === 'Leaf'), definition = text.find(entry => entry.text === 'A green plant part.');
      expect(word.options).toMatchObject({ italic: !explicit && cardFont === 'default', bold: !explicit });
      expect(definition.options).toMatchObject({ italic: !explicit && cardFont === 'default', bold: !explicit && cardFont === 'default' && readerBold });
    }
  });

  it('keeps authored annotation text independent from the card style', async () => {
    const { media } = load(code);
    const deck = await media.buildPptx({ words: [{ word: 'Leaf', definition: 'A green plant part.', annotations: [{ kind: 'note', content: 'Teacher annotation', x: 50, y: 40 }] }] }, { mode: 'vocabulary', repetitions: 1, includeAudio: false, cardTextStyle: 'bold-italic' }, undefined, { PptxGenJS: Deck });
    const text = deck.slides.flatMap(slide => slide.texts);
    expect(text.find(entry => entry.text === 'A green plant part.').options).toMatchObject({ italic: true, bold: true });
    const note = text.find(entry => entry.text === 'Teacher annotation');
    expect(note.options.italic).toBeUndefined();
    expect(note.options.bold).toBeUndefined();
  });

  it.each(['regular', 'bold-italic'])('writes actual PowerPoint run styles for %s without caption overrides', async cardTextStyle => {
    const { win, media } = load(code);
    win.eval(vendor + '\nwindow.NativeDeck = PptxGenJS;');
    const deck = await media.buildPptx({ words: [{ word: 'Leaf', definition: 'A green plant part.', translations: { Arabic: 'ورقة النبات' } }] }, { mode: 'vocabulary', repetitions: 1, includeAudio: false, cardTextStyle }, undefined, { PptxGenJS: win.NativeDeck });
    const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
    const xml = await zip.file('ppt/slides/slide1.xml').async('string');
    const doc = new win.DOMParser().parseFromString(xml, 'application/xml'), ns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const nodes = [...doc.getElementsByTagNameNS(ns, 't')];
    for (const value of ['Leaf', 'A green plant part.', 'Arabic:', 'ورقة النبات']) {
      const text = nodes.find(node => node.textContent.trim() === value);
      expect(text, value).toBeTruthy();
      const properties = text.parentNode.getElementsByTagNameNS(ns, 'rPr')[0];
      expect(properties.getAttribute('b') === '1', value).toBe(cardTextStyle === 'bold-italic');
      expect(properties.getAttribute('i') === '1', value).toBe(cardTextStyle === 'bold-italic');
    }
  });
});
