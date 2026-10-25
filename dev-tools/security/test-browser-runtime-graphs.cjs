#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { assertClosedCode } = require('../build_browser_runtime_graphs.cjs');
const root = path.resolve(__dirname, '../..');
const runtimePolicySource = fs.readFileSync(path.resolve(__dirname, '../../runtime_graph_delivery_policy.js'), 'utf8');
const reportDirectory = path.join(root, 'tmp/private-loader-security-20261024/runtime-staging');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'engine_runtime_integrity.json'), 'utf8'));
const records = [];
let browser, server, origin;

function scenario(name, run) {
  test(name, { timeout: 180000 }, async () => {
    const context = await browser.newContext(), external = [];
    try {
      await context.route('**/*', route => {
        const url = route.request().url();
        if (new URL(url).origin === origin) return route.continue();
        external.push(url); return route.abort('blockedbyclient');
      });
      const page = await context.newPage(); await page.goto(origin);
      await page.addScriptTag({ content: runtimePolicySource });
      const load = graph => page.evaluate(async ({ graph, metadata }) => {
        const policy = window._alloCreateRuntimeGraphDeliveryPolicy(metadata, {
          baseUrl: location.href, isDesktopBundledApp: false, fetch: fetch.bind(window), crypto, Blob, URL,
          Worker, AbortController, TextDecoder, btoa: btoa.bind(window),
          setTimeout: setTimeout.bind(window), clearTimeout: clearTimeout.bind(window), importModule: url => import(url),
        });
        const session = await policy.prepare(graph), runtime = await session.load();
        window.__runtimeSession = session;
        window.__runtimeUrls = session.assets;
        window.__runtimeNamespace = runtime;
        return Object.keys(runtime);
      }, { graph, metadata });
      const result = await run({ page, load });
      assert.deepEqual(external, [], 'Closed runtime must not request executable dependencies or models externally');
      records.push({ scenario: name, passed: true, ...result });
    } catch (error) { records.push({ scenario: name, passed: false, error: String(error.message) }); process.stderr.write(name + ': ' + error.message + '\n'); throw error; }
    finally { await context.close(); }
  });
}

before(async () => {
  const selected = new Set(['piper', 'kokoro', 'transformers331', 'ort121'].flatMap(graph => metadata.graphs[graph].assets));
  for (const id of selected) {
    const asset = metadata.assets[id];
    const bytes = fs.readFileSync(path.join(root, asset.path));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(crypto.createHash('sha384').update(bytes).digest('hex'), asset.sha384);
    if (asset.kind === 'module') assertClosedCode(bytes.toString('utf8'));
  }
  server = http.createServer((request, response) => {
    const name = new URL(request.url, 'http://localhost').pathname.slice(1);
    if (!name) { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Runtime graph fixture</title>'); return; }
    try {
      const asset = Object.values(metadata.assets).find(asset => asset.path === name);
      if (!asset) throw Error('Not a described runtime fixture');
      const bytes = fs.readFileSync(path.join(root, asset.path));
      response.writeHead(200, { 'Content-Type': name.endsWith('.mjs') ? 'application/javascript' : name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(bytes);
    } catch (_) { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
  browser = await chromium.launch(executablePath ? { executablePath } : {});
}, { timeout: 60000 });

after(async () => {
  fs.mkdirSync(reportDirectory, { recursive: true });
  fs.writeFileSync(path.join(reportDirectory, 'browser-runtime-smoke.json'), JSON.stringify({ checkedAt: new Date().toISOString(),
    method: 'Real Chromium through actual runtime_graph_delivery_policy.prepare/load, complete selected graph verified before Blob imports; original synthetic Identity ONNX model only; no downloaded models or weights.',
    policySha384: crypto.createHash('sha384').update(runtimePolicySource).digest('hex'),
    passed: records.length === 9 && records.every(record => record.passed), records }, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

for (const [graph, exports] of Object.entries({ piper: ['predict', 'download', 'TtsSession', '__alloflowConfigureRuntime'],
  kokoro: ['KokoroTTS', 'TextSplitterStream', '__alloflowConfigureRuntime'],
  transformers331: ['pipeline', 'AutoTokenizer', 'Tensor', '__alloflowConfigureRuntime'],
  ort121: ['InferenceSession', 'Tensor', '__alloflowConfigureRuntime'] })) {
  scenario(graph + ' preserves its public exports without model downloads or external runtime code', async ({ load, page }) => {
    const actual = await load(graph);
    for (const name of exports) assert(actual.includes(name), 'Missing runtime export: ' + name);
    return { checkedExports: exports, configured: await page.evaluate(() => typeof window.__runtimeNamespace.__alloflowConfigureRuntime === 'function') };
  });
}

function identityModel() {
  const v = n => { const out = []; do { const b = n & 127; n >>>= 7; out.push(n ? b | 128 : b); } while (n); return out; };
  const field = (id, bytes) => [id * 8 + 2, ...v(bytes.length), ...bytes];
  const text = (id, value) => field(id, [...Buffer.from(value)]);
  const number = (id, n) => [id * 8, ...v(n)];
  const valueInfo = name => [...text(1, name), ...field(2, field(1, [...number(1, 1), ...field(2, field(1, number(1, 1)))]))];
  const node = [...text(1, 'x'), ...text(2, 'y'), ...text(4, 'Identity')];
  const graph = [...field(1, node), ...text(2, 'AlloFlow synthetic identity'), ...field(11, valueInfo('x')), ...field(12, valueInfo('y'))];
  return [...number(1, 8), ...text(2, 'AlloFlow synthetic acceptance'), ...field(7, graph), ...field(8, number(2, 13))];
}

for (const graph of ['piper', 'ort121', 'transformers331', 'kokoro']) scenario(graph + ' runs original synthetic ONNX inference with the verified single-thread WASM backend', async ({ load, page }) => {
  await load(graph);
  const result = await page.evaluate(async model => {
    const ort = window.__runtimeNamespace.__alloflowRuntimeBackend || window.__runtimeNamespace.__runtimeOrt || window.__runtimeNamespace;
    const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'] });
    try {
      const result = await session.run({ x: new ort.Tensor('float32', new Float32Array([42]), [1]) });
      return { output: result.y.data[0], numThreads: ort.env.wasm.numThreads, proxy: ort.env.wasm.proxy };
    } finally { await session.release(); }
  }, identityModel());
  assert.deepEqual(result, { output: 42, numThreads: 1, proxy: false });
  return result;
});

scenario('Piper phonemizer initializes from verified WASM/data without voice model artifacts', async ({ load, page }) => {
  await load('piper');
  const result = await page.evaluate(async () => {
    const output = [], urls = window.__runtimeUrls;
    const module = await window.__runtimeNamespace.__alloflowCreatePhonemizer({ noInitialRun: true,
      print: value => output.push(String(value)), printErr: () => {},
      locateFile: file => file.endsWith('.wasm') ? urls['piper.phonemizer.wasm'] : file.endsWith('.data') ? urls['piper.phonemizer.data'] : file });
    module.callMain(['-l', 'en-us', '--input', JSON.stringify([{ text: 'Hello classroom.' }]), '--espeak_data', '/espeak-ng-data']);
    for (const line of output) { try { const parsed = JSON.parse(line); if (Array.isArray(parsed.phoneme_ids)) return parsed.phoneme_ids.length; } catch (_) {} }
    throw Error('Phonemizer did not produce executed phoneme IDs');
  });
  assert(result > 0);
  return { phonemeIds: result };
});
