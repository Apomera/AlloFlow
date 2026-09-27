// Disposable browser layout checks; no app server, network, AI calls or saved app state.
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupReader, mountReader, disposeReader, click, fixtures, translator } from './helpers/reader_locale_harness.js';
const require = createRequire(import.meta.url);
const webRequire = createRequire(resolve('desktop/web-app/package.json'));
let browser, css;
const results = [], report = resolve('reports/reader-localization-layout');
beforeAll(async () => {
  setupReader();
  const postcss = webRequire('postcss'), tailwind = webRequire('tailwindcss');
  const config = { ...require(resolve('desktop/web-app/tailwind.config.js')), content: [resolve('view_simplified_source.jsx')] };
  css = (await postcss([tailwind(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined })).css;
  browser = await require('@playwright/test').chromium.launch({ headless: true });
  mkdirSync(report, { recursive: true });
}, 60000);
afterAll(async () => { writeFileSync(resolve(report, 'results.json'), JSON.stringify(results, null, 2)); await browser?.close(); }, 60000);
afterEach(disposeReader);
(process.env.ALLO_READER_LOCALE_LAYOUT === '1' ? describe : describe.skip)('long translated reader labels in Chromium', () => {
  for (const locale of ['spanish_latin_america','arabic','chinese_simplified','thai']) for (const zoom of [1, 2]) {
    it(locale + ' at ' + (zoom === 1 ? '320px' : '320 CSS px / 640 device px (2x scale)'), async () => {
      const fixture = fixtures.find(f => f.locale === locale), base = translator(locale);
      const t = (key, params) => {
        const text = base(key, params);
        return ['simplified.review_preview', 'simplified.adapt_keep_terms'].includes(key) ? text + ' — ' + text : text;
      };
      const { host } = mountReader(fixture, { t });
      await click(host.querySelector('[data-reading-outline-toggle]'));
      await click(host.querySelector('[data-section-prompts-toggle]'));
      const page = await browser.newPage({ viewport: { width: 320, height: 900 }, deviceScaleFactor: zoom });
      await page.route('**/*', route => route.abort());
      try {
        await page.setContent('<html lang="' + fixture.tag + '" dir="' + fixture.dir + '"><head><meta charset="utf-8"><style>' + css + '</style></head><body>' + host.innerHTML + '</body></html>');
        await page.locator('details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
        expect(await page.locator('[data-adaptation-controls]').isVisible()).toBe(true);
        const failures = await page.locator('[data-teacher-review-summary], [data-adaptation-controls], [data-reading-outline], [data-section-prompts]').evaluateAll(elements => {
          const scale = Number(document.body.style.zoom) || 1, limit = innerWidth / scale;
          return elements.flatMap(panel => [panel, ...panel.querySelectorAll('button,input,textarea,select,p')]).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && (rect.left / scale < -1 || rect.right / scale > limit + 1 || el.scrollWidth > el.clientWidth + 2);
          }).map(el => ({ element: el.tagName, text: el.textContent.slice(0,80), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
        });
        await page.screenshot({ path: resolve(report, locale + '-' + zoom + 'x.png'), fullPage: true });
        results.push({ fixture: fixture.id, viewportCssPx: 320, deviceScaleFactor: zoom, failures });
        expect(failures).toEqual([]);
        await click(host.querySelector('[data-student-preview-open]'));
        await page.locator('body').evaluate((body, html) => { body.innerHTML = html; }, host.innerHTML);
        const preview = page.locator('[data-student-preview]');
        expect(await preview.isVisible()).toBe(true);
        const previewOverflow = await preview.evaluate(panel => panel.scrollWidth > panel.clientWidth + 2);
        expect(previewOverflow).toBe(false);
        const closeBounds = await page.locator('[data-student-preview-close]').boundingBox();
        expect(closeBounds.x).toBeGreaterThanOrEqual(0);
        expect(closeBounds.x + closeBounds.width).toBeLessThanOrEqual(321);
        await page.screenshot({ path: resolve(report, locale + '-' + zoom + 'x-preview.png'), fullPage: true });
      } finally { await page.close(); }
    }, 30000);
  }
});
