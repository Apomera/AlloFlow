#!/usr/bin/env node
'use strict';

// Real Chromium SRI acceptance using synthetic code and a loopback fixture.
// Remote-looking URLs are fulfilled by Playwright routes; no CDN is contacted.
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const policySource = fs.readFileSync(path.join(root, 'browser_delivery_policy.js'), 'utf8');
const approved = 'window.__deliveryExecuted=(window.__deliveryExecuted||0)+1;window.__deliverySource="approved";';
const changed = 'window.__deliveryTampered=true;window.__deliverySource="changed";';
const commit = '1'.repeat(40);
const primary = 'https://alloflow-cdn.pages.dev/fixture_module.js?v=reviewed-release';
const immutable = 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@' + commit + '/fixture_module.js';
const records = [];
let server, browser, origin;
let localBody = approved, localStatus = 200;

const integrity = bytes => 'sha384-' + createHash('sha384').update(bytes).digest('base64');
const manifest = () => ({ schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: commit,
  allowDesktopRemoteFallback: false,
  assets: { 'fixture_module.js': { bytes: Buffer.byteLength(approved), integrity: integrity(approved) } } });

before(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/' || url.pathname === '/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html><head><title>Synthetic delivery acceptance</title></head><body>Classroom fixture</body></html>');
    } else if (url.pathname === '/browser_delivery_policy.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript', 'X-Content-Type-Options': 'nosniff' });
      response.end(policySource);
    } else if (url.pathname === '/fixture_module.js') {
      response.writeHead(localStatus, { 'Content-Type': 'application/javascript', 'X-Content-Type-Options': 'nosniff' });
      response.end(localStatus === 200 ? localBody : 'Unavailable');
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(candidate => candidate && fs.existsSync(candidate));
  browser = await chromium.launch(executablePath ? { executablePath } : {});
}, { timeout: 60000 });

after(async () => {
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  const report = path.resolve(root, process.env.ALLO_BROWSER_DELIVERY_REPORT || 'tmp/browser-delivery-security/browser-delivery-results.json');
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, JSON.stringify({ checkedAt: new Date().toISOString(),
    method: 'Real Chromium native SRI; repository browser_delivery_policy.js; synthetic trusted manifest; localhost and intercepted CDN routes; sandbox enabled.',
    passed: records.length === 7 && records.every(record => record.passed), records }, null, 2) + '\n');
  process.stdout.write('Browser delivery evidence: ' + report + '\n');
});

