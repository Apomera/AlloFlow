// Angle Explorer stage B (2026-11-03): the new engine, run directly.
// Polygons (whole-degree convex polygons, diagonals, triangulation, claims,
// practice), tessellation, circle theorems, the unit circle, real contexts
// (clocks, bearings, slopes) and compass constructions. Answers are
// re-derived independently: from coordinates, Math.cos/sin/atan, or by hand.
// ANGLES_DEEP_SRC points at another copy (stage A has none of these: all fail).
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
let A;
beforeAll(() => { resetStemLab(); loadTool(SOURCE, 'protractor'); A = window.StemLab.anglesCore; });
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const norm = (a) => ((a % 360) + 360) % 360;
const between = (d1, d2) => { const x = Math.abs(norm(d1) - norm(d2)); return x > 180 ? 360 - x : x; };
const angAt = (P, Q, R) => between(Math.atan2(-(Q.y - P.y), Q.x - P.x) * 180 / Math.PI, Math.atan2(-(R.y - P.y), R.x - P.x) * 180 / Math.PI);
const ptOn = (cx, cy, r, deg) => ({ x: cx + r * Math.cos(deg * Math.PI / 180), y: cy - r * Math.sin(deg * Math.PI / 180) });
const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

describe('polygons: generated shapes are honest', () => {
  it('every generated polygon is convex, closes, fits the box, and its whole-degree angles match its coordinates', () => {
    for (let n = 3; n <= 12; n++) {
      for (let seed = 1; seed <= 40; seed++) {
        const s = A.makePolygon(rng(seed * 31 + n), n, 320, 240);
        expect(s.pts.length).toBe(n);
        const sum = s.interior.reduce((q, w) => q + w, 0);
        expect(sum, n + '/' + seed).toBe((n - 2) * 180);
        s.interior.forEach((a) => { expect(Number.isInteger(a)).toBe(true); expect(a).toBeGreaterThanOrEqual(30); expect(a).toBeLessThan(180); });
        for (let k = 0; k < n; k++) {
          const measured = angAt(s.pts[k], s.pts[(k + n - 1) % n], s.pts[(k + 1) % n]);
          expect(Math.abs(measured - s.interior[k]), 'vertex ' + k + ' of ' + n + '-gon seed ' + seed).toBeLessThan(1e-6);
          // Convex: every turn has the same sign.
          const c = cross(s.pts[k], s.pts[(k + 1) % n], s.pts[(k + 2) % n]);
          const c0 = cross(s.pts[0], s.pts[1], s.pts[2]);
          expect(Math.sign(c)).toBe(Math.sign(c0));
        }
        s.pts.forEach((p) => { expect(p.x).toBeGreaterThan(20); expect(p.x).toBeLessThan(300); expect(p.y).toBeGreaterThan(20); expect(p.y).toBeLessThan(220); });
      }
    }
  });
  it('regular polygons have equal sides and the regular angle', () => {
    for (const n of [3, 5, 6, 8, 12]) {
      const s = A.makePolygon(rng(1), n, 320, 240, true);
      const sides = s.pts.map((p, i) => Math.hypot(p.x - s.pts[(i + 1) % n].x, p.y - s.pts[(i + 1) % n].y));
      sides.forEach((L) => expect(Math.abs(L - sides[0])).toBeLessThan(1e-6));
      expect(A.regInterior(n)).toBeCloseTo((n - 2) * 180 / n, 9);
      expect(A.regExterior(n) + A.regInterior(n)).toBeCloseTo(180, 9);
    }
  });
});

