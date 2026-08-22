import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Graphing Calculator's math engine: expression
// cleanup (log/ln calculator conventions), grade-band parsing, and the
// Analyze scan (zeros + intersections) driven with a stubbed math.compile.

const src = fs.readFileSync('stem_lab/stem_tool_graphcalc.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_graphcalc.js', 'utf8');

const helpers = (() => {
  const start = src.indexOf('function getGradeBand(ctx)');
  const end = src.indexOf('var BADGES =', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn { getGradeBand, gcCleanExpr, gcFiniteNumber, gcNormalizeTableStep, gcBuildTableXValues };')();
})();

describe('grade band parsing', () => {
  it('parses the STRING gradeLevel the live ctx provides (regression pin)', () => {
    // ctx.gradeLevel is a string like '5th Grade'; numeric comparisons on it
    // were all false, so every student landed in the 9-12 band.
    expect(helpers.getGradeBand({ gradeLevel: 'Kindergarten' })).toBe('k2');
    expect(helpers.getGradeBand({ gradeLevel: '2nd Grade' })).toBe('k2');
    expect(helpers.getGradeBand({ gradeLevel: '5th Grade' })).toBe('g35');
    expect(helpers.getGradeBand({ gradeLevel: '7th Grade' })).toBe('g68');
    expect(helpers.getGradeBand({ gradeLevel: '10th Grade' })).toBe('g912');
    expect(helpers.getGradeBand({})).toBe('g35');
  });

  it('still honors numeric grade levels', () => {
    expect(helpers.getGradeBand({ gradeLevel: 2 })).toBe('k2');
    expect(helpers.getGradeBand({ gradeLevel: 5 })).toBe('g35');
    expect(helpers.getGradeBand({ gradeLevel: 8 })).toBe('g68');
    expect(helpers.getGradeBand({ gradeLevel: 11 })).toBe('g912');
  });
});

describe('expression cleanup', () => {
  const clean = helpers.gcCleanExpr;

  it('strips y= / f(x)= prefixes and inserts implicit multiplication', () => {
    expect(clean('y = 2x + 3')).toBe('2*x + 3');
    expect(clean('f(x) = 3x')).toBe('3*x');
  });

  it('maps calculator conventions onto mathjs: log( is base 10, ln( is natural', () => {
    // mathjs log( is NATURAL and it has no ln( at all — the Math Pad's ln
    // button produced an invalid expression and the curve silently vanished.
    expect(clean('ln(x)')).toBe('log(x)');
    expect(clean('log(x)')).toBe('log10(x)');
    expect(clean('log(x)/log(2)')).toBe('log10(x)/log10(2)');
    expect(clean('log10(x)')).toBe('log10(x)');
    // \b would miss 'ln' after a digit (digit→letter is not a word boundary);
    // mathjs implicit multiplication handles the missing '*'.
    expect(clean('2ln(x) + log(x)')).toBe('2log(x) + log10(x)');
    expect(clean('x*ln(x)')).toBe('x*log(x)');
  });
});

describe('value-table sampling', () => {
  it('always creates a finite 11-row sequence, including for negative steps', () => {
    expect(helpers.gcBuildTableXValues(2, -0.5, 11)).toEqual([
      2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5, -2, -2.5, -3,
    ]);
    expect(helpers.gcBuildTableXValues('-2', '0.25', 3)).toEqual([-2, -1.75, -1.5]);
  });

  it('normalizes blank, invalid, and zero steps without risking an infinite loop', () => {
    expect(helpers.gcNormalizeTableStep('')).toBe(1);
    expect(helpers.gcNormalizeTableStep('not-a-number')).toBe(1);
    expect(helpers.gcNormalizeTableStep(0)).toBe(1);
    expect(helpers.gcBuildTableXValues('', 1, 2)).toEqual([-5, -4]);
  });
});

// ── Analyze scan: slice runAnalysis and drive it with a stubbed math.compile ──
function runAnalyze(exprFns, win) {
  const start = src.indexOf('function runAnalysis()');
  const end = src.indexOf('/* ── AI Tutor ── */', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const funcs = Object.keys(exprFns).map((expr, i) => ({ expr, color: '#fff' }));
  const captured = {};
  const stubMath = { compile: (expr) => ({ evaluate: (scope) => exprFns[expr](scope.x) }) };
  // eslint-disable-next-line no-new-func
  new Function('window', 'math', 'SOUNDS', 'funcs', 'd', 'win', 'gcCleanExpr', 'updMulti',
    src.slice(start, end) + '\nrunAnalysis();'
  )({ math: stubMath }, stubMath, { analyzeComplete: () => {} }, funcs, {}, win,
    (e) => e, (u) => Object.assign(captured, u));
  return captured;
}
const WIN = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

describe('Analyze: zeros', () => {
  it('does not report zeros at vertical asymptotes (regression pin)', () => {
    // tan(x) used to report "zeros" at every asymptote (pi/2, 3pi/2, ...).
    const res = runAnalyze({ 'tan(x)': Math.tan }, { xmin: -6.28, xmax: 6.28, ymin: -2, ymax: 2 });
    for (const z of res._zeros) expect(Math.abs(Math.tan(z.x)), 'x=' + z.x).toBeLessThan(0.5);
    expect(res._zeros.length).toBe(3);
    expect(res._zeros.map((z) => Math.round(z.x * 100) / 100 + 0)).toEqual([-3.14, 0, 3.14]);

    // 1/x has NO zeros; its sign flip at x = 0 used to produce one.
    expect(runAnalyze({ '1/x': (x) => 1 / x }, WIN)._zeros).toEqual([]);
  });

  it('still finds genuine zeros precisely', () => {
    const res = runAnalyze({ 'x*x - 4': (x) => x * x - 4 }, WIN);
    expect(res._zeros.length).toBe(2);
    expect(res._zeros[0].x).toBeCloseTo(-2, 4);
    expect(res._zeros[1].x).toBeCloseTo(2, 4);
    expect(res._foundZero).toBe(true);
  });
});

describe('Analyze: intersections', () => {
  it('does not report an intersection where the difference blows up across an asymptote', () => {
    // 1/x vs y = -1 truly meet only at x = -1; the difference's sign flip
    // across x = 0 used to add a phantom intersection there.
    const res = runAnalyze({ '1/x': (x) => 1 / x, '-1': () => -1 }, WIN);
    expect(res._intersections.length).toBe(1);
    expect(res._intersections[0].x).toBeCloseTo(-1, 4);
    expect(res._intersections[0].y).toBeCloseTo(-1, 4);
  });

  it('still finds genuine intersections', () => {
    const res = runAnalyze({ '2*x - 4': (x) => 2 * x - 4, 'x': (x) => x }, WIN);
    expect(res._intersections.length).toBe(1);
    expect(res._intersections[0].x).toBeCloseTo(4, 4);
    expect(res._intersections[0].y).toBeCloseTo(4, 4);
    expect(res._foundIntersection).toBe(true);
  });
});

describe('source pins', () => {
  it('expression cleanup is shared, not copy-pasted per call site', () => {
    expect(src.split('replace(/^y\\s*=\\s*/i').length - 1).toBe(1);
    expect(src.split('gcCleanExpr(').length - 1).toBeGreaterThanOrEqual(7);
  });

  it('the tool registers with a human-readable label', () => {
    expect(src).toContain("label: 'Graphing Calculator'");
    expect(src).not.toContain("label: 'graphCalc'");
  });

  it('tool_index.json carries the new label in both copies', () => {
    for (const p of ['tool_index.json', 'desktop/web-app/public/tool_index.json']) {
      const idx = fs.readFileSync(p, 'utf8');
      expect(idx, p).toContain('"graphCalc","label":"Graphing Calculator"');
    }
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
