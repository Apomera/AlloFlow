#!/usr/bin/env node
'use strict';

// Real-browser smoke test for AlloFlow's vendored Speech Rule Engine assets.
// Remote fallback is disabled, so a pass proves the app can speak math offline.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
};

function serveFile(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  if (pathname === '/sre-smoke.html') {
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end('<!doctype html><meta charset="utf-8"><script src="/sre_loader.js"></script>');
    return;
  }
  const candidate = path.resolve(ROOT, '.' + pathname);
  const relative = path.relative(ROOT, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.readFile(candidate, (error, bytes) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end(error.message);
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(candidate)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(bytes);
  });
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (bundledError) {
    const candidates = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const executablePath of candidates) {
      if (!fs.existsSync(executablePath)) continue;
      try { return await chromium.launch({ headless: true, executablePath }); }
      catch (_) {}
    }
    throw bundledError;
  }
}

async function main() {
  const server = http.createServer(serveFile);
  await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(origin + '/sre-smoke.html');
    await page.waitForFunction(() => window.AlloMathSpeech && window.AlloMathSpeech.toSpeech);

    const result = await page.evaluate(async () => {
      const options = { allowRemoteFallback: false, timeoutMs: 20000 };
      const english = await window.AlloMathSpeech.toSpeech('\\frac{1}{2}', { ...options, lang: 'English' });
      const spanish = await window.AlloMathSpeech.toSpeech('x^2 + 1', { ...options, lang: 'Spanish' });
      const nestedFraction = await window.AlloMathRenderer.renderToString('\\frac{1}{1+\\frac{1}{x}}', options);
      const matrix = await window.AlloMathRenderer.renderToString('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}', { ...options, displayMode: true });
      const mount = document.createElement('div');
      mount.style.cssText = 'max-width:100%;overflow-x:auto';
      mount.innerHTML = nestedFraction + matrix;
      document.body.appendChild(mount);
      return {
        english,
        spanish,
        nestedFraction,
        matrix,
        diagnostics: window.AlloMathSpeech.diagnostics(),
        renderDiagnostics: window.AlloMathRenderer.diagnostics(),
        mathCount: mount.querySelectorAll('math').length,
        fractionCount: mount.querySelectorAll('mfrac').length,
        tableCount: mount.querySelectorAll('mtable').length,
      };
    });

    assert.ok(result.english && /half|divided|over/i.test(result.english), `unexpected English speech: ${result.english}`);
    assert.ok(result.spanish && result.spanish.length > 2, `unexpected Spanish speech: ${result.spanish}`);
    assert.match(result.diagnostics.sreSource, /\/sre-assets\/sre\.js$/);
    assert.match(result.diagnostics.temmlSource, /\/sre-assets\/temml\.min\.js$/);
assert.match(result.diagnostics.mathmapsSource, /\/sre-assets\/mathmaps$/);
    assert.match(result.renderDiagnostics.temmlSource, /\/sre-assets\/temml\.min\.js$/);
    assert.match(result.renderDiagnostics.cssSource, /\/sre-assets\/Temml-Local\.css$/);
    assert.equal(result.renderDiagnostics.role, 'semantic-math-renderer');
    assert.equal(result.mathCount, 2);
    assert.ok(result.fractionCount >= 2, `expected nested fractions, got ${result.fractionCount}`);
    assert.ok(result.tableCount >= 1, 'expected semantic matrix table');
    assert.doesNotMatch(result.nestedFraction + result.matrix, /temml-error|<merror/i);
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));

    console.log('[SRE smoke] PASS');
    console.log('  English:', result.english);
    console.log('  Spanish:', result.spanish);
    console.log('  Rendering: semantic MathML (nested fractions + matrix)');
    console.log('  Assets: local-only');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolveServer) => server.close(resolveServer));
  }
}

main().catch((error) => {
  console.error('[SRE smoke] FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
