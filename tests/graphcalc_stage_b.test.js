// Graphing Calculator stage B (2026-11-03): least-squares fits (exponential via log-linear),
// inverse detection with a horizontal-line test, piecewise rules with open and closed
// endpoints, and the shared rate-of-change, key-features, hints and worked-example panels,
// teacher tools and translated analysis text. Fits and verdicts are checked against values
// worked out by hand.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_graphcalc.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let canvasLog = [];
const COLORS = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'];
const funcs = (list) => COLORS.map((color, i) => ({ expr: list[i] || '', color }));
function fakeMath() {
  return {
    compile(expr) {
      const js = String(expr).replace(/\^/g, '**').replace(/\blog10\(/g, '__L10(').replace(/\blog\(/g, 'Math.log(').replace(/__L10\(/g, 'Math.log10(')
        .replace(/\b(sin|cos|tan|sqrt|abs|exp)\(/g, 'Math.$1(').replace(/\bpi\b/g, 'Math.PI');
      const fn = new Function('x', 'a', 'b', 'c', 'return (' + js + ');'); // eslint-disable-line no-new-func
      return { evaluate: (scope) => fn(scope.x, scope.a, scope.b, scope.c) };
    }
  };
}
function recordingContext() {
  const state = { measureText: () => ({ width: 20 }) };
  return new Proxy(state, {
    get(tt, key) {
      if (key === 'then') return undefined;
      if (key in tt) return tt[key];
      return (...args) => { canvasLog.push({ call: key, args, fillStyle: tt.fillStyle, strokeStyle: tt.strokeStyle, lineWidth: tt.lineWidth }); };
    },
    set(tt, key, value) { tt[key] = value; return true; }
  });
}
beforeEach(() => {
  resetStemLab();
  canvasLog = [];
  window.math = fakeMath();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recordingContext());
  loadTool(FILE, 'graphCalc');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) { try { await React.act(() => root.unmount()); } catch (e) { /* crashed root */ } }
  root = null;
  delete window.math;
  vi.restoreAllMocks();
});
async function mount(initial, overrides) {
  const out = { latest: null, announced: [], awards: [], keys: new Set() };
  function App() {
    const [state, setState] = React.useState({ graphCalc: initial });
    out.latest = state.graphCalc;
    return window.StemLab._registry.graphCalc.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, t: (k, fb) => { out.keys.add(k); return fb || k; }, announceToSR: (m) => out.announced.push(m), awardXP: (...a) => out.awards.push(a) }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
async function click(el) { await React.act(() => el.click()); }
async function type(el, value) {
  await React.act(() => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const M = () => window.__alloGraphCalcModel;
const GA = () => window.StemLab._graphAccess;
const WIN = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

describe('regression fits against hand-computed values', () => {
  it('linear least squares: (1,2) (2,4) (3,5) (4,4) (5,5) gives y = 0.6x + 2.2, r² = 0.6', () => {
    const pts = M().parseData('x, y\n1, 2\n2, 4\n3, 5\n4\t4\n5;5\n\nbad line').points;
    expect(pts.length).toBe(5);
    const fit = M().fit(pts, 'linear');
    expect(fit.coef.m).toBeCloseTo(0.6, 12);
    expect(fit.coef.b).toBeCloseTo(2.2, 12);
    expect(fit.r2).toBeCloseTo(0.6, 12);
    expect(fit.residuals.map((r) => Number(r.res.toFixed(10)))).toEqual([-0.8, 0.6, 1, -0.6, -0.2]);
    expect(fit.eq).toBe('y = 0.6x + 2.2');
    expect(M().parseData('x, y\n1, 2\n2 two').bad).toEqual([3]);
  });

  it('quadratic least squares: an exact parabola, and a 5-point set solved by hand', () => {
    const exact = M().fit([0, 1, 2, 3].map((x) => ({ x, y: 1.5 * x * x - 2.5 * x + 1 })), 'quadratic');
    expect(exact.coef.a).toBeCloseTo(1.5, 10);
    expect(exact.coef.b).toBeCloseTo(-2.5, 10);
    expect(exact.coef.c).toBeCloseTo(1, 10);
    expect(exact.r2).toBeCloseTo(1, 12);
    // Normal equations: 34a + 10c = 35, 10b = -3, 10a + 5c = 11  ->  a = 13/14, b = -3/10, c = 12/35
    const fit = M().fit([[-2, 5], [-1, 1], [0, 0], [1, 2], [2, 3]].map(([x, y]) => ({ x, y })), 'quadratic');
    expect(fit.coef.a).toBeCloseTo(13 / 14, 12);
    expect(fit.coef.b).toBeCloseTo(-0.3, 12);
    expect(fit.coef.c).toBeCloseTo(12 / 35, 12);
    expect(fit.r2).toBeCloseTo(1 - (64 / 35) / 14.8, 12);
  });

  it('exponential via log-linear: a line through (x, ln y), R² on the log scale', () => {
    const e = Math.E;
    const fit = M().fit([{ x: 0, y: 2 }, { x: 1, y: 2 * e }, { x: 2, y: 2 * e ** 3 }], 'exponential');
    // ln y = ln 2 + (0, 1, 3): slope 1.5, intercept ln 2 - 1/6
    expect(fit.logLinear).toBe(true);
    expect(fit.coef.k).toBeCloseTo(1.5, 12);
    expect(fit.coef.a).toBeCloseTo(2 * Math.exp(-1 / 6), 12);
    expect(fit.coef.b).toBeCloseTo(Math.exp(1.5), 12);
    expect(fit.r2).toBeCloseTo(27 / 28, 12);
    const exact = M().fit([0, 1, 2, 3].map((x) => ({ x, y: 3 * 2 ** x })), 'exponential');
    expect(exact.eq).toBe('y = 3 · 2^x');
    expect(exact.r2).toBeCloseTo(1, 12);
  });

  it('says why a fit cannot be made', () => {
    expect(M().fit([{ x: 1, y: 1 }], 'linear').error).toBe('few');
    expect(M().fit([{ x: 1, y: 1 }, { x: 1, y: 2 }], 'linear').error).toBe('samex');
    expect(M().fit([{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }], 'quadratic').error).toBe('samex');
    expect(M().fit([{ x: 0, y: 1 }, { x: 1, y: -2 }], 'exponential').error).toBe('nonpositive');
    expect(M().fit([{ x: 0, y: 2 }, { x: 1, y: 2 }], 'linear').r2).toBeNull();
  });
});

describe('inverse detection (horizontal-line test from the analysis)', () => {
  const check = (f, win) => M().inverseCheck(GA(), f, win || WIN);
  it('one-to-one rules pass', () => {
    expect(check((x) => x * x * x)).toMatchObject({ verdict: 'yes', dir: 'increasing' });
    expect(check((x) => 1 / x)).toMatchObject({ verdict: 'yes', dir: 'decreasing' });
    expect(check(Math.exp)).toMatchObject({ verdict: 'yes' });
    expect(check((x) => -2 * x + 1)).toMatchObject({ verdict: 'yes', dir: 'decreasing' });
  });
  it('a turning point fails, with a witness line that really meets the graph twice', () => {
    const sq = check((x) => x * x);
    expect(sq).toMatchObject({ verdict: 'no', reason: 'turn', level: 50 });
    expect(sq.xs.length).toBe(2);
    expect(sq.xs[0]).toBeCloseTo(-Math.sqrt(50), 6);
    expect(sq.xs[1]).toBeCloseTo(Math.sqrt(50), 6);
    expect(check(Math.abs)).toMatchObject({ verdict: 'no', reason: 'turn' });
    expect(check(Math.sin).verdict).toBe('no');
  });
  it('a flat stretch and overlapping branches fail too', () => {
    expect(check(() => 3)).toMatchObject({ verdict: 'no', reason: 'flat', level: 3 });
    const tan = check(Math.tan, { xmin: -6.28, xmax: 6.28, ymin: -2, ymax: 2 });
    expect(tan).toMatchObject({ verdict: 'no', reason: 'overlap' });
    expect(tan.xs.length).toBeGreaterThanOrEqual(2);
    for (const x of tan.xs) expect(Math.tan(x)).toBeCloseTo(tan.level, 6);
  });
});

describe('piecewise rules', () => {
  const compile = (expr) => { const c = fakeMath().compile(expr); return (x) => c.evaluate({ x }); };
  it('open and closed endpoints, the value at the boundary, and a function verdict', () => {
    const plan = M().piecewise([{ expr: 'x + 1', lo: '', hi: '1', loC: false, hiC: false }, { expr: '3 - x', lo: '1', hi: '', loC: true, hiC: false }], compile, WIN);
    expect(plan.dots).toEqual([{ x: 1, y: 2, closed: false, piece: 0 }, { x: 1, y: 2, closed: true, piece: 1 }]);
    expect(plan.overlaps).toEqual([]);
    expect(plan.evaluate(1)).toBe(2);
    expect(plan.evaluate(0.5)).toBe(1.5);
    expect(plan.evaluate(4)).toBe(-1);
    const jump = M().piecewise([{ expr: 'x', lo: '-2', hi: '0', loC: true, hiC: true }, { expr: '5', lo: '0', hi: '3', loC: false, hiC: true }], compile, WIN);
    expect(jump.dots.map((d) => [d.x, d.y, d.closed])).toEqual([[-2, -2, true], [0, 0, true], [0, 5, false], [3, 5, true]]);
    expect(jump.evaluate(0)).toBe(0);
    expect(Number.isNaN(jump.evaluate(-3))).toBe(true);
  });
  it('two pieces that claim the same x make it not a function', () => {
    const point = M().piecewise([{ expr: 'x', lo: '', hi: '1', hiC: true }, { expr: '2', lo: '1', hi: '', loC: true }], compile, WIN);
    expect(point.overlaps).toEqual([{ from: 1, to: 1, pieces: [0, 1] }]);
    const range = M().piecewise([{ expr: 'x', lo: '0', hi: '4' }, { expr: '1', lo: '2', hi: '6' }], compile, WIN);
    expect(range.overlaps).toEqual([{ from: 2, to: 4, pieces: [0, 1] }]);
    expect(M().piecewise([{ expr: 'x', lo: '5', hi: '1' }, { expr: '', lo: '', hi: '' }], compile, WIN).errors).toEqual([0]);
  });
  it('draws a hollow dot for an open end and a filled dot for a closed end, and describes both', async () => {
    await mount({ funcs: funcs([]), pw: { on: true } });
    // canvas 600 x 420, window [-10, 10]^2: (1, 2) sits at (330, 168)
    const arcs = canvasLog.map((e, i) => ({ e, i })).filter(({ e }) => e.call === 'arc' && e.args[0] === 330 && e.args[1] === 168);
    const lastFrame = arcs.slice(-2);
    const fillAfter = (i) => canvasLog.slice(i + 1).find((e) => e.call === 'fill');
    expect(fillAfter(lastFrame[0].i).fillStyle).toBe('#ffffff');
    expect(fillAfter(lastFrame[1].i).fillStyle).toBe('#6d28d9');
    const items = qa('[data-graphcalc-pw-desc] li').map((li) => li.textContent);
    expect(items).toEqual(['Piece 1: y = x + 1 when x < 1. a hollow dot at (1, 2): that point is left out.', 'Piece 2: y = 3 - x when x ≥ 1. a filled dot at (1, 2): that point is included.']);
    expect(q('[data-graphcalc-pw-function]').getAttribute('data-graphcalc-pw-function')).toBe('yes');
    expect(q('[data-graphcalc-pw-shape]').textContent).toMatch(/^Graph of the piecewise function\./);
  });
});

describe('shared panels on the selected function', () => {
  it('rate of change: slope triangle, predict, calculate, XP once', async () => {
    const m = await mount({ funcs: funcs(['x^2']), roc: { on: true } });
    expect(canvasLog.some((e) => e.call === 'fillText' && e.args[0] === 'Δx = 2')).toBe(true);
    expect(canvasLog.some((e) => e.call === 'fillText' && e.args[0] === 'Δy = 8')).toBe(true);
    await click([...q('[data-rate-predict]').querySelectorAll('input')].find((i) => i.value === 'down'));
    expect(q('[data-rate-pred-result]').getAttribute('data-rate-pred-result')).toBe('miss');
    await type(q('[data-rate-guess]'), '8/2');
    await click(q('[data-rate-check]'));
    const rates = () => m.awards.filter((a) => a[2] === 'Rate of change calculated');
    expect(rates()).toEqual([['graphCalc', 3, 'Rate of change calculated']]);
    await click(q('[data-rate-check]'));
    expect(rates().length).toBe(1);
  });

  it('key features: exact when the rule matches a family, from the window otherwise', async () => {
    await mount({ funcs: funcs(['x^2 - 4']), kf: { on: true } });
    expect(q('[data-graphcalc-features-model]').getAttribute('data-graphcalc-features-model')).toBe('quadratic');
    await click(q('[data-features-reveal-all]'));
    expect(q('[data-features-answer="range"]').textContent).toBe('[−4, ∞)');
    expect(q('[data-features-answer="dec"]').textContent).toBe('(−∞, 0)');
    await React.act(() => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
    await mount({ funcs: funcs(['x^4 - 1']), kf: { on: true } });
    expect(q('[data-features-source]').getAttribute('data-features-source')).toBe('window');
    await click(q('[data-features-reveal="domain"]'));
    expect(q('[data-features-answer="domain"]').textContent).toBe('[−10, 10]');
  });

  it('inverse: verdict from the analysis and a horizontal-line test by keyboard', async () => {
    const m = await mount({ funcs: funcs(['x^2']), inv: { on: true } });
    expect(q('[data-graphcalc-inverse]').getAttribute('data-graphcalc-inverse')).toBe('no');
    expect(q('[data-graphcalc-inverse-verdict]').textContent).toMatch(/^Fails the horizontal-line test: the line y = 50 meets the graph at x = −7.07, 7.07\./);
    await type(q('[data-graphcalc-hl]'), 4);
    expect(m.latest.inv.hlY).toBe(4);
    expect(q('[data-graphcalc-hl-result]').textContent).toBe('The line y = 4 meets the graph 2 times: x = −2, 2.');
    await React.act(() => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
    await mount({ funcs: funcs(['x^3']), inv: { on: true } });
    expect(q('[data-graphcalc-inverse-verdict]').textContent).toMatch(/^Passes the horizontal-line test/);
    expect(canvasLog.some((e) => e.call === 'setLineDash' && JSON.stringify(e.args[0]) === '[2,5]')).toBe(true);
  });

  it('data: paste pairs, fit, graph the fit in a free row, show residuals', async () => {
    const m = await mount({ funcs: funcs(['x']), data: { on: true } });
    await type(q('[data-graphcalc-data-text]'), '1, 2\n2, 4\n3, 5\n4, 4\n5, 5');
    expect(q('[data-graphcalc-data-count]').getAttribute('data-graphcalc-data-count')).toBe('5');
    await click([...document.querySelectorAll('input[name="graphcalc-fit"]')].find((r) => r.value === 'linear'));
    expect(q('[data-graphcalc-fit-eq]').textContent).toBe('y = 0.6x + 2.2');
    expect(q('[data-graphcalc-fit-r2]').textContent).toBe('r² = 0.6: the line explains this share of the variation in y.');
    await click(q('[data-graphcalc-fit-graph]'));
    expect(m.latest.funcs[1].expr).toBe('0.6*x + (2.2)');
    await click(q('[data-graphcalc-resid]'));
    const cells = [...q('[data-graphcalc-residuals] tbody').querySelectorAll('tr')].map((tr) => tr.lastChild.textContent);
    expect(cells).toEqual(['−0.8', '0.6', '1', '−0.6', '−0.2']);
    await click([...document.querySelectorAll('input[name="graphcalc-fit"]')].find((r) => r.value === 'exponential'));
    expect(q('[data-graphcalc-fit]').textContent).toContain('log scale');
  });
});

describe('tasks: hint ladders and worked examples', () => {
  it('the zeros challenge climbs nudge -> strategy -> worked step -> answer, with numbers from the scan', async () => {
    await mount({ tier: 'analyst', funcs: funcs([]), _sideTab: 'challenge', activeChallenge: 3, _challengePred: { 3: 'a' } });
    const ladder = () => q('[data-hint-ladder="graphcalc-hints-3"]');
    for (let i = 0; i < 4; i++) await click(ladder().querySelector('[data-hint-next]'));
    expect([...ladder().querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'Nudge: A zero is an x-value where y = 0: where the graph meets the x-axis.',
      'Strategy: Set x^2 - 4 equal to 0 and solve, or press Analyze and read the zero candidates.',
      'Worked step: x^2 - 4 = 0 means x^2 = 4: x is a number whose square is 4.',
      'Answer: x = −2 and x = 2.']);
    expect(q('[data-worked-panel="graphcalc-worked"]')).toBeTruthy();
  });

  it('the shift challenge reads the vertices from the family model', async () => {
    await mount({ tier: 'analyst', funcs: funcs([]), _sideTab: 'challenge', activeChallenge: 4, _challengePred: { 4: 'a' }, _chHints: { 4: 4 } });
    expect(q('[data-hint-ladder="graphcalc-hints-4"]').textContent).toContain('y = (x-3)^2 is y = x^2 moved right 3; y = (x+2)^2 is y = x^2 moved left 2.');
  });
});

describe('teacher tools', () => {
  it('a Teacher tab only in teacher mode; assigned challenges come first, at any tier', async () => {
    await mount({ funcs: funcs([]) });
    expect(q('[data-graphcalc-support="teacher"]')).toBeNull();
    await React.act(() => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
    const m = await mount({ funcs: funcs([]), _sideTab: 'teacher' }, { isTeacherMode: true });
    await click(q('[data-graphcalc-assign="7"]'));
    expect(m.latest.assignedChallenges).toEqual([7]);
    const rows = [...q('[data-graphcalc-progress]').querySelectorAll('tr')].map((tr) => tr.textContent);
    expect(rows).toContain('Assigned challengesExponential');
    await click(q('[data-graphcalc-support="challenge"]'));
    const first = q('[data-graphcalc-challenge]');
    expect(first.getAttribute('data-graphcalc-challenge')).toBe('7');
    expect(first.textContent).toMatch(/^Exponential · assigned/);
  });

  it('exports a progress CSV with the analysis evidence in the Markdown report', async () => {
    const blobs = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = (b) => { blobs.push(b); return 'blob:x'; };
    URL.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount({ funcs: funcs(['x^2 - 4']), _sideTab: 'teacher', _challengesDone: [3], _challengesCompleted: 1 }, { isTeacherMode: true });
    await click(q('[data-graphcalc-teacher-csv]'));
    const csv = await blobs[0].text();
    expect(csv).toContain('Challenges completed,1 (Quadratics)');
    URL.createObjectURL = orig;
  });
});

describe('translated analysis text', () => {
  it('the analysis panel, inspector and trace go through literal keys; English is unchanged', async () => {
    const m = await mount({ funcs: funcs(['x^2 - 4']), traceMode: true });
    await click([...document.querySelectorAll('button')].find((b) => /Analyze/.test(b.textContent)));
    for (const k of ['stem.graphcalc.analysis_method', 'stem.graphcalc.analysis_advice', 'stem.graphcalc.inspect_title', 'stem.graphcalc.inspect_pick', 'stem.graphcalc.cand_zero', 'stem.graphcalc.trace_summary', 'stem.graphcalc.analysis_done']) expect(m.keys.has(k), k).toBe(true);
    expect(q('[data-analysis-provenance]').textContent).toBe('Search interval [-10, 10]; 501 grid samples, sign-change refinement, and local minima of |f|. Absolute residual threshold: 1e-8. A candidate is numerical evidence, not proof of a root or a complete solution set.');
    expect(m.announced).toContain('Numerical analysis complete. 2 zero candidates and 0 intersection candidates.');
    expect(document.body.textContent).toContain('Zero 1 at x ≈ -2');
  });

  it('a stored error code shows the translated message', async () => {
    const m = await mount({ funcs: funcs([]) }, { t: (k, fb) => (k === 'stem.graphcalc.analysis_empty' ? 'XX empty' : fb || k) });
    await click([...document.querySelectorAll('button')].find((b) => /Analyze/.test(b.textContent)));
    expect(m.latest._analysis.errorCode).toBe('empty');
    expect(q('[data-analysis-provenance]').textContent).toBe('XX empty');
  });
});
