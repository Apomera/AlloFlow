import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Data Plotter statistics: correctness pins found by the 2026-10 math review.
// Every expected value below is computed by hand or by an independent
// reference implementation in this file, never by re-running the tool's code.

const FILE = process.env.MATH_REVIEW_DATAPLOT_SRC || 'stem_lab/stem_tool_dataplot.js';
const src = fs.readFileSync(FILE, 'utf8');

// Same render-scope slice as tests/stem_dataplot_engine.test.js.
function stats(points, regressionType) {
  const start = src.indexOf('var n = visiblePoints.length;');
  const end = src.indexOf('// ── Undo System ──', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('visiblePoints', 'allX', 'allY', 'regressionType', 'predX',
    src.slice(start, end) +
    '\nreturn { n: n, r2: r2, logR2: logR2, q1: q1, q3: q3, outliers: outliers, histBins: histBins, cumulativeFreq: cumulativeFreq, spearmanR: spearmanR, tValue: tValue };'
  )(points, points.map((p) => p.x), points.map((p) => p.y), regressionType || 'linear', '');
}

// The Correlation Inquiry generator, from its seeded RNG to the agree/misleading verdict.
function inquiry(iq) {
  const a = src.indexOf('function lcg(seed)');
  const b = src.indexOf('var sm = ({', a);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  // eslint-disable-next-line no-new-func
  return new Function('iq', src.slice(a, b) + '\nreturn { observedR: observedR, state: state };')(iq);
}

const P = (xs, ys) => xs.map((x, i) => ({ x, y: ys[i] }));

function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}

function mount(dataPlot) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('dataPlot', { dataPlot });
  return host;
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'dataPlot');
});
afterEach(() => { document.body.innerHTML = ''; });

describe('Correlation Inquiry generator', () => {
  it('population r equals the True population r slider at noise SD 1', () => {
    // x ~ U(-5, 5) has SD 10/sqrt(12) = 2.887 and the three-uniform noise has SD 0.5,
    // so y = r*x + sqrt(1-r^2)*noise had population r near 0.88-0.99 for every slider value.
    for (const trueR of [0.3, 0.5, 0.7, -0.7]) {
      const big = inquiry({ trueR, n: 20000, noiseSD: 1, outlierCount: 0 });
      expect(Math.abs(big.observedR - trueR), 'n=20000 r=' + trueR + ' observed ' + big.observedR).toBeLessThan(0.03);
      const classroom = inquiry({ trueR, n: 200, noiseSD: 1, outlierCount: 0 });
      expect(classroom.state, 'n=200 r=' + trueR + ' observed ' + classroom.observedR).not.toBe('misleading');
      expect(Math.abs(classroom.observedR - trueR)).toBeLessThan(0.15);
    }
  });
});

describe('histogram and ogive', () => {
  it('the largest value lands in the last bin and the ogive reaches 100%', () => {
    // [2,3,4]: 3 bins of width 2/3; the old last edge 2 + 3*(2/3) rounded below 4.
    const s = stats(P([1, 2, 3], [2, 3, 4]));
    expect(s.histBins.map((b) => b.count)).toEqual([1, 1, 1]);
    expect(s.cumulativeFreq[s.cumulativeFreq.length - 1].pct).toBe(100);
  });

  it('bins always account for every point (seeded sweep)', () => {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const bad = [];
    for (let trial = 0; trial < 3000; trial++) {
      const k = 3 + Math.floor(rnd() * 40);
      const ys = Array.from({ length: k }, () => Math.round(rnd() * 1000) / 10 - 20);
      const s = stats(P(ys.map((_, i) => i), ys));
      const total = s.histBins.reduce((a, b) => a + b.count, 0);
      if (total !== k) bad.push({ k, total });
    }
    expect(bad.length, JSON.stringify(bad.slice(0, 3))).toBe(0);
  });
});

