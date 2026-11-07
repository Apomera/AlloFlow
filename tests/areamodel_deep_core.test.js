// Area Model deep rebuild (2026-11-03): the pure core, run directly (tool._core).
// Every number a screen shows comes from these functions, so they are checked by
// brute force against plain arithmetic rather than against copied constants.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let C;
beforeAll(() => { resetStemLab(); C = loadTool('stem_lab/stem_tool_areamodel.js', 'areamodel')._core; });

function seq(seed) { return C.seeded(seed); }

describe('place-value parts and box models', () => {
  it('splits whole numbers and decimals into exact expanded-form parts', () => {
    expect(C.placeParts(305)).toEqual([300, 0, 5]);
    expect(C.placeParts(7)).toEqual([7]);
    expect(C.partsOf(2.3).map((p) => p.v)).toEqual([2, 0.3]);
    expect(C.partsOf(1.25).map((p) => p.v)).toEqual([1, 0.2, 0.05]);
    expect(C.partsOf(0.4).map((p) => p.v)).toEqual([0.4]);
  });

  it('boxes always add to the true product, for every whole pair in a sweep', () => {
    for (let a = 1; a <= 120; a += 1) {
      for (const b of [1, 7, 10, 14, 30, 99, 305, 4096]) {
        const bm = C.boxModel(a, b);
        expect(bm.total).toBe(a * b);
        expect(bm.boxes.length).toBe(C.placeParts(a).length * C.placeParts(b).length);
      }
    }
  });

  it('decimal products are exact (no 3.2200000000000006)', () => {
    const cases = [[2.3, 1.4, '3.22'], [0.6, 0.8, '0.48'], [1.25, 4.6, '5.75'], [3, 2.6, '7.8'], [12.5, 3.2, '40']];
    for (const [a, b, s] of cases) expect(C.fmt(C.product(a, b))).toBe(s);
    for (let i = 11; i <= 99; i += 7) for (let j = 11; j <= 39; j += 5) {
      const exact = (i * j) / 100;
      expect(C.product(i / 10, j / 10)).toBe(exact);
    }
  });

  it('the 23 × 14 boxes match the four classic partial products', () => {
    expect(C.boxModel(23, 14).boxes.map((b) => [b.label, b.value])).toEqual([['20×10', 200], ['20×4', 80], ['3×10', 30], ['3×4', 12]]);
  });
});

describe('answer parsing and grading', () => {
  it('whole-number answers accept 24, 24.0 and 1,234 but not 24.9', () => {
    const ch = { mode: 'word', a: 4, b: 6, answer: 24 };
    expect(C.grade(ch, '24').correct).toBe(true);
    expect(C.grade(ch, '24.0').correct).toBe(true);
    expect(C.grade(ch, ' 24 ').correct).toBe(true);
    expect(C.grade(ch, '24.9').correct).toBe(false);
    expect(C.grade({ mode: 'multidigit', a: 2, b: 617, answer: 1234 }, '1,234').correct).toBe(true);
    expect(C.grade(ch, '').correct).toBe(false);
    expect(C.grade(ch, '2x').code).toBe('not_number');
  });

  it('fraction answers accept any equivalent form, including mixed numbers', () => {
    const ch = { mode: 'fraction', n1: 3, d1: 2, n2: 2, d2: 3, answer: { num: 6, den: 6 } };
    expect(C.grade(ch, '6/6').correct).toBe(true);
    expect(C.grade(ch, '1').correct).toBe(true);
    const ch2 = { mode: 'fraction', n1: 2, d1: 3, n2: 3, d2: 4, answer: { num: 6, den: 12 } };
    for (const ok of ['6/12', '1/2', '0.5', '3/6']) expect(C.grade(ch2, ok).correct, ok).toBe(true);
    expect(C.grade(ch2, '6/7').correct).toBe(false);
    expect(C.parseFrac('1 1/2')).toEqual({ num: 3, den: 2 });
    expect(C.parseFrac('3/0')).toBeNull();
  });

  it('algebra answers grade by coefficient; empty means 0', () => {
    const ch = { mode: 'algebra', f1: { x: 1, c: 3 }, f2: { x: 1, c: 2 } };
    expect(C.grade(ch, '', { A: '1', B: '5', C: '6' }).correct).toBe(true);
    expect(C.grade(ch, '', { A: '', B: '5', C: '6' }).correct).toBe(false);
    const k = { mode: 'algebra', f1: { x: 0, c: 3 }, f2: { x: 1, c: 2 } };
    expect(C.grade(k, '', { A: '', B: '3', C: '6' }).correct).toBe(true);
  });
});

