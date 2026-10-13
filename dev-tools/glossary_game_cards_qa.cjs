/* Browser layout acceptance for the glossary game menu, using production assets. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/glossary-game-cards-2026-10-12');
if (process.platform === 'win32') {
  const cache = path.join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache;
  const temp = path.join(ROOT, '.tmp/glossary-game-cards-browser');
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
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glossary game menu QA</title><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  const report = { surface: 'built glossary module with production React, Lucide and Tailwind configuration', layouts: [], checks: [], errors: [] };
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      const translate = key => { const value = key.split('.').reduce((obj, part) => obj && obj[part], window.translations); return typeof value === 'string' ? value : key; };
      const base = window.glossaryMediaProps();
      const terms = ['Leaf', 'Root', 'Seed', 'Stem', 'Flower', 'Fruit', 'Branch', 'Bark', 'Tree', 'Moss', 'Fern', 'Grass'];
      window.wordSearchCalls = [];
      function App() {
        const [state, set] = React.useState({ teacher: true, translated: true, longCopy: false, wordSearchLang: 'English', gameMode: null });
        window.updateGameMenu = patch => set(previous => ({ ...previous, ...patch }));
        window.gameMenuState = state;
        const longCopy = {
          'glossary.memory_game': 'Gedächtnisübungswortschatzzuordnungslernaktivitäten',
          'glossary.activities.memory_help': 'pairs: examine the vocabulary carefully, remember every picture, and connect each word with the meaning you have learned.',
          'glossary.activities.crossword_help': 'Read each clue carefully and spell the corresponding vocabulary term in the spaces provided.',
        };
        const t = key => state.longCopy && longCopy[key] ? longCopy[key] : translate(key);
        const data = terms.map((term, index) => ({ ...base.generatedContent.data[0], term, entryId: 'plant-' + index, def: 'Meaning of ' + term, translations: state.translated ? { French: 'French ' + term } : {} }));
        return React.createElement(window.AlloModules.GlossaryView, window.glossaryMediaProps({
          t, isTeacherMode: state.teacher, selectedLanguages: state.translated ? ['French'] : [], displayLanguages: state.translated ? ['French'] : [],
          generatedContent: { ...base.generatedContent, data }, filteredGlossaryData: data.slice(0, 4).map((item, index) => ({ ...item, _originalIdx: index })),
          wordSearchLang: state.wordSearchLang, gameMode: state.gameMode,
          setWordSearchLang: wordSearchLang => set(previous => ({ ...previous, wordSearchLang })),
          generateWordSearch: (language, words) => {
            window.wordSearchCalls.push({ language, words: words.map(item => item.term) });
            set(previous => ({ ...previous, gameMode: 'wordsearch' }));
          },
        }));
      }
      window.createRoot(document.getElementById('root')).render(React.createElement(App));
    });
    await page.locator('button[aria-controls="glossary-games-tools"]').click();
    const panel = page.locator('#glossary-games-tools');
    const grid = page.locator('[data-glossary-game-grid]');
    await grid.waitFor();
    const scenarios = [
      { teacher: true, translated: true }, { teacher: true, translated: false },
      { teacher: false, translated: true }, { teacher: false, translated: false },
      { teacher: true, translated: true, longCopy: true },
    ];
    for (const { teacher, translated, longCopy = false } of scenarios) {
      await page.evaluate(patch => window.updateGameMenu(patch), { teacher, translated, longCopy });
      await page.waitForFunction(({ teacher, translated, longCopy }) => window.gameMenuState.teacher === teacher && window.gameMenuState.translated === translated && window.gameMenuState.longCopy === longCopy, { teacher, translated, longCopy });
      assert.equal(await grid.locator(':scope > button').count(), teacher ? 8 : 7);
      assert.equal(await panel.locator('[data-help-key="glossary_puzzle_lang"]').count(), translated ? 1 : 0);
      if (translated) assert.equal(await panel.locator('[data-glossary-activity-settings] [data-help-key="glossary_puzzle_lang"]').count(), 1);
      for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await panel.scrollIntoViewIfNeeded();
        const layout = await grid.evaluate(element => {
          const panel = element.closest('#glossary-games-tools');
          const measure = node => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
          return {
            viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
            panelWidth: panel.clientWidth, panelScrollWidth: panel.scrollWidth,
            columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
            cards: Array.from(element.children).map(card => {
              const rect = measure(card), icon = measure(card.querySelector('svg')), title = measure(card.querySelector(':scope > span > span'));
              return { name: card.getAttribute('aria-label'), ...rect, clientWidth: card.clientWidth, scrollWidth: card.scrollWidth, iconLeft: icon.x - rect.x, iconTop: icon.y - rect.y, titleLeft: title.x - rect.x, titleTop: title.y - rect.y };
            }),
          };
        });
        const filename = (teacher ? 'teacher' : 'student') + (translated ? '-translated-' : '-base-') + (longCopy ? 'long-copy-' : '') + width + '.png';
        report.layouts.push({ teacher, translated, longCopy, screenshot: filename, ...layout });
        assert.ok(layout.documentWidth <= width && layout.panelScrollWidth <= layout.panelWidth, 'Horizontal page/panel overflow: ' + filename);
        for (const card of layout.cards) assert.ok(card.scrollWidth <= card.clientWidth, 'Card overflow: ' + card.name + ' / ' + filename);
        for (const metric of ['width', 'height', 'iconLeft', 'iconTop', 'titleLeft', 'titleTop']) {
          const values = layout.cards.map(card => card[metric]);
          assert.ok(Math.max(...values) - Math.min(...values) <= 1, 'Uneven ' + metric + ' in ' + filename + ': ' + JSON.stringify(values));
        }
        await panel.screenshot({ path: path.join(OUT, filename) });
      }
    }
    report.checks.push('All 20 teacher/student, translated/base and long-copy layouts at 320/390/768/1280 have equal card sizes, matching icon/title offsets and no horizontal overflow.');
    await page.evaluate(() => window.updateGameMenu({ teacher: true, translated: true, longCopy: false }));
    await page.locator('[data-glossary-activity-settings] [data-help-key="glossary_puzzle_lang"]').waitFor();
    await page.getByLabel('Words for games', { exact: true }).selectOption('filtered');
    await page.locator('[data-help-key="glossary_puzzle_lang"]').selectOption('French');
    assert.deepEqual(await page.evaluate(() => window.wordSearchCalls), []);
    await page.locator('[data-help-key="glossary_word_search"]').click();
    await page.waitForFunction(() => window.wordSearchCalls.length === 1);
    assert.deepEqual(await page.evaluate(() => window.wordSearchCalls[0]), { language: 'French', words: ['Leaf', 'Root', 'Seed', 'Stem'] });
    await page.locator('[data-help-key="glossary_puzzle_lang"]').selectOption('English');
    await page.waitForFunction(() => window.wordSearchCalls.length === 2);
    assert.deepEqual(await page.evaluate(() => window.wordSearchCalls[1]), { language: 'English', words: ['Leaf', 'Root', 'Seed', 'Stem'] });
    report.checks.push('Word-search language remains in settings, launching uses the selected language and filtered terms, and changing language regenerates an active word search.');
    assert.deepEqual(report.errors, []);
    fs.rmSync(path.join(OUT, 'failure.png'), { force: true });
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
