// Data Plot, stage D (independent bug hunt, 2026-11-04). Each block pins one confirmed defect;
// every expected value comes from an independent reference in this file, never the tool's own code.
import fs from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FILE, setup, teardown, mount, click, flush, setValue, pts, M, React } from './dataplot_deep_helpers.js';

const src = fs.readFileSync(FILE, 'utf8');
// The render-scope statistics block, sliced as tests/math_review_geodata_dataplot_stats.test.js does.
function stats(points, regressionType) {
  const start = src.indexOf('var n = visiblePoints.length;');
  const end = src.indexOf('// ── Undo System ──', start);
  // eslint-disable-next-line no-new-func
  return new Function('visiblePoints', 'allX', 'allY', 'regressionType', 'predX',
    src.slice(start, end) + '\nreturn { quadA: quadA, quadB: quadB, quadC: quadC, quadR2: quadR2, expR2: expR2, slope: slope, r2: r2 };'
  )(points, points.map((p) => p.x), points.map((p) => p.y), regressionType || 'linear', '');
}
// Least squares y = c0 + c1 u + c2 u^2 on u = x - mean(x), by Gaussian elimination: well conditioned.
function polyRef(xs, ys, deg) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, k = deg + 1;
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  xs.forEach((x, i) => { const pw = []; for (let j = 0; j < k; j++) pw.push((x - mx) ** j); for (let r = 0; r < k; r++) { for (let c = 0; c < k; c++) A[r][c] += pw[r] * pw[c]; A[r][k] += pw[r] * ys[i]; } });
  for (let c = 0; c < k; c++) for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let q = c; q <= k; q++) A[r][q] -= f * A[c][q]; }
  const cu = A.map((row, i) => row[k] / A[i][i]);
  return (x) => cu.reduce((s, c, j) => s + c * (x - mx) ** j, 0);
}
const rSquared = (xs, ys, f) => { const my = ys.reduce((a, b) => a + b, 0) / ys.length; let sr = 0, st = 0; xs.forEach((x, i) => { sr += (ys[i] - f(x)) ** 2; st += (ys[i] - my) ** 2; }); return 1 - sr / st; };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const tt = (k, fb) => fb;

beforeEach(setup);
afterEach(async () => { vi.restoreAllMocks(); await teardown(); });

describe('regression models on x values far from 0 (years)', () => {
  const years = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020];
  it('the quadratic fit matches least squares (it was garbage: R² = −0.87)', () => {
    const ys = [3, 5, 6, 9, 12, 16, 19, 25, 30, 37, 44];
    const s = stats(years.map((x, i) => ({ x, y: ys[i] })), 'quadratic');
    const ref = polyRef(years, ys, 2);
    expect(s.quadR2).toBeCloseTo(rSquared(years, ys, ref), 6);
    // a = 0.32401, and the raw coefficients reproduce the reference curve at every year.
    expect(s.quadA).toBeCloseTo(0.3240093, 5);
    years.forEach((x) => expect(s.quadA * x * x + s.quadB * x + s.quadC).toBeCloseTo(ref(x), 3));
  });
  it('an exponential fit to fast growth over years is finite and matches the log-linear reference', () => {
    const ys = years.map((x, i) => 3 * Math.pow(2, i) * (1 + 0.05 * Math.sin(i)));
    const s = stats(years.map((x, i) => ({ x, y: ys[i] })), 'exponential');
    const lf = polyRef(years, ys.map(Math.log), 1);
    expect(Number.isFinite(s.expR2)).toBe(true);
    expect(s.expR2).toBeCloseTo(rSquared(years, ys, (x) => Math.exp(lf(x))), 6);
  });
  it('the chart predicts with the fitted quadratic and the R² readout is not negative', async () => {
    const ys = [3, 5, 6, 9, 12, 16, 19, 25, 30, 37, 44];
    await mount({ points: years.map((x, i) => ({ x, y: ys[i] })), regressionType: 'quadratic', predX: '2021', activeTab: 'tools' }, { ctx: { gradeBand: 'g912' } });
    const ref = polyRef(years, ys, 2)(2021);
    expect(document.getElementById('root').textContent).toContain(ref.toFixed(2));
  });
});

describe('equations keep tiny coefficients readable', () => {
  it('a·e^(bx) fitted to years does not print a = 0.00', () => {
    const eq = M().equationText('exponential', { a: 1.234e-218, b: 0.25 });
    expect(eq).not.toMatch(/^y = 0\.00e/);
    expect(eq).toBe('y = 1.23×10^-218e^(0.2500x)');
    expect(M().equationText('linear', { m: -0.004, b: 3 })).toBe('y = −0.00400x + 3.00');
    expect(M().equationText('linear', { m: 2, b: -0.001 })).toBe('y = 2.00x − 0.00100');
    // Ordinary sizes and exact zeros print as before.
    expect(M().equationText('quadratic', { a: 1, b: -3, c: 0 })).toBe('y = 1.0000x² − 3.00x + 0.00');
  });
});

