import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

let browser;
const moduleSource = readFileSync('word_practice_module.js', 'utf8');
const output = 'tmp/word-practice-setup-navigation';
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);
async function open(words = 60) {
  const page = await browser.newPage({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html lang="en"><body><button id="launcher">Launch</button></body></html>');
  await page.addScriptTag({ content: moduleSource });
  await page.locator('#launcher').focus();
  await page.evaluate(count => { AlloModules.WordPractice.open({ title: 'Plant words', words: Array.from({ length: count }, (_, n) => 'Word ' + (n + 1)), options: { mode: 'vocabulary' } }); }, words);
  return page;
}
const focused = page => page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent, group: document.activeElement.dataset.reviewGroup || '' }));

describe('Word Sounds setup keyboard navigation', () => {
  it('tabs through the disclosure and scrollable warning lists in reading order', async () => {
    const page = await open();
    try {
      const summary = page.locator('.awp-review-details summary');
      await summary.focus(); await page.keyboard.press('Tab');
      expect((await focused(page)).text).toBe('Present');
      await page.keyboard.press('Shift+Tab'); expect((await focused(page)).tag).toBe('SUMMARY');
      await page.keyboard.press('Space'); await page.keyboard.press('Tab');
      expect((await focused(page)).group).toBe('word_practice.review_missing_meanings');
      const meanings = page.getByRole('list', { name: 'No meaning, example or translation', exact: true });
      expect(await meanings.count()).toBe(1);
      await page.keyboard.press('End');
      await page.waitForFunction(() => { const el = document.activeElement; return el.scrollTop + el.clientHeight >= el.scrollHeight - 2; });
      expect(await meanings.evaluate(el => el.scrollTop + el.clientHeight >= el.scrollHeight - 2)).toBe(true);
      await page.keyboard.press('Tab'); expect((await focused(page)).group).toBe('word_practice.review_missing_audio');
      await page.keyboard.press('Tab'); expect((await focused(page)).text).toBe('Review word list');
      await page.keyboard.press('Escape');
      expect(await page.locator('.awp-dialog').count()).toBe(0);
      expect(await page.evaluate(() => document.activeElement.id)).toBe('launcher');
    } finally { await page.close(); }
  }, 45_000);

  it('keeps the focused warning and its scroll position when the plan refreshes', async () => {
    const page = await open();
    try {
      await page.locator('.awp-review-details summary').click();
      await page.getByRole('list', { name: 'No meaning, example or translation', exact: true }).focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => { const el = document.activeElement; return el.scrollTop + el.clientHeight >= el.scrollHeight - 2; });
      const oldScroll = await page.evaluate(() => document.activeElement.scrollTop);
      await page.getByLabel('Repetitions per word', { exact: true }).evaluate(input => { input.value = '4'; input.dispatchEvent(new Event('change', { bubbles: true })); });
      expect((await focused(page)).group).toBe('word_practice.review_missing_meanings');
      expect(await page.evaluate(() => document.activeElement.scrollTop)).toBe(oldScroll);
      await page.getByLabel('Practice activity', { exact: true }).evaluate(input => { input.value = 'popup'; input.dispatchEvent(new Event('change', { bubbles: true })); });
      expect((await focused(page)).tag).toBe('SUMMARY');
      await page.keyboard.press('Tab'); expect((await focused(page)).group).toBe('word_practice.review_missing_audio');
    } finally { await page.close(); }
  }, 45_000);

  it('pins active preparation but lets finished feedback scroll away at 200% text', async () => {
    const page = await open(2);
    try {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
        AlloWordPracticeMedia.prepareAudio = (pack, context, progress) => {
          progress({ completed: 1, total: 2, word: 'Word 1' });
          return new Promise((resolve, reject) => context.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true }));
        };
      });
      await page.getByRole('button', { name: 'Prepare audio', exact: true }).click();
      const panel = page.locator('.awp-operation');
      expect(await panel.evaluate(el => getComputedStyle(el).position)).toBe('sticky');
      const cancel = page.getByRole('button', { name: 'Cancel preparation', exact: true });
      await cancel.scrollIntoViewIfNeeded();
      expect(await cancel.isVisible()).toBe(true);
      await page.screenshot({ path: output + '/active-320-200percent.png' });
      await cancel.click();
      expect(await panel.evaluate(el => getComputedStyle(el).position)).toBe('static');
      expect(await panel.textContent()).toContain('Preparation cancelled');
      const title = page.getByLabel('Practice title', { exact: true });
      await title.focus(); await title.scrollIntoViewIfNeeded();
      expect(await title.inputValue()).toBe('Plant words');
      expect(await panel.evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.awp-dialog').getBoundingClientRect().bottom)).toBe(true);
      expect(await page.locator('.awp-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: output + '/cancelled-320-200percent.png' });
    } finally { await page.close(); }
  }, 45_000);
});
