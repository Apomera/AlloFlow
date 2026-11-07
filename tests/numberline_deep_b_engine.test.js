// Number Line stage B engine (2026-11-03 pm): decimal zoom, ordering mixed
// forms, ruler + line plot, integers in context and the CER investigation.
// Every check runs the generators and graders; nothing greps the source.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.NUMBERLINE_DEEP_SRC || 'stem_lab/stem_tool_numberline.js';
let B, E;
const t = (k, fb) => fb;
const near = (a, b) => Math.abs(a - b) < 1e-9;
beforeAll(() => {
  resetStemLab();
  loadTool(FILE, 'numberline');
  B = window.StemLab._registry.numberline._engineB;
  E = window.StemLab._registry.numberline._engine;
  expect(B, 'stage B engine is exposed').toBeTruthy();
});

describe('decimal zoom views', () => {
  it('zooms 0 to 1 -> 0.3 to 0.4 -> 0.34 to 0.35 and back out', () => {
    let v = B.dzView(0, 0);
    expect([v.lo, v.hi, v.step]).toEqual([0, 1, 0.1]);
    v = B.dzZoomIn(v, 0.34);
    expect([v.lo, v.hi, v.level, v.step]).toEqual([0.3, 0.4, 1, 0.01]);
    v = B.dzZoomIn(v, 0.347);
    expect([v.lo, v.hi, v.level, v.step]).toEqual([0.34, 0.35, 2, 0.001]);
    expect(B.dzZoomIn(v, 0.347)).toBeNull();               // thousandths is the deepest level
    expect(B.dzTicks(v)).toHaveLength(11);
    expect(B.dzTicks(v)[7]).toBe(0.347);
    const out = B.dzZoomOut(v);
    expect([out.lo, out.level]).toEqual([0.3, 1]);
    expect(B.dzZoomOut(B.dzView(0, 0))).toBeNull();
  });
  it('floating-point edges land in the right space (0.29, the right end, a tick)', () => {
    expect(B.dzZoomIn(B.dzView(0, 0), 0.29).lo).toBe(0.2);
    expect(B.dzZoomIn(B.dzView(0, 0), 1).lo).toBe(0.9);       // right end zooms into the last space
    expect(B.dzZoomIn(B.dzView(0, 0), 0.3).lo).toBe(0.3);
    expect(B.dzZoomIn(B.dzView(0.2, 1), 0.29).lo).toBe(0.29);
    expect(B.dzZoomIn(B.dzView(0, 0), 2)).toBeNull();         // a marker outside the view cannot pick a space
    expect(B.dzPan(B.dzView(0.3, 1), 1).lo).toBe(0.4);
    expect(B.dzPan(B.dzView(0, 0), -1)).toBeNull();
  });
  it('place items: the right number of places, a non-zero last digit, the teacher cap and grade band', () => {
    for (let i = 0; i < 1500; i++) {
      for (const band of ['b23', 'b45', 'b6']) {
        const it = B.genDzPlace(band);
        const frac = it.text.split('.')[1];
        expect(frac.length).toBe(it.places);
        expect(frac.slice(-1)).not.toBe('0');
        expect(near(it.target, Number(it.text))).toBe(true);
        expect(it.target).toBeGreaterThan(it.W);
        expect(it.target).toBeLessThan(it.W + 1);
        if (band === 'b23') expect(it.places).toBeLessThanOrEqual(2);
        if (band !== 'b6') expect(it.W).toBe(0);
      }
      expect(B.genDzPlace('b6', Math.random, 1).places).toBe(1);
    }
  });
  it('names the slip in a decimal placement', () => {
    const item = (text, W) => ({ kind: 'dzPlace', text, target: Number(text), places: text.split('.')[1].length, W: W || 0 });
    expect(B.gradeDzPlace(item('0.305'), 0.35).mis).toBe('dz_zero_dropped');
    expect(B.gradeDzPlace(item('0.05'), 0.5).mis).toBe('dz_zero_dropped');
    expect(B.gradeDzPlace(item('0.4'), 0.04).mis).toBe('place_value_shift');
    expect(B.gradeDzPlace(item('0.347'), 0.3).mis).toBe('dz_stopped_early');
    expect(B.gradeDzPlace(item('0.347'), 0.34).mis).toBe('dz_stopped_early');
    expect(B.gradeDzPlace(item('0.347'), 0.35).mis).toBe('dz_stopped_early');
    expect(B.gradeDzPlace(item('0.347'), 0.348).mis).toBe('dz_off_thousandths');
    expect(B.gradeDzPlace(item('0.347'), 0.447).mis).toBe('dz_off_tenths');
    expect(B.gradeDzPlace(item('2.36', 2), 2.36000000001).ok).toBe(true);
    expect(B.gradeDzPlace(item('0.347'), null).valid).toBe(false);
  });
  it('the worked steps follow the zoom path and end on the target', () => {
    const steps = B.dzPlaceSteps({ text: '0.347', target: 0.347, places: 3, W: 0 }, t);
    expect(steps.join(' ')).toContain('between 0.3 and 0.4');
    expect(steps.join(' ')).toContain('Zoom in on the space from 0.3 to 0.4');
    expect(steps.join(' ')).toContain('between 0.34 and 0.35');
    expect(steps[steps.length - 1]).toBe('0.347 has 7 in the thousandths place, so it is on the tick 0.347.');
  });
});

