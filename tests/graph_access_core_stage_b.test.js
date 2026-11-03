// Shared graph core v2 (stage B, 2026-11-03): the one root engine, rate of change, exact
// family features (domain, range, intervals, extrema, ends, asymptotes), window features,
// worked examples and the export helpers. Every expectation is worked out by hand.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

const GC = 'stem_lab/stem_tool_graphcalc.js';
const START = '  // == alloGraphAccess core v2 (keep byte-identical in graphcalc + funcgrapher) ==';
const END = '  // == end alloGraphAccess core v2 ==';
function block() {
  const src = fs.readFileSync(GC, 'utf8');
  const a = src.indexOf(START), b = src.indexOf(END, a);
  expect(a).toBeGreaterThan(-1);
  return src.slice(a, b + END.length);
}
let GA;
beforeEach(() => { window.StemLab = { tools: {} }; new Function(block())(); GA = window.StemLab._graphAccess; }); // eslint-disable-line no-new-func
const PI = Math.PI;
const t = (k, fb) => fb;

describe('one root engine', () => {
  it('is version 2 and replaces an older copy, but not a newer one', () => {
    expect(GA.version).toBe(2);
    window.StemLab = { tools: {}, _graphAccess: { version: 1 } };
    new Function(block())(); // eslint-disable-line no-new-func
    expect(window.StemLab._graphAccess.version).toBe(2);
    const v2 = window.StemLab._graphAccess;
    new Function(block())(); // eslint-disable-line no-new-func
    expect(window.StemLab._graphAccess).toBe(v2);
  });

  it('finds roots that sit exactly on the window edges (sin x on [-2π, 2π])', () => {
    const scan = GA.scanRoots(Math.sin, -2 * PI, 2 * PI);
    expect(scan.candidates.map((c) => c.method)).toEqual(['window edge', 'sign change', 'sample zero', 'sign change', 'window edge']);
    const z = GA.zerosOf(Math.sin, -2 * PI, 2 * PI).xs;
    expect(z.length).toBe(5);
    [-2 * PI, -PI, 0, PI, 2 * PI].forEach((r, i) => expect(z[i]).toBeCloseTo(r, 9));
  });

  it('does not call a decaying tail at the edge a root, nor a pole a root', () => {
    expect(GA.zerosOf((x) => Math.exp(-x), 0, 30).xs).toEqual([]);
    expect(GA.zerosOf((x) => 1 / x, -10, 10).xs).toEqual([]);
    expect(GA.zerosOf((x) => 2 / (x - 3), -10, 10).xs).toEqual([]);
  });

  it('snaps near-integers, keeps two close roots apart, and finds touching roots', () => {
    expect(GA.zerosOf((x) => x * x - 4, -10, 10).xs).toEqual([-2, 2]);
    expect(GA.zerosOf((x) => 2 * x - 4, -10, 10).xs).toEqual([2]);
    expect(GA.zerosOf((x) => x, -10, 10).xs).toEqual([0]);
    expect(GA.zerosOf((x) => (x - 2) * (x - 2), -10, 10).xs).toEqual([2]);
    const r = GA.zerosOf((x) => 1 / x + 0.5, -10, 10).xs;
    expect(r).toEqual([-2]);
    const close = GA.zerosOf((x) => x * x - 0.0001, -10, 10).xs;
    expect(close.length).toBe(2);
    expect(close[0]).toBeCloseTo(-0.01, 9);
    expect(close[1]).toBeCloseTo(0.01, 9);
    expect(GA.zerosOf(() => 0, -1, 1).xs).toBeUndefined();
    expect(GA.zerosOf(Math.sin, 2, 1)).toMatchObject({ xs: [], scan: { errorCode: 'interval' } });
  });

  it('describeGraph keeps both close roots, each as a crossing, when the engine hands them in', () => {
    const f = (x) => x * x - 0.0001;
    const xs = GA.zerosOf(f, -10, 10).xs;
    const d = GA.describeGraph(GA.sample(f, -10, 10, 201), { t, evaluate: f, zeros: xs, ymin: -10, ymax: 10 });
    expect(d.features.zeros.map((z) => z.kind)).toEqual(['cross', 'cross']);
    const plan = GA.sonifyPlan(GA.sample(f, -10, 10, 201), { evaluate: f, zeros: xs, ymin: -10, ymax: 10 });
    expect(plan.cues.length).toBe(2);
  });
});

