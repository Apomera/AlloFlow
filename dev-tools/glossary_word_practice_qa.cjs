/* Chromium acceptance for Glossary Present & Export and its failure diagnostics. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/glossary-word-practice-2026-10-12');
const browserCache = path.join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && process.platform === 'win32' && fs.existsSync(browserCache)) process.env.PLAYWRIGHT_BROWSERS_PATH = browserCache;
if (process.platform === 'win32') {
  const browserTemp = path.join(root, '.tmp/glossary-word-practice-browser');
  fs.mkdirSync(browserTemp, { recursive: true });
  process.env.TEMP = browserTemp; process.env.TMP = browserTemp; process.env.TMPDIR = browserTemp;
}
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');
const req = createRequire(path.join(root, 'desktop/web-app/package.json'));

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const config = { ...req('./tailwind.config.js'), content: [path.join(root, 'view_glossary_source.jsx'), path.join(root, 'glossary_image_controls_source.jsx')] };
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const runtime = esbuild.buildSync({ stdin: {
    contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;",
    resolveDir: path.join(root, 'desktop/web-app'),
  }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  const assets = {
    '/runtime.js': runtime, '/styles.css': css,
    '/view.js': fs.readFileSync(path.join(root, 'view_glossary_module.js')),
    '/helpers.js': fs.readFileSync(path.join(root, 'glossary_helpers_module.js')),
    '/presenter.js': fs.readFileSync(path.join(root, 'word_practice_module.js')),
    '/fixture.js': 'window.glossaryMediaProps=' + glossaryMediaProps.toString() + ';window.translations=' + fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'),
  };
  const server = http.createServer((request, response) => {
    const route = (request.url || '').split('?')[0];
    if (assets[route]) {
      response.setHeader('Content-Type', route.endsWith('.css') ? 'text/css' : 'application/javascript');
      response.end(assets[route]); return;
    }
    if (route !== '/') { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glossary presentation QA</title><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/view.js"></script><script src="/presenter.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const report = { checks: [], layouts: [], errors: [] };
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      const t = key => { const value = key.split('.').reduce((obj, part) => obj && obj[part], window.translations); return typeof value === 'string' ? value : key; };
      window.__alloBuildStamp = { hash: 'glossary-qa', surface: 'development' };
      window.installPresenterLauncher = () => {
        window.__alloOpenWordPractice = async options => window.AlloModules.WordPractice.open(options);
      };
      window.installPresenterLauncher();
      const initial = window.glossaryMediaProps();
      initial.generatedContent.title = 'Plant words';
      initial.generatedContent.data.push({ term: 'Root', def: 'A plant part that takes up water.', translations: { French: 'Racine' } });
      window.createRoot(document.getElementById('root')).render(React.createElement(window.AlloModules.GlossaryView, window.glossaryMediaProps({
        t, generatedContent: initial.generatedContent, filteredGlossaryData: initial.generatedContent.data,
        selectedVoice: 'teacher', voiceSpeed: 0.9,
      })));
    });
    const launcher = page.getByRole('button', { name: 'Present & Export', exact: true });
    for (const label of ['Read term: Leaf', 'Download audio for term: Leaf', 'Read definition for Leaf', 'Download definition audio for Leaf', 'Read French translation of Leaf', 'Download French translation audio for Leaf']) {
      const control = page.getByRole('button', { name: label, exact: true });
      assert.equal(await control.count(), 1, label + ' is an accessible button');
      assert.equal(await control.getAttribute('title'), label, label + ' has a matching tooltip');
      assert.equal(await control.locator('svg').getAttribute('aria-hidden'), 'true');
    }
    report.checks.push('All six glossary audio play/download icons expose contextual names and tooltips; decorative SVGs are hidden from assistive technology.');
    await launcher.click();
    await page.getByRole('dialog', { name: 'Present & Export', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Practice title', { exact: true }).inputValue(), 'Plant words');
    assert.equal(await page.getByLabel('Words (one per line)', { exact: true }).inputValue(), 'Leaf\nRoot');
    await page.getByLabel('Practice activity', { exact: true }).selectOption('vocabulary');
    await page.getByLabel('Shuffle each repetition', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await page.getByRole('button', { name: 'Show meaning', exact: true }).click();
    assert.match(await page.locator('.awp-card').innerText(), /A plant part that captures sunlight/);
    await page.screenshot({ path: path.join(out, 'presenter-1280.png'), fullPage: true });
    report.checks.push('The actual glossary button opens the actual presenter and retains word meanings.');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.evaluate(() => { delete window.__alloOpenWordPractice; });
    await launcher.click();
    await page.getByText('Presentation tools are unavailable in this app version. Save your work, then reload or update AlloFlow.', { exact: true }).waitFor();
    await page.locator('summary').filter({ hasText: /^Presentation diagnostics$/ }).click();
    const details = page.getByRole('textbox', { name: 'Presentation diagnostics', exact: true });
    const diagnostic = JSON.parse(await details.inputValue());
    assert.equal(diagnostic.phase, 'launcher');
    assert.equal(diagnostic.error.code, 'word-practice-launcher-unavailable');
    assert.equal(diagnostic.launcherAvailable, false);
    assert.equal(diagnostic.wordCount, 2);
    assert.ok(!JSON.stringify(diagnostic).includes('Plant words') && !JSON.stringify(diagnostic).includes('captures sunlight'));
    report.diagnostic = diagnostic;
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedGlossaryDiagnostic = text; } } }));
    await page.getByRole('button', { name: 'Copy diagnostics', exact: true }).click();
    await page.getByText('Diagnostics copied.', { exact: true }).waitFor();
    assert.deepEqual(JSON.parse(await page.evaluate(() => window.copiedGlossaryDiagnostic)), diagnostic);
    await page.locator('summary').filter({ hasText: /^Presentation diagnostics$/ }).click();
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Embedded clipboard blocked'); } } }));
    await page.getByRole('button', { name: 'Copy diagnostics', exact: true }).click();
    await page.getByText('Automatic copy is unavailable. The details are selected; copy them manually.', { exact: true }).waitFor();
    assert.equal(await details.evaluate(element => document.activeElement === element && element.selectionEnd - element.selectionStart === element.value.length), true);
    report.checks.push('Copy diagnostics awaits success; a simulated embedded clipboard denial opens and selects the details for manual copying.');
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await details.scrollIntoViewIfNeeded();
      const layout = await details.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);
        return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, left: rect.left, right: rect.right, width: rect.width, height: rect.height, fontSize: styles.fontSize, readOnly: element.readOnly, textLength: element.value.length };
      });
      assert.ok(layout.documentWidth <= width + 1 && layout.left >= 0 && layout.right <= width + 1, JSON.stringify(layout));
      assert.ok(layout.width >= 280 && layout.height >= 150 && layout.readOnly && layout.textLength > 100, JSON.stringify(layout));
      await details.focus();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      assert.equal(await details.evaluate(element => element.selectionEnd - element.selectionStart), await details.evaluate(element => element.value.length));
      await details.evaluate(element => { element.setSelectionRange(0, 0); element.blur(); });
      report.layouts.push(layout);
      await page.screenshot({ path: path.join(out, 'diagnostics-' + width + '.png'), fullPage: true });
    }
    report.checks.push('Missing launcher exposes its specific error and selectable diagnostics without horizontal overflow at 390 and 1280 pixels.');
    await page.evaluate(() => window.installPresenterLauncher());
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByRole('dialog', { name: 'Present & Export', exact: true }).waitFor();
    assert.equal(await details.count(), 0);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await launcher.isEnabled(), true);
    report.checks.push('Retry succeeds after the launcher becomes available and clears the previous diagnostic panel.');
    assert.deepEqual(report.errors, []);
  } catch (error) {
    report.failure = error.message;
    if (browser) {
      const page = browser.contexts()[0]?.pages()[0];
      if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'qa.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