describe('decimal comparison and the "longer is bigger" misconception', () => {
  const pair = (sa, sb) => ({ sa, sb, a: Number(sa), b: Number(sb), rel: Number(sa) === Number(sb) ? '=' : Number(sa) < Number(sb) ? '<' : '>' });
  it('names longer-is-bigger, shorter-is-bigger and not-equal', () => {
    expect(B.gradeDzCompare(pair('0.4', '0.375'), '<').mis).toBe('longer_is_bigger');
    expect(B.gradeDzCompare(pair('0.375', '0.4'), '>').mis).toBe('longer_is_bigger');
    expect(B.gradeDzCompare(pair('0.4', '0.45'), '>').mis).toBe('shorter_is_bigger');
    expect(B.gradeDzCompare(pair('0.09', '0.1'), '>').mis).toBe('longer_is_bigger');
    // Equal pairs (stage D): neither digit rule fits, so the trailing-zero slip is named.
    expect(B.gradeDzCompare(pair('0.5', '0.50'), '<').mis).toBe('dz_trailing_zero');
    expect(B.gradeDzCompare(pair('0.5', '0.50'), '>').mis).toBe('dz_trailing_zero');
    expect(B.gradeDzCompare(pair('0.3', '0.7'), '=').mis).toBe('dz_not_equal');
    expect(B.gradeDzCompare(pair('0.3', '0.7'), '>').mis).toBe('dz_compare_digits');
    expect(B.gradeDzCompare(pair('0.4', '0.375'), '>').ok).toBe(true);
    expect(B.gradeDzCompare(pair('0.4', '0.375'), 'x').valid).toBe(false);
  });
  it('generated pairs have the right relation and often plant a longer-but-smaller decimal', () => {
    let planted = 0;
    for (let i = 0; i < 2000; i++) {
      const it = B.genDzCompare(i % 2 ? 'b45' : 'b6');
      const rel = near(it.a, it.b) ? '=' : it.a < it.b ? '<' : '>';
      expect(it.rel).toBe(rel);
      expect(near(it.a, Number(it.sa)) && near(it.b, Number(it.sb))).toBe(true);
      const longer = B.decPlaces(it.sa) > B.decPlaces(it.sb) ? it.a : B.decPlaces(it.sb) > B.decPlaces(it.sa) ? it.b : null;
      if (longer != null && longer < Math.max(it.a, it.b)) planted++;
    }
    expect(planted).toBeGreaterThan(500);
  });
  it('the comparison steps name the first differing place', () => {
    const s = B.dzCompareSteps(pair('0.4', '0.375'), t).join(' ');
    expect(s).toContain('0.400 and 0.375');
    expect(s).toContain('the tenths place: 4 and 3');
    expect(s).toContain('So 0.4 > 0.375');
  });
});

