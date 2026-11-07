import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup, teardown, M } from './dataplot_deep_helpers.js';

// Data Plot stage B (2026-11-03): the math behind best fit by eye, residual-plot checks,
// two-way tables, sampling distributions and the data project. Expected values are computed
// here independently of the tool.
beforeEach(() => setup());
afterEach(async () => { await teardown(); });

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a, sample) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - (sample ? 1 : 0))); };
function ls(pts) {
  const n = pts.length, sx = pts.reduce((s, p) => s + p.x, 0), sy = pts.reduce((s, p) => s + p.y, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0), sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { m, b: (sy - m * sx) / n };
}
const ssr = (pts, m, b) => pts.reduce((s, p) => s + (p.y - (m * p.x + b)) ** 2, 0);

describe('line of best fit by eye', () => {
  const line10 = Array.from({ length: 10 }, (_, i) => ({ x: i + 1, y: i + 1 + (i % 2 ? 0.6 : -0.6) }));
  it('the least-squares line scores ratio 1 and every other line scores more', () => {
    const m = M(), L = ls(line10), ev = m.evalLineFit(line10, L);
    expect(ev.ls.m).toBeCloseTo(L.m, 10); expect(ev.ls.b).toBeCloseTo(L.b, 10);
    expect(ev.ssrLs).toBeCloseTo(ssr(line10, L.m, L.b), 10);
    expect(ev.ratio).toBeCloseTo(1, 10); expect(ev.mis).toBe('');
    for (const d of [[0.05, 0], [0, 0.3], [-0.1, 0.5]]) {
      const e2 = m.evalLineFit(line10, { m: L.m + d[0], b: L.b + d[1] });
      expect(e2.ratio).toBeGreaterThan(1);
      expect(e2.ssrUser).toBeCloseTo(ssr(line10, L.m + d[0], L.b + d[1]), 10);
    }
  });
  it('names "half above, half below is enough" for a balanced but badly tilted line', () => {
    const ev = M().evalLineFit(line10, { m: 0.2, b: 5.5 - 0.2 * 5.5 });
    expect(ev.above).toBe(5); expect(ev.below).toBe(5);
    expect(ev.ratio).toBeGreaterThan(1.3);
    expect(ev.mis).toBe('halfHalf');
  });
  it('names a shifted line, a reversed direction, and too steep / too flat', () => {
    const m = M(), L = ls(line10);
    const up = m.evalLineFit(line10, { m: L.m, b: L.b + 4 });
    expect(up.mis).toBe('shifted'); expect(up.meanRes).toBeLessThan(0);
    expect(m.evalLineFit(line10, { m: -1, b: 11 }).mis).toBe('direction');
    // Pivot about the first point so the line is unbalanced (all points on one side).
    expect(m.evalLineFit(line10, { m: 2.5, b: 0.4 - 2.5 }).mis).toBe('tooSteep');
    expect(m.evalLineFit(line10, { m: 0.3, b: 12 - 0.3 * 10 }).mis).toBe('tooFlat');
  });
  it('every trap set: the line through its four collinear points is flagged "through the most points"', () => {
    const m = M(); let traps = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const lv of ['68', '912']) {
        const set = m.genFitSet(seed, lv);
        expect(set.pts.length).toBeGreaterThanOrEqual(lv === '68' ? 9 : 10);
        set.pts.forEach((p) => { expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); });
        if (!set.trap) continue;
        traps++;
        const a = set.pts[0], b = set.pts[3], slope = (b.y - a.y) / (b.x - a.x);
        const ev = m.evalLineFit(set.pts, { m: slope, b: a.y - slope * a.x });
        expect(ev.hitsUser, 'seed ' + seed).toBeGreaterThanOrEqual(3);
        expect(ev.mis, 'seed ' + seed + ' ratio ' + ev.ratio).toBe('mostPoints');
      }
    }
    expect(traps).toBeGreaterThan(150);
  });
  it('generated sets are reproducible from their seed and differ between seeds', () => {
    const m = M();
    expect(m.genFitSet(7, '68')).toEqual(m.genFitSet(7, '68'));
    expect(m.genFitSet(7, '68').pts).not.toEqual(m.genFitSet(8, '68').pts);
    expect(m.lineFromHandles(1, 2, 3, 6)).toEqual({ m: 2, b: 0 });
  });
});

