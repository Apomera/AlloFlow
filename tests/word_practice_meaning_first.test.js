// "Start with the meaning" for Word Meaning (2026-10-29): show the clue (picture,
// definition, example, translations) with the word blanked out of it, and reveal the
// word. Recall from meaning is stronger practice than recognising a shown word.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const coreSource = fs.readFileSync('word_practice_core.js', 'utf8');
const uiSource = fs.readFileSync('word_practice_ui.js', 'utf8');
const mediaSource = fs.readFileSync('word_practice_media.js', 'utf8');
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...u32(300), ...u32(300), 8, 6, 0, 0, 0, 0, 0, 0, 0, 0]).toString('base64');
const LEAF = { word: 'leaf', definition: 'A leaf is the flat green part of a plant.', example: 'The leaves and one leaf fell.', image: PNG, imageAlt: 'A maple leaf', wordAudio: wav };
const BARE = { word: 'zephyr' };
const RADIO = { word: 'radio', definition: 'A radio receives broadcasts.', contextSentence: 'That RADIO plays music.',
  translations: { Spanish: { term: 'radio', def: 'Aparato que recibe señales.' }, Arabic: 'مذياع: جهاز radio.' },
  picture: { src: PNG, alt: 'A radio with two dials', credit: 'Radio Museum, CC BY' },
  annotations: [{ id: 'solution', kind: 'note', content: 'The answer is radio.', x: 30, y: 30 }] };

function loadCore() { const sandbox = { window: {}, atob, btoa }; vm.runInNewContext(coreSource, sandbox); return sandbox.window.AlloWordPracticeCore; }

describe('core', () => {
  const core = loadCore();
  it('blanks the word and its simple endings in its own clue', () => {
    expect(core.maskWord('A leaf is green; the leaf\'s edge; leafed out.', 'leaf')).toBe('A ____ is green; the ____ edge; ____ out.');
    expect(core.maskWord('The water cycle moves water.', 'water cycle')).toBe('The ____ moves water.');
    expect(core.maskWord('Leaflet and relief stay.', 'leaf')).toBe('Leaflet and relief stay.');
    expect(core.maskWord('A cloverleaf stays.', 'leaf')).toBe('A cloverleaf stays.');
    expect(core.maskWord('水是生命。我喝水。', '水')).toBe('____是生命。我喝____。');
  });
  it('defaults to the word first, and knows when there is nothing to recall from', () => {
    expect(core.normalizeOptions({}).vocabularyFirst).toBe('word');
    expect(core.normalizeOptions({ vocabularyFirst: 'meaning' }).vocabularyFirst).toBe('meaning');
    expect(core.normalizeOptions({ vocabularyFirst: 'other' }).vocabularyFirst).toBe('word');
    const [leaf, bare] = core.normalizeInput({ words: [LEAF, BARE] }).items;
    expect(core.hasMeaning(leaf, {})).toBe(true);
    expect(core.hasMeaning(bare, { includePictures: true })).toBe(false);
    expect(core.hasMeaning({ ...bare, picture: leaf.picture }, { includePictures: true })).toBe(true);
    expect(core.hasMeaning({ ...bare, picture: leaf.picture }, { includePictures: false })).toBe(false);
  });
  it('keeps script, language, decorative status and the original author data', () => {
    const [item] = core.normalizeInput({ words: [{ ...RADIO, word: 'café', translations: { Arabic: 'مثال: cafe\u0301.' }, picture: { src: PNG, alt: 'cafe\u0301' } }] }).items;
    const before = JSON.stringify(item), clue = core.recallClue(item, 'Picture clue');
    expect(clue.picture.alt).toBe('Picture clue');
    expect(clue.translations[0]).toMatchObject({ text: 'مثال: ____.', language: 'Arabic' });
    expect(JSON.stringify(item)).toBe(before);
    expect(core.recallClue({ ...item, picture: { ...item.picture, alt: '', decorative: true } }).picture.alt).toBe('');
  });
});

