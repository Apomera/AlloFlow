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
  const renderWith = (state, startScreenView) => {
    if (state === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (startScreenView) window.localStorage.setItem('alloflow_da_session_state_v1', JSON.stringify({ startScreenView }));
    else window.localStorage.removeItem('alloflow_da_session_state_v1');
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

  it('uses a matched posttest snapshot instead of repeating the baseline prompt', () => {
    const s = Object.assign(baseSession(), {
      currentPhase: 'posttest',
      posttestForm: 'matched-parallel',
      posttestItemSnapshot: [{
        id: 'math-e-01',
        prompt: 'Novel posttest prompt',
        correctAnswer: '8',
        acceptableAnswers: ['8'],
        promptLadder: [],
        construct: 'Subtraction word problem',
        difficulty: 'easy',
        gradeBand: '2-3'
      }]
    });
    const html = renderWith({ sessions: [], activeSession: s, onboardingSeen: true, savedProbeTemplates: [] });
    expect(html).toContain('Novel posttest prompt');
  });

  it('summary renders MI gauge + learning-zone snapshot with correct band counts', () => {
    const mk = (itemId, phase, finalCorrect, lvl) => ({
      itemId, phase, promptLevelReached: lvl || 0, studentResponseText: '', examinerObservation: '',
      observationTags: [], supportType: null, finalCorrect, scaffoldLeaked: false,
      scoreAwarded: finalCorrect ? 5 - (lvl || 0) : 0, attemptedAt: '2026-07-12T10:05:00.000Z'
    });
    const s = Object.assign(baseSession(), {
      currentPhase: 'summary',
      posttestForm: 'same-item',
      itemResults: [
        mk('math-e-01', 'pretest', true, 0), mk('math-e-02', 'pretest', false, 0), mk('math-e-03', 'pretest', false, 0),
        mk('math-e-01', 'mediation', true, 0), mk('math-e-02', 'mediation', true, 2), mk('math-e-03', 'mediation', true, 4),
        mk('math-e-01', 'posttest', true, 0), mk('math-e-02', 'posttest', true, 0), mk('math-e-03', 'posttest', false, 0)
      ]
    });
    const html = renderWith({ sessions: [], activeSession: s, onboardingSeen: true, savedProbeTemplates: [] });
    expect(html).toContain('Modifiability Index gauge');
    expect(html).toContain('Evidence coverage');
    expect(html).toContain('Learning-zone snapshot');
    expect(html).toContain('Teachable band (ZPD)');
    expect(html).toContain('interpretation conventions of this tool');
    // Round 2: movement pivot, sensitivity band, and the reopen escape hatch
    expect(html).toContain('Per-item movement');
    expect(html).toContain('▲ gained');   // math-e-02: pre ✗ → post ✓
    expect(html).toContain('Sensitivity:');
    expect(html).toContain('Reopen last item');
  });
  it('renders an incomplete saved record without a fake zero Modifiability Index', () => {
    const incomplete = M.buildIncompleteRecord(Object.assign(baseSession(), {
      itemResults: [{ itemId: 'math-e-01', phase: 'pretest', finalCorrect: true, responseStatus: 'correct', scoreAwarded: 5 }]
    }), 'fatigue', '2026-07-12T10:10:00.000Z');
    const html = renderWith({ sessions: [incomplete], activeSession: null, onboardingSeen: true, savedProbeTemplates: [] }, 'sessions');
    expect(html).toContain('Record');
    expect(html).toContain('Incomplete');
    expect(html).toContain('no interpretation');
    expect(html).not.toContain('+0.00');
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

describe('codename and built-in selection helpers', () => {
  it('parses canonical adjective + animal codenames case-insensitively', () => {
    expect(M.parseCodename('bright fox', ['Bright'], ['Fox'])).toEqual({ adjective: 'Bright', animal: 'Fox' });
    expect(M.parseCodename('real student', ['Bright'], ['Fox'])).toEqual({ adjective: '', animal: '' });
  });

  it('prefers fresh built-in items and stays deterministic for a seed', () => {
    const pool = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
    const first = M.selectBuiltInSessionItems(pool, 2, ['a', 'b'], 42).map((item) => item.id);
    const second = M.selectBuiltInSessionItems(pool, 2, ['a', 'b'], 42).map((item) => item.id);
    expect(first).toEqual(second);
    expect(first).not.toContain('a');
    expect(first).not.toContain('b');
  });
});


describe('posttest, evidence, and privacy helpers', () => {
  it('builds a matched parallel posttest from a transfer twin', () => {
    const item = {
      id: 'math-e-01',
      prompt: 'Original prompt',
      correctAnswer: '7',
      acceptableAnswers: ['seven'],
      transferTwin: { prompt: 'Novel prompt', correctAnswer: '8', acceptableAnswers: ['eight'] }
    };
    const parallel = M.buildParallelPosttestItem(item);
    expect(parallel).toMatchObject({
      id: 'math-e-01',
      prompt: 'Novel prompt',
      correctAnswer: '8',
      acceptableAnswers: ['eight'],
      _isParallelPosttest: true
    });
  });

  it('marks complete sessions as sufficient and identifies missing phases', () => {
    const results = ['pretest', 'mediation', 'posttest'].flatMap((phase) =>
      ['a', 'b', 'c'].map((itemId) => ({ phase, itemId }))
    );
    expect(M.evidenceStatus({
      sessionItemIds: ['a', 'b', 'c'],
      posttestForm: 'matched-parallel',
      itemResults: results
    }).sufficient).toBe(true);
    expect(M.evidenceStatus({
      sessionItemIds: ['a', 'b', 'c'],
      posttestForm: 'matched-parallel',
      itemResults: results.filter((result) => result.phase !== 'posttest')
    }).missingPhases).toEqual(['posttest']);
  });

  it('prunes completed sessions according to the retention window', () => {
    const now = Date.now();
    const kept = { id: 'new', dateCompleted: new Date(now - 2 * 86400000).toISOString() };
    const expired = { id: 'old', dateCompleted: new Date(now - 40 * 86400000).toISOString() };
    const pruned = M.applyRetention({ privacy: { retentionDays: 30 }, sessions: [kept, expired] });
    expect(pruned.sessions.map((session) => session.id)).toEqual(['new']);
  });
});



describe('evidence integrity, response statuses, and redacted exports', () => {
  it('distinguishes non-scorable outcomes from incorrect answers', () => {
    expect(M.normalizeResponseStatus(undefined, false, 'skipped')).toBe('skipped');
    expect(M.normalizeResponseStatus(undefined, false, 'refused')).toBe('refused');
    expect(M.isScorableResponse({ responseStatus: 'skipped', finalCorrect: false })).toBe(false);
    expect(M.isScorableResponse({ responseStatus: 'incorrect', finalCorrect: false })).toBe(true);
  });

  it('requires unique item coverage and flags duplicate or unscored records', () => {
    const phases = ['pretest', 'mediation', 'posttest'];
    const results = phases.flatMap((phase) =>
      ['a', 'b', 'c'].map((itemId) => ({
        phase, itemId,
        finalCorrect: !(phase === 'posttest' && itemId === 'c'),
        responseStatus: phase === 'posttest' && itemId === 'c' ? 'skipped' : 'correct',
        supportType: phase === 'posttest' && itemId === 'c' ? 'skipped' : undefined
      }))
    );    results.push({ phase: 'pretest', itemId: 'a', finalCorrect: true, responseStatus: 'correct' });
    const evidence = M.evidenceStatus({
      sessionItemIds: ['a', 'b', 'c'],
      posttestForm: 'matched-parallel',
      itemResults: results
    });
    expect(evidence.counts.pretest).toBe(3);
    expect(evidence.rawCounts.pretest).toBe(4);
    expect(evidence.dataQualityIssues).toContain('pretest contains duplicate item records');
    expect(evidence.unscoredItemCount).toBe(1);
    expect(evidence.sufficient).toBe(false);
  });

  it('accepts only complete, scorable finalized sessions for restore', () => {
    const itemResults = ['pretest', 'mediation', 'posttest'].flatMap((phase) =>
      ['a', 'b', 'c'].map((itemId) => ({
        phase, itemId, finalCorrect: true, responseStatus: 'correct'
      }))
    );
    const session = {
      id: 'restore-ok',
      modifiabilityIndex: 0.5,
      sessionItemIds: ['a', 'b', 'c'],
      posttestForm: 'matched-parallel',
      itemResults
    };
    expect(M.validateImportedSession(session).valid).toBe(true);
    expect(M.validateImportedSession(Object.assign({}, session, {
      itemResults: itemResults.concat([{ phase: 'posttest', itemId: 'a', finalCorrect: true, responseStatus: 'correct' }])
    })).valid).toBe(false);
  });

  it('archives incomplete evidence without interpretation and accepts it for restore', () => {
    const record = M.buildIncompleteRecord({
      id: 'archive-partial',
      dateStarted: '2026-07-12T10:00:00.000Z',
      currentPhase: 'mediation',
      sessionItemIds: ['a', 'b', 'c'],
      posttestForm: 'matched-parallel',
      itemResults: [
        { itemId: 'a', phase: 'pretest', finalCorrect: true, responseStatus: 'correct', scoreAwarded: 5 },
        { itemId: 'b', phase: 'pretest', finalCorrect: false, responseStatus: 'refused', scoreAwarded: null }
      ]
    }, 'fatigue', '2026-07-12T10:10:00.000Z');
    expect(record).toMatchObject({
      recordStatus: 'incomplete',
      interpretationStatus: 'not-generated',
      incompleteReason: 'fatigue',
      modifiabilityIndex: null,
      pretestSum: null,
      posttestSum: null
    });
    expect(record.modifiabilityTier.label).toBe('Incomplete?no interpretation');
    expect(record.incompleteReasons).toEqual(['fatigue', 'refusal']);
    expect(record.dateCompleted).toBeUndefined();
    expect(M.validateImportedSession(record)).toMatchObject({ valid: true, recordStatus: 'incomplete' });
    expect(M.isSufficientSession(record)).toBe(false);
    expect(M.aggregateItemStatistics([record], 1)).toEqual([]);
    expect(M.buildIncompleteRecord(Object.assign({}, record, { recordStatus: undefined, modifiabilityIndex: 0.4 }), 'other')).not.toBeNull();
  });

  it('stores second-rater agreement and preserves original review timestamps across revisions', () => {
    const first = M.buildSecondRaterReview({
      reviewerCodename: 'Reviewer B', reviewerRole: 'school-psychologist', agreementStatus: 'disagree',
      independentModifiabilityIndex: '0.35', itemDisagreementNotes: 'Item b was scored incorrect by the second rater.',
      resolutionStatus: 'open'
    }, null, '2026-07-12T10:10:00.000Z');
    expect(first.valid).toBe(true);
    expect(first.review).toMatchObject({ reviewerCodename: 'Reviewer B', agreementStatus: 'disagree', independentModifiabilityIndex: 0.35, revision: 1 });
    expect(M.validateSecondRaterReview(first.review)).toMatchObject({ valid: true });
    const revised = M.buildSecondRaterReview({
      reviewerCodename: 'Reviewer B', reviewerRole: 'school-psychologist', agreementStatus: 'disagree',
      independentModifiabilityIndex: '0.4', itemDisagreementNotes: 'Resolved after item-level discussion.',
      resolutionStatus: 'resolved', resolutionRationale: 'Both raters reviewed the item rubric together.'
    }, first.review, '2026-07-12T10:20:00.000Z');
    expect(revised.valid).toBe(true);
    expect(revised.review.startedAt).toBe(first.review.startedAt);
    expect(revised.review.completedAt).toBe(first.review.completedAt);
    expect(revised.review.resolvedAt).toBe('2026-07-12T10:20:00.000Z');
    expect(revised.review.revision).toBe(2);
    expect(M.buildSecondRaterReview({ reviewerCodename: 'Reviewer B', reviewerRole: 'teacher', agreementStatus: 'disagree' }, null, '2026-07-12T10:30:00.000Z').valid).toBe(false);
  });

  it('redacts free text and item prompts while retaining scored summary data', () => {
    const redacted = M.redactSessionForExport({
      id: 'redact-1',
      studentNickname: 'Bright Fox',
      sessionNote: 'Sensitive note',
      intake: { referralReason: 'Sensitive referral' },
      customBankSnapshot: [{ prompt: 'Private prompt' }],
      secondRaterReview: { reviewerCodename: 'Reviewer B', reviewerRole: 'teacher', agreementStatus: 'disagree', independentModifiabilityIndex: 0.35, itemDisagreementNotes: 'Private scoring note', resolutionStatus: 'open', resolutionRationale: '' },
      itemResults: [{
        itemId: 'a',
        phase: 'pretest',
        studentResponseText: 'Private response',
        examinerObservation: 'Private observation',
        responseStatus: 'correct',
        finalCorrect: true,
        scoreAwarded: 5
      }]
    });
    expect(redacted.studentNickname).toBe('redacted');
    expect(redacted.sessionNote).toBeUndefined();
    expect(redacted.intake).toBeUndefined();
    expect(redacted.customBankSnapshot).toBeUndefined();
    expect(redacted.secondRaterReview).toMatchObject({ agreementStatus: 'disagree', independentModifiabilityIndex: 0.35, resolutionStatus: 'open' });
    expect(redacted.secondRaterReview.reviewerCodename).toBeUndefined();
    expect(redacted.secondRaterReview.itemDisagreementNotes).toBeUndefined();
    expect(redacted.itemResults[0].studentResponseText).toBeUndefined();
    expect(redacted.itemResults[0].examinerObservation).toBeUndefined();
    expect(redacted.itemResults[0].scoreAwarded).toBe(5);
    expect(redacted._redacted).toBe(true);
  });
});
describe('quality-aware longitudinal helpers', () => {
  it('excludes explicitly insufficient sessions from longitudinal trend calculations', () => {
    expect(M.isSufficientSession({ modifiabilityIndex: 0.4 })).toBe(true);
    expect(M.isSufficientSession({ modifiabilityIndex: 0.1, evidenceStatus: { sufficient: false } })).toBe(false);
    const trend = M.computeLongitudinalTrend([
      { modifiabilityIndex: 0.4 },
      { modifiabilityIndex: 0.1, evidenceStatus: { sufficient: false } },
      { modifiabilityIndex: 0.6 }
    ]);
    expect(trend.label).toBe('Upward modifiability trajectory');
  });

  it('builds phase rows with recorded and scorable counts', () => {
    const evidence = M.evidenceStatus({
      sessionItemIds: ['a', 'b', 'c'],
      posttestForm: 'matched-parallel',
      itemResults: ['pretest', 'mediation', 'posttest'].flatMap((phase) =>
        ['a', 'b', 'c'].map((itemId) => ({ phase, itemId, finalCorrect: true }))
      )
    });
    expect(M.evidencePhaseRows(evidence).map((row) => row.id)).toEqual(['pretest', 'mediation', 'posttest']);
    expect(M.evidencePhaseRows(evidence)[0]).toMatchObject({ recorded: 3, scorable: 3, needsAttention: false });
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

describe('probe and form version metadata', () => {
  const customItem = {
    id: 'custom-version-1', construct: 'Quantity comparison', difficulty: 'custom', gradeBand: '2-3',
    prompt: 'Which amount is greater?', correctAnswer: '8', acceptableAnswers: ['8'], promptLadder: [],
    transferTwin: { prompt: 'Which amount is larger now?', correctAnswer: '9', acceptableAnswers: ['9'] }
  };

  it('records exact item and answer-key fingerprints while flagging legacy manifests', () => {
    const session = {
      isCustomBank: true, customBankSnapshot: [customItem], sessionItemIds: [customItem.id],
      posttestForm: 'matched-parallel', posttestItemSnapshot: [Object.assign({}, customItem, { prompt: 'Novel prompt', correctAnswer: '9', acceptableAnswers: ['9'] })]
    };
    const metadata = M.buildSessionVersionMetadata(session);
    expect(metadata.probeVersion).toBe('custom-1.0.0');
    expect(metadata.posttestFormVersion).toBe('matched-parallel-1.0.0');
    expect(metadata.legacy).toBe(true);
    expect(metadata.itemManifest[0]).toMatchObject({ itemId: customItem.id, itemVersion: 'custom-1.0.0', posttestItemId: customItem.id });
    const tracked = M.buildSessionVersionMetadata(Object.assign({}, session, { itemVersionManifest: metadata.itemManifest }));
    expect(tracked.legacy).toBe(false);
    expect(M.itemVersionFingerprint(customItem)).not.toBe(M.itemVersionFingerprint(Object.assign({}, customItem, { correctAnswer: '10' })));
  });

  it('flags probe/form revision changes but ignores expected item-set changes', () => {
    const manifest = [{ itemId: 'a', itemVersion: 'built-in-1.0.0', itemFingerprint: 'item-a', posttestItemId: 'a', posttestItemVersion: 'built-in-1.0.0', posttestItemFingerprint: 'item-a-post' }];
    const base = {
      recordStatus: 'complete', modifiabilityIndex: 0.4, evidenceStatus: { sufficient: true },
      sessionItemIds: ['a'], posttestForm: 'matched-parallel', probeVersion: 'built-in-1.0.0',
      posttestFormVersion: 'matched-parallel-1.0.0', itemVersionManifest: manifest
    };
    expect(M.compareSessionVersions([base, Object.assign({}, base, { sessionItemIds: ["b"], itemVersionManifest: [Object.assign({}, manifest[0], { itemId: "b", itemFingerprint: "item-b" })] })])).toMatchObject({ comparable: true, mismatch: false });
    expect(M.compareSessionVersions([base, Object.assign({}, base, { probeVersion: 'built-in-2.0.0' })])).toMatchObject({ comparable: false, mismatch: true });
    expect(M.compareSessionVersions([base, Object.assign({}, base, { itemVersionManifest: undefined })])).toMatchObject({ comparable: false, legacy: true, mismatch: true });
  });
});
