// Headless test of the WIRED structural fallback in verapdf_validator.html's remediate()
// (Plan A: PDFBox co-loaded at boot). Builds an untagged fixture with a non-embedded font (fails
// 6.2t1/7.1t11/7.1t3/7.21.4.1), runs window.__remediate at the SAFE DEFAULT (Artifact-wrap OFF), and
// asserts it embeds the font + scaffolds structure but does NOT hide content as /Artifact (P1 safety).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = 'C:\\tmp', PORT = 8023;
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
  console.log('[test] booting validator window (co-loads veraPDF + PDFBox)…');
  try { await page.waitForFunction(() => /ready/.test(document.getElementById('status').textContent), { timeout: 240000 }); }
  catch (e) { console.log('[test] ⚠ boot timed out'); await browser.close(); server.close(); process.exit(1); }
  console.log('[test] ready — building an untagged fixture + running the wired closed loop…');

  const result = await page.evaluate(async () => {
    const { PDFDocument, PDFName, PDFString, PDFBool, rgb } = window.PDFLib;
    const src = await PDFDocument.create();
    src.setTitle('Decorative Test Document');
    const pg = src.addPage([612, 792]);
    pg.drawRectangle({ x: 100, y: 600, width: 400, height: 100, color: rgb(0.8, 0.8, 0.92) }); // unmarked content
    const helv = await src.embedFont(window.PDFLib.StandardFonts.Helvetica); // base-14 = NON-embedded → fails 7.21.4.1
    pg.drawText('The quick brown fox jumps over the lazy dog.', { x: 72, y: 700, size: 14, font: helv });
    const cat = src.catalog;
    cat.set(PDFName.of('Lang'), PDFString.of('en'));
    const vp = src.context.obj({}); vp.set(PDFName.of('DisplayDocTitle'), PDFBool.True); cat.set(PDFName.of('ViewerPreferences'), vp);
    const xmp = '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Decorative Test Document</rdf:li></rdf:Alt></dc:title><pdfuaid:part>1</pdfuaid:part></rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>';
    const ms = src.context.stream(xmp, { Type: PDFName.of('Metadata'), Subtype: PDFName.of('XML') });
    cat.set(PDFName.of('Metadata'), src.context.register(ms));
    return await window.__remediate(await src.save(), 5);
  });

  console.log('\n[test] REMEDIATION RESULT — compliant: ' + result.compliant);
  for (const s of result.log) console.log('  iter ' + s.iter + ': ' + s.failedRules + ' failed (' + (s.rules.join(', ') || 'none') + ')' + (s.applied ? ' → ' + s.applied.join('; ') : '') + (s.structError ? ' [structErr: ' + s.structError + ']' : ''));
  const flat = result.log.flatMap((s) => s.applied || []);
  const usedScaffold = flat.some((a) => /StructTreeRoot/.test(a));
  const usedFont = flat.some((a) => /NotoSans|7\.21\.4\.1/.test(a));
  const usedArtifact = flat.some((a) => /Artifact/.test(a));
  const fontRuleGone = !((result.verdict && result.verdict.failedRules) || []).some((f) => f.clause === '7.21.4.1');
  // SAFE DEFAULT (P1): the loop embeds fonts + scaffolds structure, but must NOT auto-wrap content as
  // /Artifact — so a fully-untagged TEXT doc is never silently "passed" by hiding its text.
  const ok = usedScaffold && usedFont && fontRuleGone && !usedArtifact && !result.compliant;
  console.log(ok ? '\n✅ SAFE DEFAULT VERIFIED — embedded the font + scaffolded structure, did NOT hide content as /Artifact (honest partial; content-marking is opt-in).'
                 : '\n⚠ unexpected: usedScaffold=' + usedScaffold + ' usedFont=' + usedFont + ' fontRuleGone=' + fontRuleGone + ' usedArtifact=' + usedArtifact + ' compliant=' + result.compliant);
  await browser.close(); server.close();
  process.exit(ok ? 0 : 1);
})();