describe('presenter', () => {
  let dom, win, ui;
  const button = text => [...win.document.querySelectorAll('button')].find(node => node.textContent === text && !node.parentElement.closest('[hidden]'));
  const field = label => [...win.document.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('input,select,textarea');
  const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
  const change = node => node.dispatchEvent(new win.Event('change', { bubbles: true }));
  const card = () => win.document.querySelector('.awp-stage .awp-card');
  const announcement = () => win.document.querySelector('.awp-player p.awp-sr[aria-live]').textContent;
  const toolbarButton = text => [...win.document.querySelectorAll('.awp-player button')].find(node => node.textContent === text);
  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example' });
    win = dom.window; win.eval(coreSource); win.eval(uiSource); ui = win.AlloModules.WordPractice;
  });
  afterEach(() => { dom.window.close(); });
  async function present(words, setup = {}) {
    ui.open({ words });
    field('Practice activity').value = 'vocabulary'; change(field('Practice activity'));
    field('Show first').value = setup.first || 'meaning'; change(field('Show first'));
    field('Repetitions per word').value = '1'; field('Shuffle each repetition').checked = false;
    if (setup.timed) { field('Pacing').value = 'timed'; change(field('Pacing')); field('Seconds per card').value = '1'; change(field('Seconds per card')); }
    button('Present').click(); await tick();
  }

  it('shows the clue with the word blanked, and keeps the answer out of sight and sound', async () => {
    await present([LEAF]);
    expect(card().textContent).toContain('Which word matches this meaning?');
    expect(card().textContent).toContain('A ____ is the flat green part of a plant.');
    expect(card().textContent).toContain('The leaves and one ____ fell.');
    expect(card().querySelector('.awp-word')).toBeNull();
    expect(card().querySelector('.awp-picture img').getAttribute('alt')).toBe('A maple ____');
    expect(announcement()).not.toMatch(/\bleaf\b/);
    expect(toolbarButton('Hear word').hidden).toBe(true);
    expect(toolbarButton('Show word')).toBeTruthy();
  });

  it('reveals the word with the full meaning', async () => {
    await present([LEAF]);
    toolbarButton('Show word').click();
    expect(card().querySelector('.awp-word').textContent).toBe('leaf');
    expect(card().textContent).toContain('A leaf is the flat green part of a plant.');
    expect(toolbarButton('Hear word').hidden).toBe(false);
  });

  it('masks visible and spoken picture/translation clues, then restores the exact originals', async () => {
    await present([RADIO]);
    expect(card().textContent).not.toMatch(/radio/i);
    expect(announcement()).not.toMatch(/radio/i);
    expect(announcement()).toContain('A ____ with two dials');
    expect(card().querySelector('img').alt).toBe('A ____ with two dials');
    expect(card().querySelector('figcaption').textContent).toBe('____ Museum, CC BY');
    expect(card().querySelector('[lang=ar].awp-translation').textContent).toBe('مذياع: جهاز ____.');
    toolbarButton('Show word').click();
    expect(card().querySelector('img').alt).toBe(RADIO.picture.alt);
    expect(card().querySelector('figcaption').textContent).toBe(RADIO.picture.credit);
    expect(card().querySelector('[lang=es].awp-translation').textContent).toBe('radio: Aparato que recibe señales.');
    expect(announcement()).toContain('That RADIO plays music.');
  });

  it('uses the same masking and reveal in setup preview', () => {
    ui.open({ words: [RADIO, LEAF], options: { mode: 'vocabulary', vocabularyFirst: 'meaning' } });
    const preview = win.document.querySelector('.awp-card-preview');
    const picker = win.document.querySelector('.awp-preview-picker');
    expect(picker.textContent).not.toMatch(/radio|leaf/i);
    expect(preview.textContent).not.toMatch(/radio/i); expect(preview.querySelector('img').alt).toBe('A ____ with two dials');
    [...win.document.querySelectorAll('button')].find(node => node.textContent === 'Show word' && node.closest('.awp-appearance')).click();
    expect(preview.querySelector('img').alt).toBe(RADIO.picture.alt);
    expect(preview.querySelector('.awp-preview-translation[lang=ar]').textContent).toBe('مذياع: جهاز radio.');
    expect(preview.textContent).toContain(RADIO.picture.credit);
    expect(picker.selectedOptions[0].textContent).toContain('radio');
    field('Show first').value = 'word'; change(field('Show first'));
    field('Show first').value = 'meaning'; change(field('Show first'));
    expect(preview.textContent).not.toMatch(/radio/i); expect(picker.textContent).not.toMatch(/radio|leaf/i);
  });

  it('falls back to word first for a word with nothing to recall from', async () => {
    await present([BARE]);
    expect(card().querySelector('.awp-word').textContent).toBe('zephyr');
    expect(toolbarButton('Show meaning')).toBeTruthy();
  });

  it('keeps the word first when that is chosen', async () => {
    await present([LEAF], { first: 'word' });
    expect(card().querySelector('.awp-word').textContent).toBe('leaf');
    expect(card().textContent).not.toContain('____');
  });

  it('with timed cards, shows the word before moving on', async () => {
    await present([LEAF, { ...LEAF, word: 'root', definition: 'A root holds the plant.' }], { timed: true });
    toolbarButton('Start timer').click();
    await tick(1150);
    expect(win.document.querySelector('.awp-progress').textContent).toBe('Card 1 of 2');
    expect(card().querySelector('.awp-word').textContent).toBe('leaf');
    await tick(1150);
    expect(win.document.querySelector('.awp-progress').textContent).toBe('Card 2 of 2');
  });

  it('lets the timer reveal and finish a one-card automatic round', async () => {
    await present([LEAF], { timed: true });
    expect(toolbarButton('Next').disabled).toBe(true);
    expect(toolbarButton('Finish round')).toBeUndefined();
    toolbarButton('Start timer').click();
    await tick(1150);
    expect(card().querySelector('.awp-word').textContent).toBe('leaf');
    await tick(1150);
    expect(win.document.querySelector('.awp-player .awp-status').textContent).toContain('Round complete');
    expect(toolbarButton('Start timer').getAttribute('aria-pressed')).toBe('false');
    expect(win.document.querySelector('.awp-round-actions h2').hidden).toBe(true);
  }, 15_000);

  it('offers the choice only for Word Meaning, remembers it, and previews the clue', () => {
    ui.open({ words: [LEAF] });
    expect(field('Show first').closest('label').hidden).toBe(true);
    field('Practice activity').value = 'vocabulary'; change(field('Practice activity'));
    expect(field('Show first').closest('label').hidden).toBe(false);
    field('Show first').value = 'meaning'; change(field('Show first'));
    const preview = win.document.querySelector('.awp-card-preview');
    expect(preview.textContent).toContain('A ____ is the flat green part of a plant.');
    expect(preview.querySelector('.awp-preview-word')).toBeNull();
    [...win.document.querySelectorAll('button')].find(node => node.textContent === 'Show word' && node.closest('.awp-appearance')).click();
    expect(preview.querySelector('.awp-preview-word').textContent).toBe('leaf');
    win.document.querySelector('.awp-overlay').remove();
    ui.open({ words: [LEAF] });
    expect(field('Show first').value).toBe('meaning');
  });
});

