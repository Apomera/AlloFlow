// Logic + integrity-invariant characterization for dynamic_assessment_module.js —
// the Vygotsky/Feuerstein Dynamic Assessment scoring + Phase BB psychometrics layer.
//
// WHY (the project's most overclaim-prone surface): it scores a 4-level scaffold
// ladder, computes a Modifiability Index, classifies modifiability/transfer tiers,
// and runs population psychometrics (Cohen's d, Hedges' g, z/percentile, item
// analysis) that feed clinician/parent narratives, CSV "research" exports, and the
// Report Writer / Student Analytics. It had ZERO coverage. A silent drift in the MI
// denominator, the Hedges' g small-sample correction, or a flag threshold would
// corrupt clinical findings with no detection — and a markup snapshot can't catch a
// wrong number. We pin the math against hand-computed fixtures + add integrity
// invariants (ceiling pretest never yields +MI; MI monotonic in posttest; n<2 → null).
//
// Functions are module-level; exposed via the existing _meta seam (extended).

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let M;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('dynamic_assessment_module.js');
  M = window.AlloModules.DynamicAssessment._meta;
});

describe('scoreForLevel — 4-level scaffold scoring', () => {
  it('solved unprompted (level 0) → 5; each level of help costs 1', () => {
    expect(M.scoreForLevel(0, true)).toBe(5);
    expect(M.scoreForLevel(1, true)).toBe(4);
    expect(M.scoreForLevel(3, true)).toBe(2);
    expect(M.scoreForLevel(4, true)).toBe(1);
  });
  it('not finally correct → 0 regardless of level', () => {
    expect(M.scoreForLevel(0, false)).toBe(0);
    expect(M.scoreForLevel(2, false)).toBe(0);
  });
  it('scaffoldLeaked bumps one level (conservative), except at L4 (no extra penalty)', () => {
    expect(M.scoreForLevel(2, true, true)).toBe(2);  // l 2→3 → 5-3=2
    expect(M.scoreForLevel(0, true, true)).toBe(4);  // l 0→1 → 4
    expect(M.scoreForLevel(4, true, true)).toBe(1);  // l stays 4 → 1
  });
  it('clamps level to [0,4]', () => {
    expect(M.scoreForLevel(-3, true)).toBe(5);
    expect(M.scoreForLevel(9, true)).toBe(1);
  });
  it('INVARIANT: result always in [0,5]', () => {
    for (const lvl of [-5, 0, 1, 2, 3, 4, 9]) for (const fc of [true, false]) for (const sl of [true, false]) {
      const v = M.scoreForLevel(lvl, fc, sl);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe('computeModifiabilityIndex — (post-pre)/(max-pre)', () => {
  it('full growth from zero → 1', () => { expect(M.computeModifiabilityIndex(0, 20, 4)).toBe(1); });
  it('half the available headroom → 0.5', () => { expect(M.computeModifiabilityIndex(10, 15, 4)).toBe(0.5); });
  it('ceiling pretest (max === pre) → 0', () => { expect(M.computeModifiabilityIndex(20, 20, 4)).toBe(0); });
  it('regression (post < pre) → negative', () => { expect(M.computeModifiabilityIndex(10, 5, 4)).toBe(-0.5); });
  it('rounds to 2 decimal places', () => { expect(M.computeModifiabilityIndex(3, 7, 2)).toBe(0.57); }); // 4/7=0.5714
  it('clamps to [-1, 1]', () => {
    expect(M.computeModifiabilityIndex(0, 30, 2)).toBe(1);   // 30/10=3 → 1
    expect(M.computeModifiabilityIndex(0, -30, 2)).toBe(-1);
  });
  it('zero items → 0', () => { expect(M.computeModifiabilityIndex(0, 100, 0)).toBe(0); });
  it('INVARIANT: ceiling pretest never produces a positive MI', () => {
    expect(M.computeModifiabilityIndex(20, 20, 4)).toBe(0);
    expect(M.computeModifiabilityIndex(20, 25, 4)).toBeLessThanOrEqual(0); // post>max can't beat ceiling guard
  });
  it('INVARIANT: MI is monotonic non-decreasing in posttest (fixed pre/count)', () => {
    const a = M.computeModifiabilityIndex(10, 12, 4);
    const b = M.computeModifiabilityIndex(10, 15, 4);
    const c = M.computeModifiabilityIndex(10, 20, 4);
    expect(a).toBeLessThanOrEqual(b);
    expect(b).toBeLessThanOrEqual(c);
  });
});

describe('modifiabilityTier — thresholds 0.6 / 0.3 / 0', () => {
  it('>= 0.6 → high (responsive)', () => { expect(M.modifiabilityTier(0.6).id).toBe('high'); expect(M.modifiabilityTier(0.95).id).toBe('high'); });
  it('[0.3, 0.6) → moderate', () => { expect(M.modifiabilityTier(0.59).id).toBe('moderate'); expect(M.modifiabilityTier(0.3).id).toBe('moderate'); });
  it('[0, 0.3) → low', () => { expect(M.modifiabilityTier(0.29).id).toBe('low'); expect(M.modifiabilityTier(0).id).toBe('low'); });
  it('< 0 → regression', () => { expect(M.modifiabilityTier(-0.01).id).toBe('regression'); expect(M.modifiabilityTier(-1).id).toBe('regression'); });
});

describe('transferTier — strong/partial/weak/minimal', () => {
  it('transferMax 0 → null', () => { expect(M.transferTier(5, 0, 10, 10)).toBeNull(); });
  it('transferPct >= 0.7 → strong', () => { expect(M.transferTier(8, 10, 10, 10).id).toBe('strong-transfer'); });
  it('ratio >= 0.7 (but pct < 0.7) → partial', () => { expect(M.transferTier(6, 10, 8, 10).id).toBe('partial-transfer'); }); // 0.6/0.8=0.75
  it('ratio in [0.4, 0.7) → weak', () => { expect(M.transferTier(4, 10, 8, 10).id).toBe('weak-transfer'); }); // 0.4/0.8=0.5
  it('ratio < 0.4 → minimal', () => { expect(M.transferTier(2, 10, 8, 10).id).toBe('minimal-transfer'); }); // 0.2/0.8=0.25
  it('posttestMax 0 → ratio 0 → minimal (unless pct>=0.7)', () => { expect(M.transferTier(5, 10, 0, 0).id).toBe('minimal-transfer'); });
});

describe('aggregateSessionStatistics — Cohen d / Hedges g / SD / tiers', () => {
  it('no sessions → null shape', () => {
    const r = M.aggregateSessionStatistics([]);
    expect(r).toMatchObject({ n: 0, miMean: null, miSD: null, cohenD: null, hedgesG: null });
  });
  it('n=1 → no SD, no effect size (the n<2 honesty guard)', () => {
    const r = M.aggregateSessionStatistics([{ modifiabilityIndex: 0.5, pretestSum: 10, posttestSum: 15 }]);
    expect(r.n).toBe(1);
    expect(r.miMean).toBe(0.5);
    expect(r.miSD).toBeNull();
    expect(r.cohenD).toBeNull();
    expect(r.hedgesG).toBeNull();
  });
  it('n=2 → pooled-SD Cohen d + small-sample Hedges g', () => {
    const r = M.aggregateSessionStatistics([
      { modifiabilityIndex: 0.5, pretestSum: 10, posttestSum: 15 },
      { modifiabilityIndex: 0.3, pretestSum: 8, posttestSum: 12 },
    ]);
    expect(r.n).toBe(2);
    expect(r.miMean).toBeCloseTo(0.4, 6);
    expect(r.pretestMean).toBe(9);
    expect(r.posttestMean).toBe(13.5);
    // pooledSD = sqrt((2 + 4.5)/2)=1.80278; cohenD=(13.5-9)/1.80278=2.4961
    expect(r.cohenD).toBeCloseTo(2.4961, 3);
    // correction = 1 - 3/(4*4-9) = 1 - 3/7 = 0.571428; g = d*corr
    expect(r.hedgesG).toBeCloseTo(2.4961 * (1 - 3 / 7), 3);
    expect(r.tierCounts).toMatchObject({ high: 0, moderate: 2, low: 0, regression: 0 });
  });
  it('INVARIANT: |Hedges g| < |Cohen d| for small n (correction shrinks the estimate)', () => {
    const r = M.aggregateSessionStatistics([
      { modifiabilityIndex: 0.8, pretestSum: 5, posttestSum: 18 },
      { modifiabilityIndex: 0.2, pretestSum: 9, posttestSum: 11 },
      { modifiabilityIndex: 0.5, pretestSum: 7, posttestSum: 14 },
    ]);
    expect(Math.abs(r.hedgesG)).toBeLessThan(Math.abs(r.cohenD));
  });
});

describe('computeMiZScore / computeMiPercentile', () => {
  it('z-score = (mi - mean)/sd', () => { expect(M.computeMiZScore(0.5, 0.4, 0.1)).toBeCloseTo(1, 6); });
  it('z-score guards: sd 0 or null mean → null', () => {
    expect(M.computeMiZScore(0.5, 0.4, 0)).toBeNull();
    expect(M.computeMiZScore(0.5, null, 0.1)).toBeNull();
  });
  it('percentile uses midpoint convention for ties', () => {
    expect(M.computeMiPercentile(0.5, [0.1, 0.3, 0.5, 0.7, 0.9])).toBe(50); // below 2 + 0.5*1 = 2.5 / 5
    expect(M.computeMiPercentile(0.9, [0.1, 0.3, 0.5])).toBe(100);
    expect(M.computeMiPercentile(0.1, [0.1, 0.3, 0.5])).toBe(17); // 0.5/3 = 16.67
  });
  it('percentile empty population → null', () => { expect(M.computeMiPercentile(0.5, [])).toBeNull(); });
});

describe('interpretCohenD — Cohen (1988) bands', () => {
  it('null → em-dash', () => { expect(M.interpretCohenD(null).label).toBe('—'); });
  it('bands at 0.2 / 0.5 / 0.8', () => {
    expect(M.interpretCohenD(0.1).label).toBe('Negligible');
    expect(M.interpretCohenD(0.3).label).toBe('Small');
    expect(M.interpretCohenD(0.6).label).toBe('Medium');
    expect(M.interpretCohenD(1.0).label).toBe('Large');
  });
  it('uses absolute value (negative d still classified by magnitude)', () => { expect(M.interpretCohenD(-0.9).label).toBe('Large'); });
});

describe('aggregateItemStatistics — psychometric quality flags', () => {
  const r = (itemId, phase, finalCorrect, promptLevelReached) => ({ itemId, phase, finalCorrect, promptLevelReached: promptLevelReached || 0 });
  const sess = (itemResults) => ({ modifiabilityIndex: 0.5, itemResults });
  const find = (stats, id) => stats.find((s) => s.itemId === id);

  it('flags "too-easy" (pretest pass rate >= 85%, n >= minN)', () => {
    const stats = M.aggregateItemStatistics(Array.from({ length: 4 }, () => sess([r('itEasy', 'pretest', true)])));
    const it = find(stats, 'itEasy');
    expect(it.pretestPassRate).toBe(1);
    expect(it.flags.some((f) => f.id === 'too-easy')).toBe(true);
  });
  it('flags "too-hard" (mean scaffold level >= 3.5, mediation n >= minN)', () => {
    const stats = M.aggregateItemStatistics(Array.from({ length: 3 }, () => sess([r('itHard', 'mediation', true, 4)])));
    const it = find(stats, 'itHard');
    expect(it.meanScaffoldLevel).toBe(4);
    expect(it.flags.some((f) => f.id === 'too-hard')).toBe(true);
  });
  it('flags "stuck" (>=50% mediation attempts never solved), and not "too-hard" below minN', () => {
    const stats = M.aggregateItemStatistics(Array.from({ length: 2 }, () => sess([r('itStuck', 'mediation', false, 4)])));
    const it = find(stats, 'itStuck');
    expect(it.flags.some((f) => f.id === 'stuck')).toBe(true);
    expect(it.flags.some((f) => f.id === 'too-hard')).toBe(false); // mediation n=2 < minN(3)
  });
  it('flags "floor" (pretest <=5% and posttest <=10%, n>=minN)', () => {
    const stats = M.aggregateItemStatistics(Array.from({ length: 3 }, () => sess([r('itFloor', 'pretest', false), r('itFloor', 'posttest', false)])));
    const it = find(stats, 'itFloor');
    expect(it.flags.some((f) => f.id === 'floor')).toBe(true);
  });
  it('flags "non-discriminating" (modifiability sensitivity <10%, seen >=5)', () => {
    const stats = M.aggregateItemStatistics(Array.from({ length: 5 }, () => sess([r('itND', 'pretest', false), r('itND', 'posttest', false)])));
    const it = find(stats, 'itND');
    expect(it.modifiabilitySensitivity).toBe(0);
    expect(it.flags.some((f) => f.id === 'non-discriminating')).toBe(true);
  });
  it('a balanced item gets no flags', () => {
    const stats = M.aggregateItemStatistics([
      sess([r('ok', 'pretest', true)]), sess([r('ok', 'pretest', false)]),
      sess([r('ok', 'pretest', true)]),
    ]);
    const it = find(stats, 'ok');
    expect(it.pretestPassRate).toBeCloseTo(2 / 3, 6);
    expect(it.flags).toHaveLength(0);
  });
});