describe('named mistakes', () => {
  const basic = { mode: 'basic', a: 7, b: 8, answer: 56 };
  it('names whole-number mix-ups', () => {
    expect(C.grade(basic, '15').code).toBe('added');
    expect(C.grade(basic, '30').code).toBe('perimeter');
    expect(C.grade(basic, '48').code).toBe('row_short');
    expect(C.grade(basic, '49').code).toBe('row_short');
    expect(C.grade(basic, '64').code).toBe('row_extra');
    expect(C.grade(basic, '50').code).toBe('generic_rows');
  });
  it('names distributive mix-ups', () => {
    const d = { mode: 'distributive', a: 7, b: 9, split: 5, answer: 63 };
    expect(C.grade(d, '35').code).toBe('one_piece');
    expect(C.grade(d, '28').code).toBe('one_piece');
    expect(C.grade(d, '39').code).toBe('not_distributed');
  });
  it('names partial-product mix-ups', () => {
    const m = { mode: 'multidigit', a: 23, b: 14, answer: 322 };
    expect(C.grade(m, '212').code).toBe('missed_cross');
    expect(C.grade(m, '200').code).toBe('only_biggest');
    expect(C.grade(m, '242').code).toBe('missed_box');
    expect(C.grade(m, '25').code).toBe('digits_only');
    expect(C.grade(m, '3220').code).toBe('pv_big');
    expect(C.grade(m, '32.2').code).toBe('pv_small');
    expect(C.grade(m, '321').code).toBe('close');
    const dm = { mode: 'multidigit', a: 2.3, b: 1.4, answer: 3.22 };
    expect(C.grade(dm, '32.2').code).toBe('decimal_big');
    expect(C.grade(dm, '0.322').code).toBe('decimal_small');
  });
  it('names fraction-side mix-ups', () => {
    const f = { mode: 'fraction', n1: 2, d1: 3, n2: 3, d2: 4, answer: { num: 6, den: 12 } };
    expect(C.grade(f, '17/12').code).toBe('frac_added');
    expect(C.grade(f, '5/7').code).toBe('frac_added_across');
    expect(C.grade(f, '6').code).toBe('frac_tile_count');
    expect(C.grade(f, '6/7').code).toBe('frac_tile_size');
    expect(C.grade(f, '6/12').correct).toBe(true);
    expect(C.grade(f, 'abc').code).toBe('frac_not_fraction');
  });
  it('names algebra mix-ups', () => {
    const g = { mode: 'algebra', f1: { x: 1, c: 3 }, f2: { x: 1, c: 2 } };
    expect(C.grade(g, '', { A: '1', B: '5', C: '5' }).code).toBe('alg_added_constants');
    expect(C.grade(g, '', { A: '1', B: '', C: '6' }).code).toBe('alg_missing_middle');
    expect(C.grade(g, '', { A: '1', B: '3', C: '6' }).code).toBe('alg_one_x_box');
    expect(C.grade(g, '', { A: '1', B: '6', C: '6' }).code).toBe('alg_middle_product');
    expect(C.grade(g, '', { A: '2', B: '5', C: '6' }).code).toBe('alg_x_times_x');
  });
  it('names single-box mix-ups', () => {
    expect(C.diagnoseBox(20, 10, 200, 30)).toBe('box_added');
    expect(C.diagnoseBox(20, 10, 200, 20)).toBe('box_pv_small');
    expect(C.diagnoseBox(20, 10, 200, 2)).toBe('box_pv_small');
    expect(C.diagnoseBox(0.3, 0.4, 0.12, 1.2)).toBe('box_decimal');
    expect(C.diagnoseBox(7, 8, 56, 48)).toBe('box_one_off');
    expect(C.diagnoseBox(20, 10, 200, 200)).toBe('ok');
  });
});

