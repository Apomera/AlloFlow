// On a phone the reader's mode bar wrapped to five rows and the passage started
// below the first screen (2026-10-29 review). The modes now share one row that
// scrolls sideways, the view buttons keep only their icons, and a wide pane is
// unchanged. Measured in Chromium with the app's own styles, not class names.
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
const fixture = readFileSync('dev-tools/reader_route_browser.cjs', 'utf8').match(/const fixture = String.raw`([\s\S]*?)`;/)[1];
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
  reader = process.env.ALLO_VIEW_CANDIDATE ? readFileSync(process.env.ALLO_VIEW_CANDIDATE, 'utf8') : renderReaderModule(INPUTS.map(file => readFileSync(file, 'utf8')));
  appStyles = process.env.ALLO_STYLES_CANDIDATE ? readFileSync(process.env.ALLO_STYLES_CANDIDATE, 'utf8') : buildAppStylesModule(readFileSync('app_styles_source.jsx', 'utf8'));
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { await browser?.close(); }, 60000);

async function renderPage(width, height = 640) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.route('**/*', route => route.request().url() === 'https://phone-toolbar.test/'
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="mount"></main></body></html>' })
    : route.abort());
  await page.goto('https://phone-toolbar.test/');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: runtime });
  await page.addScriptTag({ content: 'window.t=key=>key;window.AlloLanguageContext=React.createContext({t});window.AlloModules={};' });
  await page.addScriptTag({ content: appStyles });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js', 'immersive_reader_module.js']) {
    await page.addScriptTag({ content: readFileSync(file, 'utf8') });
  }
  await page.addScriptTag({ content: reader });
  await page.addScriptTag({ content: fixture });
  await page.evaluate(() => renderFixture({}));
  await page.locator('[data-reader-mode-buttons]').waitFor();
  return page;
}

const toolbar = page => page.evaluate(() => {
  const box = el => el.getBoundingClientRect();
  const modes = [...document.querySelectorAll('[data-reader-mode-buttons] > button')].map(el => ({ top: Math.round(box(el).top), height: box(el).height, text: el.textContent }));
  const display = document.querySelector('[data-reader-display]');
  const label = display.querySelector('[data-reader-tool-label]');
  return {
    modes,
    displayTop: Math.round(box(display).top),
    toolbarHeight: box(document.querySelector('[data-reader-primary-tools]')).height,
    labelWidth: box(label).width,
    displayName: display.textContent,
    passageTop: box(document.querySelector('[data-reading-passage]')).top,
    pageWidth: document.documentElement.scrollWidth,
    scroller: (s => ({ overflowX: getComputedStyle(s).overflowX, scrollWidth: s.scrollWidth, clientWidth: s.clientWidth }))(document.querySelector('[data-reader-mode-buttons]')),
  };
});

describe('reader toolbar on a phone', () => {
  it.each([320, 390])('puts every mode and Display on one row at %ipx, with the passage on the first screen', async width => {
    const page = await renderPage(width);
    try {
      const bar = await toolbar(page);
      expect(new Set(bar.modes.map(mode => mode.top)).size, JSON.stringify(bar.modes)).toBe(1);
      expect(Math.abs(bar.displayTop - bar.modes[0].top)).toBeLessThanOrEqual(4);
      expect(bar.toolbarHeight).toBeLessThan(80);
      expect(bar.scroller.overflowX).toBe('auto');
      expect(bar.pageWidth).toBeLessThanOrEqual(width);
      expect(bar.labelWidth).toBeLessThanOrEqual(1);
      expect(bar.displayName).toContain('Display');
      expect(bar.passageTop).toBeLessThan(640);
      // The last mode scrolls into view when it takes focus.
      await page.locator('[data-reader-practice]').focus();
      const practice = await page.locator('[data-reader-practice]').boundingBox();
      expect(practice.x + practice.width).toBeLessThanOrEqual(width);
    } finally { await page.close(); }
  }, 60000);

  it('leaves a wide pane as it was: labelled Display, no sideways scroll', async () => {
    const page = await renderPage(1100);
    try {
      const bar = await toolbar(page);
      expect(new Set(bar.modes.map(mode => mode.top)).size).toBe(1);
      expect(bar.labelWidth).toBeGreaterThan(20);
      expect(bar.scroller.scrollWidth).toBeLessThanOrEqual(bar.scroller.clientWidth);
    } finally { await page.close(); }
  }, 60000);
});
