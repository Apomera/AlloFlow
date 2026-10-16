/* Browser acceptance for glossary editing. Generation and narration use local mocks. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/glossary-edit-controls-2026-10-13');
if (process.platform === 'win32') {
  const cache = path.join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache;
  const temp = path.join(ROOT, '.tmp/glossary-edit-controls-browser');
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
    if (assets[route]) { response.setHeader('Content-Type', route.endsWith('.css') ? 'text/css' : 'application/javascript'); response.end(assets[route]); return; }
    if (route !== '/') { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glossary editing QA</title><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  const report = { surface: 'Built glossary module with production React, Lucide and Tailwind; local mocked image/word generation and narration', buildBytes: assets['/view.js'].length, layouts: [], checks: [], errors: [] };
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    async function mount() {
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.evaluate(() => {
        const t = key => { const value = key.split('.').reduce((obj, part) => obj && obj[part], window.translations); return typeof value === 'string' ? value : key; };
        const base = window.glossaryMediaProps();
        const initialData = ['Leaf', 'Root', 'Seed'].map((term, index) => ({ ...base.generatedContent.data[0], entryId: term.toLowerCase(), term, def: 'A plant part used for learning.', translations: { French: 'Feuille: Une partie de la plante: elle capte la lumière.' } }));
        window.editQa = { t, refinements: [], adds: [], suggestions: [], speeches: [] };
        function App() {
          const [state, setState] = React.useState({ data: initialData, inputs: {}, generating: {}, newTerm: '', isAddingTerm: false,
            health: { overallScore: 4, summary: 'Consider adding one more plant word.', coverageGaps: [{ term: 'Photosynthesis', reason: 'Helps explain how leaves make food using sunlight.' }] },
            showHealth: true, isInteractiveFlashcards: false, flashcardIndex: 0, isFlashcardFlipped: false, flashcardMode: 'standard', standardDeckLang: 'French', flashcardLang: 'French', flashcardScore: 0, flashcardFeedback: null, quizSelectedOption: null,
          });
          window.editQa.update = patch => setState(old => ({ ...old, ...patch }));
          const props = window.glossaryMediaProps({ ...state, t, generatedContent: { ...base.generatedContent, data: state.data },
            filteredGlossaryData: state.data.map((item, index) => ({ ...item, _originalIdx: index })),
            isEditingGlossary: true, glossaryImageSize: 160, glossaryRefinementInputs: state.inputs, isGeneratingTermImage: state.generating,
            newGlossaryTerm: state.newTerm, glossaryHealthCheck: state.health, showHealthCheckPanel: state.showHealth,
            setGlossaryRefinementInputs: value => setState(old => ({ ...old, inputs: typeof value === 'function' ? value(old.inputs) : value })),
            setNewGlossaryTerm: value => setState(old => ({ ...old, newTerm: value })),
            setGlossaryHealthCheck: value => setState(old => ({ ...old, health: typeof value === 'function' ? value(old.health) : value })),
            setShowHealthCheckPanel: value => setState(old => ({ ...old, showHealth: value })),
            handleToggleShowHealthCheckPanel: () => setState(old => ({ ...old, showHealth: !old.showHealth })),
            handleGlossaryChange: (index, field, value, language) => setState(old => ({ ...old, data: old.data.map((item, i) => i !== index ? item : field === 'translations' ? { ...item, translations: { ...item.translations, [language]: value } } : { ...item, [field]: value }) })),
            handleRefineGlossaryImage: index => { window.editQa.refinements.push(index); setState(old => ({ ...old, generating: { ...old.generating, ['entry:' + old.data[index].entryId]: true } })); },
            handleAddGlossaryTerm: () => { window.editQa.adds.push(state.newTerm); setState(old => ({ ...old, isAddingTerm: true })); },
            handleQuickAddGlossary: term => new Promise((resolve, reject) => window.editQa.suggestions.push({ term, resolve, reject })),
            fetchReplacementSuggestion: async () => null,
            handleSpeak: (text, contentId) => window.editQa.speeches.push({ text, contentId }),
            launchInteractiveFlashcards: mode => setState(old => ({ ...old, isInteractiveFlashcards: true, flashcardMode: mode, flashcardIndex: 0, isFlashcardFlipped: false })),
            closeInteractiveFlashcards: () => setState(old => ({ ...old, isInteractiveFlashcards: false })),
          });
          for (const name of ['FlashcardIndex', 'IsFlashcardFlipped', 'FlashcardScore', 'FlashcardFeedback', 'QuizSelectedOption', 'StandardDeckLang', 'FlashcardLang']) {
            const key = name[0].toLowerCase() + name.slice(1); props['set' + name] = value => setState(old => ({ ...old, [key]: typeof value === 'function' ? value(old[key]) : value }));
          }
          return React.createElement(window.AlloModules.GlossaryView, props);
        }
        window.createRoot(document.getElementById('root')).render(React.createElement(App));
      });
      await page.getByRole('textbox', { name: 'Image edit instructions for Leaf', exact: true }).waitFor();
    }
    async function checkLayout(width, state) {
      const bounds = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
      assert.ok(bounds.documentWidth <= width, `${state} page overflows at ${width}px (${bounds.documentWidth})`);
      report.layouts.push({ state, ...bounds });
    }
    async function touchTarget(locator, name, width) {
      const box = await locator.boundingBox(); assert.ok(box && box.height >= 44 && box.width >= 44, `${name} should be at least 44px at ${width}px: ${JSON.stringify(box)}`);
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 1000 }); await mount();
      const refine = page.getByRole('textbox', { name: 'Image edit instructions for Leaf', exact: true });
      const apply = page.getByRole('button', { name: 'Apply image edit for Leaf', exact: true });
      assert.equal(await page.getByRole('textbox', { name: 'Edit definition for Leaf', exact: true }).count(), 1);
      assert.equal(await page.getByRole('textbox', { name: 'Edit French translation for Leaf', exact: true }).count(), 1);
      await touchTarget(refine, 'Image refinement input', width); await touchTarget(apply, 'Apply image edit', width);
      await refine.fill('   '); await refine.press('Enter'); assert.equal(await page.evaluate(() => window.editQa.refinements.length), 0);
      await refine.fill('Make the leaf brighter');
      await refine.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true })));
      assert.equal(await page.evaluate(() => window.editQa.refinements.length), 0);
      await refine.press('Enter'); await page.waitForFunction(() => window.editQa.refinements.length === 1);
      assert.equal(await apply.getAttribute('aria-busy'), 'true'); assert.equal(await apply.isDisabled(), true);
      await refine.press('Enter'); assert.equal(await page.evaluate(() => window.editQa.refinements.length), 1);
      await page.evaluate(() => window.editQa.update({ generating: {} })); await page.waitForFunction(() => !document.querySelector('button[aria-label="Apply image edit for Leaf"]').disabled);
      await checkLayout(width, 'editing');
      if (width !== 390) await page.locator('[data-glossary-entry-key="entry:leaf"]').screenshot({ path: path.join(OUT, 'editing-row-' + width + '.png') });
      const addBox = page.locator('[data-help-key="glossary_add_term"]');
      const addInput = addBox.locator('input').last(), addButton = addBox.getByRole('button');
      await touchTarget(addInput, 'New word input', width); await touchTarget(addButton, 'Add word', width);
      await addInput.fill('   '); await addInput.press('Enter'); assert.equal(await page.evaluate(() => window.editQa.adds.length), 0);
      await addInput.fill('Flower'); await addInput.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true })));
      assert.equal(await page.evaluate(() => window.editQa.adds.length), 0);
      await addInput.press('Enter'); await page.waitForFunction(() => window.editQa.adds.length === 1);
      assert.equal(await addButton.getAttribute('aria-busy'), 'true'); assert.equal(await addButton.isDisabled(), true);
      assert.match(await page.locator('#glossary-add-term-status').innerText(), /Preparing/);
      await checkLayout(width, 'adding-word');
      if (width !== 390) await addBox.screenshot({ path: path.join(OUT, 'adding-word-' + width + '.png') });
      await page.evaluate(() => window.editQa.update({ isAddingTerm: false }));
      const suggestion = page.getByRole('button', { name: 'Add Photosynthesis', exact: true });
      await touchTarget(suggestion, 'Suggested word Add', width); await suggestion.click();
      const adding = page.getByRole('button', { name: 'Adding Photosynthesis', exact: true });
      await adding.waitFor(); assert.equal(await adding.getAttribute('aria-busy'), 'true'); assert.equal(await adding.isDisabled(), true);
      assert.match(await adding.innerText(), /Adding/); assert.equal(await page.evaluate(() => window.editQa.suggestions.length), 1);
      await checkLayout(width, 'adding-suggestion');
      if (width !== 390) await page.locator('[data-help-key="glossary_health_check"]').screenshot({ path: path.join(OUT, 'suggestion-pending-' + width + '.png') });
      await page.evaluate(() => window.editQa.suggestions[0].reject(new Error('Fixture generation failure')));
      await suggestion.waitFor(); assert.equal(await suggestion.isEnabled(), true);
      assert.match(await page.locator('#glossary-suggestion-status').innerText(), /could not|try again/i);
      await suggestion.click(); await adding.waitFor(); assert.equal(await page.evaluate(() => window.editQa.suggestions.length), 2);
      await page.evaluate(() => window.editQa.suggestions[1].resolve({ success: true }));
      await page.waitForFunction(() => !document.querySelector('button[aria-label="Adding Photosynthesis"]'));
      await checkLayout(width, 'suggestion-retried');
      report.checks.push(`${width}px: contextual edit names, 44px image/add targets, blank and IME-safe Enter, pending duplicate guard, Add busy announcement, suggestion pending and failure retry, no page overflow.`);
    }
    await page.setViewportSize({ width: 1280, height: 1000 }); await mount();
    await page.locator('[data-help-key="glossary_standard_flashcards"]').click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    await page.evaluate(() => window.editQa.update({ isFlashcardFlipped: true }));
    const readTranslation = dialog.locator('[data-flashcard-face="back"] button').filter({ hasText: 'Une partie de la plante: elle capte la lumière.' });
    assert.equal(await readTranslation.count(), 1); await readTranslation.click();
    assert.deepEqual(await page.evaluate(() => window.editQa.speeches.at(-1)), { text: 'Une partie de la plante: elle capte la lumière.', contentId: 'fc-back-def-French' });
    const knownLabel = await page.evaluate(() => window.editQa.t('common.correct'));
    await dialog.getByRole('button', { name: knownLabel, exact: true }).click();
    await page.waitForFunction(() => document.getElementById('flashcard-live-status').textContent.includes('2 of 3: Root'));
    await dialog.locator('[data-help-key="flashcard_next"]').click();
    await page.waitForFunction(() => document.getElementById('flashcard-live-status').textContent.includes('3 of 3: Seed'));
    await dialog.locator('[data-help-key="flashcard_next"]').click();
    await dialog.getByRole('button', { name: 'Review cards needing practice (2)', exact: true }).click();
    assert.match(await dialog.locator('#flashcard-live-status').innerText(), /1 of 2: Root/);
    await dialog.locator('[data-help-key="flashcard_next"]').click();
    await page.waitForFunction(() => document.getElementById('flashcard-live-status').textContent.includes('2 of 2: Seed'));
    report.checks.push('Desktop flashcards: full multi-colon translated definition displayed and narrated; retry live status matches 1 of 2 then 2 of 2.');
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
