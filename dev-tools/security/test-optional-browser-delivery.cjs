#!/usr/bin/env node
'use strict';

// Native SRI plus the actual host optional-loader body. All script bodies are
// synthetic and remote-looking mirror URLs are intercepted before networking.
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const approved = 'window.__optionalCount=(window.__optionalCount||0)+1;window.__optionalReady=true;';
const otherApproved = 'window.__optionalSource="approved mirror";window.__optionalCount=(window.__optionalCount||0)+1;window.__optionalReady=true;';
const tampered = 'window.__optionalTampered=true;window.__optionalReady=true;';
const vexflow = 'window.__vexCount=(window.__vexCount||0)+1;window.VexFlow={synthetic:true};';
const mirror = 'https://cdn.jsdelivr.net/npm/fixture@1.0.0/fixture.min.js';
const secondMirror = 'https://cdnjs.cloudflare.com/ajax/libs/fixture/1.0.0/fixture.min.js';
const differentMirror = 'https://cdn.jsdelivr.net/npm/fixture@2.0.0/different.min.js';
const remoteOnlyMirror = 'https://unpkg.com/fixture@3.0.0/remote-only.js';
const vexMirror = 'https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.js';
const records = [];
let browser, server, origin, policySource, loaderSource;

const entry = bytes => ({ integrity: 'sha384-' + createHash('sha384').update(bytes).digest('base64'), bytes: Buffer.byteLength(bytes) });
const manifest = () => ({ schemaVersion: 1, libraries: {
  fixture: { asset: 'vendor/fixture.js', ...entry(approved), mirrors: [
    { url: mirror, ...entry(approved) }, { url: secondMirror, ...entry(approved) }] },
  different: { asset: 'vendor/different.js', ...entry(approved), mirrors: [{ url: differentMirror, ...entry(otherApproved) }] },
  vexflow: { asset: 'vendor/vexflow-5.0.0/vexflow.js', ...entry(vexflow), mirrors: [{ url: vexMirror, ...entry(vexflow) }] },
  remoteonly: { asset: null, integrity: null, bytes: null, mirrors: [{ url: remoteOnlyMirror, ...entry(approved) }] },
} });

before(async () => {
  policySource = fs.readFileSync(path.join(root, 'optional_browser_delivery_policy.js'), 'utf8');
  loaderSource = fs.readFileSync(path.join(root, 'optional_browser_loader.js'), 'utf8');
  assert(loaderSource.includes('_alloCreateOptionalBrowserLoader'), 'Production optional-loader factory must be present');
  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/hosted/' || pathname === '/app/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html><head><title>Optional delivery fixture</title></head><body>Classroom</body></html>');
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
  const file = path.resolve(root, process.env.ALLO_OPTIONAL_DELIVERY_REPORT || 'tmp/browser-delivery-security/optional-browser-delivery-results.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ checkedAt: new Date().toISOString(),
    method: 'Real Chromium native SRI; production optional-loader factory and actual canonical VexFlow hook; synthetic per-URL manifests and intercepted mirror bodies; sandbox enabled.',
    passed: records.length === 14 && records.every(record => record.passed), records }, null, 2) + '\n');
  process.stdout.write('Optional browser delivery evidence: ' + file + '\n');
});

