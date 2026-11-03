import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const source = ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n');
const runtime = readFileSync('word_practice_module.js', 'utf8');
const fontLibrary = readFileSync('ui_font_library_module.js', 'utf8');
const fixture = { title: 'Plant words', words: [{ word: 'Leaf', definition: 'جزء من النبات', definitionLanguage: 'Arabic', translations: { French: 'Feuille' } }],
  options: { mode: 'vocabulary', shuffle: false, repetitions: 1, cardTextScale: 1.1 }, currentUiLanguage: 'Arabic' };
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);

async function open(page, code) {
  await page.setContent('<!doctype html><html style="font-size:200%"><body></body></html>');
  await page.addScriptTag({ content: code }); await page.addScriptTag({ content: fontLibrary });
  await page.evaluate(input => {
    const listeners = new Set();
    const settings = { fontFamily: "'Andika', sans-serif", fontClass: 'font-andika-bold-italic', fontId: 'andika-bold-italic', bionic: false, readingTheme: 'dark' };
    document.body.className = settings.fontClass;
    window.__alloReadingSettings = {
      get: () => settings,
      set(patch) { Object.assign(settings, patch); document.body.className = settings.fontClass; for (const fn of listeners) fn(); },
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
    // The test compares declared CSS faces and weights without requiring font downloads.
    AlloModules.UIFontLibrary.exportFontFaceCss = async () => ({ css: '' });
    URL.createObjectURL = blob => { window.lastExport = blob.text(); return 'blob:card-test'; };
    HTMLAnchorElement.prototype.click = () => {};
    AlloModules.WordPractice.open(input);
  }, fixture);
}
const look = locator => locator.evaluate(el => {
  const css = getComputedStyle(el);
  return [css.fontFamily.split(',')[0].replace(/['"]/g, ''), css.fontStyle, css.fontWeight];
});

describe.each([['source', source], ['runtime', runtime]])('card font variants (%s)', (_, code) => {
  it('restores the selected face and hierarchy in setup, live cards and downloaded HTML', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    const offline = await browser.newPage({ viewport: { width: 320, height: 900 } });
    try {
      await open(page, code);
      const setup = page.locator('.awp-appearance'), preview = page.locator('.awp-card-preview');
      await setup.getByRole('button', { name: 'Show meaning', exact: true }).click();
      const meaning = preview.locator('.awp-preview-definition'), word = preview.locator('.awp-preview-word');
      expect(await look(meaning)).toEqual(['Andika', 'italic', '700']);
      await setup.getByLabel('Card font', { exact: true }).selectOption('georgia');
      expect(await look(meaning)).toEqual(['Georgia', 'normal', '400']);
      expect(await look(word)).toEqual(['Georgia', 'normal', '750']);
      expect(await look(preview.locator('.awp-preview-language-name'))).toEqual(['Georgia', 'normal', '650']);
      expect(await meaning.getAttribute('dir')).toBe('rtl');
      const translation = preview.locator('.awp-preview-translation');
      expect(await translation.evaluate(el => getComputedStyle(el.parentElement).borderBlockStartWidth)).toBe('1px');
      expect(await translation.evaluate(el => getComputedStyle(el.parentElement).borderBlockStartColor)).toBe('rgb(121, 121, 171)');
      expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      const player = page.locator('.awp-player');
      await player.getByRole('button', { name: 'Show meaning', exact: true }).click();
      await player.locator('.awp-appearance-panel > summary').click();
      const liveFont = player.getByLabel('Card font', { exact: true });
      const liveMeaning = player.locator('.awp-stage .awp-definition');
      expect(await look(liveMeaning)).toEqual(['Georgia', 'normal', '400']);
      await liveFont.selectOption('default');
      expect(await look(liveMeaning)).toEqual(['Andika', 'italic', '700']);
      await page.evaluate(() => __alloReadingSettings.set({ fontClass: 'font-andika-italic', fontId: 'andika-italic' }));
      expect(await look(liveMeaning)).toEqual(['Andika', 'italic', '400']);
      await liveFont.selectOption('verdana');
      await player.getByRole('button', { name: 'Back to setup', exact: true }).click();
      await page.getByLabel('Use my reading settings', { exact: true }).check();
      await page.getByRole('button', { name: 'Download HTML', exact: true }).click();
      await page.waitForFunction(() => !!window.lastExport);
      await offline.setContent(await page.evaluate(() => lastExport));
      expect(await offline.evaluate(() => window.__alloWordPracticeReader.fontClass)).toBe('font-andika-italic');
      await offline.getByRole('button', { name: 'Show meaning', exact: true }).click();
      const offlineMeaning = offline.locator('.awp-stage .awp-definition');
      expect(await look(offlineMeaning)).toEqual(['Verdana', 'normal', '400']);
      await offline.locator('.awp-appearance-panel > summary').click();
      await offline.getByLabel('Card font', { exact: true }).selectOption('default');
      expect(await look(offlineMeaning)).toEqual(['Andika', 'italic', '400']);
    } finally { await offline.close(); await page.close(); }
  }, 60_000);

  it('localizes percentages and replaces an imported custom size in order', async () => {
    const page = await browser.newPage();
    try {
      await open(page, code);
      const select = page.locator('.awp-appearance').getByLabel('Card text size', { exact: true });
      const localized = await page.evaluate(() => new Intl.NumberFormat('ar', { style: 'percent' }).format(1.1));
      expect(await select.locator('option:checked').textContent()).toBe(localized);
      const imported = { ...fixture, options: { ...fixture.options, cardTextScale: 1.3 } };
      await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'word-set.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
      await page.waitForFunction(() => document.querySelector('.awp-appearance select[id$="cardTextScale"]').value === '1.3');
      expect(await select.locator('option').evaluateAll(options => options.map(option => option.value))).toEqual(['0.85', '1', '1.2', '1.3', '1.4']);
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      const player = page.locator('.awp-player');
      await player.locator('.awp-appearance-panel > summary').click();
      const expected = await page.evaluate(() => new Intl.NumberFormat('ar', { style: 'percent' }).format(1.3));
      expect(await player.getByLabel('Card text size', { exact: true }).locator('option:checked').textContent()).toBe(expected);
    } finally { await page.close(); }
  }, 60_000);
});