describe('rate of change', () => {
  it('average rate from A to B, and undefined points', () => {
    expect(GA.rateOfChange((x) => x * x, 1, 3)).toEqual({ x1: 1, y1: 1, x2: 3, y2: 9, dx: 2, dy: 8, rate: 4 });
    expect(GA.rateOfChange((x) => x * x, 3, 1).rate).toBe(4);
    expect(GA.rateOfChange((x) => 3 * x - 1, -1, 2).rate).toBe(3);
    expect(GA.rateOfChange((x) => Math.pow(2, x), 0, 3).rate).toBeCloseTo(7 / 3, 12);
    expect(GA.rateOfChange(Math.sqrt, -1, 4)).toMatchObject({ dy: null, rate: null });
    expect(GA.rateOfChange(Math.sqrt, 2, 2)).toBeNull();
  });

  it('equal steps contrast linear (same Δy) with exponential (same ratio)', () => {
    const lin = GA.rateSteps((x) => 3 * x - 1, 0, 4, 4);
    expect(lin.pattern).toBe('linear');
    expect(lin.difference).toBe(3);
    const exp = GA.rateSteps((x) => Math.pow(2, x), 0, 4, 4);
    expect(exp.pattern).toBe('exponential');
    expect(exp.ratio).toBe(2);
    expect(exp.rows.map((r) => r.dy)).toEqual([null, 1, 2, 4, 8]);
    expect(GA.rateSteps((x) => x * x, 0, 4, 4).pattern).toBe('quadratic');
  });
});

