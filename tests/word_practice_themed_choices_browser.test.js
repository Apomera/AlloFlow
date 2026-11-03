import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const read = file => readFileSync(file, 'utf8');
// This pure builder returns the app's complete bundle without writing a mirror.
const { buildWordPracticeModule } = createRequire(import.meta.url)('../_build_word_practice_module.js');
const lanes = [
  ['source', read('word_practice_core.js') + '\n' + read('word_practice_ui.js')],
  ['bundle', buildWordPracticeModule()],
];
const output = 'tmp/card-polish-next-20261101';
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);

const sentence = { title: 'Garden sentences', words: [{ word: 'Leaf', sentenceActivity: {
  prompt: 'The ____ catches sunlight.', choices: ['Leaf', 'Root'], answer: 'Leaf',
} }], options: { mode: 'sentence', repetitions: 1, includeAudio: false, shuffle: false } };
async function open(page, code, input, settings = {}, labels = {}) {
  await page.setContent('<!doctype html><html lang="en" style="font-size:32px"><body></body></html>');
  await page.addScriptTag({ content: code });
  await page.evaluate(({ input, settings, labels }) => {
    window.__alloReadingSettings = { get: () => settings };
    input.t = key => labels[key] || key;
    AlloModules.WordPractice.open(input);
  }, { input, settings, labels });
}
async function colors(node) {
  return node.evaluate(el => { const css = getComputedStyle(el); return { text: css.color, background: css.backgroundColor, border: css.borderColor, shadow: css.boxShadow }; });
}
function contrast(a, b) {
  const luminance = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => {
    const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
async function readableChoice(choice, stage) {
  const current = await colors(choice);
  expect(current.background).toBe((await colors(stage)).background);
  expect(contrast(current.text, current.background)).toBeGreaterThanOrEqual(4.5);
  return current;
}

describe.each(lanes)('themed choices and multilingual origin preview (%s)', (lane, code) => {
  it.each(['dark', 'highContrast'])('keeps %s choices readable when hovered and answered in live and offline cards', async theme => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const offline = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const settings = { readingTheme: theme, baseFontSize: 32, fontFamily: 'Georgia, serif' };
    try {
      await open(page, code, sentence, settings);
      const html = await page.evaluate(({ input, settings }) => AlloModules.WordPractice.buildHtml(input, input.options, undefined, undefined, { settings, css: 'html{font-size:32px}' }), { input: sentence, settings });
      await offline.setContent(html);
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      for (const surface of [page, offline]) {
        const stage = surface.locator('.awp-stage'), answer = stage.getByRole('button', { name: 'Leaf', exact: true });
        await readableChoice(answer, stage);
        await answer.hover(); const hovered = await readableChoice(answer, stage);
        expect(hovered.shadow).not.toBe('none');
        await answer.click();
        expect(await stage.locator('.awp-feedback').textContent()).toBe('Yes. Leaf completes the sentence.');
        expect(await answer.getAttribute('aria-disabled')).toBe('true');
        for (const choice of await stage.locator('.awp-choices button').all()) {
          await choice.hover(); await readableChoice(choice, stage);
          expect((await colors(choice)).shadow).toBe('none');
        }
        await stage.getByRole('button', { name: 'Root', exact: true }).focus(); await surface.keyboard.press('Enter');
        expect(await stage.locator('.awp-feedback').textContent()).toBe('Yes. Leaf completes the sentence.');
        await surface.setViewportSize({ width: 320, height: 900 });
        expect(await stage.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await stage.getByRole('button', { name: 'Root', exact: true }).scrollIntoViewIfNeeded();
        if (lane === 'bundle' && surface === offline) await stage.screenshot({ path: output + '/ui-sentence-' + theme + '-320.png' });
      }
    } finally { await offline.close(); await page.close(); }
  }, 60_000);

  it.each([
    ['English', 'Arabic', 'Word origin: {origin}', 'من كلمة قديمة تعني ورقة النبات.', 'en', 'ltr', 'ar', 'rtl'],
    ['Arabic', 'English', 'أصل الكلمة: {origin}', 'From an old word for a plant leaf.', 'ar', 'rtl', 'en', 'ltr'],
  ])('separates %s labels from %s origins and matches the live reading edge', async (ui, content, template, origin, uiTag, uiDir, contentTag, contentDir) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    try {
      const input = { title: 'Garden words', language: 'English', currentUiLanguage: ui, words: [{
        word: 'Leaf', definitionLanguage: content, origin,
      }], options: { mode: 'vocabulary', repetitions: 1, includeAudio: false, cardTextStyle: 'italic' } };
      await open(page, code, input, { baseFontSize: 32, readingTheme: 'dark' }, { 'word_practice.word_origin': template });
      await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
      const preview = page.locator('.awp-preview-origin');
      const inspect = node => node.evaluate(el => ({ text: el.textContent, lang: el.lang, dir: el.dir,
        align: getComputedStyle(el).textAlign, style: getComputedStyle(el).fontStyle,
        body: [...el.children].map(child => ({ text: child.textContent, lang: child.lang, dir: child.dir,
          direction: getComputedStyle(child).direction, align: getComputedStyle(child).textAlign, display: getComputedStyle(child).display,
          fillsLine: Math.abs(child.getBoundingClientRect().width - el.getBoundingClientRect().width) <= 1,
        })),
      }));
      const expected = { text: template.replace('{origin}', origin), lang: uiTag, dir: uiDir, align: 'start', style: 'italic', body: [{ text: origin, lang: contentTag, dir: contentDir, direction: contentDir, align: 'start', display: 'block', fillsLine: true }] };
      expect(await inspect(preview)).toEqual(expected);
      expect(await page.locator('.awp-card-preview').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await preview.scrollIntoViewIfNeeded();
      if (lane === 'bundle' && ui === 'Arabic') await page.screenshot({ path: output + '/ui-origin-preview-rtl-320.png' });
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      await page.getByRole('button', { name: 'Show meaning', exact: true }).click();
      expect(await inspect(page.locator('.awp-origin'))).toEqual(expected);
    } finally { await page.close(); }
  }, 60_000);
});