describe('Find the outlier: exactly one value beyond the 1.5 × IQR fences', () => {
  it('every generated set has one fence outlier, and it is the answer (about 1 in 18 had two or more)', () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(11));
    const bad = [];
    for (let s = 0; s < 1500; s++) {
      const q = M().genQuizItem('outlier', tt, M().seededRand(s + 1));
      const ys = q.chart.pts.map((p) => p.y), srt = ys.slice().sort((a, b) => a - b);
      const med = (a) => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
      const q1 = med(srt.slice(0, Math.floor(srt.length / 2))), q3 = med(srt.slice(Math.ceil(srt.length / 2))), f = 1.5 * (q3 - q1);
      const outs = ys.map((y, i) => (y < q1 - f || y > q3 + f ? i : -1)).filter((i) => i >= 0);
      if (outs.length !== 1 || String(outs[0]) !== q.answer) bad.push(ys.join(','));
    }
    expect(bad.length, bad.slice(0, 3).join(' | ')).toBe(0);
  });
});

describe('a revealed quiz answer pays no XP when the same item comes back', () => {
  async function missTwiceAndReveal(m) {
    const q = m.latest.dpQuiz;
    const wrong = q.choices.map((c) => c.id).filter((id) => id !== q.answer);
    await click(document.querySelector('[data-dataplot-choice="' + wrong[0] + '"]'));
    await click(document.querySelector('[data-dataplot-choice="' + wrong[1] + '"]'));
    await click(document.querySelector('[data-dataplot-reveal="quiz"]'));
  }
  it('Show the answer, then the same matching question again: no XP', async () => {
    const m = await mount({ level: '912', activeTab: 'quiz', quizType: 'matchChart' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await click(document.querySelector('[data-dataplot-quiz-new]'));
    expect(m.latest.dpQuiz.key).toBe('chart:proportions');
    await missTwiceAndReveal(m);
    expect(m.latest.quizXpItems['shown:chart:proportions']).toBe(true);
    await click(Array.from(document.querySelectorAll('button')).find((b) => /Next/.test(b.textContent)));
    expect(m.latest.dpQuiz.key).toBe('chart:proportions');
    expect(m.latest.dpQuiz.revealed).toBe(false);
    await click(document.querySelector('[data-dataplot-choice="Pie"]'));
    expect(m.latest.dpQuiz.correct).toBe(true);
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot')).toEqual([]);
    expect(m.latest.quizXpTotal || 0).toBe(0);
  });
  it('the answer hint (step 4) also forfeits the item, and the mark survives a reload', async () => {
    const item = M().genQuizItem('matchChart', tt, () => 0);
    let m = await mount({ level: '912', activeTab: 'quiz', quizType: 'matchChart', dpQuiz: Object.assign({}, item, { hint: 3 }) });
    await click(document.querySelector('[data-hint-next]'));
    expect(m.latest.dpQuiz.revealed).toBe(true);
    const saved = m.latest.quizXpItems;
    expect(saved['shown:' + item.key]).toBe(true);
    m = await mount({ level: '912', activeTab: 'quiz', quizType: 'matchChart', quizXpItems: saved, dpQuiz: Object.assign({}, item) });
    await click(document.querySelector('[data-dataplot-choice="' + item.answer + '"]'));
    expect(m.latest.dpQuiz.correct).toBe(true);
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot')).toEqual([]);
  });
});

describe('prediction XP cannot be farmed by nudging the data', () => {
  async function predict(m, shapeRe, centre, spread) {
    await click(Array.from(document.querySelectorAll('[data-dataplot-predict] button')).find((b) => shapeRe.test(b.textContent)));
    const inputs = document.querySelectorAll('[data-dataplot-predict] input');
    await React.act(async () => { setValue(inputs[0], centre); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); setValue(inputs[1], spread); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); });
    await flush();
    await click(document.querySelector('[data-dataplot-pred-commit]'));
  }
  it('one point added after the statistics were shown: the copied prediction earns nothing', async () => {
    // median 4, Q1 3, Q3 5 (IQR 2), skewed right; adding a 4 keeps all three.
    let m = await mount({ points: pts([2, 3, 3, 4, 4, 4, 5, 5, 6, 15]), activeTab: 'stats' });
    await predict(m, /Skewed right/, '4', '2');
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot').map((c) => c[1])).toEqual([5]);
    const carry = { quizXpItems: m.latest.quizXpItems, quizXpTotal: m.latest.quizXpTotal, skillsDone: m.latest.skillsDone };
    m = await mount(Object.assign({ points: pts([2, 3, 3, 4, 4, 4, 4, 5, 5, 6, 15]), activeTab: 'stats' }, carry));
    await predict(m, /Skewed right/, '4', '2');
    expect(document.querySelector('[data-dataplot-pred-result]').textContent).toMatch(/Yes/);
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot')).toEqual([]);
  });
});

