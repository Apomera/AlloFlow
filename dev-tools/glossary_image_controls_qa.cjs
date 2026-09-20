const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const assert = require('node:assert/strict');
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/glossary-image-flow');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const config = { ...req('./tailwind.config.js'), content: [path.join(ROOT, 'view_glossary_source.jsx'), path.join(ROOT, 'glossary_image_controls_source.jsx')] };
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const runtime = esbuild.buildSync({ stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;", resolveDir: path.join(ROOT, 'desktop/web-app') }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  const assets = { '/runtime.js': runtime, '/styles.css': css, '/view.js': fs.readFileSync(path.join(ROOT, 'view_glossary_module.js')), '/helpers.js': fs.readFileSync(path.join(ROOT, 'glossary_helpers_module.js')), '/fixture.js': 'window.glossaryMediaProps=' + glossaryMediaProps.toString() + ';window.translations=' + fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8') };
  const server = http.createServer((request, response) => {
    if (assets[request.url]) { response.setHeader('Content-Type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(assets[request.url]); return; }
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [], evidence = { service: process.argv.includes('--live') ? 'live' : 'fixture' };
  let searchRequests = 0; let previewRequests = 0;
  if (!process.argv.includes('--live')) {
    await page.route('https://globalsymbols.com/api/v1/labels/search?**', async route => { searchRequests++; await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ text: 'Leaf', picto: { id: 1, image_url: 'https://symbols.test/leaf.svg' } }]) }); });
    await page.route('https://symbols.test/leaf.svg*', async route => { if (previewRequests++ === 0) { await route.fulfill({ status: 503, headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' }, body: '' }); return; } return route.fulfill({ contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M30 170 Q15 20 175 25 Q185 180 30 170" fill="#15803d"/><path d="M20 185 L160 40" stroke="#052e16" stroke-width="8"/></svg>' }); });
  }
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      const initial = window.glossaryMediaProps();
      const t = key => { const value = key.split('.').reduce((obj, part) => obj && obj[part], window.translations); return typeof value === 'string' ? value : key; };
      const registry = new Map();
      function App() {
        const [resource, setResource] = React.useState(initial.generatedContent);
        const [history, setHistory] = React.useState([initial.generatedContent]);
        const [editing, setEditing] = React.useState(true);
        const live = React.useRef(); live.current = { resource, history, activeView: 'glossary' };
        window.__glossary = live.current;
        return React.createElement(window.AlloModules.GlossaryView, window.glossaryMediaProps({ t, generatedContent: resource, history, isEditingGlossary: editing, handleToggleIsEditingGlossary: () => setEditing(x => !x), filteredGlossaryData: resource.data.map((item, index) => ({ ...item, _originalIdx: index })), beginGlossaryImageTask: index => window.AlloModules.GlossaryHelpers.beginGlossaryTask({ generatedContent: resource, setGeneratedContent: setResource, setHistory, getGlossaryLive: () => live.current, glossaryTaskRegistry: registry }, index, ['term', 'image'], 'image') }));
      }
      window.createRoot(document.getElementById('root')).render(React.createElement(App));
    });
    await page.getByRole('button', { name: 'Change image for Leaf' }).click();
    await page.getByRole('dialog').waitFor();
    await page.locator('input[type=file]').setInputFiles({ name: 'custom.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6e8AAAAASUVORK5CYII=', 'base64') });
    await page.getByText('Image updated. You can add a description or undo this change.', { exact: true }).waitFor();
    evidence.upload = await page.evaluate(() => ({ source: window.__glossary.resource.data[0].imageSource, savedToHistory: window.__glossary.history[0].data[0].image === window.__glossary.resource.data[0].image }));
    assert.equal(evidence.upload.source, 'author-upload'); assert.equal(evidence.upload.savedToHistory, true);
    await page.getByRole('button', { name: 'Find Mulberry symbol', exact: true }).click();
    try {
      await page.locator('button[aria-label^="Use "]').first().waitFor({ timeout: 20000 });
      evidence.liveSearch = { ok: true, results: await page.locator('button[aria-label^="Use "]').count() };
      if (!process.argv.includes('--live')) {
        await page.getByText('Preview unavailable', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Retry preview for Leaf', exact: true }).click();
        await page.waitForFunction(() => !document.querySelector('button[aria-label="Use Leaf for Leaf"]').disabled);
        evidence.previewRetry = true;
      }
      await page.locator('section[aria-label="Mulberry symbols for Leaf"]').scrollIntoViewIfNeeded();
      await page.locator('section[aria-label="Mulberry symbols for Leaf"] img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      await page.screenshot({ path: path.join(OUT, 'mulberry-search-desktop.png'), fullPage: true });
      await page.locator('button[aria-label^="Use "]').first().click();
      await page.getByText('Image updated. You can add a description or undo this change.', { exact: true }).waitFor({ timeout: 25000 });
      evidence.selection = await page.evaluate(() => ({ source: window.__glossary.resource.data[0].imageSource, png: window.__glossary.resource.data[0].image.startsWith('data:image/png;'), license: window.__glossary.resource.data[0].imageAttribution.license, savedToHistory: window.__glossary.history[0].data[0].image === window.__glossary.resource.data[0].image }));
      assert.equal(evidence.selection.png, true); assert.equal(evidence.selection.savedToHistory, true);
      const data = await page.evaluate(() => window.__glossary.resource.data[0].image.split(',')[1]); fs.writeFileSync(path.join(OUT, 'saved-mulberry-symbol.png'), Buffer.from(data, 'base64'));
    } catch (error) { evidence.liveSearch = { ...evidence.liveSearch, error: error.message, uiError: await page.locator('[role=alert]').allTextContents() }; throw error; }
    evidence.automaticSearch = process.argv.includes('--live') ? 'live search started on picker open' : searchRequests === 1;
    assert.ok(evidence.automaticSearch);
    await page.getByLabel('Image description (alt text, optional)').fill('A green leaf with a dark central vein.');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Change image for Leaf' }).click();
    assert.equal(await page.getByLabel('Image description (alt text, optional)').inputValue(), 'A green leaf with a dark central vein.');
    evidence.descriptionDraftRetained = true;
    await page.getByRole('button', { name: 'Save description', exact: true }).click();
    await page.getByText('Image description saved.', { exact: true }).waitFor();
    evidence.description = await page.evaluate(() => ({ text: window.__glossary.resource.data[0].imageAlt, hash: window.__glossary.resource.data[0].imageAltHash, history: window.__glossary.history[0].data[0].imageAlt }));
    assert.equal(evidence.description.text, evidence.description.history); assert.ok(evidence.description.hash.startsWith('img-'));
    evidence.renderedAltText = await page.locator('table img').evaluateAll(images => images.filter(image => !image.closest('dialog')).map(image => image.alt));
    assert.ok(evidence.renderedAltText.includes('A green leaf with a dark central vein.'));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    evidence.undo = await page.evaluate(() => ({ source: window.__glossary.resource.data[0].imageSource, history: window.__glossary.history[0].data[0].imageSource, description: window.__glossary.resource.data[0].imageAlt }));
    assert.equal(evidence.undo.source, 'author-upload'); assert.equal(evidence.undo.history, 'author-upload'); assert.equal(evidence.undo.description, '');
    evidence.layouts = [];
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.getByRole('button', { name: 'Find Mulberry symbol', exact: true }).click();
      await page.locator('button[aria-label^="Use "]').first().waitFor();
      await page.locator('dialog img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      const layout = await page.locator('dialog').evaluate(el => { const r = el.getBoundingClientRect(); return { width: innerWidth, left: r.left, right: r.right, bottom: r.bottom, viewportHeight: innerHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, modal: el.matches(':modal') }; });
      evidence.layouts.push(layout); assert.ok(layout.left >= 0 && layout.right <= width && layout.bottom <= layout.viewportHeight && layout.scrollWidth <= layout.clientWidth && layout.modal, JSON.stringify(layout));
      await page.screenshot({ path: path.join(OUT, 'picker-' + width + '.png') });
      await page.getByRole('button', { name: 'Close', exact: true }).focus();
      for (let i=0; i<14; i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('dialog')), 'Focus escaped modal'); }
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Change image for Leaf');
      await page.getByRole('button', { name: 'Change image for Leaf' }).click();
    }
    evidence.keyboard = 'Tab stays in the dialog; Escape closes and restores focus';
    assert.deepEqual(errors, []);
  } finally {
    evidence.errors = errors; fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2)); await browser.close(); server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
