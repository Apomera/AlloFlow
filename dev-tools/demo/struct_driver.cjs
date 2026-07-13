// Headless driver for pdfbox_structural_repair.html — boots the co-load window and reports
// window.__done (the PDFBox+veraPDF heavy-repair-fallback proof). Serves C:\tmp with range
// support (CheerpJ fetches jars via byte ranges).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = 'C:\\tmp', PORT = 8021;
const CT = { '.html': 'text/html', '.jar': 'application/java-archive', '.pdf': 'application/pdf', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/pdfbox_structural_repair.html';
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
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('[struct]')) console.log('  ' + t.slice(9)); });
  page.on('pageerror', (e) => console.log('[pageerror] ' + e.message));
  await page.goto('http://localhost:' + PORT + '/pdfbox_structural_repair.html', { waitUntil: 'load', timeout: 60000 });
  console.log('[driver] booting co-load window (this loads two jars — give it a minute)…');
  try { await page.waitForFunction(() => window.__done !== null, { timeout: 540000 }); }
  catch (e) { console.log('[driver] ⚠ timed out waiting for result'); await browser.close(); server.close(); process.exit(1); }
  const d = await page.evaluate(() => window.__done);
  console.log('\n[driver] RESULT: ' + JSON.stringify(d));
  await browser.close(); server.close();
  process.exit(d && d.ok ? 0 : 1);
})();