describe('polygons: diagonals and triangulation', () => {
  it('rejects sides, repeats and crossing diagonals; any complete set makes n - 2 triangles', () => {
    expect(A.addDiagonal(5, [], 0, 1).code).toBe('side');
    expect(A.addDiagonal(5, [], 0, 4).code).toBe('side');
    expect(A.addDiagonal(5, [], 2, 2).code).toBe('same');
    const one = A.addDiagonal(6, [], 0, 3);
    expect(one.code).toBe('ok');
    expect(A.addDiagonal(6, one.diags, 3, 0).code).toBe('dup');
    expect(A.addDiagonal(6, one.diags, 1, 4).code).toBe('cross');
    expect(A.addDiagonal(6, one.diags, 1, 3).code).toBe('ok');
    // Random legal triangulations, not just fans, always give n - 2 triangles.
    for (let n = 3; n <= 10; n++) {
      for (let seed = 0; seed < 25; seed++) {
        const r = rng(seed + n * 100);
        let diags = [];
        let guard = 0;
        while (!A.triangulated(n, diags) && guard++ < 2000) {
          const i = Math.floor(r() * n), j = Math.floor(r() * n);
          const res = A.addDiagonal(n, diags, i, j);
          if (res.code === 'ok') diags = res.diags;
        }
        expect(diags.length, n + '-gon').toBe(Math.max(0, n - 3));
        const regs = A.polyRegions(n, diags);
        expect(regs.length).toBe(n - 2);
        regs.forEach((t) => expect(t.length).toBe(3));
        // Every polygon corner is covered by the triangles' corners exactly.
        const corners = regs.flat();
        for (let v = 0; v < n; v++) expect(corners.includes(v)).toBe(true);
      }
    }
  });
});

describe('polygons: the investigation grades rows, claims and practice', () => {
  it('names the row misconceptions', () => {
    expect(A.diagnosePolyRow(6, '4', '720').code).toBe('ok');
    expect(A.diagnosePolyRow(6, '6', '1080').code).toBe('tri_counted_sides');
    expect(A.diagnosePolyRow(6, '3', '540').code).toBe('tri_counted_diagonals');
    expect(A.diagnosePolyRow(6, '4', '1080').code).toBe('sum_n180');
    expect(A.diagnosePolyRow(5, '3', '360').code).toBe('sum_360');
    expect(A.diagnosePolyRow(5, '3', '520').code).toBe('sum_arith');
    expect(A.diagnosePolyRow(5, '', '540').code).toBe('nan');
  });
  it('only (n - 2) x 180 fits three or more rows; a breaking row is named', () => {
    const runs = { 3: { sum: 180 }, 4: { sum: 360 }, 6: { sum: 720 } };
    expect(A.claimCheck('c_n2', runs).fits).toBe(true);
    for (const id of ['c_n', 'c_360', 'c_n1_90']) expect(A.claimCheck(id, runs).fits, id).toBe(false);
    expect(A.claimCheck('c_360', runs)).toMatchObject({ breaks: 3, predicted: 360, measured: 180 });
    expect(A.claimCheck('c_n1_90', { 3: { sum: 180 } }).fits, '(n-1)x90 agrees at n = 3 only').toBe(true);
  });
  it('practice answers are right for every kind, and the named slips are caught', () => {
    for (const level of ['g4', 'g57', 'g8']) {
      for (const kind of A.PG_KINDS[level]) {
        for (let s = 0; s < 40; s++) {
          const p = A.makePolyTask(kind, rng(s * 7 + kind.length), level);
          const n = p.n;
          const want = kind === 'sum' ? (n - 2) * 180 : kind === 'sides' || kind === 'extn' ? n : kind === 'regular' ? (n - 2) * 180 / n : kind === 'ext' ? 360 / n
            : (n - 2) * 180 - p.angles.filter((_, i) => i !== p.which).reduce((q, w) => q + w, 0);
          expect(p.answer, JSON.stringify(p)).toBeCloseTo(want, 9);
          expect(A.diagnosePolyTask(p, String(p.answer)).code).toBe('ok');
          if (level === 'g4') expect(n).toBeLessThanOrEqual(6);
        }
      }
    }
    expect(A.diagnosePolyTask({ kind: 'sum', n: 7, answer: 900 }, '1260').code).toBe('n180');
    expect(A.diagnosePolyTask({ kind: 'sum', n: 7, answer: 900 }, '360').code).toBe('sum360');
    expect(A.diagnosePolyTask({ kind: 'sides', n: 9, s: 1260, answer: 9 }, '7').code).toBe('sides_forgot_2');
    expect(A.diagnosePolyTask({ kind: 'regular', n: 8, answer: 135 }, '1080').code).toBe('reg_gave_total');
    expect(A.diagnosePolyTask({ kind: 'regular', n: 8, answer: 135 }, '45').code).toBe('int_ext_swap');
    expect(A.diagnosePolyTask({ kind: 'ext', n: 10, answer: 36 }, '144').code).toBe('int_ext_swap');
    expect(A.diagnosePolyTask({ kind: 'extn', n: 12, e: 30, answer: 12 }, '6').code).toBe('extn_used_180');
    const miss = { kind: 'missing', n: 5, angles: [100, 110, 120, 90, 120], which: 4, answer: 120 };
    expect(A.diagnosePolyTask(miss, '-60').code).not.toBe('ok');
    expect(A.diagnosePolyTask(miss, String(360 - 420)).code).toBe('sum360');
    expect(A.diagnosePolyTask(miss, '420').code).toBe('gave_sum');
    expect(A.diagnosePolyTask(miss, String(900 - 420)).code).toBe('n180');
  });
});

