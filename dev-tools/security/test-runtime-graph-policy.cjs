#!/usr/bin/env node
'use strict';

// Native acceptance of the actual graph policy, using only original synthetic
// runtime bytes and a loopback fixture. No engine, model or CDN is downloaded.
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const { minify } = require(require.resolve('terser', { paths: [root, path.join(root, 'desktop/web-app')] }));
const policySource = fs.readFileSync(path.join(root, 'runtime_graph_delivery_policy.js'), 'utf8');
const evidence = [];
let server, browser, origin, minifiedPolicy;
const hash = value => createHash('sha384').update(value).digest('hex');
const wasm42 = Buffer.from([0,97,115,109,1,0,0,0,1,5,1,96,0,1,127,3,2,1,0,7,10,1,6,97,110,115,119,101,114,0,0,10,6,1,4,0,65,42,11]);

function fixture() {
  const assets = {}, bodies = {};
  const add = (id, kind, body, extras = {}) => {
    const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const extension = kind === 'wasm' ? 'wasm' : kind === 'part' ? 'part' : kind === 'data' ? 'json' : 'js';
    const pathname = 'runtime_assets/fixture/' + id + '.' + extension;
    assets[id] = { kind, path: pathname, bytes: bytes.length, sha384: hash(bytes), mirrors: [], ...(['module','worker'].includes(kind) ? { closed: true } : {}), ...extras };
    bodies['/' + pathname] = bytes;
    return id;
  };
  add('entry', 'module', 'globalThis.__syntheticExecuted=(globalThis.__syntheticExecuted||0)+1;export const answer=42;export function configure(a){if(!Object.isFrozen(a))throw Error("mutable bindings");globalThis.__syntheticConfigured=true;}');
  add('worker', 'worker', 'self.__approvedWorker=(self.__approvedWorker||0)+1;');
  add('child', 'worker', 'postMessage({answer:42});');
  add('wasm', 'wasm', wasm42);
  const composite = wasm42;
  add('partA', 'part', composite.subarray(0, 11));
  add('partB', 'part', composite.subarray(11));
  assets.composite = { kind: 'wasm', path: null, bytes: composite.length, sha384: hash(composite), mirrors: [], parts: ['partA','partB'] };
  assets.entry.dependencies = ['wasm', 'worker', 'child', 'composite'];
  return { input: { schemaVersion: 1, assets, graphs: { fixture: { assets: Object.keys(assets), entry: 'entry', configureExport: 'configure', bindings: { wasm: 'wasm' } } } }, bodies, add };
}

