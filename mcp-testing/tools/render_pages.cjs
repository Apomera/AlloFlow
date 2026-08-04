#!/usr/bin/env node
// Render PDF pages to PNGs with pdf.js in headless Chromium. Exists because
// local PDF reading needs poppler, which Windows lacks; the corpus workflow
// needs page IMAGES for structure while extract-text supplies verbatim content.
//
// Renderer selection: the vendored pdf.js (3.11.174) cannot repair fonts that
// Chromium's OpenType Sanitizer rejects — the IRS i1040's embedded subsets
// fail with "cmap: Non zero cmap subtable segment padding" and every glyph
// paints as a tofu box. Modern pdfjs-dist rebuilds those cmaps, so when it is
// installed (`npm i pdfjs-dist --no-save`; it does NOT persist) this tool
// loads it as a blob ES module and serves its standard fonts + CMaps through
// a routed fake origin. Without it, the vendored build still renders LAYOUT
// (rules, images, link boxes) with glyph drawing disabled from FontFace.
// Usage:
//   node mcp-testing/tools/render_pages.cjs <file.pdf> <outDir> <first> <last> [scale]
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(REPO, 'node_modules', 'playwright'))); }

let modernDir = null;
try { modernDir = path.dirname(require.resolve('pdfjs-dist/package.json', { paths: [REPO, __dirname] })); }
catch { /* vendored fallback below */ }

const [, , pdfPath, outDir, firstArg, lastArg, scaleArg] = process.argv;
if (!pdfPath || !outDir) {
  console.error('usage: render_pages.cjs <file.pdf> <outDir> <first> <last> [scale]');
  process.exit(2);
}
const first = Number(firstArg || 1);
const last = Number(lastArg || first);
const scale = Number(scaleArg || 1.5);

const ASSET_ORIGIN = 'https://alloflow-render.local';

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  if (modernDir) {
    // Serve pdf.js runtime assets from node_modules through a fake origin —
    // about:blank pages cannot fetch file:// URLs.
    await page.route(`${ASSET_ORIGIN}/**`, (route) => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname);
      const file = path.join(modernDir, rel);
      if (!file.startsWith(modernDir) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
      const type = file.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream';
      return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
    });
    await page.goto(`${ASSET_ORIGIN}/index.html`).catch(() => {});
    await page.setContent('<html><body style="margin:0"></body></html>');
  } else {
    console.error('note: pdfjs-dist not installed - falling back to the vendored pdf.js, which cannot repair OTS-rejected embedded fonts (layout renders; some glyphs may be boxes). For full-fidelity renders: npm i pdfjs-dist --no-save');
    await page.setContent('<html><body style="margin:0"></body></html>');
    await page.addScriptTag({ path: path.join(REPO, 'desktop/mcp/vendor/pdfjs.min.js') });
  }

  const workerB64 = modernDir ? null : fs.readFileSync(path.join(REPO, 'desktop/mcp/vendor/pdf.worker.min.js')).toString('base64');
  const dataB64 = fs.readFileSync(pdfPath).toString('base64');

  for (let p = first; p <= last; p++) {
    const pngB64 = await page.evaluate(async ({ workerB64, dataB64, pageNum, scale, modern, origin }) => {
      if (!window.__pdfDoc) {
        const bytes = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
        let lib;
        if (modern) {
          lib = await import(`${origin}/build/pdf.min.mjs`);
          lib.GlobalWorkerOptions.workerSrc = `${origin}/build/pdf.worker.min.mjs`;
          window.__pdfDoc = await lib.getDocument({
            data: bytes,
            cMapUrl: `${origin}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${origin}/standard_fonts/`,
          }).promise;
        } else {
          lib = window.pdfjsLib;
          const workerUrl = URL.createObjectURL(new Blob([atob(workerB64)], { type: 'text/javascript' }));
          lib.GlobalWorkerOptions.workerSrc = workerUrl;
          window.__pdfDoc = await lib.getDocument({ data: bytes, disableFontFace: true }).promise;
        }
      }
      const pg = await window.__pdfDoc.getPage(pageNum);
      const viewport = pg.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return canvas.toDataURL('image/png').split(',')[1];
    }, { workerB64, dataB64, pageNum: p, scale, modern: !!modernDir, origin: ASSET_ORIGIN });
    const out = path.join(outDir, `page-${String(p).padStart(3, '0')}.png`);
    fs.writeFileSync(out, Buffer.from(pngB64, 'base64'));
    console.log(out);
  }
  await browser.close();
})();
