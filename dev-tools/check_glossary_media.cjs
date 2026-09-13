// Local browser verification: actual React views, production CSS, synthetic media.
const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');
const esbuild = require('esbuild');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/glossary-media-2026-09-12');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const config = { ...req('./tailwind.config.js'), content: ['games_source.jsx', 'view_glossary_source.jsx', 'view_concept_sort_source.jsx'].map(file => path.join(ROOT, file)) };
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const runtime = esbuild.buildSync({ stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;", resolveDir: path.join(ROOT, 'desktop/web-app') }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  const translations = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
  const assets = { '/runtime.js': runtime, '/styles.css': css };
  for (const file of ['games', 'app_styles', 'view_glossary', 'view_concept_sort', 'read_aloud_audio_service']) assets['/' + file + '.js'] = fs.readFileSync(path.join(ROOT, file + '_module.js'), 'utf8');
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', request.url.endsWith('.css') ? 'text/css' : assets[request.url] ? 'text/javascript' : 'text/html');
    response.end(assets[request.url] || '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glossary media review</title><link rel="stylesheet" href="/styles.css"></head><body class="theme-light"><main id="view" class="allo-docsuite" style="padding:16px;max-width:1200px;margin:auto"></main><script src="/runtime.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [], errors = [];
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(({ translations, fixture }) => {
      window.glossaryMediaProps = new Function('return ' + fixture)();
      window.t = (key, vars = {}) => { const text = key.split('.').reduce((o, k) => o && o[k], translations); return typeof text === 'string' ? text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : key; };
      window.AlloLanguageContext = React.createContext({ t }); window.AlloModules = {};
      window.fisherYatesShuffle = arr => arr.slice(); window.getGlobalAudioContext = () => null;
    }, { translations, fixture: glossaryMediaProps.toString() });
    for (const file of ['app_styles', 'games', 'view_glossary', 'view_concept_sort', 'read_aloud_audio_service']) await page.addScriptTag({ url: '/' + file + '.js' });
    await page.evaluate(() => {
      window.render = (name, edit = false, scale) => {
        if (window.root) root.unmount(); window.root = createRoot(document.getElementById('view'));
        const noop = () => {};
        function Harness() {
          const [size, setSize] = React.useState(scale || (name === 'GlossaryView' ? 192 : 2));
          const glossary = glossaryMediaProps({ t, isEditingGlossary: edit, glossaryImageSize: size, setGlossaryImageSize: setSize });
          const data = { categories: [{ id: 'plants', label: 'Plants' }, { id: 'animals', label: 'Animals' }], items: [
            { id: 'leaf', categoryId: 'plants', content: 'Leaf', image: glossary.generatedContent.data[0].image },
            { id: 'root', categoryId: 'plants', content: 'Roots absorb water from soil', image: glossary.generatedContent.data[0].image }
          ] };
          let props = name === 'GlossaryView' ? glossary : name === 'ConceptSortGame' ? { data, imageScale: size, onImageScaleChange: setSize, onClose: noop, playSound: noop } : {
            t, isTeacherMode: true, generatedContent: { id: 'sort', type: 'concept-sort', data },
            conceptSortImageScale: size, setConceptSortImageScale: setSize, setConceptSortAutoRemoveWords: noop,
            setCsEdit: noop, setCsAddingCatId: noop, setCsAddingText: noop, handleSetIsConceptSortGameToTrue: noop,
            csMoveItem: noop, csRegenerateItem: noop, csRegenerateItemImage: noop, csUploadItemImage: noop, csClearItemImage: noop, csDeleteItem: noop
          };
          return React.createElement(React.Fragment, null, React.createElement(AlloModules.AppStyles.AppStyles), React.createElement(AlloModules[name], props));
        }
        root.render(React.createElement(Harness));
      };
    });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name, edit] of [['GlossaryView', false], ['GlossaryView', true], ['ConceptSortView', false], ['ConceptSortGame', false]]) {
        await page.evaluate(({ name, edit }) => render(name, edit), { name, edit });
        await page.locator('img').first().waitFor();
        const metrics = await page.evaluate(() => ({
          width: innerWidth, pageWidth: document.documentElement.scrollWidth,
          images: [...document.querySelectorAll('img')].map(el => ({ width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) })),
          clippedControls: [...document.querySelectorAll('[data-help-key="concept_sort_item"] button,[data-help-key="concept_sort_item"] select')].filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < 0; }).map(el => el.getAttribute('aria-label')),
        }));
        const label = name + (edit ? '-edit' : '') + '-' + width;
        results.push({ label, ...metrics });
        await page.screenshot({ path: path.join(OUT, label + '.png'), fullPage: true });
        if (metrics.pageWidth > width + 2 || metrics.clippedControls.length) errors.push(label + ': content overflows');
      }
    }
    fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify({ results, errors }, null, 2));
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Passed 12 glossary and concept-sort view/viewport checks. Screenshots: ' + OUT);
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
