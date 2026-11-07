// (2026-11-07) Words printed inside a described chart or map (labels, scales, values) are carried by the figure and
// its description. NCES: 244 of 264 "missing" words were the state map's codes and values, axis ticks and legends;
// together with "numbers may have changed" they held the tagged PDF. A crop that reaches into the body must never
// take a line of prose with it (notifications letter: one such line).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { sliceBetween } from './helpers/anchored_slice.js';

const PIPE = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const DRIVER = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
global.DOMParser = global.DOMParser || new JSDOM('').window.DOMParser;
const helpers = new Function(sliceBetween(PIPE, 'var _alloFigureCrop = function', '// Pictures cropped from ONE source image', F) + '\nreturn { _alloFigureCrop, _alloFigureRegionText, _alloFigureTextNumbers };')();
const require = createRequire(import.meta.url);
const P = require(process.env.ALLO_MCP_DIR ? resolve(process.env.ALLO_MCP_DIR, 'remediation_narration_plan.cjs') : resolve(process.cwd(), 'desktop/mcp/remediation_narration_plan.cjs'));

// A stub pdf.js: page 1 is 600 x 800 with the given text items (x, y in PDF space, y up).
const fakePdf = (items) => ({
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 1, destroy() {},
    getPage: async () => ({ getViewport: () => ({ width: 600, height: 800, convertToViewportPoint: (x, y) => [x, 800 - y] }), getTextContent: async () => ({ items: items.map(([str, x, y]) => ({ str, transform: [10, 0, 0, 10, x, y], width: 10, height: 10 })) }) }),
  }) }),
});
const noWait = (p) => p;
// The figure covers x 0.1-0.9, y 0.1-0.5 of the page (y down): PDF y 400-720.
const FIG = '<figure data-allo-source-crop="1 0.1 0.1 0.9 0.5"><img alt="Map of the states and their rates"></figure>';

describe('text inside a described figure (pipeline)', () => {
  it('takes the short labels inside the figure and leaves prose and text outside it', async () => {
    const pdf = fakePdf([['NH', 100, 600], ['20.7', 140, 600], ['Less than 15.0', 100, 500], ['We work hard to assure that every class has a teacher', 100, 450], ['Body text below the map', 100, 200]]);
    const r = await helpers._alloFigureRegionText(pdf, new Uint8Array(1), '<main><p>x</p>' + FIG + '</main>', noWait);
    expect(r).toEqual([{ page: 1, items: ['NH', '20.7', 'Less than 15.0'] }]);
  });
  it('ignores a figure with no description, and a crop covering most of the page', async () => {
    const pdf = fakePdf([['NH', 100, 600]]);
    expect(await helpers._alloFigureRegionText(pdf, new Uint8Array(1), '<figure data-allo-source-crop="1 0.1 0.1 0.9 0.5"><img alt=""></figure>', noWait)).toEqual([]);
    expect(await helpers._alloFigureRegionText(pdf, new Uint8Array(1), '<figure data-allo-source-crop="1 0 0 1 0.9"><img alt="Whole page"></figure>', noWait)).toEqual([]);
  });
  it('is wired into the numeric check, disclosed as a caution, reset each run and passed to the word check', () => {
    expect(PIPE.split("_alloFurnitureNumbers() + ' ' + _alloFigureTextNumbers()").length - 1).toBe(2);
    expect(PIPE.includes('window.__alloFigureText = window.pdfjsLib ? await _alloFigureRegionText(window.pdfjsLib, _b64ToBytes(_base64), _finalForIntegrity, _withTimeout) : null;')).toBe(true);
    expect(PIPE.includes("_structuralFidelityNotes.push({ kind: 'figureText', caution: true,")).toBe(true);
    expect(PIPE.includes('if (kinds.figureText) cautions.push(')).toBe(true);
    expect(PIPE.includes('window.__alloFigureText = null; // text printed inside described figures, fresh each run')).toBe(true);
    expect(DRIVER.includes('figureText:Array.isArray(window.__alloFigureText)?window.__alloFigureText:null')).toBe(true);
  });
});

describe('text inside a described figure (word check)', () => {
  const html = '<p>Rates by state are shown on the map.</p><figure><img alt="Map of rates"></figure><p>The lowest rate was in Utah.</p>';
  const src = 'Rates by state are shown on the map.\nNH 20.7 ME 19.3 VT\n80,00070,000\nThe lowest rate was in Utah.';
  it('credits each label once, including a run the text layer glued, and says how many', () => {
    const r = P.assessSourceCoverage({ sourceText: src, outputHtml: html, method: 'pdfjs', figureText: [{ page: 1, items: ['NH', '20.7', 'ME', '19.3', 'VT', '80,000', '70,000'] }] });
    expect(r).toMatchObject({ status: 'matched', missingTokens: 0, figureWordsCredited: 7 });
  });
  it('without the figure words the same labels are missing', () => {
    expect(P.assessSourceCoverage({ sourceText: src, outputHtml: html, method: 'pdfjs' }).missingTokens).toBeGreaterThan(0);
  });
  it('never credits prose, and a lost body sentence is still missing', () => {
    const lost = P.assessSourceCoverage({ sourceText: src + '\nEvery school reported its counts.', outputHtml: html, method: 'pdfjs',
      figureText: [{ page: 1, items: ['NH', '20.7', 'ME', '19.3', 'VT', '80,000', '70,000', 'Every school reported its counts.'] }] });
    expect(lost.missingTokens).toBeGreaterThan(0);
  });
});
