import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const web = createRequire(resolve('desktop/web-app/package.json'));
const { buildAppStylesModule } = require('../_build_app_styles_module.js');
const { INPUTS, renderReaderModule } = require('../dev-tools/lib/reader_compiler.cjs');
const fixture = readFileSync('dev-tools/reader_route_browser.cjs', 'utf8')
  .match(/const fixture = String.raw`([\s\S]*?)`;/)[1]
  .replace(/const text=.*?;\r?\n/, "const text=Array.from({length:18},(_,i)=>'## Section '+(i+1)+'\\n\\nPlants use sunlight to grow. Roots take up water from the soil. Leaves turn light into food. Bees carry pollen between flowers.').join('\\n\\n');\n");
let browser, runtime, css, reader, appStyles;

beforeAll(async () => {
  const bundleOptions = { stdin: {
    contents: "import React from 'react';import {createRoot} from 'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;",
    resolveDir: resolve('desktop/web-app'),
  }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } };
  // esbuild needs Node's native typed arrays rather than jsdom's separate realm.
  runtime = execFileSync(process.execPath, ['-e', 'process.stdout.write(require("esbuild").buildSync(' + JSON.stringify(bundleOptions) + ').outputFiles[0].text)'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  const config = { ...web('./tailwind.config.js'), content: [resolve('view_simplified_source.jsx')] };
  css = (await web('postcss')([web('tailwindcss')(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })).css;
  reader = renderReaderModule(INPUTS.map(file => readFileSync(file, 'utf8')));
  appStyles = buildAppStylesModule(readFileSync('app_styles_source.jsx', 'utf8'));
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { await browser?.close(); }, 60000);

async function renderPage(width) {
  const page = await browser.newPage({ viewport: { width, height: 760 }, reducedMotion: 'reduce' });
  await page.route('**/*', route => route.request().url() === 'https://comparison-flow.test/'
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="mount"></main></body></html>' })
    : route.abort());
  await page.goto('https://comparison-flow.test/');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: runtime });
  await page.addScriptTag({ content: 'window.t=key=>({"simplified.diff_original":"Original","simplified.diff_adapted":"Adapted"}[key]||key);window.AlloLanguageContext=React.createContext({t});window.AlloModules={};' });
  await page.addScriptTag({ content: appStyles });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js', 'immersive_reader_module.js']) {
    await page.addScriptTag({ content: readFileSync(file, 'utf8') });
  }
  await page.addScriptTag({ content: reader });
  await page.addScriptTag({ content: fixture });
  await page.evaluate(() => renderFixture({ compare: true, teacher: false }));
  await page.locator('[data-compare-version="source"]').waitFor();
  return page;
}

const dimensions = page => page.locator('[data-compare-version]').evaluateAll(panes => panes.map(pane => {
  const rect = pane.getBoundingClientRect(), style = getComputedStyle(pane);
  return { top: rect.top, bottom: rect.bottom, left: rect.left, height: rect.height,
    scrollHeight: pane.scrollHeight, clientHeight: pane.clientHeight, maxHeight: style.maxHeight,
    overflow: style.overflowY, gutter: style.scrollbarGutter, tabIndex: pane.tabIndex };
}));

describe('comparison reading flow', () => {
  it.each([320, 767])('uses one continuous page scroll at %ipx with keyboard access to both passages', async width => {
    const page = await renderPage(width);
    try {
      const panes = await dimensions(page);
      for (const pane of panes) {
        expect(pane.maxHeight).toBe('none');
        expect(pane.overflow).toBe('visible');
        expect(pane.gutter).toBe('auto');
        expect(pane.scrollHeight).toBeLessThanOrEqual(pane.clientHeight + 1);
        expect(pane.tabIndex).toBe(0);
      }
      expect(panes[1].top).toBeGreaterThan(panes[0].bottom);
      expect(await page.locator('[data-compare-scroll-setting]').isVisible()).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.locator('[data-compare-version="source"]').focus();
      const before = await page.evaluate(() => scrollY);
      await page.keyboard.press('PageDown');
      await page.waitForFunction(before => scrollY > before, before);
      expect(await page.locator('[data-compare-version="source"]').evaluate(el => el.scrollTop)).toBe(0);
      await page.locator('[data-compare-version="adapted"]').focus();
      expect(await page.locator('[data-compare-version="adapted"]').evaluate(el => el === document.activeElement)).toBe(true);
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    } finally { await page.close(); }
  });

  it('keeps desktop panes synchronized and restores the scroll preference after resizing', async () => {
    const page = await renderPage(1100);
    try {
      for (const width of [1100, 768]) {
        await page.setViewportSize({ width, height: 760 });
        const panes = await dimensions(page);
        expect(Math.abs(panes[0].top - panes[1].top)).toBeLessThan(2);
        expect(panes[1].left).toBeGreaterThan(panes[0].left);
        for (const pane of panes) {
          expect(pane.overflow).toBe('auto');
          expect(pane.height).toBeLessThanOrEqual(760 * 0.7 + 1);
          expect(pane.scrollHeight).toBeGreaterThan(pane.clientHeight);
        }
      }
      await page.locator('[data-compare-version="source"]').evaluate(el => { el.scrollTop = 300; });
      await page.waitForFunction(() => document.querySelector('[data-compare-version="adapted"]').scrollTop > 250);
      await page.locator('[data-compare-scroll-together]').uncheck();
      await page.setViewportSize({ width: 375, height: 760 });
      expect(await page.locator('[data-compare-scroll-setting]').isVisible()).toBe(false);
      for (const pane of await dimensions(page)) expect(pane.maxHeight).toBe('none');
      await page.setViewportSize({ width: 1100, height: 760 });
      expect(await page.locator('[data-compare-scroll-together]').isChecked()).toBe(false);
      expect(await page.locator('[data-compare-scroll-setting]').isVisible()).toBe(true);
      const before = await page.locator('[data-compare-version="adapted"]').evaluate(el => el.scrollTop);
      await page.locator('[data-compare-version="source"]').evaluate(el => { el.scrollTop = 500; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect(await page.locator('[data-compare-version="adapted"]').evaluate(el => el.scrollTop)).toBe(before);
    } finally { await page.close(); }
  });
});
