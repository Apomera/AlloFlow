import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
const root = {};
vm.runInNewContext(['word_practice_core.js', 'word_practice_media.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n'), { window: root, atob, btoa, setTimeout, clearTimeout, Uint8Array, DataView });
const core = root.AlloWordPracticeCore;
const wav = Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const annotations = [
  { id: 1, kind: 'note', content: 'Compare with the source.', x: 120, y: 80, color: 'yellow' },
  { id: 2, type: 'star', x: 50, y: 30 },
  { id: 3, kind: 'highlight', text: 'Plants use light.', rects: [{ x: 40, y: 50, w: 100, h: 20 }] },
  { id: 4, kind: 'draw', shape: 'arrow', start: { x: 20, y: 30 }, end: { x: 100, y: 130 }, x: 20, y: 30, w: 80, h: 100, width: 4, color: 'red' },
  { id: 5, kind: 'voice', x: 200, y: 120, audioBase64: wav, mimeType: 'audio/wav' }
];
class Presentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], shapes: [], media: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addShape(shape, options) { this.shapes.push({ shape, options }); }, addMedia(value) { this.media.push(value); }, addNotes(value) { this.notes.push(value); } };
    this.slides.push(slide); return slide;
  }
}
const flatten = text => Array.isArray(text) ? text.map(run => run.text).join('') : text;
describe('glossary content and portable annotations', () => {
  it('retains the source quote, its language, word origin, and roots through save/load', () => {
    const pack = core.normalizeInput({ language: 'English', words: [{ term: 'photo', def: 'luz', definitionLanguage: 'Spanish', contextSentence: 'Plants use light.', contextSentenceLanguage: 'English', etymologyByLang: { Spanish: 'Del griego.' }, roots: [{ root: 'phōs', meaning: 'luz' }], annotations }] });
    const item = core.normalizeInput(JSON.parse(core.serializePack(pack))).items[0];
    expect(item).toMatchObject({ example: 'Plants use light.', exampleLanguage: 'English', origin: 'Del griego. · phōs (luz)' });
    expect(item.annotations.map(a => a.kind)).toEqual(['note', 'sticker', 'highlight', 'draw', 'voice']);
    expect(item.annotations[4].audioBase64).toBe(wav);
  });
  it('does not assign the context language to a separately supplied example', () => {
    const item = core.normalizeInput({ words: [{ word: 'photo', example: 'La foto.', definitionLanguage: 'Spanish', contextSentence: 'The photo.', contextSentenceLanguage: 'English' }] }).items[0];
    expect(item.exampleLanguage).toBe('Spanish');
  });
  it('bounds imported data and discards unsafe voice sources and pending recordings', () => {
    const list = core.normalizeAnnotations([{ kind: 'voice', audioBase64: '<script>', mimeType: 'text/html' }, { kind: 'note', pending: true }, { kind: 'draw', x: Infinity, y: -Infinity, color: 'url(https://invalid)', shape: 'script' }]);
    expect(list).toHaveLength(2); expect(list[0].audioBase64).toBeUndefined();
    expect(list[1]).toMatchObject({ x: 100000, y: -100000, color: 'yellow', shape: 'free' });
    expect(() => core.normalizeAnnotations(Array(501).fill({ kind: 'note' }))).toThrow(/500/);
  });
  it('exports editable shapes, complete notes, highlights, and voice audio after the recall answer', async () => {
    const pptx = await root.AlloWordPracticeMedia.buildPptx({ words: [{ term: 'photo', definition: 'Light.', contextSentence: 'Plants use light.', etymology: 'Greek for light.', annotations }] }, { mode: 'vocabulary', vocabularyFirst: 'meaning', repetitions: 2, shuffle: false, includeAudio: false }, undefined, { PptxGenJS: Presentation });
    const slides = pptx.slides, texts = slides.map(s => s.texts.map(e => flatten(e.text)).join('\n'));
    const answer = texts.findIndex(t => /\nphoto\n?$/.test(t));
    const origin = texts.findIndex(t => t.includes('Greek for light.'));
    const annotated = slides.findIndex(s => s.shapes.length > 0);
    expect(origin).toBeGreaterThan(answer); expect(annotated).toBeGreaterThan(answer);
    expect(slides.flatMap(s => s.shapes).map(s => s.shape)).toContain('line');
    expect(slides.flatMap(s => s.shapes).map(s => s.shape)).toContain('rect');
    expect(slides.flatMap(s => s.media)).toHaveLength(1);
    expect(slides.flatMap(s => s.media)[0].data).toContain('audio/wav;base64,');
    expect(texts.join('\n')).toContain('Compare with the source.');
    expect(texts.join('\n')).toContain('Plants use light.');
    expect(pptx.wordPracticeWarnings).toEqual([]);
  });
  it('writes the shapes, notes and playable audio into the real PowerPoint package', async () => {
    const dom = new JSDOM('<html></html>', { runScripts: 'outside-only' });
    try {
      const win = dom.window;
      win.eval(fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8') + '\nwindow.practicePptx = PptxGenJS;');
      const pptx = await root.AlloWordPracticeMedia.buildPptx({ words: [{ word: 'photo', definition: 'Light.', annotations }] }, { mode: 'vocabulary', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: win.practicePptx });
      const zip = await JSZip.loadAsync(Buffer.from(await pptx.write({ outputType: 'uint8array' })));
      const files = Object.keys(zip.files);
      const slides = await Promise.all(files.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).map(f => zip.file(f).async('string')));
      expect(slides.some(s => s.includes('Compare with the source.') && s.includes('prst="line"'))).toBe(true);
      expect(files.some(f => /^ppt\/media\/.+\.wav$/.test(f))).toBe(true);
    } finally { dom.window.close(); }
  });
});
