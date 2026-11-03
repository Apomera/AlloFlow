import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const lanes = [
  ['source', ['word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n')],
  ['runtime', fs.readFileSync('word_practice_module.js', 'utf8')],
];
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const options = { mode: 'vocabulary', repetitions: 1, shuffle: false, includeAudio: false };
const button = (doc, text) => [...doc.querySelectorAll('button')].find(node => node.textContent === text && !node.parentElement.closest('[hidden]'));
const englishOrigin = 'From an old word for a plant leaf.';
const arabicOrigin = 'من كلمة قديمة تعني ورقة النبات.';
const leaf = extra => ({ word: 'hoja', definition: 'Una parte de una planta.', definitionLanguage: 'Spanish', ...extra });
function setup(source) {
  const win = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only' }).window;
  windows.push(win); win.eval(source); return win;
}
function offline(win, pack, beforeParse) {
  const html = win.AlloModules.WordPractice.buildHtml(pack, options, undefined, undefined, undefined, 'English');
  const player = new JSDOM(html, { runScripts: 'dangerously', beforeParse }).window;
  windows.push(player); return player;
}
class Presentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], addText(text, options) { this.texts.push({ text, options }); }, addNotes() {} };
    this.slides.push(slide); return slide;
  }
}

describe.each(lanes)('word origin languages (%s)', (_, source) => {
  it.each([
    ['fallback map', { etymology: englishOrigin, etymologyByLang: { English: englishOrigin, French: 'Du vieux français.' } }, englishOrigin, 'English'],
    ['trimmed saved map', { etymology: englishOrigin, etymologyByLang: { ' English ': englishOrigin } }, englishOrigin, 'English'],
    ['alias match', { definitionLanguage: 'ar', etymology: englishOrigin, etymologyByLang: { Arabic: arabicOrigin } }, arabicOrigin, 'Arabic'],
    ['exact match', { definitionLanguage: 'ar', etymologyByLang: { Arabic: arabicOrigin, ar: 'أصل محفوظ.' } }, 'أصل محفوظ.', 'ar'],
    ['script kept', { definitionLanguage: 'ar-Latn', etymology: englishOrigin, etymologyByLang: { Arabic: arabicOrigin, English: englishOrigin } }, englishOrigin, 'English'],
    ['region kept', { definitionLanguage: 'pt-PT', etymology: englishOrigin, etymologyByLang: { 'pt-BR': 'Uma origem brasileira.', English: englishOrigin } }, englishOrigin, 'English'],
    ['explicit origin script', { origin: 'min kalima qadima.', originLanguage: 'ar-Latn' }, 'min kalima qadima.', 'ar-Latn'],
    ['explicit origin region', { origin: 'Uma origem.', originLanguage: 'pt-PT' }, 'Uma origem.', 'pt-PT'],
    ['saved origin priority', { origin: 'Uma origem.', originLanguage: 'pt-PT', etymologyByLang: { 'pt-BR': 'Uma origem.' } }, 'Uma origem.', 'pt-PT'],
    ['legacy saved origin', { origin: 'De una palabra antigua.' }, 'De una palabra antigua.', 'Spanish'],
    ['legacy etymology', { etymology: 'De una palabra antigua.' }, 'De una palabra antigua.', 'Spanish'],
    ['unknown origin language', { origin: englishOrigin, originLanguage: 'A classroom language' }, englishOrigin, 'A classroom language'],
    ['roots only use meaning language', { roots: [{ root: 'phōs', lang: 'Greek', meaning: 'luz' }] }, 'phōs (luz)', 'Spanish'],
    ['roots unchanged', { etymology: englishOrigin, etymologyByLang: { English: englishOrigin }, roots: [{ root: 'phōs', meaning: 'luz' }] }, englishOrigin + ' · phōs (luz)', 'English'],
  ])('preserves %s prose and language across saved word sets', (name, fields, origin, language) => {
    const core = setup(source).AlloWordPracticeCore, input = { language: 'English', words: [leaf(fields)] }, before = JSON.stringify(input);
    const pack = core.normalizeInput(input);
    expect(pack.items[0]).toMatchObject({ origin, originLanguage: language });
    expect(core.fieldLanguage(pack.items[0], 'origin', pack.language)).toBe(language);
    const saved = JSON.parse(core.serializePack(pack));
    expect(saved.items[0].originLanguage).toBe(language);
    expect(core.normalizeInput(saved).items[0]).toEqual(pack.items[0]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('keeps an adopted origin and its language together when duplicate records merge', () => {
    const core = setup(source).AlloWordPracticeCore;
    const pack = core.normalizeInput({ words: [leaf({ entryId: 'leaf' }), leaf({ entryId: 'leaf', origin: englishOrigin, originLanguage: 'English' })] });
    expect(pack.items).toHaveLength(1);
    expect(pack.items[0]).toMatchObject({ origin: englishOrigin, originLanguage: 'English' });
    expect(core.fieldLanguage({ definitionLanguage: 'Arabic' }, 'origin', 'English')).toBe('Arabic');
    expect(core.fieldLanguage({}, 'origin', 'French')).toBe('French');
  });

  it.each([
    ['English fallback', { etymology: englishOrigin, etymologyByLang: { English: englishOrigin }, definitionLanguage: 'Arabic' }, englishOrigin, 'en', 'ltr'],
    ['Arabic origin', { origin: arabicOrigin, originLanguage: 'Arabic' }, arabicOrigin, 'ar', 'rtl'],
    ['Latin-script Arabic', { origin: 'min kalima qadima.', originLanguage: 'ar-Latn' }, 'min kalima qadima.', 'ar-Latn', 'ltr'],
  ])('uses %s in preview, presenter, offline cards and screen-reader announcements', async (name, fields, prose, tag, dir) => {
    const win = setup(source), pack = { language: 'Spanish', words: [leaf(fields)], options };
    win.AlloModules.WordPractice.open(pack);
    button(win.document.querySelector('.awp-appearance'), 'Show meaning').click();
    const check = node => { expect(node.textContent).toBe(prose); expect(node.lang).toBe(tag); expect(node.dir).toBe(dir); };
    check(win.document.querySelector('.awp-preview-origin > span[lang]'));
    button(win.document, 'Present').click();
    await vi.waitFor(() => expect(win.document.querySelector('.awp-player')).toBeTruthy());
    button(win.document, 'Show meaning').click();
    check(win.document.querySelector('.awp-origin > span[lang]'));
    check([...win.document.querySelectorAll('.awp-sr span[lang]')].find(node => node.textContent === prose));
    const doc = offline(win, pack).document;
    button(doc, 'Show meaning').click();
    check(doc.querySelector('.awp-origin > span[lang]'));
    check([...doc.querySelectorAll('.awp-sr span[lang]')].find(node => node.textContent === prose));
  });

  it('keeps the language through the offline Save word set JSON and subsequent reopening', async () => {
    const win = setup(source), pack = { language: 'Spanish', words: [leaf({ etymology: englishOrigin, etymologyByLang: { English: englishOrigin } })] };
    let blob;
    const player = offline(win, pack, offlineWin => {
      offlineWin.URL.createObjectURL = value => { blob = value; return 'blob:origin-set'; };
      offlineWin.URL.revokeObjectURL = () => {};
      offlineWin.HTMLAnchorElement.prototype.click = () => {};
    });
    button(player.document, 'Save word set').click();
    await vi.waitFor(() => expect(button(player.document, 'I saved the file')).toBeTruthy());
    button(player.document, 'I saved the file').click();
    const json = await new Promise((resolve, reject) => {
      const reader = new player.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob);
    });
    const saved = JSON.parse(json);
    expect(saved.items[0]).toMatchObject({ origin: englishOrigin, originLanguage: 'English', definitionLanguage: 'Spanish' });
    const reopened = offline(win, saved).document;
    button(reopened, 'Show meaning').click();
    expect(reopened.querySelector('.awp-origin > span[lang]').lang).toBe('en');
    expect(reopened.querySelector('.awp-origin > span[lang]').textContent).toBe(englishOrigin);
  });

  it.each([
    [{ etymology: englishOrigin, etymologyByLang: { English: englishOrigin }, definitionLanguage: 'Arabic' }, englishOrigin, 'en', false],
    [{ origin: arabicOrigin, originLanguage: 'Arabic' }, arabicOrigin, 'ar', true],
    [{ origin: 'min kalima qadima.', originLanguage: 'ar-Latn' }, 'min kalima qadima.', 'ar-Latn', false],
  ])('exports origin text with its own PowerPoint language and direction', async (fields, prose, tag, rtl) => {
    const win = setup(source), deck = await win.AlloWordPracticeMedia.buildPptx({ words: [leaf(fields)] }, options, undefined, { PptxGenJS: Presentation });
    const text = deck.slides.flatMap(slide => slide.texts).find(entry => Array.isArray(entry.text) && entry.text.some(run => run.text === prose));
    const run = text.text.find(run => run.text === prose);
    expect(run.options.lang).toBe(tag);
    expect(run.options.rtlMode).toBe(rtl);
    expect(text.options.rtlMode).toBe(rtl);
    expect(text.options.align).toBe(rtl ? 'right' : 'left');
  });
});

it('writes the distinct origin language into a real PowerPoint package', async () => {
  const win = setup(lanes[1][1]);
  win.eval(fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8') + '\nwindow.originPptx = PptxGenJS;');
  const deck = await win.AlloWordPracticeMedia.buildPptx({ words: [leaf({ origin: arabicOrigin, originLanguage: 'Arabic' })] }, options, undefined, { PptxGenJS: win.originPptx });
  const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
  const xml = await Promise.all(Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).map(name => zip.file(name).async('string')));
  const slide = xml.find(value => value.includes(arabicOrigin));
  expect(slide).toBeTruthy();
  const doc = new win.DOMParser().parseFromString(slide, 'application/xml');
  const run = [...doc.getElementsByTagName('a:r')].find(node => node.getElementsByTagName('a:t')[0]?.textContent === arabicOrigin);
  expect(run.getElementsByTagName('a:rPr')[0].getAttribute('lang')).toBe('ar');
  expect(run.parentElement.getElementsByTagName('a:pPr')[0].getAttribute('rtl')).toBe('1');
});
