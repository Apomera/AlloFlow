#!/usr/bin/env node
// Per-ITEM geometry dump: every pdf.js textContent item with its x/y/width,
// font size and display-face flag, as JSON. This is the input for reconstructing DRAWN
// tables, where stream order is useless: a two-panel lookup table interleaves
// the left and right panels on every visual line, so pairing cells from
// ordered text produces nonsense. Band the items by y, split by x, and the
// grid comes back exactly.
//
// Usage:
//   node mcp-testing/tools/page_items.cjs <file.pdf> <first> <last> [--out FILE]
//
// Output: {"pages":[{"page":49,"width":612,"height":792,"items":[
//   {"x":48.2,"y":701.5,"w":23.1,"size":6.5,"face":"g_d0_f1","fam":"serif",
//    "display":false,"text":"2,400"}, ...]}]}
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
      const glyphs = tc.items.filter((it) => it.str && it.str.trim());
      // Font NAMES are useless for detecting bold on documents pdf.js reports
      // with synthetic ids ("g_d0_f1"); see the long note in page_outline.cjs.
      // A face used for under 20% of a page's glyphs is a display face.
      const faceCount = new Map();
      for (const it of glyphs) faceCount.set(it.fontName, (faceCount.get(it.fontName) || 0) + 1);
      const RARE = Math.max(1, glyphs.length * 0.20);
      // Keep the NAME test too, OR'd in: on documents where pdf.js does report
      // real PostScript names it is exact, and the frequency rule is not.
      const named = (f) => /bold|black|heavy/i.test((styles[f] && styles[f].fontFamily) || '')
        || /(^|[+,])B[do]/.test(f || '');
      const isDisplay = (f) => (faceCount.get(f) || 0) < RARE || named(f);
      const items = [];
      for (const it of glyphs) {
        items.push({
          x: round(it.transform[4]),
          y: round(it.transform[5]),
          w: round(it.width || 0),
          size: round(Math.hypot(it.transform[0], it.transform[1])),
          face: it.fontName,
          fam: ((styles[it.fontName] && styles[it.fontName].fontFamily) || '').slice(0, 10),
          display: isDisplay(it.fontName),
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
