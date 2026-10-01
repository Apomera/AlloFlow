// Real reader markup and production utility CSS in disposable Chromium; no app server or network.
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupPreviewLocales, preparePreviewLocale, cleanupPreviewLocale, previewFixtures, mountReader, click, act } from './helpers/reader_preview_locale_harness.js';
const require = createRequire(import.meta.url), webRequire = createRequire(resolve('desktop/web-app/package.json'));
const report = resolve('reports/reader-preview-locale-layout'), results = [];
let browser, css;
const enabled = process.env.ALLO_READER_PREVIEW_LOCALE_LAYOUT === '1';
(enabled ? describe : describe.skip)('audio, preview and term labels in narrow Chromium layouts', () => {
  beforeAll(async () => {
    setupPreviewLocales();
    const config = { ...require(resolve('desktop/web-app/tailwind.config.js')), content: [resolve('view_simplified_source.jsx')] };
    css = (await webRequire('postcss')([webRequire('tailwindcss')(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined })).css;
    browser = await require('@playwright/test').chromium.launch({ headless: true });
    mkdirSync(report, { recursive: true });
  }, 60000);
  beforeEach(preparePreviewLocale);
  afterEach(cleanupPreviewLocale);
  afterAll(async () => { writeFileSync(resolve(report, 'results.json'), JSON.stringify(results, null, 2) + '\n'); await browser?.close(); }, 60000);
  for (const locale of ['spanish_latin_america', 'arabic', 'chinese_simplified', 'thai']) for (const textScale of [1, 2]) {
    it(locale + ': 320 CSS px with ' + textScale + 'x root text size', async () => {
      const fixture = previewFixtures.find(f => f.locale === locale);
      window.__alloGetReadAloudAudioSummary = texts => ({ ready: 1, total: texts.length, stale: texts.length - 1 });
      const view = mountReader(fixture), input = view.host.querySelector('[data-adapt-keep-terms]');
      await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '"unclosed'); input.dispatchEvent(new Event('input', { bubbles: true })); });
      const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
      await page.route('**/*', route => route.abort());
      const html = () => '<html lang="' + fixture.tag + '" dir="' + fixture.dir + '"><head><meta charset="utf-8"><style>' + css + '\nhtml{font-size:' + (16 * textScale) + 'px}</style></head><body>' + view.host.innerHTML + '</body></html>';
      const overflow = async selector => page.locator(selector).evaluateAll(nodes => nodes.filter(node => {
        const rect = node.getBoundingClientRect();
        // An unfocused sr-only skip link is intentionally clipped; focused links remain in scope.
        if (node.classList.contains('sr-only') && rect.width <= 1 && rect.height <= 1) return false;
        return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
      }).map(node => ({ element: node.tagName, text: node.textContent.slice(0, 100), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })));
      try {
        await page.setContent(html());
        await page.locator('details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
        expect(await page.locator('[data-adaptation-controls] [role="alert"]').textContent()).toBe(view.t('simplified.adapt_terms_quote'));
        await page.locator('[data-adapt-keep-terms]').focus();
        expect(await page.locator('[data-adapt-keep-terms]').evaluate(node => document.activeElement === node)).toBe(true);
        const termFailures = await overflow('[data-review-state="audio"], [data-adaptation-controls], [data-adaptation-controls] label, [data-adaptation-controls] label span, [data-adaptation-controls] [role="alert"]');
        await page.locator('[data-adaptation-controls]').screenshot({ path: resolve(report, locale + '-' + textScale + 'x-terms.png') });
        await click(view.host.querySelector('[data-student-preview-open]'));
        await click(view.host.querySelector('[data-student-preview] [data-reading-mode="define"]'));
        await page.setContent(html());
        const preview = page.locator('[data-student-preview]');
        expect(await preview.isVisible()).toBe(true);
        expect(await preview.locator('h2[id^="simplified-student-preview-title-"]').textContent()).toBe(view.t('simplified.layout_preview_title'));
        expect(await preview.locator('[data-reading-mode-status="define"]').textContent()).toContain(view.t('simplified.layout_preview_word_help'));
        expect(await preview.locator('[data-reading-paragraph="1"]').getAttribute('dir')).toBe(fixture.dir);
        expect(await preview.locator('[data-reading-paragraph="1"]').getAttribute('lang')).toBe(fixture.tag);
        await preview.locator('[data-student-preview-close]').focus();
        expect(await preview.locator('[data-student-preview-close]').evaluate(node => document.activeElement === node)).toBe(true);
        const previewFailures = await overflow('[data-student-preview], [data-student-preview] h2, [data-student-preview] p, [data-student-preview] button, [data-student-preview] [data-reading-mode-status]');
        await page.screenshot({ path: resolve(report, locale + '-' + textScale + 'x-preview.png') });
        results.push({ fixture: fixture.id, viewportCssPx: 320, rootTextScale: textScale, nativeBrowserZoom: false, termFailures, previewFailures });
        expect(previewFailures).toEqual([]); expect(termFailures).toEqual([]);
      } finally { await page.close(); }
    }, 30000);
  }
});
