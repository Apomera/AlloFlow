import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const moduleSource = readFileSync('word_practice_module.js', 'utf8');
const output = 'tmp/word-practice-multilingual-controls';
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); });

describe.each(['presenter', 'offline'])('multilingual sounds and keyboard focus (%s)', surface => {
  it.each(['English', 'Arabic'])('reads sounds in term order with %s interface direction', async uiLanguage => {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
    try {
      await page.setContent('<!doctype html><html><body></body></html>'); await page.addScriptTag({ content: moduleSource });
      const html = await page.evaluate(({ surface, uiLanguage }) => {
        const pack = { words: [
          { word: 'cat', termLanguage: 'English', phonemes: [{ label: 'c' }, { label: 'a' }, { label: 't' }] },
          { word: 'كتب', termLanguage: 'Arabic', phonemes: [{ label: 'ك' }, { label: 'ت' }, { label: 'ب' }] },
        ], options: { mode: 'blend', shuffle: false, repetitions: 1 } };
        if (surface === 'offline') return AlloModules.WordPractice.buildHtml(pack, undefined, undefined, undefined, null, uiLanguage);
        AlloModules.WordPractice.open({ ...pack, currentUiLanguage: uiLanguage });
      }, { surface, uiLanguage });
      const ordered = async (locator, direction) => {
        const result = await locator.evaluate(node => ({ direction: getComputedStyle(node).direction, x: [...node.children].map(child => child.getBoundingClientRect().x) }));
        expect(result.direction).toBe(direction);
        expect(result.x[0] < result.x[1]).toBe(direction === 'ltr'); expect(result.x[1] < result.x[2]).toBe(direction === 'ltr');
      };
      if (surface === 'offline') await page.setContent(html);
      else {
        await ordered(page.locator('.awp-preview-sounds'), 'ltr');
        await page.locator('.awp-appearance').getByRole('button', { name: 'Next', exact: true }).click();
        await ordered(page.locator('.awp-preview-sounds'), 'rtl');
        await page.getByRole('button', { name: 'Present', exact: true }).click();
      }
      await ordered(page.locator('.awp-phonemes'), 'ltr');
      const player = page.locator('.awp-player'), stage = page.locator('.awp-stage');
      await player.getByRole('button', { name: 'Show word', exact: true }).focus(); await page.keyboard.press('Enter');
      expect(await stage.evaluate(node => node === document.activeElement)).toBe(true);
      await player.getByRole('button', { name: 'Next', exact: true }).focus(); await page.keyboard.press('Enter');
      expect(await stage.evaluate(node => node === document.activeElement)).toBe(true);
      await ordered(page.locator('.awp-phonemes'), 'rtl');
      await page.setViewportSize({ width: 320, height: 900 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await stage.focus(); await stage.scrollIntoViewIfNeeded();
      expect(await stage.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: output + '/' + surface + '-' + uiLanguage.toLowerCase() + '-320-200percent.png' });
      await player.getByRole('button', { name: 'Previous', exact: true }).focus(); await page.keyboard.press('Enter');
      expect(await stage.evaluate(node => node === document.activeElement)).toBe(true);
      await page.keyboard.press('r'); expect(await stage.locator('.awp-word').textContent()).toBe('cat');
      expect(await stage.evaluate(node => node === document.activeElement)).toBe(true);
    } finally { await page.close(); }
  }, 45_000);
});
