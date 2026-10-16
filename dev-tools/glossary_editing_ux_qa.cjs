/* Browser acceptance for glossary editing using the real built view and host handlers. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/glossary-editing-ux-2026-10-13');
if (process.platform === 'win32') {
  const cache = path.join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache;
  const temp = path.join(ROOT, '.tmp/glossary-editing-ux-browser');
  fs.mkdirSync(temp, { recursive: true });
  process.env.TEMP = temp; process.env.TMP = temp; process.env.TMPDIR = temp;
}
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const config = { ...req('./tailwind.config.js'), content: [path.join(ROOT, 'view_glossary_source.jsx'), path.join(ROOT, 'glossary_image_controls_source.jsx')] };
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const runtime = esbuild.buildSync({ stdin: {
    contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;",
    resolveDir: path.join(ROOT, 'desktop/web-app'),
  }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  // Reuse the host's exact filtering expression; the fixture changes only its state wiring.
  const hostSource = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const filterStart = hostSource.indexOf('  const filteredGlossaryData = useMemo(() => {');
  const filterEnd = hostSource.indexOf('  const getReadableContent =', filterStart);
  assert.ok(filterStart >= 0 && filterEnd > filterStart, 'Host filtering anchors missing');
  const filterSource = hostSource.slice(filterStart, filterEnd).replace('const filteredGlossaryData = useMemo(() => {', 'return (() => {').replace('}, [generatedContent, glossarySearchTerm, glossaryFilter]);', '})();');
  const assets = {
    '/runtime.js': runtime, '/styles.css': css,
    '/view.js': fs.readFileSync(path.join(ROOT, 'view_glossary_module.js')),
    '/host.js': fs.readFileSync(path.join(ROOT, 'host_handlers_module.js')),
    '/helpers.js': fs.readFileSync(path.join(ROOT, 'glossary_helpers_module.js')),
    '/fixture.js': 'window.glossaryMediaProps=' + glossaryMediaProps.toString() + ';window.filterGlossary=function(generatedContent,glossarySearchTerm,glossaryFilter){' + filterSource + '};window.translations=' + fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'),
  };
  const server = http.createServer((request, response) => {
    const route = (request.url || '').split('?')[0];
    if (assets[route]) {
      response.setHeader('Content-Type', route.endsWith('.css') ? 'text/css' : 'application/javascript');
      response.end(assets[route]); return;
    }
    if (route !== '/') { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glossary editing UX QA</title><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/host.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  const report = { surface: 'Built glossary view and HostHandlers with production React, Lucide, Tailwind, verbatim host filtering and a stateful resource/history fixture; no deployment or model calls.', checks: [], screenshots: [], errors: [] };
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      const t = (key, params) => {
        const found = key.split('.').reduce((obj, part) => obj && obj[part], window.translations);
        let value = typeof found === 'string' ? found : key;
        Object.entries(params || {}).forEach(([name, replacement]) => { value = value.replaceAll('{' + name + '}', replacement); });
        return value;
      };
      const base = window.glossaryMediaProps();
      const initial = { ...base.generatedContent, data: [
        { ...base.generatedContent.data[0], isSelected: true },
        { entryId: 'root', term: 'Root', def: 'A plant part that takes in water.', tier: 'Domain-Specific', isSelected: false, translations: { French: 'Racine: Une partie de la plante qui absorbe l’eau.' } },
        { entryId: 'evidence', term: 'Evidence', def: 'Information used to support an explanation.', tier: 'Academic', isSelected: true, translations: { French: 'Preuve: Des informations qui étayent une explication.' } },
      ] };
      function App() {
        const [generatedContent, setGeneratedContent] = React.useState(initial);
        const [history, setHistory] = React.useState([initial]);
        const [state, setState] = React.useState({ editing: true, teacher: true, search: '', filter: 'all' });
        const live = React.useRef({});
        const mutationState = React.useRef({});
        const handlers = React.useRef(null);
        mutationState.current = { generatedContent, history };
        const update = patch => setState(previous => ({ ...previous, ...patch }));
        const baseDeps = { generatedContent, history, setGeneratedContent, setHistory, t, addToast() {},
          _resourceMutationStateRef: mutationState,
          getGlossaryLive: () => ({ resource: mutationState.current.generatedContent, history: mutationState.current.history, activeView: 'glossary' }),
        };
        live.current = baseDeps;
        if (!handlers.current) handlers.current = window.AlloModules.createHostHandlers(new Proxy({}, { get: (_, key) => key in live.current ? live.current[key] : handlers.current && handlers.current[key] }));
        window.glossaryEditingState = { generatedContent, history, ...state };
        window.updateGlossaryEditing = update;
        window.replaceGlossaryEditing = item => { setGeneratedContent(item); setHistory(previous => previous.concat(item)); };
        return React.createElement(window.AlloModules.GlossaryView, window.glossaryMediaProps({
          t, generatedContent, history, isEditingGlossary: state.editing, isTeacherMode: state.teacher,
          filteredGlossaryData: window.filterGlossary(generatedContent, state.search, state.filter),
          glossarySearchTerm: state.search, glossaryFilter: state.filter,
          setGlossarySearchTerm: search => update({ search }), setGlossaryFilter: filter => update({ filter }),
          handleSetGlossaryFilterToAll: () => update({ filter: 'all' }),
          handleSetGlossaryFilterToAcademic: () => update({ filter: 'academic' }),
          handleSetGlossaryFilterToDomain: () => update({ filter: 'domain' }),
          handleToggleIsEditingGlossary: () => update({ editing: !state.editing }),
          handleGlossaryChange: handlers.current.handleGlossaryChange,
          handleGlossarySelectionChange: handlers.current.handleGlossarySelectionChange,
          handleGlossarySelectAll: handlers.current.handleGlossarySelectAll,
          handleDeleteGlossaryItem: handlers.current.handleDeleteGlossaryItem,
          handleDeleteTermImage: handlers.current.handleDeleteTermImage,
        }));
      }
      const root = window.createRoot(document.getElementById('root'));
      let key = 0;
      window.mountGlossaryEditing = () => root.render(React.createElement(App, { key: ++key }));
      window.mountGlossaryEditing();
    });
    const list = page.locator('[data-glossary-word-list]');
    const search = page.locator('input[type="search"]');
    const count = page.locator('[data-glossary-result-count]');
    const undo = page.locator('[data-glossary-undo-action]');
    const row = term => list.locator('tbody > tr').filter({ has: page.getByRole('button', { name: 'Delete term: ' + term, exact: true }) });
    const waitState = predicate => page.waitForFunction(predicate);
    const screenshot = async name => { await page.screenshot({ path: path.join(OUT, name), fullPage: true }); report.screenshots.push(name); };
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page must fit viewport');
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.mountGlossaryEditing());
      await waitState(() => window.glossaryEditingState.generatedContent.data.length === 3 && window.glossaryEditingState.search === '');
      await list.waitFor();
      const all = list.getByRole('checkbox', { name: 'Include all terms', exact: true });
      assert.equal(await all.getAttribute('aria-checked'), 'mixed');
      assert.equal(await all.evaluate(element => element.indeterminate), true);
      assert.match(await page.locator('#glossary-selection-scope').textContent(), /3 words.*hidden by filters/);
      assert.equal(await count.textContent(), '3 of 3 words');
      await search.fill('Leaf');
      await page.waitForFunction(() => document.querySelector('[data-glossary-search-announcement]').textContent === '1 of 3 words');
      await all.check();
      await waitState(() => window.glossaryEditingState.generatedContent.data.every(item => item.isSelected));
      assert.equal(await all.evaluate(element => element.indeterminate), false);
      await all.uncheck();
      await waitState(() => window.glossaryEditingState.generatedContent.data.every(item => item.isSelected === false));
      await list.getByRole('checkbox', { name: 'Include Leaf', exact: true }).check();
      assert.equal(await all.getAttribute('aria-checked'), 'mixed');
      await page.locator('[data-help-key="glossary_filter_tier2"]').click();
      assert.equal(await count.textContent(), '0 of 3 words');
      await screenshot('filters-' + width + '.png');
      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await waitState(() => window.glossaryEditingState.search === '' && window.glossaryEditingState.filter === 'all');
      assert.equal(await search.evaluate(element => document.activeElement === element), true, 'Reset returns focus to search');
      assert.equal(await count.textContent(), '3 of 3 words');
      report.checks.push(width + ': result count, live announcement, complete filter reset and mixed select-all including hidden words.');

      await page.getByRole('button', { name: 'Delete term: Leaf', exact: true }).press('Enter');
      await waitState(() => window.glossaryEditingState.generatedContent.data.length === 2);
      await undo.waitFor();
      assert.equal(await undo.evaluate(element => document.activeElement === element), true, 'Deletion transfers keyboard focus to Undo');
      await row('Root').getByRole('textbox', { name: 'Edit definition', exact: true }).fill('Roots anchor a plant and absorb water.');
      await screenshot('word-undo-' + width + '.png');
      await undo.click();
      await waitState(() => window.glossaryEditingState.generatedContent.data.length === 3);
      assert.deepEqual(await page.evaluate(() => window.glossaryEditingState.generatedContent.data.map(item => item.term)), ['Leaf', 'Root', 'Evidence']);
      assert.equal(await page.evaluate(() => window.glossaryEditingState.generatedContent.data[1].def), 'Roots anchor a plant and absorb water.');
      assert.equal(await row('Leaf').evaluate(element => element.contains(document.activeElement)), true, 'Undo focuses restored row');
      assert.deepEqual(await page.evaluate(() => window.glossaryEditingState.history[0].data), await page.evaluate(() => window.glossaryEditingState.generatedContent.data));
      report.checks.push(width + ': word Undo restores original position and row focus, preserves later edits, and updates history.');

      const leafImage = await row('Leaf').locator('img').getAttribute('src');
      await page.getByRole('button', { name: 'Delete image for Leaf', exact: true }).press('Enter');
      await waitState(() => !window.glossaryEditingState.generatedContent.data[0].image);
      await undo.waitFor();
      assert.equal(await undo.evaluate(element => document.activeElement === element), true, 'Image removal transfers keyboard focus to Undo');
      await row('Leaf').getByRole('textbox', { name: 'Edit definition', exact: true }).fill('A leaf captures sunlight and exchanges gases.');
      await screenshot('image-undo-' + width + '.png');
      await undo.click();
      await waitState(() => !!window.glossaryEditingState.generatedContent.data[0].image);
      assert.equal(await row('Leaf').locator('img').getAttribute('src'), leafImage);
      assert.equal(await page.evaluate(() => window.glossaryEditingState.generatedContent.data[0].def), 'A leaf captures sunlight and exchanges gases.');
      assert.equal(await row('Leaf').evaluate(element => element.contains(document.activeElement)), true);
      report.checks.push(width + ': image Undo restores the image while retaining edits to its word and returns focus to the row.');

      await search.fill('Root');
      await page.getByRole('button', { name: 'Delete term: Root', exact: true }).click();
      await waitState(() => window.glossaryEditingState.generatedContent.data.length === 2);
      const noticeBounds = await page.locator('[data-glossary-undo]').boundingBox();
      assert.ok(noticeBounds && noticeBounds.y >= 0 && noticeBounds.y + noticeBounds.height <= 1001 && noticeBounds.x >= 0 && noticeBounds.x + noticeBounds.width <= width + 1, 'Undo notice remains inside viewport after deleting a lower row');
      assert.deepEqual(await page.evaluate(() => window.glossaryEditingState.generatedContent.data.map(item => item.term)), ['Leaf', 'Evidence']);
      assert.equal(await count.textContent(), '0 of 2 words');
      await undo.click();
      await waitState(() => window.glossaryEditingState.generatedContent.data.length === 3);
      assert.equal(await count.textContent(), '1 of 3 words');
      await page.getByRole('button', { name: 'Clear search', exact: true }).click();
      assert.equal(await search.evaluate(element => document.activeElement === element), true);
      await noOverflow();
      await screenshot('restored-' + width + '.png');
      report.checks.push(width + ': deleting a filtered result targets its original entry; Undo restores the filtered result and counts.');
    }
    await page.getByRole('button', { name: 'Delete term: Leaf', exact: true }).click();
    await undo.waitFor();
    await page.getByRole('button', { name: 'Dismiss undo', exact: true }).click();
    await undo.waitFor({ state: 'detached' });
    assert.equal(await list.evaluate(element => document.activeElement === element), true, 'Dismiss returns focus to word list');
    await page.getByRole('button', { name: 'Delete term: Root', exact: true }).click();
    await undo.waitFor();
    await page.evaluate(() => window.replaceGlossaryEditing({ id: 'other-glossary', type: 'glossary', data: [{ entryId: 'other', term: 'Other', def: 'A different resource.', translations: {} }] }));
    await undo.waitFor({ state: 'detached' });
    assert.equal(await count.textContent(), '1 of 1 words');
    report.checks.push('Dismiss returns focus to the list. Switching resources removes the old Undo action.');
    assert.deepEqual(report.errors, []);
    console.log(JSON.stringify({ checks: report.checks, screenshots: report.screenshots.length, errors: report.errors, output: OUT }, null, 2));
  } catch (error) {
    report.failure = error.message;
    if (page) await page.screenshot({ path: path.join(OUT, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
