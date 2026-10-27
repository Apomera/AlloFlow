#!/usr/bin/env node
'use strict';

// Actual document code and WASM, synthetic content only. No traineddata/models.
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const policySource = fs.readFileSync(path.join(root, 'runtime_graph_delivery_policy.js'), 'utf8');
const manifestSource = fs.readFileSync(path.join(root, 'document_runtime_integrity.json'), 'utf8');
const manifest = JSON.parse(manifestSource);
const docSource = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const start = docSource.indexOf('  const _alloOcrRasterWorkerSource = function () {');
const end = docSource.indexOf('  // Returns a controller', start);
assert(start >= 0 && end > start, 'use the actual canonical raster protocol');
const protocolContext = vm.createContext({});
vm.runInContext(docSource.slice(start, end) + '\nthis.protocol=_alloOcrRasterWorkerSource();', protocolContext);
const rasterProtocol = protocolContext.protocol;
assert(!/importScripts|https?:\/\//.test(rasterProtocol), 'document messages cannot select executable URLs');

const bodies = new Map(), records = [];
for (const [id, record] of Object.entries(manifest.assets)) {
  assert(record.path?.startsWith('runtime_assets/document/'), 'only owned document assets');
  const file = path.resolve(root, record.path);
  assert(file.startsWith(root + path.sep));
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, record.bytes);
  assert.equal(crypto.createHash('sha384').update(bytes).digest('hex'), record.sha384);
  bodies.set('/app/' + record.path, { id, bytes, kind: record.kind });
  bodies.set('/' + record.path, { id, bytes, kind: record.kind });
}
let server, browser, origin, corruptId = null;

function syntheticPdf() {
  const content = 'q\nQ\n';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Resources << >> /Contents 4 0 R >>',
    '<< /Length ' + Buffer.byteLength(content) + ' >>\nstream\n' + content + 'endstream'];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += (index + 1) + ' 0 obj\n' + body + '\nendobj\n'; });
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 5\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => { pdf += String(offset).padStart(10, '0') + ' 00000 n \n'; });
  return Buffer.from(pdf + 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
}

before(async () => {
  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/app/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="en"><title>Synthetic document runtime</title><body></body></html>');
      return;
    }
    const asset = bodies.get(pathname);
    if (!asset) { response.writeHead(404); response.end(); return; }
    const bytes = asset.id === corruptId ? Buffer.from(asset.bytes) : asset.bytes;
    if (asset.id === corruptId) bytes[bytes.length - 1] ^= 1;
    response.writeHead(200, { 'Content-Type': asset.kind === 'wasm' ? 'application/wasm' : 'text/javascript; charset=utf-8',
      'X-Content-Type-Options': 'nosniff' });
    response.end(bytes);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(candidate => candidate && fs.existsSync(candidate));
  browser = await chromium.launch({ chromiumSandbox: true, ...(executablePath ? { executablePath } : {}) });
}, { timeout: 60000 });

after(async () => {
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  const report = path.resolve(root, process.env.ALLO_DOC_RUNTIME_REPORT || 'tmp/document-runtime-security-20261024/browser-results.json');
  assert(report.startsWith(root + path.sep), 'report stays inside the selected checkout');
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, JSON.stringify({ checkedAt: new Date().toISOString(),
    method: 'Actual runtime_graph_delivery_policy factory; pinned document code/WASM; real Chromium; loopback synthetic PDF; no traineddata or models.',
    policySha256: crypto.createHash('sha256').update(policySource).digest('hex'),
    manifestSha256: crypto.createHash('sha256').update(manifestSource).digest('hex'),
    canonicalSourceSha256: crypto.createHash('sha256').update(docSource).digest('hex'),
    passed: records.length === 6 && records.every(record => record.passed), records }, null, 2) + '\n');
  process.stdout.write('Document runtime browser evidence: ' + report + '\n');
});

