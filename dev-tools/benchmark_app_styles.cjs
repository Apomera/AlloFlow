#!/usr/bin/env node
'use strict';
// Local component benchmark, not full-application Core Web Vitals. Uses a new
// Chromium instance and a loopback server; never attaches to a shared browser.
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { buildAppStylesModule } = require('../_build_app_styles_module.js');
const { extractAppStyles } = require('./app_styles_extraction.cjs');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'scratch', 'performance-next-pass');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const median = numbers => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];
function instrument(source, memo) {
  const anchor = 'window.AlloModules.AppStyles = { AppStyles: React.memo(AppStyles) };';
  if (source.split(anchor).length !== 2) throw Error('AppStyles registration changed; update benchmark instrumentation.');
  return source.replace(anchor, 'function MeasuredAppStyles(props) { window.__styleRenders = (window.__styleRenders || 0) + 1; return AppStyles(props); }\nwindow.AlloModules.AppStyles = { AppStyles: ' + (memo ? 'React.memo(MeasuredAppStyles)' : 'MeasuredAppStyles') + ' };');
}
async function run() {
  const source = fs.readFileSync(path.join(ROOT, 'app_styles_source.jsx'), 'utf8');
  const experiment = extractAppStyles(instrument(source, true));
  const modules = { baseline: buildAppStylesModule(instrument(source, false)), memoized: buildAppStylesModule(instrument(source, true)), external: experiment.module };
  const assets = new Map(experiment.assets.map(asset => ['/' + asset.file, asset.content]));
  const react = fs.readFileSync(path.join(ROOT, 'desktop/web-app/node_modules/react/umd/react.production.min.js'));
  const reactDOM = fs.readFileSync(path.join(ROOT, 'desktop/web-app/node_modules/react-dom/umd/react-dom.profiling.min.js'));
  let cssRequests = 0;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/react.js' || url.pathname === '/react-dom.js') {
      res.setHeader('Content-Type', 'application/javascript'); res.end(url.pathname === '/react.js' ? react : reactDOM); return;
    }
    if (url.pathname === '/app_styles_module.js' && modules[url.searchParams.get('variant')]) {
      res.setHeader('Content-Type', 'application/javascript'); res.end(modules[url.searchParams.get('variant')]); return;
    }
    if (assets.has(url.pathname)) {
      cssRequests++; res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'public,max-age=31536000,immutable'); res.end(assets.get(url.pathname)); return;
    }
    if (url.pathname !== '/') { res.statusCode = 404; res.end('Not found'); return; }
    const variant = url.searchParams.get('variant') || 'baseline';
    if (!modules[variant]) { res.statusCode = 400; res.end('Unknown variant'); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>AppStyles component benchmark</title></head><body class="theme-light"><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/app_styles_module.js?variant=' + variant + '"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const report = { kind: 'isolated AppStyles component benchmark', sourceSha256: sha(source), measuredAt: new Date().toISOString(), iterationsPerSample: 100, samples: 7, variants: {}, limitations: ['Production profiling ReactDOM adds profiling overhead.', 'Local component measurements exclude the full AlloFlow tree, Canvas, real CDN latency, and other tools.', 'External CSS is experimental: boot readiness and missing-asset recovery must be addressed before rollout.'] };
  try {
    browser = await chromium.launch({ headless: true });
    report.browser = browser.version();
    // Rotate variant order each sample so sustained shared-machine load does not
    // systematically favor the variant that happens to run last.
    const pages = {}, errors = [];
    const mount = async page => page.evaluate(() => {
      const R = window.React, D = window.ReactDOM;
      window.__profileDurations = [];
      window.__styleProps = { disableAnimations: false, baseFontSize: 16, lineHeight: 1.5, letterSpacing: 0 };
      const Style = window.AlloModules.AppStyles.AppStyles;
      const root = D.createRoot(document.getElementById('root'));
      function App() {
        const [tick, setTick] = R.useState(0), [prefs, setPrefs] = R.useState(window.__styleProps);
        window.__bump = () => setTick(value => value + 1);
        window.__prefs = value => { window.__styleProps = { ...window.__styleProps, ...value }; setPrefs(window.__styleProps); };
        return R.createElement(R.Fragment, null,
          R.createElement(R.Profiler, { id: 'styles', onRender: (_id, _phase, duration) => window.__profileDurations.push(duration) }, R.createElement(Style, prefs)),
          R.createElement('main', { className: 'allo-docsuite', style: { padding: '24px', maxWidth: '650px', margin: 'auto', boxSizing: 'border-box', overflowWrap: 'anywhere' } },
            R.createElement('h1', { className: 'text-slate-900' }, 'Stylesheet performance check'),
            R.createElement('p', { id: 'text', className: 'text-slate-700' }, 'Typography, motion, and theme preferences remain responsive.'),
            R.createElement('button', { id: 'button', className: 'bg-indigo-600 text-white animate-pulse', style: { padding: '12px' } }, 'Example action'),
            R.createElement('div', { id: 'panel', className: 'bg-slate-100 text-slate-900 border-slate-200', style: { padding: '16px', marginTop: '12px' } }, 'Update ' + tick)));
      }
      D.flushSync(() => root.render(R.createElement(App)));
    });
    for (const variant of Object.keys(modules)) {
      const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
      const page = await context.newPage(); pages[variant] = page;
      page.on('pageerror', error => errors.push({ variant, message: error.message }));
      await page.goto(origin + '/?variant=' + variant); await mount(page);
      if (variant === 'external') await page.waitForFunction(() => [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => link.sheet && link.sheet.cssRules.length > 0));
      await page.evaluate(() => { for (let i = 0; i < 25; i++) ReactDOM.flushSync(() => window.__bump()); });
      report.variants[variant] = { updateSamplesMs: [], profilerSamplesMs: [], styleRenders: [] };
    }
    const variants = Object.keys(modules);
    for (let sample = 0; sample < report.samples; sample++) {
      for (let offset = 0; offset < variants.length; offset++) {
        const variant = variants[(sample + offset) % variants.length];
        const result = await pages[variant].evaluate(iterations => {
          window.__profileDurations = []; const before = window.__styleRenders;
          const start = performance.now();
          for (let i = 0; i < iterations; i++) ReactDOM.flushSync(() => window.__bump());
          return { ms: performance.now() - start, profilerMs: window.__profileDurations.reduce((a, b) => a + b, 0), renders: window.__styleRenders - before };
        }, report.iterationsPerSample);
        const entry = report.variants[variant]; entry.updateSamplesMs.push(result.ms); entry.profilerSamplesMs.push(result.profilerMs); entry.styleRenders.push(result.renders);
        assert.equal(result.renders, variant === 'baseline' ? report.iterationsPerSample : 0);
      }
    }
    const signatures = {};
    for (const variant of variants) {
      const page = pages[variant], entry = report.variants[variant];
      entry.medianUpdateBatchMs = median(entry.updateSamplesMs); entry.medianStyleProfilerMs = median(entry.profilerSamplesMs);
      signatures[variant] = {};
      for (const theme of ['light', 'dark', 'contrast']) {
        await page.evaluate(theme => { document.body.className = 'theme-' + theme; }, theme);
        signatures[variant][theme] = await page.evaluate(() => ['text', 'button', 'panel'].map(id => { const s = getComputedStyle(document.getElementById(id)); return [s.color, s.backgroundColor, s.borderColor]; }));
      }
      const before = await page.evaluate(() => window.__styleRenders);
      await page.evaluate(() => ReactDOM.flushSync(() => window.__prefs({ baseFontSize: 24, lineHeight: 2, letterSpacing: 0.12, disableAnimations: true })));
      // CSS typography transitions last 200ms; finish them before reading values.
      await page.waitForFunction(() => getComputedStyle(document.documentElement).fontSize === '24px');
      signatures[variant].preferences = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('text')); return { rootFont: getComputedStyle(document.documentElement).fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, animationName: getComputedStyle(document.getElementById('button')).animationName }; });
      assert.equal(await page.evaluate(() => window.__styleRenders), before + 1);
      assert.equal(signatures[variant].preferences.rootFont, '24px');
      assert.equal(signatures[variant].preferences.animationName, 'none');
      await page.emulateMedia({ media: 'print' });
      signatures[variant].print = await page.evaluate(() => ['text', 'button', 'panel'].map(id => { const s = getComputedStyle(document.getElementById(id)); return [s.color, s.backgroundColor]; }));
      await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
      await page.evaluate(() => ReactDOM.flushSync(() => window.__prefs({ disableAnimations: false })));
      signatures[variant].reducedMotion = await page.evaluate(() => getComputedStyle(document.getElementById('button')).animationDuration);
      await page.setViewportSize({ width: 390, height: 844 });
      entry.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(entry.mobileOverflow, false);
      fs.mkdirSync(OUTPUT, { recursive: true });
      await page.screenshot({ path: path.join(OUTPUT, 'styles-' + variant + '-mobile.png'), fullPage: true });
    }
    assert.deepEqual(signatures.memoized, signatures.baseline);
    assert.deepEqual(signatures.external, signatures.baseline);
    report.computedStyleParity = signatures;
    const beforeReload = cssRequests;
    await pages.external.reload(); await mount(pages.external);
    await pages.external.waitForFunction(() => [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => link.sheet && link.sheet.cssRules.length > 0));
    report.externalCssCache = { coldNetworkRequests: beforeReload, reloadNetworkRequests: cssRequests - beforeReload };
    assert.equal(report.externalCssCache.reloadNetworkRequests, 0);
    // Explicitly document the rollout constraint rather than silently blessing
    // the experimental link as a drop-in production replacement.
    const failurePage = await browser.newPage();
    await failurePage.route('**/*.css', route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Fixture: missing stylesheet' }));
    await failurePage.goto(origin + '/?variant=external'); await mount(failurePage);
    await failurePage.waitForLoadState('networkidle');
    report.missingCssProbe = await failurePage.evaluate(() => ({ moduleRegistered: !!window.AlloModules.AppStyles, stylesheetAvailable: [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.sheet && link.sheet.cssRules.length > 0) }));
    assert.equal(report.missingCssProbe.moduleRegistered, true); assert.equal(report.missingCssProbe.stylesheetAvailable, false);
    assert.deepEqual(errors, []); report.pageErrors = errors;
    report.memoizedMedianReductionPercent = 100 * (1 - report.variants.memoized.medianUpdateBatchMs / report.variants.baseline.medianUpdateBatchMs);
    fs.writeFileSync(path.join(OUTPUT, 'app-styles-benchmark.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ report: path.join(OUTPUT, 'app-styles-benchmark.json'), variants: report.variants, externalCssCache: report.externalCssCache, missingCssProbe: report.missingCssProbe }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  return report;
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
