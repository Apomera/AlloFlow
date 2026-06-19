// Headless test of verapdf_client.js (the AlloFlow-side driver) via opener.html:
// warm up the validator (iframe mode) + validate small.pdf through the postMessage protocol.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = 'C:\\tmp', PORT = 8016;
const CT = { '.html': 'text/html', '.jar': 'application/java-archive', '.pdf': 'application/pdf', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/opener.html';
  const fp = path.join(ROOT, p);
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('nf'); return; }
    const ct = CT[path.extname(fp)] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = parseInt(m[1], 10);
      const end = Math.min(m[2] ? parseInt(m[2], 10) : st.size - 1, st.size - 1);
      res.writeHead(206, { 'Content-Type': ct, 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size, 'Content-Length': end - start + 1 });
      fs.createReadStream(fp, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': ct, 'Accept-Ranges': 'bytes', 'Content-Length': st.size });
      fs.createReadStream(fp).pipe(res);
    }
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const cons = [];
  page.on('console', (m) => cons.push(m.text()));
  page.on('pageerror', (e) => cons.push('[pageerror] ' + e.message));
  await page.goto('http://localhost:' + PORT + '/opener.html', { waitUntil: 'load', timeout: 60000 });
  console.log('[test] driving warm-up + validate via the driver…');
  try {
    await page.waitForFunction(() => window.__done != null, { timeout: 200000 });
    console.log('[test] DONE: ' + JSON.stringify(await page.evaluate(() => window.__done), null, 2));
  } catch (e) { console.log('[test] ⚠ timed out waiting for driver result'); }
  console.log('\n[test] opener log:\n' + cons.filter((c) => c.indexOf('[opener]') === 0).join('\n'));
  console.log('\n[test] other tail:\n' + cons.filter((c) => c.indexOf('[opener]') !== 0).slice(-6).join('\n'));
  await browser.close(); server.close();
})();