describe('ordering fractions, decimals and percents', () => {
  it('generates distinct, separated, unsorted mixes with every form at grades 4-5', () => {
    for (let i = 0; i < 1500; i++) {
      for (const band of ['b23', 'b45', 'b6']) {
        const it = B.genOrder(band);
        const n = band === 'b23' ? 3 : band === 'b45' ? 4 : 5;
        expect(it.nums).toHaveLength(n);
        const vals = it.nums.map((x) => x.value).sort((a, b) => a - b);
        for (let k = 0; k < vals.length - 1; k++) expect(vals[k + 1] - vals[k]).toBeGreaterThanOrEqual(band === 'b45' ? 0.06 - 1e-9 : 0.1 - 1e-9);
        for (const x of it.nums) { expect(x.value).toBeGreaterThan(it.line.min); expect(x.value).toBeLessThan(it.line.max); }
        let sorted = true; for (let k = 0; k < n - 1; k++) if (it.nums[k].value > it.nums[k + 1].value) sorted = false;
        expect(sorted).toBe(false);
        if (band === 'b45') { const kinds = new Set(it.nums.map((x) => x.kind)); expect(kinds.has('frac') && kinds.has('dec') && kinds.has('pct')).toBe(true); }
        // the text really is the value
        for (const x of it.nums) {
          const s = x.text.replace('−', '-');
          const v = x.kind === 'pct' ? Number(s.slice(0, -1)) / 100 : x.kind === 'dec' ? Number(s) : x.kind === 'mixed' ? x.w + x.n / x.d : (s.startsWith('-') ? -1 : 1) * x.n / x.d;
          expect(near(v, x.value)).toBe(true);
        }
      }
    }
  });
  const mk = (nums) => ({ nums, line: { min: 0, max: 1, step: 0.1, labels: [0, 0.5, 1], snap: 0.01 } });
  const P = (p) => ({ kind: 'pct', text: p + '%', value: p / 100, p });
  const D = (s) => ({ kind: 'dec', text: s, value: Number(s), places: s.split('.')[1].length });
  const F = (n, d) => ({ kind: 'frac', text: n + '/' + d, value: n / d, n, d });
  it('grades the order of the placed markers and names the slip', () => {
    const it = mk([F(3, 4), D('0.375'), P(8), D('0.5')]);
    expect(B.gradeOrder(it, [0.75, 0.375, 0.08, 0.5]).ok).toBe(true);
    expect(B.gradeOrder(it, [0.9, 0.2, 0.05, 0.6]).ok).toBe(true);              // order, not exact spots
    let r = B.gradeOrder(it, [0.75, 0.375, 0.6, 0.5]);                          // 8% put right of 0.5
    expect(r.mis).toBe('ord_percent_whole');
    expect(r.pair).toEqual([3, 2]);
    r = B.gradeOrder(it, [0.75, 0.55, 0.08, 0.5]);                              // 0.375 put right of 0.5
    expect(r.mis).toBe('longer_is_bigger');
    expect(B.gradeOrder(mk([D('0.4'), D('0.45')]), [0.5, 0.4]).mis).toBe('shorter_is_bigger');
    expect(B.gradeOrder(mk([F(1, 3), F(1, 4)]), [0.2, 0.3]).mis).toBe('denominator_bigger');
    expect(B.gradeOrder(mk([F(1, 2), F(3, 8)]), [0.3, 0.4]).mis).toBe('whole_number_bias');
    expect(B.gradeOrder(mk([F(3, 4), D('0.7')]), [0.7, 0.7]).mis).toBe('ord_same_spot');
    expect(B.gradeOrder(mk([F(3, 4), D('0.7')]), [0.7, null])).toEqual({ valid: false, missing: 1 });
    const neg = { kind: 'dec', text: '−0.25', value: -0.25, places: 2 }, neg2 = { kind: 'dec', text: '−0.5', value: -0.5, places: 1 };
    expect(B.gradeOrder({ nums: [neg, neg2], line: { min: -1, max: 2 } }, [-0.25, -0.1]).mis).toBe('ord_negative');
  });
  it('the reveal lists every number as a decimal and the true order', () => {
    const s = B.orderSteps(mk([F(1, 3), P(40), D('0.25')]), t).join(' ');
    expect(s).toContain('1/3 is about 0.333');
    expect(s).toContain('40% = 0.4');
    expect(s).toContain('0.25 < 1/3 < 40%');
  });
});

