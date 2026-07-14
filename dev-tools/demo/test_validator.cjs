// Headless test of verapdf_validator.html: boot + warm-up, then pick small.pdf
// and confirm it returns a structured rule-level report.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = 'C:\\tmp', PORT = 8015;
const CT = { '.html': 'text/html', '.jar': 'application/java-archive', '.pdf': 'application/pdf', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/verapdf_validator.html';
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
  await page.goto('http://localhost:' + PORT + '/verapdf_validator.html', { waitUntil: 'load', timeout: 60000 });
  console.log('[test] waiting for validator to boot + warm up…');
  try {
    await page.waitForFunction(() => /ready|Boot failed/.test(document.getElementById('status').textContent), { timeout: 180000 });
  } catch (e) { console.log('[test] ⚠ boot timed out'); }
  const status = await page.$eval('#status', (e) => e.textContent);
  console.log('[test] status after boot: ' + status);
  if (/ready/.test(status)) {
    console.log('[test] picking small.pdf…');
    await page.setInputFiles('#pick', 'C:\\tmp\\small.pdf');
    try {
      await page.waitForFunction(() => window.__lastResult != null, { timeout: 120000 });
      const r = await page.evaluate(() => window.__lastResult);
      console.log('[test] status: ' + (await page.$eval('#status', (e) => e.textContent)));
      console.log('[test] RESULT: ' + JSON.stringify(r, null, 2));
      console.log('[test] RENDERED: ' + (await page.$eval('#report', (e) => e.textContent)));
    } catch (e) { console.log('[test] ⚠ validation timed out'); }
  }
  console.log('\n[test] console tail:\n' + cons.slice(-12).join('\n'));
  await browser.close(); server.close();
})();
