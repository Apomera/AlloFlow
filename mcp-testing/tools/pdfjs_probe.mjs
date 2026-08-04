// Go/no-go probe: does a NEWER pdf.js still insert bogus spaces INSIDE text
// items ("legal p ermanent resident of the U nited S tates")? Runs pdfjs-dist
// (installed --no-save) in Node against the same corpus page the vendored
// 3.11.174 fragments on. Decides whether a vendor upgrade buys mechanism 2.
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const file = process.argv[2] || 'mcp-testing/corpus/born-digital/uscis-civics-100q.pdf';
const pageNum = Number(process.argv[3] || 1);

const data = new Uint8Array(readFileSync(file));
const pdf = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
const page = await pdf.getPage(pageNum);
const tc = await page.getTextContent();

const joined = tc.items.map((i) => i.str || '').join(' ').replace(/\s+/g, ' ');
const probes = ['p ermanent', 'U nited', 'S tates', 'permanent resident', 'United States'];
console.log('pdf.js version under test:', (await import('pdfjs-dist/package.json', { with: { type: 'json' } })).default.version);
console.log('items on page:', tc.items.length);
for (const probe of probes) {
  console.log((joined.includes(probe) ? 'PRESENT' : 'absent '), JSON.stringify(probe));
}
// show the footnote item(s) verbatim
for (const item of tc.items) {
  if ((item.str || '').includes('ermanent') || (item.str || '').includes('permanent')) {
    console.log('item:', JSON.stringify(item.str.slice(0, 130)));
  }
}
// RESULT (2026-08-04): pdf.js 6.2.108 produces the IDENTICAL within-item
// fragmentation as the vendored 3.11.174 — "legal p ermanent resident of the
// U nited S tates" arrives inside a single item on this document. A vendor
// upgrade therefore does NOT fix mechanism 2; the only real fix is
// content-stream-level extraction (as the portable engine does). Recorded so
// nobody spends a risky bundle swap on it again.
if (typeof pdf.destroy === 'function') await pdf.destroy();
else if (pdf.loadingTask && typeof pdf.loadingTask.destroy === 'function') await pdf.loadingTask.destroy();