describe('tessellation', () => {
  it('exactly the triangle, square and hexagon tile; gaps and overlaps are right', () => {
    const tiles = A.TILE_NS.filter((n) => A.tileFit(n).tiles);
    expect(tiles).toEqual([3, 4, 6]);
    const pent = A.tileFit(5);
    expect(pent.copies).toBe(3);
    expect(pent.gap).toBeCloseTo(36, 9);
    expect(pent.overlap).toBeCloseTo(72, 9);
    expect(A.tileFit(8).gap).toBeCloseTo(90, 9);
    expect(A.vertexFits([4, 8, 8])).toBe(true);
    expect(A.vertexFits([3, 12, 12])).toBe(true);
    expect(A.vertexFits([3, 3, 3, 4, 4])).toBe(true);
    expect(A.vertexFits([5, 5, 5])).toBe(false);
    expect(A.vertexFits([6, 6])).toBe(false);
  });
  it('a claim is broken by a tested row first, else by an untested polygon', () => {
    expect(A.tileClaimCheck('t_divides', { 3: 1, 5: 1 }).fits).toBe(true);
    expect(A.tileClaimCheck('t_even', { 3: 1, 4: 1 })).toMatchObject({ fits: false, breaks: 3, tested: true });
    expect(A.tileClaimCheck('t_even', { 4: 1, 6: 1 })).toMatchObject({ fits: false, breaks: 3, tested: false });
    expect(A.tileClaimCheck('t_lt7', { 3: 1, 4: 1, 6: 1, 8: 1 })).toMatchObject({ fits: false, breaks: 5, tested: false });
    expect(A.tileClaimCheck('t_all', { 5: 1 })).toMatchObject({ fits: false, breaks: 5, tested: true });
  });
});

