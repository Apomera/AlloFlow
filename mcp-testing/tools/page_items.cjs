#!/usr/bin/env node
// Per-ITEM geometry dump: every pdf.js textContent item with its x/y/width,
// font size and bold flag, as JSON. This is the input for reconstructing DRAWN
// tables, where stream order is useless: a two-panel lookup table interleaves
// the left and right panels on every visual line, so pairing cells from
// ordered text produces nonsense. Band the items by y, split by x, and the
// grid comes back exactly.
//
// Usage:
//   node mcp-testing/tools/page_items.cjs <file.pdf> <first> <last> [--out FILE]
//
// Output: {"pages":[{"page":49,"width":612,"height":792,"items":[
//   {"x":48.2,"y":701.5,"w":23.1,"size":6.5,"bold":false,"text":"2,400"}, ...]}]}
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(REPO, 'node_modules', 'playwright'))); }

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const outFile = outIdx >= 0 ? argv[outIdx + 1] : null;
if (outIdx >= 0) argv.splice(outIdx, 2);
const [pdfPath, firstArg, lastArg] = argv;
const first = Number(firstArg || 1);
const last = Number(lastArg || first);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<html></html>');
  await page.addScriptTag({ path: path.join(REPO, 'desktop/mcp/vendor/pdfjs.min.js') });
  const workerB64 = fs.readFileSync(path.join(REPO, 'desktop/mcp/vendor/pdf.worker.min.js')).toString('base64');
  const dataB64 = fs.readFileSync(pdfPath).toString('base64');

  const pages = await page.evaluate(async ({ workerB64, dataB64, first, last }) => {
    const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    const bytes = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const round = (n) => Math.round(n * 10) / 10;
    const result = [];
    for (let p = first; p <= Math.min(last, pdf.numPages); p++) {
      const pg = await pdf.getPage(p);
      const vp = pg.getViewport({ scale: 1 });
      const tc = await pg.getTextContent();
      const styles = tc.styles || {};
      const items = [];
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const fname = (styles[it.fontName] && styles[it.fontName].fontFamily) || it.fontName || '';
        items.push({
          x: round(it.transform[4]),
          y: round(it.transform[5]),
          w: round(it.width || 0),
          size: round(Math.hypot(it.transform[0], it.transform[1])),
          bold: /bold|black|heavy/i.test(fname) || /(^|[+,])B[do]/.test(it.fontName || ''),
          text: it.str,
        });
      }
      result.push({ page: p, width: round(vp.width), height: round(vp.height), items });
    }
    return result;
  }, { workerB64, dataB64, first, last });

  const json = JSON.stringify({ pages }, null, 1) + '\n';
  if (outFile) {
    fs.writeFileSync(outFile, json);
    const n = pages.reduce((a, p) => a + p.items.length, 0);
    console.log(`wrote ${outFile}: ${pages.length} pages, ${n} items`);
  } else {
    process.stdout.write(json);
  }
  await browser.close();
})();
