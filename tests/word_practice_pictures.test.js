// Glossary pictures in Present & Export (2026-10-29). The glossary handed each term's
// picture to the presenter, which dropped it. Word Meaning cards now show it with the
// meaning (live, in the setup preview and in the offline HTML), and PowerPoint gets a
// word-and-picture slide before the meaning slides.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const coreSource = fs.readFileSync('word_practice_core.js', 'utf8');
const uiSource = fs.readFileSync('word_practice_ui.js', 'utf8');
const mediaSource = fs.readFileSync('word_practice_media.js', 'utf8');
const dataUrl = (mime, bytes) => 'data:' + mime + ';base64,' + Buffer.from(bytes).toString('base64');
const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const PNG = dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...u32(400), ...u32(200), 8, 6, 0, 0, 0, 0, 0, 0, 0, 0]);
const JPEG = dataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0, 17, 8, 0x01, 0x2c, 0x02, 0x58, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
const GIF = dataUrl('image/gif', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 120, 0, 60, 0, 0, 0, 0, 0, 0, 0]);
const WEBP = dataUrl('image/webp', [0x52, 0x49, 0x46, 0x46, 30, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0, 0, 0, 0, 0, 0, 0, 0]);
const LINK = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.png';
const leaf = (extra = {}) => ({ term: 'leaf', def: 'A flat green part of a plant.', image: PNG, imageAlt: 'A green maple leaf', imageAttribution: { set: 'Wikimedia Commons', author: 'A. Botanist', license: 'CC BY 4.0' }, ...extra });

function loadCore() {
  const sandbox = { window: {}, atob, btoa };
  vm.runInNewContext(coreSource, sandbox);
  return sandbox.window.AlloWordPracticeCore;
}

describe('core: a picture travels with each practice item', () => {
  const core = loadCore();
  const pictureOf = record => core.normalizeInput({ words: [record] }).items[0].picture;

  it('accepts embedded PNG, JPEG, GIF and WebP pictures and https links, by their real signature', () => {
    expect(core.safePicture(PNG)).toBe(PNG);
    expect(core.safePicture(JPEG)).toBe(JPEG);
    expect(core.safePicture(GIF)).toBe(GIF);
    expect(core.safePicture(WEBP)).toBe(WEBP);
    expect(core.safePicture(LINK)).toBe(LINK);
    expect(core.safePicture(JPEG.replace('image/jpeg', 'image/jpg'))).toBe(JPEG);
  });

  it('refuses anything else', () => {
    expect(core.safePicture(PNG.replace('image/png', 'image/gif'))).toBe('');
    expect(core.safePicture(GIF.replace('image/gif', 'image/png'))).toBe('');
    expect(core.safePicture(dataUrl('image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')))).toBe('');
    expect(core.safePicture('http://example.org/leaf.png')).toBe('');
    expect(core.safePicture('javascript:alert(1)')).toBe('');
    expect(core.safePicture('https://example.org/a" onerror="x')).toBe('');
    expect(core.safePicture({ src: PNG })).toBe('');
  });

  it('keeps the description, credit and decorative choice the glossary saved', () => {
    expect(pictureOf(leaf())).toEqual({ src: PNG, alt: 'A green maple leaf', decorative: false, credit: 'Wikimedia Commons · A. Botanist · CC BY 4.0' });
    expect(pictureOf(leaf({ imageAlt: '' })).alt).toBe('leaf');
    expect(pictureOf(leaf({ imageDecorative: true }))).toMatchObject({ alt: '', decorative: true });
    expect(pictureOf(leaf({ image: { src: GIF } })).src).toBe(GIF);
    expect(pictureOf({ term: 'leaf', def: 'x' })).toBeNull();
  });

  it('keeps the picture when the same word is listed again with it', () => {
    const pack = core.normalizeInput({ words: [{ term: 'leaf', def: 'x' }, leaf()] });
    expect(pack.items).toHaveLength(1);
    expect(pack.items[0].picture.src).toBe(PNG);
  });

  it('does not reuse a description written for an earlier picture', () => {
    expect(pictureOf(leaf({ imageAltHash: 'img-stale-00000000' })).alt).toBe('leaf');
  });

  it('survives re-normalising a saved set', () => {
    const pack = core.normalizeInput({ words: [leaf()] });
    expect(core.normalizeInput(pack).items[0].picture).toEqual(pack.items[0].picture);
    expect(core.normalizeInput(JSON.parse(core.serializePack(pack))).items[0].picture).toEqual(pack.items[0].picture);
  });

  it('leaves out embedded pictures past the size budget instead of blocking the set', () => {
    const header = Buffer.from(PNG.split(',')[1], 'base64');
    const big = 'data:image/png;base64,' + Buffer.concat([header, Buffer.alloc(Math.floor(core.LIMITS.pictureChars * 0.9 * 3 / 4) - header.length)]).toString('base64');
    expect(core.safePicture(big)).toBe(big);
    const words = Array.from({ length: 5 }, (_, i) => leaf({ term: 'leaf' + i, image: big }));
    words.push(leaf({ term: 'linked', image: LINK }));
    const pack = core.normalizeInput({ words });
    const kept = pack.items.filter(item => item.picture && item.picture.src === big).length;
    expect(kept).toBe(Math.floor(core.LIMITS.totalPictureChars / big.length));
    expect(pack.picturesOmitted).toBe(5 - kept);
    expect(pack.items.find(item => item.word === 'linked').picture.src).toBe(LINK);
  });

  it('shows pictures unless the teacher turns them off', () => {
    expect(core.normalizeOptions({}).includePictures).toBe(true);
    expect(core.normalizeOptions({ includePictures: false }).includePictures).toBe(false);
  });
});

