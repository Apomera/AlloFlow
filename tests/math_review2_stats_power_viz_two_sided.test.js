// Stats Lab math review 2 (2026-10-19): the Type I / Type II visualizer used a
// one-sided critical value z(1 - alpha) while the sample-size calculator above
// it is two-sided, so the same d, n and alpha showed more power in the chart
// than the calculator assumes. Both are two-sided now:
// power = Phi(ncp - z) + Phi(-ncp - z), z = z(1 - alpha/2), ncp = d sqrt(n/2).
// The no-jStat normal inverse also lost accuracy past p = .975
// (z(.9995) came out 3.09 instead of 3.29), which a two-sided alpha below .05
// reaches; it now has the tail branch of the same rational approximation.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW2_STATS_SRC || 'stem_lab/stem_tool_statslab.js';

function erf(x) {
  const ax = Math.abs(x);
  let s = 0, term = ax;
  for (let n = 0; n < 400; n++) { s += term / (2 * n + 1); term *= -ax * ax / (n + 1); if (Math.abs(term) < 1e-17) break; }
  const v = ax > 5 ? 1 : 2 / Math.sqrt(Math.PI) * s;
  return x < 0 ? -v : v;
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const Z975 = 1.959963984540054, Z9995 = 3.2905267314919255;
const twoSided = (d, n, z) => { const ncp = d * Math.sqrt(n / 2); return Phi(ncp - z) + Phi(-ncp - z); };

function powerHtml(vizD, vizN, vizAlpha) {
  return renderTool('statsLab', {
    statsLab: {
      mode: 'power', testsRun: 0,
      powerInputs: { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD, vizN, vizAlpha },
    },
  });
}
const readout = (html) => {
  const m = /Power \(1−β\): <b[^>]*>([0-9.]+)<\/b>/.exec(html);
  return m ? m[1] : null;
};

beforeEach(() => {
  resetStemLab();
  delete window.jStat;
  loadTool(SRC_PATH, 'statsLab');
});

describe('Type I / Type II visualizer is two-sided like the calculator', () => {
  it('d = .5, n = 30, alpha = .05: power .491 (one-sided would be .615)', () => {
    expect(twoSided(0.5, 30, Z975).toFixed(3)).toBe('0.491');
    const html = powerHtml(0.5, 30, 0.05);
    expect(readout(html)).toBe('0.491');
    expect(html.indexOf('Power = 0.491')).toBeGreaterThan(-1);
    expect(html.indexOf('crit z = ±1.96')).toBeGreaterThan(-1);
    expect((html.match(/stroke-dasharray="4 3"/g) || []).length).toBe(2);
  });

  it('agrees with the calculator: d = .5 needs 64 per group for power .80', () => {
    // The calculator (and G*Power) give n = 64 per group for d = .5, alpha .05, power .80.
    const at64 = powerHtml(0.5, 64, 0.05), at62 = powerHtml(0.5, 62, 0.05);
    expect(readout(at64)).toBe(twoSided(0.5, 64, Z975).toFixed(3));
    expect(Number(readout(at64))).toBeGreaterThanOrEqual(0.8);
    expect(Number(readout(at62))).toBeLessThan(0.8);
    expect(at64.indexOf('meets the conventional threshold')).toBeGreaterThan(-1);
    expect(at62.indexOf('meets the conventional threshold')).toBe(-1);
  });

  it('alpha = .001 uses z = 3.29 without jStat', () => {
    const html = powerHtml(1, 30, 0.001);
    expect(html.indexOf('crit z = ±3.29')).toBeGreaterThan(-1);
    expect(readout(html)).toBe(twoSided(1, 30, Z9995).toFixed(3));
    expect(readout(html)).toBe('0.720');
  });

  it('d = 0 gives power = alpha (both tails)', () => {
    expect(readout(powerHtml(0, 30, 0.05))).toBe('0.050');
    expect(readout(powerHtml(0, 30, 0.01))).toBe('0.010');
  });
});
