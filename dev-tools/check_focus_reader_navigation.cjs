#!/usr/bin/env node
'use strict';
// Isolated real-React/browser check of FocusReaderOverlay, with the app's Tailwind
// configuration. No server, microphone, external assets or AI service is used.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const DEPS = path.join(ROOT, 'desktop/web-app/node_modules');
const postcss = require(path.join(DEPS, 'postcss'));
const tailwindcss = require(path.join(DEPS, 'tailwindcss'));
const config = require(path.join(ROOT, 'desktop/web-app/tailwind.config.js'));
const OUT = path.join(ROOT, 'reports/reading-tools-review-2026-09-07');
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const source = fs.readFileSync(path.join(ROOT, 'immersive_reader_source.jsx'), 'utf8');
  const css = (await postcss([tailwindcss({ ...config, content: [{ raw: source, extension: 'jsx' }] })])
    .process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 850 }]]) {
      const context = await browser.newContext({ viewport, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ path: path.join(DEPS, 'react/umd/react.development.js') });
      await page.addScriptTag({ path: path.join(DEPS, 'react-dom/umd/react-dom.development.js') });
      await page.evaluate(() => { window.AlloLanguageContext = React.createContext({ t: key => key }); });
      await page.addScriptTag({ path: path.join(ROOT, 'immersive_reader_module.js') });
      await page.evaluate(() => {
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null,
          React.createElement(window.AlloModules.FocusReaderOverlay, { isOpen: true, text: 'One two three four five six', onClose: () => {} })));
      });
      const previous = page.getByRole('button', { name: 'Previous', exact: true });
      const next = page.getByRole('button', { name: 'Next', exact: true });
      const surface = page.getByRole('button', { name: 'Play or pause reading', exact: true });
      const progress = () => page.getByRole('progressbar').getAttribute('aria-valuenow').then(Number);
      await previous.waitFor();
      assert.equal(await previous.isDisabled(), true);
      await next.tap(); assert.equal(await progress(), 33);
      await previous.tap(); assert.equal(await progress(), 17);
      await surface.focus(); await surface.press('ArrowRight'); assert.equal(await progress(), 33);
      await surface.press('ArrowLeft'); assert.equal(await progress(), 17);
      await surface.press('Space'); assert.equal(await surface.getAttribute('aria-pressed'), 'true');
      await next.tap(); assert.equal(await surface.getAttribute('aria-pressed'), 'false');
      const pausedProgress = await progress();
      await page.waitForTimeout(650); assert.equal(await progress(), pausedProgress);
      const speed = page.getByRole('slider', { name: 'Words per minute', exact: true });
      await speed.focus(); await speed.press('ArrowRight');
      assert.equal(await speed.inputValue(), '325'); assert.equal(await progress(), pausedProgress);
      const previousButton = await previous.boundingBox();
      const nextButton = await next.boundingBox();
      assert.ok(previousButton.height >= 44 && previousButton.width >= 44);
      assert.ok(nextButton.height >= 44 && nextButton.width >= 44);
      const horizontalOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      assert.equal(horizontalOverflow, 0); assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(OUT, 'focus-reader-' + label + '.png'), fullPage: true });
      results.push({ label, viewport, touchNavigation: true, focusedArrowNavigation: true, manualNavigationPauses: true,
        nativeSliderIndependent: true, previousButton, nextButton, horizontalOverflow, errors });
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(OUT, 'focus-reader-browser.json'), JSON.stringify(results, null, 2) + '\n');
  console.log('Focus Reader browser checks passed at mobile and desktop sizes.');
  console.log(path.join(OUT, 'focus-reader-browser.json'));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