describe('box-plot practice: the median question does not label the median', () => {
  it('values only on the plot; the description names the parts of the drawing', async () => {
    let item = null;
    for (let s = 1; s < 400 && !item; s++) { const q = M().genQuizItem('boxPlot', tt, M().seededRand(s)); if (/median/.test(q.text)) item = q; }
    expect(item).not.toBeNull();
    await mount({ activeTab: 'quiz', quizType: 'boxPlot', dpQuiz: item }, { ctx: { gradeBand: 'g68' } });
    const svg = document.querySelector('[data-dataplot-box-quiz]');
    expect(svg.textContent).not.toMatch(/median|Q1|Q3|min|max/i);
    expect(svg.getAttribute('aria-label')).not.toMatch(/median/i);
    expect(svg.getAttribute('aria-label')).toContain('line inside it at ' + item.answer);
    // Other box questions keep the five named labels.
    let other = null;
    for (let s = 1; s < 400 && !other; s++) { const q = M().genQuizItem('boxPlot', tt, M().seededRand(s)); if (/\(IQR\)/.test(q.text)) other = q; }
    await mount({ activeTab: 'quiz', quizType: 'boxPlot', dpQuiz: other }, { ctx: { gradeBand: 'g68' } });
    expect(document.querySelector('[data-dataplot-box-quiz]').getAttribute('aria-label')).toMatch(/minimum .*Q1 .*median .*Q3 .*maximum/);
  });
});

describe('quiz scatter plots have a text equivalent', () => {
  it('a correlation question lists its points in a data table', async () => {
    const item = M().genQuizItem('correlation', tt, seeded(3));
    await mount({ level: '912', activeTab: 'quiz', quizType: 'correlation', dpQuiz: item });
    const table = document.querySelector('[data-dataplot-quiz-table] table');
    expect(table).not.toBeNull();
    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBe(item.chart.pts.length);
    const p = item.chart.pts[0];
    expect(rows[0].textContent).toBe('1' + String(Math.round(p.x * 100) / 100) + String(Math.round(p.y * 100) / 100));
  });
});

describe('a very large paste', () => {
  it('150,000 rows keep the first 2,000 points instead of crashing the tool', async () => {
    const errs = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => errs.push(String(a[0]).slice(0, 120)));
    const m = await mount({ level: '912', activeTab: 'tools' });
    setValue(document.getElementById('dp-import-csv'), Array.from({ length: 150000 }, (_, i) => i + ',' + ((i * 7) % 101)).join('\n'));
    await click(document.querySelector('[data-dataplot-import-go]'));
    expect(errs).toEqual([]);
    expect(m.latest.points.length).toBe(2000);
    expect(m.latest.points[1999]).toEqual({ x: 1999, y: (1999 * 7) % 101 });
    expect(document.querySelector('[data-dataplot-import] [role="status"]').textContent).toMatch(/at most 2000 points, so 148000 were left out/);
  }, 60000);
});

describe('teacher count of correct work past the XP cap', () => {
  it('saving the same comparison again does not count as new work', async () => {
    const p = M().COMPARE_PRESETS[0];
    const long = 'A full sentence about this measure.';
    const m = await mount({ activeTab: 'compare', quizXpTotal: 100, xpCapCorrect: 0,
      compare: { preset: p.id, predCentre: 'A', predSpread: 'A', checkedFor: p.id + ':' + p.a.join(',') + '|' + p.b.join(','), notes: { shape: long, centre: long, spread: long } } }, { ctx: { gradeBand: 'g68' } });
    const save = document.querySelector('[data-dataplot-cmp-finish]');
    await click(save);
    expect(m.latest.xpCapCorrect).toBe(1);
    await click(document.querySelector('[data-dataplot-cmp-finish]'));
    await click(document.querySelector('[data-dataplot-cmp-finish]'));
    expect(m.latest.xpCapCorrect).toBe(1);
  });
  it('pressing Finish on the same data project again does not count either', async () => {
    const m = await mount({ activeTab: 'project', quizXpTotal: 100, xpCapCorrect: 0,
      project: { step: 4, plan: { kind: 'numeric' }, values: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], cer: { claim: 'Most of us sleep about 8 hours.', evidence: 'The median is 7.5 hours.', reasoning: 'Half the values are above and half below 7.5.' } } }, { ctx: { gradeBand: 'g68' } });
    await click(document.querySelector('[data-dataplot-pj-finish]'));
    expect(m.latest.project.done).toBe(true);
    expect(m.latest.xpCapCorrect).toBe(1);
    await click(document.querySelector('[data-dataplot-pj-finish]'));
    expect(m.latest.xpCapCorrect).toBe(1);
  });
});

describe('two-way tables: the raw-counts feedback is true of the generated table', () => {
  it('the biggest single cell is always in the bigger group', () => {
    const bad = [];
    for (let s = 1; s <= 3000; s++) {
      const c = M().genTwoWay(s).counts, n0 = c[0][0] + c[0][1], n1 = c[1][0] + c[1][1], big = n0 >= n1 ? 0 : 1;
      if (Math.max(...c[big]) < Math.max(...c[1 - big])) bad.push(s + ':' + JSON.stringify(c));
    }
    expect(bad.length, bad.slice(0, 3).join(' ')).toBe(0);
  });
});
