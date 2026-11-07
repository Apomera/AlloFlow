// Calculus stage B (2026-11-03): improper integrals, Euler's method, series, applied missions and
// AP free response, run directly on the math core. CALCULUS_DEEP_FILE points the suite at another copy.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
let C;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'calculus'); C = window.__CalculusCore; });
const I = (text, a, b) => C.improper(C.compile(text).f, a, b);
// Plain composite Simpson, independent of the tool's integrator.
function simpson(f, a, b, n = 2000) { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h); return s * h / 3; }

describe('improper integrals: evaluated, not just labelled', () => {
  it('evaluates convergent improper integrals through a limit table', () => {
    const cases = [['ln(x)', 0, 1, -1], ['1/x^2', 1, Infinity, 1], ['1/sqrt(x)', 0, 1, 2], ['e^(-x)', 0, Infinity, 1], ['1/(1 + x^2)', -Infinity, Infinity, Math.PI],
      ['x^(-1/3)', -1, 8, 4.5], ['ln|x|', -1, 1, -2], ['x^(-0.9)', 0, 1, 10], ['1/x^3', 1, Infinity, 0.5], ['x e^(-x)', 0, Infinity, 1], ['e^(-x^2)', -Infinity, Infinity, Math.sqrt(Math.PI)], ['sin(x)/x', 1, Infinity, Math.PI / 2 - 0.946083070367183]];
    for (const [t, a, b, want] of cases) {
      const r = I(t, a, b);
      expect(r.kind, t).toBe('converges');
      expect(r.value, t).toBeCloseTo(want, 4);
    }
  });

  it('the limit table approaches the value, a decade closer each row', () => {
    const r = I('ln(x)', 0, 1);
    const rows = r.parts[0].rows;
    expect(rows.length).toBeGreaterThanOrEqual(6);
    rows.forEach((row, k) => { expect(row.t).toBeCloseTo(Math.pow(10, -(k + 1)), 12); expect(row.value).toBeCloseTo(-1 - row.t * Math.log(row.t) + row.t, 6); });
    const gaps = rows.map((row) => Math.abs(row.value - -1));
    for (let k = 1; k < gaps.length; k++) expect(gaps[k]).toBeLessThan(gaps[k - 1]);
    const inf = I('1/x^2', 1, Infinity).parts[0].rows;
    inf.forEach((row) => expect(row.value).toBeCloseTo(1 - 1 / row.t, 8));
  });

  it('detects divergent integrals honestly (growth, opposite infinities, oscillation)', () => {
    const div = [['1/x', 1, Infinity, '+inf'], ['1/x^2', 0, 1, '+inf'], ['1/x', 0, 1, '+inf'], ['1/sqrt(x)', 1, Infinity, '+inf'], ['e^x', 0, Infinity, '+inf'], ['1/(x-1)^2', 0, 2, '+inf'], ['1/x^2', 0, Infinity, '+inf'], ['ln(x)', 0, Infinity, '+inf'], ['1/(x(x-1))', 0, 1, '-inf']];
    for (const [t, a, b, dir] of div) { const r = I(t, a, b); expect(r.kind, t).toBe('diverges'); expect(r.direction, t).toBe(dir); }
    const pv = I('1/x', -1, 1);
    expect(pv.kind).toBe('diverges');
    expect(pv.opposite, 'the two infinite pieces do not cancel').toBe(true);
    expect(I('sin(x)', 0, Infinity).direction).toBe('osc');
    expect(I('tan(x)', 0, 2).kind).toBe('diverges');
  });

  it('tells proper, domain and too-slow-to-tell cases apart', () => {
    expect(I('x^2', 0, 3)).toMatchObject({ kind: 'proper', value: 9 });
    expect(I('(x^2-1)/(x-1)', 0, 2).kind).toBe('proper');
    expect(I('sqrt(x)', -1, 1).kind).toBe('domain');
    // A logarithmically slow tail (true value 1/ln 2): the table must not pretend to a value.
    const slow = I('1/(x ln(x)^2)', 2, Infinity);
    expect(slow.kind).toBe('unclear');
    expect(slow.parts[0].slow).toBe(true);
    // Reversed bounds flip the sign.
    expect(I('ln(x)', 1, 0).value).toBeCloseTo(1, 5);
  });

  it('names the misconception behind a wrong prediction', () => {
    const g = (t, a, b, pred) => C.gradeImproper(I(t, a, b), pred, C.compile(t).f);
    expect(g('ln(x)', 0, 1, { kind: 'conv', value: '-1' }).correct).toBe(true);
    expect(g('ln(x)', 0, 1, { kind: 'div' }).mis).toBe('blowup_diverges');
    expect(g('1/x^2', 1, Infinity, { kind: 'div' }).mis).toBe('infinite_length_diverges');
    expect(g('1/x', 1, Infinity, { kind: 'conv', value: '0' }).mis).toBe('terms_to_zero_integral');
    expect(g('1/x', -1, 1, { kind: 'conv', value: '0' }).mis).toBe('cancel_infinities');
    expect(g('1/x^2', 1, Infinity, { kind: 'conv', value: '2' }).mis).toBe('improper_value');
    expect(g('1/x', 1, Infinity, { kind: 'div' }).correct).toBe(true);
    expect(C.numParse('-inf', true).value).toBe(-Infinity);
    expect(C.numParse('pi/2').value).toBeCloseTo(Math.PI / 2, 12);
    expect(C.numParse('inf').ok, 'infinity only where a bound is allowed').toBe(false);
  });
});

