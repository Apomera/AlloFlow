#!/usr/bin/env node
// Corpus-wide READING ORDER sweep. Rounds 7 and 8 were measured this way but
// the script was never kept, so each engine change re-derived it; this is that
// harness made permanent.
//
//   node mcp-testing/tools/order_sweep.cjs <module.js> <out.json> [--only <name>] [--max-pages N]
//
// For every page of every corpus document it records the column count the
// splitter chose and a BIGRAM AGREEMENT score between two independent
// extractions of the same page:
//
//   * the column-aware text layer (pdf.js items -> _alloOrderTextItems ->
//     _alloJoinOrderedTextItems), which is what the change under test affects;
//   * the content-stream text (__alloCsPageTexts), which is produced by
//     walking the page's own drawing operators and knows nothing about the
//     splitter.
//
// WHY BIGRAMS AND NOT A DIFF. A reading-order defect does not change WHICH
// words a page has, only which words end up ADJACENT — interleaving two
// columns preserves every token and destroys most of the pairs. Counting
// shared adjacent pairs therefore measures exactly the thing being fixed and
// ignores the whitespace and hyphenation differences between the two
// extractors, which a diff would drown in.
//
// READ THE SCORES AS DELTAS, NEVER AS GRADES. Content-stream order is the
// order the page was DRAWN, which for most publishing tools is reading order
// but is not guaranteed to be — some documents draw all rules first, or emit a
// sidebar last. So a low absolute score can mean the referee is wrong rather
// than the splitter. What a low score cannot do is move when the splitter
// improves, which is why only the before/after difference is evidence.
//
// The corpus PDFs are served over a throwaway localhost server rather than
// inlined as base64. Base64 costs 4/3 the bytes as a JS string PLUS the decoded
// copy, and the 77MB NIST handbook killed the browser outright; fetching an
// ArrayBuffer in the page keeps one copy. Each document also gets its own
// browser, so a document that does manage to exhaust memory costs its own row
// and not the rest of the sweep.
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
const outPath = argv[1];
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const maxPages = argv.includes('--max-pages') ? Number(argv[argv.indexOf('--max-pages') + 1]) : Infinity;

if (!modulePath || !outPath) {
  console.error('usage: order_sweep.cjs <module.js> <out.json> [--only name] [--max-pages N]');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'mcp-testing/corpus/MANIFEST.json'), 'utf8'));
const docs = manifest.documents.filter((d) => !only || d.name === only);

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
  const results = {};
  for (const doc of docs) {
    const pdfPath = path.join(CORPUS, doc.file);
    if (!fs.existsSync(pdfPath)) { console.error(`  ! missing ${doc.file}`); continue; }
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`${origin}/__blank`).catch(() => {});
    await page.setContent('<html></html>');
    await page.addScriptTag({ path: path.join(REPO, 'desktop/mcp/vendor/pdfjs.min.js') });
    await page.addScriptTag({ path: modulePath });
    const workerB64 = fs.readFileSync(path.join(REPO, 'desktop/mcp/vendor/pdf.worker.min.js')).toString('base64');
    const pdfUrl = `${origin}/${doc.file.split(path.sep).join('/')}`;
    let rows;
    try {
      rows = await page.evaluate(async ({ workerB64, pdfUrl, maxPages }) => {
        const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const bytes = new Uint8Array(await (await fetch(pdfUrl)).arrayBuffer());
        const csPages = await window.__alloCsPageTexts(bytes.slice());
        const pdf = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
        const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
        const bigrams = (toks) => {
          const m = new Map();
          for (let i = 0; i + 1 < toks.length; i++) {
            const k = toks[i] + ' ' + toks[i + 1];
            m.set(k, (m.get(k) || 0) + 1);
          }
          return m;
        };
        const out = [];
        const last = Math.min(pdf.numPages, maxPages);
        for (let p = 1; p <= last; p++) {
          const tc = await (await pdf.getPage(p)).getTextContent();
          const ordered = window.__alloOrderTextItems(tc.items || [], {});
          const text = window.__alloJoinOrderedTextItems(ordered.items, ordered.rtl);
          const a = bigrams(norm(text));
          const b = bigrams(norm(csPages && csPages[p - 1]));
          let shared = 0, totalB = 0;
          for (const [k, v] of b) { totalB += v; shared += Math.min(v, a.get(k) || 0); }
          out.push({
            page: p,
            cols: ordered.columns || 1,
            applied: !!ordered.applied,
            agree: totalB ? +(shared / totalB).toFixed(5) : null,
            csBigrams: totalB,
          });
        }
        return out;
      }, { workerB64, pdfUrl, maxPages });
    } catch (err) {
      console.error(`  ! ${doc.name}: ${String(err && err.message || err).slice(0, 200)}`);
      rows = null;
    }
    await browser.close().catch(() => {});
    if (rows) {
      results[doc.name] = rows;
      const scored = rows.filter((r) => r.agree !== null);
      const mean = scored.length ? scored.reduce((s, r) => s + r.agree, 0) / scored.length : 0;
      console.error(`  ${doc.name}: ${rows.length} pages, mean agree ${mean.toFixed(4)}`);
    }
  }
  server.close();
  fs.writeFileSync(outPath, JSON.stringify({ module: modulePath, results }, null, 1) + '\n');
  console.error(`wrote ${outPath}`);
})();