describe('ruler measurement', () => {
  it('generates readable lengths: on a tick, never an exact midpoint, rounded the right way', () => {
    for (let i = 0; i < 3000; i++) {
      for (const band of ['b23', 'b45', 'b6']) {
        const it = B.genMeasure(band);
        expect(it.rd).toBe(band === 'b23' ? 4 : 8);
        expect(it.end).toBeLessThanOrEqual(6);
        expect(it.len).toBeGreaterThanOrEqual(1);
        expect(near(it.len * it.rd, Math.round(it.len * it.rd))).toBe(true);
        const scaled = it.len * it.prec;
        expect(Math.abs(scaled - Math.floor(scaled) - 0.5) > 1e-9).toBe(true);
        expect(near(it.target, Math.round(scaled) / it.prec)).toBe(true);
        expect(Math.abs(it.target - it.len)).toBeLessThan(0.5 / it.prec + 1e-9);
        if (band === 'b23') expect(it.start).toBe(0);
      }
      expect(B.genMeasure('b45', Math.random, 8).prec).toBe(8);
      expect(B.genMeasure('b23', Math.random, 8).prec).toBe(4);   // a quarter-inch ruler cannot read eighths
    }
  });
  const item = (o) => Object.assign({ kind: 'measure', rd: 8, prec: 8, start: 0, thing: 'pencil' }, o);
  it('accepts every equivalent written form', () => {
    const it = item({ len: 2.75, end: 2.75, target: 2.75 });
    for (const s of ['2 3/4', '2.75', '11/4', '2 6/8', '2 3/4 in', '2 3/4 inches', ' 2 3/4"']) expect(B.gradeMeasure(it, s).ok, s).toBe(true);
    expect(B.gradeMeasure(it, 'two').valid).toBe(false);
  });
  it('names the measuring slips', () => {
    expect(B.gradeMeasure(item({ start: 1, len: 2.25, end: 3.25, target: 2.25 }), '3 1/4').mis).toBe('ms_read_end');
    expect(B.gradeMeasure(item({ prec: 2, len: 2.375, end: 2.375, target: 2.5 }), '2 3/8').mis).toBe('ms_not_rounded');
    expect(B.gradeMeasure(item({ prec: 2, len: 2.375, end: 2.375, target: 2.5 }), '2').mis).toBe('ms_round_far');
    expect(B.gradeMeasure(item({ len: 3.375, end: 3.375, target: 3.375 }), '3.3').mis).toBe('ms_tenths');
    expect(B.gradeMeasure(item({ prec: 4, len: 3.25, end: 3.25, target: 3.25 }), '3 2/4').mis).toBe('ms_space_size');
    expect(B.gradeMeasure(item({ len: 3.375, end: 3.375, target: 3.375 }), '3 1/2').mis).toBe('one_space_off');
  });
  it('describes the ends in ruler spaces, never the length', () => {
    const it = item({ start: 1, len: 2.25, end: 3.25, target: 2.25 });
    const d = B.msDescribe(it, t);
    expect(d).toContain('left end lines up with the 1-inch mark');
    expect(d).toContain('the tick 2 eighth-inch spaces past the 3-inch mark');
    expect(d).not.toMatch(/2 1\/4|2\.25/);
    expect(B.msSteps(it, t).join(' ')).toContain('3 1/4 − 1 = 2 1/4 inches');
  });
});

