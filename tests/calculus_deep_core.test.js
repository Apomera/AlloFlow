// Calculus deep rebuild (2026-11-03): the math core, run directly. CALCULUS_DEEP_FILE points the
// suite at another copy of the tool (mutation checks).
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
let C;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'calculus'); C = window.__CalculusCore; });
function lcg(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

describe('typed-function parser (no eval)', () => {
  it('reads implicit multiplication, function names without brackets, powers and constants', () => {
    const cases = [
      ['2x', 2, 4], ['3x^2 - 2x + 1', 2, 9], ['2(x+1)', 2, 6], ['(x+1)(x-1)', 2, 3], ['x sin x', 1, Math.sin(1)],
      ['sin x cos x', 1, Math.sin(1) * Math.cos(1)], ['sin 2x', 1, Math.sin(2)], ['e^x', 1, Math.E], ['ln x', Math.E, 1],
      ['-x^2', 3, -9], ['2^-x', 1, 0.5], ['x^(1/3)', -8, -2], ['|x - 1|', -2, 3], ['sqrt(x)', 9, 3], ['√x', 4, 2],
      ['x²', 3, 9], ['πx', 1, Math.PI], ['y = x^2', 2, 4], ['f(x) = 1/x', 4, 0.25], ['sin^2 x', 1, Math.sin(1) ** 2],
      ['sin^-1(x)', 0.5, Math.asin(0.5)], ['x e^(-x^2)', 1, Math.exp(-1)], ['ln|x|', -Math.E, 1], ['floor(x)', 2.7, 2], ['log(100)', 0, 2]
    ];
    for (const [text, x, want] of cases) {
      const c = C.compile(text);
      expect(c.ok, text).toBe(true);
      expect(c.f(x), text).toBeCloseTo(want, 9);
    }
    expect(C.compile('2x').label).toBe('2·x');
    expect(C.compile('sin 2x').label).toBe('sin(2·x)');
  });

  it('rejects junk with a reason instead of running it', () => {
    expect(C.compile('alert(1)').ok).toBe(false);
    expect(C.compile('alert(1)').error).toBe('unknown_name');
    expect(C.compile('(x').error).toBe('missing_paren');
    expect(C.compile('2+').error).toBe('unexpected_end');
    expect(C.compile('x; y').error).toBe('bad_char');
    expect(C.compile('').error).toBe('empty');
    const src = fs.readFileSync(FILE, 'utf8');
    expect(/\beval\s*\(|new Function\s*\(/.test(src)).toBe(false);
  });

  it('differentiates exactly by forward-mode (dual numbers)', () => {
    const cases = [['x^3', 2, 12], ['sin(3x)', 0, 3], ['e^(2x)', 0, 2], ['ln(x)', 4, 0.25], ['x^2 sin(x)', 1, 2 * Math.sin(1) + Math.cos(1)],
      ['1/(1+x^2)', 1, -0.5], ['sqrt(x)', 4, 0.25], ['2^x', 0, Math.LN2], ['tan x', 0, 1], ['atan(x)', 1, 0.5]];
    for (const [text, x, want] of cases) expect(C.compile(text).df(x), text).toBeCloseTo(want, 9);
    expect(Number.isNaN(C.compile('|x|').df(0))).toBe(true);
  });
});

describe('numerical calculus on any function', () => {
  it('integrates, bridges removable holes and refuses poles', () => {
    expect(C.integrate((x) => x * x, 0, 3).value).toBeCloseTo(9, 9);
    expect(C.integrate(Math.sin, 0, Math.PI).value).toBeCloseTo(2, 9);
    expect(C.integrate(Math.exp, 0, 1).value).toBeCloseTo(Math.E - 1, 9);
    expect(C.integrate(C.compile('(x^2-1)/(x-1)').f, 0, 2).value).toBeCloseTo(4, 6);
    expect(C.integrate(C.compile('1/x').f, -1, 1).ok).toBe(false);
    expect(C.integrate(Math.tan, 0, 2).ok).toBe(false);
    expect(C.integrate(C.compile('1/(x-1.37)^2').f, 0, 2).ok).toBe(false);
    const sa = C.signedAreas(C.compile('x^2 - 1').f, -2, 2);
    expect(sa.positive).toBeCloseTo(8 / 3, 6);
    expect(sa.negative).toBeCloseTo(4 / 3, 6);
  });

  it('Riemann sums match hand values for x^2 on [0, 3] with n = 4', () => {
    const f = (x) => x * x;
    expect(C.riemann(f, 0, 3, 4, 'left').value).toBeCloseTo(5.90625, 9);
    expect(C.riemann(f, 0, 3, 4, 'right').value).toBeCloseTo(12.65625, 9);
    expect(C.riemann(f, 0, 3, 4, 'midpoint').value).toBeCloseTo(8.859375, 9);
    expect(C.riemann(f, 0, 3, 4, 'trapezoid').value).toBeCloseTo(9.28125, 9);
    expect(C.riemann(f, 0, 3, 4, 'simpson').value).toBeCloseTo(9, 9);
  });

  it('centred secants converge like h squared, one-sided like h', () => {
    const c = C.compile('x^3');
    const rows = C.secantRows(c.f, c.df, 1, [0.1, 0.01]);
    expect(rows[0].forwardError / rows[1].forwardError).toBeGreaterThan(8);
    expect(rows[0].forwardError / rows[1].forwardError).toBeLessThan(12);
    expect(rows[0].centredError / rows[1].centredError).toBeGreaterThan(80);
    expect(rows[1].centredError).toBeLessThan(rows[1].forwardError / 100);
  });

  it('classifies limits from both one-sided tables: holes, jumps, asymptotes, oscillation', () => {
    const k = (t, a) => C.limitProbe(C.compile(t).f, a);
    expect(k('(x^2-1)/(x-1)', 1)).toMatchObject({ kind: 'hole', limit: 2 });
    expect(k('sin(x)/x', 0)).toMatchObject({ kind: 'hole', limit: 1 });
    expect(k('x^2', 2)).toMatchObject({ kind: 'continuous', limit: 4 });
    expect(k('floor(x)', 1).kind).toBe('jump');
    expect(k('|x|/x', 0).kind).toBe('jump');
    expect(k('1/x^2', 0)).toMatchObject({ kind: 'infinite', limit: '+inf' });
    expect(k('1/x', 0)).toMatchObject({ kind: 'infinite', limit: null });
    expect(k('sin(1/x)', 0).kind).toBe('oscillating');
  });

  it('epsilon-delta: a student delta is checked, and the largest delta is found', () => {
    const sq = (x) => x * x;
    expect(C.epsDeltaCheck(sq, 2, 4, 0.5, 1).trapped).toBe(false);
    expect(C.epsDeltaCheck(sq, 2, 4, 0.5, 0.1).trapped).toBe(true);
    expect(C.maxDelta(sq, 2, 4, 0.5)).toBeCloseTo(Math.sqrt(4.5) - 2, 6);
    expect(C.maxDelta((x) => 3 * x - 1, 1, 2, 0.3)).toBeCloseTo(0.1, 6);
    expect(C.maxDelta(Math.sign, 0, 1, 0.5)).toBe(0);
  });
});

describe('practice generators', () => {
  it('Best Method: different methods win, and the keyed answer really has the smallest error', () => {
    const rng = lcg(7), wins = {};
    for (let i = 0; i < 150; i++) {
      const q = C.genQuiz('method', 'ab', rng);
      wins[q.answer] = (wins[q.answer] || 0) + 1;
      const f = C.compile(q.fnText).f, exact = C.integrate(f, q.xMin, q.xMax).value;
      const errs = q.choices.map((m) => [m, Math.abs(C.riemann(f, q.xMin, q.xMax, q.n, m).value - exact)]).sort((a, b) => a[1] - b[1]);
      expect(errs[0][0], q.fnText + ' n=' + q.n).toBe(q.answer);
      expect(q.choices).toContain(q.answer);
    }
    expect(Object.keys(wins).length).toBeGreaterThanOrEqual(3);
    expect(wins.simpson || 0).toBeLessThan(150 * 0.85);
  });

  it('names the misconception behind a wrong method choice', () => {
    const q = { mode: 'method', fnText: 'e^x', xMin: 0, xMax: 2, n: 4, answer: 'simpson', choices: ['left', 'midpoint', 'simpson'] };
    expect(C.methodMisconception(q, 'left')).toBe('left_on_increasing');
    expect(C.methodMisconception({ ...q, fnText: 'sqrt(x)', answer: 'midpoint' }, 'simpson')).toBe('simpson_needs_smooth');
    expect(C.quizMisconception({ mode: 'overunder', fnText: 'x^2 - 2x', xMin: 0, xMax: 3, ruleMode: 'left' }, 'over')).toBe('forgot_signed');
    expect(C.quizMisconception({ mode: 'overunder', fnText: 'e^x', xMin: 0, xMax: 2, ruleMode: 'left' }, 'over')).toBe('left_on_increasing');
  });

  it('every mode in every band generates a valid, gradable item with named distractors', () => {
    const rng = lcg(99);
    for (const band of ['pre', 'ab', 'bc']) {
      for (const mode of C.modesByBand[band]) {
        for (let i = 0; i < 15; i++) {
          const q = C.genQuiz(mode, band, rng);
          expect(q.mode).toBe(mode);
          if (q.opts) {
            const ids = q.opts.map((o) => String(o.id));
            expect(new Set(ids).size, mode + ' unique options').toBe(ids.length);
            expect(q.opts.filter((o) => C.quizAnswerIsCorrect(q, o.id)).length, mode + ' exactly one right').toBe(1);
            q.opts.filter((o) => !C.quizAnswerIsCorrect(q, o.id)).forEach((o) => expect(o.mis, mode + ' option ' + o.id).toBeTruthy());
          }
          if (mode === 'estimate' && q.fnText) expect(C.integrate(C.compile(q.fnText).f, q.xMin, q.xMax).value).toBeCloseTo(q.answer, 2);
          if (mode === 'overunder') {
            const f = C.compile(q.fnText).f;
            const est = C.riemann(f, q.xMin, q.xMax, q.n, q.ruleMode).value, ex = C.integrate(f, q.xMin, q.xMax).value;
            expect(q.answer).toBe(est > ex + 1e-9 ? 'over' : est < ex - 1e-9 ? 'under' : 'exact');
          }
        }
      }
    }
    expect(C.modesByBand.bc).toContain('taylor');
    expect(C.modesByBand.pre).not.toContain('method');
  });

  it('Taylor coefficients are exact fractions', () => {
    expect(C.taylorCoefficient('sin(x)', 3)).toBe('−1/6');
    expect(C.taylorCoefficient('sin(x)', 4)).toBe('0');
    expect(C.taylorCoefficient('e^(2x)', 3)).toBe('4/3');
    expect(C.taylorCoefficient('ln(1+x)', 4)).toBe('−1/4');
    expect(C.taylorCoefficient('cos(x)', 4)).toBe('1/24');
  });

  it('graph match: one correct option, distractors look different and carry a misconception', () => {
    const rng = lcg(3);
    for (let i = 0; i < 30; i++) {
      const g = C.genMatch(rng, ['pre', 'ab', 'bc'][i % 3], i % 2 ? 'accum' : 'deriv');
      expect(g).toBeTruthy();
      expect(g.opts.filter((o) => !o.mis).length).toBe(1);
      for (let a = 0; a < g.opts.length; a++) for (let b = a + 1; b < g.opts.length; b++) expect(C.sameShape(g.opts[a].samples, g.opts[b].samples)).toBe(false);
      const right = g.opts.find((o) => o.id === g.answer);
      const cf = C.compile(g.fnText);
      if (g.kind === 'deriv') right.samples.forEach((s) => expect(s.y).toBeCloseTo(cf.df(s.x), 6));
    }
    // The same seed rebuilds the same item (saved state stores only the seed).
    expect(JSON.stringify(C.genMatch(C.seeded(42), 'ab', 'deriv'))).toBe(JSON.stringify(C.genMatch(C.seeded(42), 'ab', 'deriv')));
  });

  it('limit practice answers come from the probe, and wrong predictions get a named misconception', () => {
    const rng = lcg(11);
    for (let i = 0; i < 40; i++) {
      const it2 = C.genLimit(rng, ['pre', 'ab', 'bc'][i % 3]);
      expect(['number', '+inf', '-inf', 'dne']).toContain(it2.answer);
    }
    const hole = C.limitProbe(C.compile('(x^2-4)/(x-2)').f, 2);
    expect(C.gradeLimit(hole, { kind: 'number', value: '4' }).correct).toBe(true);
    expect(C.gradeLimit(hole, { kind: 'dne' }).mis).toBe('hole_blocks_limit');
    expect(C.gradeLimit(hole, { kind: 'number', value: '0' }).mis).toBe('zero_over_zero');
    const jump = C.limitProbe(C.compile('floor(x)').f, 2);
    expect(C.gradeLimit(jump, { kind: 'number', value: '2' }).mis).toBe('one_side_only');
    expect(C.gradeLimit(jump, { kind: 'dne' }).correct).toBe(true);
    const asym = C.limitProbe(C.compile('1/(x-1)^2').f, 1);
    expect(C.gradeLimit(asym, { kind: 'dne' }).mis).toBe('infinite_same_sign');
    expect(C.gradeLimit(asym, { kind: '+inf' }).correct).toBe(true);
  });
});

describe('shared graph core', () => {
  it('carries a byte-identical copy of the alloGraphAccess core v2 block', () => {
    const start = '  // == alloGraphAccess core v2 (keep byte-identical in graphcalc + funcgrapher) ==';
    const end = '  // == end alloGraphAccess core v2 ==';
    const block = (s) => s.slice(s.indexOf(start), s.indexOf(end) + end.length);
    const mine = block(fs.readFileSync(FILE, 'utf8'));
    expect(mine.length).toBeGreaterThan(1000);
    expect(mine).toBe(block(fs.readFileSync('stem_lab/stem_tool_graphcalc.js', 'utf8')));
    expect(window.StemLab._graphAccess.version).toBeGreaterThanOrEqual(2);
  });
});
