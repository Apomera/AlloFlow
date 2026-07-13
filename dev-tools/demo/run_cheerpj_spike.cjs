/*
 * run_cheerpj_spike.cjs — runs the CheerpJ boot test (Stage 1) headlessly so a
 * human doesn't have to. Serves cheerpj_verapdf_spike.html over http, opens it
 * in headless Chromium (Playwright), clicks Stage 1, and reports:
 *   - did the CheerpJ WASM JVM initialize?  (the make-or-break signal)
 *   - did Java actually execute? (java.version)
 *   - how big was the CheerpJ download, and how long did it take?
 *
 * NOTE: headless Chromium != Gemini Canvas's sandboxed iframe. A pass here means
 * "CheerpJ runs in a standard Chromium" (strong positive); Canvas still needs a
 * separate confirmation. A fail here likely kills the approach outright.
 *
 * Usage:  node dev-tools/demo/run_cheerpj_spike.cjs [--coi]
 *   --coi : serve with cross-origin isolation (COOP + COEP:credentialless) in
 *           case CheerpJ needs SharedArrayBuffer. Try without first.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const DEMO_DIR = __dirname;
const PORT = 8013;
const COI = process.argv.includes('--coi');

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/cheerpj_verapdf_spike.html';
  const fp = path.join(DEMO_DIR, p);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(fp);
    const ct = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : 'application/octet-stream';
    const headers = { 'Content-Type': ct };
    if (COI) { headers['Cross-Origin-Opener-Policy'] = 'same-origin'; headers['Cross-Origin-Embedder-Policy'] = 'credentialless'; }
    res.writeHead(200, headers);
    res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  console.log('[spike] static server up on http://localhost:' + PORT + (COI ? '  (cross-origin isolated)' : ''));

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.log('[spike] BROWSER LAUNCH FAILED: ' + e.message);
    console.log('[spike] If it says the executable is missing, run:  npx playwright install chromium');
    server.close(); process.exit(2); return;
  }

  const page = await (await browser.newContext()).newPage();
  const logs = [];
  const cdnResponses = [];
  page.on('console', (m) => logs.push('[console.' + m.type() + '] ' + m.text()));
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
  page.on('response', (r) => {
    if (/leaningtech|cjrtnc/.test(r.url())) {
      const len = parseInt(r.headers()['content-length'] || '0', 10);
      cdnResponses.push({ kb: Math.round(len / 1024), url: r.url().slice(-58) });
    }
  });

  console.log('[spike] loading harness…');
  await page.goto('http://localhost:' + PORT + '/cheerpj_verapdf_spike.html', { waitUntil: 'load', timeout: 60000 });
  console.log('[spike] clicking Stage 1 (boot CheerpJ + run Java)…');
  const t0 = Date.now();
  await page.click('#btnStage1');

  let timedOut = false;
  try {
    await page.waitForFunction(() => {
      const t = document.getElementById('logStage1').textContent || '';
      return /STAGE 1 VERDICT|STAGE 1 FAILED/.test(t);
    }, { timeout: 180000 });
  } catch (e) { timedOut = true; }

  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  const log = await page.$eval('#logStage1', (el) => el.textContent);

  // Resource-timing sizes (transferSize can be 0 cross-origin without TAO; CDN content-length is the fallback)
  const perf = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource').filter((r) => /leaningtech|cjrtnc/.test(r.name));
    const totalKb = Math.round(res.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) / 1024);
    return { count: res.length, totalKb };
  });
  const cdnHeaderKb = cdnResponses.reduce((s, r) => s + r.kb, 0);

  console.log('\n===== STAGE 1 ON-PAGE LOG =====\n' + log);
  if (timedOut) console.log('\n[spike] ⚠ TIMED OUT after 180s waiting for a verdict — CheerpJ may be too slow to init headless, or stuck.');
  console.log('\n===== CheerpJ DOWNLOAD (leaningtech CDN) =====');
  console.log('wall time to verdict : ~' + wall + 's');
  console.log('CDN requests         : ' + cdnResponses.length);
  console.log('size (resource-timing): ~' + perf.totalKb + ' KB   (often 0 cross-origin — see content-length)');
  console.log('size (content-length) : ~' + cdnHeaderKb + ' KB');
  cdnResponses.sort((a, b) => b.kb - a.kb).slice(0, 10).forEach((r) => console.log('   ' + r.kb + ' KB   …' + r.url));
  console.log('\n===== CONSOLE / PAGE ERRORS (first 50) =====');
  console.log(logs.slice(0, 50).join('\n') || '(none)');

  await browser.close();
  server.close();
})();
