#!/usr/bin/env node
// Single-page splitter trace: run _alloOrderTextItems over one corpus page
// with opts.trace and print every split decision, plus per-region face/line
// statistics for classifier work. Rounds 7-10 each rebuilt this as a scratch
// script and threw it away; round 13 makes it permanent.
//
//   node mcp-testing/tools/trace_page.cjs <module.js> <doc-name> <page> [--items]
//
// <doc-name> is a corpus MANIFEST name (e.g. irs-i1040-instructions).
// --items additionally dumps every text item with x/y/w/font for offline study.
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(REPO, 'node_modules', 'playwright'))); }

const argv = process.argv.slice(2);
const modulePath = argv[0];
const docName = argv[1];
const pageNo = Number(argv[2]);
const wantItems = argv.includes('--items');
if (!modulePath || !docName || !pageNo) {
  console.error('usage: trace_page.cjs <module.js> <doc-name> <page> [--items]');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'mcp-testing/corpus/MANIFEST.json'), 'utf8'));
const doc = manifest.documents.find((d) => d.name === docName);
if (!doc) { console.error('unknown doc ' + docName); process.exit(2); }

const CORPUS = path.join(REPO, 'mcp-testing/corpus');
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(String(req.url || '').replace(/^\/+/, '').split('?')[0]);
  const abs = path.join(CORPUS, rel);
  if (!abs.startsWith(CORPUS) || !fs.existsSync(abs)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': fs.statSync(abs).size });
  fs.createReadStream(abs).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  // Establish the localhost ORIGIN first (order_sweep's recipe) so the PDF
  // fetch inside pdf.js is same-origin; from about:blank it is blocked.
  await page.goto(`${origin}/__blank`).catch(() => {});
  await page.setContent('<html></html>');
  await page.addScriptTag({ path: path.join(REPO, 'desktop/mcp/vendor/pdfjs.min.js') });
  await page.addScriptTag({ path: modulePath });
  const workerB64 = fs.readFileSync(path.join(REPO, 'desktop/mcp/vendor/pdf.worker.min.js')).toString('base64');
  const pdfUrl = `${origin}/${doc.file.split(path.sep).join('/')}`;

  const out = await page.evaluate(async ({ workerB64, pdfUrl, pageNo, wantItems }) => {
    const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
    const pg = await pdf.getPage(pageNo);
    const tc = await pg.getTextContent();
    const items = tc.items;
    const trace = [];
    const res = window.__alloOrderTextItems(items, { trace });
    // Per-face composition of the page: item counts, char counts, y-extents.
    const faces = {};
    for (const it of items) {
      const s = String(it.str || '').trim();
      if (!s) continue;
      const f = it.fontName || '?';
      const rec = faces[f] || (faces[f] = { items: 0, chars: 0, yMin: Infinity, yMax: -Infinity, sizes: {} });
      rec.items++; rec.chars += s.length;
      const y = it.transform ? it.transform[5] : 0;
      if (y < rec.yMin) rec.yMin = y;
      if (y > rec.yMax) rec.yMax = y;
      const size = it.transform ? Math.round(Math.abs(it.transform[0]) * 2) / 2 : 0;
      rec.sizes[size] = (rec.sizes[size] || 0) + 1;
    }
    const styles = {};
    for (const key in (tc.styles || {})) {
      styles[key] = { fontFamily: tc.styles[key].fontFamily, ascent: tc.styles[key].ascent };
    }
    return {
      columns: res.columns, gutters: res.gutters, applied: res.applied,
      trace, faces, styles,
      items: wantItems ? items.filter((i) => String(i.str || '').trim()).map((i) => ({
        s: String(i.str).slice(0, 40), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]),
        w: Math.round(i.width || 0), size: Math.round(Math.abs(i.transform[0]) * 2) / 2, f: i.fontName,
      })) : undefined,
    };
  }, { workerB64, pdfUrl, pageNo, wantItems });

  await browser.close();
  server.close();
  console.log(`# ${docName} p${pageNo}: columns=${out.columns} applied=${out.applied} gutters=[${(out.gutters || []).map((g) => Math.round(g)).join(',')}]`);
  console.log('## trace');
  for (const line of out.trace) console.log('  ' + line);
  console.log('## faces (fontName: items/chars yRange sizes)');
  for (const f in out.faces) {
    const r = out.faces[f];
    const fam = (out.styles[f] && out.styles[f].fontFamily) || '?';
    console.log(`  ${f} (${fam}): ${r.items} items / ${r.chars} chars, y ${Math.round(r.yMin)}..${Math.round(r.yMax)}, sizes ${JSON.stringify(r.sizes)}`);
  }
  if (out.items) {
    console.log('## items');
    for (const it of out.items) console.log(`  ${it.y}\t${it.x}\t${it.w}\t${it.size}\t${it.f}\t${it.s}`);
  }
})().catch((err) => { console.error(err); process.exit(1); });
