/* Browser acceptance for glossary audio UX. Audio providers are local mocks. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/glossary-audio-ux-2026-10-13');
if (process.platform === 'win32') {
  const cache = path.join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache;
  const temp = path.join(ROOT, '.tmp/glossary-audio-ux-browser');
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
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glossary audio UX QA</title><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  const report = { surface: 'Built glossary module with production React, Lucide and Tailwind; local mocked audio providers only', buildBytes: assets['/view.js'].length, layouts: [], checks: [], errors: [] };
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
        const data = [
          { ...base.generatedContent.data[0], image: null, translations: { French: 'Feuille', Arabic: 'ورقة' } },
          { entryId: 'stem', term: 'Stem', def: 'Supports a plant.', translations: { French: 'Tige', Arabic: 'ساق النبات' } },
          { entryId: 'root', term: 'Root', def: 'Absorbs water.', translations: { French: 'Racine', Arabic: 'جذر' } },
        ];
        window.audioQa = { inspections: [], preparations: [], clips: [], toasts: [] };
        window.__alloInspectGlossaryAudio = request => { window.audioQa.inspections.push(request); return { status: 'missing' }; };
        window.__alloRegenerateGlossaryAudio = (request, options) => new Promise(resolve => {
          const call = { request, signal: options.signal, resolve }; window.audioQa.clips.push(call);
          options.signal.addEventListener('abort', () => resolve(null));
        });
        window.__alloPrepareGlossaryAudio = (config, progress, options) => new Promise(resolve => {
          const call = { config, progress, signal: options.signal, resolve }; window.audioQa.preparations.push(call);
          options.signal.addEventListener('abort', () => resolve({ cancelled: true }));
          progress({ done: 1, total: 3 });
        });
        function App() {
          const [search, setSearch] = React.useState('');
          return React.createElement(window.AlloModules.GlossaryView, window.glossaryMediaProps({
            t, generatedContent: { ...base.generatedContent, data },
            filteredGlossaryData: data.map((item, index) => ({ ...item, _originalIdx: index })).filter(item => item.term.toLowerCase().includes(search.toLowerCase())),
            selectedLanguages: ['French', 'Arabic'], displayLanguages: ['French', 'Arabic'],
            isRtlLang: language => language === 'Arabic', isEditingGlossary: true,
            glossarySearchTerm: search, setGlossarySearchTerm: setSearch,
            addToast: (message, type) => window.audioQa.toasts.push({ message, type }),
          }));
        }
        window.createRoot(document.getElementById('root')).render(React.createElement(App));
      });
      await page.locator('[data-glossary-audio-review-toggle]').waitFor();
    }
    async function checkLayout(width, state, capture) {
      const bounds = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        review: (() => { const el = document.getElementById('glossary-edit-audio-review'); return { width: el.clientWidth, scrollWidth: el.scrollWidth }; })(),
        select: (() => { const el = document.querySelector('select[aria-label="Audio to prepare"]'); if (!el) return null; const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width }; })(),
      }));
      assert.ok(bounds.documentWidth <= width, `${state} page overflows at ${width}px (${bounds.documentWidth})`);
      assert.ok(bounds.review.scrollWidth <= bounds.review.width + 1, `${state} review panel overflows at ${width}px`);
      if (bounds.select) assert.ok(bounds.select.left >= 0 && bounds.select.right <= width, `Audio scope selector overflows at ${width}px`);
      const filename = capture && width !== 390 ? state + '-' + width + '.png' : null;
      if (filename) {
        const region = state === 'preparing' || state === 'partial' ? page.locator('#glossary-teacher-tools') : page.locator('#glossary-edit-audio-review');
        await region.screenshot({ path: path.join(OUT, filename) });
      }
      report.layouts.push({ state, ...bounds, screenshot: filename });
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 1000 }); await mount();
      const toggle = page.locator('[data-glossary-audio-review-toggle]');
      const body = page.locator('#glossary-edit-audio-review-content');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await body.isVisible(), false);
      assert.equal(await body.locator('article').count(), 0);
      assert.equal(await page.evaluate(() => window.audioQa.inspections.length), 0);
      await checkLayout(width, 'collapsed', true);
      await toggle.focus(); await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      assert.equal(await body.locator('article').count(), 3);
      const status = body.locator('[data-glossary-audio-status]').first();
      assert.equal(await status.innerText(), 'Not prepared');
      assert.equal(await status.locator('svg').count(), 0);
      await page.locator('[data-help-key="glossary_search"] input').fill('Root');
      await page.waitForFunction(() => document.querySelectorAll('#glossary-edit-audio-review-content article').length === 1);
      assert.equal(await body.locator('h4').innerText(), 'Root');
      assert.match(await body.innerText(), /Showing 1 of 3 words/);
      await body.locator('summary').click();
      for (const language of ['French', 'Arabic']) {
        const group = body.getByRole('group', { name: new RegExp(language + '.*Root') });
        assert.equal(await group.count(), 1, `Translation group names its ${language} language`);
        for (const button of await group.getByRole('button').all()) {
          assert.match(await button.getAttribute('aria-label'), new RegExp(language));
          assert.equal(await button.getAttribute('title'), await button.getAttribute('aria-label'));
        }
      }
      await checkLayout(width, 'open', true);
      const generate = body.locator('[role="group"]').first().getByRole('button').nth(1);
      await generate.evaluate(el => { window.audioQaClipButton = el; el.focus(); }); await generate.click();
      await body.getByRole('button', { name: /^Cancel preparing/ }).waitFor();
      assert.equal(await page.evaluate(() => window.audioQaClipButton === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-busy')), 'true');
      await checkLayout(width, 'clip-preparing', false);
      await body.getByRole('button', { name: /^Cancel preparing/ }).click();
      assert.equal(await page.evaluate(() => window.audioQa.clips[0].signal.aborted), true);
      assert.equal(await page.evaluate(() => window.audioQaClipButton === document.activeElement), true);
      await generate.click();
      await body.getByRole('button', { name: /^Cancel preparing/ }).waitFor();
      await toggle.click();
      assert.equal(await body.isVisible(), false);
      const review = page.locator('#glossary-edit-audio-review');
      assert.match(await review.getByRole('status').innerText(), /Preparing.*audio for Root/);
      const cancelCollapsed = review.getByRole('button', { name: 'Cancel audio preparation', exact: true });
      assert.equal(await cancelCollapsed.isVisible(), true);
      await checkLayout(width, 'collapsed-preparing', true);
      await cancelCollapsed.click();
      assert.equal(await page.evaluate(() => window.audioQa.clips[1].signal.aborted), true);
      assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      assert.match(await review.getByRole('status').innerText(), /Audio preparation stopped/);
      await page.getByRole('button', { name: /More tools/, exact: false }).click();
      const select = page.getByRole('combobox', { name: 'Audio to prepare', exact: true });
      assert.deepEqual(await select.locator('option').allTextContents(), ['Terms + definitions', 'Terms only', 'All fields']);
      assert.match(await page.locator('#glossary-audio-prep-help').innerText(), /All fields includes translations/);
      await select.selectOption('all');
      const prepare = page.locator('[data-help-key="glossary_prepare_audio"]');
      await prepare.evaluate(el => { window.audioQaPrepareButton = el; el.focus(); }); await prepare.click();
      await page.getByRole('button', { name: 'Stop preparing audio', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.audioQaPrepareButton === document.activeElement), true);
      assert.equal(await select.isDisabled(), true);
      assert.deepEqual(await page.evaluate(() => window.audioQa.preparations[0].config), { includeTerms: true, includeDefinitions: true, languages: ['French', 'Arabic'] });
      await checkLayout(width, 'preparing', true);
      await prepare.click();
      assert.equal(await page.evaluate(() => window.audioQa.preparations[0].signal.aborted), true);
      assert.equal(await page.evaluate(() => window.audioQaPrepareButton === document.activeElement), true);
      assert.equal(await select.isEnabled(), true);
      assert.match(await page.locator('#glossary-audio-prep-status').innerText(), /Audio preparation stopped/);
      await prepare.click();
      await page.evaluate(() => window.audioQa.preparations[1].resolve({ ok: false, ready: 2, total: 3, failed: 1 }));
      await page.getByText('2 of 3 audio clips ready. Some clips could not be prepared. Try again to finish.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.audioQa.toasts.at(-1).type), 'info');
      assert.equal(await select.isEnabled(), true);
      assert.equal(await prepare.isEnabled(), true);
      await checkLayout(width, 'partial', true);
      report.checks.push(`${width}px: collapsed lazy inspection, keyboard disclosure, filtered Root, neutral missing status, distinct translation labels, same-button clip and bulk cancel with focus retention, collapsed active-clip status and cancel returning focus to disclosure, partial result, concise responsive scope options and translation guidance.`);
    }
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
