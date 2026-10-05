#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { ORIGIN, sha256, options, snapshot, getAsset, writeReport } = require('./live-release-lib.cjs');
const report = { at: new Date().toISOString(), ok: false, boots: [], resources: [], pageErrors: [], fatalConsole: [],
  consoleErrors: [], requestFailures: [], blockedWrites: [], unmappedOfficialResources: [], limitations: [
    'Disposable unauthenticated context: boot and two reloads only; no saved user profile or feature journey.',
    'Verifies observed official-origin resources and the expected service-worker precache against explicit committed blobs.',
    'No deployment, cloud write, storage-state import/export, button click, force worker activation or application data modification.',
    'Browser and service worker write only their disposable local cache/storage; optional non-GET/HEAD network requests are blocked.',
    'Normal boot may GET third-party public dependencies; those bodies are outside this repository-byte comparison.',
    'No claim about existing users service-worker caches, global CDN propagation or reader performance.',
  ] };
let browser, context, state;
(async () => {
  state = snapshot(options(process.argv.slice(2)));
  Object.assign(report, { commit: state.commit, base: state.base, headAtStart: state.head, expectedCacheName: state.cacheName });
  // Fail before opening the application if its committed shell/worker is stale.
  report.preflight = [];
  for (const file of ['app/index.html', 'app/sw.js', 'app/asset-manifest.json']) {
    for (const mode of ['ordinary', 'revalidate']) {
      const result = await getAsset({ ...state.expected(file), url: ORIGIN + '/' + file }, mode);
      report.preflight.push(result);
      assert.equal(result.matches, true, 'Stale or unavailable app preflight: ' + mode + ' ' + file);
    }
  }
  const channel = process.env.ALLO_LIVE_BROWSER || 'msedge';
  browser = await chromium.launch({ headless: true, ...(channel === 'chromium' ? {} : { channel }) });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'allow' });
  // Navigation is the sole interaction. No persistent user-data directory is used.
  await context.route('**/*', route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) {
      const url = new URL(request.url());
      report.blockedWrites.push({ method: request.method(), url: url.origin + url.pathname });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const value = message.text().slice(0, 1200);
    report.consoleErrors.push(value);
    if (/Minified React error|Invalid hook call|Rendered (?:more|fewer) hooks|The above error occurred|React error #[0-9]+|\[CDN-FAIL\]/i.test(value))
      report.fatalConsole.push(value);
  });
  context.on('requestfailed', request => {
    const url = new URL(request.url());
    report.requestFailures.push({ method: request.method(), url: url.origin + url.pathname, failure: request.failure()?.errorText });
  });
  const pending = new Set();
  context.on('response', response => {
    if (response.request().method() !== 'GET' || response.status() >= 300 && response.status() < 400) return;
    const url = new URL(response.url());
    if (url.origin !== ORIGIN) return;
    const file = state.fileForUrl(url.href);
    if (!file) { report.unmappedOfficialResources.push({ url: url.href, status: response.status() }); return; }
    const task = (async () => {
      const expected = state.expected(file);
      const result = { url: url.href, file, status: response.status(), expectedSha256: expected.sha256,
        expectedBytes: expected.bytes, fromServiceWorker: response.fromServiceWorker(), matches: false };
      report.resources.push(result);
      try {
        const body = await response.body();
        result.bytes = body.length; result.sha256 = sha256(body);
        result.matches = response.status() === 200 && body.length === expected.bytes && result.sha256 === expected.sha256;
        if (!result.matches) result.error = 'Observed resource differs from final committed blob';
      } catch (error) { result.error = error.message; }
    })();
    pending.add(task); task.finally(() => pending.delete(task));
  });
  async function boot(reload) {
    const response = reload
      ? await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
      : await page.goto(ORIGIN + '/app/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response?.status(), 200, 'App document did not return 200');
    assert.equal(new URL(page.url()).origin, ORIGIN);
    assert.equal(new URL(page.url()).pathname, '/app/');
    await page.waitForFunction(() => {
      const root = document.getElementById('root'), loader = document.getElementById('alloflow-loader');
      return root && root.children.length > 0 && (!loader || getComputedStyle(loader).display === 'none');
    }, null, { timeout: 60000 });
    assert.match(await page.title(), /Adaptive UDL Platform/);
    // Let immediate lazy boot/render errors appear; this is not a performance measurement.
    await page.waitForTimeout(3000);
    report.boots.push(await page.evaluate(() => ({
      url: location.href, title: document.title, rootChildren: document.getElementById('root')?.children.length,
      serviceWorkerController: navigator.serviceWorker.controller?.scriptURL || null,
    })));
    assert.deepEqual(report.pageErrors, [], 'Page errors occurred');
    assert.deepEqual(report.fatalConsole, [], 'Fatal React/module errors occurred');
  }
  await boot(false);
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration?.active && !!navigator.serviceWorker.controller;
  }, null, { timeout: 60000 });
  report.registration = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return { scope: registration.scope, active: registration.active?.scriptURL, controller: navigator.serviceWorker.controller?.scriptURL,
      waiting: registration.waiting?.scriptURL || null };
  });
  assert.equal(report.registration.scope, ORIGIN + '/app/');
  assert.equal(report.registration.active, ORIGIN + '/app/sw.js');
  assert.equal(report.registration.controller, ORIGIN + '/app/sw.js');
  for (let i = 0; i < 2; i++) await boot(true);
  report.precache = await page.evaluate(async ({ cacheName, files }) => {
    const names = await caches.keys();
    if (!names.includes(cacheName)) return { names, expectedCachePresent: false, entries: [] };
    const cache = await caches.open(cacheName);
    const entries = [];
    for (const file of files) {
      const url = location.origin + '/' + file, response = await cache.match(url);
      if (!response) { entries.push({ file, url, missing: true }); continue; }
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
      entries.push({ file, url, status: response.status, redirected: response.redirected, bytes: bytes.byteLength, sha256 });
    }
    return { names, expectedCachePresent: true, entries };
  }, { cacheName: state.cacheName, files: state.precachePaths });
  assert.equal(report.precache.expectedCachePresent, true, 'Expected final-commit shell cache absent');
  for (const entry of report.precache.entries) {
    const expected = state.expected(entry.file);
    entry.matches = !entry.missing && entry.status === 200 && entry.bytes === expected.bytes && entry.sha256 === expected.sha256;
    assert.equal(entry.matches, true, 'Stale/missing service-worker cache entry: ' + entry.file);
    if (entry.file === 'app/index.html') assert.equal(entry.redirected, false, 'Cached shell must not be a redirected response');
  }
  for (let pass = 0; pass < 8 && pending.size; pass++) await Promise.all([...pending]);
  assert.equal(pending.size, 0, 'Observed resource comparison did not settle');
  assert.ok(report.resources.some(entry => /_module\.js$/.test(entry.file)), 'No production module response was observed');
  assert.ok(report.resources.some(entry => /^app\/static\/js\/main\./.test(entry.file)), 'No compiled main bundle response was observed');
  assert.deepEqual(report.resources.filter(entry => !entry.matches), [], 'Stale or unreadable official-origin resources observed');
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.fatalConsole, []);
  report.headAtEnd = state.headNow();
  assert.equal(report.headAtEnd, report.headAtStart, 'Local HEAD changed during verification');
  report.ok = true;
})().catch(error => { report.error = error.stack || error.message; }).finally(async () => {
  await context?.close().catch(() => {}); await browser?.close().catch(() => {});
  if (!report.ok) process.exitCode = 1;
  writeReport('live-browser.json', report);
  console.log(JSON.stringify({ ok: report.ok, commit: report.commit, boots: report.boots.length,
    resources: report.resources.length, mismatchedResources: report.resources.filter(value => !value.matches).length,
    pageErrors: report.pageErrors, fatalConsole: report.fatalConsole, error: report.error }, null, 2));
});
