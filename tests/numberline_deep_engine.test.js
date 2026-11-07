// Number Line deep rebuild (2026-11-03): the Place it practice engine, run as
// code (not grepped). The engine is pure and exposed as config._engine.
// NUMBERLINE_DEEP_SRC points the suite at another copy of the tool.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.NUMBERLINE_DEEP_SRC || 'stem_lab/stem_tool_numberline.js';
let E;
const t = (k, fb) => fb;
beforeAll(() => { resetStemLab(); E = loadTool(FILE, 'numberline')._engine; });

const item = (o) => Object.assign({ v: 2, id: 'x', tries: 0 }, o);

describe('grade bands', () => {
  it('maps the host gradeBand (and 3rd grade) onto the three tool bands', () => {
    expect(E.bandFor('k2', '1st Grade')).toBe('b23');
    expect(E.bandFor('g35', '3rd Grade')).toBe('b23');
    expect(E.bandFor('g35', '4th Grade')).toBe('b45');
    expect(E.bandFor('g35', '5th Grade')).toBe('b45');
    expect(E.bandFor('g68', '6th Grade')).toBe('b6');
    expect(E.bandFor('g912', '10th Grade')).toBe('b6');
    expect(E.bandFor(undefined, '2nd Grade')).toBe('b23');
    expect(E.bandFor(undefined, '7th Grade')).toBe('b6');
  });
  it('serves only the band’s item types unless a teacher list is given', () => {
    const rng = E.seeded(5);
    for (const band of E.BANDS) {
      for (let i = 0; i < 60; i++) expect(E.BAND_TYPES[band]).toContain(E.nextItem(band, null, rng).type);
    }
    for (let i = 0; i < 30; i++) expect(E.nextItem('b23', ['hopSum'], rng).type).toBe('hopSum');
  });
});

describe('generated items are answerable, on the line, and reachable', () => {
  it('every type in every band, 120 seeds each', () => {
    for (const type of E.ALL_TYPES) {
      for (const band of E.BANDS) {
        for (let s = 1; s <= 120; s++) {
          const it = E.genItem(type, band, E.seeded(s * 7919 + type.length));
          const where = type + '/' + band + '/' + s;
          expect(Number.isFinite(it.target), where).toBe(true);
          expect(it.line.max > it.line.min, where).toBe(true);
          if (it.answer === 'position') {
            expect(it.target >= it.line.min && it.target <= it.line.max, where + ' target on line').toBe(true);
            // The closest point the marker can reach (pointer or keys) must grade correct.
            const reach = E.snapPos(it, it.target);
            expect(E.grade(it, { pos: reach }).ok, where + ' reachable ' + reach + ' vs ' + it.target).toBe(true);
            // A placement half the line away is never accepted.
            const far = it.target - it.line.min > (it.line.max - it.line.min) / 2 ? it.line.min : it.line.max;
            expect(E.grade(it, { pos: far }).ok, where + ' far').toBe(false);
          } else {
            const shown = it.type === 'readFraction' ? it.text : String(it.target);
            expect(E.grade(it, { text: shown }).ok, where + ' typed ' + shown).toBe(true);
            expect(E.grade(it, { text: String(it.target + 1) }).ok, where + ' off by one').toBe(false);
          }
          if (it.type === 'readScale') expect(it.target).toBe(it.line.min + it.k * it.s);
          if (it.type === 'roundLine') expect(it.target).toBe(Math.round(it.N / it.base) * it.base);
          if (it.type === 'hopSum') expect(it.target).toBe(it.op === '+' ? it.a + it.b : it.a - it.b);
          if (it.type === 'placeFraction' || it.type === 'readFraction') expect(it.target).toBeCloseTo(it.p / it.q, 9);
        }
      }
    }
  });

  it('typed answers accept equivalent forms and reject garbage', () => {
    const rf = item({ type: 'readFraction', answer: 'fraction', target: 0.75, tol: 1e-6, p: 3, q: 4, text: '3/4', line: { min: 0, max: 1, step: 0.25, labels: [0, 1] } });
    for (const ok of ['3/4', '6/8', '0.75', ' 3 / 4 '.replace(/ /g, '')]) expect(E.grade(rf, { text: ok }).ok, ok).toBe(true);
    for (const bad of ['', 'abc', '3/0', '3//4']) expect(E.grade(rf, { text: bad }).valid, bad).toBe(false);
    expect(E.parseAnswer('1 1/2').value).toBe(1.5);
    expect(E.parseAnswer('-3/4').value).toBe(-0.75);
    expect(E.parseAnswer('−2').value).toBe(-2);
  });

  it('position items cannot be answered with typed text', () => {
    const pw = item({ type: 'placeWhole', answer: 'position', target: 7, tol: 0.49, snap: 1, line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] } });
    expect(E.grade(pw, { text: '7' }).valid).toBe(false);
    expect(E.grade(pw, { pos: null }).valid).toBe(false);
    expect(E.grade(pw, { pos: 7 }).ok).toBe(true);
  });
});