async function fixture({ withoutCrypto = false } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const external = [];
  await context.route('**/*', async route => {
    const value = route.request().url();
    if (new URL(value).origin === origin || value.startsWith('blob:' + origin + '/')) return route.continue();
    external.push(value); return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  await page.goto(origin + '/app/index.html');
  await page.addScriptTag({ content: policySource });
  await page.evaluate(({ input, withoutCrypto }) => {
    window.__nativeWorkers = 0; window.__runtimeBlobs = 0; window.__runtimeCodeBlobs = 0;
    const NativeWorker = window.Worker;
    window.__policy = _alloCreateRuntimeGraphDeliveryPolicy(input, {
      baseUrl: location.href, isDesktopBundledApp: true,
      fetch: window.fetch.bind(window), crypto: withoutCrypto ? null : window.crypto, Blob: window.Blob,
      allowNativeIntegrity: withoutCrypto,
      URL: { createObjectURL(blob) { window.__runtimeBlobs++; if (/javascript/.test(blob.type)) window.__runtimeCodeBlobs++; return URL.createObjectURL(blob); }, revokeObjectURL: URL.revokeObjectURL.bind(URL) },
      Worker: function (url, options) { window.__nativeWorkers++; return new NativeWorker(url, options); },
      AbortController, TextDecoder, btoa: window.btoa.bind(window), setTimeout, clearTimeout,
      importModule: value => import(value),
    });
  }, { input: manifest, withoutCrypto });
  return { context, page, external };
}

async function scenario(name, run, options) {
  const f = await fixture(options);
  try {
    const evidence = await run(f.page);
    assert.deepEqual(f.external, [], 'no executable, traineddata or model request may escape the local fixture');
    records.push({ scenario: name, passed: true, externalRequests: 0, ...evidence });
  } catch (error) {
    records.push({ scenario: name, passed: false, externalRequests: f.external.length, error: String(error.message) }); throw error;
  } finally { await f.context.close(); corruptId = null; }
}

async function rasterSmoke(page) {
  const result = await page.evaluate(async ({ protocol, bytes }) => {
    const session = await __policy.prepare('pdfjs-raster');
    const worker = session.createWorker(protocol + '\nself.postMessage({t:"runtime-version",version:pdfjsLib.version});', { name: 'synthetic-document-raster' });
    let version;
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('actual PDF worker timeout')), 30000);
        worker.onerror = error => { clearTimeout(timeout); reject(new Error(error.message || 'PDF worker error')); };
        worker.onmessage = ({ data }) => {
          if (data.t === 'runtime-version') version = data.version;
          if (data.t === 'init-error' || data.t === 'render-error') { clearTimeout(timeout); reject(new Error(data.message)); }
          if (data.t === 'ready') worker.postMessage({ t: 'render', id: 1, page: 1, scale: 1 });
          if (data.t === 'rendered') { clearTimeout(timeout); resolve({ version, width: data.width, height: data.height,
            pngBytes: data.buf.byteLength, pngHeader: Array.from(new Uint8Array(data.buf).slice(0, 8)), workers: __nativeWorkers }); }
        };
        const input = new Uint8Array(bytes);
        worker.postMessage({ t: 'init', buf: input.buffer }, [input.buffer]);
      });
    } finally { worker.terminate(); session.dispose(); }
  }, { protocol: rasterProtocol, bytes: Array.from(syntheticPdf()) });
  assert.equal(result.version, '3.11.174');
  assert.equal(result.width, 72); assert.equal(result.height, 72); assert(result.pngBytes > 64);
  assert.deepEqual(result.pngHeader, [137, 80, 78, 71, 13, 10, 26, 10]);
  return result;
}

for (const withoutCrypto of [false, true]) {
  test('actual paired PDF.js raster uses ' + (withoutCrypto ? 'native SRI without SubtleCrypto' : 'SubtleCrypto'), { timeout: 90000 },
    () => scenario('paired PDF.js raster ' + (withoutCrypto ? 'native-SRI' : 'SubtleCrypto'), rasterSmoke, { withoutCrypto }));
}

