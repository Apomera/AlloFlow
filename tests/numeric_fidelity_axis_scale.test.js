// "Numbers may have changed" from a chart's axis scale (2026-11-03, RSU 57 budget keyless run: after coverage stopped
// counting the axis, the numeric-fidelity check still held the tagged PDF over 19 tick labels: 14.5 ... 0 in steps
// of 0.5 and $17,000,000 ... $10,000,000). _alloAxisScaleNumbers credits an evenly stepped run of 6+ numbers whose two
// end values the output states. Guards: uneven numbers, a missing end value, or a changed value elsewhere still lose.
// ALLO_PIPELINE_SOURCE points at a private copy for mutation checks.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const opts = { file: 'doc_pipeline_source.jsx', includeEnd: true };
const { losses, axis, repeated } = new Function(
  sliceBetween(SRC, 'var _extractNumericTokens', '\n};', opts) + '\n'
  + sliceBetween(SRC, 'var _alloAxisScaleNumbers = function', '\n};', opts) + '\n'
  + sliceBetween(SRC, 'var _alloRepeatedRunNumbers = function', '\n};', opts) + '\n'
  + sliceBetween(SRC, 'var _numericFidelityLosses = function', '\n};', opts)
  + '\nreturn { losses: _numericFidelityLosses, axis: _alloAxisScaleNumbers, repeated: _alloRepeatedRunNumbers };')();
const check = (pages, out) => losses(pages.join('\n\n'), out + ' ' + axis(pages.map((text) => ({ text })), pages.join('\n\n'), out));

const P11 = 'Town Valuation Total % Increase 14.5 14 13.5 13 12.5 12 11.5 11 10.5 10 9.5 9 8.5 8 7.5 7 6.5 6 5.5 5 4.5 4 3.5 3 2.5 2 1.5 1 0.5 0 FY19 FY20 FY21 FY22 10.5';
const CAPTION = 'Line chart. Vertical axis from 0 to 14.5 in steps of 0.5. FY19 FY20 FY21 FY22 about 10.5';

const withRepeats = (pages, out) => { const src = pages.join('\n\n'); return losses(src, out + ' ' + repeated(pages.map((text) => ({ text })), src, out)); };
describe('_alloRepeatedRunNumbers: numbers the source repeats page after page', () => {
  const FOOT = 'Hall, Orono, ME 04469-5754, 207.581.1226, TTY 711';
  it('activity4h: a footer address on both pages, kept once in the HTML, is not a loss', () => {
    const pages = ['Rain in a Jar step one. ' + FOOT, 'Rain in a Jar step two. ' + FOOT];
    expect(losses(pages.join('\n\n'), 'Rain in a Jar step one. Rain in a Jar step two. ' + FOOT)).toContain('04469');
    expect(withRepeats(pages, 'Rain in a Jar step one. Rain in a Jar step two. ' + FOOT)).toEqual([]);
  });
  it('expend2: a frozen row on every page, kept once in the HTML; the last cell matches by the word before it', () => {
    const row = '1761 Acadia Academy $1,301,450.40 $750,953.26 $0.00 $135,431.21';
    const pages = [row + ' 2 Acton $9,111.25', row + ' 3 Alna $8,222.50', row + ' 4 Anson $7,333.75'];
    expect(withRepeats(pages, row + ' 2 Acton $9,111.25 3 Alna $8,222.50 4 Anson $7,333.75')).toEqual([]);
  });
  it('a changed value is still lost: the output no longer states it', () => {
    const pages = ['Budget total 52,552 approved. ' + FOOT, 'Budget total 52,552 approved. ' + FOOT];
    expect(withRepeats(pages, 'Budget total 53,552 approved. ' + FOOT)).toEqual(['52552']);
  });
  it('the same value beside different words is two facts: the second is still lost', () => {
    const pages = ['Lunch cost 450 dollars', 'Bus fare 450 tickets'];
    expect(withRepeats(pages, 'Lunch cost 450 dollars')).toEqual(['450']);
  });
  it('a value repeated on ONE page only is not a page-to-page repeat', () => {
    expect(withRepeats(['Cost 450 now. Cost 450 now.', 'Other text here.'], 'Cost 450 now. Other text here.')).toEqual(['450']);
  });
  it('credits no more copies than the source repeats, and leaves other numbers alone', () => {
    const pages = ['Fee 800 due 300 extra', 'Fee 800 due 500 extra'];
    expect(withRepeats(pages, 'Fee 800 due 300 extra')).toEqual(['500']);
  });
  it('a one-page document has nothing to credit', () => {
    expect(repeated([{ text: 'Fee 800 due' }], 'Fee 800 due Fee 800 due', 'Fee 800 due')).toBe('');
  });
  it('both value-fidelity checks add the credit', () => {
    expect(SRC.includes("+ ' ' + _alloRepeatedRunNumbers(typeof window !== 'undefined' ? window.__lastGroundTruthPageMap : null, _srcRaw, _outPlainV)"), 'primary').toBe(true);
    expect(SRC.includes("+ ' ' + _alloRepeatedRunNumbers(typeof window !== 'undefined' ? window.__lastGroundTruthPageMap : null, sourceText, _outPlainR)"), 'recompute').toBe(true);
  });
});

describe('_alloAxisScaleNumbers', () => {
  it('budget p11: the 0.5-step scale is credited when the output states 0 and 14.5', () => {
    expect(check([P11], CAPTION)).toEqual([]);
  });
  it('budget p13: a dollar scale too ($18,000,000 ... $10,000,000)', () => {
    const p13 = 'Historical State Education Funding $18,000,000 $17,000,000 $16,000,000 $15,000,000 $14,000,000 $13,000,000 $12,000,000 $11,000,000 $10,000,000 FY 2011';
    expect(check([p13], 'Line chart. Vertical axis from $10,000,000 to $18,000,000. FY 2011')).toEqual([]);
  });
  it('without the scale\'s end values in the output, every tick is still lost', () => {
    expect(check([P11], 'Line chart. FY19 FY20 FY21 FY22 about 10.5')).toContain('13.5');
  });
  it('a changed data value outside the scale is still lost (the credit covers only the run)', () => {
    expect(check([P11], CAPTION.replace('about 10.5', 'about 11.5'))).toEqual(['10.5']);
  });
  it('uneven numbers (a table row) are never a scale, even when the ends are stated', () => {
    expect(check(['Enrollment 412 377 95 1203 66 18 total'], 'Enrollment 412 and 18 total')).toEqual(['377', '95', '1203', '66']);
  });
  it('fewer than 6 stepped numbers are not a scale', () => {
    // (single digits are not numeric tokens to this check; tens are)
    expect(check(['Scores 10 20 30 40 50 points'], 'Scores 10 and 50 points')).toEqual(['20', '30', '40']);
  });
  it('both value-fidelity checks (primary pass and recompute) add the credit', () => {
    expect(SRC.includes("+ ' ' + _alloAxisScaleNumbers(typeof window !== 'undefined' ? window.__lastGroundTruthPageMap : null, _srcRaw, _outPlainV));"), 'primary').toBe(true);
    expect(SRC.includes("+ ' ' + _alloAxisScaleNumbers(typeof window !== 'undefined' ? window.__lastGroundTruthPageMap : null, sourceText, _outPlainR));"), 'recompute').toBe(true);
  });
});