function scenario(name, run) {
  test(name, { timeout: 45000 }, async () => {
    const context = await browser.newContext();
    const requests = [], blocked = [];
    let primaryBody = approved, fallbackBody = approved, primaryFails = false;
    localBody = approved; localStatus = 200;
    try {
      await context.route('**/*', async route => {
        const url = route.request().url();
        if (new URL(url).origin === origin) return route.continue();
        requests.push(url);
        if (url === primary && primaryFails) return route.abort('failed');
        if (url === primary || url === immutable) return route.fulfill({ status: 200,
          headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
          body: url === primary ? primaryBody : fallbackBody });
        blocked.push(url); return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      await page.goto(origin + '/index.html');
      await page.addScriptTag({ url: origin + '/browser_delivery_policy.js' });
      const setup = async (desktop = false) => page.evaluate(({ input, desktop }) => {
        window.__trustedManifestInput = input;
        window.__deliveryPolicy = _alloCreateBrowserDeliveryPolicy(input, { baseUrl: location.href,
          isDesktopBundledApp: desktop, usesLocalModuleAssets: desktop });
      }, { input: manifest(), desktop });
      const load = url => page.evaluate(url => new Promise(resolve => {
        const script = document.createElement('script');
        try { window.__deliveryPolicy.configureScript(script, url); }
        catch (error) { resolve({ loaded: false, denied: true, error: String(error.message) }); return; }
        script.onload = () => resolve({ loaded: true, denied: false, integrity: script.integrity, src: script.src });
        script.onerror = () => resolve({ loaded: false, denied: false, integrity: script.integrity, src: script.src });
        document.head.appendChild(script);
      }), url);
      const state = () => page.evaluate(() => ({ executed: window.__deliveryExecuted || 0,
        tampered: !!window.__deliveryTampered, source: window.__deliverySource || null }));
      const evidence = await run({ page, setup, load, state, requests,
        changePrimary: body => { primaryBody = body; }, changeFallback: body => { fallbackBody = body; },
        failPrimary: () => { primaryFails = true; },
        fallback: url => page.evaluate(url => window.__deliveryPolicy.fallbackUrl(url), url),
        changeLocal: (body, status = 200) => { localBody = body; localStatus = status; } });
      assert.deepEqual(blocked, [], 'The policy must refuse unapproved URLs before any network request');
      assert(!requests.some(url => /\/(?:main|latest)\//.test(url) || /@latest\//.test(url)));
      records.push({ scenario: name, passed: true, ...evidence });
    } catch (error) {
      records.push({ scenario: name, passed: false, error: String(error.message) }); throw error;
    } finally { await context.close(); }
  });
}

scenario('exact reviewed CDN primary bytes execute once with browser-enforced SRI', async env => {
  await env.setup();
  const result = await env.load(primary);
  assert.equal(result.loaded, true); assert.equal(result.integrity, integrity(approved));
  assert.deepEqual(await env.state(), { executed: 1, tampered: false, source: 'approved' });
  assert.deepEqual(env.requests, [primary]);
  return { primaryExecuted: true, integrity: result.integrity };
});

scenario('changed primary body never executes despite a successful HTTP response', async env => {
  await env.setup(); env.changePrimary(changed);
  const result = await env.load(primary);
  assert.equal(result.loaded, false); assert.equal(result.denied, false);
  assert.deepEqual(await env.state(), { executed: 0, tampered: false, source: null });
  return { alteredBodyBlockedBeforeExecution: true };
});

scenario('network failure can use the full immutable commit fallback with identical reviewed bytes', async env => {
  await env.setup(); env.failPrimary();
  assert.equal((await env.load(primary)).loaded, false);
  assert.equal(await env.fallback(primary), immutable);
  const result = await env.load(immutable);
  assert.equal(result.loaded, true); assert.equal(result.integrity, integrity(approved));
  assert.deepEqual(await env.state(), { executed: 1, tampered: false, source: 'approved' });
  assert.deepEqual(env.requests, [primary, immutable]);
  return { immutableCommit: commit, matchingFallbackExecuted: true };
});

scenario('changed fallback bytes never execute or reset the reviewed digest', async env => {
  await env.setup(); env.failPrimary(); env.changeFallback(changed);
  assert.equal((await env.load(primary)).loaded, false);
  assert.equal((await env.load(await env.fallback(primary))).loaded, false);
  assert.deepEqual(await env.state(), { executed: 0, tampered: false, source: null });
  return { alteredFallbackBlockedBeforeExecution: true };
});

scenario('mutable main, latest, unknown and unapproved CDN script URLs are denied without a request', async env => {
  await env.setup();
  for (const url of ['https://raw.githubusercontent.com/Apomera/AlloFlow/main/fixture_module.js',
    'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@latest/fixture_module.js',
    'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@' + '2'.repeat(40) + '/fixture_module.js',
    'https://alloflow-cdn.pages.dev/unknown_module.js', 'https://unapproved.example/fixture_module.js']) {
    assert.equal((await env.load(url)).denied, true); assert.equal(await env.fallback(url), null);
  }
  assert.deepEqual(env.requests, []);
  assert.deepEqual(await env.state(), { executed: 0, tampered: false, source: null });
  return { mutableAndUnapprovedRequests: 0 };
});

scenario('Desktop loads exact local bytes and refuses remote or missing-local fallback', async env => {
  await env.setup(true);
  assert.equal((await env.load('./fixture_module.js')).loaded, true);
  for (const url of [primary, immutable]) assert.equal((await env.load(url)).denied, true);
  assert.equal(await env.fallback('./fixture_module.js'), null);
  env.changeLocal('', 404);
  assert.equal((await env.load('./fixture_module.js?v=missing')).loaded, false);
  assert.equal(await env.fallback('./fixture_module.js?v=missing'), null);
  assert.deepEqual(env.requests, []);
  assert.deepEqual(await env.state(), { executed: 1, tampered: false, source: 'approved' });
  return { localExecuted: true, remoteRequests: 0, missingLocalFailedClosed: true };
});

scenario('changing caller manifest data after policy construction cannot approve altered code', async env => {
  await env.setup(); env.changePrimary(changed);
  await env.page.evaluate(({ badIntegrity, badBytes }) => {
    window.__trustedManifestInput.assets['fixture_module.js'].integrity = badIntegrity;
    window.__trustedManifestInput.assets['fixture_module.js'].bytes = badBytes;
  }, { badIntegrity: integrity(changed), badBytes: Buffer.byteLength(changed) });
  const result = await env.load(primary);
  assert.equal(result.integrity, integrity(approved)); assert.equal(result.loaded, false);
  assert.deepEqual(await env.state(), { executed: 0, tampered: false, source: null });
  return { constructedPolicyRemainsAnchored: true };
});
