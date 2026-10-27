#!/usr/bin/env node
'use strict';

// Actual secondary PDF helpers, actual reviewed PDF.js, synthetic text only.
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const policySource = read('runtime_graph_delivery_policy.js');
const hostSource = read('runtime_graph_host.js');
const manifestSource = read('document_runtime_integrity.json');
const manifest = JSON.parse(manifestSource);
const viewSource = read('view_pdf_audit_source.jsx');
const lumenSource = read('stem_lab/stem_tool_lumen.js');
const between = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, 'use actual canonical PDF helper: ' + start);
  return source.slice(a, b);
};
const popupLoader = between(viewSource, '                            function _ensurePdfjs()', '                            function _paneStatus');
const popupUtilities = between(viewSource, '                            function _b64ToBytes(', '                            function _ensurePdfjs()');
const popupStatus = between(viewSource, '                            function _paneStatus', '                            var _cmpPdfDoc');
const popupRenderer = between(viewSource, '                            function _renderPdfInto(', '                            if (_pdfRawB64)');
const lumenLoader = between(lumenSource, '  var _pdfJsLoadPromise = null;', '  var _mammothLoadPromise = null;');
const lumenExtractor = between(lumenSource, '  function extractPdfText(', '  function extractDocxText(');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const records = [], assets = new Map();
for (const id of ['pdfjs.main', 'pdfjs.worker']) {
  const asset = manifest.assets[id];
  assert(asset.path.startsWith('runtime_assets/document/pdfjs-3.11.174/'));
  const file = path.resolve(root, asset.path);
  assert(file.startsWith(root + path.sep));
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, asset.bytes);
  assert.equal(crypto.createHash('sha384').update(bytes).digest('hex'), asset.sha384);
  assets.set('/app/' + asset.path, { id, bytes });
}

function textPdf() {
  const content = 'BT /F1 14 Tf 16 50 Td (Reviewed PDF compatibility) Tj ET\n';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 100] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length ' + Buffer.byteLength(content) + ' >>\nstream\n' + content + 'endstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += (index + 1) + ' 0 obj\n' + body + '\nendobj\n'; });
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => { pdf += String(offset).padStart(10, '0') + ' 00000 n \n'; });
  return Buffer.from(pdf + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
}
let server, browser, browserServer, ownedBrowserProcess, origin, corruptId = null, noSandboxFlag = null;

before(async () => {
  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/app/index.html' || pathname === '/app/popup.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic secondary PDF</title><body><div id="before-pane"></div></body></html>'); return;
    }
    const asset = assets.get(pathname);
    if (!asset) { response.writeHead(404); response.end(); return; }
    const bytes = asset.id === corruptId ? Buffer.from(asset.bytes) : asset.bytes;
    if (asset.id === corruptId) bytes[bytes.length - 1] ^= 1;
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    response.end(bytes);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
  browserServer = await chromium.launchServer(executablePath ? { executablePath, chromiumSandbox: true } : { chromiumSandbox: true });
  ownedBrowserProcess = browserServer.process();
  noSandboxFlag = ownedBrowserProcess.spawnargs.includes('--no-sandbox');
  assert.equal(noSandboxFlag, false, 'native PDF acceptance requires Chromium sandboxing');
  browser = await chromium.connect(browserServer.wsEndpoint());
}, { timeout: 60000 });

