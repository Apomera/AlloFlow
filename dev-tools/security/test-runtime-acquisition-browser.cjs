#!/usr/bin/env node
'use strict';
// Original synthetic bytes only. Real Chromium Response/ReadableStream,
// SubtleCrypto and native ES imports; the 60-second deadline clock is controlled.
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const { minify } = require(require.resolve('terser', { paths: [root, path.join(root, 'desktop/web-app')] }));
const source = fs.readFileSync(path.join(root, 'runtime_graph_delivery_policy.js'), 'utf8');
const hash = bytes => createHash('sha384').update(bytes).digest('hex');
const records = [];
let browser, browserServer, server, origin, minified;
async function settleWithin(operation, milliseconds) {
  let timer;
  try { return await Promise.race([Promise.resolve(operation).then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

before(async () => {
  minified = (await minify(source, { ecma: 2020, compress: { passes: 2 }, mangle: true })).code;
  server = http.createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); response.end('<!doctype html><title>Runtime acquisition fixture</title>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
  browserServer = await chromium.launchServer({ chromiumSandbox: true, ...(executablePath ? { executablePath } : {}) });
  browser = await chromium.connect(browserServer.wsEndpoint());
}, { timeout: 60000 });

after(async () => {
  let forcedBrowserClose = false;
  if (browser) await settleWithin(browser.close(), 3000);
  if (browserServer && !(await settleWithin(browserServer.close(), 3000))) {
    forcedBrowserClose = true;
    if (!(await settleWithin(browserServer.kill(), 3000))) throw Error('Owned browser server did not terminate');
  }
  if (server) { server.closeAllConnections(); if (!(await settleWithin(new Promise(resolve => server.close(resolve)), 3000))) throw Error('Fixture server did not close'); }
  const report = path.join(root, 'tmp/runtime-security-20261026/runtime-acquisition-native.json');
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, JSON.stringify({ checkedAt: new Date().toISOString(), policySha384: hash(source), minifiedPolicySha384: hash(minified || ''),
    method: 'Sandboxed real Chromium; actual Response/ReadableStream/native SubtleCrypto/native ES imports; original synthetic bytes only; controlled acquisition-deadline callbacks; no engine/model downloads.',
    forcedBrowserClose, passed: records.length === 10 && records.every(record => record.passed), records }, null, 2) + '\n');
  process.stdout.write('Acquisition evidence: ' + report + '\n');
}, { timeout: 15000 });

function scenario(name, options, run) {
  test(name, { timeout: 20000 }, async () => {
    const context = await browser.newContext(), external = [];
    try {
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (!/^https?:$/.test(url.protocol) || url.origin === origin) return route.continue();
        external.push(url.href); return route.abort('blockedbyclient');
      });
      const page = await context.newPage(); await page.goto(origin + '/app/index.html');
      await page.addScriptTag({ content: options.minified ? minified : source });
      const body = (options.topLevelAwait ? 'globalThis.__nativeImportStarted=true;await new Promise(done=>{globalThis.__releaseImport=done});' : '')
        + 'globalThis.__executions=(globalThis.__executions||0)+1;export const answer=42;export async function configure(assets){globalThis.__configurations=(globalThis.__configurations||0)+1;if(!Object.isFrozen(assets))throw Error("mutable assets");if(globalThis.__holdConfiguration)await new Promise(done=>{globalThis.__releaseConfiguration=done});}';
      const bytes = Buffer.from(body), wasm = [0,97,115,109,1,0,0,0];
      const manifest = { schemaVersion: 1, assets: {
        entry: { kind: 'module', path: 'runtime/entry.js', bytes: bytes.length, sha384: hash(bytes), mirrors: [], closed: true, dependencies: ['wasm'] },
        wasm: { kind: 'wasm', path: 'runtime/engine.wasm', bytes: wasm.length, sha384: hash(Buffer.from(wasm)), mirrors: [] },
      }, graphs: { fixture: { assets: ['entry','wasm'], entry: 'entry', configureExport: 'configure' } } };
      await page.evaluate(({ manifest, body, wasm, options }) => {
        const nativeFetch = fetch.bind(window), nativeDigest = crypto.subtle.digest.bind(crypto.subtle), nativeUrl = URL;
        window.__events = []; window.__revoked = []; window.__made = []; window.__imports = 0; window.__fetches = 0;
        window.__mode = options.mode; window.__holdConfiguration = !!options.holdConfiguration;
        const timers = new Map(); let timerId = 0, stalledOnce = false;
        window.__fireDeadline = () => { const first = timers.entries().next().value; if (!first) throw Error('No acquisition deadline pending'); first[1](); };
        const response = (payload, settings = {}) => new Response(new ReadableStream({
          start(controller) { if (payload) controller.enqueue(new TextEncoder().encode(payload)); if (!settings.open) controller.close(); },
          cancel() { window.__events.push('cancel:' + (settings.label || 'body')); return settings.cancel === 'never' ? new Promise(() => {}) : settings.cancel === 'reject' ? Promise.reject(Error('cancel rejected')) : undefined; },
        }), { status: settings.status || 200 });
        const fixtureFetch = async (url, request) => {
          window.__fetches++; window.__events.push('fetch:' + url);
          request.signal?.addEventListener('abort', () => window.__events.push('abort:' + url));
          if (url === new URL('runtime/entry.js', location.href).href && /^http-error/.test(window.__mode)) {
            return response('untrusted error body', { status: 503, open: true, label: 'primary', cancel: window.__mode.slice(11) });
          }
          if (window.__mode === 'stalled-fetch' && !stalledOnce) { stalledOnce = true; window.__fetchStarted = true; return new Promise(done => { window.__releaseFetch = () => done(response(body)); }); }
          if (window.__mode === 'stalled-reader' && !stalledOnce) { stalledOnce = true; window.__readerStarted = true; return response(null, { open: true, label: 'stalled-reader', cancel: 'never' }); }
          return url.endsWith('.wasm') ? new Response(new Uint8Array(wasm)) : response(body);
        };
        window.__policy = _alloCreateRuntimeGraphDeliveryPolicy(manifest, {
          baseUrl: location.href, fetch: fixtureFetch, crypto: { subtle: { digest: async (...args) => {
            if (window.__mode === 'stalled-hash' && !stalledOnce) { stalledOnce = true; window.__hashStarted = true; await new Promise(done => { window.__releaseHash = done; }); }
            return nativeDigest(...args);
          } } }, Blob, AbortController,
          URL: { createObjectURL(blob) { const url = nativeUrl.createObjectURL(blob); window.__made.push(url); return url; }, revokeObjectURL(url) { window.__revoked.push(url); nativeUrl.revokeObjectURL(url); } },
          setTimeout(callback, duration) { if (duration !== 60000) throw Error('Unexpected acquisition duration'); const id = ++timerId; timers.set(id, callback); return id; },
          clearTimeout(id) { timers.delete(id); }, importModule(url) { window.__imports++; return import(url); },
        });
        window.__start = () => { window.__operation = __policy.prepare('fixture').then(session => { window.__session = session; return session.load(); }); window.__operation.catch(() => {}); };
        window.__outcome = () => window.__operation.then(value => ({ answer: value.answer }), error => ({ denied: error.code === 'ALLO_RUNTIME_INTEGRITY', timeout: error.runtimeTimeout === true }));
        window.__nativeFetch = nativeFetch;
      }, { manifest, body, wasm, options });
      const result = await run(page);
      assert.deepEqual(external, []); records.push({ name, passed: true, factory: options.minified ? 'terser-compress-and-mangle' : 'source', ...result });
    } catch (error) { records.push({ name, passed: false, error: error.message }); throw error; }
    finally { await context.close(); }
  });
}

for (const mode of ['resolve','reject','never']) scenario('HTTP error body cleanup ' + mode + ' cannot block approved fallback', { mode: 'http-error-' + mode }, async page => {
  await page.evaluate(() => __start());
  const result = await page.evaluate(async () => ({ outcome: await __outcome(), events: __events, configured: __configurations }));
  assert.deepEqual(result.outcome, { answer: 42 }); assert.equal(result.configured, 1);
  const primary = result.events.find(value => value.startsWith('fetch:')), fallback = result.events.findIndex(value => value.startsWith('fetch:') && value !== primary);
  assert(result.events.indexOf('cancel:primary') >= 0 && result.events.indexOf('cancel:primary') < fallback);
  assert(result.events.indexOf(primary.replace('fetch:', 'abort:')) >= 0 && result.events.indexOf(primary.replace('fetch:', 'abort:')) < fallback);
  await page.evaluate(() => __session.dispose()); return { completedFallback: true, cancelledBeforeFallback: true, abortedBeforeFallback: true };
});

for (const mode of ['stalled-fetch','stalled-reader','stalled-hash']) scenario(mode + ' has a terminal hard deadline and permits an explicit clean retry', { mode }, async page => {
  await page.evaluate(() => __start());
  const flag = mode === 'stalled-fetch' ? '__fetchStarted' : mode === 'stalled-reader' ? '__readerStarted' : '__hashStarted';
  await page.waitForFunction(flag => window[flag] === true, flag, { timeout: 5000 });
  await page.evaluate(() => __fireDeadline());
  assert.deepEqual(await page.evaluate(() => __outcome()), { denied: true, timeout: true });
  assert.deepEqual(await page.evaluate(() => ({ fetches: __fetches, imports: __imports, executions: window.__executions || 0 })), { fetches: 1, imports: 0, executions: 0 });
  await page.evaluate(async () => { window.__mode = 'normal'; if (window.__releaseFetch) __releaseFetch(); if (window.__releaseHash) __releaseHash(); await new Promise(done => setTimeout(done, 0)); });
  assert.equal(await page.evaluate(() => __imports), 0);
  await page.evaluate(() => __start()); assert.deepEqual(await page.evaluate(() => __outcome()), { answer: 42 });
  await page.evaluate(() => __session.dispose()); return { timeoutTerminal: true, explicitRetry: true };
});

scenario('dispose before import microtask prevents native import', {}, async page => {
  const result = await page.evaluate(async () => { const session = await __policy.prepare('fixture'); window.__operation = session.load(); __operation.catch(() => {}); session.dispose(); return { outcome: await __outcome(), imports: __imports, configured: window.__configurations || 0 }; });
  assert.deepEqual(result, { outcome: { denied: true, timeout: false }, imports: 0, configured: 0 }); return result;
});

scenario('dispose during actual top-level-await import retains URLs and refuses configuration', { topLevelAwait: true }, async page => {
  await page.evaluate(() => __start()); await page.waitForFunction(() => window.__nativeImportStarted === true, { timeout: 5000 });
  const before = await page.evaluate(() => { __session.dispose(); return { made: __made.length, revoked: __revoked.length }; });
  assert.equal(before.made, 2); assert.equal(before.revoked, 0);
  await page.evaluate(() => __releaseImport()); assert.deepEqual(await page.evaluate(() => __outcome()), { denied: true, timeout: false });
  assert.deepEqual(await page.evaluate(() => ({ configured: window.__configurations || 0, revoked: __revoked.length })), { configured: 0, revoked: 2 });
  return { heldDuringNativeImport: true, configuredAfterClose: false };
});

scenario('minified concurrent loads configure once and reject their closed result', { minified: true, holdConfiguration: true }, async page => {
  await page.evaluate(async () => { window.__session = await __policy.prepare('fixture'); window.__one = __session.load(); window.__two = __session.load(); __one.catch(() => {}); __two.catch(() => {}); });
  await page.waitForFunction(() => typeof window.__releaseConfiguration === 'function', { timeout: 5000 });
  assert.deepEqual(await page.evaluate(() => { __session.dispose(); return { configured: __configurations, imports: __imports, revoked: __revoked.length }; }), { configured: 1, imports: 1, revoked: 0 });
  const result = await page.evaluate(async () => { __releaseConfiguration(); const closed = await Promise.all([__one, __two].map(value => value.then(() => false, error => error.code === 'ALLO_RUNTIME_INTEGRITY'))); return { closed, revoked: __revoked.length }; });
  assert.deepEqual(result, { closed: [true,true], revoked: 2 }); return result;
});

scenario('a separate asset consumer retains real Blob bytes after closing import settles', { topLevelAwait: true, minified: true }, async page => {
  await page.evaluate(async () => { window.__session = await __policy.prepare('fixture'); window.__lease = __session.asset('wasm'); window.__operation = __session.load(); __operation.catch(() => {}); });
  await page.waitForFunction(() => window.__nativeImportStarted === true, { timeout: 5000 });
  await page.evaluate(() => { __session.dispose(); __releaseImport(); }); assert.deepEqual(await page.evaluate(() => __outcome()), { denied: true, timeout: false });
  const result = await page.evaluate(async () => { const bytes = await (await __nativeFetch(__lease.url)).arrayBuffer(); const before = __revoked.length; __lease.revoke(); __lease.revoke(); return { bytes: bytes.byteLength, before, after: __revoked.length }; });
  assert.deepEqual(result, { bytes: 8, before: 0, after: 2 }); return result;
});