describe('circle theorems: the numbers come from the geometry', () => {
  it('every inscribed-angle task: the angle measured at P equals the answer', () => {
    for (const level of ['g4', 'g57', 'g8']) {
      for (let s = 0; s < 120; s++) {
        const p = A.makeCircleTask('inscribed', rng(s + 900), level);
        const Ap = ptOn(180, 150, 115, p.a), Bp = ptOn(180, 150, 115, p.b), Pp = ptOn(180, 150, 115, p.p);
        const measured = angAt(Pp, Ap, Bp);
        const central = angAt({ x: 180, y: 150 }, Ap, Bp);
        expect(central, 'minor central').toBeCloseTo(p.m, 6);
        if (p.ask === 'insc') expect(measured).toBeCloseTo(p.answer, 6);
        if (p.ask === 'cent') { expect(measured).toBeCloseTo(p.given, 6); expect(p.answer).toBe(p.m); }
        if (p.ask === 'minor') { expect(measured, JSON.stringify(p)).toBeCloseTo(p.answer, 6); expect(p.answer).toBe(180 - p.m / 2); }
        expect(A.arcOpposite(p.a, p.b, p.p) / 2, 'half the far arc').toBeCloseTo(measured, 6);
        expect(A.diagnoseCircle(p, String(p.answer)).code).toBe('ok');
      }
    }
  });
  it('semicircle and cyclic tasks match measured angles', () => {
    for (let s = 0; s < 120; s++) {
      const p = A.makeCircleTask('semi', rng(s + 77), 'g57');
      const Ap = ptOn(180, 150, 115, p.a), Bp = ptOn(180, 150, 115, p.b), Pp = ptOn(180, 150, 115, p.p);
      expect(angAt(Pp, Ap, Bp)).toBeCloseTo(90, 6);
      expect(angAt(Ap, Pp, Bp)).toBeCloseTo(p.given, 6);
      expect(p.ask === 'apb' ? 90 : angAt(Bp, Pp, Ap)).toBeCloseTo(p.answer, 6);
      const q = A.makeCircleTask('cyclic', rng(s + 5), 'g8');
      const V = q.pos.map((d) => ptOn(180, 150, 115, d));
      const m = V.map((v, i) => angAt(v, V[(i + 3) % 4], V[(i + 1) % 4]));
      m.forEach((x, i) => expect(x, JSON.stringify(q)).toBeCloseTo(q.angles[i], 6));
      expect(m[0] + m[2]).toBeCloseTo(180, 6);
      expect(m[1] + m[3]).toBeCloseTo(180, 6);
      expect(q.gaps.every((g) => g >= 50)).toBe(true);
      expect(q.answer).toBeCloseTo(m[q.askIdx], 6);
    }
  });
  it('names the circle misconceptions', () => {
    const insc = { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50 };
    expect(A.diagnoseCircle(insc, '100').code).toBe('insc_equal_central');
    expect(A.diagnoseCircle(insc, '200').code).toBe('insc_double');
    expect(A.diagnoseCircle(insc, '130').code).toBe('insc_other_arc');
    expect(A.diagnoseCircle({ kind: 'inscribed', m: 100, ask: 'cent', given: 50, answer: 100 }, '25').code).toBe('cent_half');
    const semi = { kind: 'semi', ask: 'other', given: 35, answer: 55 };
    expect(A.diagnoseCircle(semi, '145').code).toBe('semi_no_right');
    expect(A.diagnoseCircle(semi, '35').code).toBe('semi_equal');
    expect(A.diagnoseCircle(semi, '90').code).toBe('semi_gave_90');
    const cyc = { kind: 'cyclic', given: 70, answer: 110 };
    expect(A.diagnoseCircle(cyc, '70').code).toBe('cyc_equal');
    expect(A.diagnoseCircle(cyc, '290').code).toBe('cyc_360');
    expect(A.diagnoseCircle(cyc, '20').code).toBe('cyc_90');
  });
});