describe('parser: the e^2x ambiguity is explicit', () => {
  it('warns on an implicit factor straight after a bare-number exponent and offers brackets', () => {
    const w = (t) => C.compile(t).warnings;
    expect(w('e^2x')).toEqual([expect.objectContaining({ code: 'ambiguous_power', suggestion: 'e^(2x)' })]);
    expect(w('e^-3x')[0].suggestion).toBe('e^(-3x)');
    expect(w('2e^3x+1')[0].suggestion).toBe('2e^(3x)+1');
    for (const t of ['e^(2x)', 'e^2 x', 'x^2 sin x', 'x^2e^x', '3x^2 + 1', 'sin(2x)']) expect(w(t), t).toEqual([]);
    // The reading itself is unchanged (e² times x); only the warning is new.
    expect(C.compile('e^2x').label).toBe('e^2·x');
    expect(C.compile('e^2x').f(1)).toBeCloseTo(Math.E * Math.E, 12);
    expect(C.compile(w('e^2x')[0].suggestion).f(1)).toBeCloseTo(Math.exp(2), 12);
  });
});

describe("Euler's method", () => {
  it('steps along the slope field exactly as y(next) = y + h·f(x, y)', () => {
    const pts = C.euler((x, y) => y, 0, 1, 0.5, 4);
    expect(pts.map((p) => p.y)).toEqual([1, 1.5, 2.25, 3.375, 5.0625]);
    expect(pts[4].x).toBe(2);
  });

  it('every exact solution really solves its equation, and the no-formula one uses a converged reference', () => {
    C.odes.forEach((ode, i) => {
      for (const [x0, y0] of [[0, 1], [-1, 0.5], [1, -1]]) {
        const tr = C.odeTruth(i, x0, y0);
        expect(tr.exact, ode.name).toBe(!!ode.exact);
        expect(tr.at(x0)).toBeCloseTo(y0, 10);
        for (const x of [x0 + 0.3, x0 + 1.1]) {
          const dy = (tr.at(x + 1e-5) - tr.at(x - 1e-5)) / 2e-5;
          expect(dy, ode.name + ' at ' + x).toBeCloseTo(ode.df(x, tr.at(x)), 4);
        }
      }
    });
    expect(C.odes.some((o) => !o.exact)).toBe(true);
  });

  it('halving h about halves the error (first order), and the error shrinks', () => {
    for (let o = 0; o < C.odes.length; o++) {
      const s = C.eulerStudy(o, -1, 0.5, 2);
      expect(s.ok, C.odes[o].name).toBe(true);
      expect(s.halving, C.odes[o].name).toBe('half');
      for (let k = 1; k < s.rows.length; k++) expect(Math.abs(s.rows[k].error)).toBeLessThan(Math.abs(s.rows[k - 1].error));
    }
    expect(C.eulerStudy(0, 0, 0, 2).tiny, 'y = 0 is solved exactly: nothing to predict').toBe(true);
    const st = C.eulerStudy(0, 0, 1, 2);
    expect(st.under, "y' = y bends up, so Euler falls below").toBe(true);
    expect(C.gradeEuler(st, 'half').correct).toBe(true);
    expect(C.gradeEuler(st, 'quarter').mis).toBe('euler_second_order');
    expect(C.gradeEuler(st, 'same').mis).toBe('euler_step_irrelevant');
    expect(C.gradeEuler(st, 'double').mis).toBe('euler_more_steps_worse');
  });
});