describe('presenter: the picture appears with the meaning', () => {
  let dom, win, ui;
  const button = text => [...win.document.querySelectorAll('button')].find(node => node.textContent === text && !node.parentElement.closest('[hidden]'));
  const field = label => [...win.document.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('input,select,textarea');
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  const card = () => win.document.querySelector('.awp-stage .awp-card');
  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example' });
    win = dom.window; win.eval(coreSource); win.eval(uiSource); ui = win.AlloModules.WordPractice;
  });
  afterEach(() => { dom.window.close(); });
  async function present(words, setup = {}) {
    ui.open({ words });
    field('Practice activity').value = setup.mode || 'vocabulary';
    field('Repetitions per word').value = '1';
    if (setup.pictures === false) field('Show pictures on Word Meaning cards').checked = false;
    field('Practice activity').dispatchEvent(new win.Event('change', { bubbles: true }));
    button('Present').click(); await tick();
  }

  it('shows the picture, its description and credit only once the meaning is revealed', async () => {
    await present([leaf()]);
    expect(card().querySelector('img')).toBeNull();
    button('Show meaning').click();
    const image = card().querySelector('.awp-picture img');
    expect(image.getAttribute('src')).toBe(PNG);
    expect(image.getAttribute('alt')).toBe('A green maple leaf');
    expect(card().querySelector('.awp-picture figcaption').textContent).toBe('Wikimedia Commons · A. Botanist · CC BY 4.0');
    expect(card().textContent).toContain('A flat green part of a plant.');
  });

  it('hides a decorative picture from screen readers', async () => {
    await present([leaf({ imageDecorative: true })]);
    button('Show meaning').click();
    const image = card().querySelector('.awp-picture img');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('role')).toBe('presentation');
  });

  it('leaves pictures out when the teacher turns them off, and in other activities', async () => {
    await present([leaf()], { pictures: false });
    button('Show meaning').click();
    expect(card().querySelector('img')).toBeNull();
    button('Back to setup').click();
    field('Show pictures on Word Meaning cards').checked = true;
    field('Practice activity').value = 'popup';
    field('Practice activity').dispatchEvent(new win.Event('change', { bubbles: true }));
    button('Present').click(); await tick();
    expect(card().querySelector('img')).toBeNull();
  });

  it('offers the picture choice only when a word has a picture, and says what slides cannot include', () => {
    ui.open({ words: [{ term: 'leaf', def: 'x' }] });
    expect(field('Show pictures on Word Meaning cards').closest('label').hidden).toBe(true);
    win.document.querySelector('.awp-overlay')?.remove();
    ui.open({ words: [leaf(), leaf({ term: 'linked', image: LINK }), leaf({ term: 'webp', image: WEBP })] });
    const choice = field('Show pictures on Word Meaning cards');
    expect(choice.closest('label').hidden).toBe(false);
    const note = win.document.getElementById(choice.getAttribute('aria-describedby'));
    expect(note.hidden).toBe(false);
    expect(note.textContent).toContain('which PowerPoint cannot include: 2');
  });

  it('shows the picture in the setup preview once revealed', () => {
    ui.open({ words: [leaf()] });
    field('Practice activity').value = 'vocabulary';
    field('Practice activity').dispatchEvent(new win.Event('change', { bubbles: true }));
    const preview = win.document.querySelector('.awp-card-preview');
    expect(preview.querySelector('img')).toBeNull();
    [...win.document.querySelectorAll('button')].find(node => node.textContent === 'Show meaning' && node.closest('.awp-appearance')).click();
    expect(preview.querySelector('.awp-picture img').getAttribute('alt')).toBe('A green maple leaf');
  });
});