describe('Spearman rho with ties', () => {
  it('uses average ranks: y = [1,2,2,3] gives 0.9487, not 1', () => {
    // ranks x = 1,2,3,4; y = 1,2.5,2.5,4 -> Pearson of ranks = 4.5 / sqrt(5 * 4.5) = 0.948683
    const s = stats(P([1, 2, 3, 4], [1, 2, 2, 3]));
    expect(s.spearmanR).toBeCloseTo(4.5 / Math.sqrt(5 * 4.5), 9);
  });

  it('constant y has no rank association (was +1)', () => {
    expect(stats(P([1, 2, 3, 4, 5], [5, 5, 5, 5, 5])).spearmanR).toBe(0);
    expect(stats(P([5, 4, 3, 2, 1], [5, 5, 5, 5, 5])).spearmanR).toBe(0);
  });

  it('matches Pearson of average ranks on tie-heavy data', () => {
    const xs = [1, 1, 2, 3, 3, 3, 4, 5, 5, 6];
    const ys = [2, 1, 1, 4, 4, 3, 6, 5, 5, 5];
    const avgRanks = (arr) => arr.map((v) => {
      const less = arr.filter((u) => u < v).length;
      const same = arr.filter((u) => u === v).length;
      return less + (same + 1) / 2;
    });
    const s = stats(P(xs, ys));
    expect(s.spearmanR).toBeCloseTo(pearson(avgRanks(xs), avgRanks(ys)), 9);
  });
});

describe('95% CI t multiplier', () => {
  it('uses t(0.975, df = n - 2)', () => {
    const pts = (n) => Array.from({ length: n }, (_, i) => ({ x: i, y: i % 3 }));
    // Standard two-sided 95% table values.
    const ref = { 3: 12.706, 4: 4.303, 5: 3.182, 7: 2.571, 12: 2.228, 22: 2.086, 31: 2.045, 32: 2.042, 33: 2.0395, 42: 2.0211, 62: 2.0003, 122: 1.9799 };
    for (const [n, t] of Object.entries(ref)) {
      expect(Math.abs(stats(pts(Number(n))).tValue - t), 'n=' + n).toBeLessThan(0.002);
    }
  });
});

describe('logarithmic fit with x <= 0 points', () => {
  const pts = P([0, 1, 2, 3, 4], [100, 1, 2, 3, 4]);

  it('R^2 is measured on the points the fit actually used', () => {
    // Reference: least squares y = a + b ln x on (1,1),(2,2),(3,3),(4,4) only.
    const fit = pts.filter((p) => p.x > 0);
    const u = fit.map((p) => Math.log(p.x));
    const y = fit.map((p) => p.y);
    const mu = u.reduce((s, v) => s + v, 0) / u.length;
    const my = y.reduce((s, v) => s + v, 0) / y.length;
    const b = u.reduce((s, v, i) => s + (v - mu) * (y[i] - my), 0) / u.reduce((s, v) => s + (v - mu) ** 2, 0);
    const a = my - b * mu;
    const ssRes = fit.reduce((s, p) => s + (p.y - (a + b * Math.log(p.x))) ** 2, 0);
    const ssTot = y.reduce((s, v) => s + (v - my) ** 2, 0);
    expect(stats(pts, 'logarithmic').logR2).toBeCloseTo(1 - ssRes / ssTot, 9);
  });

  it('is not ranked against fits that used every point', () => {
    const host = mount({ points: pts, activeTab: 'stats' });
    const rows = [...host.querySelectorAll('div.flex.items-center.gap-2.p-2.rounded-lg')];
    const names = rows.map((r) => (r.querySelector('span.w-20') || {}).textContent);
    expect(names).toContain('Linear');
    expect(names).not.toContain('Logarithmic');
    const bestRows = rows.filter((r) => /Best/.test(r.textContent));
    expect(bestRows.length, names.join(',')).toBe(1);
  });
});

describe('box plot whiskers', () => {
  it('stop at the most extreme non-outlier values', () => {
    // sorted 10 10 11 11 11 12 12 50: Q1 10.5, Q3 12, fence 12 + 1.5*1.5 = 14.25, so 50 is the outlier
    const ys = [10, 11, 12, 11, 10, 12, 11, 50];
    const host = mount({ points: ys.map((y, i) => ({ x: i + 1, y })), chartType: 'boxplot', activeTab: 'chart' });
    const svg = host.querySelector('svg[aria-label="Box plot of the current data set"]');
    expect(svg).not.toBeNull();
    const whisker = svg.querySelector('line');
    const dot = svg.querySelector('circle');
    const x1 = Number(whisker.getAttribute('x1'));
    const x2 = Number(whisker.getAttribute('x2'));
    const cx = Number(dot.getAttribute('cx'));
    // Axis runs from min 10 to max 50, so the whisker end (12) sits 2/40 of the way to the dot.
    expect((x2 - x1) / (cx - x1)).toBeCloseTo(2 / 40, 6);
  });
});

describe('single data point', () => {
  it('quartiles are the value itself and nothing is an outlier', () => {
    const s = stats(P([3], [5]));
    expect(s.q1).toBe(5);
    expect(s.q3).toBe(5);
    expect(s.outliers.length).toBe(0);
  });
});
