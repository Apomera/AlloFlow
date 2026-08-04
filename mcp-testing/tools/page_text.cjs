#!/usr/bin/env node
// Per-page COLUMN-AWARE text through the app pipeline's own helpers
// (_alloOrderTextItems + _alloJoinOrderedTextItems + the content-stream space
// oracle), exposed on window by doc_pipeline_module. This is what a careful
// reader needs for multi-column pages, where a y-sorted digest interleaves
// columns. Usage:
//   node mcp-testing/tools/page_text.cjs <file.pdf> <first> <last>
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(REPO, 'node_modules', 'playwright'))); }

const [, , pdfPath, firstArg, lastArg] = process.argv;
const first = Number(firstArg || 1);
const last = Number(lastArg || first);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<html></html>');
  await page.addScriptTag({ path: path.join(REPO, 'desktop/mcp/vendor/pdfjs.min.js') });
  await page.addScriptTag({ path: path.join(REPO, 'doc_pipeline_module.js') });
  const workerB64 = fs.readFileSync(path.join(REPO, 'desktop/mcp/vendor/pdf.worker.min.js')).toString('base64');
  const dataB64 = fs.readFileSync(pdfPath).toString('base64');

  const texts = await page.evaluate(async ({ workerB64, dataB64, first, last }) => {
    const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    const bytes = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
    const csPages = await window.__alloCsPageTexts(bytes.slice());
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const out = [];
    for (let p = first; p <= Math.min(last, pdf.numPages); p++) {
      const tc = await (await pdf.getPage(p)).getTextContent();
      const ordered = window.__alloOrderTextItems(tc.items || [], {});
      let text = window.__alloJoinOrderedTextItems(ordered.items, ordered.rtl).replace(/\s+/g, ' ').trim();
      if (csPages && csPages[p - 1]) {
        const cs = csPages[p - 1].replace(/\s+/g, ' ').trim();
        const rep = window.__alloRepairSpacesWithCs ? window.__alloRepairSpacesWithCs(text, cs) : null;
        if (rep && rep.repaired > 0) text = rep.text;
      }
      out.push({ page: p, columns: ordered.applied ? ordered.columns : 1, text });
    }
    return out;
  }, { workerB64, dataB64, first, last });

  for (const t of texts) {
    console.log(`\n=== page ${t.page} (${t.columns} column${t.columns > 1 ? 's' : ''}) ===`);
    console.log(t.text);
  }
  await browser.close();
})();
