#!/usr/bin/env node
// Render PDF pages to PNGs with the vendored pdf.js in headless Chromium.
// Exists because local PDF reading needs poppler, which Windows lacks; the
// corpus workflow needs page IMAGES for structure while extract-text supplies
// verbatim content. Usage:
//   node mcp-testing/tools/render_pages.cjs <file.pdf> <outDir> <first> <last> [scale]
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(REPO, 'node_modules', 'playwright'))); }

const [, , pdfPath, outDir, firstArg, lastArg, scaleArg] = process.argv;
if (!pdfPath || !outDir) {
  console.error('usage: render_pages.cjs <file.pdf> <outDir> <first> <last> [scale]');
  process.exit(2);
}
const first = Number(firstArg || 1);
const last = Number(lastArg || first);
const scale = Number(scaleArg || 1.5);

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body style="margin:0"></body></html>');
  await page.addScriptTag({ path: path.join(REPO, 'desktop/mcp/vendor/pdfjs.min.js') });
  const workerB64 = fs.readFileSync(path.join(REPO, 'desktop/mcp/vendor/pdf.worker.min.js')).toString('base64');
  const dataB64 = fs.readFileSync(pdfPath).toString('base64');

  for (let p = first; p <= last; p++) {
    const pngB64 = await page.evaluate(async ({ workerB64, dataB64, pageNum, scale }) => {
      if (!window.__pdfDoc) {
        const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const bytes = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
        window.__pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
      }
      const pg = await window.__pdfDoc.getPage(pageNum);
      const viewport = pg.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return canvas.toDataURL('image/png').split(',')[1];
    }, { workerB64, dataB64, pageNum: p, scale });
    const out = path.join(outDir, `page-${String(p).padStart(3, '0')}.png`);
    fs.writeFileSync(out, Buffer.from(pngB64, 'base64'));
    console.log(out);
  }
  await browser.close();
})();