describe('residual plots: is a linear model appropriate?', () => {
  it('each generated set really shows the pattern it was built with, checked by hand', () => {
    const m = M(), kinds = { random: 0, curve: 0, fan: 0 }, curveR2 = [];
    for (let seed = 1; seed <= 150; seed++) {
      const set = m.genResidSet(seed);
      kinds[set.kind]++;
      expect(m.residualPattern(set.pts).kind).toBe(set.kind);
      const L = ls(set.pts), sorted = set.pts.slice().sort((a, b) => a.x - b.x), res = sorted.map((p) => p.y - (L.m * p.x + L.b));
      const k = Math.floor(res.length / 3), left = res.slice(0, k), mid = res.slice(k, res.length - k), right = res.slice(res.length - k);
      if (set.kind === 'curve') {
        curveR2.push(m.residualPattern(set.pts).r2);
        // The middle third sits on the other side of zero from both ends.
        expect(Math.sign(mean(mid))).not.toBe(Math.sign(mean(left)));
        expect(Math.sign(mean(mid))).not.toBe(Math.sign(mean(right)));
      }
      if (set.kind === 'fan') expect(mean(right.map(Math.abs))).toBeGreaterThan(1.5 * mean(left.map(Math.abs)));
      expect(m.residAnswerFor(set.kind)).toBe(set.kind === 'random' ? 'yes' : set.kind);
    }
    expect(kinds.random).toBeGreaterThan(20); expect(kinds.curve).toBeGreaterThan(20); expect(kinds.fan).toBeGreaterThan(20);
    // The trap: curved data still give a high R² for the line.
    expect(mean(curveR2)).toBeGreaterThan(0.85);
  });
  it('a perfect parabola reads as a curve and points on a line read as random', () => {
    const m = M();
    expect(m.residualPattern(Array.from({ length: 12 }, (_, i) => ({ x: i, y: i * i }))).kind).toBe('curve');
    expect(m.residualPattern(Array.from({ length: 12 }, (_, i) => ({ x: i, y: 2 * i + [0.3, -0.2, 0.1, -0.4, 0.2, 0][i % 6] }))).kind).not.toBe('curve');
    expect(m.residualPattern([{ x: 1, y: 1 }, { x: 2, y: 2 }]).kind).toBe('unknown');
  });
});

describe('two-way tables', () => {
  it('counts, totals, row and column percents', () => {
    const m = M();
    const recs = [[0, 0], [0, 0], [0, 0], [0, 1], [1, 0], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]];
    const tb = m.twoWayFrom(recs, ['A', 'B'], ['yes', 'no']);
    expect(tb.counts).toEqual([[3, 1], [1, 5]]); expect(tb.rowTot).toEqual([4, 6]); expect(tb.colTot).toEqual([4, 6]); expect(tb.total).toBe(10);
    const st = m.twoWayStats(tb);
    expect(st.rowPct[0][0]).toBeCloseTo(0.75, 12); expect(st.rowPct[1][0]).toBeCloseTo(1 / 6, 12);
    expect(st.colPct[0][0]).toBeCloseTo(0.75, 12); expect(st.colPct[1][1]).toBeCloseTo(5 / 6, 12);
    st.rowPct.forEach((row) => expect(row[0] + row[1]).toBeCloseTo(1, 12));
    expect(st.gap).toBeCloseTo(0.75 - 1 / 6, 12); expect(st.verdict).toBe('yes');
    expect(m.twoWayStats(m.twoWayFrom([[0, 0], [0, 1], [1, 0], [1, 1]], ['a', 'b'], ['x', 'y'])).verdict).toBe('no');
  });
  it('generated surveys: unequal groups, records match the counts, and the verdict matches the design', () => {
    const m = M(); let traps = 0, yes = 0, no = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const g = m.genTwoWay(seed), tb = m.twoWayFrom(g.records, ['0', '1'], ['0', '1']);
      expect(tb.counts).toEqual(g.counts);
      const n0 = g.counts[0][0] + g.counts[0][1], n1 = g.counts[1][0] + g.counts[1][1];
      expect(Math.abs(n0 - n1)).toBeGreaterThanOrEqual(2);
      const p0 = g.counts[0][0] / n0, p1 = g.counts[1][0] / n1;
      if (g.assoc) { yes++; expect(Math.abs(p0 - p1)).toBeGreaterThanOrEqual(0.2); } else { no++; expect(Math.abs(p0 - p1)).toBeLessThanOrEqual(0.08 + 1e-9); }
      expect(m.twoWayStats(tb).verdict).toBe(g.assoc ? 'yes' : 'no');
      const big = n0 > n1 ? 0 : 1;
      if (!g.assoc && g.counts[big][0] > g.counts[1 - big][0]) traps++;
    }
    expect(yes).toBeGreaterThan(60); expect(no).toBeGreaterThan(60); expect(traps).toBeGreaterThan(30);
  });
  it('parses "A, B" category lines and refuses tables that are too big or too small', () => {
    const m = M();
    const ok = m.parseCategoryPairs('7, yes\n8, no\n7; no\n8\tyes\nnonsense\n');
    expect(ok.ok).toBe(true); expect(ok.rows).toEqual(['7', '8']); expect(ok.cols).toEqual(['yes', 'no']); expect(ok.records).toEqual([[0, 0], [1, 1], [0, 1], [1, 0]]); expect(ok.skipped).toEqual([5]);
    expect(m.parseCategoryPairs('a,1\nb,1\nc,1\nd,1\ne,2').why).toBe('tooMany');
    expect(m.parseCategoryPairs('a,1\nb,2').why).toBe('tooFew');
  });
});

