// carryCorrectionsOntoReading (2026-11-08): a person's corrections to a scan's accessible version, carried onto the scan's word
// boxes so search and copy find the corrected spelling. Runs the REAL pipeline aligner (_alloAlignVisionOntoOcrWords), sliced
// from the source as tests/ocr_vision_alignment.test.js does.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const requireCjs = createRequire(import.meta.url);
const { carryCorrectionsOntoReading: carry } = requireCjs('../desktop/mcp/scan_reading_corrections.cjs');
const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const align = new Function(sliceBetween(SRC, 'var _alloAlignVisionOntoOcrWords = function', '\n};', { file: 'doc_pipeline_source.jsx' }) + '\n};\nreturn _alloAlignVisionOntoOcrWords;')();

// A page as the OCR step records it: one line per entry, word boxes left to right.
function page(pageNum, lines) {
  const words = [];
  lines.forEach((line, li) => { let x = 72; for (const t of line.split(' ')) { words.push({ t, x0: x, y0: 72 + li * 30, x1: x + t.length * 8, y1: 90 + li * 30, c: 88 }); x += t.length * 8 + 6; } });
  return { pageNum, text: lines.join('\n'), words, pageW: 612, pageH: 792 };
}
const P1 = page(1, ['Water Cycle Guide', 'Evaporatlon', 'Heat from the sun turns liquid water into vapor that rises into the air.', 'Page 1']);
const P2 = page(2, ['Condensation', 'Cooling vapor forms tiny droplets that gather into clouds above the land.', 'Page 2']);
const EDITED = 'Water Cycle Guide Evaporation Heat from the sun turns liquid water into vapor that rises into the air. Condensation Cooling vapor forms tiny droplets that gather into clouds above the land.';

describe('carryCorrectionsOntoReading', () => {
  it('puts a corrected misread word on its box and leaves every other box where it was', () => {
    const { pages, stats } = carry([P1, P2], EDITED, align);
    const w = pages[0].words.find((x) => x.x0 === P1.words[3].x0 && x.y0 === P1.words[3].y0);
    expect(w.t).toBe('Evaporation');
    expect(pages[0].words.map((x) => x.t)).toEqual(P1.words.map((x) => (x.t === 'Evaporatlon' ? 'Evaporation' : x.t)));
    expect(pages[0].words.map((x) => [x.x0, x.y0, x.x1, x.y1])).toEqual(P1.words.map((x) => [x.x0, x.y0, x.x1, x.y1]));
    expect(pages[1]).toBe(P2); // nothing to correct on page 2: the same object back
    expect(stats).toMatchObject({ pagesWithBoxes: 2, pagesCorrected: 1, wordsReplaced: 1, skipped: [] });
    expect(stats.corrections).toEqual([{ page: 1, from: 'Evaporatlon', to: 'Evaporation' }]);
  });
  it('keeps a printed page number the edit took out (nothing anchors it on both sides)', () => {
    const { pages } = carry([P1, P2], EDITED, align);
    expect(pages[0].words.map((x) => x.t)).toContain('1');
    expect(pages[1].words.map((x) => x.t).slice(-2)).toEqual(['Page', '2']);
  });
  it('leaves a page as the machine read it when it does not line up with the edited text', () => {
    const { pages, stats } = carry([P1], 'Something else entirely, written by someone, about another topic altogether here.', align);
    expect(pages[0]).toBe(P1);
    expect(stats.skipped).toEqual([{ page: 1, reason: 'under half of its words line up with the edited text' }]);
  });
  it('does not trade a word for an unrelated one the person wrote in its place', () => {
    const edited = EDITED.replace('liquid', 'magnificent');
    const { pages } = carry([P1, P2], edited, align);
    expect(pages[0].words.map((x) => x.t)).toContain('liquid'); // the aligner refuses words that do not resemble each other
  });
  it('passes through pages without boxes, and odd input', () => {
    const noBoxes = { pageNum: 1, text: 'Evaporatlon' };
    expect(carry([noBoxes], 'Evaporation', align).pages[0]).toBe(noBoxes);
    expect(carry(null, 'x', align).pages).toBeNull();
    expect(carry([P1], 'x', null).pages).toEqual([P1]);
  });
  // Found on a real run (garden scan, 2026-11-08): the saved page text is the VISION transcription ("# " headings, "•"
  // bullets) while the boxes are Tesseract's ("‘What", "*", "+"). The aligner needs every box word in its "OCR text", so it is
  // given the box words, and the page text is left as saved.
  it('works when the saved page text is another reading than the box words, and keeps that text', () => {
    const P = page(1, ['Water Cycle Guide', '‘Evaporatlon', '* Heat from the sun turns liquid water into vapor that rises into the air.']);
    const vision = Object.assign({}, P, { text: ['# Water Cycle Guide', '## Evaporation', '• Heat from the sun turns liquid water into vapor that rises into the air.'].join('\n\n') });
    const { pages, stats } = carry([vision], EDITED, align);
    expect(stats.skipped).toEqual([]);
    expect(pages[0].words.map((x) => x.t)).toContain('Evaporation');
    expect(pages[0].text).toBe(vision.text);
  });
  it('finds page two after page one even when page one has a correction', () => {
    const P2b = page(2, ['Condensatlon', 'Cooling vapor forms tiny droplets that gather into clouds above the land.']);
    const { pages, stats } = carry([P1, P2b], EDITED, align);
    expect(pages[1].words[0].t).toBe('Condensation');
    expect(stats.corrections.map((c) => c.page + ':' + c.to)).toEqual(['1:Evaporation', '2:Condensation']);
  });
});
