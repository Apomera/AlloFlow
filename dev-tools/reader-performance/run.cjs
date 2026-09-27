#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module'), { execFileSync } = require('node:child_process');
const { cases, makeFixture } = require('./fixtures.cjs');
const root = path.resolve(__dirname, '../..'), args = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
const depsRoot = path.resolve(option('--deps', root)), req = createRequire(path.join(depsRoot, 'package.json'));
const esbuild = req('esbuild');
const instrument = args.includes('--instrument'), smoke = args.includes('--smoke'), validate = args.includes('--validate');
const retention = args.includes('--retention');
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const environment = {platform:process.platform,arch:process.arch,node:process.version,os:require('os').release(),cpu:require('os').cpus()[0].model,logicalCPUs:require('os').cpus().length};
const harnessHashes = Object.fromEntries(['fixtures.cjs','harness.jsx','instrumentation.js','run.cjs'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')]));
const sourceFiles = ['view_simplified_source.jsx', 'immersive_reader_source.jsx', 'instructional_context_module.js',
  'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js'];
const fromGit = args.includes('--baseline-source');
const readSource = file => fromGit ? execFileSync('git', ['show', 'HEAD:' + file], {cwd:root, maxBuffer:16*1024*1024}) : fs.readFileSync(path.join(root,file));
const embeddedReaderHelpers = ['reader_place_store.js', 'reader_support_drafts.js'];
if (!fromGit) for (const file of embeddedReaderHelpers) if (fs.existsSync(path.join(root, file))) sourceFiles.push(file);
const hashes = () => Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(readSource(file)).digest('hex')]));
const initialHashes = hashes(), baseline = head();
function checkFixtures() {
  for (const spec of cases) {
    const fixture = makeFixture(spec);
    assert.deepEqual(makeFixture(spec), fixture, 'Fixtures must be deterministic');
    assert.equal(fixture.annotations.length, spec.supports || 0);
    for (const entry of fixture.annotations) assert.equal(fixture.data.slice(entry.start, entry.end), entry.quote);
    assert.equal(new Set(fixture.annotations.map(entry => entry.start)).size, fixture.annotations.length);
  }
}
checkFixtures();
function bundle(options) {
  return esbuild.buildSync({ bundle: true, write: false, platform: 'browser', format: 'iife',
    absWorkingDir: path.join(depsRoot, 'desktop/web-app'), nodePaths: [path.join(depsRoot, 'desktop/web-app/node_modules'), path.join(depsRoot, 'node_modules')],
    define: { 'process.env.NODE_ENV': '"production"' }, ...options }).outputFiles[0].text;
}
console.log('Preparing browser fixture runtime');
const runtime = bundle({ stdin: { resolveDir: path.join(depsRoot, 'desktop/web-app'), contents:
  "import React from 'react'; import {createRoot} from '" + (instrument ? 'react-dom/profiling' : 'react-dom/client') + "';  window.React=React;window.createRoot=createRoot;window.AlloIcons=new Proxy({}, {get:()=>()=>null});window.AlloModules={};window.AlloLanguageContext=React.createContext({t:k=>k});" } });
