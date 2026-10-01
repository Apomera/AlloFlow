// STEM math-awareness of the OCR-accuracy estimate (_alloOcrAccuracy), 2026-07-01.
// Measured against real NY Regents exams (June 2024 Algebra II + Physics, born-digital,
// PERFECT text layers): the pre-fix estimator banded 3 clean algebra pages 'poor' at HIGH
// confidence (bare variables counted as OCR fragments — fragmentRatio 0.51 on one page;
// operators counted as junk). That cries wolf in the review banner AND feeds the OCR
// reconcile accuracy-flip (doc_pipeline ~7549) toward the engine that may have LOST the math.
// The fix detects math context and excludes EXPECTED math tokens from the garble blend,
// disclosing the adjustment. These tests run the REAL production function via extraction.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const junkM = SRC.match(/var _ocrJunkRatio = function[\s\S]*?\r?\n};/);
// Harness repair (2026-07-09): tolerate reformatting around the '=' (the space vanished at HEAD).
const commonM = SRC.match(/var _ALLO_OCR_COMMON_EN\s*=\s*\('[\s\S]*?\.filter\(Boolean\);/);
const accM = SRC.match(/var _alloOcrAccuracy = function[\s\S]*?\r?\n\s*return _result;\r?\n};/);
if (!junkM || !commonM || !accM) throw new Error('could not extract accuracy functions from source');
const acc = new Function(junkM[0] + '\n' + commonM[0] + '\n' + accM[0] + '\n; return _alloOcrAccuracy;')();

// Representative clean algebra text (mirrors the June 2024 Algebra II page-4 shape that
// measured 48/'poor' pre-fix: bare variables, coefficients, superscript digits as tokens).
const CLEAN_ALGEBRA = 'Use this space for computations. 4 Factored completely, x 4 x 2 9 x 2 36 x is equivalent to ' +
  'which expression below. The function f ( x ) 5 x 2 3 x 1 9 has zeros only at x 2 and x 3 and the ' +
  'graph of y f ( x ) passes through the point 2 5 . Solve for x the equation 3 x 2 4 x 1 2 5 2 x 2 3 ' +
  'and state the solutions. Which expression is equivalent to 2 xy x y when x 0 and y 0. The value of ' +
  'the expression when t 4 is which of the following choices 1 2 3 4 shown below for the given domain.';

// Clean everyday prose — must stay 'good' and must NOT be treated as math.
const CLEAN_PROSE = 'The students walked to the library after lunch and spent the afternoon reading about ' +
  'the history of their town. Many of them said that they would like to come back next week because the ' +
  'librarian had shown them how to find old maps and photographs from more than a hundred years ago. ' +
  'They wrote short reports about what they had learned and shared them with the rest of the class.';

// Letter-shaped OCR garble in PROSE (the case the estimator exists to catch): function words
// intact (so the English gate holds) but content words corrupted vowel-less. NOTE: garble
// WITHOUT math context takes the code path UNCHANGED by the math carve-out (junkForBlend ===
// junkRatio and no token is excluded), so the lock here is "flagged below good", the same
// promise the pre-fix function made — not a new 'poor' guarantee.
const GARBLED_PROSE = 'the wndw ws brkn and the tchr sd that the stdnts wld hv to sty in the clssrm bcs ' +
  'the strm hd knckd dwn the pwr lns nr the schl and mny prnts cldnt drv thrgh the flddd strts to pck ' +
  'up thr chldrn bfr drk so the prncpl npnd the gym and the stff brght blnkts and sm fd fr the fmls wh std wtng thr';

describe('math-aware OCR accuracy estimate (STEM assessment 2026-07-01)', () => {
  it('S1: clean equation-dense algebra is NOT banded poor (was 48/poor pre-fix)', () => {
    const r = acc(CLEAN_ALGEBRA);
    expect(r.mathContext).toBe(true);
    expect(r.band).not.toBe('poor');
    expect(r.score).toBeGreaterThanOrEqual(70);
  });
  it('S2: the math adjustment is DISCLOSED in basis, and expanded metrics ship', () => {
    const r = acc(CLEAN_ALGEBRA);
    expect(r.basis).toMatch(/math notation detected/);
    expect(typeof r.metrics.mashRatio).toBe('number');
    expect(typeof r.metrics.junkRatioForBlend).toBe('number');
    // raw junkRatio is still reported UNADJUSTED for transparency
    expect(r.metrics.junkRatio).toBeGreaterThanOrEqual(r.metrics.junkRatioForBlend);
  });
  it('S3: clean prose is unchanged — good band, no math context, no disclosure', () => {
    const r = acc(CLEAN_PROSE);
    expect(r.mathContext).toBe(false);
    expect(r.band).toBe('good');
    expect(r.basis).not.toMatch(/math notation/);
  });
  it('S4: garbled prose is still flagged below good, on the code path the carve-out does not touch', () => {
    const r = acc(GARBLED_PROSE);
    expect(r.mathContext).toBe(false); // no exclusions applied — identical to pre-fix scoring
    expect(r.band).not.toBe('good');
    expect(r.score).toBeLessThan(acc(CLEAN_PROSE).score);
  });
  it('S5: sprinkling math tokens onto garbled prose cannot rescue it to good — the dictionary/vowel nets survive the exclusions', () => {
    const r = acc(GARBLED_PROSE + ' 1 2 3 4 x 2 y 3 12 15 20 24 36 48 5 6 7 8 9 10 11 13 14 16');
    expect(r.mathContext).toBe(true); // the carve-out IS active here…
    expect(r.band).not.toBe('good');  // …and still cannot whitewash the garble
    expect(r.score).toBeLessThan(90);
  });
  it('S6: physics-style prose with sparse numbers does not trip math context', () => {
    const r = acc('Which phrase describes a box in equilibrium? A box in an elevator slowing down as it rises, ' +
      'a box in an elevator moving upward at constant speed, a box pushed across a rough level floor at ' +
      'constant velocity by a horizontal applied force of 4 newtons, or a box sliding down a frictionless incline. ' +
      'Explain your reasoning and state which forces act on the box in each of the situations described above.');
    expect(r.mathContext).toBe(false);
    expect(r.band).not.toBe('poor');
  });
});
