import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// First machine verification for the Data Plotter's statistics engine.
// Module-scope helpers load directly; the render-scope statistics block and
// stem-and-leaf builder are executed from source slices against known data.

const src = fs.readFileSync('stem_lab/stem_tool_dataplot.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_dataplot.js', 'utf8');

const Mod = (() => {
  const start = src.indexOf('var datasetLibrary = [');
  const end = src.indexOf("window.StemLab.registerTool('dataPlot'", start);
  expect(start).toBeGreaterThan(-1);
  // eslint-disable-next-line no-new-func
  return new Function(
    src.slice(start, end) +
    '\nreturn { datasetLibrary: datasetLibrary, generateCorrelated: generateCorrelated, zToPercentile: zToPercentile, normalPDF: normalPDF, correlationScenarios: correlationScenarios, matchChartScenarios: matchChartScenarios, guessR2Scenarios: guessR2Scenarios, outlierScenarios: outlierScenarios };'
  )();
})();

// Slice the render-scope stats block: from `var n = visiblePoints.length` to
// the undo system, driven with injected points.
function stats(points) {
  const start = src.indexOf('var n = visiblePoints.length;');
  const end = src.indexOf('// ── Undo System ──', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('visiblePoints', 'allX', 'allY', 'regressionType', 'predX',
    src.slice(start, end) +
    '\nreturn { n: n, meanY: meanY, slope: slope, intercept: intercept, r2: r2, yMedian: yMedian, q1: q1, q3: q3, iqr: iqr, stdDev: stdDev, outliers: outliers, histBins: histBins, spearmanR: spearmanR, pearsonR: pearsonR, stemLeafData: stemLeafData, cumulativeFreq: cumulativeFreq, quadA: quadA, quadB: quadB, quadC: quadC, quadR2: quadR2 };'
  )(points, points.map((p) => p.x), points.map((p) => p.y), 'linear', '');
}

describe('descriptive statistics', () => {
  const pts = [1, 2, 3, 4, 5].map((v) => ({ x: v, y: v * 2 }));

  it('computes exact regression for perfectly linear data', () => {
    const s = stats(pts);
    expect(s.slope).toBeCloseTo(2, 9);
    expect(s.intercept).toBeCloseTo(0, 9);
    expect(s.r2).toBeCloseTo(1, 9);
    expect(s.pearsonR).toBeCloseTo(1, 6);
    expect(s.spearmanR).toBeCloseTo(1, 9);
  });

  it('computes median, quartiles, and IQR with the exclusive method', () => {
    const s = stats([3, 7, 8, 5, 12, 14, 21, 13, 18].map((y, i) => ({ x: i, y })));
    // sorted: 3 5 7 8 12 13 14 18 21 -> median 12, Q1 median(3,5,7,8)=6, Q3 median(13,14,18,21)=16
    expect(s.yMedian).toBe(12);
    expect(s.q1).toBe(6);
    expect(s.q3).toBe(16);
    expect(s.iqr).toBe(10);
  });

  it('flags IQR outliers', () => {
    const s = stats([10, 11, 12, 11, 10, 12, 11, 50].map((y, i) => ({ x: i, y })));
    expect(s.outliers.length).toBe(1);
    expect(s.outliers[0].y).toBe(50);
  });

  it('quadratic regression recovers an exact parabola', () => {
    const s = stats([-2, -1, 0, 1, 2, 3].map((x) => ({ x, y: 2 * x * x - 3 * x + 1 })));
    expect(s.quadA).toBeCloseTo(2, 6);
    expect(s.quadB).toBeCloseTo(-3, 6);
    expect(s.quadC).toBeCloseTo(1, 6);
    expect(s.quadR2).toBeCloseTo(1, 9);
  });

  it('anticorrelated data yields negative Pearson and Spearman', () => {
    const s = stats([1, 2, 3, 4, 5].map((v) => ({ x: v, y: 20 - 3 * v })));
    expect(s.pearsonR).toBeCloseTo(-1, 6);
    expect(s.spearmanR).toBeCloseTo(-1, 9);
    expect(s.slope).toBeCloseTo(-3, 9);
  });
});

describe('stem-and-leaf', () => {
  it('files negative values under the correct stem (regression pin)', () => {
    // floor(-23/10) = -3 used to file -23 under stem -3 (reading as -33).
    const s = stats([{ x: 1, y: -23 }, { x: 2, y: -5 }, { x: 3, y: 7 }, { x: 4, y: 73 }]);
    const byStem = Object.fromEntries(s.stemLeafData.map((r) => [r.stem, r.leaves]));
    expect(byStem['-2']).toEqual([3]);
    expect(byStem['-0']).toEqual([5]);
    expect(byStem['0']).toEqual([7]);
    expect(byStem['7']).toEqual([3]);
    expect(s.stemLeafData.map((r) => r.stem)).toEqual(['-2', '-0', '0', '7']);
  });

  it('keeps positive rows sorted with multi-leaf stems', () => {
    const s = stats([71, 73, 78, 82, 65].map((y, i) => ({ x: i, y })));
    const byStem = Object.fromEntries(s.stemLeafData.map((r) => [r.stem, r.leaves]));
    expect(byStem['7']).toEqual([1, 3, 8]);
    expect(byStem['8']).toEqual([2]);
    expect(byStem['6']).toEqual([5]);
  });
});

describe('normal-curve helpers', () => {
  it('zToPercentile matches the standard normal table', () => {
    expect(Mod.zToPercentile(0)).toBeCloseTo(50, 1);
    expect(Mod.zToPercentile(1)).toBeCloseTo(84.13, 1);
    expect(Mod.zToPercentile(-1)).toBeCloseTo(15.87, 1);
    expect(Mod.zToPercentile(1.96)).toBeCloseTo(97.5, 1);
  });

  it('normalPDF peaks at the mean and handles sd=0', () => {
    expect(Mod.normalPDF(5, 5, 2)).toBeGreaterThan(Mod.normalPDF(7, 5, 2));
    expect(Mod.normalPDF(0, 0, 1)).toBeCloseTo(0.3989, 3);
    expect(Mod.normalPDF(1, 1, 0)).toBe(0);
  });
});

describe('quiz banks and generators', () => {
  it('correlation scenarios generate data matching their advertised direction', () => {
    for (const sc of Mod.correlationScenarios) {
      if (sc.a === 'None') continue;
      const pts = sc.gen();
      const s = stats(pts);
      if (sc.a === 'Positive') expect(s.slope, sc.q).toBeGreaterThan(0);
      else expect(s.slope, sc.q).toBeLessThan(0);
    }
  });

  it('outlier scenarios produce a genuinely detectable outlier at the stored index', () => {
    for (const sc of Mod.outlierScenarios) {
      for (let i = 0; i < 20; i++) {
        const { pts, outlierIdx } = sc.gen();
        const ys = pts.map((p) => p.y);
        const others = ys.filter((_, j) => j !== outlierIdx);
        const lo = Math.min(...others);
        const hi = Math.max(...others);
        const v = ys[outlierIdx];
        expect(v < lo || v > hi, sc.label).toBe(true);
        expect(Math.min(Math.abs(v - lo), Math.abs(v - hi))).toBeGreaterThan(5);
      }
    }
  });

  it('match-chart scenarios always include their answer among the options', () => {
    for (const sc of Mod.matchChartScenarios) {
      expect(sc.opts, sc.q).toContain(sc.a);
      expect(new Set(sc.opts).size).toBe(sc.opts.length);
    }
  });

  it('generateCorrelated produces the requested correlation sign', () => {
    const pos = stats(Mod.generateCorrelated(0.9, 30));
    const neg = stats(Mod.generateCorrelated(-0.9, 30));
    expect(pos.slope).toBeGreaterThan(0);
    expect(neg.slope).toBeLessThan(0);
  });

  it('built-in datasets are non-empty with finite coordinates', () => {
    for (const ds of Mod.datasetLibrary) {
      expect(ds.pts.length, ds.label).toBeGreaterThan(5);
      for (const p of ds.pts) {
        expect(isFinite(p.x) && isFinite(p.y), ds.label).toBe(true);
      }
    }
  });
});

describe('source pins', () => {
  it('quiz shuffles are Fisher-Yates and quiz data replacement records an undo entry', () => {
    expect(src).not.toContain('Math.random() - 0.5');
    expect(src.split('fyShuffle(').length - 1).toBe(3);
    expect(src).toContain('var quizUndo = pushUndo();');
    expect(src.split('undoStack: quizUndo').length - 1).toBe(3);
  });

  it('regression comparison ranks and colors by raw R², not |R²|', () => {
    expect(src).toContain('.sort(function(a, b) { return b.r2 - a.r2; })');
    expect(src).not.toContain('Math.abs(b.r2) - Math.abs(a.r2)');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