describe('line plots', () => {
  it('data, counts and the question answers agree when recomputed from the raw data', () => {
    for (let i = 0; i < 800; i++) {
      for (const band of ['b23', 'b45', 'b6']) {
        const it = B.genLinePlot(band);
        expect(it.data.length).toBe(it.counts.reduce((a, b) => a + b, 0));
        const max = Math.max(...it.counts);
        expect(it.counts.filter((c) => c === max)).toHaveLength(1);       // one clear mode
        for (const v of it.data) expect(near(v * it.prec, Math.round(v * it.prec))).toBe(true);
        for (const q of it.questions) {
          const d = it.data;
          if (q.id === 'mode') expect(d.filter((v) => near(v, q.answer)).length).toBe(max);
          if (q.id === 'gt') expect(q.answer).toBe(d.filter((v) => v > q.v + 1e-9).length);
          if (q.id === 'at') expect(q.answer).toBe(d.filter((v) => near(v, q.v)).length);
          if (q.id === 'range') expect(near(q.answer, Math.max(...d) - Math.min(...d))).toBe(true);
          if (q.id === 'total') expect(near(q.answer, d.filter((v) => near(v, q.v)).reduce((a, b) => a + b, 0))).toBe(true);
        }
      }
    }
  });
  it('grades the plot and names the slip', () => {
    const it = B.genLinePlot('b45');
    expect(B.gradePlot(it, it.counts.slice()).ok).toBe(true);
    const shifted = [0].concat(it.counts.slice(0, -1));
    if (it.counts[it.counts.length - 1] === 0) expect(B.gradePlot(it, shifted).mis).toBe('lp_shifted');
    const fewer = it.counts.slice(); const c = fewer.findIndex((n) => n > 0); fewer[c] -= 1;
    expect(B.gradePlot(it, fewer).mis).toBe('lp_too_few');
    expect(B.gradePlot(it, fewer).cols).toEqual([c]);
    expect(B.gradePlot(it, it.counts.map(() => 0)).valid).toBe(false);
  });
  it('names the slips in answers read from the plot', () => {
    expect(B.gradeLpQuestion({ id: 'mode', answer: 2.25, count: 4 }, '4').mis).toBe('lp_mode_count');
    expect(B.gradeLpQuestion({ id: 'gt', v: 2.5, answer: 3, inclusive: 5, below: 6 }, '5').mis).toBe('lp_count_inclusive');
    expect(B.gradeLpQuestion({ id: 'range', answer: 0.75, max: 2.875, min: 2.125 }, '5').mis).toBe('lp_range_added');
    expect(B.gradeLpQuestion({ id: 'total', v: 2.25, answer: 9, count: 4 }, '4').mis).toBe('lp_total_count');
    expect(B.gradeLpQuestion({ id: 'total', v: 2.25, answer: 9, count: 4 }, '9').ok).toBe(true);
  });
});

