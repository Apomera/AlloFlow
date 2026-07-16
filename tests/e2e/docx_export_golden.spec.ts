import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../../view_pdf_audit_source.jsx'), 'utf8');
const start = SRC.indexOf('function _htmlToDocxSpec(html) {');
const builder = SRC.indexOf('async function _buildDocxBlobFromSpec(spec, d, mode) {', start);
if (start === -1 || builder === -1) throw new Error('DOCX helper extraction markers missing');
const brace = SRC.indexOf('{', builder);
let depth = 0;
let end = -1;
for (let i = brace; i < SRC.length; i++) {
  if (SRC[i] === '{') depth++;
  else if (SRC[i] === '}') {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
if (end === -1) throw new Error('DOCX builder closing brace missing');
const HELPERS = SRC.slice(start, end);

const HTML = '<!doctype html><html lang="en"><head><title>DOCX Fixture</title></head><body>' +
  '<h1>Semantic lesson</h1><p>English <span lang="es-MX">hola <code>const x = 1</code></span> ' +
  '<mark>important</mark> <del>obsolete</del></p>' +
  '<table><tr><th scope="col">Person</th><th scope="col">Score</th></tr>' +
  '<tr><th scope="row">Alice</th><td>90</td></tr></table></body></html>';

test('DOCX export preserves rich runs and accessible table formatting in OOXML', async ({ page }) => {
  await page.goto('about:blank');
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js' });
  await page.waitForFunction(() => !!(window as any).docx, null, { timeout: 30000 });
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' });
  await page.waitForFunction(() => !!(window as any).JSZip, null, { timeout: 30000 });

  const out = await page.evaluate(async ({ helpers, html }) => {
    try {
      const fns = new Function(helpers + '; return { _htmlToDocxSpec, _buildDocxBlobFromSpec };')();
      const spec = fns._htmlToDocxSpec(html);
      const blob = await fns._buildDocxBlobFromSpec(spec, (window as any).docx, null);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const zip = await (window as any).JSZip.loadAsync(bytes);
      const documentXml = await zip.file('word/document.xml').async('string');
      return {
        pk: bytes[0] === 0x50 && bytes[1] === 0x4b,
        lang: /<w:lang[^>]*w:val="es-MX"/.test(documentXml),
        codeFont: /<w:rFonts[^>]*(?:w:ascii|w:hAnsi)="Courier New"/.test(documentXml),
        highlight: /<w:highlight[^>]*w:val="yellow"/.test(documentXml),
        strike: /<w:strike\s*\/>/.test(documentXml),
        tableGrid: /<w:tblStyle[^>]*w:val="TableGrid"/.test(documentXml),
        repeatingHeader: /<w:tblHeader\s*\/>/.test(documentXml),
        noSplitRows: (documentXml.match(/<w:cantSplit\s*\/>/g) || []).length >= 2,
        boldHeaderCells: (documentXml.match(/<w:b\s*\/>/g) || []).length >= 3,
      };
    } catch (error: any) {
      return { error: String((error && error.stack) || error) };
    }
  }, { helpers: HELPERS, html: HTML });

  expect(out && !(out as any).error, 'evaluate error: ' + (out as any).error).toBeTruthy();
  expect(out.pk).toBe(true);
  expect(out.lang).toBe(true);
  expect(out.codeFont).toBe(true);
  expect(out.highlight).toBe(true);
  expect(out.strike).toBe(true);
  expect(out.tableGrid).toBe(true);
  expect(out.repeatingHeader).toBe(true);
  expect(out.noSplitRows).toBe(true);
  expect(out.boldHeaderCells).toBe(true);
});