test('actual Tesseract bootstrap initializes native core/version without traineddata', { timeout: 120000 }, () => scenario('Tesseract native core', async page => {
  const result = await page.evaluate(async () => {
    const session = await __policy.prepare('tesseract');
    const protocol = '__alloRuntimeImportScripts("tess.bootstrap");\n'
      + 'Promise.resolve(self.TesseractCore({})).then(function(module){let api;try{'
      + 'api=new module.TessBaseAPI();const version=api.Version();'
      + 'const pointer=module._malloc(8);if(!Number.isSafeInteger(pointer)||pointer<=0)throw Error("native allocation failed");'
      + 'module.HEAPU8[pointer]=79;const heapValue=module.HEAPU8[pointer];module._free(pointer);'
      + 'module.FS.writeFile("/alloflow-synthetic.txt",new Uint8Array([79,75]));'
      + 'const bytes=module.FS.readFile("/alloflow-synthetic.txt");module.FS.unlink("/alloflow-synthetic.txt");'
      + 'self.postMessage({t:"native-ready",version:String(version),nativeAllocation:true,heapValue,fsBytes:Array.from(bytes)});'
      + '}catch(error){self.postMessage({t:"native-error",message:String(error.message)})}'
      + 'finally{if(api&&typeof module.destroy==="function")module.destroy(api)}})'
      + '.catch(function(error){self.postMessage({t:"native-error",message:String(error.message)})});';
    const worker = session.createWorker(protocol, { name: 'synthetic-tesseract-native' });
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('actual Tesseract core timeout')), 60000);
        worker.onerror = error => { clearTimeout(timeout); reject(new Error(error.message || 'Tesseract worker error')); };
        worker.onmessage = ({ data }) => {
          if (data.t === 'native-error') { clearTimeout(timeout); reject(new Error(data.message)); }
          if (data.t === 'native-ready') { clearTimeout(timeout); resolve({ ...data, workers: __nativeWorkers }); }
        };
      });
    } finally { worker.terminate(); session.dispose(); }
  });
  assert.match(result.version, /^5\./);
  assert.equal(result.nativeAllocation, true); assert.equal(result.heapValue, 79);
  assert.deepEqual(result.fsBytes, [79, 75]);
  return result;
}));

for (const [id, graph] of [['pdfjs.worker', 'pdfjs-raster'], ['tess.wasm-simd-lstm', 'tesseract']]) {
  test('changed ' + id + ' prevents all Blob/worker creation', { timeout: 90000 }, async () => {
    corruptId = id;
    return scenario('tampered ' + id, async page => {
      const result = await page.evaluate(async name => {
        try { await __policy.prepare(name); return { rejected: false }; }
        catch (error) { return { rejected: true, code: error.code, workers: __nativeWorkers, blobs: __runtimeBlobs }; }
      }, graph);
      assert.equal(result.rejected, true); assert.equal(result.code, 'ALLO_RUNTIME_INTEGRITY');
      assert.equal(result.workers, 0); assert.equal(result.blobs, 0);
      return result;
    });
  });
}

test('native SRI without SubtleCrypto rejects altered code before executable Blob creation', { timeout: 90000 }, async () => {
  corruptId = 'pdfjs.worker';
  return scenario('tampered PDF worker native-SRI', async page => {
    const result = await page.evaluate(async () => {
      try { await __policy.prepare('pdfjs-raster'); return { rejected: false }; }
      catch (error) { return { rejected: true, code: error.code, workers: __nativeWorkers, executableBlobs: __runtimeCodeBlobs }; }
    });
    assert.equal(result.rejected, true); assert.equal(result.code, 'ALLO_RUNTIME_INTEGRITY');
    assert.equal(result.workers, 0); assert.equal(result.executableBlobs, 0);
    return result;
  }, { withoutCrypto: true });
});
