// Stats Lab math review 2 (2026-10-19): the Pearson (and Spearman) 95% CI.
// The Fisher z interval is r -> atanh(r) +/- 1.96 / sqrt(n - 3). At n = 3 the
// SE is infinite and at |r| = 1 atanh(r) is infinite, and the screen showed
// "[-1.000, NaN]" / "[NaN, NaN]". A perfect fit can also round to
// r = 1.0000000000000002, which made t NaN. The interval is not defined in
// those cases, so the result now carries a note instead of NaN.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW2_STATS_SRC || 'stem_lab/stem_tool_statslab.js';

function resultsHtml(result, testType, a, b, extra = {}) {
  return renderTool('statsLab', {
    statsLab: {
      mode: 'results', testsRun: 1, selectedTest: testType, lastTestType: testType, lastResult: result,
      twoColData: { aLabel: 'X', bLabel: 'Y', a, b }, showGlossary: true, ...extra,
    },
  });
}

beforeEach(() => {
  resetStemLab();
  loadTool(SRC_PATH, 'statsLab');
});

describe('Pearson CI where the Fisher z interval is not defined', () => {
  const cases = [
    ['n = 3', [1, 2, 3], [2, 1, 4], /n = 3/],
    ['r = 1', [1, 2, 3, 4, 5], [2, 4, 6, 8, 10], /\|r\| = 1/],
    ['r = -1', [1, 2, 3, 4], [8, 6, 4, 2], /\|r\| = 1/],
  ];

  it.each(cases)('%s: no NaN bound, a "not defined" note instead', (_name, x, y, noteRe) => {
    const r = window.__StatsLabCore.pearson(x, y);
    expect(r.error).toBeUndefined();
    expect(r.ci95 == null || r.ci95.every((v) => Number.isFinite(v)), JSON.stringify(r.ci95)).toBe(true);
    expect(r.ci95, 'no interval is defined here').toBeNull();
    expect(r.ciNote).toMatch(noteRe);
  });

  it.each(cases)('%s: the results screen, APA line and math panel show no NaN', (_name, x, y, noteRe) => {
    const r = window.__StatsLabCore.pearson(x, y);
    const html = resultsHtml(r, 'pearson', x, y);
    expect(html.includes('NaN'), (html.match(/[\s\S]{0,200}NaN[\s\S]{0,37}/) || [''])[0]).toBe(false);
    expect(noteRe.test(html)).toBe(true);
    const withMath = resultsHtml(r, 'pearson', x, y, { showMath: true });
    expect(withMath.indexOf('Fisher z')).toBeGreaterThan(-1);
    expect(withMath.indexOf('NaN')).toBe(-1);
    expect(window.AlloStats.apaWriteup(r).indexOf('NaN')).toBe(-1);
  });

  it('a perfect fit that rounds past 1 keeps r = 1 and a finite-or-infinite t, never NaN', () => {
    // x = .07, .17, .27; y = 15.17 x + .11. The raw quotient is 1.0000000000000002.
    const x = [0, 1, 2].map((i) => i * 0.1 + 0.07);
    const y = x.map((v) => v * 41 * 0.37 + 0.11);
    const r = window.__StatsLabCore.pearson(x, y);
    expect(r.r).toBeLessThanOrEqual(1);
    expect(Number.isNaN(r.t)).toBe(false);
    expect(r.ciNote).toBeTruthy();
  });

  it('Spearman inherits the note for a perfectly monotone sample', () => {
    const x = [1, 2, 3, 4, 5], y = [1, 3, 7, 20, 50];
    const r = window.AlloStats.spearman(x, y);
    expect(r.r).toBe(1);
    expect(r.ci95).toBeNull();
    const html = resultsHtml(r, 'spearman', x, y);
    expect(html.indexOf('NaN')).toBe(-1);
  });

  it('an ordinary sample still gets the Fisher z interval (worked by hand)', () => {
    // x 1..5, y 2,1,4,3,5: Sxy = 8, Sxx = Syy = 10, r = .8;
    // atanh(.8) = 1.098612, SE = 1/sqrt(2) = .707107, z bounds -.287317 .. 2.484542,
    // r bounds tanh() = -.279664 .. .986197.
    const r = window.__StatsLabCore.pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
    expect(r.r).toBeCloseTo(0.8, 12);
    expect(r.ci95[0]).toBeCloseTo(-0.279664, 5);
    expect(r.ci95[1]).toBeCloseTo(0.986197, 5);
    const html = resultsHtml(r, 'pearson', [1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
    expect(html.indexOf('[-0.280, 0.986]')).toBeGreaterThan(-1);
  });
});
