import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(import.meta.url);
const TestUtils = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const act = TestUtils.act || React.act;

/**
 * Lane INSP: Inspector's Bench, NDT Method Chooser, Essential Variable Sorter,
 * WPS form and "find the clause". Every number the bench shows is computed
 * from the profiles the SVG draws, so these tests pin the GEOMETRY (expected
 * values live here, not in the tool) and the verdict table, including the
 * exact 1/32 in and 1/16 in boundaries.
 */

const F = (n) => n / 64; // inches from 64ths

beforeEach(() => {
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

const core = () => window.__WeldLabCore;
const item = (id) => core().INSP2_BENCH.find((b) => b.id === id);
const render = (state) => renderTool('weldLab', { weldLab: state });

describe('Inspector\'s Bench gauge readings come from the drawn geometry', () => {
  // [id, critical value, where it starts, spot readings {x: value}]
  const EXPECT = [
    ['uc1', F(4), 6, { 0: 0, 2: F(2), 5: 0, 6.5: F(4), 7.375: F(4), 7.5: 0, 10: F(2), 12: 0 }],
    ['us1', F(12), 4, { 0: F(16), 4.5: F(12), 5: F(16), 12: F(16) }],
    ['uc2', F(4), 0.5, { 1: F(4), 2: 0, 3.5: F(2), 8: F(4), 8.5: 0 }],
    ['rf', F(8), 4, { 0: F(6), 3.875: F(6), 5: F(8), 7: F(6), 12: F(6) }],
    ['us2', F(8), 5, { 4.875: F(16), 5.5: F(8), 6: F(16) }],
    ['cvx', F(10), 3, { 1: F(4), 4: F(10), 6: F(4) }],
    ['crat', F(12), 11.5, { 11: F(16), 11.75: F(12), 12: F(12) }],
  ];
  EXPECT.forEach(([id, crit, at, spots]) => {
    it('reads ' + id + ' where the drawing puts it', () => {
      const it_ = item(id);
      const c = core().insp2Critical(it_);
      expect(c.v).toBe(crit);
      expect(c.at).toBe(at);
      Object.keys(spots).forEach((x) => {
        expect(core().insp2Reading(it_, Number(x)), id + ' @ ' + x).toBe(spots[x]);
      });
    });
  });

  it('adds pore diameters inside the 1 in window and keeps a running total', () => {
    const por = item('por');
    const { insp2Reading, insp2PoreRunning, insp2Critical } = core();
    expect(insp2Reading(por, 1.25)).toBe(F(14));   // 1/16 + 1/16 + 3/32
    expect(insp2Reading(por, 6.5)).toBe(0);        // the 1/64 pore is under 1/32: not counted
    expect(insp2Reading(por, 8)).toBe(F(18));
    expect(insp2PoreRunning(por, 0)).toBe(0);
    expect(insp2PoreRunning(por, 11)).toBe(F(56)); // 7/8 in over the whole 12 in
    const c = insp2Critical(por);
    expect(c.v).toBe(F(18));
    expect(c.total).toBe(F(56));
  });

  it('formats readings as gauge fractions', () => {
    const { insp2Frac } = core();
    expect(insp2Frac(F(2))).toBe('1/32"');
    expect(insp2Frac(F(6))).toBe('3/32"');
    expect(insp2Frac(0.25)).toBe('1/4"');
    expect(insp2Frac(6.5)).toBe('6-1/2"');
    expect(insp2Frac(12)).toBe('12"');
    expect(insp2Frac(0)).toBe('0"');
  });

  it('credits a recorded reading only when it is the critical one', () => {
    const { insp2RecHit } = core();
    expect(insp2RecHit(item('uc1'), [2])).toBe(false);
    expect(insp2RecHit(item('uc1'), [2, 6.5])).toBe(true);
    expect(insp2RecHit(item('us1'), [4.25])).toBe(true);
    expect(insp2RecHit(item('por'), [1.25])).toBe(false);
    expect(insp2RecHit(item('por'), [11])).toBe(true);   // running total reached 7/8
  });

  it('draws the reading it reports (section label and readout agree at the start position)', () => {
    core().INSP2_BENCH.forEach((b, i) => {
      const html = render({ view: 'inspection', insp_sect: 'bench', insp2_benchIdx: i });
      const want = core().insp2Frac(core().insp2Reading(b, 0));
      expect(html, b.id).toContain('aria-valuenow="0"');
      expect(html, b.id).toMatch(new RegExp('Cross-section of the weld at 0&quot;: [^"]*' + want.replace('"', '&quot;')));
    });
  });
});

describe('Inspector\'s Bench verdicts follow the simplified D1.1 Table 8.1', () => {
  const V = (it) => core().insp2Verdict(Object.assign({ len: 12 }, it));

  it('gives every bench weld its designed call', () => {
    const want = { uc1: true, us1: true, uc2: false, rf: true, us2: false, cvx: false, por: false, crat: false };
    core().INSP2_BENCH.forEach((b) => {
      expect(core().insp2Verdict(b).accept, b.id).toBe(want[b.id]);
    });
    expect(core().insp2Verdict(item('uc2')).fails).toEqual(['undercut']);
    expect(core().insp2Verdict(item('uc2')).r.undercut.why).toBe('length');
    expect(core().insp2Verdict(item('us2')).r.size.why).toBe('depth');
    expect(core().insp2Verdict(item('cvx')).fails).toEqual(['convexity', 'overlap']);
    expect(core().insp2Verdict(item('por')).r.pores.why).toBe('total');
    expect(core().insp2Verdict(item('crat')).fails).toEqual(['crater', 'crack']);
    // the crater alone would pass the 10% undersize allowance — the crater rule decides
    expect(core().insp2Verdict(item('crat')).r.size.ok).toBe(true);
  });

  it('accepts undercut of exactly 1/32 in everywhere and rejects anything deeper over more than 2 in', () => {
    expect(V({ t: 3 / 8, undercut: { base: F(2), segs: [] } }).accept).toBe(true);
    expect(V({ t: 3 / 8, undercut: { base: F(3), segs: [] } }).accept).toBe(false);
    // 3/64 (over 1/32, under 1/16) for exactly 2 in: the exception allows it
    expect(V({ t: 3 / 8, undercut: { base: 0, segs: [[3, 5, F(3)]] } }).accept).toBe(true);
    expect(V({ t: 3 / 8, undercut: { base: 0, segs: [[3, 5.125, F(3)]] } }).accept).toBe(false);
    // two stretches add up
    expect(V({ t: 3 / 8, undercut: { base: 0, segs: [[0, 1, F(4)], [10, 11.25, F(4)]] } }).accept).toBe(false);
    // exactly 1/16 is allowed in the exception; 5/64 never is
    expect(V({ t: 3 / 8, undercut: { base: 0, segs: [[4, 4.25, F(4)]] } }).accept).toBe(true);
    expect(V({ t: 3 / 8, undercut: { base: 0, segs: [[4, 4.25, F(5)]] } }).r.undercut.why).toBe('depth');
  });

  it('switches to the 1/16 in any-length rule at 1 in thick', () => {
    expect(V({ t: 1, undercut: { base: F(4), segs: [] } }).accept).toBe(true);
    expect(V({ t: 1, undercut: { base: F(5), segs: [] } }).accept).toBe(false);
    expect(V({ t: 15 / 16, undercut: { base: F(4), segs: [] } }).accept).toBe(false);
  });

  it('uses the D1.1 undersize table and the 10% length limit', () => {
    const { insp2UndersizeAllow } = core();
    expect(insp2UndersizeAllow(1 / 8)).toBe(F(4));
    expect(insp2UndersizeAllow(3 / 16)).toBe(F(4));
    expect(insp2UndersizeAllow(1 / 4)).toBe(F(6));
    expect(insp2UndersizeAllow(5 / 16)).toBe(F(8));
    expect(insp2UndersizeAllow(1 / 2)).toBe(F(8));
    // 10 in weld: exactly 1 in undersize is 10% and passes; 1-1/8 in does not
    const base = { len: 10, nominal: 3 / 16 };
    expect(core().insp2Verdict(Object.assign({}, base, { size: { base: 3 / 16, segs: [[2, 3, 1 / 8]] } })).accept).toBe(true);
    expect(core().insp2Verdict(Object.assign({}, base, { size: { base: 3 / 16, segs: [[2, 3.125, 1 / 8]] } })).accept).toBe(false);
    // decrease of exactly U passes, U + 1/64 fails
    expect(V({ nominal: 1 / 4, size: { base: 1 / 4, segs: [[1, 2, 1 / 4 - F(6)]] } }).accept).toBe(true);
    expect(V({ nominal: 1 / 4, size: { base: 1 / 4, segs: [[1, 2, 1 / 4 - F(7)]] } }).accept).toBe(false);
  });

  it('limits convexity by face width and reinforcement to 1/8 in', () => {
    const { insp2ConvexMax } = core();
    expect(insp2ConvexMax(5 / 16)).toBe(F(4));
    expect(insp2ConvexMax(5 / 16 + 0.001)).toBe(F(8));
    expect(insp2ConvexMax(0.99)).toBe(F(8));
    expect(insp2ConvexMax(1)).toBe(F(12));
    expect(V({ nominal: 3 / 8, size: { base: 3 / 8, segs: [] }, convexity: { base: F(8), segs: [] } }).accept).toBe(true);
    expect(V({ nominal: 3 / 8, size: { base: 3 / 8, segs: [] }, convexity: { base: F(9), segs: [] } }).accept).toBe(false);
    expect(V({ reinf: { base: F(8), segs: [] } }).accept).toBe(true);
    expect(V({ reinf: { base: F(9), segs: [] } }).accept).toBe(false);
  });

  it('applies both porosity limits and ignores pores under 1/32 in', () => {
    const P = (pores) => V({ pores });
    // exactly 3/8 in one inch, nothing else: passes
    expect(P([{ x: 2, d: F(8) }, { x: 2.5, d: F(8) }, { x: 3, d: F(8) }]).accept).toBe(true);
    expect(P([{ x: 2, d: F(8) }, { x: 2.5, d: F(8) }, { x: 3, d: F(9) }]).r.pores.why).toBe('inch');
    // 3/4 in total spread out passes; 3/4 + 1/32 fails on the 12 in total
    const spread = [1, 3, 5, 7, 9, 11].map((x) => ({ x, d: F(8) }));
    expect(P(spread).accept).toBe(true);
    expect(P(spread.concat([{ x: 6, d: F(2) }])).r.pores.why).toBe('total');
    // a cloud of 1/64 in pores never counts
    expect(P([0.5, 1, 1.5, 2, 2.5].map((x) => ({ x, d: F(1) }))).accept).toBe(true);
  });

  it('rejects any crack and any overlap, and allows a crater only outside the effective length', () => {
    expect(V({ cracks: [{ x: 1 }] }).accept).toBe(false);
    expect(V({ overlap: { base: 0, segs: [[5, 5.125, F(1)]] } }).accept).toBe(false);
    const crater = { nominal: 1 / 4, size: { base: 1 / 4, segs: [[11.5, 12, 3 / 16]] } };
    expect(V(Object.assign({}, crater, { crater: { a: 11.5, b: 12, outsideEffective: false } })).accept).toBe(false);
    expect(V(Object.assign({}, crater, { crater: { a: 11.5, b: 12, outsideEffective: true } })).accept).toBe(true);
  });
});

describe('NDT Method Chooser', () => {
  const MATS = ['cs', 'ss304', 'al'];
  const FLAWS = ['surf_crack', 'lamination', 'porosity', 'lof'];
  const ACCESS = ['both', 'one', 'thin'];
  const all = (fn) => MATS.forEach((m) => FLAWS.forEach((f) => ACCESS.forEach((a) => fn(m, f, a, core().insp2NdtRank(m, f, a)))));

  it('never offers MT on aluminum or austenitic stainless', () => {
    all((m, f, a, r) => {
      if (m !== 'cs') {
        expect(r.mt.s, m + '/' + f + '/' + a).toBe('no');
        expect(r.recommend).not.toContain('mt');
      }
    });
    expect(core().insp2NdtRank('al', 'surf_crack', 'both').mt.c).toBe('mt_al');
    expect(core().insp2NdtRank('ss304', 'surf_crack', 'both').mt.c).toBe('mt_aus');
  });

  it('never offers PT for a flaw that does not break the surface', () => {
    all((m, f, a, r) => {
      if (f !== 'surf_crack') {
        expect(r.pt.s, m + '/' + f + '/' + a).toBe('no');
        expect(r.vt.s).toBe('no');
      }
    });
  });

  it('picks the textbook method for each classic case', () => {
    const R = core().insp2NdtRank;
    expect(R('cs', 'surf_crack', 'both').recommend).toEqual(['mt']);
    expect(R('al', 'surf_crack', 'both').recommend).toEqual(['pt']);
    expect(R('ss304', 'surf_crack', 'one').recommend).toEqual(['pt']);
    expect(R('cs', 'porosity', 'both').recommend).toEqual(['rt']);
    expect(R('cs', 'lof', 'one').recommend).toEqual(['ut']);
    expect(R('al', 'lamination', 'both').recommend).toEqual(['ut']);
    expect(R('cs', 'lamination', 'both').rt.s).toBe('no');      // plane across the beam
    expect(R('cs', 'lof', 'both').rt.s).toBe('weak');           // planar: only when aligned
    expect(R('cs', 'porosity', 'one').rt.s).toBe('no');         // no film side
  });

  it('always recommends something, and never a method it says will not work', () => {
    all((m, f, a, r) => {
      expect(r.recommend.length, m + '/' + f + '/' + a).toBeGreaterThan(0);
      r.recommend.forEach((k) => expect(r[k].s).not.toBe('no'));
    });
  });

  it('computes UT time of flight and the RT path from the same model the demos draw', () => {
    const { insp2UtTof, insp2RtPath } = core();
    expect(insp2UtTof(0.5, 'cs')).toBeCloseTo(2 * 12.7 / 5.92, 10);
    expect(insp2UtTof(1, 'al')).toBeCloseTo(2 * 25.4 / 6.32, 10);
    expect(insp2UtTof(0.5, 'bogus')).toBeCloseTo(insp2UtTof(0.5, 'cs'), 10);
    expect(insp2RtPath(0, 0.25, 0.004)).toBeCloseTo(0.25, 10);
    expect(insp2RtPath(90, 0.25, 0.004)).toBeCloseTo(0.004, 10);
    expect(insp2RtPath(10, 0.25, 0.004)).toBeCloseTo(0.004 / Math.sin(10 * Math.PI / 180), 10);
    // aligned crack shows (>= 2% of a 1/2 in wall), a 45 degree crack does not
    expect(insp2RtPath(0, 0.25, 0.004) / 0.5).toBeGreaterThanOrEqual(0.02);
    expect(insp2RtPath(45, 0.25, 0.004) / 0.5).toBeLessThan(0.02);
    const html = render({ view: 'inspection', insp_sect: 'ndt', insp2_ndtDemo: 'ut', insp2_utDepth: 0.5 });
    expect(html).toContain('arrives at ' + insp2UtTof(0.5, 'cs').toFixed(1) + ' microseconds');
  });
});

describe('Essential Variable Sorter', () => {
  it('files each change in the right bin', () => {
    const want = { fno: true, amps: false, thick: true, gas: true, pos: false, process: true, dia: false, speed: false, pno: true, transfer: true };
    const got = {};
    core().INSP2_SORT.forEach((c) => { got[c.id] = c.req; });
    expect(got).toEqual(want);
  });

  it('shows every card and explains it once sorted', () => {
    core().INSP2_SORT.forEach((c, i) => {
      const correct = c.req ? 'req' : 'ok';
      const html = render({ view: 'codes', insp2_codesTab: 'sort', insp2_sortIdx: i, insp2_sort: { [c.id]: correct } });
      expect(html).toContain('Card ' + (i + 1) + ' of 10');
      expect(html).toContain('✅ Correct.');
    });
    const wrong = render({ view: 'codes', insp2_codesTab: 'sort', insp2_sortIdx: 4, insp2_sort: { pos: 'req' } });
    expect(wrong).toContain('This one belongs in');
    expect(wrong).toContain('QW-203');
  });
});

describe('Lane INSP quizzes are balanced', () => {
  function regions() {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const a = src.slice(src.indexOf('// MODULE 12: CODES AND STANDARDS'), src.indexOf('// MODULE 13: WELDER QUALIFICATION'));
    const b = src.slice(src.indexOf('// MODULE 16: INSPECTION + CWI PREP'), src.indexOf('// MODULE 17: CONSUMABLES'));
    return a + b;
  }
  it('spreads the correct answers across A-D, none over 35%', () => {
    const src = regions();
    const answers = [...src.matchAll(/opts: \[[^\]]*\], answer: (\d)/g)].map((m) => Number(m[1]));
    expect(answers.length).toBe(14);
    const counts = [0, 0, 0, 0];
    answers.forEach((n) => { counts[n] += 1; });
    counts.forEach((c, i) => expect(c, 'slot ' + 'ABCD'[i]).toBeGreaterThan(0));
    expect(Math.max.apply(null, counts) / answers.length).toBeLessThanOrEqual(0.35);
  });

  it('does not make the right option the longest one most of the time', () => {
    let longest = 0, total = 0;
    const optionTexts = (html) => [...html.matchAll(/role="radio" aria-checked="false"[^>]*>([A-D])\. ([^<]*)</g)].map((m) => m[2]);
    for (let i = 0; i < 8; i++) {
      const html = render({ view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'quiz', insp2_ndtQIdx: i });
      const opts = optionTexts(html);
      expect(opts.length, 'ndt q' + i).toBe(4);
      total += 1;
      const ans = [1, 0, 3, 2, 0, 3, 1, 2][i];
      if (opts[ans].length === Math.max.apply(null, opts.map((o) => o.length))) longest += 1;
    }
    for (let i = 0; i < 6; i++) {
      const html = render({ view: 'codes', insp2_codesTab: 'clause', insp2_clauseIdx: i });
      const opts = optionTexts(html);
      expect(opts.length, 'clause q' + i).toBe(4);
      total += 1;
      const ans = [0, 1, 2, 3, 0, 1][i];
      if (opts[ans].length === Math.max.apply(null, opts.map((o) => o.length))) longest += 1;
    }
    expect(longest / total).toBeLessThan(0.35);
  });
});

describe('Lane INSP survives hostile saved state', () => {
  const HOSTILE = [123, {}, [], 'bogus', null, '__proto__', ['bench'], NaN, true];
  it('falls back for a junk insp_sect', () => {
    HOSTILE.forEach((v) => {
      const html = render({ view: 'inspection', insp_sect: v });
      expect(html, String(v)).toContain('The Certified Welding Inspector (CWI) is the gatekeeper');
    });
  });
  it('falls back for a junk codes_pick and tab', () => {
    HOSTILE.forEach((v) => {
      const html = render({ view: 'codes', codes_pick: v, insp2_codesTab: v });
      expect(html, String(v)).toContain('Structural Welding Code');
    });
  });
  it('normalises every new key', () => {
    const junk = {
      insp2_bench: { uc1: { pick: 'maybe', recs: ['a', NaN, 1e9, -5, 3.3, null, {}] }, zzz: { pick: 'accept' }, us1: 'x', __proto__: { polluted: 1 } },
      insp2_benchIdx: 'abc', insp2_ndtMat: 'gold', insp2_ndtFlaw: 7, insp2_ndtAccess: {}, insp2_ndtMode: 1, insp2_ndtDemo: 'xray',
      insp2_utDepth: 'deep', insp2_rtAngle: 400, insp2_ndtQuiz: { 0: 9, 1: '1', 2: 2 }, insp2_ndtQIdx: 1e6,
      insp2_sort: { fno: 'maybe', amps: 'ok', constructor: 'req' }, insp2_sortIdx: 'x', insp2_wpsField: 'nope', insp2_clause: [3], insp2_clauseIdx: -1
    };
    ['bench', 'ndt'].forEach((s) => {
      expect(() => render(Object.assign({ view: 'inspection', insp_sect: s }, junk))).not.toThrow();
    });
    ['read', 'flow', 'sort', 'clause'].forEach((t) => {
      expect(() => render(Object.assign({ view: 'codes', insp2_codesTab: t }, junk))).not.toThrow();
    });
    expect(() => render(Object.assign({ view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'quiz' }, junk))).not.toThrow();
    [99, -3, 2.7, Infinity, '1e3'].forEach((n) => {
      expect(() => render({ view: 'inspection', insp_sect: 'bench', insp2_benchIdx: n })).not.toThrow();
    });
    const nb = core().insp2NormBench(junk.insp2_bench);
    expect(Object.keys(nb)).toEqual(['uc1']);
    expect(nb.uc1.pick).toBe(null);
    expect(nb.uc1.recs).toEqual([12, 0, 3.25]);   // clamped to the weld, snapped to 1/8 in
    expect(core().insp2NormPicks({ fno: 'maybe', amps: 'ok', constructor: 'req' }, ['fno', 'amps'], ['req', 'ok'])).toEqual({ amps: 'ok' });
    expect(core().insp2NormBench('str')).toEqual({});
    expect(core().insp2NormBench([1, 2])).toEqual({});
  });
});

describe('Lane INSP renders every new tab', () => {
  it('renders the bench for every weld, unanswered and answered', () => {
    core().INSP2_BENCH.forEach((b, i) => {
      const open = render({ view: 'inspection', insp_sect: 'bench', insp2_benchIdx: i });
      expect(open).toContain('Weld ' + (i + 1) + ' of 8');
      expect(open).toContain('role="slider"');
      expect(open).toContain('simplified from AWS D1.1:2020 Table 8.1'.replace('simplified', 'Simplified'));
      const v = core().insp2Verdict(b);
      const crit = core().insp2Critical(b);
      const rec = b.measure === 'pores' ? 11 : crit.at;
      const done = render({ view: 'inspection', insp_sect: 'bench', insp2_benchIdx: i, insp2_bench: { [b.id]: { pick: v.accept ? 'accept' : 'reject', recs: [rec] } } });
      expect(done, b.id).toContain('✅ Correct: ' + (v.accept ? 'ACCEPT' : 'REJECT'));
      expect(done, b.id).toContain('You recorded it.');
      expect(done, b.id).toContain('Visual inspection report');
    });
  });
  it('renders the chooser with each demo, and the quiz', () => {
    ['mt', 'pt', 'ut', 'rt'].forEach((dm) => {
      ['cs', 'ss304', 'al'].forEach((m) => {
        const html = render({ view: 'inspection', insp_sect: 'ndt', insp2_ndtDemo: dm, insp2_ndtMat: m });
        expect(html).toContain('Recommended');
        expect(html).toContain('role="img"');
      });
    });
    const q = render({ view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'quiz', insp2_ndtQuiz: { 0: 1 } });
    expect(q).toContain('✅ Correct: PT — liquid penetrant');
  });
  it('renders every Codes tab', () => {
    ['d1_1', 'asme9', 'api1104'].forEach((c) => {
      expect(render({ view: 'codes', codes_pick: c })).toContain('Section structure');
    });
    const flow = render({ view: 'codes', insp2_codesTab: 'flow' });
    expect(flow).toContain('Welding Procedure Specification');
    expect((flow.match(/role="radio"/g) || []).length).toBe(11);
    const fieldExplained = render({ view: 'codes', insp2_codesTab: 'flow', insp2_wpsField: 'pos' });
    expect(fieldExplained).toContain('QW-203');
    const clause = render({ view: 'codes', insp2_codesTab: 'clause', insp2_clause: { 0: 0 } });
    expect(clause).toContain('✅ Correct: Clause 8 — Inspection');
  });
});

describe('Lane INSP corrected facts', () => {
  it('says Part A is closed book and Part C is open code book', () => {
    const html = render({ view: 'inspection', insp_sect: 'exam' });
    expect(html).toContain('Closed book. 150 multiple-choice');
    expect(html).toContain('Open code book.');
    expect(html).not.toContain('Open book — bring AWS reference materials');
    expect(html).toContain('$1,150');
  });
  it('no longer pins a lighting level on AWS B5.1, and names the Bridge Cam gauge once', () => {
    const html = render({ view: 'inspection', insp_sect: 'visual' });
    expect(html).not.toMatch(/fc[^.]*per AWS B5\.1/);
    expect(html).toContain('Bridge Cam (Cambridge) gauge');
    expect(html).not.toContain('Bridge cam, Cambridge, or');
  });
  it('uses the D1.1:2020 clause layout and the right QW-500 and API 1104 claims', () => {
    const d11 = render({ view: 'codes', codes_pick: 'd1_1' });
    expect(d11).toContain('Clause 8');
    expect(d11).toContain('Clause 11');
    expect(d11).toContain('Strengthening and Repair of Existing Structures');
    expect(d11).not.toContain('Statically Loaded Structures');
    expect(d11).not.toContain('Cyclically Loaded Structures');
    const asme = render({ view: 'codes', codes_pick: 'asme9' });
    expect(asme).toContain('Standard Welding Procedure Specifications (SWPS)');
    expect(asme).not.toContain('Process-specific (SMAW, GMAW, GTAW, etc.) rules.');
    const api = render({ view: 'codes', codes_pick: 'api1104' });
    expect(api).not.toContain('most pipeline production welds are 100% X-rayed');
    expect(api).toContain('company specification or by regulation');
  });
});

describe('Lane INSP bench is operable by keyboard and by drag (mounted)', () => {
  let host, root;
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    act(() => { root.unmount(); });
    host.remove();
  });
  function mount(initial) {
    const cfg = window.StemLab._registry.weldLab;
    function Host() {
      const [td, setTd] = React.useState(initial);
      const ctx = {
        React, toolData: { weldLab: td },
        update: (tool, k, v) => setTd((p) => Object.assign({}, p, { [k]: v })),
        setToolData: () => {}, addToast: () => {}, t: (k, fb) => fb || k
      };
      return cfg.render(ctx);
    }
    root = ReactDOMClient.createRoot(host);
    act(() => { root.render(React.createElement(Host)); });
  }
  const slider = () => host.querySelector('svg[role="slider"]');
  const key = (el, k, extra) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });

  it('moves the gauge with the arrow keys, reads the geometry, records and decides', () => {
    mount({ view: 'inspection', insp_sect: 'bench', insp2_benchIdx: 0 });
    const s = slider();
    expect(s.getAttribute('aria-valuenow')).toBe('0');
    key(s, 'ArrowRight');
    expect(slider().getAttribute('aria-valuenow')).toBe('0.25');
    key(slider(), 'ArrowRight', { shiftKey: true });
    expect(slider().getAttribute('aria-valuenow')).toBe('1.25');
    expect(slider().getAttribute('aria-valuetext')).toContain('Undercut depth 1/32"');
    for (let i = 0; i < 21; i++) key(slider(), 'ArrowRight');   // 1.25 + 5.25 = 6.5
    expect(slider().getAttribute('aria-valuenow')).toBe('6.5');
    expect(slider().getAttribute('aria-valuetext')).toContain('Undercut depth 1/16"');
    key(slider(), 'Enter');
    expect(host.textContent).toContain('6-1/2": 1/16"');
    key(slider(), 'End');
    expect(slider().getAttribute('aria-valuenow')).toBe('12');
    const accept = [...host.querySelectorAll('[role="radio"]')].find((b) => b.textContent.indexOf('ACCEPT') !== -1);
    act(() => { accept.click(); });
    expect(host.textContent).toContain('✅ Correct: ACCEPT.');
    expect(host.textContent).toContain('You recorded it.');
    // first call is final
    const reject = [...host.querySelectorAll('[role="radio"]')].find((b) => b.textContent.indexOf('REJECT') !== -1);
    expect(reject.disabled).toBe(true);
  });

  it('moves the gauge to where the pointer drags it', () => {
    mount({ view: 'inspection', insp_sect: 'bench', insp2_benchIdx: 1 });
    const s = slider();
    s.getBoundingClientRect = () => ({ left: 0, top: 0, width: 624, height: 150, right: 624, bottom: 150 });
    const at = (x) => 24 + x * 48;
    act(() => { s.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: at(4.5), clientY: 60 })); });
    expect(slider().getAttribute('aria-valuenow')).toBe('4.5');
    expect(slider().getAttribute('aria-valuetext')).toContain('Fillet size (leg) 3/16"');
    act(() => { slider().dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: at(8), clientY: 60 })); });
    expect(slider().getAttribute('aria-valuenow')).toBe('8');
    act(() => { slider().dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: at(8), clientY: 60 })); });
    act(() => { slider().dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: at(2), clientY: 60 })); });
    expect(slider().getAttribute('aria-valuenow')).toBe('8');   // no drag after release
  });
});