describe('generated practice never runs out and always grades', () => {
  const modes = ['basic', 'distributive', 'multidigit', 'fraction', 'algebra', 'word', 'algorithm'];
  const bands = ['g3', 'g4', 'g5', 'g6'];
  const diffs = ['easy', 'medium', 'hard'];
  it('every band × mode × difficulty yields valid problems whose stored answer is right', () => {
    for (const mode of modes) for (const band of bands) for (const diff of diffs) {
      const rand = seq(mode.length * 1000 + band.charCodeAt(1) * 10 + diff.length);
      for (let i = 0; i < 40; i += 1) {
        const ch = C.gen(mode, band, diff, rand);
        expect(ch.mode).toBe(mode);
        if (mode === 'fraction') {
          expect(ch.d1).toBeGreaterThanOrEqual(2);
          expect(ch.n1).toBeGreaterThanOrEqual(1);
          expect(ch.n1).toBeLessThan(2 * ch.d1);
          expect(C.grade(ch, ch.answer.num + '/' + ch.answer.den).correct).toBe(true);
        } else if (mode === 'algebra') {
          const e = C.algExpand(ch.f1, ch.f2);
          expect(C.grade(ch, '', { A: String(e.A), B: String(e.B), C: String(e.C) }).correct).toBe(true);
        } else {
          expect(Number.isFinite(ch.a) && ch.a > 0 && Number.isFinite(ch.b) && ch.b > 0).toBe(true);
          expect(ch.answer).toBe(C.product(ch.a, ch.b));
          if (mode !== 'algorithm') expect(C.grade(ch, String(C.fmt(ch.answer))).correct).toBe(true);
          if (mode === 'distributive') { expect(ch.split).toBeGreaterThan(0); expect(ch.split).toBeLessThan(ch.b); }
          if (mode === 'multidigit') expect(C.boxCount(ch.a, ch.b)).toBeLessThanOrEqual(12);
          if (mode === 'word') expect(ch.ctxIdx).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('grade levels scale: grade 3 grid facts stay within 10, grade 5 includes decimals, grade 4 reaches 4-digit by 1-digit', () => {
    const r = seq(7);
    let maxG3 = 0, sawDecimal = false, saw4x1 = false;
    for (let i = 0; i < 300; i += 1) {
      const b3 = C.gen('basic', 'g3', 'hard', r); maxG3 = Math.max(maxG3, b3.a, b3.b);
      const m5 = C.gen('multidigit', 'g5', 'medium', r); if (m5.dec) sawDecimal = true;
      const m4 = C.gen('multidigit', 'g4', 'hard', r); if (m4.a < 10 && m4.b >= 1000) saw4x1 = true;
    }
    expect(maxG3).toBeLessThanOrEqual(10);
    expect(sawDecimal).toBe(true);
    expect(saw4x1).toBe(true);
  });

  it('a constant random source cannot hang the generator', () => {
    for (const mode of modes) for (const band of bands) expect(C.gen(mode, band, 'hard', () => 0.999999).mode).toBe(mode);
    for (const mode of modes) expect(C.gen(mode, 'g4', 'easy', () => 0).mode).toBe(mode);
  });

  it('maps host grade levels to bands', () => {
    expect(C.bandFor('3rd Grade')).toBe('g3');
    expect(C.bandFor('Kindergarten')).toBe('g3');
    expect(C.bandFor('4th Grade')).toBe('g4');
    expect(C.bandFor('5th Grade')).toBe('g5');
    expect(C.bandFor('7th Grade')).toBe('g6');
    expect(C.bandFor('High School')).toBe('g6');
    expect(C.bandFor('', 'g68')).toBe('g6');
    expect(C.bandFor('', 'k2')).toBe('g3');
  });
});

describe('standard algorithm, line by line', () => {
  it('each line equals a column of boxes, and the lines add to the product', () => {
    for (let a = 12; a <= 999; a += 37) for (let b = 2; b <= 99; b += 13) {
      const plan = C.algoLines(a, b);
      const bm = plan.model;
      plan.lines.forEach((l) => {
        const colSum = l.boxes.reduce((s, ix) => s + bm.boxes[ix].value, 0);
        expect(l.value).toBe(colSum);
        // The written digits with their carries rebuild the line.
        const written = l.subs.reduce((acc, s, i) => acc + s.w * Math.pow(10, i), 0) * Math.pow(10, l.place);
        expect(written).toBe(l.value);
      });
      expect(plan.lines.reduce((s, l) => s + l.value, 0)).toBe(a * b);
    }
  });
  it('names the missing carry and the missing placeholder zero', () => {
    const plan = C.algoLines(23, 14);
    expect(plan.lines.map((l) => l.value)).toEqual([92, 230]);
    expect(C.diagnoseLine(plan.lines[0], 82)).toBe('algo_no_carry');
    expect(C.diagnoseLine(plan.lines[1], 23)).toBe('algo_no_placeholder');
    expect(C.diagnoseLine(plan.steps[2], 115)).toBe('algo_sum_no_placeholder');
    expect(C.diagnoseLine(plan.lines[0], 92)).toBe('algo_generic');
  });
});

describe('worked examples', () => {
  it('step answers are consistent with the problem they work', () => {
    const r = seq(99);
    for (const mode of ['multidigit', 'distributive', 'fraction', 'algebra']) {
      for (let i = 0; i < 30; i += 1) {
        const p = C.gen(mode, 'g5', 'medium', r);
        const steps = C.workedSteps(p);
        expect(steps.length).toBeGreaterThanOrEqual(2);
        if (mode === 'multidigit' || mode === 'distributive') {
          const boxes = steps.filter((s) => s.k === 'w_box');
          boxes.forEach((s) => expect(C.sameNum(s.ans, C.product(s.pa, s.pb))).toBe(true));
          expect(C.sameNum(steps[steps.length - 1].ans, C.product(p.a, p.b))).toBe(true);
        }
        if (mode === 'fraction') expect(steps[2].ans).toEqual({ num: p.n1 * p.n2, den: p.d1 * p.d2 });
        if (mode === 'algebra') {
          const e = C.algExpand(p.f1, p.f2);
          const combine = steps.find((s) => s.k === 'w_alg_combine');
          if (combine) expect(combine.ans).toBe(e.B);
        }
      }
    }
  });
});
