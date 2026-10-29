import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const source = ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n');
const fontLibrary = readFileSync('ui_font_library_module.js', 'utf8');
const output = 'tmp/word-practice-appearance';
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);
async function open() {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html lang="en"><head><style>.font-verdana,.font-verdana *{font-family:Verdana,sans-serif!important}</style></head><body class="font-verdana"></body></html>');
  await page.addScriptTag({ content: source });
  await page.addScriptTag({ content: fontLibrary });
  await page.evaluate(() => {
    window.fixture = { title: 'Words across languages', language: 'Spanish', words: [{ word: 'Hoja', definition: 'A plant part that catches sunlight.', definitionLanguage: 'English', translations: { Arabic: 'ورقة النبات', Japanese: '植物の葉', Hindi: 'पौधे का पत्ता' } }], options: { mode: 'vocabulary', repetitions: 1, shuffle: false } };
    AlloModules.WordPractice.open(fixture);
  });
  return page;
}
describe('Word Sounds appearance in the browser', () => {
  it('honors reading defaults, gives explicit card fonts precedence, and retains the preview appearance in the player', async () => {
    const page = await open();
    try {
      const setup = page.locator('.awp-appearance'), preview = page.locator('.awp-card-preview');
      expect(await preview.locator('.awp-preview-word').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Verdana');
      await setup.getByLabel('Card font', { exact: true }).selectOption('georgia');
      await setup.getByLabel('Card style', { exact: true }).selectOption('cream');
      expect(await preview.locator('.awp-preview-word').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Georgia');
      const previewColor = await preview.evaluate(el => getComputedStyle(el).backgroundColor);
      await setup.getByRole('button', { name: 'Show meaning', exact: true }).click();
      await preview.scrollIntoViewIfNeeded(); await page.screenshot({ path: output + '/multilingual-preview-desktop.png' });
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      await page.getByRole('button', { name: 'Show meaning', exact: true }).click();
      const stage = page.locator('.awp-stage'), player = page.locator('.awp-player');
      expect(await stage.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(previewColor);
      expect(await stage.locator('.awp-word').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Georgia');
      const before = await stage.locator('.awp-word').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      await player.locator('.awp-appearance-panel summary').click();
      await player.getByLabel('Card text size', { exact: true }).selectOption('1.4');
      expect(await stage.locator('.awp-word').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(before * 1.3);
      expect(await stage.locator('.awp-definition').textContent()).toBe('A plant part that catches sunlight.');
      await player.getByLabel('Card font', { exact: true }).selectOption('default');
      expect(await stage.locator('.awp-word').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Verdana');
      for (const theme of ['paper', 'cream', 'mist']) {
        await player.getByLabel('Card style', { exact: true }).selectOption(theme);
        expect(await stage.evaluate((el, theme) => { const expected = AlloWordPracticeCore.cardAppearance({ cardTheme: theme }); const sample = document.createElement('span'); sample.style.color = '#' + expected.heading; document.body.appendChild(sample); const color = getComputedStyle(sample).color; sample.remove(); return getComputedStyle(el.querySelector('.awp-word')).color === color; }, theme)).toBe(true);
      }
    } finally { await page.close(); }
  }, 45_000);

  it('keeps multilingual previews and offline appearance controls usable at 320px and 200% text', async () => {
    const page = await open();
    try {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await page.locator('.awp-appearance').getByLabel('Card text size', { exact: true }).selectOption('1.4');
      await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
      await page.locator('.awp-card-preview').scrollIntoViewIfNeeded();
      expect(await page.locator('.awp-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.locator('.awp-card-preview').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.locator('.awp-preview-translation[lang=ar]').getAttribute('dir')).toBe('rtl');
      await page.screenshot({ path: output + '/multilingual-preview-320-200percent.png' });
      const html = await page.evaluate(() => AlloModules.WordPractice.buildHtml(fixture, { ...fixture.options, cardFont: 'georgia', cardTextScale: 1.4, cardTheme: 'mist' }, undefined, { appearance: 'مظهر البطاقة' }, { css: AlloModules.UIFontLibrary.readerExportCss({ fontFamily: 'Verdana,sans-serif', lineHeight: 1.8, letterSpacing: 0.05 }) }, 'Arabic'));
      await page.setContent(html);
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const summary = page.locator('.awp-appearance-panel summary'); await summary.focus(); await page.keyboard.press('Space');
      expect(await page.locator('.awp-appearance-panel').getAttribute('open')).not.toBe(null);
      await page.getByRole('button', { name: 'Show meaning', exact: true }).click();
      const arabic = page.locator('.awp-stage .awp-translation[lang=ar]');
      for (const [font, family] of [['georgia', 'Georgia'], ['verdana', 'Verdana'], ['arial', 'Arial']]) {
        await page.getByLabel('Card font', { exact: true }).selectOption(font);
        const styles = await arabic.evaluate(el => { const css = getComputedStyle(el); return { family: css.fontFamily, direction: css.direction, spacing: parseFloat(css.letterSpacing) / parseFloat(css.fontSize), lineHeight: parseFloat(css.lineHeight) / parseFloat(css.fontSize) }; });
        expect(styles.family).toContain(family); expect(styles.direction).toBe('rtl');
        expect(styles.spacing).toBeCloseTo(0.05, 3); expect(styles.lineHeight).toBeCloseTo(1.8, 3);
        if (font !== 'arial') { await arabic.scrollIntoViewIfNeeded(); await page.screenshot({ path: output + '/arabic-' + font + '-reading-spacing.png' }); }
      }
      expect(await page.locator('.awp-stage').evaluate(el => getComputedStyle(el).direction)).toBe('rtl');
      expect(await page.locator('.awp-stage .awp-word').getAttribute('dir')).toBe('ltr');
      expect(await page.locator('.awp-stage .awp-definition').getAttribute('dir')).toBe('ltr');
      expect(await arabic.getAttribute('dir')).toBe('rtl');
      expect(await page.locator('.awp-player').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.locator('.awp-stage').focus(); await page.keyboard.press('End');
      await page.screenshot({ path: output + '/multilingual-offline-320-200percent.png' });
    } finally { await page.close(); }
  }, 45_000);

  it('browses activity previews by keyboard and preserves reading position while styling a multilingual card', async () => {
    const page = await open();
    try {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
        AlloModules.WordPractice.open({ title: 'Multilingual preview', words: [
          { id: 'leaf', word: 'Hoja', termLanguage: 'Spanish', definition: 'A plant part.', definitionLanguage: 'English' },
          { id: 'tree', word: '木', termLanguage: 'Japanese', definition: 'تحتاج الأشجار إلى الماء وضوء الشمس لتنمو. '.repeat(25), definitionLanguage: 'Arabic', sentenceActivity: { prompt: '森には大きな____があります。', language: 'Japanese', answer: '木', choices: ['木', '花'] } },
        ], options: { mode: 'vocabulary', shuffle: false } });
      });
      const controls = page.locator('.awp-appearance'), preview = page.locator('.awp-card-preview');
      await controls.getByRole('button', { name: 'Next', exact: true }).focus(); await page.keyboard.press('Enter');
      expect(await controls.locator('.awp-preview-progress').textContent()).toBe('Card 2 of 2');
      expect(await preview.textContent()).toBe('木');
      expect(await controls.getByRole('button', { name: 'Next', exact: true }).isDisabled()).toBe(true);
      expect(await preview.evaluate(node => node === document.activeElement)).toBe(true);
      await controls.getByRole('button', { name: 'Show meaning', exact: true }).focus(); await page.keyboard.press('Enter');
      expect(await preview.evaluate(node => node === document.activeElement)).toBe(true);
      expect(await preview.locator('.awp-preview-definition').getAttribute('dir')).toBe('rtl');
      await preview.focus(); await page.keyboard.press('End');
      await page.waitForFunction(() => { const node = document.querySelector('.awp-card-preview'); return node.scrollTop + node.clientHeight >= node.scrollHeight - 2; });
      const position = await preview.evaluate(node => { node.scrollTop = 180; window.previewPassage = node.querySelector('.awp-preview-definition'); return node.scrollTop; });
      const font = controls.getByLabel('Card font', { exact: true }); await font.focus(); await font.selectOption('georgia');
      await controls.getByLabel('Card style', { exact: true }).selectOption('cream');
      expect(await preview.evaluate(node => node.querySelector('.awp-preview-definition') === window.previewPassage)).toBe(true);
      expect(await preview.evaluate(node => node.scrollTop)).toBe(position);
      expect(await preview.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      expect(await page.locator('.awp-dialog').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await preview.scrollIntoViewIfNeeded(); await page.screenshot({ path: output + '/browsable-arabic-preview-320-200percent.png' });
      await controls.getByRole('button', { name: 'Previous', exact: true }).focus(); await page.keyboard.press('Enter');
      expect(await preview.textContent()).toBe('Hoja'); expect(await preview.evaluate(node => node.scrollTop)).toBe(0);
      expect(await preview.getAttribute('data-awp-card-font')).toBe('georgia');
      await page.getByLabel('Practice activity', { exact: true }).selectOption('sentence');
      expect(await controls.locator('.awp-preview-progress').textContent()).toBe('Card 1 of 1');
      expect(await preview.locator('.awp-preview-prompt').textContent()).toBe('森には大きな____があります。');
      expect(await preview.locator('.awp-preview-feedback').count()).toBe(0);
      expect(await preview.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await controls.getByRole('button', { name: 'Reveal answer', exact: true }).click();
      expect(await preview.locator('.awp-preview-feedback').textContent()).toBe('Answer: 木');
      await preview.focus(); await page.keyboard.press('End');
      await page.screenshot({ path: output + '/sentence-preview-320-200percent.png' });
    } finally { await page.close(); }
  }, 45_000);
});
