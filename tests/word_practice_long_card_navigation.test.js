import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

let browser;
const source = ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n');
const output = 'tmp/word-practice-long-cards';
const prose = 'Start of the passage. ' + 'Plants use sunlight to grow and make food. '.repeat(110) + ' End of the passage.';
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);
async function open(surface, mode) {
  const page = await browser.newPage({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html lang="en"><body></body></html>');
  await page.addScriptTag({ content: source });
  const html = await page.evaluate(({ surface, mode, prose }) => {
    const input = { title: 'Plant words', words: [
      { word: 'Leaf', definition: prose, sentenceActivity: { prompt: prose + ' The plant has a ____.', choices: ['Leaf', 'Stem'], answer: 'Leaf' } },
      { word: 'Root', definition: 'Absorbs water.', sentenceActivity: { prompt: 'The ____ absorbs water.', choices: ['Root', 'Leaf'], answer: 'Root' } }
    ], options: { mode, repetitions: 1, shuffle: false, includeAudio: false } };
    if (surface === 'offline') return AlloModules.WordPractice.buildHtml(input);
    AlloModules.WordPractice.open(input);
  }, { surface, mode, prose });
  if (surface === 'offline') await page.setContent(html);
  else await page.getByRole('button', { name: 'Present', exact: true }).click();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  if (mode === 'vocabulary') await page.getByRole('button', { name: 'Show meaning', exact: true }).click();
  return page;
}
async function scrollToEnd(page) {
  await page.getByRole('region', { name: 'Practice card', exact: true }).focus();
  await page.keyboard.press('End');
  await page.waitForFunction(() => { const el = document.querySelector('.awp-stage'); return el.scrollTop + el.clientHeight >= el.scrollHeight - 2; });
}

describe.each(['presenter', 'offline'])('long Word Sounds cards (%s)', surface => {
  it('keeps a long meaning fully readable while navigation stays beside the card', async () => {
    const page = await open(surface, 'vocabulary');
    try {
      const stage = page.getByRole('region', { name: 'Practice card', exact: true });
      expect(await page.locator('.awp-card .awp-definition').textContent()).toBe(prose);
      for (const position of ['top-left', 'center', 'bottom-right']) {
        await stage.evaluate((el, position) => { el.dataset.position = position; el.scrollTop = 0; }, position);
        const bounds = await stage.evaluate(el => ({ height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top, first: el.firstElementChild.getBoundingClientRect().top, fits: el.scrollWidth <= el.clientWidth + 1 }));
        expect(bounds.height).toBeLessThanOrEqual(542);
        expect(bounds.first).toBeGreaterThanOrEqual(bounds.top);
        expect(bounds.fits).toBe(true);
      }
      await scrollToEnd(page);
      const last = await page.locator('.awp-card .awp-definition').evaluate(el => ({ bottom: el.getBoundingClientRect().bottom, stageBottom: el.closest('.awp-stage').getBoundingClientRect().bottom }));
      expect(last.bottom).toBeLessThan(last.stageBottom);
      await page.screenshot({ path: output + '/' + surface + '-meaning-end-320-200percent.png' });
      await page.keyboard.press('ArrowRight');
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 2 of 2');
      expect(await stage.evaluate(el => el.scrollTop)).toBe(0);
      expect(await stage.evaluate(el => el === document.activeElement)).toBe(true);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.keyboard.press('ArrowLeft'); await page.keyboard.press('r');
      expect(await stage.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.clientHeight <= innerHeight * .6)).toBe(true);
    } finally { await page.close(); }
  }, 45_000);

  it('scrolls a long sentence to its choices and keeps the focused choice visible after reveal and navigation', async () => {
    const page = await open(surface, 'sentence');
    try {
      await scrollToEnd(page);
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement.textContent)).toBe('Leaf');
      await page.keyboard.press('r');
      expect(await page.evaluate(() => document.activeElement.textContent)).toBe('Leaf');
      expect(await page.locator('.awp-feedback').textContent()).toBe('Answer: Leaf');
      const visible = await page.evaluate(() => { const el = document.activeElement.getBoundingClientRect(), stage = document.querySelector('.awp-stage').getBoundingClientRect(); return el.top >= stage.top && el.bottom <= stage.bottom; });
      expect(visible).toBe(true);
      await page.screenshot({ path: output + '/' + surface + '-sentence-choices-320-200percent.png' });
      await page.keyboard.press('ArrowRight');
      expect(await page.locator('.awp-progress').textContent()).toBe('Card 2 of 2');
      expect(await page.evaluate(() => document.activeElement.textContent)).toBe('Root');
      expect(await page.evaluate(() => { const el = document.activeElement.getBoundingClientRect(), stage = document.querySelector('.awp-stage').getBoundingClientRect(); return el.top >= stage.top && el.bottom <= stage.bottom; })).toBe(true);
    } finally { await page.close(); }
  }, 45_000);
});