describe('named misconceptions', () => {
  const ln = (min, max, step, labels) => ({ min, max, step, labels });
  const cases = [
    ['counting ticks on a scaled line', item({ type: 'readScale', answer: 'number', target: 15, tol: 1e-9, k: 3, s: 5, line: ln(0, 50, 5, [0, 50]) }), { text: '20' }, 'ticks_not_spaces'],
    ['each space read as 1', item({ type: 'readScale', answer: 'number', target: 15, tol: 1e-9, k: 3, s: 5, line: ln(0, 50, 5, [0, 50]) }), { text: '3' }, 'scale_as_ones'],
    ['placing by counting ticks', item({ type: 'placeWhole', answer: 'position', target: 7, tol: 0.49, line: ln(0, 10, 1, [0, 5, 10]) }), { pos: 6 }, 'ticks_not_spaces'],
    ['numerator placed as a whole number', item({ type: 'placeFraction', answer: 'position', target: 2 / 3, tol: 0.16, p: 2, q: 3, line: ln(0, 3, 1 / 3, [0, 1, 2, 3]) }), { pos: 2 }, 'whole_number_bias'],
    ['bigger denominator read as bigger', item({ type: 'placeFraction', answer: 'position', target: 0.25, tol: 0.1, p: 1, q: 4, line: ln(0, 1, 0.25, [0, 1]) }), { pos: 0.75 }, 'denominator_bigger'],
    ['fraction ticks counted, not spaces', item({ type: 'placeFraction', answer: 'position', target: 0.75, tol: 0.1, p: 3, q: 4, line: ln(0, 1, 0.25, [0, 1]) }), { pos: 0.5 }, 'ticks_not_spaces'],
    ['read q+1 ticks as the denominator', item({ type: 'readFraction', answer: 'fraction', target: 0.75, tol: 1e-6, p: 3, q: 4, line: ln(0, 1, 0.25, [0, 1]) }), { text: '3/5' }, 'ticks_not_spaces'],
    ['typed the numerator only', item({ type: 'readFraction', answer: 'fraction', target: 0.75, tol: 1e-6, p: 3, q: 4, line: ln(0, 1, 0.25, [0, 1]) }), { text: '3' }, 'whole_number_bias'],
    ['whole line used as the whole', item({ type: 'readFraction', answer: 'fraction', target: 0.75, tol: 1e-6, p: 3, q: 4, line: ln(0, 2, 0.25, [0, 1, 2]) }), { text: '3/8' }, 'whole_is_line'],
    ['decimal shifted a place', item({ type: 'placeDecimal', answer: 'position', target: 0.6, tol: 0.049, places: 1, line: ln(0, 1, 0.1, [0, 0.5, 1]) }), { pos: 0.06 }, 'place_value_shift'],
    ['integer sign ignored', item({ type: 'placeInteger', answer: 'position', target: -3, tol: 0.49, line: ln(-10, 10, 1, [-10, -5, 0, 5, 10]) }), { pos: 3 }, 'sign_ignored'],
    ['counted from the left end', item({ type: 'placeInteger', answer: 'position', target: -3, tol: 0.49, line: ln(-10, 10, 1, [-10, -5, 0, 5, 10]) }), { pos: -7 }, 'counted_from_end'],
    ['hop made the wrong way', item({ type: 'hopSum', answer: 'position', target: -2, tol: 0.49, a: 3, b: -5, op: '+', line: ln(-15, 15, 1, [0]) }), { pos: 8 }, 'hop_direction'],
    ['hop started at zero', item({ type: 'hopSum', answer: 'position', target: -2, tol: 0.49, a: 3, b: -5, op: '+', line: ln(-15, 15, 1, [0]) }), { pos: -5 }, 'started_at_zero'],
    ['negative mixed number moved back toward 0', item({ type: 'placeRational', answer: 'position', target: -1.5, tol: 0.24, text: '-1 1/2', line: ln(-3, 3, 0.5, [-3, 0, 3]) }), { pos: -0.5 }, 'negative_fraction_direction'],
    ['absolute value kept its sign', item({ type: 'absDistance', answer: 'number', kind: 'abs', x: -6, target: 6, tol: 1e-9, line: ln(-15, 15, 1, [0]) }), { text: '-6' }, 'abs_kept_sign'],
    ['distance across 0 subtracted', item({ type: 'absDistance', answer: 'number', kind: 'dist', a: -4, b: 7, target: 11, tol: 1e-9, line: ln(-15, 15, 1, [0]) }), { text: '3' }, 'distance_subtracted_sizes'],
    ['exactly halfway rounded down', item({ type: 'roundLine', answer: 'number', N: 45, base: 10, lo: 40, hi: 50, target: 50, tol: 1e-9, line: ln(40, 50, 1, [40, 50]) }), { text: '40' }, 'round_halfway'],
    ['the farther multiple chosen', item({ type: 'roundLine', answer: 'number', N: 47, base: 10, lo: 40, hi: 50, target: 50, tol: 1e-9, line: ln(40, 50, 1, [40, 50]) }), { text: '40' }, 'round_wrong_side'],
    ['small number squeezed right on 0-100', item({ type: 'estimateOpen', answer: 'position', target: 10, tol: 5, close: 10, line: { min: 0, max: 100, open: true, labels: [0, 100] } }), { pos: 40 }, 'compressed_scale']
  ];
  it.each(cases)('%s', (_name, it, resp, code) => {
    const g = E.grade(it, resp);
    expect(g.valid).toBe(true);
    expect(g.ok).toBe(false);
    expect(g.mis).toBe(code);
    const info = E.misInfo(code, it, t);
    expect(info.title.length).toBeGreaterThan(5);
    expect(info.body.length).toBeGreaterThan(20);
  });
  it('a correct answer never carries a misconception', () => {
    for (const [, it] of cases) expect(E.grade(it, it.answer === 'position' ? { pos: it.target } : { text: String(it.target === 0.75 && it.type === 'readFraction' ? '3/4' : it.target) }).mis).toBeNull();
  });
});

