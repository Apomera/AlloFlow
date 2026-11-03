import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const appRequire = createRequire(resolve('desktop/web-app/package.json'));
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const output = 'tmp/glossary-context-layout';
let browser, css, runtime;
beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  const config = { ...appRequire('./tailwind.config.js'), content: [resolve('view_glossary_source.jsx'), resolve('glossary_image_controls_source.jsx')] };
  css = (await appRequire('postcss')([appRequire('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const buildOptions = { stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;", resolveDir: resolve('desktop/web-app') }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } };
  // Build in Node so esbuild's buffers do not cross jsdom's Uint8Array realm.
  runtime = execFileSync(process.execPath, ['-e', 'process.stdout.write(require("esbuild").buildSync(' + JSON.stringify(buildOptions) + ').outputFiles[0].text)'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  browser = await chromium.launch({ headless: true });
}, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);

async function open(flashcard, enlarged) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><main id="root" data-allo-anno-host="true" class="p-4"></main></body></html>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: runtime });
  for (const file of ['app_styles_module.js', 'glossary_helpers_module.js', 'view_glossary_module.js']) await page.addScriptTag({ content: readFileSync(file, 'utf8') });
  await page.evaluate(({ fixture, translations, flashcard, enlarged }) => {
    const props = new Function('return ' + fixture)()();
    const data = [{ ...props.generatedContent.data[0], image: '', contextSentence: 'The leaf captures sunlight. '.repeat(12) + 'https://example.test/' + 'longpath'.repeat(20) },
      { entryId: 'arabic', term: 'ورقة', termLanguage: 'Arabic', definitionLanguage: 'Arabic', def: 'جزء من النبات يلتقط ضوء الشمس.', contextSentence: 'تمتص ورقة النبات ضوء الشمس لتنمو. '.repeat(12), contextSentenceLanguage: 'Arabic' }];
    props.generatedContent = { ...props.generatedContent, data };
    props.filteredGlossaryData = data.map((item, index) => ({ ...item, _originalIdx: index }));
    props.displayLanguages = []; props.selectedLanguages = [];
    props.handleExportGlossaryFile = () => {};
    props.isInteractiveFlashcards = flashcard; props.isFlashcardFlipped = true;
    props.t = key => { const value = key.split('.').reduce((obj, part) => obj && obj[part], translations); return typeof value === 'string' ? value : key; };
    window.createRoot(document.getElementById('root')).render(React.createElement(React.Fragment, null,
      React.createElement(window.AlloModules.AppStyles.AppStyles, { baseFontSize: enlarged ? 32 : 16, lineHeight: enlarged ? 2 : 1.5, letterSpacing: enlarged ? 0.08 : 0 }),
      React.createElement(window.AlloModules.GlossaryView, props)));
  }, { fixture: glossaryMediaProps.toString(), translations: JSON.parse(readFileSync('ui_strings.js', 'utf8')), flashcard, enlarged });
  await page.locator(flashcard ? '[data-flashcard-meaning]' : '[data-glossary-meaning]').first().waitFor();
  const surface = flashcard ? page.locator('[role=dialog]') : page.locator('[data-glossary-toolbar]');
  const toggle = surface.getByLabel('Show source sentences', { exact: true });
  expect(await toggle.isChecked()).toBe(false);
  const quote = page.locator(flashcard ? '[data-flashcard-meaning] [data-glossary-context-sentence]' : '[data-glossary-meaning] [data-glossary-context-sentence]').first();
  expect(await quote.isVisible()).toBe(false);
  await toggle.check();
  expect(await quote.isVisible()).toBe(true);
  return page;
}

describe('glossary source quote layout in the browser', () => {
  it.each([false, true])('keeps long quotes inside centered word-list columns with enlarged reading settings = %s', async enlarged => {
    const page = await open(false, enlarged);
    try {
      for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const values = await page.locator('[data-glossary-meaning]').evaluateAll(nodes => nodes.map(el => {
          const quote = el.querySelector('[data-glossary-context-sentence]'), q = quote.querySelector('q');
          const box = el.getBoundingClientRect(), cell = el.parentElement.getBoundingClientRect(), label = quote.querySelector('span').getBoundingClientRect();
          return { center: Math.abs((box.left + box.right) / 2 - (cell.left + cell.right) / 2), fits: el.scrollWidth <= el.clientWidth + 1 && quote.scrollWidth <= quote.clientWidth + 1,
            separated: q.getBoundingClientRect().top >= label.bottom, direction: getComputedStyle(q).direction, lineHeight: parseFloat(getComputedStyle(quote).lineHeight) / parseFloat(getComputedStyle(quote).fontSize) };
        }));
        for (const value of values) { expect(value.center).toBeLessThan(1); expect(value.fits).toBe(true); expect(value.separated).toBe(true); expect(value.lineHeight).toBeCloseTo(enlarged ? 2 : 1.5); }
        expect(values[1].direction).toBe('rtl');
        if (width === 320) { await page.locator('[data-glossary-word-list]').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/list-${width}-${enlarged}.png` }); }
        if ((width === 320 || width === 1280) && !enlarged) {
          await page.getByRole('button', { name: 'Present & Export', exact: true }).click();
          const exports = page.locator('[data-glossary-export-tools]');
          expect(await exports.getByRole('button', { name: 'Open presenter', exact: true }).isVisible()).toBe(true);
          expect(await exports.locator('[data-glossary-export-word-list]').isVisible()).toBe(true);
          expect(await exports.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
          await exports.screenshot({ path: output + '/present-and-export-' + width + '.png' });
          await page.getByRole('button', { name: 'Present & Export', exact: true }).click();
        }
      }
    } finally { await page.close(); }
  }, 45_000);

  it('centers the flashcard definition and keeps a long source quotation readable at 320px and 200% text', async () => {
    const page = await open(true, true);
    try {
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const value = await page.locator('[data-flashcard-meaning]').evaluate(el => {
          const card = el.closest('[data-flashcard-face]'), box = el.getBoundingClientRect(), face = card.getBoundingClientRect();
          const paragraph = el.querySelector('[data-flashcard-definition-text]').closest('p');
          return { center: Math.abs((box.left + box.right) / 2 - (face.left + face.right) / 2), textAlign: getComputedStyle(paragraph).textAlign, fits: card.scrollWidth <= card.clientWidth + 1 && el.scrollWidth <= el.clientWidth + 1 };
        });
        expect(value.center).toBeLessThan(1); expect(value.textAlign).toBe('center'); expect(value.fits).toBe(true);
        await page.locator('[data-flashcard-meaning]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/flashcard-${width}.png` });
      }
    } finally { await page.close(); }
  }, 45_000);
});
