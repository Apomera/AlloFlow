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
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('dynamic_assessment_module.js');
  M = window.AlloModules.DynamicAssessment._meta;
});

describe('SSR render smoke — dialog shell, start screen, active phase, summary', () => {
  // Render-phase crash protection for the themed shell + stepper + gauge +
  // ZPD card added in the WCAG/theming uplift. SSR only (no effects).
  const STORAGE_KEY = 'alloflow_dynamic_assessment_v1';
  let RDS, DA;
  beforeAll(() => {
    RDS = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
    DA = window.AlloModules.DynamicAssessment;
  });
  const renderWith = (state) => {
    if (state === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.localStorage.removeItem('alloflow_da_session_state_v1');
    const React = window.React;
    return RDS.renderToStaticMarkup(React.createElement(DA, {
      React, onClose: () => {}, addToast: () => {}, t: (k) => k, studentNickname: '', outputLanguage: 'English'
    }));
  };
  const baseSession = () => ({
    id: 'da-test-1', studentNickname: 'Testling', domain: 'math', difficulty: 'easy',
    mode: 'clinician', isCustomBank: false, customBankSnapshot: null,
    dateStarted: '2026-07-12T10:00:00.000Z',
    sessionItemIds: ['math-e-01', 'math-e-02', 'math-e-03'],
    currentPhase: 'pretest', currentItemIdx: 0, itemResults: [], sessionNote: '', currentLadderLevel: 0, intake: null
  });

  it('start screen renders inside the dialog shell with theme class', () => {
    const html = renderWith(null);
    expect(html).toContain('da-shell da-theme-');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Dynamic Assessment Studio');
  });
  it('active pretest phase renders the session-arc stepper + item prompt', () => {
    const html = renderWith({ sessions: [], activeSession: baseSession(), onboardingSeen: true, savedProbeTemplates: [] });
    expect(html).toContain('Session phases');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('Sara had 12 apples');
  });
  it('mediation phase renders the ladder + MLE reminders drawer', () => {
    const s = Object.assign(baseSession(), { currentPhase: 'mediation' });
    const html = renderWith({ sessions: [], activeSession: s, onboardingSeen: true, savedProbeTemplates: [] });
    expect(html).toContain('Scaffold ladder');
    expect(html).toContain('Mediation quality reminders');
  });
  it('summary renders MI gauge + learning-zone snapshot with correct band counts', () => {
    const mk = (itemId, phase, finalCorrect, lvl) => ({
      itemId, phase, promptLevelReached: lvl || 0, studentResponseText: '', examinerObservation: '',
      observationTags: [], supportType: null, finalCorrect, scaffoldLeaked: false,
      scoreAwarded: finalCorrect ? 5 - (lvl || 0) : 0, attemptedAt: '2026-07-12T10:05:00.000Z'
    });
    const s = Object.assign(baseSession(), {
      currentPhase: 'summary',
      itemResults: [
        mk('math-e-01', 'pretest', true, 0), mk('math-e-02', 'pretest', false, 0), mk('math-e-03', 'pretest', false, 0),
        mk('math-e-01', 'mediation', true, 0), mk('math-e-02', 'mediation', true, 2), mk('math-e-03', 'mediation', true, 4),
        mk('math-e-01', 'posttest', true, 0), mk('math-e-02', 'posttest', true, 0), mk('math-e-03', 'posttest', false, 0)
      ]
    });
    const html = renderWith({ sessions: [], activeSession: s, onboardingSeen: true, savedProbeTemplates: [] });
    expect(html).toContain('Modifiability Index gauge');
    expect(html).toContain('Learning-zone snapshot');
    expect(html).toContain('Teachable band (ZPD)');
    expect(html).toContain('interpretation conventions of this tool');
    // Round 2: movement pivot, sensitivity band, and the reopen escape hatch
    expect(html).toContain('Per-item movement');
    expect(html).toContain('▲ gained');   // math-e-02: pre ✗ → post ✓
    expect(html).toContain('Sensitivity:');
    expect(html).toContain('Reopen last item');
  });
  it('active phase with a recorded result shows the Undo item button', () => {
    const s = Object.assign(baseSession(), {
      itemResults: [{
        itemId: 'math-e-01', phase: 'pretest', promptLevelReached: 0, studentResponseText: '7',
        examinerObservation: '', observationTags: [], supportType: null, finalCorrect: true,
        scaffoldLeaked: false, scoreAwarded: 5, attemptedAt: '2026-07-12T10:01:00.000Z'
      }],
      currentItemIdx: 1
    });
    const html = renderWith({ sessions: [], activeSession: s, onboardingSeen: true, savedProbeTemplates: [] });
    expect(html).toContain('↩ Undo item');
  });
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

describe('computeZpdProfile — learning-zone (ZPD) classification', () => {
  const r = (itemId, phase, finalCorrect, promptLevelReached, scaffoldLeaked) =>
    ({ itemId, phase, finalCorrect, promptLevelReached: promptLevelReached || 0, scaffoldLeaked: !!scaffoldLeaked });
  const sess = (itemResults) => ({ itemResults });

  it('pretest-correct → independent (even if a mediation record exists)', () => {
    const z = M.computeZpdProfile(sess([r('a', 'pretest', true), r('a', 'mediation', true, 2)]));
    expect(z.independent).toHaveLength(1);
    expect(z.independent[0].itemId).toBe('a');
    expect(z.zpd).toHaveLength(0);
    expect(z.frustration).toHaveLength(0);
    expect(z.nClassified).toBe(1);
  });
  it('mediation success at L1–L3 → zpd band with the level recorded', () => {
    const z = M.computeZpdProfile(sess([r('b', 'pretest', false), r('b', 'mediation', true, 3)]));
    expect(z.zpd).toHaveLength(1);
    expect(z.zpd[0].level).toBe(3);
    expect(z.frustration).toHaveLength(0);
  });
  it('mediation success at L4 → frustration band, flagged solvedWithTeach', () => {
    const z = M.computeZpdProfile(sess([r('c', 'pretest', false), r('c', 'mediation', true, 4)]));
    expect(z.frustration).toHaveLength(1);
    expect(z.frustration[0].solvedWithTeach).toBe(true);
  });
  it('mediation failure → frustration band, not solvedWithTeach', () => {
    const z = M.computeZpdProfile(sess([r('d', 'mediation', false, 4)]));
    expect(z.frustration).toHaveLength(1);
    expect(z.frustration[0].solvedWithTeach).toBe(false);
  });
  it('leaked rung counts one level higher: leaked L3 success → frustration (same conservative correction as scoring)', () => {
    const z = M.computeZpdProfile(sess([r('e', 'mediation', true, 3, true)]));
    expect(z.zpd).toHaveLength(0);
    expect(z.frustration).toHaveLength(1);
    const z2 = M.computeZpdProfile(sess([r('e2', 'mediation', true, 2, true)]));
    expect(z2.zpd).toHaveLength(1);
    expect(z2.zpd[0].level).toBe(3);
  });
  it('pretest-wrong item with no mediation record is not classified', () => {
    const z = M.computeZpdProfile(sess([r('f', 'pretest', false)]));
    expect(z.nClassified).toBe(0);
    expect(z.independent.length + z.zpd.length + z.frustration.length).toBe(0);
  });
  it('null/empty session → zero everything, never throws', () => {
    for (const input of [null, undefined, {}, sess([])]) {
      const z = M.computeZpdProfile(input);
      expect(z.nClassified).toBe(0);
      expect(z.independent).toEqual([]);
    }
  });
  it('INVARIANT: every classified item lands in exactly one band', () => {
    const z = M.computeZpdProfile(sess([
      r('i1', 'pretest', true),
      r('i2', 'pretest', false), r('i2', 'mediation', true, 1),
      r('i3', 'mediation', true, 4),
      r('i4', 'mediation', false, 4),
      r('i5', 'posttest', true) // posttest-only record → unclassified
    ]));
    expect(z.independent.length + z.zpd.length + z.frustration.length).toBe(z.nClassified);
    expect(z.nClassified).toBe(4);
  });
});

describe('rollbackLastItemResult — undo the most recent item entry', () => {
  const r = (itemId, phase) => ({ itemId, phase, finalCorrect: true, promptLevelReached: 0 });
  it('empty session → null (nothing to undo)', () => {
    expect(M.rollbackLastItemResult({ itemResults: [] })).toBeNull();
    expect(M.rollbackLastItemResult(null)).toBeNull();
  });
  it('pops the last result and re-presents that item within its phase', () => {
    const rb = M.rollbackLastItemResult({ itemResults: [r('a', 'pretest'), r('b', 'pretest'), r('c', 'pretest')] });
    expect(rb.itemResults).toHaveLength(2);
    expect(rb.currentPhase).toBe('pretest');
    expect(rb.currentItemIdx).toBe(2); // item c is the 3rd pretest item (index 2)
    expect(rb.popped.itemId).toBe('c');
    expect(rb.currentLadderLevel).toBe(0);
  });
  it('rolls back across a phase boundary (first mediation entry → back to mediation item 0)', () => {
    const rb = M.rollbackLastItemResult({
      itemResults: [r('a', 'pretest'), r('b', 'pretest'), r('a', 'mediation')]
    });
    expect(rb.currentPhase).toBe('mediation');
    expect(rb.currentItemIdx).toBe(0);
    expect(rb.popped.phase).toBe('mediation');
  });
  it('after popping the last entry of a completed phase, re-presents its final item', () => {
    // Phase had advanced (e.g. to mediation idx 0); undo pops pretest #2 → pretest idx 1
    const rb = M.rollbackLastItemResult({ itemResults: [r('a', 'pretest'), r('b', 'pretest')] });
    expect(rb.currentPhase).toBe('pretest');
    expect(rb.currentItemIdx).toBe(1);
  });
});

describe('computeMiSensitivity — single-item ±1 robustness band', () => {
  it('zero items → null', () => { expect(M.computeMiSensitivity(0, 0, 0)).toBeNull(); });
  it('mid-range: band brackets the point estimate symmetrically-ish', () => {
    const s = M.computeMiSensitivity(10, 15, 4); // base MI 0.5, max 20
    expect(s.lo).toBeCloseTo(0.4, 6);  // MI(10,14) = 4/10
    expect(s.hi).toBeCloseTo(0.6, 6);  // MI(10,16) = 6/10
  });
  it('near-ceiling posttest: band clamps at 1', () => {
    const s = M.computeMiSensitivity(0, 20, 4);
    expect(s.hi).toBe(1);
    expect(s.lo).toBeCloseTo(0.95, 6); // MI(0,19)
  });
  it('ceiling pretest: band spans the full uninformative range', () => {
    const s = M.computeMiSensitivity(20, 20, 4); // pre at max — MI is 0 by guard
    expect(s.lo).toBe(0);
    expect(s.hi).toBe(1); // one point of pretest headroom would read as full growth
  });
  it('INVARIANT: band always contains the point estimate', () => {
    for (const [pre, post, n] of [[0, 0, 3], [5, 10, 3], [10, 5, 4], [7, 14, 6]]) {
      const base = M.computeModifiabilityIndex(pre, post, n);
      const s = M.computeMiSensitivity(pre, post, n);
      expect(s.lo).toBeLessThanOrEqual(base);
      expect(s.hi).toBeGreaterThanOrEqual(base);
    }
  });
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