describe('sampling distributions', () => {
  it('populations are fixed, samples are drawn without replacement and are reproducible', () => {
    const m = M();
    for (const id of m.SAMPLING_POPS) {
      const pop = m.genPopulation(id);
      expect(pop).toHaveLength(400); expect(pop).toEqual(m.genPopulation(id));
      const s = m.sampleAt(pop, 50, 3, 9);
      expect(s).toEqual(m.sampleAt(pop, 50, 3, 9)); expect(s).not.toEqual(m.sampleAt(pop, 50, 4, 9));
      // No value is used more often than the population holds it.
      const cnt = (arr) => arr.reduce((o, v) => { o[v] = (o[v] || 0) + 1; return o; }, {});
      const cp = cnt(pop), cs = cnt(s);
      Object.keys(cs).forEach((k) => expect(cs[k]).toBeLessThanOrEqual(cp[k]));
      expect(m.sampleAt(pop, 400, 0, 1).slice().sort((a, b) => a - b)).toEqual(pop.slice().sort((a, b) => a - b));
    }
  });
  it('bigger samples: same centre, smaller spread (about 1/sqrt(n))', () => {
    const m = M(), pop = m.genPopulation('commute'), mu = mean(pop), sigma = sd(pop);
    const a = m.sampleMeans(pop, 5, 300, 1), b = m.sampleMeans(pop, 50, 300, 1);
    expect(a).toHaveLength(300);
    a.slice(0, 5).forEach((v, k) => expect(v).toBeCloseTo(mean(m.sampleAt(pop, 5, k, 1)), 12));
    expect(Math.abs(mean(a) - mu)).toBeLessThan(4 * sigma / Math.sqrt(5) / Math.sqrt(300));
    expect(Math.abs(mean(b) - mu)).toBeLessThan(4 * sigma / Math.sqrt(50) / Math.sqrt(300));
    const ratio = sd(a, true) / sd(b, true);
    expect(ratio).toBeGreaterThan(2.4); expect(ratio).toBeLessThan(4.6); // theory: sqrt(10) = 3.16, a bit more without replacement
  });
  it('middle 90% by nearest rank', () => {
    const v = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(M().middle90(v)).toEqual({ lo: 1, hi: 19 });
    expect(M().middle90(Array.from({ length: 100 }, (_, i) => i))).toEqual({ lo: 4, hi: 94 });
  });
});

describe('data project helpers', () => {
  it('parses values by kind and checks the parts of a CER write-up', () => {
    const m = M();
    expect(m.parseProjectValue('numeric', '2,5')).toEqual({ ok: true, v: 2.5 });
    expect(m.parseProjectValue('numeric', 'abc').ok).toBe(false);
    expect(m.parseProjectValue('category', '  Apple ')).toEqual({ ok: true, v: 'Apple' });
    expect(m.parseProjectValue('pairs', '3', '4')).toEqual({ ok: true, v: [3, 4] });
    expect(m.parseProjectValue('pairs', '3', '').ok).toBe(false);
    expect(m.cerChecks({})).toEqual(['claim', 'evidence', 'reasoning']);
    expect(m.cerChecks({ claim: 'Most of us like apples.', evidence: 'Apples got the most votes.', reasoning: 'This shows apples are the favourite because they won.' })).toEqual(['evidence']);
    expect(m.cerChecks({ claim: 'Most of us like apples.', evidence: '9 of 20 chose apples.', reasoning: 'This shows apples are the favourite because they won.' })).toEqual([]);
    expect(m.STAT_Q_ITEMS.map((q) => q.answer).sort()).toEqual(['no', 'no', 'yes', 'yes']);
  });
});
