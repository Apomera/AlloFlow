import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const source = ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n');
const output = 'tmp/word-practice-preview-picker';
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); });

describe('direct preview selection in the browser', () => {
  it('selects distant multilingual entries with native keys and keeps focus and styling at320px/200% text', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
    try {
      await page.setContent('<!doctype html><html><body></body></html>'); await page.addScriptTag({ content: source });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
        AlloModules.WordPractice.open({ words: [
          ...Array.from({ length: 197 }, (_, index) => ({ id: 'entry-' + index, word: 'Word ' + index, definition: 'Definition ' + index })),
          { id: 'gift-en', word: 'gift', termLanguage: 'English', definition: 'A present.' },
          { id: 'gift-de', word: 'Gift', termLanguage: 'German', definition: 'A poison.' },
          { id: 'leaf-ar', word: 'ورقة', termLanguage: 'Arabic', definition: 'جزء من النبات.', definitionLanguage: 'Arabic' },
        ], options: { mode: 'vocabulary', shuffle: false } });
      });
      const picker = page.getByRole('combobox', { name: 'Card preview', exact: true }), preview = page.getByRole('region', { name: 'Card preview', exact: true });
      await picker.focus(); await page.keyboard.press('End');
      expect(await picker.inputValue()).toBe('leaf-ar'); expect(await picker.evaluate(node => node === document.activeElement)).toBe(true);
      expect(await preview.locator('.awp-preview-word').getAttribute('dir')).toBe('rtl');
      expect(await page.locator('.awp-preview-progress').textContent()).toBe('Card 200 of 200');
      await page.keyboard.press('ArrowUp'); expect(await picker.inputValue()).toBe('gift-de');
      expect(await picker.locator('option:checked').textContent()).toContain('German');
      await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
      await page.locator('.awp-appearance').getByLabel('Card font', { exact: true }).selectOption('georgia');
      expect(await preview.locator('.awp-preview-definition').textContent()).toBe('A poison.'); expect(await picker.inputValue()).toBe('gift-de');
      await picker.focus(); await page.keyboard.press('ArrowDown'); expect(await preview.locator('.awp-preview-definition').count()).toBe(0);
      expect(await preview.locator('.awp-preview-word').evaluate(node => getComputedStyle(node).fontFamily)).toContain('Georgia');
      expect(await page.locator('.awp-dialog').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await picker.scrollIntoViewIfNeeded(); await page.screenshot({ path: output + '/multilingual-picker-320-200percent.png' });
    } finally { await page.close(); }
  }, 45_000);

  it.each(['presenter', 'offline'])('start-aligns long Arabic and CJK prompts while keeping short %s prompts centered', async surface => {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
    try {
      await page.setContent('<!doctype html><html><body></body></html>'); await page.addScriptTag({ content: source });
      const html = await page.evaluate(surface => {
        const prompts = [['Find the ____.', 'English'], ['اقرأ الجملة ثم أكمل الفراغ. '.repeat(8) + '____', 'Arabic'], ['木は水と日光を必要とします。'.repeat(5) + '____', 'Japanese']];
        const pack = { words: prompts.map(([prompt, language], index) => ({ word: 'answer' + index, sentenceActivity: { prompt, language, answer: 'answer' + index, choices: ['answer' + index, 'other'] } })), options: { mode: 'sentence', shuffle: false, repetitions: 1, cardFont: 'georgia', cardTextScale: 1.4 } };
        if (surface === 'offline') return AlloModules.WordPractice.buildHtml(pack);
        AlloModules.WordPractice.open(pack);
      }, surface);
      if (surface === 'offline') await page.setContent(html);
      else await page.getByRole('button', { name: 'Present', exact: true }).click();
      const player = page.locator('.awp-player'), prompt = player.locator('.awp-sentence-prompt'), stage = player.locator('.awp-stage');
      expect(await prompt.evaluate(node => getComputedStyle(node).textAlign)).toBe('center');
      await player.getByRole('button', { name: 'Next', exact: true }).click();
      expect(await prompt.evaluate(node => [getComputedStyle(node).textAlign, getComputedStyle(node).direction])).toEqual(['start', 'rtl']);
      await page.setViewportSize({ width: 320, height: 900 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      expect(await stage.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true); await stage.scrollIntoViewIfNeeded();
      await page.screenshot({ path: output + '/' + surface + '-arabic-prose-320-200percent.png' });
      await player.getByRole('button', { name: 'Next', exact: true }).click();
      expect(await prompt.evaluate(node => [getComputedStyle(node).textAlign, getComputedStyle(node).direction])).toEqual(['start', 'ltr']);
      expect(await stage.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    } finally { await page.close(); }
  }, 45_000);
});
