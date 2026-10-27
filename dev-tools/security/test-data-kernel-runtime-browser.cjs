'use strict';
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'data_kernel_runtime_integrity.json')));
const policy = fs.readFileSync(path.join(root, 'runtime_graph_delivery_policy.js'), 'utf8');
const host = fs.readFileSync(path.join(root, 'runtime_graph_host.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'data_kernel_loader.js'), 'utf8');
let browser, server, origin;
const evidence = [];
before(async () => {
  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/app/') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Synthetic analytical runtime</title>'); return; }
    const relative = pathname.replace(/^\/app\//, '');
    const record = Object.values(metadata.assets).find(item => item.path === relative);
    if (!record) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': record.kind === 'module' || record.kind === 'worker' ? 'text/javascript' : 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(path.join(root, record.path)).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
  browser = await chromium.launch({ chromiumSandbox: true, ...(executablePath ? { executablePath } : {}) });
});
after(async () => {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  const file = path.resolve(root, process.env.ALLO_DATA_KERNEL_REPORT || 'tmp/private-loader-security-20261024/data-kernel-native.json');
  assert(file.startsWith(root + path.sep), 'report stays inside the selected checkout');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ policySha384: createHash('sha384').update(policy).digest('hex'), evidence }, null, 2));
});
async function open(tamper) {
  const context = await browser.newContext(), external = [];
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (new URL(url).origin !== origin) { external.push(url); return route.abort(); }
    if (tamper && url.endsWith('duckdb-mvp.wasm.part01')) {
      const bytes = fs.readFileSync(path.join(root, 'duckdb-assets/duckdb-mvp.wasm.part01')); bytes[17] ^= 1;
      return route.fulfill({ status: 200, body: bytes, contentType: 'application/octet-stream' });
    }
    return route.continue();
  });
  const page = await context.newPage(); await page.goto(origin + '/app/');
  await page.addScriptTag({ content: policy }); await page.addScriptTag({ content: host });
  await page.evaluate(metadata => {
    window.__createdWorkers = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker { constructor(...args) { super(...args); window.__createdWorkers++; } };
    window._alloInstallRuntimeGraphHost(metadata, window);
  }, metadata);
  await page.addScriptTag({ content: loader });
  return { page, context, external };
}
test('actual DuckDB module, guarded worker and verified three-part WASM execute a local classroom query', { timeout: 180000 }, async () => {
  const { page, context, external } = await open(false);
  try {
    const result = await page.evaluate(async () => {
      const before = AlloDataKernel.diagnostics();
      const result = await AlloDataKernel.queryRows([{ value: 2 }, { value: 5 }], 'SELECT value * 2 AS doubled FROM data ORDER BY value');
      return { before, result, after: AlloDataKernel.diagnostics(), workers: window.__createdWorkers };
    });
    assert.equal(result.before.state, 'idle'); assert.equal(result.after.backend, 'duckdb-wasm');
    assert.deepEqual(result.result.rows, [{ doubled: 4 }, { doubled: 10 }]); assert.equal(result.workers, 1);
    assert.deepEqual(external, []); evidence.push({ name: 'actual-local-query', passed: true, rows: result.result.rows });
  } finally { await context.close(); }
});
test('tampered actual WASM part leaves summaries available and starts no worker or unsigned fallback', { timeout: 180000 }, async () => {
  const { page, context, external } = await open(true);
  try {
    const result = await page.evaluate(async () => {
      const runtime = await AlloDataKernel.ready();
      return { absent: runtime === null, status: AlloDataKernel.diagnostics(), summary: AlloDataKernel.summarize([{ score: 3 }, { score: 5 }]), workers: window.__createdWorkers };
    });
    assert.equal(result.absent, true); assert.match(result.status.error, /digest differs/);
    assert.equal(result.summary.numeric.score.mean, 4); assert.equal(result.workers, 0); assert.deepEqual(external, []);
    evidence.push({ name: 'tampered-part-denied-before-worker', passed: true });
  } finally { await context.close(); }
});
test('closed DuckDB exported worker factory cannot fetch or execute an unreviewed child', { timeout: 180000 }, async () => {
  const { page, context, external } = await open(false);
  try {
    const result = await page.evaluate(async () => {
      const namespace = await window.__alloLoadVerifiedRuntime('duckdb');
      let failure = null;
      try { await namespace.createWorker('https://unreviewed.invalid/child.js'); }
      catch (error) { failure = String(error && error.message || error); }
      return { failure, workers: window.__createdWorkers };
    });
    assert.match(result.failure, /Unreviewed executable runtime dependency/);
    assert.equal(result.workers, 0); assert.deepEqual(external, []);
    evidence.push({ name: 'closed-exported-worker-factory-denies-unknown-code', passed: true });
  } finally { await context.close(); }
});