describe('exact family features (domain, range, intervals, extrema, ends, asymptotes)', () => {
  const rows = (type, a, b, c) => Object.fromEntries(GA.featureRows(GA.familyFeatures(type, a, b, c), t).map((r) => [r.id, r.value]));

  it('square root: a√(x + b) + c starts at its endpoint', () => {
    const r = rows('sqrt', 2, 1, -3);
    expect(r.domain).toBe('[−1, ∞)');
    expect(r.range).toBe('[−3, ∞)');
    expect(r.inc).toBe('(−1, ∞)');
    expect(r.ext).toBe('a minimum at the endpoint (−1, −3)');
    expect(rows('sqrt', -1, 0, 2).range).toBe('(−∞, 2]');
    expect(rows('sqrt', 0, 0, 2)).toMatchObject({ domain: '[0, ∞)', range: '{2}', flat: '[0, ∞)' });
  });

  it('logarithm: domain x > −b, all real outputs, a vertical asymptote', () => {
    const r = rows('log', 1, 2, 0);
    expect(r.domain).toBe('(−2, ∞)');
    expect(r.range).toBe('(−∞, ∞)');
    expect(r.inc).toBe('(−2, ∞)');
    expect(r.asym).toBe('vertical: x = −2');
    expect(r.ends).toBe('As x → −2⁺, y → −∞. As x → ∞, y → ∞.');
    expect(rows('log', -1, 0, 0).dec).toBe('(0, ∞)');
  });

  it('1/x family: two pieces of domain and range, two asymptotes', () => {
    const r = rows('rational', 1, 0, 0);
    expect(r.domain).toBe('(−∞, 0) ∪ (0, ∞)');
    expect(r.range).toBe('(−∞, 0) ∪ (0, ∞)');
    expect(r.dec).toBe('(−∞, 0) ∪ (0, ∞)');
    expect(r.inc).toBe('nowhere');
    expect(r.asym).toBe('vertical: x = 0; horizontal: y = 0');
    const s = rows('rational', -2, 1, 3);
    expect(s.domain).toBe('(−∞, −1) ∪ (−1, ∞)');
    expect(s.range).toBe('(−∞, 3) ∪ (3, ∞)');
    expect(s.inc).toBe('(−∞, −1) ∪ (−1, ∞)');
    expect(s.ends).toBe('As x → −∞, y → 3. As x → −1⁻, y → ∞. As x → −1⁺, y → −∞. As x → ∞, y → 3.');
  });

  it('sine: range [−|a|, |a|], one period of increase and decrease', () => {
    const r = rows('trig', 2, 1, 0);
    expect(r.domain).toBe('(−∞, ∞)');
    expect(r.range).toBe('[−2, 2]');
    expect(r.inc).toBe('(−1.57, 1.57) (and again every 6.28 units along x)');
    expect(r.dec).toBe('(1.57, 4.71) (and again every 6.28 units along x)');
    expect(r.ext).toBe('maximum value 2 at x = 1.57 and minimum value −2 at x = −1.57 (and again every 6.28 units along x)');
    expect(r.ends).toMatch(/keeps rising and falling between −2 and 2/);
    // a·sin(bx + c) with b = 2, c = 1: the maximum is where 2x + 1 = π/2
    const f = GA.familyFeatures('trig', 1, 2, 1);
    expect(f.extrema[0].x).toBeCloseTo((PI / 2 - 1) / 2, 12);
    expect(f.period.p).toBeCloseTo(PI, 12);
    expect(rows('trig', 3, 0, 0.5).range).toBe('{' + GA.formatNumber(3 * Math.sin(0.5)) + '}');
  });

  it('exponential: range above or below the asymptote y = c', () => {
    const r = rows('exponential', 1, 1, 2);
    expect(r.range).toBe('(2, ∞)');
    expect(r.inc).toBe('(−∞, ∞)');
    expect(r.asym).toBe('horizontal: y = 2');
    expect(r.ends).toBe('As x → −∞, y → 2. As x → ∞, y → ∞.');
    expect(rows('exponential', -3, 1, 0)).toMatchObject({ range: '(−∞, 0)', dec: '(−∞, ∞)' });
    expect(rows('exponential', 2, -1, 0)).toMatchObject({ range: '(0, ∞)', dec: '(−∞, ∞)', ends: 'As x → −∞, y → ∞. As x → ∞, y → 0.' });
  });

  it('quadratic: vertex from the rule, range from the vertex', () => {
    const r = rows('quadratic', 1, -2, -3);
    expect(r.range).toBe('[−4, ∞)');
    expect(r.dec).toBe('(−∞, 1)');
    expect(r.inc).toBe('(1, ∞)');
    expect(r.ext).toBe('an absolute minimum at (1, −4)');
    expect(rows('quadratic', -2, 0, 5)).toMatchObject({ range: '(−∞, 5]', inc: '(−∞, 0)', dec: '(0, ∞)' });
    expect(rows('quadratic', 0, 2, 1)).toMatchObject({ range: '(−∞, ∞)', inc: '(−∞, ∞)' });
  });

  it('cubic and absolute value', () => {
    const c = GA.familyFeatures('cubic', 1, -3, 0); // x³ − 3x: turns at ±1
    expect(c.extrema.map((e) => [e.x, e.y, e.kind])).toEqual([[-1, 2, 'max'], [1, -2, 'min']]);
    expect(GA.intervalText(c.inc)).toBe('(−∞, −1) ∪ (1, ∞)');
    expect(GA.intervalText(c.dec)).toBe('(−1, 1)');
    expect(GA.familyFeatures('cubic', 1, 3, 0).extrema).toEqual([]);
    expect(rows('absolute', -1, 2, 4)).toMatchObject({ range: '(−∞, 4]', inc: '(−∞, −2)', dec: '(−2, ∞)', ext: 'an absolute maximum at (−2, 4)' });
  });

  it('rejects unknown families and non-finite parameters', () => {
    expect(GA.familyFeatures('spiral', 1, 1, 1)).toBeNull();
    expect(GA.familyFeatures('linear', NaN, 1, 1)).toBeNull();
  });
});

