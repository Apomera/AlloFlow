import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const read = file => readFileSync(file, 'utf8');
const ui = read(process.env.WORD_PRACTICE_UI || 'word_practice_ui.js');
const runtime = read(process.env.WORD_PRACTICE_BUNDLE || 'word_practice_module.js');
const lanes = [['source', read('word_practice_core.js') + '\n' + ui], ['runtime', runtime]];
const output = 'tmp/card-flow-refinements-20261101/ui';
const words = [
  { word: 'Leaf', definition: 'A plant part.', termLanguage: 'English' },
  { word: 'شمس', definition: 'The sun.', termLanguage: 'Arabic', definitionLanguage: 'English' },
  { word: '本', definition: 'A book.', termLanguage: 'Japanese', definitionLanguage: 'English' },
];
const input = { title: 'Garden words', words, options: { mode: 'vocabulary', repetitions: 1, shuffle: false, varyPosition: true, includeAudio: false } };
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);
const progress = page => page.locator('.awp-player .awp-progress').textContent();
const note = page => page.locator('.awp-preview-reading-note');
const font = node => node.evaluate(el => { const style = getComputedStyle(el); return { family: style.fontFamily, size: style.fontSize, color: style.color }; });

describe.each(lanes)('direction-aware card shortcuts (%s)', (lane, code) => {
  it.each(['English', 'Arabic'].flatMap(language => ['presenter', 'offline'].map(surface => ({ language, surface }))))('uses the visual next direction in $language $surface without taking control keys', async ({ language, surface }) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await page.setContent('<!doctype html><html lang="en"><body></body></html>'); await page.addScriptTag({ content: code });
      const html = await page.evaluate(({ input, language, surface }) => {
        if (surface === 'offline') return AlloModules.WordPractice.buildHtml(input, undefined, undefined, undefined, null, language);
        AlloModules.WordPractice.open({ ...input, currentUiLanguage: language });
      }, { input, language, surface });
      if (surface === 'offline') await page.setContent(html);
      else {
        expect(await note(page).count()).toBe(0);
        const preview = page.locator('.awp-appearance');
        await preview.getByRole('button', { name: 'Next', exact: true }).focus(); await page.keyboard.press('Enter');
        expect(await page.locator('.awp-preview-progress').textContent()).toBe('Card 2 of 3');
        await page.locator('.awp-preview-picker').focus(); await page.keyboard.press('ArrowUp');
        expect(await page.locator('.awp-preview-progress').textContent()).toBe('Card 1 of 3');
        await page.getByRole('button', { name: 'Present', exact: true }).click();
      }
      const player = page.locator('.awp-player'), stage = player.locator('.awp-stage');
      const forward = language === 'Arabic' ? 'ArrowLeft' : 'ArrowRight', backward = language === 'Arabic' ? 'ArrowRight' : 'ArrowLeft';
      const nextBox = await player.getByRole('button', { name: 'Next', exact: true }).boundingBox();
      const previousBox = await player.getByRole('button', { name: 'Previous', exact: true }).boundingBox();
      expect(nextBox.x < previousBox.x).toBe(language === 'Arabic');
      await stage.focus(); await page.keyboard.press(forward);
      expect(await progress(page)).toBe('Card 2 of 3'); expect(await stage.locator('.awp-word').getAttribute('lang')).toBe('ar');
      expect(await stage.evaluate(el => el === document.activeElement)).toBe(true);
      await page.keyboard.press('r'); expect(await stage.locator('.awp-definition').textContent()).toBe('The sun.');
      await page.keyboard.press(backward); expect(await progress(page)).toBe('Card 1 of 3');
      await stage.evaluate((el, rtl) => {
        const start = rtl ? 100 : 250, end = rtl ? 250 : 100;
        el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', isPrimary: true, clientX: start, clientY: 200, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', isPrimary: true, clientX: end, clientY: 200, bubbles: true }));
      }, language === 'Arabic');
      expect(await progress(page)).toBe('Card 2 of 3');
      await stage.focus(); await page.keyboard.press('Space'); expect(await progress(page)).toBe('Card 3 of 3');
      await page.keyboard.press(backward); await page.keyboard.press('r');
      const position = await stage.getAttribute('data-position');
      await player.locator('.awp-appearance-panel>summary').focus(); await page.keyboard.press(forward);
      expect(await progress(page)).toBe('Card 2 of 3');
      await page.keyboard.press('Enter');
      await player.getByLabel('Card font', { exact: true }).focus(); await page.keyboard.press('ArrowDown');
      expect(await player.getByLabel('Card font', { exact: true }).inputValue()).toBe('arial');
      expect(await stage.getAttribute('data-position')).toBe(position);
      expect(await stage.locator('.awp-definition').textContent()).toBe('The sun.');
      const excluded = await player.evaluate((host, forward) => {
        const result = [];
        for (const type of ['input', 'textarea', 'annotation', 'dialog']) {
          const owner = document.createElement('div'), control = document.createElement(type === 'input' || type === 'textarea' ? type : 'button');
          if (type === 'annotation') owner.className = 'allo-anno-scope';
          if (type === 'dialog') owner.setAttribute('role', 'dialog');
          owner.appendChild(control); host.appendChild(owner); control.focus();
          const event = new KeyboardEvent('keydown', { key: forward, bubbles: true, cancelable: true });
          control.dispatchEvent(event); result.push([type, event.defaultPrevented, host.querySelector('.awp-progress').textContent]); owner.remove();
        }
        return result;
      }, forward);
      expect(excluded).toEqual(['input', 'textarea', 'annotation', 'dialog'].map(type => [type, false, 'Card 2 of 3']));
      await stage.focus(); await page.keyboard.press('Control+' + forward); expect(await progress(page)).toBe('Card 2 of 3');
      await page.setViewportSize({ width: 320, height: 900 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      expect(await stage.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      if (lane === 'runtime' && language === 'Arabic' && surface === 'offline') await stage.screenshot({ path: output + '/rtl-card-320.png' });
    } finally { await page.close(); }
  }, 60_000);

  it('explains export opt-in while preserving the preview and live reader appearance', async () => {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } }), offline = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    try {
      await page.setContent('<!doctype html><html style="font-size:24px"><body></body></html>'); await page.addScriptTag({ content: code });
      await page.evaluate(input => {
        const settings = { fontFamily: 'Verdana, sans-serif', baseFontSize: 24, readingTheme: 'dark' };
        window.__alloReadingSettings = { get: () => settings };
        AlloModules.UIFontLibrary = { readingSettingsAvailable: () => true, openReadingSettings() {}, readerExportCss: () => 'html{font-size:24px}', exportFontFaceCss: async () => ({ css: '' }) };
        URL.createObjectURL = blob => { window.exported = blob.text(); return 'blob:reader'; }; HTMLAnchorElement.prototype.click = () => {};
        AlloModules.WordPractice.open({ ...input, currentUiLanguage: 'Arabic', t: key => key === 'reading_settings.use_mine' ? 'استخدام إعدادات القراءة الخاصة بي' : key });
      }, input);
      const checkbox = page.getByRole('checkbox', { name: 'استخدام إعدادات القراءة الخاصة بي', exact: true });
      expect(await checkbox.isChecked()).toBe(false);
      expect(await note(page).getAttribute('lang')).toBe('en'); expect(await note(page).getAttribute('dir')).toBe('ltr');
      expect(await note(page).locator('span').getAttribute('lang')).toBe('ar'); expect(await note(page).locator('span').getAttribute('dir')).toBe('rtl');
      expect(await note(page).textContent()).toBe('Preview and live practice use your reading settings. Select استخدام إعدادات القراءة الخاصة بي to include them in downloads.');
      await page.locator('.awp-appearance').getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
      const before = await font(page.locator('.awp-preview-word'));
      await checkbox.check();
      expect(await note(page).textContent()).toBe('Reading settings are enabled for downloads.');
      expect(await checkbox.evaluate(el => el === document.activeElement)).toBe(true);
      expect(await page.locator('.awp-preview-progress').textContent()).toBe('Card 2 of 3');
      expect(await page.locator('.awp-preview-definition').textContent()).toBe('The sun.');
      expect(await font(page.locator('.awp-preview-word'))).toEqual(before);
      const download = async () => {
        await page.evaluate(() => { window.exported = null; });
        await page.getByRole('button', { name: 'Download HTML', exact: true }).click();
        await page.waitForFunction(() => !!window.exported); return page.evaluate(() => exported);
      };
      const enabled = await download();
      await checkbox.uncheck();
      expect(await font(page.locator('.awp-preview-word'))).toEqual(before);
      const disabled = await download();
      await offline.setContent(enabled);
      expect(await offline.evaluate(() => window.__alloWordPracticeReader)).toMatchObject({ fontFamily: 'Verdana, sans-serif', baseFontSize: 24 });
      expect((await font(offline.locator('.awp-word'))).family).toContain('Verdana');
      expect(await offline.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('24px');
      await offline.setContent(disabled);
      expect(await offline.evaluate(() => window.__alloWordPracticeReader)).toBeNull();
      expect((await font(offline.locator('.awp-word'))).family).not.toContain('Verdana');
      expect(await offline.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('16px');
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      const player = page.locator('.awp-player');
      expect((await font(player.locator('.awp-word'))).family).toBe(before.family);
      expect((await font(player.locator('.awp-word'))).color).toBe(before.color);
    } finally { await offline.close(); await page.close(); }
  }, 60_000);
});