describe('series (BC)', () => {
  it('partial sums: the harmonic series creeps past every bound like ln N; p = 2 settles on π²/6', () => {
    const harm = C.seriesMake('p', 1);
    const ps = C.seriesPartials(harm, [10, 1000, 1000000]);
    ps.forEach((p) => expect(p.S).toBeCloseTo(Math.log(p.N) + 0.5772156649, 1));
    expect(ps[2].S).toBeGreaterThan(14);
    expect(harm.conv).toBe(false);
    expect(harm.termLim).toBe(0);
    expect(harm.ratioL).toBe(1);
    expect(C.seriesPartials(C.seriesMake('p', 2), [1000000])[0].S).toBeCloseTo(Math.PI ** 2 / 6, 5);
    expect(C.seriesPartials(C.seriesMake('alt', 1), [1000000])[0].S).toBeCloseTo(Math.LN2, 5);
    expect(C.seriesPartials(C.seriesMake('expfact', 2), [60])[0].S).toBeCloseTo(Math.exp(2) - 1, 10);
    expect(C.seriesPartials(C.seriesMake('factexp', 10), [10, 1000])[1].S, 'overflow is reported, not shown as a number').toBe(null);
  });

  it('the live ratio table approaches the stated L', () => {
    for (const spec of C.seriesExplore) {
      const s = C.seriesMake(...spec), rows = C.seriesRatioRows(s, [s.fam === 'expfact' ? 60 : 1000]);
      if (s.ratioL === Infinity) expect(rows[0].ratio).toBeGreaterThan(50);
      else expect(rows[0].ratio, s.label).toBeCloseTo(s.ratioL, 1);
    }
  });

  it('every generated series is labelled truthfully, endlessly, at every level', () => {
    const rng = C.seeded(2026);
    for (let i = 0; i < 300; i++) {
      const band = ['pre', 'ab', 'bc'][i % 3], s = C.genSeries(rng, band);
      if (band !== 'bc') expect(['p', 'geo', 'rational', 'tele']).toContain(s.fam);
      if (s.termLim !== 0) expect(s.conv, s.label).toBe(false);
      if (s.sum !== null) expect(C.seriesPartials(s, [s.fam === 'p' ? 1000000 : 4000])[0].S, s.label).toBeCloseTo(s.sum, 2);
      if (s.ratioL < 1) expect(s.conv).toBe(true);
      if (s.ratioL > 1) expect(s.conv).toBe(false);
      expect(s.decides.length).toBeGreaterThan(0);
    }
  });

  it('names "terms → 0 means converges" and the inconclusive ratio test', () => {
    const harm = C.seriesMake('p', 1), p2 = C.seriesMake('p', 2), geo = C.seriesMake('geo', 1, 2), rat = C.seriesMake('rational', 1, 1);
    expect(C.gradeSeries(harm, { conv: 'conv', test: 'other' }).mis).toBe('terms_zero_converges');
    expect(C.gradeSeries(harm, { conv: 'div', test: 'ratio' }).mis).toBe('ratio_one_inconclusive');
    expect(C.gradeSeries(harm, { conv: 'div', test: 'divergence' }).mis).toBe('divergence_test_silent');
    expect(C.gradeSeries(harm, { conv: 'div', test: 'other' }).correct).toBe(true);
    expect(C.gradeSeries(p2, { conv: 'div', test: 'other' }).mis).toBe('p_series_rule');
    expect(C.gradeSeries(geo, { conv: 'conv', test: 'ratio' }).correct).toBe(true);
    expect(C.gradeSeries(rat, { conv: 'conv', test: 'divergence' }).mis).toBe('nth_term_nonzero');
    expect(C.gradeSeries(rat, { conv: 'div', test: 'divergence' }).correct).toBe(true);
  });
});

