/* Responsive glossary acceptance using built assets and a stateful host fixture. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/glossary-mobile-ux-2026-10-12');
if (process.platform === 'win32') {
  const cache = path.join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache;
  const temp = path.join(ROOT, '.tmp/glossary-mobile-ux-browser');
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
  const assets = {
    '/runtime.js': runtime, '/styles.css': css,
    '/view.js': fs.readFileSync(path.join(ROOT, 'view_glossary_module.js')),
    '/helpers.js': fs.readFileSync(path.join(ROOT, 'glossary_helpers_module.js')),
    '/fixture.js': 'window.glossaryMediaProps=' + glossaryMediaProps.toString() + ';window.translations=' + fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'),
  };
  const server = http.createServer((request, response) => {
    const route = (request.url || '').split('?')[0];
    if (assets[route]) {
      response.setHeader('Content-Type', route.endsWith('.css') ? 'text/css' : 'application/javascript');
      response.end(assets[route]); return;
    }
    if (route !== '/') { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glossary responsive UX QA</title><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  const report = { surface: 'Built glossary module with production React, Lucide and Tailwind configuration; audio host is stubbed', layouts: [], checks: [], errors: [] };
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      const translate = key => { const value = key.split('.').reduce((obj, part) => obj && obj[part], window.translations); return typeof value === 'string' ? value : key; };
      const base = window.glossaryMediaProps();
      const initialData = [
        { ...base.generatedContent.data[0], translations: { French: 'Feuille : Une partie de la plante qui capte la lumière.', Arabic: 'ورقة النبات: جزء من النبات يلتقط ضوء الشمس.' } },
        { entryId: 'photosynthesis', term: 'PhotosynthesisAndCellularRespiration', def: 'Plants convert sunlight into stored energy. Compare the evidence at https://example.test/averylongunbrokenpaththatexercisestheglossarywrappingbehavior.', tier: 'Academic', translations: { French: 'Transformation de la lumière en énergie dans les plantes.', Arabic: 'تحويل ضوء الشمس إلى طاقة مخزنة في النباتات.' } },
      ];
      window.glossaryUxCalls = { speech: [], download: [], changes: [], stops: 0 };
      function App() {
        const [state, setState] = React.useState({ editing: false, translated: true, imageSize: 300, playingContentId: null, isGeneratingAudio: false });
        const [data, setData] = React.useState(initialData);
        window.updateGlossaryUx = patch => setState(previous => ({ ...previous, ...patch }));
        window.glossaryUxState = { ...state, data };
        const update = patch => setState(previous => ({ ...previous, ...patch }));
        return React.createElement(window.AlloModules.GlossaryView, window.glossaryMediaProps({
          t: translate, generatedContent: { ...base.generatedContent, data },
          filteredGlossaryData: data.map((item, index) => ({ ...item, _originalIdx: index })),
          selectedLanguages: state.translated ? ['French', 'Arabic'] : [], displayLanguages: state.translated ? ['French', 'Arabic'] : [],
          isEditingGlossary: state.editing, glossaryImageSize: state.imageSize,
          isRtlLang: language => language === 'Arabic',
          handleToggleIsEditingGlossary: () => update({ editing: !state.editing }),
          handleGlossaryChange: (index, field, value, language) => {
            window.glossaryUxCalls.changes.push({ index, field, value, language });
            setData(previous => previous.map((item, i) => i !== index ? item : field === 'translations' ? { ...item, translations: { ...item.translations, [language]: value } } : { ...item, [field]: value }));
          },
          handleGlossarySelectionChange: index => setData(previous => previous.map((item, i) => i === index ? { ...item, isSelected: item.isSelected === false } : item)),
          handleGlossarySelectAll: event => { const selected = event.target.checked; setData(previous => previous.map(item => ({ ...item, isSelected: selected }))); },
          playingContentId: state.playingContentId, isGeneratingAudio: state.isGeneratingAudio,
          setPlayingContentId: playingContentId => update({ playingContentId }),
          setIsGeneratingAudio: isGeneratingAudio => update({ isGeneratingAudio }),
          stopPlayback: () => { window.glossaryUxCalls.stops++; update({ playingContentId: null, isGeneratingAudio: false }); },
          handleSpeak: (text, id) => { window.glossaryUxCalls.speech.push({ text, id }); update({ playingContentId: id }); },
          handleDownloadAudio: (text, filename, id) => window.glossaryUxCalls.download.push({ text, filename, id }),
        }));
      }
      window.createRoot(document.getElementById('root')).render(React.createElement(App));
    });
    const list = page.locator('[data-glossary-word-list]');
    await list.waitFor();
    const measure = async () => list.evaluate(element => {
      const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      return {
        width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        tableDisplay: getComputedStyle(element.querySelector('table')).display,
        rows: Array.from(element.querySelectorAll('tbody > tr')).map(row => ({ ...rect(row), cells: Array.from(row.children).map(cell => ({ ...rect(cell), clientWidth: cell.clientWidth, scrollWidth: cell.scrollWidth })) })),
        rtlDirections: Array.from(element.querySelectorAll('[dir="rtl"]')).map(node => getComputedStyle(node).direction),
      };
    });
    for (const editing of [false, true]) {
      for (const translated of [true, false]) {
        await page.evaluate(patch => window.updateGlossaryUx(patch), { editing, translated });
        await page.waitForFunction(({ editing, translated }) => window.glossaryUxState.editing === editing && window.glossaryUxState.translated === translated, { editing, translated });
        for (const width of [320, 390, 768, 1280]) {
          await page.setViewportSize({ width, height: 1000 });
          await list.scrollIntoViewIfNeeded();
          const layout = await measure();
          const filename = (editing ? 'edit' : 'read') + (translated ? '-translations-' : '-english-') + width + '.png';
          report.layouts.push({ editing, translated, screenshot: filename, ...layout });
          assert.equal(await list.getByRole('table').count(), 1, 'One accessible table must serve all widths');
          assert.equal(layout.rows.length, 2);
          assert.ok(layout.documentWidth <= width, 'Page overflows: ' + filename);
          if (width < 640) {
            assert.ok(layout.scrollWidth <= layout.clientWidth + 1, 'Glossary needs sideways scrolling: ' + filename);
            for (const row of layout.rows) {
              for (const [index, cell] of row.cells.entries()) {
                assert.ok(cell.scrollWidth <= cell.clientWidth + 1, 'Cell content overflows: ' + filename);
                if (index > 0) assert.ok(cell.y >= row.cells[index - 1].bottom - 1, 'Fields do not stack: ' + filename);
              }
            }
          } else {
            assert.equal(layout.tableDisplay, 'table', 'Desktop must retain table layout');
            for (const row of layout.rows) assert.ok(row.cells.every(cell => Math.abs(cell.y - row.cells[0].y) <= 1), 'Desktop columns misaligned');
          }
          if (translated) assert.ok(layout.rtlDirections.length >= 2 && layout.rtlDirections.every(direction => direction === 'rtl'), 'Arabic reading direction changed');
          if (editing) {
            const checkbox = list.getByRole('checkbox', { name: 'Include all terms', exact: true });
            assert.ok(await checkbox.isVisible(), 'Select all must remain visible');
            await checkbox.focus();
            const bounds = await checkbox.boundingBox();
            assert.ok(bounds.width > 1 && bounds.height > 1, 'Select all is visually clipped');
          }
          await list.screenshot({ path: path.join(OUT, filename) });
        }
      }
    }
    report.checks.push('16 reading/editing, English/multilingual layouts at 320/390/768/1280; phone fields stack without horizontal scrolling, desktop columns and Arabic direction remain intact.');
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.evaluate(() => window.updateGlossaryUx({ editing: true, translated: true }));
    await list.getByRole('checkbox', { name: 'Include all terms', exact: true }).uncheck();
    await page.waitForFunction(() => window.glossaryUxState.data.every(item => item.isSelected === false));
    await list.getByRole('checkbox', { name: 'Include Leaf', exact: true }).check();
    await page.waitForFunction(() => window.glossaryUxState.data[0].isSelected === true && window.glossaryUxState.data[1].isSelected === false);
    await list.getByRole('textbox', { name: 'Edit definition', exact: true }).first().fill('A leaf captures sunlight for a plant.');
    const translation = list.locator('tbody > tr').first().locator('[dir="rtl"] textarea');
    await translation.fill('ورقة خضراء تلتقط ضوء الشمس.');
    await page.waitForFunction(() => window.glossaryUxState.data[0].def === 'A leaf captures sunlight for a plant.' && window.glossaryUxState.data[0].translations.Arabic === 'ورقة خضراء تلتقط ضوء الشمس.');
    assert.deepEqual(await page.evaluate(() => window.glossaryUxCalls.changes.map(({ index, field, language }) => ({ index, field, language }))), [{ index: 0, field: 'def', language: undefined }, { index: 0, field: 'translations', language: 'Arabic' }]);
    report.checks.push('Mobile select-all and individual selection remain operable; definition and Arabic edits update the correct source entry.');
    await page.evaluate(() => window.updateGlossaryUx({ editing: false }));
    const read = list.getByRole('button', { name: 'Read term: Leaf', exact: true });
    await read.click();
    const stop = list.getByRole('button', { name: /Stop.*Leaf/ }).first();
    await stop.waitFor();
    assert.equal(await stop.getAttribute('title'), await stop.getAttribute('aria-label'));
    await stop.click();
    await read.waitFor();
    await list.getByRole('button', { name: 'Download audio for term: Leaf', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.glossaryUxCalls.speech), [{ text: 'Leaf', id: 'term-0' }]);
    assert.deepEqual(await page.evaluate(() => window.glossaryUxCalls.download), [{ text: 'Leaf', filename: 'term-0-audio', id: 'dl-term-0' }]);
    report.checks.push('Phone audio control changes Read to Stop and restores Read after stopping; tooltip matches accessible name and download targets the term. Audio generation itself is stubbed.');
    await page.emulateMedia({ media: 'print' });
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      const layout = await measure();
      assert.equal(layout.tableDisplay, 'table', 'Print must retain table layout at width ' + width);
      for (const row of layout.rows) assert.ok(row.cells.every(cell => Math.abs(cell.y - row.cells[0].y) <= 1), 'Print columns misaligned');
    }
    report.checks.push('Print media retains tabular columns even at phone viewport width.');
    assert.deepEqual(report.errors, []);
    console.log(JSON.stringify({ layouts: report.layouts.length, checks: report.checks, errors: report.errors, output: OUT }, null, 2));
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