describe('integers in context', () => {
  it('generated items sit on the scale and the answer key is right', () => {
    for (let i = 0; i < 2500; i++) {
      const it = B.genIc('b6');
      const ln = it.line;
      const onGrid = (v) => near(v / ln.step, Math.round(v / ln.step)) && v > ln.min && v < ln.max;
      if (it.kind === 'icPlace') expect(onGrid(it.target)).toBe(true);
      if (it.kind === 'icChange') { expect(onGrid(it.start) && onGrid(it.target)).toBe(true); expect(it.target).toBe(it.up ? it.start + it.delta : it.start - it.delta); }
      if (it.kind === 'icCompare') {
        expect(it.a < 0 || it.b < 0).toBe(true);
        const want = it.ask === 'higher' ? Math.max(it.a, it.b) : Math.min(it.a, it.b);
        expect([it.a, it.b][it.answerIdx]).toBe(want);
      }
      if (it.kind === 'icDebt') { expect(it.a < 0 && it.b < 0).toBe(true); expect([it.a, it.b][it.answerIdx]).toBe(Math.min(it.a, it.b)); expect(it.ctx).toBe('money'); }
      if (it.kind === 'icDistance') { expect(it.a < 0 && it.b > 0).toBe(true); expect(it.target).toBe(it.b - it.a); }
    }
    for (let i = 0; i < 300; i++) { const it = B.genIc('b23'); expect(['icPlace', 'icCompare']).toContain(it.kind); expect(it.ctx).toBe('temp'); }
  });
  it('names the integer slips', () => {
    const cmp = { kind: 'icCompare', ctx: 'temp', unit: 'F', a: -8, b: -3, ask: 'lower', answerIdx: 0, answer: 'choice', line: B.IC_LINES.temp };
    expect(B.gradeIc(cmp, { choice: 1 }).mis).toBe('negative_magnitude');
    expect(B.gradeIc(Object.assign({}, cmp, { b: 3 }), { choice: 1 }).mis).toBe('ic_sign_compare');
    const debt = { kind: 'icDebt', ctx: 'money', a: -30, b: -10, ask: 'debt', answerIdx: 0, answer: 'choice', names: ['Ana', 'Ben'], line: B.IC_LINES.money };
    expect(B.gradeIc(debt, { choice: 1 }).mis).toBe('ic_debt_balance');
    expect(B.icSentence(debt, t)).toContain('Ana owes $30 and Ben owes $10. Ana owes more, even though −30 < −10');
    const chg = { kind: 'icChange', ctx: 'temp', start: -4, delta: 9, up: true, target: 5, answer: 'position', line: B.IC_LINES.temp };
    expect(B.gradeIc(chg, { pos: -13 }).mis).toBe('ic_change_direction');
    expect(B.gradeIc(chg, { pos: 9 }).mis).toBe('started_at_zero');
    expect(B.gradeIc(chg, { pos: -5 }).mis).toBe('ic_wrong_side');
    expect(B.gradeIc(chg, { pos: 5 }).ok).toBe(true);
    const dist = { kind: 'icDistance', ctx: 'money', a: -15, b: 25, target: 40, answer: 'number', line: B.IC_LINES.money };
    expect(B.gradeIc(dist, { text: '10' }).mis).toBe('distance_subtracted_sizes');
    expect(B.gradeIc(dist, { text: '-40' }).mis).toBe('abs_kept_sign');
    expect(B.gradeIc(dist, { text: '$40' }).ok).toBe(true);
    expect(B.gradeIc(dist, { text: '40 dollars' }).ok).toBe(true);
  });
  it('a vertical line is described as "above", a horizontal one as "right of"', () => {
    expect(B.icSpot(B.IC_LINES.temp, -7, true, t)).toBe('Your marker is on the tick 3 spaces above the labelled tick −10.');
    expect(B.icSpot(B.IC_LINES.temp, -7, false, t)).toBe('Your marker is on the tick 3 spaces right of the labelled tick −10.');
    expect(B.icSpot(B.IC_LINES.temp, null, true, t)).toMatch(/^No marker placed yet/);
  });
});