function sourceModule(file, exports) {
  let raw = readSource(file).toString('utf8');
  if (file === 'view_simplified_source.jsx' && !fromGit)
    raw = embeddedReaderHelpers.filter(helper => fs.existsSync(path.join(root, helper))).map(helper => fs.readFileSync(path.join(root, helper), 'utf8')).join('\n') + '\n' + raw;
  if (file === 'view_simplified_source.jsx' && retention) {
    const marker = 'return { key: storageKey, load, save';
    assert.ok(raw.includes(marker), 'Reading-place retention probe needs review');
    raw = raw.replace(marker, 'return { inspectRetention: () => ({ entries: entries.size, keyChars: [...entries.keys()].reduce((n, key) => n + key.length, 0), authored: [...entries.values()].filter(entry => hasWork(entry.draft)).length, recovery: [...entries.values()].filter(needsRecovery).length }), key: storageKey, load, save');
    raw += '\nwindow.readerPlaceRetention = () => readingPlaceStore.inspectRetention();';
  }
  const transformed = esbuild.transformSync(raw, { loader: 'jsx', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', target: 'es2020' }).code;
  return '(function(){var React=window.React,Fragment=React.Fragment;\n' + transformed + '\nObject.assign(window.AlloModules,{' + exports.join(',') + '});})();';
}
console.log('Preparing reader source modules');
const scripts = [
  runtime,
  'window.fixtureStrings=' + fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8') + ';',
  ...sourceFiles.filter(file => file.endsWith('_module.js')).map(file => readSource(file).toString('utf8')),
  sourceModule('immersive_reader_source.jsx', ['FocusReaderOverlay', 'SpeedReaderOverlay:FocusReaderOverlay', 'BionicChunkReader:FocusReaderOverlay', 'PerspectiveCrawlOverlay', 'KaraokeReaderOverlay', 'ImmersiveToolbar', 'ImmersiveWord']),
  sourceModule('view_simplified_source.jsx', ['SimplifiedView']),
  bundle({ entryPoints: [path.join(__dirname, 'harness.jsx')] })
];
console.log('Fixture modules ready');
if (validate) {
  console.log(JSON.stringify({ status: 'fixture-validation-only', cases: cases.length, baseline, sourceHashes: initialHashes,
    note: 'Compiled in memory. No browser, baseline measurements, generated-module edits, or application changes.' }, null, 2));
  process.exit(0);
}
if (!smoke && option('--baseline-ready') !== baseline) {
  throw new Error('Measurements require --baseline-ready ' + baseline + ' to explicitly identify the inspected baseline. Use --validate or --smoke for fixture verification only.');
}
const cssDir = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDir).filter(name => name.endsWith('.css')).sort()[0];
if (!cssFile) throw new Error('No built application CSS available; do not measure an unstyled reader.');
const css = fs.readFileSync(path.join(cssDir, cssFile));
const wav = Buffer.alloc(44 + 16000 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const instrumentation = fs.readFileSync(path.join(__dirname, 'instrumentation.js'), 'utf8');
const selected = option('--case') ? cases.filter(spec => option('--case').split(',').includes(spec.name)) : smoke
  ? [{ name: 'smoke', sentences: 30, supports: 6, teacher: true }] : cases;
assert.ok(selected.length, 'Unknown fixture case');
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/style.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  if (url.pathname === '/tone.wav') { response.setHeader('Content-Type', 'audio/wav'); response.end(wav); return; }
  if (/^\/script-\d+\.js$/.test(url.pathname)) {
    response.setHeader('Content-Type', 'text/javascript'); response.end(scripts[Number(url.pathname.match(/\d+/)[0])] || ''); return;
  }
  if (url.pathname !== '/') { response.statusCode = 404; response.end(); return; }
  const spec = selected.find(item => item.name === url.searchParams.get('case'));
  if (!spec) { response.statusCode = 400; response.end('Unknown case'); return; }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css">' +
    '<style>html,body{margin:0;font-family:Arial,sans-serif;font-size:' + (spec.fontSize || 16) + 'px}#root{max-width:1280px;margin:auto;padding:16px}button,input,textarea,select{font:inherit}</style></head>' +
    '<body class="theme-light"><main id="root" class="allo-docsuite"></main><script>window.fixtureSpec=' + JSON.stringify(spec) + ';' + instrumentation +
    '</script>' + scripts.map((_, i) => '<script src="/script-' + i + '.js"></script>').join('') + '</body></html>');
});
const nextPaint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function patch(page, update) { await page.evaluate(update => window.readerFixture.patch(update), update); await nextPaint(page); }
async function memory(cdp, page) {
  await cdp.send('HeapProfiler.collectGarbage');
  return { dom: await cdp.send('Memory.getDOMCounters'), heap: await cdp.send('Runtime.getHeapUsage'),
    ...(retention ? { readingPlaces: await page.evaluate(() => window.readerPlaceRetention()) } : {}) };
}
function distribution(samples) {
  const sorted = [...samples].sort((a, b) => a - b), quantile = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { count: sorted.length, p50: quantile(.5), p95: quantile(.95), p99: quantile(.99), samples };
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const { chromium } = req('playwright');
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ headless: true, channel: option('--browser', 'msedge') });
    for (const spec of selected) {
      const context = await browser.newContext({ viewport: { width: spec.width || 1280, height: 900 } });
      try {
        const page = await context.newPage(), errors = [], external = [];
        page.on('pageerror', error => { errors.push(error.message); console.error('Fixture page error: ' + error.message); });
        await page.route('**/*', route => {
          const url = route.request().url();
          if (url.startsWith(base + '/') || /^(blob:|data:)/.test(url)) return route.continue();
          external.push(url); return route.abort();
        });
        await page.addInitScript(() => localStorage.setItem('allo_save_karaoke_audio', '0'));
        await page.goto(base + '/?case=' + spec.name + '&instrument=' + (instrument ? 1 : 0));
        await page.waitForFunction(() => window.readerFixture?.ready, { timeout: 30000 });
        await nextPaint(page);
        const inventory = await page.evaluate(() => window.readerFixture.inventory);
        assert.equal(inventory.acceptedSupports, spec.supports || 0);
        if (smoke) {
          await page.locator('[data-student-preview-open]').click();
          await page.locator('[data-student-preview]').waitFor();
          await page.locator('[data-student-preview-close]').click();
          assert.equal(await page.locator('[data-student-preview]').count(), 0);
          await patch(page, { immersive: true, sweep: 35 });
          assert.ok(await page.locator('[data-immersive-passage] [data-sentence-idx="0"]').count());
          await patch(page, { immersive: false, compare: true });
          assert.equal(await page.locator('[data-compare-version]').count(), 2);
          await page.evaluate(() => window.readerFixture.unmount());
          assert.deepEqual(errors, []); assert.deepEqual(external, []);
          results.push({ name: spec.name, status: 'smoke-only', inventory });
          continue;
        }
        const cdp = await context.newCDPSession(page);
        const retained = [{ phase: 'mounted', ...await memory(cdp, page) }];
        await page.evaluate(() => window.readerMetrics.reset());
        // Samples measure update-to-two-paints, including frame pacing. They are
        // never reported as render time. Instrumented Profiler actualDuration is separate.
        const latencies = [];
        for (let i = 0; i < 25; i++) {
          const elapsed = await page.evaluate(async i => {
            const start = performance.now();
            window.readerFixture.patch({ sweep: (i % 10) * 10, sentence: 0 });
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return performance.now() - start;
          }, i);
          if (i >= 5) latencies.push(elapsed);
        }
        const sweepMetrics = await page.evaluate(() => window.readerMetrics.snapshot());
        const cycles = spec.cycles || (spec.lifecycle === 'navigation' ? 100 : spec.lifecycle ? 50 : 0);
        for (let i = 0; i < cycles; i++) {
          if (spec.lifecycle === 'preview') {
            await page.evaluate(() => { const button = document.querySelector('[data-student-preview-open]'); button.focus(); button.click(); });
            await nextPaint(page);
            await page.evaluate(() => { const button = document.querySelector('[data-student-preview-close]'); button.focus(); button.click(); });
            await nextPaint(page);
          } else if (spec.lifecycle === 'overlay') {
            await patch(page, { immersive: false }); await patch(page, { immersive: true });
          } else {
            const revision = spec.unique ? i + 1 : i % 3;
            await patch(page, { resource: spec.unique ? 'fixture-resource-' + i : i % 2 ? 'fixture-a' : 'fixture-b',
              learner: 'fixture-learner-' + (spec.unique ? i : i % 2), revision, supportVersion: spec.unique ? i + 1 : i % 4 });
            if (spec.unique) {
              const visible = await page.evaluate(() => ({
                body: document.querySelector('[data-simplified-reading-body]')?.textContent.replace(/\s+/g, ''),
                help: document.querySelector('[data-adapted-word-help]')?.textContent.replace(/\s+/g, ''),
                resource: window.readerFixture.item.id, learner: window.readerFixture.state.learner
              }));
              assert.ok(visible.body?.includes('Thisreadingchanged' + revision + 'times.'), 'Stale reading after unique navigation');
              assert.ok(visible.help?.includes('Version' + (i + 1)), 'Stale support after unique navigation');
              assert.equal(visible.resource, 'fixture-resource-' + i); assert.equal(visible.learner, 'fixture-learner-' + i);
            }
          }
          if ((i + 1) % 10 === 0) retained.push({ phase: 'cycle-' + (i + 1), ...await memory(cdp, page) });
        }
        if (spec.audio) {
          await patch(page, { karaoke: true });
          await page.evaluate(() => document.querySelector('[role="dialog"][aria-labelledby="karaoke-reader-dialog-title"] button[aria-label="Play"]').focus());
          await page.keyboard.press('Enter'); // trusted activation without retaining a driver element handle
          await page.waitForFunction(() => window.readerMetrics.snapshot().audioStarts > 0);
          await page.waitForTimeout(300);
          await patch(page, { karaoke: false });
          assert.equal(await page.evaluate(() => window.readerMetrics.snapshot().playingAudio), 0);
        }
        if (spec.storage) {
          await page.evaluate(() => { document.querySelector('[data-reading-paragraph="1"]')?.scrollIntoView(); });
          await page.waitForTimeout(1000);
          await page.evaluate(() => document.dispatchEvent(new Event('scroll')));
          await page.waitForTimeout(1000);
        }
        const activityMetrics = await page.evaluate(() => window.readerMetrics.snapshot());
        await page.evaluate(() => window.readerFixture.unmount());
        await page.mouse.click(1, 1); // leave focus and pointer on a neutral part of the disposable fixture
        await page.waitForTimeout(4500); // current focus/advance timers must have drained
        retained.push({ phase: 'unmounted', ...await memory(cdp, page) });
        const afterClose = await page.evaluate(() => ({ ...window.readerMetrics.snapshot(),
          highlightRanges: [...(CSS.highlights?.values() || [])].reduce((sum, mark) => sum + mark.size, 0) }));
        assert.deepEqual(errors, []); assert.deepEqual(external, []);
        results.push({ name: spec.name, inventory, updateToPaintMs: distribution(latencies),
          sweepMetrics, activityMetrics, retained, afterClose, lifecycle: { cycles, uniqueResources: spec.unique ? cycles : null, freshnessChecks: spec.unique ? cycles : 0 } });
        console.log('Measured ' + spec.name);
      } finally { await context.close(); }
    }
    assert.equal(head(), baseline, 'HEAD changed during the run');
    assert.deepEqual(hashes(), initialHashes, 'Measured source changed during the run');
    const report = { status: smoke ? 'fixture-smoke-only' : 'candidate-baseline', baseline,
      environment, harnessHashes, browser: browser.version(), sourceMode: fromGit ? 'git-HEAD' : 'working-tree', instrumented: instrument, retentionProbe: retention, sourceHashes: initialHashes,
      css: { file: cssFile, sha256: crypto.createHash('sha256').update(css).digest('hex') },
      limitations: ['Not the integrated host or deployed release.', 'Synthetic sweep updates, local audio route, and disposable browser storage; icon components are stubbed.',
        'Timing budgets are unset until repeated baseline runs establish noise and device constraints.',
        'DOM counters identify retention trends; detached-node retaining paths require a heap snapshot follow-up.'],
      results };
    const output = option('--output');
    if (output) { const destination = path.resolve(output); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n'); }
    console.log(JSON.stringify(output ? {status:report.status, baseline, cases:results.length, output:path.resolve(output)} : report, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
