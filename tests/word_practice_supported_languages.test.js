import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const lanes = {
  source: ['word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const locales = JSON.parse(fs.readFileSync('lang/manifest.json', 'utf8')).available;
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
function load(lane, canonicalLocales = true) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only' });
  const win = dom.window; windows.push(win);
  if (!canonicalLocales) Object.defineProperty(win.Intl, 'getCanonicalLocales', { value: undefined });
  win.eval(lanes[lane]);
  return win;
}
const flatten = value => Array.isArray(value) ? value.map(part => part.text).join('') : value;
class Presentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], addText(text, options) { this.texts.push({ text, options }); } };
    this.slides.push(slide); return slide;
  }
}
const labels = { mode_popup: 'تمرین روان‌خوانی واژه', card_progress: 'کارت {n} از {total}', previous: 'قبلی' };

describe.each(Object.keys(lanes))('supported Word Practice languages (%s)', lane => {
  it('resolves every supported UI display name without an English or automatic fallback', () => {
    const core = load(lane).AlloWordPracticeCore;
    for (const locale of locales) {
      const info = core.languageInfo(locale.display);
      expect(info.tag, locale.display).not.toBe('');
      expect(info.tag, locale.display).not.toBe('en');
      expect(info.dir, locale.display).toMatch(/^(ltr|rtl)$/);
    }
    expect(core.languageInfo('An unknown language')).toEqual({ tag: '', dir: 'auto' });
  });

  it('keeps named and tagged Dari RTL even without Intl canonicalization', () => {
    const core = load(lane, false).AlloWordPracticeCore;
    expect(core.languageInfo('Dari')).toEqual({ tag: 'prs', dir: 'rtl' });
    expect(core.languageInfo('prs-AF')).toEqual({ tag: 'prs-AF', dir: 'rtl' });
    expect(core.languageInfo('prs-Latn')).toEqual({ tag: 'prs-Latn', dir: 'ltr' });
  });

  it('retains Dari UI direction and English word tags in the offline export', () => {
    const win = load(lane), ui = win.AlloModules.WordPractice;
    const html = ui.buildHtml({ language: 'English', words: ['leaf'] }, { repetitions: 1, includeAudio: false }, undefined, labels, null, 'Dari');
    const dom = new JSDOM(html, { runScripts: 'dangerously' }); windows.push(dom.window);
    const doc = dom.window.document;
    expect(doc.documentElement.dir).toBe('rtl');
    expect(doc.documentElement.lang).toBe(win.AlloWordPracticeCore.languageInfo('Dari').tag);
    expect(doc.querySelector('.awp-player').dir).toBe('rtl');
    expect(doc.querySelector('.awp-word').lang).toBe('en');
    expect([...doc.querySelectorAll('button')].find(node => node.textContent === labels.previous).dir).toBe('rtl');
  });

  it('writes Dari labels with RTL direction and keeps English source text separate in PowerPoint', async () => {
    const win = load(lane);
    const pptx = await win.AlloWordPracticeMedia.buildPptx({ language: 'English', words: ['leaf'] }, { repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation, labels, currentUiLanguage: 'Dari' });
    const texts = pptx.slides[0].texts;
    const footer = texts.find(part => flatten(part.text).includes('کارت'));
    expect(footer.options.rtlMode).toBe(true);
    expect(footer.text[0].options.lang).toBe(win.AlloWordPracticeCore.languageInfo('Dari').tag);
    expect(texts.find(part => part.text === 'leaf').options).toMatchObject({ lang: 'en', rtlMode: false });
  });
});
