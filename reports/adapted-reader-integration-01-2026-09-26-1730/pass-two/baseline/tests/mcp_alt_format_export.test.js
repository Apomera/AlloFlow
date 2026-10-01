// Behavioral coverage for export_alt_format — ePub 3 / DAISY 3 / BRF.
//
// These formats used to be generated inside PdfAuditView's download handlers, which meant the only
// way to exercise them was to click a button in a rendered React tree. Nothing tested them. The
// generation is now module scope, and this is the coverage that arrives with it.
//
// Two layers, deliberately:
//   1. The ZIP writer, in Node, cross-checked against JSZip — an independent implementation. A
//      hand-written archiver that only its own reader can open proves nothing.
//   2. The real builders in real Chromium, on real remediated HTML, with the output read back and
//      checked against what a reading system actually requires.
//
// Nothing here needs an API key: every one of these paths is model-free, and a test that needed a
// key would be quietly asserting the opposite.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
vi.setConfig({ testTimeout: 180000, hookTimeout: 120000 });

const ZIP = resolve(process.cwd(), 'desktop/mcp/zip_writer.cjs');
const DRIVER = resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs');

// A small but genuinely structured document: headings with ids (nav entries), a table, an image
// with alt text, a non-ASCII character (the encoding trap), and a digit run (the braille number
// sign). Anything simpler passes for the wrong reasons.
const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Sample Report</title></head>
<body>
<h1 id="top">Reading Support Report</h1>
<p>Café results for 2024 &amp; beyond — see below.</p>
<h2 id="findings">Findings</h2>
<p>The student read 128 words per minute.</p>
<table><caption>Scores</caption><thead><tr><th scope="col">Measure</th><th scope="col">Score</th></tr></thead>
<tbody><tr><th scope="row">Fluency</th><td>92</td></tr></tbody></table>
<h3 id="next">Next steps</h3>
<p>Continue weekly progress monitoring.</p>
<img src="chart.png" alt="Bar chart of weekly fluency scores">
</body></html>`;

describe('zip_writer (Node, no browser)', () => {
  const { makeZip, zipFileMap } = require(ZIP);
  const JSZip = require(resolve(process.cwd(), 'node_modules/jszip'));

  const FILES = {
    'mimetype': 'application/epub+zip',
    'META-INF/container.xml': '<?xml version="1.0"?><container/>',
    'OEBPS/content.xhtml': '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Café</p></body></html>',
  };

  it('round-trips every entry through JSZip byte-for-byte', async () => {
    const z = await JSZip.loadAsync(zipFileMap(FILES, 'mimetype'));
    for (const [name, content] of Object.entries(FILES)) {
      expect(await z.file(name).async('string'), name).toBe(content);
    }
  });

  // The OCF requirement that makes an EPUB an EPUB. A reader sniffs these exact bytes at this
  // exact offset; get it wrong and the file is a zip that nothing will open, while every layer
  // above still reports success.
  it('puts mimetype first, STORED, with no extra field, at byte 38', () => {
    const buf = zipFileMap(FILES, 'mimetype');
    expect(buf.readUInt16LE(8)).toBe(0);        // compression method 0 = STORE
    expect(buf.readUInt16LE(28)).toBe(0);       // extra field length
    expect(buf.slice(38, 58).toString('latin1')).toBe('application/epub+zip');
  });

  it('refuses a storeFirst name that is not in the map, rather than silently producing a bad EPUB', () => {
    expect(() => zipFileMap(FILES, 'not-there')).toThrow(/not in the file map/);
  });

  it('is deterministic — same input, identical bytes', () => {
    expect(zipFileMap(FILES, 'mimetype').equals(zipFileMap(FILES, 'mimetype'))).toBe(true);
  });

  it('flags non-ASCII entry names as UTF-8 so readers do not fall back to CP437', () => {
    const buf = makeZip([{ name: 'résumé.txt', data: 'x' }]);
    expect(buf.readUInt16LE(6) & 0x0800).toBe(0x0800);
  });

  it('rejects an empty archive instead of writing a zero-entry file', () => {
    expect(() => makeZip([])).toThrow(/non-empty/);
  });
});

describe('exportAltFormat (real Chromium, real builders)', () => {
  const Driver = require(DRIVER);
  const JSZip = require(resolve(process.cwd(), 'node_modules/jszip'));
  let driver = null;
  let available = false;

  beforeAll(async () => {
    const chrome = Driver.resolveChromium();
    available = !!chrome.installed && existsSync(resolve(process.cwd(), 'view_pdf_audit_module.js'));
    if (available) driver = Driver.createDriver({ onLog: () => {} });
  });
  afterAll(async () => { if (driver) await driver.close(); });

  const guard = () => { if (!available) return true; return false; };

  it('builds an ePub whose nav matches the headings in the source', async () => {
    if (guard()) return;
    const r = await driver.exportAltFormat({ html: SAMPLE_HTML, title: 'Sample Report', format: 'epub' });
    expect(r.format).toBe('epub');
    expect(r.modelFree).toBe(true);
    expect(r.entries).toContain('OEBPS/content.opf');
    expect(r.language).toBe('en');
    // Three headings carry ids in SAMPLE_HTML; the nav must list all three, not "Document".
    expect(r.navEntries).toBe(3);
    const z = await JSZip.loadAsync(Buffer.from(r.b64, 'base64'));
    const nav = await z.file('OEBPS/nav.xhtml').async('string');
    expect((nav.match(/<a /g) || []).length).toBe(3);
    expect(nav).toContain('Reading Support Report');
  });

  // The regression that shipped unopenable books: a child xmlns (one SVG or MathML equation)
  // defeated the old "does it contain xmlns" check, leaving the ROOT element in no namespace.
  it('keeps the XHTML namespace on the root even when a child element declares its own', async () => {
    if (guard()) return;
    const withSvg = SAMPLE_HTML.replace('<img', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="2"/></svg><img');
    const r = await driver.exportAltFormat({ html: withSvg, title: 'Svg', format: 'epub' });
    const z = await JSZip.loadAsync(Buffer.from(r.b64, 'base64'));
    const xhtml = await z.file('OEBPS/content.xhtml').async('string');
    expect(xhtml).toMatch(/^<html[^>]*xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/);
    // And the content item must declare the svg property or a reader may refuse to render it.
    const opf = await z.file('OEBPS/content.opf').async('string');
    expect(opf).toMatch(/id="content"[^>]*properties="[^"]*svg/);
  });

  it('reports the ePub self-check as evidence rather than assuming success', async () => {
    if (guard()) return;
    const r = await driver.exportAltFormat({ html: SAMPLE_HTML, title: 'Sample', format: 'epub' });
    expect(r.selfChecked).toBe(true);
    expect(Array.isArray(r.structuralErrors)).toBe(true);
    expect(r.valid).toBe(r.structuralErrors.length === 0);
  });

  it('builds a DAISY package and does NOT claim it was validated', async () => {
    if (guard()) return;
    const r = await driver.exportAltFormat({ html: SAMPLE_HTML, title: 'Sample', format: 'daisy' });
    expect(r.entries.sort()).toEqual(['book.smil', 'dtbook.xml', 'navigation.ncx', 'package.opf']);
    // The honesty assertion. There is no DAISY validator in this connector, so `valid` must be
    // absent — not true. An empty error list from a check that never ran is not a pass.
    expect(r.selfChecked).toBe(false);
    expect(r.valid).toBeUndefined();
    const z = await JSZip.loadAsync(Buffer.from(r.b64, 'base64'));
    expect(await z.file('dtbook.xml').async('string')).toContain('Reading Support Report');
    expect((await z.file('navigation.ncx').async('string')).match(/<navPoint/g).length).toBeGreaterThan(0);
  });

  // A .brf that is not ASCII braille is un-embossable garbage under a BRF label — the exact bug
  // this format had before (Unicode U+2800 patterns). These two assertions are the whole contract.
  it('emits real ASCII braille: every byte in 0x20-0x5F, no line over 40 cells', async () => {
    if (guard()) return;
    const r = await driver.exportAltFormat({ html: SAMPLE_HTML, title: 'Sample', format: 'brf' });
    const brf = Buffer.from(r.b64, 'base64').toString('ascii');
    expect(brf.replace(/[\x20-\x5f\r\n]/g, '')).toBe('');
    expect(brf.split('\r\n').filter((l) => l.length > 40)).toEqual([]);
    expect(r.grade).toBe(1);
  });

  it('marks capitals and number runs the way uncontracted braille requires', async () => {
    if (guard()) return;
    const r = await driver.exportAltFormat({ html: SAMPLE_HTML, title: 'Sample', format: 'brf' });
    const brf = Buffer.from(r.b64, 'base64').toString('ascii');
    // "128" -> number sign then A(1) B(2) H(8).
    expect(brf).toContain('#ABH');
    // A capitalised word carries the capital sign before its letter.
    expect(brf).toContain(',READING');
  });

  it('counts dropped characters instead of losing them silently', async () => {
    if (guard()) return;
    // A character with no Grade-1 equivalent. Silent loss in a braille file is the failure mode.
    const r = await driver.exportAltFormat({ html: SAMPLE_HTML.replace('Findings', 'Findings → ©'), title: 'S', format: 'brf' });
    expect(r.droppedCharacters).toBeGreaterThan(0);
    expect(r.warnings.join(' ')).toMatch(/no uncontracted-braille equivalent/);
  });

  it('rejects an unknown format rather than guessing one', async () => {
    if (guard()) return;
    await expect(driver.exportAltFormat({ html: SAMPLE_HTML, format: 'mobi' })).rejects.toThrow(/epub, daisy, brf/);
  });
});
