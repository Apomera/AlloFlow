import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const source = ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n');
const output = 'tmp/word-practice-reading-theme';
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); });

async function open() {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html lang="en"><head></head><body></body></html>');
  await page.addScriptTag({ content: source });
  await page.evaluate(() => {
    window.readerState = { fontFamily: 'Verdana, sans-serif', baseFontSize: 20, lineHeight: 2, letterSpacing: 0.08, readingTheme: 'dark', bionic: true };
    const listeners = new Set();
    window.__alloReadingSettings = {
      get: () => window.readerState,
      set(patch) { Object.assign(window.readerState, patch); document.documentElement.style.fontSize = window.readerState.baseFontSize + 'px'; listeners.forEach(fn => fn(window.readerState)); },
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    };
    window.readingListenerCount = () => listeners.size;
    window.__alloReadingSettings.set({});
    window.fixture = { title: 'Plant vocabulary', words: [{ word: 'Photosynthesis', definition: 'Plants capture sunlight.', example: 'Green leaves capture light.', translations: { Arabic: 'تلتقط النباتات ضوء الشمس.' } }], options: { mode: 'vocabulary', shuffle: false } };
    window.AlloModules.WordPractice.open(window.fixture);
  });
  return page;
}
const inspect = locator => locator.evaluate(el => {
  const style = getComputedStyle(el);
  return { color: style.color, background: style.backgroundColor, font: style.fontFamily, size: parseFloat(style.fontSize), line: parseFloat(style.lineHeight) / parseFloat(style.fontSize), spacing: parseFloat(style.letterSpacing) / parseFloat(style.fontSize), text: el.textContent, bold: el.querySelectorAll('b[data-awp-bionic]').length };
});

describe('presenter reading preferences', () => {
  it('updates preview and live card typography, palette and reversible bionic formatting without losing text', async () => {
    const page = await open();
    try {
      const preview = page.locator('.awp-card-preview');
      await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
      const first = await inspect(preview.locator('.awp-preview-word'));
      expect(first.font).toContain('Verdana'); expect(first.line).toBeCloseTo(2); expect(first.spacing).toBeCloseTo(0.08); expect(first.bold).toBeGreaterThan(0);
      expect((await inspect(preview)).background).toBe('rgb(26, 26, 46)');
      expect((await inspect(preview.locator('.awp-preview-definition'))).line).toBeCloseTo(first.line);
      const originalText = await preview.textContent();
      await page.evaluate(() => __alloReadingSettings.set({ bionic: false, readingTheme: 'highContrast', baseFontSize: 28, lineHeight: 1.8, letterSpacing: 0.04 }));
      const updated = await inspect(preview.locator('.awp-preview-word'));
      expect(updated.bold).toBe(0); expect(updated.size).toBeGreaterThan(first.size * 1.3); expect(updated.line).toBeCloseTo(1.8); expect(updated.color).toBe('rgb(255, 255, 0)');
      expect(await preview.textContent()).toBe(originalText);
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      await page.getByRole('button', { name: 'Show meaning', exact: true }).click();
      await page.evaluate(() => __alloReadingSettings.set({ bionic: true, readingTheme: 'dark' }));
      const stage = page.locator('.awp-stage');
      expect((await inspect(stage.locator('.awp-word'))).bold).toBeGreaterThan(0);
      expect((await inspect(stage.locator('.awp-definition'))).text).toBe('Plants capture sunlight.');
      expect((await inspect(stage)).background).toBe('rgb(26, 26, 46)');
      await page.locator('.awp-appearance-panel > summary').click();
      const player = page.locator('.awp-player');
      await player.getByLabel('Card font', { exact: true }).selectOption('georgia');
      await player.getByLabel('Card style', { exact: true }).selectOption('cream');
      expect((await inspect(stage.locator('.awp-word'))).font).toContain('Georgia');
      expect((await inspect(stage)).background).toBe('rgb(255, 248, 232)');
      await player.getByLabel('Card font', { exact: true }).selectOption('default');
      await player.getByLabel('Card style', { exact: true }).selectOption('paper');
      await stage.scrollIntoViewIfNeeded(); await page.screenshot({ path: output + '/live-dark-bionic.png' });
      await page.keyboard.press('Escape');
      expect(await page.evaluate(() => readingListenerCount())).toBe(0);
    } finally { await page.close(); }
  }, 45_000);

  it('carries theme and bionic reading into standalone HTML with no host runtime', async () => {
    const live = await open();
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    try {
      const html = await live.evaluate(() => AlloModules.WordPractice.buildHtml(fixture, fixture.options, undefined, undefined, { settings: readerState, css: 'html{font-size:20px}' }));
      const colors = await live.evaluate(() => AlloWordPracticeCore.cardAppearance({ cardTheme: 'paper' }, { readingTheme: 'highContrast', fontFamily: 'Verdana, sans-serif' }));
      expect(colors).toMatchObject({ background: '000000', text: 'FFFF00', fontFace: 'Verdana' });
      await page.setContent(html);
      await page.getByRole('button', { name: 'Show meaning', exact: true }).click();
      const stage = page.locator('.awp-stage'), word = stage.locator('.awp-word');
      expect((await inspect(stage)).background).toBe('rgb(26, 26, 46)');
      expect((await inspect(word)).font).toContain('Verdana'); expect((await inspect(word)).bold).toBeGreaterThan(0);
      expect((await inspect(word)).line).toBeCloseTo(2);
      expect(await stage.locator('.awp-translation[lang=ar]').textContent()).toBe('تلتقط النباتات ضوء الشمس.');
      await page.setViewportSize({ width: 320, height: 900 });
      expect(await stage.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await stage.scrollIntoViewIfNeeded(); await page.screenshot({ path: output + '/offline-320-dark.png' });
      expect(await page.evaluate(() => typeof window.__alloReadingSettings)).toBe('undefined');
    } finally { await page.close(); await live.close(); }
  }, 45_000);
});
