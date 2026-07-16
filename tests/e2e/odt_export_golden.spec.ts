import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../../view_pdf_audit_source.jsx'), 'utf8');
const start = SRC.indexOf('function _htmlToDocxSpec(html) {');
const end = SRC.indexOf('\n// _buildDocxBlobFromSpec:', start);
if (start === -1 || end === -1) throw new Error('ODT helper extraction markers missing');
const HELPERS = SRC.slice(start, end);
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR4nGP4z8AAQv8BD/kD/YURmXYAAAAASUVORK5CYII=';
const HTML = '<!DOCTYPE html><html lang="en"><head><title>ODT Fixture</title></head><body>' +
  '<h1>Visual lesson</h1><img src="data:image/png;base64,' + PNG + '" alt="Two-color teaching diagram">' +
  '<p>English <span lang="es-MX"><code>hola</code></span> <mark>important</mark> <del>obsolete</del></p>' +
  '<table><tr><th scope="col">Term</th><th scope="col">Meaning</th></tr><tr><th scope="row">Leaf</th><td>Plant organ</td></tr></table>' +
  '</body></html>';

test('ODT export packages a real accessible image archive', async ({ page }) => {
  await page.goto('about:blank');
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' });
  await page.waitForFunction(() => !!(window as any).JSZip, null, { timeout: 30000 });

  const out = await page.evaluate(async ({ helpers, html, png }) => {
    const fns = new Function(helpers + '; return { _htmlToOdtPackageParts, _buildOdtManifestXml };')();
    const parts = fns._htmlToOdtPackageParts(html);
    const zip = new (window as any).JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
    zip.file('META-INF/manifest.xml', fns._buildOdtManifestXml(parts.images));
    zip.file('content.xml', parts.contentXml);
    zip.file('styles.xml', '<styles/>');
    zip.file('meta.xml', '<meta/>');
    parts.images.forEach((image: any) => zip.file(image.path, image.base64, { base64: true }));
    const bytes = await zip.generateAsync({ type: 'uint8array', mimeType: 'application/vnd.oasis.opendocument.text' });
    const loaded = await (window as any).JSZip.loadAsync(bytes);
    const content = await loaded.file('content.xml').async('string');
    const manifest = await loaded.file('META-INF/manifest.xml').async('string');
    const image = await loaded.file('Pictures/image-1.png').async('base64');
    const nameLength = bytes[26] | (bytes[27] << 8);
    const firstName = new TextDecoder().decode(bytes.slice(30, 30 + nameLength));
    const firstMethod = bytes[8] | (bytes[9] << 8);
    return {
      pk: bytes[0] === 0x50 && bytes[1] === 0x4b,
      firstName,
      firstMethod,
      imageMatches: image === png,
      manifestImage: manifest.includes('manifest:full-path="Pictures/image-1.png"') && manifest.includes('manifest:media-type="image/png"'),
      frame: content.includes('xlink:href="Pictures/image-1.png"') && content.includes('<svg:title>Two-color teaching diagram</svg:title>') && content.includes('<svg:desc>Two-color teaching diagram</svg:desc>'),
      dimensions: content.includes('svg:width="5.000in"') && content.includes('svg:height="2.500in"'),
      table: content.includes('table:name="Table1"') && content.includes('<table:table-header-rows>') && content.includes('<table:table-header-columns>') && content.includes('table:style-name="TableHeaderCell"') && content.includes('fo:background-color="#E2E8F0"'),
      richRuns: content.includes('style:name="T_Lang_es_MX"') && content.includes('fo:language="es" fo:country="MX"') && content.includes('text:style-name="T_Code"') && content.includes('text:style-name="T_Highlight"') && content.includes('text:style-name="T_Strike"'),
    };
  }, { helpers: HELPERS, html: HTML, png: PNG });

  expect(out.pk).toBe(true);
  expect(out.firstName).toBe('mimetype');
  expect(out.firstMethod, 'ODT mimetype must be stored, never deflated').toBe(0);
  expect(out.imageMatches).toBe(true);
  expect(out.manifestImage).toBe(true);
  expect(out.frame).toBe(true);
  expect(out.dimensions).toBe(true);
  expect(out.table).toBe(true);
  expect(out.richRuns).toBe(true);
});
