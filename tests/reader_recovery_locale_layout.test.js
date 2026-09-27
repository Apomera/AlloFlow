// Scoped recovery layout: production reader markup, disposable Chromium, no app server or network.
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupRecoveryReader, prepareRecoveryCase, cleanupRecoveryCase, recoveryFixtures, openRecoveryFailure, click } from './helpers/reader_recovery_locale_harness.js';
const require = createRequire(import.meta.url), webRequire = createRequire(resolve('desktop/web-app/package.json'));
const report = resolve('reports/reader-recovery-layout'), results = [];
let browser, css;
const enabled = process.env.ALLO_READER_RECOVERY_LAYOUT === '1';
(enabled ? describe : describe.skip)('translated recovery messages in Chromium', () => {
  beforeAll(async () => {
    setupRecoveryReader();
    const config = { ...require(resolve('desktop/web-app/tailwind.config.js')), content: [resolve('view_simplified_source.jsx')] };
    css = (await webRequire('postcss')([webRequire('tailwindcss')(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined })).css;
    browser = await require('@playwright/test').chromium.launch({ headless: true });
    mkdirSync(report, { recursive: true });
  }, 60000);
  beforeEach(prepareRecoveryCase);
  afterEach(cleanupRecoveryCase);
  afterAll(async () => { writeFileSync(resolve(report, 'results.json'), JSON.stringify(results, null, 2) + '\n'); await browser?.close(); }, 60000);
  for (const locale of ['spanish_latin_america', 'arabic', 'chinese_simplified', 'thai']) for (const textScale of [1, 2]) {
    it(locale + ': 320 CSS px, ' + textScale + 'x root text size', async () => {
      const fixture = recoveryFixtures.find(f => f.locale === locale), view = await openRecoveryFailure(fixture, 'conflict');
      await click(view.host.querySelector('[data-reading-conflict-review]'));
      const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
      await page.route('**/*', route => route.abort());
      try {
        await page.setContent('<html lang="' + fixture.tag + '" dir="' + fixture.dir + '"><head><meta charset="utf-8"><style>' + css + '\nhtml{font-size:' + (16 * textScale) + 'px}</style></head><body>' + view.host.innerHTML + '</body></html>');
        await page.locator('[data-reading-persistence] details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
        const panel = page.locator('[data-reading-persistence="failed"]').first();
        expect(await panel.isVisible()).toBe(true);
        expect(await panel.locator('[role="status"]').textContent()).toContain(view.t('simplified.place_save_conflict'));
        await panel.locator('[data-reading-save-retry]').focus();
        expect(await panel.locator('[data-reading-save-retry]').evaluate(node => document.activeElement === node)).toBe(true);
        expect(await panel.locator('[data-reading-work-copy]').inputValue()).toContain(fixture.answer);
        expect(await panel.locator('[data-reading-conflict-local]').inputValue()).toContain(fixture.answer);
        expect(await panel.locator('[data-reading-work-copy]').inputValue()).not.toMatch(/"mainIdea"\s*:/);
        const failures = await page.locator('[data-reading-persistence="failed"]').evaluateAll(panels => panels.flatMap(panel => [panel, ...panel.querySelectorAll('p,button,summary,label,textarea')]).filter(node => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2);
        }).map(node => ({ element: node.tagName, text: node.textContent.slice(0, 100), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })));
        const screenshot = locale + '-' + textScale + 'x-text.png';
        await page.screenshot({ path: resolve(report, screenshot), fullPage: true });
        await panel.screenshot({ path: resolve(report, locale + '-' + textScale + 'x-panel.png') });
        results.push({ fixture: fixture.id, viewportCssPx: 320, rootTextScale: textScale, nativeBrowserZoom: false, screenshot, failures });
        expect(failures).toEqual([]);
      } finally { await page.close(); }
    }, 30000);
  }
});
