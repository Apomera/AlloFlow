// Validate a PDF with the SAME library AlloFlow uses (pdf.js 3.11.174), via Playwright/Chromium. Confirms the
// file parses and prints the text items IN STREAM ORDER (what pdf.js extraction sees). (2026-06-23)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const file = process.argv[2] || path.resolve(__dirname, 'multi-column-scrambled.pdf');
  const bytes = Array.from(fs.readFileSync(file));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!DOCTYPE html><html><body></body></html>');
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });
  const result = await page.evaluate(async (b) => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(b) }).promise;
    const out = { pages: doc.numPages, lines: [] };
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      for (const it of tc.items) { const s = (it.str || '').trim(); if (s) out.lines.push(s); }
    }
    return out;
  }, bytes);
  await browser.close();
  console.log('PARSED OK — ' + result.pages + ' page(s). Text items in pdf.js STREAM order:');
  result.lines.forEach((l, i) => console.log('  [' + (i + 1) + '] ' + l.slice(0, 70)));
})().catch((e) => { console.error('PARSE FAILED: ' + (e && e.message ? e.message : e)); process.exit(1); });
