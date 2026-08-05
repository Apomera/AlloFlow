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
      const glyphs = tc.items.filter((it) => it.str && it.str.trim());

      // WHICH FACE IS THE BOLD ONE — by frequency, not by name.
      // Testing the font NAME for /bold/ is worthless on documents whose fonts
      // pdf.js reports as synthetic ids: the IRS i1040 comes back as
      // "g_d0_f1".."g_d0_f17" with generic serif/sans-serif families, so the
      // name test was false for EVERY item on EVERY page and this tool's
      // heading detection silently degraded to size-only. What survives is the
      // face id itself: body copy is set in one or two faces used by most of
      // the page, while subheads and run-in leads use faces that appear a
      // handful of times. So a face used for under 20% of a page's glyphs is
      // treated as a display face. On page 61 that picks out exactly
      // "Refund Offset" / "Deposit Refund Into Multiple Accounts" (a bold
      // sans-serif face) and "Form 8862, who must file." (the italic run-in
      // face). The threshold is 20% and not lower because a page can carry
      // MANY run-in leads: page 6's lead face sets 10% of that page's glyphs.
      // It is not higher because a page can carry TWO body faces: page 61 sets
      // its CAUTION-box copy in a second roman subset that is 35% of the page.
      //
      // This is a CANDIDATE generator, not a classifier. It cannot tell a
      // second body face from a heavily used display face, so confirm the
      // structure against a rendered page before authoring from it.
      const faceCount = new Map();
      for (const it of glyphs) faceCount.set(it.fontName, (faceCount.get(it.fontName) || 0) + 1);
      const RARE = Math.max(1, glyphs.length * 0.20);
      // Keep the NAME test too, OR'd in: on documents where pdf.js does
      // report real PostScript names it is exact, and this one is not.
      const named = (f) => /bold|black|heavy/i.test((styles[f] && styles[f].fontFamily) || '')
        || /(^|[+,])B[do]/.test(f || '');
      const isDisplay = (f) => (faceCount.get(f) || 0) < RARE || named(f);

      // group items into lines by rounded y
      const lines = new Map();
      for (const it of glyphs) {
        const y = Math.round(it.transform[5] / 3) * 3;
        const size = Math.round(Math.hypot(it.transform[0], it.transform[1]) * 10) / 10;
        const fam = (styles[it.fontName] && styles[it.fontName].fontFamily) || '';
        if (!lines.has(y)) lines.set(y, { y, x: it.transform[4], parts: [], size: 0, bold: false, faces: new Set() });
        const line = lines.get(y);
        line.parts.push({ x: it.transform[4], s: it.str });
        line.size = Math.max(line.size, size);
        line.bold = line.bold || isDisplay(it.fontName);
        line.faces.add(it.fontName + (fam ? '/' + fam.slice(0, 4) : ''));
      }
      const ordered = [...lines.values()].sort((a, b) => b.y - a.y);
      for (const l of ordered) {
        l.parts.sort((a, b) => a.x - b.x);
        l.text = l.parts.map((q) => q.s).join(' ').replace(/\s+/g, ' ').trim();
        delete l.parts;
      }
      result.push({ page: p, lines: ordered.map((l) => ({ y: Math.round(l.y), x: Math.round(l.x), size: l.size, bold: l.bold, faces: [...l.faces].join(','), text: l.text })) });
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