describe('window features for rules with no family', () => {
  const win = (f, x0, x1) => GA.windowFeatures(GA.analyse(GA.sample(f, x0, x1, 201), { evaluate: f, ymin: -10, ymax: 10 }), f);
  it('a log rule: the domain edge is open where the rule is undefined', () => {
    const w = win((x) => Math.log(x) / Math.LN10, -10, 10);
    expect(w.exact).toBe(false);
    expect(GA.intervalText(w.domain)).toBe('(0, 10]');
  });
  it('a square-root rule: the edge is closed', () => {
    expect(GA.intervalText(win(Math.sqrt, -10, 10).domain)).toBe('[0, 10]');
  });
  it('a pole splits the domain with open ends; a jump keeps it whole', () => {
    const w = win((x) => 1 / x, -10, 10);
    expect(GA.intervalText(w.domain)).toBe('[−10, 0) ∪ (0, 10]');
    expect(w.breaks).toEqual([0]);
    const step = win((x) => (x < 1 ? 0 : 5), -10, 10);
    expect(step.domain.length).toBe(1);
  });
  it('range and turning points from the samples', () => {
    const w = win((x) => x * x - 4, -3, 3);
    expect(GA.intervalText(w.range)).toBe('[−4, 5]');
    expect(w.extrema).toEqual([{ x: 0, y: -4, kind: 'min', scope: 'local' }]);
  });
});

describe('worked examples: every number from the example rule', () => {
  it('zeros, y-intercepts, transformations and rates', () => {
    const z = GA.workedSet('zeros', t);
    expect(z.length).toBe(3);
    expect(z[0].problem).toBe('Find the zeros of f(x) = x² − x − 6.');
    expect(z[0].steps[2]).toBe('Factor: (x + 2)(x − 3) = 0.');
    expect(z[0].steps[4]).toBe('Check on the graph: it meets the x-axis at x = −2 and 3.');
    expect(GA.workedSet('yint', t)[1].steps[2]).toBe('Work it out: 0 + 0 − 1 = −1.');
    expect(GA.workedSet('yint', t)[2].answer).toBe('(0, 4)');
    const tr = GA.workedSet('transform', t)[1];
    expect(tr.problem).toBe('How is y = −2(x + 1)² + 3 moved from the parent y = x²?');
    expect(tr.steps[3]).toBe('The factor a = −2: the parabola is flipped over the x-axis and stretched vertically (narrower).');
    expect(tr.steps[4]).toBe('The vertex moves from (0, 0) to (−1, 3). Check: f(−1) = 3.');
    const r = GA.workedSet('rate', t);
    expect(r[0].steps[2]).toBe('Δy = 9 − 1 = 8 and Δx = 3 − 1 = 2.');
    expect(r[1].steps[2]).toBe('Δy = 5 − (−4) = 9 and Δx = 2 − (−1) = 3.');
    expect(r[2].answer).toBe('2.33');
  });
});

describe('teacher export helpers', () => {
  it('quotes CSV cells that need it', () => {
    expect(GA.csvText([['metric', 'value'], ['a, b', 'say "hi"'], ['n', 3]])).toBe('metric,value\n"a, b","say ""hi"""\nn,3');
  });
  it('prints through a new window with the content escaped, and reports a blocked pop-up', () => {
    let written = '';
    const fake = { document: { open() {}, write(s) { written += s; }, close() {} } };
    const orig = window.open;
    window.open = () => fake;
    expect(GA.printReport('Report <1>', [['Score', '<b>5</b>']], 'x < y')).toBe(true);
    expect(written).toContain('<title>Report &lt;1&gt;</title>');
    expect(written).toContain('<td>&lt;b&gt;5&lt;/b&gt;</td>');
    expect(written).toContain('<pre>x &lt; y</pre>');
    expect(written).toContain('window.print()');
    window.open = () => null;
    expect(GA.printReport('R', [])).toBe(false);
    window.open = orig;
  });
});
