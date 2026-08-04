#!/usr/bin/env node
// Per-page structured-line digest: pdf.js textContent items grouped into lines
// with font size + bold flags. Canvas glyph painting can fail (missing font
// data) while textContent stays perfect, so this is the reliable way to read
// STRUCTURE (headings, columns, tables) for authoring; verbatim content comes
// from the same items. Usage:
//   node mcp-testing/tools/page_outline.cjs <file.pdf> <first> <last> [--headings-only]
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(REPO, 'node_modules', 'playwright'))); }

const [, , pdfPath, firstArg, lastArg, flag] = process.argv;
const first = Number(firstArg || 1);
const last = Number(lastArg || first);
const headingsOnly = flag === '--headings-only';

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
    const result = [];
    for (let p = first; p <= Math.min(last, pdf.numPages); p++) {
      const pg = await pdf.getPage(p);
      const tc = await pg.getTextContent();
      const styles = tc.styles || {};
      // group items into lines by rounded y
      const lines = new Map();
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const y = Math.round(it.transform[5] / 3) * 3;
        const size = Math.round(Math.hypot(it.transform[0], it.transform[1]) * 10) / 10;
        const fname = (styles[it.fontName] && styles[it.fontName].fontFamily) || it.fontName || '';
        const bold = /bold|black|heavy/i.test(fname) || /(^|[+,])B[do]/.test(it.fontName || '');
        if (!lines.has(y)) lines.set(y, { y, x: it.transform[4], parts: [], size: 0, bold: false });
        const line = lines.get(y);
        line.parts.push({ x: it.transform[4], s: it.str });
        line.size = Math.max(line.size, size);
        line.bold = line.bold || bold;
      }
      const ordered = [...lines.values()].sort((a, b) => b.y - a.y);
      for (const l of ordered) {
        l.parts.sort((a, b) => a.x - b.x);
        l.text = l.parts.map((q) => q.s).join(' ').replace(/\s+/g, ' ').trim();
        delete l.parts;
      }
      result.push({ page: p, lines: ordered.map((l) => ({ y: Math.round(l.y), x: Math.round(l.x), size: l.size, bold: l.bold, text: l.text })) });
    }
    return result;
  }, { workerB64, dataB64, first, last });

  for (const pg of pages) {
    const sizes = pg.lines.map((l) => l.size).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)] || 0;
    console.log(`=== page ${pg.page} (body~${body}) ===`);
    for (const l of pg.lines) {
      const isHeading = l.bold || l.size > body + 0.6;
      if (headingsOnly && !isHeading) continue;
      const tag = isHeading ? (l.size > body + 2 ? 'H+' : 'B ') : '  ';
      console.log(`${tag}${String(l.size).padStart(5)} ${l.text.slice(0, 150)}`);
    }
  }
  await browser.close();
})();
