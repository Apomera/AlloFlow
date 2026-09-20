const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const resultPath = path.join(__dirname, 'navigation-browser-results.json');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const checks = [], runtimeErrors = [], blockedRequests = [];
const limitations = [
  'Canonical production reader JSX compiled for this run and source contract inside an isolated stateful fixture, not the complete application shell.',
  'AI, actual speech synthesis, persistence, and host save handlers are not exercised; callbacks record local events.',
  'Offscreen version controls use DOM click for bookmark checks, avoiding Playwright auto-scroll before the reader captures position; keyboard checks use real browser input.',
  'Browser coverage is installed Microsoft Edge Chromium; no Safari or Firefox run.'
];
async function buildFixture() {
  fs.writeFileSync(path.join(__dirname, 'navigation-reader-under-test.jsx'), fs.readFileSync(path.join(root, 'view_simplified_source.jsx'), 'utf8') + '\nwindow.AlloModules = window.AlloModules || {}; window.AlloModules.SimplifiedView = SimplifiedView;\n');
  await require('esbuild').build({
    entryPoints: [path.join(__dirname, 'navigation-fixture.jsx')],
    bundle: true, outfile: path.join(__dirname, 'navigation-fixture.js'),
    platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' }
  });
}
function serverForFixture() {
  const cssDir = path.join(root, 'desktop/web-app/build/static/css');
  const css = fs.readdirSync(cssDir).find(name => name.endsWith('.css'));
  if (!css) throw new Error('Built application CSS is required for responsive QA.');
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reading navigation fixture</title><link rel="stylesheet" href="/app.css"><style>' +
    '*{box-sizing:border-box}html,body,#root{margin:0;width:100%;height:100%;font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a}' +
    'button,input,select,textarea{font:inherit}button:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid #4338ca;outline-offset:3px}' +
    '.fixture-shell{width:100%;max-width:1200px;margin:auto;height:100%;display:flex;flex-direction:column;min-width:0}.fixture-header{padding:10px 16px;flex:none}.fixture-header h1{font-size:20px;font-weight:bold}.fixture-header p{font-size:13px;overflow-wrap:anywhere}' +
    '.fixture-scroller{min-height:0;flex:1;overflow-y:auto;padding:12px 16px;position:relative}.fixture-footer{margin-top:24px;padding:18px;border-top:1px solid #cbd5e1;font-size:13px}select{max-width:100%}' +
    '@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}' +
    '</style><div id="root"></div><script src="/strings.js"></script><script src="/fixture.js"></script></html>';
  const files = { '/fixture.js': path.join(__dirname, 'navigation-fixture.js'), '/strings.js': path.join(root, 'reports/novak-feedback-implementation/strings.js'), '/app.css': path.join(cssDir, css) };
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (files[pathname]) {
      res.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css' : 'application/javascript');
      res.end(fs.readFileSync(files[pathname]));
    } else if (pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); }
    else { res.statusCode = 404; res.end(); }
  });
}
async function main() {
  await buildFixture();
  if (process.argv.includes('--build-only')) { console.log('Navigation fixture compiled. Browser QA not run.'); return; }
  const server = serverForFixture();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: process.env.NAV_BROWSER_CHANNEL || 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      blockedRequests.push(url); return route.abort();
    });
    await page.addInitScript(() => {
      window.navigationMotion = [];
      for (const [prototype, method] of [[Element.prototype, 'scrollIntoView'], [Element.prototype, 'scrollTo'], [Window.prototype, 'scrollTo']]) {
        const original = prototype[method];
        if (typeof original !== 'function') continue;
        prototype[method] = function (...args) {
          window.navigationMotion.push({ method, behavior: typeof args[0] === 'object' ? args[0]?.behavior : null });
          return original.apply(this, args);
        };
      }
    });
    const reset = async (item = 'adapted-older', compare = false) => {
      await page.goto(base + '/?item=' + encodeURIComponent(item) + '&compare=' + (compare ? '1' : '0'));
      await page.locator('[data-reading-versions]').waitFor();
      await page.waitForFunction(() => window.navigationFixture?.state);
    };
    const state = () => page.evaluate(() => window.navigationFixture.state);
    const version = name => page.locator('[data-reading-versions]').getByRole('button', { name, exact: true });
    const clickVersion = async name => { await version(name).evaluate(node => node.click()); await page.waitForTimeout(150); };
    const comparisonChoice = () => page.locator('select').filter({ has: page.locator('option[value="alternate-original"]') });
    const languageChoice = () => page.locator('select').filter({ has: page.locator('option[value="english"]') });
    const scrollState = () => page.evaluate(() => ({
      outer: document.querySelector('[data-fixture-scroller]').scrollTop,
      source: document.querySelector('[data-compare-version="source"]')?.scrollTop ?? null,
      adapted: document.querySelector('[data-compare-version="adapted"]')?.scrollTop ?? null
    }));
    const setScroll = async values => {
      await page.evaluate(values => {
        for (const [key, selector] of [['outer', '[data-fixture-scroller]'], ['source', '[data-compare-version="source"]'], ['adapted', '[data-compare-version="adapted"]']]) {
          const node = document.querySelector(selector);
          if (node && values[key] !== undefined) { node.scrollTop = values[key]; node.dispatchEvent(new Event('scroll')); }
        }
      }, values);
      await page.waitForTimeout(80); return scrollState();
    };
    const nearly = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 3, label + ': expected ' + expected + ', got ' + actual);
    const check = async (name, fn) => {
      try { const detail = await fn(); checks.push({ name, status: 'passed', detail: detail || null }); console.log('PASS ' + name); }
      catch (error) {
        checks.push({ name, status: 'failed', error: error.message });
        try { await page.screenshot({ path: path.join(__dirname, 'failure-' + checks.length + '.png'), fullPage: true }); } catch (_) {}
        console.error('FAIL ' + name + ': ' + error.message);
      }
    };
    const choosePassage = async text => {
      const choice = page.getByRole('combobox', { name: 'Adapted passage', exact: true });
      const options = await choice.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: node.textContent })));
      const target = options.find(option => option.text.includes(text));
      assert.ok(target, 'Matching adapted passage option exists: ' + text); await choice.selectOption(target.value);
    };
    await check('Older adaptation survives Original → Both despite newer companions', async () => {
      await reset(); await clickVersion('Original'); assert.equal((await state()).itemId, 'original-coast');
      await clickVersion('Both'); assert.equal((await state()).itemId, 'adapted-older'); assert.equal((await state()).compare, true);
      assert.ok((await page.locator('[data-compare-version="adapted"]').textContent()).includes('Young crabs hide among mangrove roots'));
    });
    await check('Independent single-view and comparison scroll positions survive round trips', async () => {
      await reset(); const adaptedOnly = await setScroll({ outer: 580 }); assert.ok(adaptedOnly.outer > 0, 'Adapted-only fixture is scrollable');
      await clickVersion('Original'); const originalOnly = await setScroll({ outer: 870 }); assert.ok(originalOnly.outer > 0, 'Original-only fixture is scrollable');
      await clickVersion('Both'); const both = await setScroll({ outer: 170, source: 390, adapted: 230 });
      assert.ok(both.source > 0 && both.adapted > 0, 'Both panes are independently scrollable');
      await clickVersion('Original'); nearly((await scrollState()).outer, originalOnly.outer, 'Original position');
      await clickVersion('Both'); const restored = await scrollState();
      nearly(restored.outer, both.outer, 'Comparison outer position'); nearly(restored.source, both.source, 'Comparison source position'); nearly(restored.adapted, both.adapted, 'Comparison adaptation position');
      await clickVersion('Adapted'); nearly((await scrollState()).outer, adaptedOnly.outer, 'Adapted-only position');
      return { adaptedOnly, originalOnly, both, restored };
    });
    await check('Teacher source and language choices survive an alternate-original detour', async () => {
      await reset('adapted-bilingual', true); await comparisonChoice().selectOption('alternate-original'); await languageChoice().selectOption('adapted');
      await page.getByRole('button', { name: 'Open original reader', exact: true }).click(); assert.equal((await state()).itemId, 'alternate-original');
      await page.getByRole('button', { name: 'Back to comparison', exact: true }).click();
      assert.equal((await state()).itemId, 'adapted-bilingual'); assert.equal((await state()).compare, true);
      assert.equal(await comparisonChoice().inputValue(), 'alternate-original'); assert.equal(await languageChoice().inputValue(), 'adapted');
    });
    await check('Changing comparison source or language stops prior audio; captured source uses its own language', async () => {
      await reset('adapted-bilingual', true); await page.getByRole('button', { name: 'Listen to original', exact: true }).click();
      let events = await page.evaluate(() => window.navigationFixture.events); assert.equal(events.filter(event => event.type === 'speak').at(-1).language, 'English');
      await comparisonChoice().selectOption('alternate-original'); assert.equal((await state()).playing, false);
      await page.getByRole('button', { name: 'Listen to adapted', exact: true }).click(); await languageChoice().selectOption('adapted'); assert.equal((await state()).playing, false);
      events = await page.evaluate(() => window.navigationFixture.events);
      return { spokenLanguages: events.filter(event => event.type === 'speak').map(event => event.language), stopCount: events.filter(event => event.type === 'stop').length };
    });
    await check('Reliable same-language passage linking highlights exact original content', async () => {
      await reset('adapted-older', true); await page.getByRole('checkbox', { name: 'Link passages', exact: true }).check();
      await choosePassage('Young crabs'); await page.getByRole('button', { name: 'Show related original', exact: true }).click();
      const highlight = page.locator('[data-related-original="true"]'); await highlight.first().waitFor();
      assert.match(await highlight.allTextContents().then(parts => parts.join(' ')), /Mangrove roots trap sediment/);
      assert.equal(await page.locator('[data-compare-version="source"]').textContent(), await page.evaluate(() => window.navigationFixture.source));
      await page.screenshot({ path: path.join(__dirname, 'navigation-linked-desktop.png'), fullPage: true });
    });
    await check('Ambiguous or unsupported links never highlight a guessed original passage', async () => {
      const notices = [];
      for (const id of ['adapted-ambiguous', 'adapted-unavailable']) {
        await reset(id, true); await page.getByRole('checkbox', { name: 'Link passages', exact: true }).check();
        const action = page.getByRole('button', { name: 'Show related original', exact: true });
        if (await action.isEnabled()) await action.click(); assert.equal(await page.locator('[data-related-original="true"]').count(), 0);
        notices.push({ id, statuses: await page.locator('[role="status"]').allTextContents(), disabled: await action.isDisabled() });
      }
      return notices;
    });
    await check('Cross-language comparison never guesses related-passage highlights', async () => {
      await reset('adapted-bilingual', true); await languageChoice().selectOption('adapted');
      const link = page.getByRole('checkbox', { name: 'Link passages', exact: true }); if (await link.isEnabled()) await link.check();
      const action = page.getByRole('button', { name: 'Show related original', exact: true }); if (await action.count() && await action.isEnabled()) await action.click();
      assert.equal(await page.locator('[data-related-original="true"]').count(), 0);
      return { linkDisabled: await link.isDisabled(), statuses: await page.locator('[role="status"]').allTextContents() };
    });
    await check('320px layout supports keyboard switching, pane scrolling, and reduced-motion navigation', async () => {
      await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await reset('adapted-older', true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Document fits 320px');
      assert.equal(await page.locator('[data-fixture-scroller]').evaluate(node => node.scrollWidth > node.clientWidth + 1), false, 'Reader fits scroller');
      await version('Original').focus(); await page.keyboard.press('Enter'); assert.equal((await state()).itemId, 'original-coast');
      assert.equal(await page.evaluate(() => document.activeElement !== document.body && document.activeElement?.isConnected), true);
      await version('Both').focus(); await page.keyboard.press('Enter'); assert.equal((await state()).itemId, 'adapted-older');
      const sourcePane = page.locator('[data-compare-version="source"]'); await sourcePane.focus(); const before = await sourcePane.evaluate(node => node.scrollTop);
      await page.keyboard.press('PageDown'); await page.waitForTimeout(150); assert.ok(await sourcePane.evaluate(node => node.scrollTop) > before, 'Focused source pane scrolls with PageDown');
      await page.getByRole('checkbox', { name: 'Link passages', exact: true }).check(); await choosePassage('Young crabs'); await page.getByRole('button', { name: 'Show related original', exact: true }).click();
      assert.equal(await page.evaluate(() => window.navigationMotion.some(event => event.behavior === 'smooth')), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: path.join(__dirname, 'navigation-linked-320.png'), fullPage: true });
    });
    await check('No runtime errors or external service requests', async () => { assert.deepEqual(runtimeErrors, []); assert.deepEqual(blockedRequests, []); });
  } finally {
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
    const report = {
      createdAt: new Date().toISOString(), checks, runtimeErrors, blockedRequests, limitations,
      artifacts: { sourceSha256: digest('view_simplified_source.jsx'), observedGeneratedModuleSha256: digest('view_simplified_module.js'), contractSha256: digest('instructional_context_module.js') },
      passed: checks.every(check => check.status === 'passed')
    };
    fs.writeFileSync(resultPath, JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(__dirname, 'README.md'),
      '# Reading navigation browser QA\n\nRun from the repository root:\n\n    node reports/novak-reading-navigation/navigation-browser-qa.cjs\n\n' +
      'The runner compiles the canonical reader JSX into an owned fixture copy on every run. The --build-only option compiles the fixture without opening a browser.\n\n' +
      checks.map(check => '- ' + (check.status === 'passed' ? 'PASS' : 'FAIL') + ': ' + check.name + (check.error ? ' — ' + check.error : '')).join('\n') +
      '\n\nLimitations:\n\n' + limitations.map(value => '- ' + value).join('\n') + '\n');
    if (!report.passed) process.exitCode = 1;
    console.log(JSON.stringify({ passed: report.passed, checks: checks.length, resultPath }));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