describe('unit circle', () => {
  it('exact values match Math.cos and Math.sin at every special angle', () => {
    for (const d of A.SPECIAL_DEGS) {
      const e = A.trigExact(d);
      expect(e.cos, 'cos ' + d).not.toBe(null);
      expect(e.sin, 'sin ' + d).not.toBe(null);
      expect(A.exactVal(e.cos)).toBeCloseTo(Math.cos(d * Math.PI / 180), 9);
      expect(A.exactVal(e.sin)).toBeCloseTo(Math.sin(d * Math.PI / 180), 9);
    }
    expect(A.trigExact(20).cos).toBe(null);
  });
  it('reference angles and quadrants', () => {
    for (let d = 0; d < 360; d++) {
      const r = A.refAngle(d);
      expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(90);
      // Same |sin| and |cos| as the reference angle.
      expect(Math.abs(Math.sin(d * Math.PI / 180))).toBeCloseTo(Math.sin(r * Math.PI / 180), 9);
      expect(Math.abs(Math.cos(d * Math.PI / 180))).toBeCloseTo(Math.cos(r * Math.PI / 180), 9);
    }
    expect([A.quadrant(45), A.quadrant(135), A.quadrant(225), A.quadrant(315), A.quadrant(90)]).toEqual([1, 2, 3, 4, 0]);
  });
  it('generated tasks grade their own answers; named misconceptions for sign, swap, π = 180', () => {
    for (const kind of A.UNIT_KINDS.g8) {
      for (let s = 0; s < 60; s++) {
        const p = A.makeUnitTask(kind, rng(s * 13 + kind.length), 'g8');
        expect(A.diagnoseUnit(p, String(p.answer)).code, JSON.stringify(p)).toBe('ok');
        if (kind === 'radnum') expect(p.answer).toBeCloseTo(p.r * 180 / Math.PI, 1);
        if (kind === 'pinum') expect(p.answer).toBeCloseTo(p.k * Math.PI / p.den + p.c, 2);
      }
    }
    expect(A.diagnoseUnit({ kind: 'coord', deg: 150, fn: 'cos', answer: '-√3/2' }, '√3/2').code).toBe('sign_quadrant');
    expect(A.diagnoseUnit({ kind: 'coord', deg: 150, fn: 'cos', answer: '-√3/2' }, '1/2').code).toBe('swap_sin_cos');
    expect(A.diagnoseUnit({ kind: 'coord', deg: 150, fn: 'cos', answer: '-√3/2' }, 'nope').code).toBe('nan');
    expect(A.diagnoseUnit({ kind: 'ref', deg: 300, answer: 60 }, '-120').code).not.toBe('ok');
    expect(A.diagnoseUnit({ kind: 'ref', deg: 300, answer: 60 }, String(180 - 300)).code).toBe('ref_180_minus');
    expect(A.diagnoseUnit({ kind: 'ref', deg: 210, answer: 30 }, '210').code).toBe('ref_gave_theta');
    expect(A.diagnoseUnit({ kind: 'ref', deg: 210, answer: 30 }, '60').code).toBe('ref_from_y');
    expect(A.diagnoseUnit({ kind: 'pinum', k: 1, den: 2, c: 1, answer: 2.57 }, '91').code).toBe('pi_is_180_number');
    expect(A.diagnoseUnit({ kind: 'radnum', r: 2, answer: 114.6 }, '360').code).toBe('rad_times_180');
    expect(A.diagnoseUnit({ kind: 'radnum', r: 2, answer: 114.6 }, '0.0349').code).toBe('rad_wrong_way');
  });
});