describe('offline HTML file', () => {
  let dom, ui;
  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example' });
    dom.window.eval(coreSource); dom.window.eval(uiSource); ui = dom.window.AlloModules.WordPractice;
  });
  afterEach(() => { dom.window.close(); });
  const policy = html => html.match(/Content-Security-Policy" content="([^"]+)"/)[1];

  it('stays network-free with embedded pictures, and allows https only for a web-link picture', () => {
    const embedded = ui.buildHtml({ words: [leaf()] }, { mode: 'vocabulary' });
    expect(embedded).toContain(PNG.split(',')[1].slice(0, 40));
    expect(policy(embedded)).toContain('img-src data:');
    expect(policy(embedded)).not.toContain('https:');
    const linked = ui.buildHtml({ words: [leaf({ image: LINK })] }, { mode: 'vocabulary' });
    expect(policy(linked)).toContain('img-src data: https:');
  });

  it('carries no picture data when pictures are turned off', () => {
    const html = ui.buildHtml({ words: [leaf(), leaf({ term: 'linked', image: LINK })] }, { mode: 'vocabulary', includePictures: false });
    expect(html).not.toContain(PNG.split(',')[1].slice(0, 40));
    expect(html).not.toContain(LINK);
    expect(policy(html)).not.toContain('https:');
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
  const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
  beforeEach(() => {
    root = { PptxGenJS: Presentation };
    vm.runInNewContext(coreSource + '\n' + mediaSource, { window: root, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView, Float32Array });
    media = root.AlloWordPracticeMedia;
  });
  const flat = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
  const build = (words, options = {}) => media.buildPptx({ words }, { mode: 'vocabulary', repetitions: 1, shuffle: false, ...options });

  it('puts the word and its picture on a slide before the meaning, fitted without stretching', async () => {
    const pptx = await build([leaf({ wordAudio: wav })]);
    expect(pptx.slides).toHaveLength(2);
    const [pictureSlide, meaningSlide] = pptx.slides;
    expect(pictureSlide.images).toHaveLength(1);
    const image = pictureSlide.images[0];
    expect(image).toMatchObject({ data: PNG, altText: 'A green maple leaf' });
    expect(image.w / image.h).toBeCloseTo(2, 5);
    expect(image.w).toBeLessThanOrEqual(11.3 + 1e-9);
    // The picture stays inside its area: below the word, above the credit line.
    expect(image.y).toBeGreaterThanOrEqual(2.15 - 1e-9);
    expect(image.y + image.h).toBeLessThanOrEqual(2.15 + 3.9 + 1e-9);
    expect(image.x + image.w / 2).toBeCloseTo(1.0 + 11.3 / 2, 5);
    expect(pictureSlide.texts.map(entry => flat(entry.text))).toEqual(expect.arrayContaining(['leaf', 'Wikimedia Commons · A. Botanist · CC BY 4.0']));
    expect(pictureSlide.sounds.length).toBeGreaterThan(0);
    expect(meaningSlide.images).toHaveLength(0);
    expect(meaningSlide.sounds).toHaveLength(0);
    expect(meaningSlide.texts.map(entry => flat(entry.text)).join(' ')).toContain('A flat green part of a plant.');
  });

  it('reads JPEG and GIF sizes too', async () => {
    const jpeg = (await build([leaf({ image: JPEG })])).slides[0].images[0];
    expect(jpeg.w / jpeg.h).toBeCloseTo(600 / 300, 5);
    const gif = (await build([leaf({ image: GIF })])).slides[0].images[0];
    expect(gif.w / gif.h).toBeCloseTo(120 / 60, 5);
  });

  it('adds no picture slide for links, WebP, decorative-free sets with pictures off, or other activities', async () => {
    expect((await build([leaf({ image: LINK })])).slides).toHaveLength(1);
    expect((await build([leaf({ image: WEBP })])).slides).toHaveLength(1);
    expect((await build([leaf()], { includePictures: false })).slides).toHaveLength(1);
    const popup = await build([leaf()], { mode: 'popup' });
    expect(popup.slides.every(slide => !slide.images.length)).toBe(true);
  });
});
