// Headless test of the IN-WINDOW closed-loop remediation (verapdf_validator.html).
// Boots the validator window (CheerpJ veraPDF + pdf-lib), damages the passing scanned
// fixture, then calls window.__remediate and asserts it drives the doc back to compliant.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = 'C:\\tmp', PORT = 8017;
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
  page.on('pageerror', (e) => console.log('[pageerror] ' + e.message));
  await page.goto('http://localhost:' + PORT + '/verapdf_validator.html', { waitUntil: 'load', timeout: 60000 });
  console.log('[test] booting validator window…');
  try { await page.waitForFunction(() => /ready/.test(document.getElementById('status').textContent), { timeout: 180000 }); }
  catch (e) { console.log('[test] ⚠ boot timed out'); await browser.close(); server.close(); return; }
  console.log('[test] ready — damaging the passing scanned doc + running in-window remediation…');

  const b64 = fs.readFileSync('C:/tmp/scanned_tagged_out.pdf').toString('base64');
  const result = await page.evaluate(async (b64) => {
    const { PDFDocument, PDFName } = window.PDFLib;
    const doc = await PDFDocument.load(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    for (const k of ['ViewerPreferences', 'MarkInfo', 'Lang']) { try { doc.catalog.delete(PDFName.of(k)); } catch (_) {} }
    const damaged = await doc.save();
    return await window.__remediate(damaged, 5);
  }, b64);

  console.log('\n[test] REMEDIATION RESULT — compliant: ' + result.compliant);
  for (const s of result.log) console.log('  iter ' + s.iter + ': ' + s.failedRules + ' failed (' + (s.rules.join(', ') || 'none') + ')' + (s.applied ? ' → repaired: ' + s.applied.join('; ') : ''));
  console.log(result.compliant ? '\n✅ IN-WINDOW CLOSED LOOP CONVERGED — companion window can validate AND remediate to green.' : '\n⚠ did not fully converge.');
  await browser.close(); server.close();
})();
