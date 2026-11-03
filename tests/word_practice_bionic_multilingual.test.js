import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const sources = {
  source: ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n'),
  runtime: readFileSync('word_practice_module.js', 'utf8'),
};
const japanese = '「私は猫が好きです」', thai = 'ภาษาไทย。', hindi = 'क्‍षमा';
const input = { language: 'French', words: [{ word: 'Cafe\u0301', definition: 'Un mot.',
  translations: { Japanese: japanese, Thai: thai, Hindi: hindi } }], options: { mode: 'vocabulary', shuffle: false, repetitions: 1 } };
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);

async function open(page, code) {
  await page.setContent('<html lang="fr" style="font-size:200%"><body></body></html>');
  await page.addScriptTag({ content: code });
  await page.evaluate(fixture => {
    const listeners = new Set();
    let bionic = true;
    window.__alloReadingSettings = {
      get: () => ({ bionic }),
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
    window.setEmphasis = value => { bionic = value; listeners.forEach(fn => fn()); };
    window.wordLocales = [];
    const Segmenter = Intl.Segmenter;
    Intl.Segmenter = class extends Segmenter {
      constructor(locale, options) { super(locale, options); if (options.granularity === 'word') window.wordLocales.push(locale); }
    };
    AlloModules.WordPractice.open(fixture);
  }, input);
}
async function marked(surface, lang) {
  return surface.locator('[lang="' + lang + '"]').filter({ hasText: lang === 'ja' ? japanese : lang === 'th' ? thai : hindi }).last()
    .evaluate(el => ({ text: el.textContent, bold: [...el.querySelectorAll('b[data-awp-bionic]')].map(b => b.textContent) }));
}
async function checkWords(surface) {
  expect(await marked(surface, 'ja')).toEqual({ text: japanese, bold: ['私', 'は', '猫', 'が', '好', 'で'] });
  expect(await marked(surface, 'th')).toEqual({ text: thai, bold: ['ภา', 'ไท'] });
  expect(await marked(surface, 'hi')).toEqual({ text: hindi, bold: ['क्‍ष'] });
}

describe('multilingual card emphasis', () => {
  it.each(Object.keys(sources))('uses the language of each passage in preview, live cards and offline HTML (%s)', async lane => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    try {
      await open(page, sources[lane]);
      const preview = page.locator('.awp-card-preview');
      await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
      await checkWords(preview);
      expect(await page.evaluate(() => wordLocales)).toEqual(expect.arrayContaining(['ja', 'th']));
      const font = page.locator('.awp-appearance').getByLabel('Card font', { exact: true });
      await font.focus(); await page.evaluate(() => setEmphasis(false));
      expect(await marked(preview, 'ja')).toEqual({ text: japanese, bold: [] });
      expect(await font.evaluate(el => document.activeElement === el)).toBe(true);
      await page.evaluate(() => setEmphasis(true)); await checkWords(preview);
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      await page.locator('.awp-player').getByRole('button', { name: 'Show meaning', exact: true }).click();
      await checkWords(page.locator('.awp-stage'));
      const html = await page.evaluate(fixture => AlloModules.WordPractice.buildHtml(fixture, fixture.options, undefined, undefined, { settings: { bionic: true } }), input);
      const offline = await browser.newPage({ viewport: { width: 320, height: 900 } });
      try {
        await offline.setContent(html); await offline.getByRole('button', { name: 'Show meaning', exact: true }).click();
        await checkWords(offline.locator('.awp-stage'));
      } finally { await offline.close(); }
    } finally { await page.close(); }
  }, 45_000);

  it.each(['missing', 'throws'])('keeps complex text intact when Intl segmentation is unavailable (%s)', async variant => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body></body></html>'); await page.addScriptTag({ content: sources.source });
      await page.evaluate(({ fixture, variant }) => {
        Intl.Segmenter = variant === 'missing' ? undefined : class { segment() { throw new RangeError('Segmenter unavailable'); } };
        window.__alloReadingSettings = { get: () => ({ bionic: true }) };
        AlloModules.WordPractice.open(fixture);
      }, { fixture: input, variant });
      const preview = page.locator('.awp-card-preview');
      await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
      for (const [language, text] of [['ja', japanese], ['th', thai], ['hi', hindi]]) {
        expect(await marked(preview, language)).toEqual({ text, bold: [] });
      }
      expect(await preview.locator('.awp-preview-word').textContent()).toBe(input.words[0].word.normalize('NFC'));
      expect(await preview.locator('.awp-preview-word b').textContent()).toBe('Ca');
    } finally { await page.close(); }
  });
});