async function boundedClose(action, milliseconds) {
  let timer;
  try { return await Promise.race([action(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('owned browser close timeout')), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
async function settleWithin(operation, milliseconds) {
  let timer;
  try { return await Promise.race([Promise.resolve(operation).then(() => true, () => false), new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
after(async () => {
  let teardownPassed = false, forcedBrowserClose = false, teardownError = null;
  try {
    // BrowserServer owns the process. Closing the connected client first can
    // race its protocol shutdown; close the owner once and verify OS exit.
    if (browserServer) await settleWithin(browserServer.close(), 30000);
    const exited = () => ownedBrowserProcess && (ownedBrowserProcess.exitCode !== null || ownedBrowserProcess.signalCode !== null);
    if (ownedBrowserProcess && !exited()) {
      forcedBrowserClose = true;
      const exit = new Promise(resolve => ownedBrowserProcess.once('exit', resolve));
      ownedBrowserProcess.kill('SIGKILL');
      await settleWithin(exit, 5000);
    }
    if (ownedBrowserProcess && !exited()) throw new Error('Owned browser process did not terminate');
    if (server) {
      server.closeAllConnections();
      if (!(await settleWithin(new Promise(resolve => server.close(resolve)), 5000))) throw new Error('Fixture server did not close');
    }
    teardownPassed = true;
  } catch (error) { teardownError = error; }
  finally {
    const report = path.join(root, 'tmp/pdf-private-runtime-security-20261026/browser-results.json');
    fs.mkdirSync(path.dirname(report), { recursive: true });
    fs.writeFileSync(report, JSON.stringify({ checkedAt: new Date().toISOString(),
      method: 'Actual Compare/Lumen source helpers + runtime factory/host; pinned PDF.js; actual sandboxed Chromium; synthetic text PDF; no external requests.',
      sandboxRequested: true, noSandboxFlag,
      policySha256: hash(policySource), hostSha256: hash(hostSource), manifestSha256: hash(manifestSource),
      viewSourceSha256: hash(viewSource), lumenSourceSha256: hash(lumenSource), fixtureSha256: hash(textPdf()), fixtureBytes: textPdf().length,
      teardownPassed, forcedBrowserClose, teardownError: teardownError && teardownError.message,
      teardownState: { exitCode: ownedBrowserProcess && ownedBrowserProcess.exitCode,
        signalCode: ownedBrowserProcess && ownedBrowserProcess.signalCode, fixtureListening: !!(server && server.listening),
        browserConnected: !!(browser && browser.isConnected()) },
      passed: teardownPassed && records.length === 6 && records.every(record => record.passed), records }, null, 2) + '\n');
    process.stdout.write('Secondary PDF browser evidence: ' + report + '\n');
  }
  if (teardownError) { process.stderr.write('Secondary PDF teardown failed: ' + teardownError.stack + '\n'); throw teardownError; }
}, { timeout: 90000 });

async function trackPage(page) {
  await page.evaluate(() => {
    window.__pdfScripts = [];
    const append = document.head.appendChild.bind(document.head);
    document.head.appendChild = function (node) { if (node.tagName === 'SCRIPT' && node.src) __pdfScripts.push(node.src); return append(node); };
  });
}
async function fixture(kind) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const external = [];
  await context.route('**/*', route => {
    const value = route.request().url();
    if (new URL(value).origin === origin || value.startsWith('blob:' + origin + '/')) return route.continue();
    external.push(value); return route.abort('blockedbyclient');
  });
  const parent = await context.newPage();
  await parent.goto(origin + '/app/index.html');
  await parent.addScriptTag({ content: policySource + '\n' + hostSource });
  await parent.evaluate(input => {
    const policy = _alloInstallRuntimeGraphHost(input, window);
    window.__alloConfigureTrustedScript = (script, url) => policy.configureScript(script, url);
    window.__pdfLeaseCount = 0;
    const getAsset = window.__alloGetVerifiedRuntimeAsset;
    Object.defineProperty(window, '__alloGetVerifiedRuntimeAsset', { configurable: true, value: async (graph, binding) => {
      const asset = await getAsset(graph, binding); __pdfLeaseCount++;
      let released = false;
      return { url: asset.url, revoke() { if (!released) { released = true; __pdfLeaseCount--; } return asset.revoke(); } };
    } });
  }, manifest);
  let page = parent;
  if (kind === 'popup') {
    const pending = parent.waitForEvent('popup');
    await parent.evaluate(() => window.open('/app/popup.html', 'secondary-pdf-fixture'));
    page = await pending; await page.waitForLoadState('domcontentloaded');
    await trackPage(page);
    await page.addScriptTag({ content: 'var _pdfjsLibReady=null,_cmpPdfDoc=null;\n' + popupUtilities + popupLoader + popupStatus + popupRenderer
      + '\nfunction _cropCleanup(){}\nwindow.__loadSecondaryPdf=_ensurePdfjs;' });
  } else {
    await trackPage(page);
    await page.addScriptTag({ content: lumenLoader + lumenExtractor + '\nwindow.__loadSecondaryPdf=lazyLoadPdfJs;window.__extractSecondaryPdf=extractPdfText;' });
  }
  return { context, parent, page, external };
}
async function scenario(name, kind, run) {
  const f = await fixture(kind);
  try {
    const details = await run(f);
    assert.deepEqual(f.external, [], 'secondary PDF execution never contacts an external origin');
    records.push({ scenario: name, passed: true, externalRequests: 0, ...details });
  } catch (error) {
    records.push({ scenario: name, passed: false, externalRequests: f.external.length, error: error.message }); throw error;
  } finally { await boundedClose(() => f.context.close(), 7000); corruptId = null; }
}

test('actual Compare popup renders a text PDF through the opener broker and releases on pagehide', { timeout: 60000 }, async () => {
  await scenario('Compare text PDF and pagehide', 'popup', async f => {
    await f.page.evaluate(b64 => _renderPdfInto(b64, 'Original PDF'), textPdf().toString('base64'));
    await f.page.waitForFunction(() => document.querySelectorAll('#before-pane canvas').length === 1 && !document.getElementById('before-pane').textContent.includes('Rendering'), null, { timeout: 30000 });
    const result = await f.page.evaluate(() => {
      const canvas = document.querySelector('canvas'), pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let darkPixels = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 128 && pixels[i + 1] < 128 && pixels[i + 2] < 128) darkPixels++;
      return { width: canvas.width, height: canvas.height, darkPixels, version: window.pdfjsLib.version, scripts: __pdfScripts };
    });
    assert.equal(result.version, '3.11.174'); assert.equal(result.width, 240); assert.equal(result.height, 100); assert(result.darkPixels > 50);
    assert.equal(result.scripts.length, 1); assert(result.scripts[0].startsWith('blob:'));
    assert.equal(await f.parent.evaluate(() => __pdfLeaseCount), 1);
    await f.page.evaluate(() => dispatchEvent(new Event('pagehide')));
    assert.equal(await f.parent.evaluate(() => __pdfLeaseCount), 0);
    return { version: result.version, width: result.width, height: result.height, darkPixels: result.darkPixels, leaseCountAfterPagehide: 0 };
  });
});

test('actual Lumen parser extracts text using the reviewed 3.11 pair and releases on pagehide', { timeout: 60000 }, async () => {
  await scenario('Lumen text PDF and pagehide', 'lumen', async f => {
    const result = await f.page.evaluate(async bytes => {
      const pdfjs = await __loadSecondaryPdf();
      const extraction = await __extractSecondaryPdf(pdfjs, new Uint8Array(bytes).buffer);
      return { version: pdfjs.version, extraction, scripts: __pdfScripts };
    }, Array.from(textPdf()));
    assert.equal(result.version, '3.11.174');
    assert.deepEqual(result.extraction, { pages: [{ pageNum: 1, text: 'Reviewed PDF compatibility' }], notes: [] });
    assert.equal(result.scripts.length, 1); assert(result.scripts[0].startsWith(origin + '/app/runtime_assets/document/pdfjs-3.11.174/'));
    assert.equal(await f.parent.evaluate(() => __pdfLeaseCount), 1);
    await f.page.evaluate(() => dispatchEvent(new Event('pagehide')));
    assert.equal(await f.parent.evaluate(() => __pdfLeaseCount), 0);
    return { version: result.version, extraction: result.extraction, leaseCountAfterPagehide: 0 };
  });
});

for (const kind of ['popup', 'lumen']) for (const id of ['pdfjs.main', 'pdfjs.worker']) {
  test(kind + ' rejects altered ' + id + ' before executable script insertion', { timeout: 60000 }, async () => {
    corruptId = id;
    await scenario(kind + ' tampered ' + id, kind, async f => {
      const result = await f.page.evaluate(async () => {
        try { await __loadSecondaryPdf(); return { rejected: false }; }
        catch (error) { return { rejected: true, code: error.code, scripts: __pdfScripts.slice() }; }
      });
      assert.equal(result.rejected, true); assert.equal(result.code, 'ALLO_RUNTIME_INTEGRITY'); assert.deepEqual(result.scripts, []);
      assert.equal(await f.parent.evaluate(() => __pdfLeaseCount), 0);
      return { rejected: true, code: result.code, executableScripts: 0, leases: 0 };
    });
  });
}
