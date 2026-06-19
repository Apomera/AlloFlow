/*
 * run_verapdf_stage2.cjs — headless Stage 2: actually run veraPDF on a PDF via
 * CheerpJ and capture its validation report. Serves C:\tmp (so verapdf-cli.jar
 * and sample.pdf appear under /app/ in CheerpJ's FS) with HTTP Range support
 * (CheerpJ does range reads on big jars), opens stage2.html headless, and dumps
 * veraPDF's console output + timing.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = 'C:\\tmp';
const PORT = 8014;
const ARGS = process.env.VPDF_ARGS || '';                 // e.g. "--help"  (pipe-separated for multiple)
const WAIT = parseInt(process.env.VPDF_WAIT || '240000', 10);
const PAGE = process.env.VPDF_PAGE || 'stage2.html';

const CT = { '.html': 'text/html', '.jar': 'application/java-archive', '.pdf': 'application/pdf', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/stage2.html';
  const fp = path.join(ROOT, p);
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    const ct = CT[path.extname(fp)] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = parseInt(m[1], 10);
      const end = Math.min(m[2] ? parseInt(m[2], 10) : st.size - 1, st.size - 1); // clamp past-EOF ranges
      res.writeHead(206, {
        'Content-Type': ct,
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
        'Content-Length': (end - start + 1),
      });
      fs.createReadStream(fp, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': ct, 'Accept-Ranges': 'bytes', 'Content-Length': st.size });
      fs.createReadStream(fp).pipe(res);
    }
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  console.log('[stage2] server up on http://localhost:' + PORT + ' (root=' + ROOT + ')');
  for (const f of ['stage2.html', 'verapdf-cli.jar', 'sample.pdf']) {
    console.log('   ' + (fs.existsSync(path.join(ROOT, f)) ? '✓' : '✗ MISSING') + ' ' + f);
  }

  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch (e) { console.log('[stage2] launch failed: ' + e.message); server.close(); process.exit(2); return; }

  const page = await (await browser.newContext()).newPage();
  const cons = [];
  page.on('console', (m) => cons.push(m.text()));
  page.on('pageerror', (e) => cons.push('[pageerror] ' + e.message));

  const url = 'http://localhost:' + PORT + '/' + PAGE + (ARGS ? '?args=' + encodeURIComponent(ARGS) : '');
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  console.log('[stage2] page loaded (' + url + '); waiting up to ' + (WAIT / 1000) + 's…');

  let done = null;
  try {
    await page.waitForFunction(() => window.__done !== null, { timeout: WAIT });
    done = await page.evaluate(() => window.__done);
  } catch (e) { console.log('[stage2] ⚠ TIMED OUT (>240s) waiting for veraPDF to finish.'); }

  console.log('\n===== veraPDF CONSOLE OUTPUT (the validation report) =====');
  console.log(cons.join('\n') || '(no console output)');
  console.log('\n===== RESULT =====');
  console.log(done ? JSON.stringify(done) : '(no result — timed out or crashed)');

  await browser.close();
  server.close();
})();