describe('applied missions: the student sets up the model, each step checked', () => {
  const answerOf = (st) => st.type === 'choice' ? st.answer : st.type === 'number' ? String(st.answer) : null;
  it('ladder: the rate solves 2x·dx/dt + 2y·dy/dt = 0, and each distractor names its misconception', () => {
    for (let seed = 1; seed < 40; seed++) {
      const m = C.genMission('ladder', C.seeded(seed)), p = m.p;
      expect(p.a * p.a + p.b * p.b).toBe(p.L * p.L);
      const [model, diff, inst, solve] = m.steps;
      expect(2 * p.a * p.k + 2 * p.b * solve.answer).toBeCloseTo(0, 10);
      expect(inst.answer).toBe(p.b);
      for (const st of m.steps) if (answerOf(st) !== null) expect(C.gradeStep(st, answerOf(st)).ok, st.id).toBe(true);
      expect(C.gradeStep(model, 'early').mis).toBe('substitute_too_early');
      expect(C.gradeStep(diff, 'nochain').mis).toBe('no_chain_time');
      expect(C.gradeStep(diff, 'early').mis).toBe('substitute_too_early');
      expect(C.gradeStep(solve, String(-solve.answer)).mis).toBe('rate_sign');
      expect(C.gradeStep(solve, '0').mis).toBe('substitute_too_early');
      expect(C.gradeStep(solve, `-${p.a * p.k}/${p.b}`).ok, 'fractions are accepted').toBe(true);
    }
  });

  it('cone: dh/dt matches dV/dt ÷ V′(h) for V = (π/3)(R/H)²h³; the fixed radius is named', () => {
    for (let seed = 1; seed < 40; seed++) {
      const m = C.genMission('cone', C.seeded(seed)), p = m.p, q = (p.R / p.H) ** 2;
      const V = (h) => Math.PI / 3 * q * h ** 3, dVdh = (V(p.h0 + 1e-6) - V(p.h0 - 1e-6)) / 2e-6;
      expect(m.steps[3].answer).toBeCloseTo(p.k / dVdh, 6);
      expect(C.gradeStep(m.steps[0], 'const').mis).toBe('radius_constant');
      expect(C.gradeStep(m.steps[1], 'cyl').mis).toBe('cylinder_formula');
      expect(C.gradeStep(m.steps[2], 'nochain').mis).toBe('no_chain_time');
      expect(C.gradeStep(m.steps[3], String(m.steps[3].answer)).ok).toBe(true);
    }
  });

  it('box: the typed model and derivative are checked by value; the critical point really is the maximum', () => {
    for (let seed = 1; seed < 40; seed++) {
      const m = C.genMission('box', C.seeded(seed)), { a, b, xs, m: mm } = m.p;
      const V = (x) => x * (a - 2 * x) * (b - 2 * x);
      expect(xs).toBeGreaterThan(0); expect(xs).toBeLessThan(mm / 2);
      for (let x = 0.01; x < mm / 2; x += mm / 400) expect(V(x)).toBeLessThanOrEqual(V(xs) + 1e-9);
      expect(C.gradeStep(m.steps[0], `x(${a} - 2x)(${b} - 2x)`).ok).toBe(true);
      expect(C.gradeStep(m.steps[0], `4x^3 - ${2 * (a + b)}x^2 + ${a * b}x`).ok, 'any equal form is right').toBe(true);
      expect(C.gradeStep(m.steps[0], `x(${a} - x)(${b} - x)`).mis).toBe('cut_once');
      expect(C.gradeStep(m.steps[0], `(${a} - 2x)(${b} - 2x)`).mis).toBe('area_not_volume');
      expect(C.gradeStep(m.steps[2], `12x^2 - ${4 * (a + b)}x + ${a * b}`).ok).toBe(true);
      expect(C.gradeStep(m.steps[2], '4').mis).toBe('product_rule');
      expect(C.gradeStep(m.steps[3], String(xs)).ok).toBe(true);
      expect(C.gradeStep(m.steps[3], String(m.steps[3].wrong[0].v)).mis).toBe('root_outside_domain');
      expect(C.gradeStep(m.steps[4], String(V(xs))).ok).toBe(true);
      expect(C.gradeStep(m.steps[5], 'zero').mis).toBe('critical_not_max');
      expect(C.gradeStep(m.steps[0], '2+').parse, 'a typo is not a try').toBe(true);
    }
  });
});

