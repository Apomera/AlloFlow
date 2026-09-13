import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The vendor bundle ships only the Tesseract models it carries (eng.traineddata.gz today). Before
// 2026-09-13 a request for any other model waited out a 120 s worker timeout on every page and
// then recognised the script with the English model. The driver now tells the page which models
// exist so an unbundled language fails in milliseconds and Vision OCR carries the page alone.

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, '..');
const driver = require(join(ROOT, 'desktop', 'mcp', 'remediation_headless_driver.cjs'));

describe('bundledTesseractLanguages', () => {
  it('lists the language codes behind tessdata/*.traineddata and .traineddata.gz, sorted and unique', () => {
    const files = new Map([
      ['tessdata/eng.traineddata.gz', {}],
      ['tessdata/heb.traineddata', {}],
      ['tessdata/eng.traineddata', {}],
      ['tessdata/chi_sim.traineddata.gz', {}],
      ['tesseract.min.js', {}],
      ['tesseract-core.wasm.js', {}],
      ['pdfjs.min.js', {}],
    ]);
    expect(driver.bundledTesseractLanguages(files)).toEqual(['chi_sim', 'eng', 'heb']);
  });

  it('accepts backslash paths and ignores files outside tessdata', () => {
    expect(driver.bundledTesseractLanguages(new Map([['tessdata\\spa.traineddata.gz', {}], ['other/eng.traineddata', {}]]))).toEqual(['spa']);
    expect(driver.bundledTesseractLanguages(new Map())).toEqual([]);
    expect(driver.bundledTesseractLanguages({ 'tessdata/fra.traineddata': 1 })).toEqual(['fra']);
  });

  it('matches what the checked-in vendor directory actually carries', () => {
    const dir = join(ROOT, 'desktop', 'mcp', 'vendor', 'tessdata');
    if (!existsSync(dir)) return;
    const files = new Map(readdirSync(dir).map((name) => ['tessdata/' + name, {}]));
    const langs = driver.bundledTesseractLanguages(files);
    expect(langs).toContain('eng');
    expect(langs.length).toBe(readdirSync(dir).filter((n) => /\.traineddata(\.gz)?$/.test(n)).length);
  });

  it('is wired into the page-side createWorker guard with the bundled-list message', () => {
    const source = require('node:fs').readFileSync(join(ROOT, 'desktop', 'mcp', 'remediation_headless_driver.cjs'), 'utf8');
    expect(source).toContain('tesseractLangs: bundledTesseractLanguages(bundle.files)');
    expect(source).toContain("'Tesseract language data not bundled: '");
    expect(source).toMatch(/Vision OCR still covers the page/);
  });
});
