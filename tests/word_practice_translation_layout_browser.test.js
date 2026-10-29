import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const source = readFileSync('word_practice_module.js', 'utf8');
const output = 'tmp/word-practice-translation-layout';
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); });
const arabic = 'تحتاج الأشجار إلى الماء وضوء الشمس لتنمو.\nنحافظ على الأشجار.';
const japanese = '木は成長するために水と日光を必要とします。\n木を大切にします。';

describe.each(['presenter', 'offline'])('readable multilingual translation layout (%s)', surface => {
  it('separates language captions and aligns passages naturally at desktop and320px/200% text', async () => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
    try {
      await page.setContent('<!doctype html><html><body></body></html>'); await page.addScriptTag({ content: source });
      const html = await page.evaluate(({ surface, arabic, japanese }) => {
        const pack = { words: [{ word: 'Tree', translations: { Arabic: arabic, Japanese: japanese } }], options: { mode: 'vocabulary', repetitions: 1, shuffle: false, cardFont: 'georgia', cardTheme: 'cream', cardTextScale: 1.4 } };
        if (surface === 'offline') return AlloModules.WordPractice.buildHtml(pack);
        AlloModules.WordPractice.open(pack);
      }, { surface, arabic, japanese });
      const check = async (scope, captionSelector, passageSelector) => {
        const layout = await scope.evaluate((parent, { captionSelector, passageSelector }) => [...parent.querySelectorAll(passageSelector)].map(passage => {
          const caption = passage.previousElementSibling, value = getComputedStyle(passage), label = getComputedStyle(caption);
          return { text: passage.textContent, direction: value.direction, align: value.textAlign, family: value.fontFamily, labelSize: parseFloat(label.fontSize), size: parseFloat(value.fontSize), separated: caption.getBoundingClientRect().bottom <= passage.getBoundingClientRect().top + 1, labelColor: label.color, captionClass: caption.matches(captionSelector) };
        }), { captionSelector, passageSelector });
        expect(layout.map(row => row.text)).toEqual([arabic, japanese]); expect(layout.map(row => row.direction)).toEqual(['rtl', 'ltr']);
        for (const row of layout) { expect(row.align).toBe('start'); expect(row.family).toContain('Georgia'); expect(row.labelSize).toBeLessThan(row.size); expect(row.separated).toBe(true); expect(row.captionClass).toBe(true); expect(row.labelColor).toBe('rgb(107, 89, 68)'); }
        expect(await scope.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      };
      if (surface === 'offline') await page.setContent(html);
      else {
        await page.locator('.awp-appearance').getByRole('button', { name: 'Show meaning', exact: true }).click();
        await check(page.locator('.awp-card-preview'), '.awp-preview-language-name', '.awp-preview-translation');
        await page.getByRole('button', { name: 'Present', exact: true }).click();
      }
      await page.locator('.awp-player').getByRole('button', { name: 'Show meaning', exact: true }).click();
      const stage = page.locator('.awp-stage'); await check(stage, '.awp-language-name', '.awp-translation');
      await stage.scrollIntoViewIfNeeded(); await page.screenshot({ path: output + '/' + surface + '-desktop.png' });
      await page.setViewportSize({ width: 320, height: 900 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await check(stage, '.awp-language-name', '.awp-translation');
      await stage.focus(); await page.keyboard.press('End'); await stage.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => { const node = document.querySelector('.awp-stage'); return node.scrollTop + node.clientHeight >= node.scrollHeight - 2; });
      await page.screenshot({ path: output + '/' + surface + '-320-200percent.png' });
    } finally { await page.close(); }
  }, 45_000);
});