describe('real contexts', () => {
  it('clock angles match a hand-by-hand computation', () => {
    for (let h = 1; h <= 12; h++) for (let m = 0; m < 60; m++) {
      const hour = (h % 12) * 30 + m / 2, minute = m * 6;
      let gap = Math.abs(hour - minute); if (gap > 180) gap = 360 - gap;
      expect(A.clockAngle(h, m)).toBeCloseTo(gap, 9);
    }
    expect(A.clockAngle(3, 0)).toBe(90);
    expect(A.clockAngle(4, 20)).toBe(10);
    expect(A.diagnoseCtx({ kind: 'clock', h: 4, m: 20, answer: 10 }, '0').code).toBe('clock_hour_static');
    expect(A.diagnoseCtx({ kind: 'clock', h: 2, m: 30, answer: 105 }, '255').code).toBe('clock_reflex');
  });
  it('bearings: points, back bearings, turns and N/S-E/W notation', () => {
    expect(A.COMPASS_PTS.map((c) => c[1])).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);
    expect([A.quadBearing('N', 40, 'E'), A.quadBearing('N', 40, 'W'), A.quadBearing('S', 30, 'E'), A.quadBearing('S', 30, 'W')]).toEqual([40, 320, 150, 210]);
    for (let s = 0; s < 200; s++) {
      const p = A.makeCtxTask('bearing', rng(s + 3), s % 2 ? 'g8' : 'g57');
      expect(A.diagnoseCtx(p, String(p.answer)).code).toBe('ok');
      expect(p.answer).toBeGreaterThanOrEqual(0); expect(p.answer).toBeLessThan(360);
      if (p.v === 'back') expect(norm(p.answer - p.b)).toBe(180);
    }
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'back', b: 250, answer: 70 }, '430').code).toBe('bearing_no_wrap');
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'back', b: 250, answer: 70 }, '070').code).toBe('ok');
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'turn', from: 300, to: 40, answer: 100 }, '260').code).toBe('turn_ccw');
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'quad', ns: 'S', x: 30, ew: 'W', answer: 210 }, '30').code).toBe('quad_gave_angle');
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'point', pt: 'NE', answer: 45 }, '315').code).toBe('bearing_ccw');
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'point', pt: 'SE', answer: 135 }, '225').code).toBe('bearing_ccw');
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'point', pt: 'SE', answer: 135 }, '315').code).toBe('bearing_from_east');
    expect(A.diagnoseCtx({ kind: 'bearing', v: 'point', pt: 'W', answer: 270 }, '180').code).toBe('bearing_from_east');
  });
  it('ramps and roofs: atan, tan, complements and the 1:12 rule', () => {
    for (let s = 0; s < 120; s++) {
      const p = A.makeCtxTask('pitch', rng(s + 11), ['g4', 'g57', 'g8'][s % 3]);
      expect(A.diagnoseCtx(p, p.answer).code, JSON.stringify(p)).toBe('ok');
      if (p.v === 'tan') expect(p.answer).toBeCloseTo(Math.atan(p.rise / 12) * 180 / Math.PI, 1);
      if (p.v === 'rise') expect(p.answer).toBeCloseTo(12 * Math.tan(p.a * Math.PI / 180), 1);
      if (p.v === 'ada') expect(p.answer).toBe(p.run >= 12 * p.rise ? 'yes' : 'no');
      if (p.v === 'vertical') expect(p.answer).toBe(90 - p.a);
    }
    expect(A.diagnoseCtx({ kind: 'pitch', v: 'tan', rise: 6, answer: 26.6 }, '63.4').code).toBe('pitch_complement');
    expect(A.diagnoseCtx({ kind: 'pitch', v: 'tan', rise: 6, answer: 26.6 }, '30').code).toBe('pitch_used_sin');
    expect(A.diagnoseCtx({ kind: 'pitch', v: 'tan', rise: 6, answer: 26.6 }, '50').code).toBe('pitch_percent');
    expect(A.diagnoseCtx({ kind: 'pitch', v: 'vertical', a: 35, answer: 55 }, '145').code).toBe('used_180');
    expect(A.diagnoseCtx({ kind: 'pitch', v: 'ada', rise: 6, run: 60, answer: 'no' }, 'yes').code).toBe('ada_wrong');
  });
});