function scenario(name, run, { desktop = false } = {}) {
  test(name, { timeout: 45000 }, async () => {
    const context = await browser.newContext(), requests = [], external = [], routes = new Map(), holds = [];
    const base = origin + (desktop ? '/app/' : '/hosted/');
    const local = new URL('./vendor/fixture.js', base).href;
    const localDifferent = new URL('./vendor/different.js', base).href;
    const localVex = new URL('./vendor/vexflow-5.0.0/vexflow.js', base).href;
    for (const url of [local, mirror, secondMirror, localDifferent]) routes.set(url, { body: approved });
    routes.set(differentMirror, { body: otherApproved });
    routes.set(remoteOnlyMirror, { body: approved });
    for (const url of [localVex, vexMirror]) routes.set(url, { body: vexflow });
    let page, closing = false;
    try {
      await context.route('**/*', async route => {
        const url = route.request().url();
        if (url === base) return route.continue();
        requests.push(url);
        if (new URL(url).origin !== origin) external.push(url);
        let result = routes.get(url);
        if (!result) return route.abort('blockedbyclient');
        if (result.gate) {
          result.arrived();
          result = await result.gate;
        }
        if (result.error) return route.abort('failed');
        try { await route.fulfill({ status: result.status || 200, body: result.body || '', headers: {
          'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
        catch (error) { if (!closing) throw error; }
      });
      page = await context.newPage();
      await page.goto(base);
      await page.addScriptTag({ content: policySource + '\nconst _alloOptionalBrowserDeliveryManifest=' + JSON.stringify(manifest())
        + ';\nconst _alloOptionalBrowserDeliveryId=' + JSON.stringify(createHash('sha256').update(JSON.stringify(manifest())).digest('hex'))
        + ';\n' + loaderSource + '\nwindow.__nativeOptionalPolicy=_alloCreateOptionalBrowserDeliveryPolicy('
        + '_alloOptionalBrowserDeliveryManifest,{baseUrl:location.href,isDesktopBundledApp:' + desktop + '});'
        + '\nwindow.__alloLoadOptionalScript=_alloCreateOptionalBrowserLoader({document,setTimeout,clearTimeout},window.__nativeOptionalPolicy);' });
      const load = (urls = [local], key = 'fixture', timeoutMs = 5000) => page.evaluate(({ urls, key, timeoutMs }) =>
        window.__alloLoadOptionalScript(key, urls, () => window.__optionalReady === true, { timeoutMs }), { urls, key, timeoutMs });
      const state = () => page.evaluate(() => ({ count: window.__optionalCount || 0, tampered: !!window.__optionalTampered,
        ready: !!window.__optionalReady, source: window.__optionalSource || null }));
      const direct = (url, key = 'fixture') => page.evaluate(({ url, key }) => new Promise(resolve => {
        const script = document.createElement('script');
        try { window.__nativeOptionalPolicy.configureScript(script, url, key); }
        catch (error) { resolve({ loaded: false, denied: true, error: String(error.message) }); return; }
        script.onload = () => resolve({ loaded: true, denied: false, integrity: script.integrity, src: script.src });
        script.onerror = () => resolve({ loaded: false, denied: false, integrity: script.integrity, src: script.src });
        document.head.appendChild(script);
      }), { url, key });
      const hold = url => {
        let release, arrived;
        const gate = new Promise(resolve => { release = resolve; });
        const arrival = new Promise(resolve => { arrived = resolve; });
        routes.set(url, { gate, arrived }); holds.push(release);
        return { arrival, release: result => { routes.set(url, result); release(result); } };
      };
      const evidence = await run({ page, routes, requests, external, local, localDifferent, localVex, load, direct, state, hold, base });
      assert(!external.some(url => /@latest(?:\/|$)|\/main\//.test(url)), 'Mutable vendor URLs must never be requested');
      records.push({ scenario: name, passed: true, ...evidence });
    } catch (error) { records.push({ scenario: name, passed: false, error: String(error.message) }); throw error; }
    finally { closing = true; for (const release of holds) release({ error: true }); await context.close(); }
  });
}

scenario('approved local optional bytes execute and local query stamps canonicalize', async env => {
  const result = await env.direct('./vendor/fixture.js?v=legacy-cache-key');
  assert.equal(result.loaded, true); assert.equal(result.src, env.local);
  assert.equal(result.integrity, entry(approved).integrity);
  assert.deepEqual(await env.state(), { count: 1, tampered: false, ready: true, source: null });
  return { localExecuted: true, queryCanonicalized: true };
});

scenario('changed HTTP200 local bytes do not execute before an approved remote fallback', async env => {
  env.routes.set(env.local, { body: tampered });
  assert.equal(await env.load([env.local, mirror]), true);
  assert.deepEqual(await env.state(), { count: 1, tampered: false, ready: true, source: null });
  assert.deepEqual(env.requests, [env.local, mirror]);
  return { changedLocalBlocked: true, reviewedMirrorExecuted: true };
});

scenario('approved remote bodies execute and per-URL byte differences use their own digest', async env => {
  const result = await env.direct(differentMirror, 'different');
  assert.equal(result.loaded, true); assert.equal(result.integrity, entry(otherApproved).integrity);
  assert.notEqual(result.integrity, entry(approved).integrity);
  assert.deepEqual(await env.state(), { count: 1, tampered: false, ready: true, source: 'approved mirror' });
  return { distinctMirrorDigestExecuted: true };
});

scenario('hosted remote-only dependencies use their approved mirror when no bundled asset exists', async env => {
  assert.equal(await env.page.evaluate(() => window.__alloLoadOptionalScript('remoteonly', undefined,
    () => window.__optionalReady === true, { timeoutMs: 5000 })), true);
  assert.deepEqual(env.requests, [remoteOnlyMirror]);
  assert.equal((await env.state()).count, 1);
  return { approvedRemoteOnlyExecuted: true };
});

scenario('changed remote bodies fail SRI and a later approved mirror can recover', async env => {
  env.routes.set(mirror, { body: tampered });
  assert.equal(await env.load([mirror, secondMirror]), true);
  assert.deepEqual(await env.state(), { count: 1, tampered: false, ready: true, source: null });
  assert.deepEqual(env.requests, [mirror, secondMirror]);
  return { changedMirrorBlocked: true, laterApprovedMirrorExecuted: true };
});

scenario('unlisted, mutable and wrong-library URLs are denied before a native request', async env => {
  for (const url of ['https://cdn.jsdelivr.net/npm/fixture@latest/fixture.min.js', mirror + '?unreviewed=1',
    'https://raw.githubusercontent.com/Apomera/AlloFlow/main/vendor/fixture.js', 'https://evil.example/fixture.js', env.localDifferent]) {
    assert.equal((await env.direct(url)).denied, true);
  }
  assert.deepEqual(env.requests, []);
  return { unapprovedRequests: 0 };
});

scenario('Desktop accepts local optional code and refuses all external fallback requests', async env => {
  assert.equal(await env.load([env.local, mirror]), true);
  assert.equal((await env.direct(mirror)).denied, true);
  assert.deepEqual(env.external, []);
  return { localExecuted: true, externalRequests: 0 };
}, { desktop: true });

scenario('Desktop missing-local failure settles without using an approved hosted mirror', async env => {
  env.routes.set(env.local, { status: 404 });
  assert.equal(await env.load([env.local, mirror]), false);
  assert.deepEqual(env.external, []);
  assert.equal((await env.state()).count, 0);
  return { failedClosed: true, externalRequests: 0 };
}, { desktop: true });

scenario('Desktop remote-only dependencies fail closed without any script request', async env => {
  assert.deepEqual(await env.page.evaluate(() => window.__nativeOptionalPolicy.sourcesFor('remoteonly')), []);
  assert.equal(await env.page.evaluate(() => window.__alloLoadOptionalScript('remoteonly', undefined,
    () => window.__optionalReady === true, { timeoutMs: 5000 })), false);
  assert.deepEqual(env.requests, []); assert.deepEqual(env.external, []);
  return { remoteOnlyUnavailable: true, externalRequests: 0 };
}, { desktop: true });

scenario('concurrent optional calls share one pending promise and one script execution', async env => {
  const pending = env.hold(env.local);
  assert.equal(await env.page.evaluate(url => {
    const ready = () => window.__optionalReady === true;
    window.__firstOptional = window.__alloLoadOptionalScript('fixture', [url], ready, { timeoutMs: 5000 });
    window.__secondOptional = window.__alloLoadOptionalScript('fixture', [url], ready, { timeoutMs: 5000 });
    return window.__firstOptional === window.__secondOptional;
  }, env.local), true);
  await pending.arrival;
  assert.deepEqual(env.requests, [env.local]); pending.release({ body: approved });
  assert.deepEqual(await env.page.evaluate(() => Promise.all([window.__firstOptional, window.__secondOptional])), [true, true]);
  assert.equal((await env.state()).count, 1);
  return { sharedPendingPromise: true, executions: 1 };
});

scenario('terminal optional failures clear deduplication so a later explicit retry can succeed', async env => {
  env.routes.set(env.local, { status: 404 });
  assert.equal(await env.load(), false);
  env.routes.set(env.local, { body: approved });
  assert.equal(await env.load(), true);
  assert.deepEqual(env.requests, [env.local, env.local]);
  assert.equal((await env.state()).count, 1);
  return { retryAfterTerminalFailure: true };
});

scenario('timeout resolves false but retains the original request and blocks racing mirror or retry', async env => {
  const pending = env.hold(env.local);
  await env.page.evaluate(({ url, fallback }) => {
    const ready = () => window.__optionalReady === true;
    window.__timedOptional = window.__alloLoadOptionalScript('fixture', [url, fallback], ready, { timeoutMs: 150 });
    window.__timedOptional.then(value => { window.__settledOptionalResult = value; });
  }, { url: env.local, fallback: mirror });
  await pending.arrival;
  assert.equal(await env.page.evaluate(() => window.__timedOptional), false);
  assert.equal(await env.page.evaluate(({ url, fallback }) =>
    window.__timedOptional === window.__alloLoadOptionalScript('fixture', [url, fallback], () => window.__optionalReady === true, { timeoutMs: 150 }),
  { url: env.local, fallback: mirror }), true);
  assert.deepEqual(env.requests, [env.local]);
  pending.release({ body: approved });
  await env.page.waitForFunction(() => window.__optionalCount === 1);
  assert.equal(await env.page.evaluate(() => window.__settledOptionalResult), false);
  assert.equal(await env.page.evaluate(() => window.__timedOptional), false);
  assert.deepEqual(env.requests, [env.local]);
  return { timedOutResult: false, pendingRetryDeduplicated: true, lateApprovedExecutions: 1, mirrorRequests: 0 };
});

scenario('a timed-out request terminal error permits an explicit retry without an automatic mirror race', async env => {
  const pending = env.hold(env.local);
  await env.page.evaluate(({ url, fallback }) => {
    window.__timedFailure = window.__alloLoadOptionalScript('fixture', [url, fallback], () => window.__optionalReady === true, { timeoutMs: 150 });
  }, { url: env.local, fallback: mirror });
  await pending.arrival;
  assert.equal(await env.page.evaluate(() => window.__timedFailure), false);
  pending.release({ status: 404 });
  await env.page.waitForFunction(() => [...document.scripts].some(script => script.dataset.alloflowOptional === 'fixture' && script.onerror === null));
  assert.deepEqual(env.requests, [env.local]);
  env.routes.set(env.local, { body: approved });
  assert.equal(await env.load(), true);
  assert.deepEqual(env.requests, [env.local, env.local]);
  assert.equal((await env.state()).count, 1);
  return { explicitRetryAfterTimedOutTerminalError: true, mirrorRequests: 0 };
});

scenario('VexFlow uses the verified optional path and announces readiness only after registration', async env => {
  const host = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
  const begin = host.indexOf("if (typeof window !== 'undefined' && typeof document !== 'undefined') {");
  const end = host.indexOf('\nlet doc = ', begin);
  assert(begin >= 0 && end > begin, 'Actual optional-loader browser block must be present');
  const block = host.slice(begin, end);
  assert(block.includes('_alloCreateOptionalBrowserLoader'), 'Actual host must use the verified optional loader');
  // Exercise the actual host's factory/timer wiring rather than retaining the
  // direct factory instance used by the other native acceptance cases.
  await env.page.evaluate(() => { delete window.__alloLoadOptionalScript; delete window.__alloLazyVexFlow; });
  await env.page.addScriptTag({ content: block });
  const pending = env.hold(env.localVex);
  await env.page.evaluate(() => {
    window.__vexReadyEvents = 0;
    window.addEventListener('alloflow:vexflow-ready', () => { window.__vexReadyEvents++; });
    window.__alloLazyVexFlow(); window.__alloLazyVexFlow();
  });
  await pending.arrival;
  assert.equal(await env.page.evaluate(() => window.__vexReadyEvents), 0);
  assert.deepEqual(env.requests, [env.localVex]);
  pending.release({ body: vexflow });
  await env.page.waitForFunction(() => window.__vexReadyEvents > 0);
  assert.equal(await env.page.evaluate(() => window.__vexCount), 1);
  assert.equal(await env.page.evaluate(() => window.Vex.Flow === window.VexFlow), true);
  return { verifiedRegistrationBeforeReady: true, executions: 1 };
});