describe('CER: is a fraction with a bigger denominator always smaller?', () => {
  const R = (a, b) => ({ a, b });
  const same = [R([1, 3], [1, 5]), R([2, 5], [2, 7])], counter = R([3, 4], [1, 2]);
  it('rows: counterexamples and same-numerator tests are recognised', () => {
    expect(B.cerRow([3, 4], [1, 2]).counter).toBe(true);
    expect(B.cerRow([2, 4], [1, 2]).counter).toBe(true);           // equal is not smaller
    expect(B.cerRow([1, 3], [1, 5]).counter).toBe(false);
    expect(B.cerRow([1, 3], [1, 5]).sameNum).toBe(true);
    expect(B.cerRow([1, 4], [3, 4]).tests).toBe(false);
  });
  it('only the evidence-backed claim with a real counterexample and the right reason passes', () => {
    const rows = same.concat([counter]);
    expect(B.cerEvaluate({ rows: same, claim: 'sameNum' }).code).toBe('cer_need_tests');
    expect(B.cerEvaluate({ rows, claim: 'always' })).toEqual({ ok: false, code: 'cer_ignores_counter', row: 2 });
    expect(B.cerEvaluate({ rows, claim: 'never' })).toEqual({ ok: false, code: 'cer_ignores_support', row: 0 });
    expect(B.cerEvaluate({ rows: same.concat([R([1, 6], [1, 9])]), claim: 'sameNum' }).code).toBe('cer_try_numerators');
    expect(B.cerEvaluate({ rows: [counter, R([3, 5], [1, 2]), R([5, 6], [1, 3])], claim: 'sameNum', cite: 0, reason: 'pieces' }).code).toBe('cer_try_same_num');
    expect(B.cerEvaluate({ rows, claim: 'sameNum', cite: 0, reason: 'pieces' }).code).toBe('cer_cite_counter');
    expect(B.cerEvaluate({ rows, claim: 'sameNum', cite: 2, reason: 'bigger_numbers' }).code).toBe('whole_number_bias');
    expect(B.cerEvaluate({ rows, claim: 'sameNum', cite: 2, reason: 'den_only' }).code).toBe('cer_reason_den');
    expect(B.cerEvaluate({ rows, claim: 'sameNum', cite: 2, reason: 'pieces' })).toEqual({ ok: true });
  });
  it('every named code has a title and body in English', () => {
    const codes = ['longer_is_bigger', 'shorter_is_bigger', 'dz_not_equal', 'dz_compare_digits', 'dz_zero_dropped', 'dz_stopped_early', 'dz_off_tenths', 'dz_off_hundredths', 'dz_off_thousandths',
      'ord_same_spot', 'ord_negative', 'ord_percent_whole', 'ord_percent_convert', 'ord_swap', 'ms_read_end', 'ms_not_rounded', 'ms_tenths', 'ms_space_size', 'ms_round_far',
      'lp_too_few', 'lp_too_many', 'lp_misplaced', 'lp_shifted', 'lp_mode_count', 'lp_count_inclusive', 'lp_count_wrong_side', 'lp_range_added', 'lp_range_one_end', 'lp_total_count', 'lp_total_one',
      'negative_magnitude', 'ic_sign_compare', 'ic_debt_balance', 'ic_wrong_side', 'ic_change_direction', 'cer_reason_den', 'cer_need_reason', 'cer_need_tests', 'cer_ignores_counter', 'cer_ignores_support',
      'cer_try_numerators', 'cer_try_same_num', 'cer_cite_counter', 'cer_need_claim', 'place_value_shift', 'denominator_bigger', 'whole_number_bias', 'sign_ignored', 'one_space_off', 'started_at_zero', 'abs_kept_sign', 'distance_subtracted_sizes'];
    for (const c of codes) {
      const info = B.misInfo(c, { kind: 'icChange', start: -4, target: 5, cer: c === 'whole_number_bias' }, t, { x: 'A', y: 'B', row: 0 });
      expect(info && info.title && info.body, c).toBeTruthy();
      expect(info.body).not.toMatch(/\{\w+\}/);
    }
    expect(B.misInfo('started_at_zero', { kind: 'icChange', start: -4, target: 5 }, t).body).toMatch(/[−-]4/);
  });
});