describe('non-visual descriptions do not give the answer away', () => {
  it('a marker sitting on the target is described in spaces from a label, never by its value', () => {
    let checked = 0;
    for (const type of ['placeWhole', 'placeFraction', 'placeDecimal', 'placeInteger', 'placeRational', 'estimateOpen']) {
      for (let s = 1; s <= 80; s++) {
        const band = type === 'placeWhole' ? 'b23' : type === 'placeInteger' || type === 'placeRational' ? 'b6' : 'b45';
        const it = E.genItem(type, band, E.seeded(s * 31 + 3));
        if ((it.line.labels || []).some((l) => Math.abs(l - it.target) < 1e-9)) continue;
        const text = E.describeSpot(it, E.snapPos(it, it.target), t, 'marker');
        // Counting spaces from the label 0 with unit spaces IS the value (a sighted reader counts the same way).
        const L = Math.max(...it.line.labels.filter((l) => l <= it.target));
        if (!it.line.open && Math.abs((it.target - L) / it.line.step - it.target) < 1e-9) continue;
        const shown = [it.text, String(it.target)];
        for (const v of shown) expect(new RegExp('(^|[^0-9./])' + v.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '($|[^0-9/])').test(text), type + ' ' + v + ': ' + text).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });
  it('an arrow on a scaled line is described by spaces and labels', () => {
    const it = item({ type: 'readScale', target: 15, k: 3, s: 5, arrow: 15, line: { min: 0, max: 50, step: 5, labels: [0, 50] } });
    const d = E.describeLine(it, t);
    expect(d).toContain('10 equal spaces');
    expect(d).toContain('3 spaces right of the labelled tick 0');
    expect(d).not.toMatch(/\b15\b/);
  });
});

describe('Explore / Quick-question tick layout', () => {
  const lab = (min, max) => E.lineTicks(min, max).majors.filter((m) => m.label).map((m) => m.v);
  it('short ranges get fraction-of-a-unit ticks (0..1 used to show only 0 and 1)', () => {
    expect(lab(0, 1)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(lab(0, 2.5)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
    expect(lab(0, 0.5)[1]).toBe(0.05);
  });
  it('off-grid ends keep a nice step instead of range/10 (0..37 was cut into 3.7s)', () => {
    const v = lab(0, 37);
    expect(v).toContain(35);
    expect(v[v.length - 1]).toBe(37);
    for (const x of v.slice(0, -1)) expect(x % 5).toBe(0);
  });
  it('keeps the one-tick-per-unit default and the rounding grids', () => {
    expect(lab(0, 20)).toEqual(Array.from({ length: 21 }, (_, i) => i));
    expect(E.lineTicks(0, 20).minors).toEqual([]);
    const r = E.lineTicks(30, 60);
    expect(lab(30, 60)).toEqual([30, 35, 40, 45, 50, 55, 60]);
    for (const m of r.minors) expect(Number.isInteger(m.v)).toBe(true);
  });
});

describe('worked steps and hop rules', () => {
  it('hop steps state the direction rule for all four sign cases', () => {
    expect(E.hopSteps(3, '+', 4, t).join(' ')).toContain('moving 4 to the right');
    expect(E.hopSteps(3, '+', -5, t).join(' ')).toContain('moving 5 to the left');
    expect(E.hopSteps(3, '-', 4, t).join(' ')).toContain('moving 4 to the left');
    expect(E.hopSteps(3, '-', -4, t).join(' ')).toContain('moving 4 to the right');
    expect(E.hopSteps(3, '+', -5, t).join(' ')).toContain('You land on -2');
  });
  it('every type has a 3-step hint ladder and worked steps that end at the answer', () => {
    for (const type of E.ALL_TYPES) {
      const band = ['placeWhole', 'readScale', 'roundLine'].includes(type) ? 'b23' : ['placeInteger', 'hopSum', 'placeRational', 'absDistance'].includes(type) ? 'b6' : 'b45';
      const it = E.genItem(type, band, E.seeded(99));
      expect(E.hints(it, t).length, type).toBe(3);
      const steps = E.steps(it, t);
      expect(steps.length, type).toBeGreaterThanOrEqual(2);
    }
  });
});