before(async () => {
  minifiedPolicy = (await minify(policySource, { ecma: 2020, compress: { passes: 2 }, mangle: true })).code;
  server = http.createServer((request, response) => {
    if (new URL(request.url, 'http://localhost').pathname !== '/') { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('<!doctype html><title>Synthetic runtime graph acceptance</title>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
  browser = await chromium.launch(executablePath ? { executablePath } : {});
}, { timeout: 60000 });

after(async () => {
  const report = path.join(root, 'tmp/private-loader-security-20261024/runtime-graph-policy-native.json');
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, JSON.stringify({ checkedAt: new Date().toISOString(),
    method: 'Actual runtime_graph_delivery_policy.js, real Chromium with sandbox enabled, original synthetic JS/WASM/parts only; loopback fixture and denied external sentinels.',
    policySha384: hash(policySource), minifiedPolicySha384: hash(minifiedPolicy || ''), passed: evidence.length === 16 && evidence.every(record => record.passed), cases: evidence }, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  process.stdout.write('Native graph evidence: ' + report + '\n');
});

function scenario(name, run, minifiedFactory = false) {
  test(name, { timeout: 25000 }, async () => {
    const context = await browser.newContext(), data = fixture(), external = [], requested = [];
    let holdPath, releaseHeld, heldArrived;
    const arrived = new Promise(resolve => { heldArrived = resolve; });
    const held = new Promise(resolve => { releaseHeld = resolve; });
    try {
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) { external.push(url.href); return route.abort('blockedbyclient'); }
        requested.push(url.pathname);
        if (Object.hasOwn(data.bodies, url.pathname)) {
          if (url.pathname === holdPath) { heldArrived(); await held; }
          return route.fulfill({ status: 200, headers: { 'Content-Type': url.pathname.endsWith('.wasm') ? 'application/wasm' : 'application/javascript', 'Cache-Control': 'no-store' }, body: data.bodies[url.pathname] });
        }
        return route.continue();
      });
      const page = await context.newPage(); await page.goto(origin);
      await page.addScriptTag({ content: minifiedFactory ? minifiedPolicy : policySource });
      const setup = (desktop = false, nativeIntegrity = false) => page.evaluate(({ input, desktop, nativeIntegrity }) => {
        window.__nativeFetchBefore = window.fetch; window.__nativeWorkerBefore = window.Worker;
        window.__policy = _alloCreateRuntimeGraphDeliveryPolicy(input, {
          baseUrl: location.href, isDesktopBundledApp: desktop, fetch: fetch.bind(window), crypto: nativeIntegrity ? null : crypto, allowNativeIntegrity: nativeIntegrity, Blob, URL, Worker,
          AbortController, TextDecoder, btoa: btoa.bind(window), setTimeout: setTimeout.bind(window), clearTimeout: clearTimeout.bind(window), importModule: url => import(url),
        });
      }, { input: data.input, desktop, nativeIntegrity });
      const result = await run({ page, data, setup, external, requested,
        hold: pathname => { holdPath = pathname; return { arrived, release: releaseHeld }; } });
      assert.deepEqual(external, [], 'Unknown executable URLs must be denied before any external request');
      evidence.push({ name, passed: true, factory: minifiedFactory ? 'terser-compress-and-mangle' : 'source', ...result });
    } catch (error) { evidence.push({ name, passed: false, error: error.message }); throw error; }
    finally { releaseHeld(); await context.close(); }
  });
}

scenario('complete selected graph verifies before the first module side effect', async ({ page, data, setup, hold }) => {
  const barrier = hold('/' + data.input.assets.partB.path); await setup();
  await page.evaluate(() => { window.__pendingLoad = __policy.prepare('fixture').then(session => session.load()); });
  await barrier.arrived;
  assert.equal(await page.evaluate(() => window.__syntheticExecuted || 0), 0);
  barrier.release();
  assert.equal(await page.evaluate(async () => (await __pendingLoad).answer), 42);
  assert.equal(await page.evaluate(() => window.__syntheticConfigured), true);
  return { withheldPartPreventedExecution: true };
});

for (const id of ['entry', 'worker', 'wasm', 'partB']) scenario('altered ' + id + ' bytes deny the entire graph before execution', async ({ page, data, setup }) => {
  const pathname = '/' + data.input.assets[id].path, changed = Buffer.from(data.bodies[pathname]); changed[changed.length - 1] ^= 1;
  data.bodies[pathname] = changed; await setup();
  const result = await page.evaluate(async () => {
    try { await (await __policy.prepare('fixture')).load(); return { denied: false }; }
    catch (error) { return { denied: error.code === 'ALLO_RUNTIME_INTEGRITY', executed: window.__syntheticExecuted || 0 }; }
  });
  assert.deepEqual(result, { denied: true, executed: 0 }); return result;
});

scenario('verified module, composed chunks, WASM and classic worker execute natively', async ({ page, data, setup }) => {
  data.input.graphs.fixture.scripts = ['worker']; await setup();
  const result = await page.evaluate(async () => {
    const session = await __policy.prepare('fixture'), main = await session.load();
    const composite = await WebAssembly.instantiate(await (await fetch(session.assets.composite)).arrayBuffer());
    const wasm = await WebAssembly.instantiate(await (await fetch(session.assets.wasm)).arrayBuffer());
    const worker = session.createWorker('postMessage({approved:self.__approvedWorker});');
    const reply = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Worker fixture timeout')), 5000); worker.onmessage = event => { clearTimeout(timer); resolve(event.data); }; worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); }; });
    worker.terminate(); session.dispose();
    return { module: main.answer, composite: composite.instance.exports.answer(), wasm: wasm.instance.exports.answer(), worker: reply.approved };
  });
  assert.deepEqual(result, { module: 42, composite: 42, wasm: 42, worker: 1 }); return result;
});

scenario('worker denies unknown importScripts, Worker, WASM fetch and Blob URLs before requests', async ({ page, setup }) => {
  await setup();
  const result = await page.evaluate(async () => {
    const session = await __policy.prepare('fixture');
    const worker = session.createWorker(`(async()=>{const results={};
      try{importScripts('https://unreviewed.invalid/worker.js')}catch(e){results.scripts=/Unreviewed executable/.test(e.message)}
      try{new Worker('https://unreviewed.invalid/child.js')}catch(e){results.worker=/Unreviewed executable/.test(e.message)}
      try{await fetch('https://unreviewed.invalid/runtime.wasm')}catch(e){results.wasm=/Unreviewed executable/.test(e.message)}
      const unapproved=URL.createObjectURL(new Blob(['postMessage(13)'],{type:'text/javascript'}));
      try{new Worker(unapproved)}catch(e){results.blob=/Unreviewed executable/.test(e.message)}finally{URL.revokeObjectURL(unapproved)}
      postMessage(results)})()`);
    try { return await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Worker deny fixture timeout')), 5000); worker.onmessage = event => { clearTimeout(timer); resolve(event.data); }; worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); }; }); }
    finally { worker.terminate(); session.dispose(); }
  });
  assert.deepEqual(result, { scripts: true, worker: true, wasm: true, blob: true }); return result;
});

scenario('module capabilities remain lexical when a second graph loads', async ({ page, data, setup }) => {
  data.add('mappingA', 'data', '{"graph":"a"}'); data.add('mappingB', 'data', '{"graph":"b"}');
  for (const letter of ['A','B']) {
    const id = 'module' + letter, mapping = 'mapping' + letter;
    data.add(id, 'module', 'export function mapping(){return __alloRuntimeAssets.logical;}export const original=__alloRuntimeAssets.logical;', { dependencies: [mapping] });
    data.input.graphs[letter] = { assets: [mapping, id], entry: id, bindings: { logical: mapping } };
  }
  await setup();
  const result = await page.evaluate(async () => {
    const aSession = await __policy.prepare('A'), a = await aSession.load();
    const bSession = await __policy.prepare('B'), b = await bSession.load();
    return { aStable: a.mapping() === a.original, bStable: b.mapping() === b.original, separate: a.original !== b.original,
      globalUntouched: !Object.hasOwn(window, '__alloRuntimeAssets'), fetchUntouched: fetch === __nativeFetchBefore, workerUntouched: Worker === __nativeWorkerBefore };
  });
  assert.deepEqual(result, { aStable: true, bStable: true, separate: true, globalUntouched: true, fetchUntouched: true, workerUntouched: true }); return result;
});

scenario('worker recognizes approved prepared Blob URLs while retaining WASM guards', async ({ page, setup }) => {
  await setup();
  const result = await page.evaluate(async () => {
    const session = await __policy.prepare('fixture');
    const worker = session.createWorker(`(async()=>{const instance=await WebAssembly.instantiate(await(await fetch(__alloRuntimeAssets.wasm)).arrayBuffer());
      const child=new Worker(__alloRuntimeAssets.child);child.onmessage=e=>{postMessage({wasm:instance.instance.exports.answer(),child:e.data.answer});child.terminate()};child.onerror=e=>{throw Error(e.message)}})()`);
    try { return await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Approved child fixture timeout')), 5000); worker.onmessage = event => { clearTimeout(timer); resolve(event.data); }; worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); }; }); }
    finally { worker.terminate(); session.dispose(); }
  });
  assert.deepEqual(result, { wasm: 42, child: 42 }); return result;
});

scenario('worker imports a verified module and preserves its guarded runtime operations', async ({ page, setup }) => {
  await setup();
  const result = await page.evaluate(async () => {
    const session = await __policy.prepare('fixture');
    const worker = session.createWorker(`(async()=>{const module=await __alloRuntimeImport('entry');const composite=await WebAssembly.instantiate(await(await fetch(__alloRuntimeAssets.composite)).arrayBuffer());let denied=false;
      try{await fetch('https://unreviewed.invalid/after-module.wasm')}catch(e){denied=/Unreviewed executable/.test(e.message)}postMessage({answer:module.answer,assembled:composite.instance.exports.answer(),denied})})()`);
    try { return await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Worker module fixture timeout')), 5000); worker.onmessage = event => { clearTimeout(timer); resolve(event.data); }; worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); }; }); }
    finally { worker.terminate(); session.dispose(); }
  });
  assert.deepEqual(result, { answer: 42, assembled: 42, denied: true }); return result;
});

scenario('one asset lease cannot revoke a second consumer of the same verified graph', async ({ page, setup }) => {
  await setup();
  const result = await page.evaluate(async () => {
    const session = await __policy.prepare('fixture'), first = session.asset('wasm'), second = session.asset('wasm');
    first.revoke(); first.revoke();
    const response = await fetch(second.url), bytes = await response.arrayBuffer(); second.revoke();
    return { bytes: bytes.byteLength, sameUrl: first.url === second.url };
  });
  assert.deepEqual(result, { bytes: wasm42.length, sameUrl: true }); return result;
});

scenario('Desktop failure refuses every external executable fallback', async ({ page, data, setup, requested }) => {
  delete data.bodies['/' + data.input.assets.entry.path]; await setup(true);
  const denied = await page.evaluate(async () => { try { await __policy.prepare('fixture'); return false; } catch (error) { return error.code === 'ALLO_RUNTIME_INTEGRITY'; } });
  assert.equal(denied, true);
  assert.equal(requested.filter(value => value === '/' + data.input.assets.entry.path).length, 1);
  return { denied, externalRequests: 0 };
});

scenario('production-minified approved nested worker inherits unknown executable guards', async ({ page, data, setup }) => {
  const body = Buffer.from(`(async()=>{const result={};try{importScripts('https://unreviewed.invalid/nested.js')}catch(e){result.scripts=/Unreviewed executable/.test(e.message)}
    try{new Worker('https://unreviewed.invalid/nested-child.js')}catch(e){result.worker=/Unreviewed executable/.test(e.message)}
    try{await fetch('https://unreviewed.invalid/nested.wasm')}catch(e){result.wasm=/Unreviewed executable/.test(e.message)}postMessage(result)})()`);
  const asset = data.input.assets.child; data.bodies['/' + asset.path] = body; asset.bytes = body.length; asset.sha384 = hash(body);
  await setup();
  const result = await page.evaluate(async () => {
    const session = await __policy.prepare('fixture'), worker = session.createWorker(`const child=new Worker(__alloRuntimeAssets.child);child.onmessage=e=>{postMessage(e.data);child.terminate()};child.onerror=e=>{throw Error(e.message)};`);
    try { return await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Nested worker fixture timeout')), 5000); worker.onmessage = event => { clearTimeout(timer); resolve(event.data); }; worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); }; }); }
    finally { worker.terminate(); session.dispose(); }
  });
  assert.deepEqual(result, { scripts: true, worker: true, wasm: true }); return result;
}, true);

scenario('composed JavaScript is denied by schema before any byte fetch', async ({ data, setup, requested }) => {
  data.input.assets.composite.kind = 'module'; data.input.assets.composite.closed = true;
  await assert.rejects(setup(), /only WebAssembly may be composed/);
  assert.equal(requested.some(value => value.startsWith('/runtime_assets/')), false);
  return { denied: true };
});

scenario('HTTP LAN native integrity verifies the graph when WebCrypto is unavailable', async ({ page, setup }) => {
  await setup(false, true);
  const result = await page.evaluate(async () => { const session = await __policy.prepare('fixture'); const main = await session.load(); session.dispose(); return { answer: main.answer, executed: window.__syntheticExecuted }; });
  assert.deepEqual(result, { answer: 42, executed: 1 }); return result;
});

scenario('HTTP LAN native integrity blocks changed bytes without WebCrypto', async ({ page, data, setup }) => {
  const asset = data.input.assets.worker, changed = Buffer.from(data.bodies['/' + asset.path]); changed[changed.length - 1] ^= 1; data.bodies['/' + asset.path] = changed;
  await setup(false, true);
  const result = await page.evaluate(async () => { try { await (await __policy.prepare('fixture')).load(); return { denied: false }; } catch (error) { return { denied: error.code === 'ALLO_RUNTIME_INTEGRITY', executed: window.__syntheticExecuted || 0 }; } });
  assert.deepEqual(result, { denied: true, executed: 0 }); return result;
});