describe('AP-style free response: every answer key is computed from the model', () => {
  it('particle motion: displacement and distance are the integrals of v and |v|; direction changes are sign changes', () => {
    for (let seed = 1; seed < 30; seed++) {
      const q = C.genFRQ('particle', C.seeded(seed)), { p, q: qq, T, t1 } = q.p, v = (t) => (t - p) * (t - qq);
      const part = (id) => q.parts.find((x) => x.id === id);
      expect(part('a').answer).toBeCloseTo((v(t1 + 1e-6) - v(t1 - 1e-6)) / 2e-6, 5);
      expect(part('c').answer).toBeCloseTo(simpson(v, 0, T), 6);
      expect(part('d').answer).toBeCloseTo(simpson((t) => Math.abs(v(t)), 0, p) + simpson((t) => Math.abs(v(t)), p, qq) + simpson((t) => Math.abs(v(t)), qq, T), 6);
      for (const r of part('b1').answer) expect(v(r - 0.01) * v(r + 0.01)).toBeLessThan(0);
      expect(C.gradeStep(part('d'), String(part('c').answer)).mis).toBe('displacement_vs_distance');
      expect(C.gradeStep(part('b1'), `${p}, ${qq}, ${(p + qq) / 2}`).mis).toBe('accel_zero_turn');
      expect(C.gradeStep(part('b1'), String(p)).mis).toBe('missed_a_root');
      // Stage C: b2 is a written justification checked by its marked elements.
      expect(C.gradeStep(part('b2'), { text: 'my reason', picks: { fact: 'v_zero', pattern: 'pnp', concl: 'turn' } }).mis).toBe('zero_not_enough');
    }
  });

  it('function analysis, accumulation and the BC series question', () => {
    for (let seed = 1; seed < 30; seed++) {
      const a = C.genFRQ('analysis', C.seeded(seed)), P = a.p, f = C.compile(P.fText.replace(/−/g, '-')).f;
      const fp = (x) => (f(x + 1e-5) - f(x - 1e-5)) / 2e-5;
      for (const c of a.parts[0].answer) expect(fp(c)).toBeCloseTo(0, 3);
      expect(fp(P.p - 0.1)).toBeGreaterThan(0); expect(fp(P.p + 0.1)).toBeLessThan(0);
      let best = -Infinity; for (let x = P.lo; x <= P.hi + 1e-9; x += 0.001) best = Math.max(best, f(x));
      expect(a.parts.find((x) => x.id === 'd').answer).toBeCloseTo(best, 3);
      const g = C.genFRQ('accum', C.seeded(seed)), G = g.p, fa = (t) => G.k * (G.r - t);
      expect(g.parts[0].answer).toBeCloseTo(simpson(fa, 0, G.x1), 8);
      expect(g.parts[1].answer).toBe(fa(G.x2));
      let gbest = -Infinity, gx = 0; for (let x = 0; x <= G.X + 1e-9; x += 0.01) { const v = simpson(fa, 0, x || 1e-9, 20); if (v > gbest) { gbest = v; gx = x; } }
      expect(g.parts[2].answer).toBeCloseTo(gx, 1);
      const s = C.genFRQ('series', C.seeded(seed)), b = s.p.b;
      expect(s.parts[0].answer).toBe(b);
      expect(s.parts.find((x) => x.id === 'e').answer).toBeCloseTo(1 / b + 1 / (2 * b * b) + 1 / (3 * b ** 3), 12);
      expect(C.gradeStep(s.parts[1], 'conv').mis, 'x = b gives the harmonic series').toBe('terms_zero_converges');
    }
  });

  it('the rubric counts first attempts as the AP-style score', () => {
    const q = C.genFRQ('particle', C.seeded(5));
    const results = { a: { ok: true, firstTry: true }, b1: { ok: true, firstTry: false }, b2: { ok: false }, c: { ok: true, firstTry: true }, d: { ok: true, firstTry: true } };
    expect(C.frqScore(q, results)).toEqual({ first: 4, after: 5, total: 6 });
  });
});