describe('constructions', () => {
  const doBisect = (con, w1, w2) => {
    let c = A.conApply(con, { tool: 'compass', centre: 'B', r: 50 }).con;
    c = A.conApply(c, { tool: 'compass', centre: 'D', r: w1 }).con;
    const r3 = A.conApply(c, { tool: 'compass', centre: 'E', r: w2 });
    c = r3.con;
    return { c, code3: r3.code, line: A.conApply(c, { tool: 'line', from: 'B', through: 'F' }) };
  };
  it('a correct bisection measures two equal halves for any generated angle', () => {
    for (let s = 0; s < 60; s++) {
      const con = A.makeConstruction('bisect', rng(s + 1));
      expect(con.lenBA).toBeGreaterThan(54); expect(con.lenBC).toBeGreaterThan(54);
      const de = A.dist(...['D', 'E'].map((k) => A.conPoints(A.conApply(con, { tool: 'compass', centre: 'B', r: 50 }).con)[k]));
      const { line } = doBisect(con, de * 0.8, de * 0.8);
      expect(line.code).toBe('ok');
      const v = A.conVerify(line.con);
      expect(v.ok, JSON.stringify({ m: con.m, v })).toBe(true);
      expect(v.a1).toBeCloseTo(con.m / 2, 6);
    }
  });
  it('arcs of different widths give a ray that misses the bisector; tiny arcs miss', () => {
    const con = A.makeConstruction('bisect', rng(9));
    const de = A.dist(...['D', 'E'].map((k) => A.conPoints(A.conApply(con, { tool: 'compass', centre: 'B', r: 50 }).con)[k]));
    const bad = doBisect(con, de * 0.7, de * 1.0);
    const v = A.conVerify(bad.line.con);
    expect(v.ok).toBe(false);
    expect(v.widthChanged).toBe(true);
    expect(Math.abs(v.a1 - v.a2)).toBeGreaterThan(1);
    const tiny = doBisect(con, de * 0.3, de * 0.3);
    expect(tiny.code3).toBe('arcs_miss');
    expect(tiny.line.code).toBe('arcs_miss');
  });
  it('refuses useless steps with a named reason', () => {
    const con = A.makeConstruction('bisect', rng(4));
    expect(A.conApply(con, { tool: 'compass', centre: 'A', r: 50 }).code).toBe('first_at_vertex');
    expect(A.conApply(con, { tool: 'compass', centre: 'D', r: 50 }).code).toBe('no_point');
    expect(A.conApply(con, { tool: 'compass', centre: 'B', r: 5 }).code).toBe('arc_tiny');
    expect(A.conApply(con, { tool: 'compass', centre: 'B', r: 999 }).code).toBe('arc_off_rays');
    expect(A.conApply(con, { tool: 'line', from: 'B', through: 'A' }).code).toBe('line_too_soon');
    let c = A.conApply(con, { tool: 'compass', centre: 'B', r: 50 }).con;
    expect(A.conApply(c, { tool: 'compass', centre: 'B', r: 50 }).code).toBe('arc_from_DE');
    c = A.conApply(c, { tool: 'compass', centre: 'D', r: 60 }).con;
    expect(A.conApply(c, { tool: 'compass', centre: 'D', r: 60 }).code).toBe('other_point');
    c = A.conApply(c, { tool: 'compass', centre: 'E', r: 60 }).con;
    expect(A.conApply(c, { tool: 'line', from: 'D', through: 'F' }).code).toBe('line_not_vertex');
    expect(A.conApply(c, { tool: 'line', from: 'B', through: 'D' }).code).toBe('line_through_cross');
  });
  it('copying an angle: same width, then the chord DE, reproduces the angle; wrong widths do not', () => {
    for (let s = 0; s < 40; s++) {
      const con = A.makeConstruction('copy', rng(s + 50));
      let c = A.conApply(con, { tool: 'compass', centre: 'B', r: 45 }).con;
      const P1 = A.conPoints(c);
      const de = A.dist(P1.D, P1.E);
      expect(A.conApply(c, { tool: 'compass', centre: 'B', r: 45 }).code).toBe('copy_arc_at_P');
      c = A.conApply(c, { tool: 'compass', centre: 'P', r: 45 }).con;
      expect(A.conApply(c, { tool: 'compass', centre: 'P', r: de }).code).toBe('copy_arc_at_E2');
      const good = A.conApply(A.conApply(c, { tool: 'compass', centre: 'E2', r: de }).con, { tool: 'line', from: 'P', through: 'D2' });
      expect(good.code).toBe('ok');
      const v = A.conVerify(good.con);
      expect(v.ok, JSON.stringify({ m: con.m, v })).toBe(true);
      expect(v.copied).toBeCloseTo(con.m, 6);
      // The copy opens counterclockwise from the new ray, like the original.
      const D2 = A.conPoints(good.con).D2;
      expect(norm(Math.atan2(-(D2.y - con.P.y), D2.x - con.P.x) * 180 / Math.PI - con.q)).toBeCloseTo(con.m, 6);
      const off = A.conApply(A.conApply(c, { tool: 'compass', centre: 'E2', r: de * 1.25 }).con, { tool: 'line', from: 'P', through: 'D2' });
      const v2 = A.conVerify(off.con);
      expect(v2.ok).toBe(false);
      expect(v2.widthNotDE).toBe(true);
    }
  });
});