describe('PowerPoint', () => {
  let root, media;
  class Presentation {
    constructor() { this.slides = []; }
    addSlide() {
      const slide = { texts: [], images: [], sounds: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addImage(options) { this.images.push(options); }, addMedia(options) { this.sounds.push(options); }, addNotes(text) { this.notes.push(text); } };
      this.slides.push(slide); return slide;
    }
  }
  beforeEach(() => {
    root = { PptxGenJS: Presentation };
    vm.runInNewContext(coreSource + '\n' + mediaSource, { window: root, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView, Float32Array });
    media = root.AlloWordPracticeMedia;
  });
  const flat = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
  const texts = slide => slide.texts.map(entry => flat(entry.text)).join(' | ');
  const build = (words, options = {}) => media.buildPptx({ words }, { mode: 'vocabulary', vocabularyFirst: 'meaning', repetitions: 1, shuffle: false, ...options });

  it('puts the question and blanked clue first, and the word with its audio on the answer slide', async () => {
    const pptx = await build([LEAF]);
    const firstAnswer = pptx.slides.findIndex(slide => texts(slide).includes('Answer'));
    const answer = pptx.slides[firstAnswer], clues = pptx.slides.slice(0, firstAnswer);
    expect(clues.length).toBeGreaterThanOrEqual(2);
    expect(clues[0].images).toHaveLength(1);
    clues.forEach(slide => {
      expect(texts(slide)).toContain('Which word matches this meaning?');
      expect(texts(slide)).not.toMatch(/\bleaf\b/);
      expect(slide.sounds).toHaveLength(0);
    });
    expect(clues.map(texts).join(' ')).toContain('A ____ is the flat green part of a plant.');
    expect(texts(answer)).toContain('leaf');
    expect(texts(answer)).toContain('Answer');
    expect(answer.sounds.length).toBeGreaterThan(0);
  });

  it('keeps the word and its audio off a clue slide without a picture', async () => {
    const { image, ...noPicture } = LEAF;
    const pptx = await build([noPicture]);
    expect(pptx.slides.length).toBeGreaterThanOrEqual(2);
    const firstAnswer = pptx.slides.findIndex(slide => texts(slide).includes('Answer'));
    pptx.slides.slice(0, firstAnswer).forEach(slide => { expect(slide.sounds).toHaveLength(0); expect(slide.images).toHaveLength(0); });
    expect(pptx.slides[firstAnswer].sounds.length).toBeGreaterThan(0);
  });
  it('keeps the answer off all clue-slide text and image descriptions in a real pptx file', async () => {
    const dom = new JSDOM('<html></html>', { runScripts: 'outside-only' });
    try {
      dom.window.eval(fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8') + '\nwindow.practicePptx = PptxGenJS;');
      const deck = await media.buildPptx({ words: [RADIO] }, { mode: 'vocabulary', vocabularyFirst: 'meaning', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: dom.window.practicePptx });
      const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
      const paths = Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a, b) => Number(a.match(/(\d+)\.xml/)[1]) - Number(b.match(/(\d+)\.xml/)[1]));
      const slides = await Promise.all(paths.map(path => zip.file(path).async('string')));
      const firstAnswer = slides.findIndex(text => text.includes('Answer'));
      expect(firstAnswer).toBeGreaterThan(0);
      const clues = slides.slice(0, firstAnswer).join(''), answers = slides.slice(firstAnswer).join('');
      expect(clues).not.toMatch(/radio/i);
      expect(clues).toContain('A ____ with two dials'); expect(clues).toContain('____ Museum, CC BY'); expect(clues).toContain('lang="ar"');
      for (const original of [RADIO.picture.alt, RADIO.picture.credit, RADIO.contextSentence, 'radio: Aparato que recibe señales.', 'The answer is radio.']) expect(answers).toContain(original);
    } finally { dom.window.close(); }
  }, 30_000);

  it('keeps the word-first deck, and word-first for a word with no clue', async () => {
    const wordFirst = await build([LEAF], { vocabularyFirst: 'word' });
    expect(texts(wordFirst.slides[0])).toContain('leaf');
    expect(wordFirst.slides.every(slide => !texts(slide).includes('Which word matches'))).toBe(true);
    const bare = await build([BARE]);
    expect(bare.slides).toHaveLength(1);
    expect(texts(bare.slides[0])).toContain('zephyr');
  });
});
