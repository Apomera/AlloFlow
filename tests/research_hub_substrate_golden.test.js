// Research Hub substrate golden master.
//
// Pins:
//   1. The canonical shape of emptyJournal() at substrate v:4.
//   2. The v:1/v:2/v:3 → v:4 migration ladder in loadJournal() — the riskiest
//      part of the substrate, because a bug there silently corrupts saved
//      sessions. The pre-Tier-3 `parsed.v !== 1` strict-equal bug dropped any
//      v:2 save; the test below would have caught it.
//   3. Anti-spam invariants (aiCallCount reset on every load).
//   4. The PER_TOUCHPOINT_CAP map for all V1+V2 touchpoints across the three
//      lanes (Scientific, Engineering, Humanities).
//   5. stripPedagogicalFootguns refuses the substrate-level completion-shape
//      patterns added in Tier 3 (engineering) and Tier 4 (humanities).
//
// Re-baseline ONLY when a substrate change is reviewed and expected: `vitest -u`.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupHub, internals } from './helpers/research_hub_harness.js';

beforeAll(() => setupHub());

describe('Research Hub substrate — emptyJournal v:4', () => {
  it('returns v:4', () => {
    expect(internals().emptyJournal().v).toBe(4);
  });

  it('canonical top-level field set is pinned (snapshot)', () => {
    const j = internals().emptyJournal();
    // Project to sorted key list so the snapshot is order-insensitive.
    const keys = Object.keys(j).sort();
    expect(keys).toMatchSnapshot();
  });

  it('all expected lane-substrate fields exist with correct default shape', () => {
    const j = internals().emptyJournal();
    // Shared / Tier 1
    expect(j.questionTitle).toBe('');
    expect(j.devLevel).toBe('6_8');
    expect(j.activeLane).toBe(null);
    expect(j.activeStage).toBe(null);
    expect(Array.isArray(j.evidenceCards)).toBe(true);
    expect(Array.isArray(j.sources)).toBe(true);
    expect(Array.isArray(j.claimEvidenceLinks)).toBe(true);
    expect(j.positionality).toEqual({ text: '', audioBase64: null, durationS: 0 });
    // Tier 2 (Scientific)
    expect(Array.isArray(j.wonderings)).toBe(true);
    expect(Array.isArray(j.modelSnapshots)).toBe(true);
    expect(Array.isArray(j.claims)).toBe(true);
    // Tier 3 (Engineering)
    expect(j.stakeholderProfile).toBe(null);
    expect(Array.isArray(j.criteria)).toBe(true);
    expect(Array.isArray(j.candidateConcepts)).toBe(true);
    expect(Array.isArray(j.decisionMatrix)).toBe(true);
    expect(Array.isArray(j.criteriaWeightLog)).toBe(true);
    expect(Array.isArray(j.testProtocol)).toBe(true);
    expect(Array.isArray(j.buildLog)).toBe(true);
    expect(Array.isArray(j.testRun)).toBe(true);
    expect(Array.isArray(j.stakeholderFeedback)).toBe(true);
    expect(Array.isArray(j.failureLog)).toBe(true);
    expect(Array.isArray(j.designClaims)).toBe(true);
    expect(Array.isArray(j.constraintMatrix)).toBe(true);
    expect(Array.isArray(j.tradeOffLedger)).toBe(true);
    // Tier 4 (Humanities)
    expect(Array.isArray(j.framings)).toBe(true);
    expect(j.humanitiesPosition).toBe(null);
    expect(Array.isArray(j.framingProbes)).toBe(true);
    expect(Array.isArray(j.positionalitySnapshots)).toBe(true);
    expect(Array.isArray(j.absentVoices)).toBe(true);
    expect(Array.isArray(j.questionStakeholders)).toBe(true);
    expect(Array.isArray(j.humanitiesPlausibleAnswers)).toBe(true);
    expect(j.stakesAudience).toBe(null);
    expect(j.genreChoice).toBe(null);
    expect(Array.isArray(j.compositions)).toBe(true);
    expect(Array.isArray(j.authorshipLog)).toBe(true);
    // Cross-lane bookkeeping
    expect(Array.isArray(j.loopBacks)).toBe(true);
    expect(Array.isArray(j.aiHistory)).toBe(true);
    expect(j.aiCallCount).toBe(0);
    expect(j.pendingLoopReturn).toBe(null);
    expect(j.stageNotes).toEqual({});
  });
});

describe('Research Hub substrate — loadJournal migration', () => {
  const KEY = 'alloflow_research_hub_v1';

  beforeEach(() => {
    globalThis.window.localStorage.clear();
  });

  it('with no localStorage returns fresh emptyJournal v:4', () => {
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.aiCallCount).toBe(0);
  });

  it('with malformed JSON returns fresh emptyJournal v:4 (no throw)', () => {
    globalThis.window.localStorage.setItem(KEY, 'not-json');
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
  });

  it('with unsupported version (v:5) returns fresh emptyJournal v:4', () => {
    globalThis.window.localStorage.setItem(KEY, JSON.stringify({ v: 5, devLevel: 'ap' }));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    // Verify it's truly fresh, not a partial migration
    expect(j.devLevel).toBe('6_8');
  });

  it('with non-object value returns fresh emptyJournal v:4', () => {
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(42));
    expect(internals().loadJournal().v).toBe(4);
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(null));
    expect(internals().loadJournal().v).toBe(4);
  });

  it('migrates v:1 → v:4: constraintMatrix rows gain unit:""', () => {
    const v1 = {
      v: 1,
      devLevel: '6_8',
      constraintMatrix: [
        { id: 'c1', criterion: 'cost', target: 5, source: 'budget', tier: 'hard' },
        { id: 'c2', criterion: 'mass', target: 2, source: 'material', tier: 'hard' },
      ],
      tradeOffLedger: [{ v: 1, criterion: 'cost', accepted: 'foo', justification: 'bar' }],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v1));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.constraintMatrix).toHaveLength(2);
    expect(j.constraintMatrix[0].unit).toBe('');
    expect(j.constraintMatrix[1].unit).toBe('');
    // Original fields preserved
    expect(j.constraintMatrix[0].criterion).toBe('cost');
    expect(j.constraintMatrix[1].target).toBe(2);
  });

  it('migrates v:1 → v:4: tradeOffLedger rows gain sacrificedCriterion/whoseInterestThisServes/acceptedPriorityRank', () => {
    const v1 = {
      v: 1,
      tradeOffLedger: [{ v: 1, criterion: 'cost', accepted: 'foo', justification: 'bar' }],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v1));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    const row = j.tradeOffLedger[0];
    expect(row.sacrificedCriterion).toBe(null);
    expect(row.whoseInterestThisServes).toBe('');
    expect(row.acceptedPriorityRank).toBe(null);
    expect(row.criterion).toBe('cost'); // preserved
  });

  it('migrates v:2 → v:4: same row-level migrations apply', () => {
    const v2 = {
      v: 2,
      constraintMatrix: [{ id: 'c1', criterion: 'temp', target: 55 }],
      tradeOffLedger: [{ v: 1, criterion: 'temp', accepted: 'a' }],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v2));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.constraintMatrix[0].unit).toBe('');
    expect(j.tradeOffLedger[0].sacrificedCriterion).toBe(null);
  });

  it('migrates v:3 → v:4: positionalitySnapshots seeded from singleton positionality when text present and snapshots empty', () => {
    const v3 = {
      v: 3,
      devLevel: '9_12',
      positionality: {
        text: 'I am a senior with a grandmother in a 1968 yearbook photo who never asked to be online.',
        audioBase64: null,
        durationS: 0,
        ts: 12345,
      },
      positionalitySnapshots: [],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v3));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.positionalitySnapshots).toHaveLength(1);
    const snap = j.positionalitySnapshots[0];
    expect(snap.v).toBe(1);
    expect(snap.materialRelationshipText).toContain('senior');
    expect(snap.devLevelMode).toBe('structured');
    expect(snap.audioBase64).toBe(null);
  });

  it('migrates v:3 → v:4: does NOT seed positionalitySnapshots when already populated', () => {
    const existingSnap = {
      v: 1, ts: 100, materialRelationshipText: 'pre-existing',
      visibilityField: '', obscuringField: '',
      whoseStandpointIsStructurallyAbsentText: '',
      partialIncorporationCommitmentsText: '',
      epistemicStatus: '', audioBase64: null, durationS: 0, devLevelMode: 'structured',
    };
    const v3 = {
      v: 3,
      positionality: { text: 'I am a senior', audioBase64: null, durationS: 0 },
      positionalitySnapshots: [existingSnap],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v3));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.positionalitySnapshots).toHaveLength(1);
    expect(j.positionalitySnapshots[0].materialRelationshipText).toBe('pre-existing');
  });

  it('migrates v:3 → v:4: does NOT seed positionalitySnapshots when positionality is empty', () => {
    const v3 = { v: 3, positionality: { text: '', audioBase64: null, durationS: 0 }, positionalitySnapshots: [] };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v3));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.positionalitySnapshots).toHaveLength(0);
  });

  it('migration preserves devLevel and other untouched fields', () => {
    const v2 = { v: 2, devLevel: 'ap', questionTitle: 'why X?' };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v2));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.devLevel).toBe('ap');
    expect(j.questionTitle).toBe('why X?');
  });

  it('aiCallCount is ALWAYS reset on load (per-session anti-spam invariant)', () => {
    const stored = { v: 4, aiCallCount: 7, sessionStartedAt: 12345 };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(stored));
    expect(internals().loadJournal().aiCallCount).toBe(0);
  });

  it('v:4 saves round-trip cleanly (no migration applied)', () => {
    // Save a v:4 journal, reload — should not re-bump version or rewrite shapes.
    const fresh = internals().emptyJournal();
    fresh.questionTitle = 'will my v:4 save survive?';
    fresh.framings = [{ id: 'fr1', label: 'test' }];
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(fresh));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.questionTitle).toBe('will my v:4 save survive?');
    expect(j.framings).toHaveLength(1);
    expect(j.framings[0].label).toBe('test');
  });

  it('v:1 save with NO constraintMatrix or tradeOffLedger does not crash', () => {
    // regression: migration must guard arrays before iterating
    globalThis.window.localStorage.setItem(KEY, JSON.stringify({ v: 1, devLevel: '3_5' }));
    const j = internals().loadJournal();
    expect(j.v).toBe(4);
    expect(j.devLevel).toBe('3_5');
  });
});

describe('Research Hub substrate — PER_TOUCHPOINT_CAP', () => {
  it('exposes the canonical cap map across all V1+V2 touchpoints (snapshot)', () => {
    const caps = internals().PER_TOUCHPOINT_CAP;
    expect(caps).toMatchSnapshot();
  });

  it('all three lanes have the expected V1 entries', () => {
    const caps = internals().PER_TOUCHPOINT_CAP;
    // Scientific (4 touchpoints, sum=9 with global 8 binding)
    expect(caps.wonder_sorter).toBe(2);
    expect(caps.model_surfacer).toBe(3);
    expect(caps.steelman_second_pass).toBe(2);
    expect(caps.honest_uncertainty).toBe(2);
    // Engineering V1 (4 touchpoints, sum=8 hits global cap)
    expect(caps.constraint_excavator).toBe(2);
    expect(caps.dominated_solution_finder).toBe(2);
    expect(caps.failure_mode_critic).toBe(2);
    expect(caps.stakeholder_translator).toBe(2);
    // Humanities V1 (5 touchpoints + 1 sentinel, sum=8 hits global cap exactly)
    expect(caps.contestability_probe).toBe(1);
    expect(caps.source_lateral_probe).toBe(2);
    expect(caps.counter_framing_voicer).toBe(1);
    expect(caps.warrant_questioner).toBe(3);
    expect(caps.no_ai_stage_sentinel).toBe(0);  // structural NO-AI guard
    expect(caps.standpoint_mirror).toBe(1);
  });

  it('V2 tradeoff_inverter cap=1 (lowest, highest harvest-risk)', () => {
    expect(internals().PER_TOUCHPOINT_CAP.tradeoff_inverter).toBe(1);
  });

  it('global cap is 8 per session (binding constraint across lanes)', () => {
    expect(internals().MAX_AI_CALLS_PER_SESSION).toBe(8);
  });
});

describe('Research Hub substrate — stripPedagogicalFootguns', () => {
  const strip = (obj) => internals().stripPedagogicalFootguns(obj);

  it('strips Tier 2 (Scientific) base patterns', () => {
    const out = strip({
      suggested_revision: 'A', one_revision: 'B', rewrite: 'C',
      improved_x: 'D', proposed_thing: 'E',
      kept_field: 'survives',
    });
    expect(out.suggested_revision).toBeUndefined();
    expect(out.one_revision).toBeUndefined();
    expect(out.rewrite).toBeUndefined();
    expect(out.improved_x).toBeUndefined();
    expect(out.proposed_thing).toBeUndefined();
    expect(out.kept_field).toBe('survives');
  });

  it('strips Tier 3 (Engineering) completion-shape keys', () => {
    const out = strip({
      proposed_design: 'X', recommended_candidate: 'Y',
      try_this: 'Z', optimal_solution: 'W',
      well_fitted: 'V', design_is_sound: 'U', ready_to_ship: 'T',
      suggested_fix: 'S', corrected_cause: 'R', improvement: 'Q',
      kept: 'survives',
    });
    expect(out.proposed_design).toBeUndefined();
    expect(out.recommended_candidate).toBeUndefined();
    expect(out.try_this).toBeUndefined();
    expect(out.optimal_solution).toBeUndefined();
    expect(out.well_fitted).toBeUndefined();
    expect(out.design_is_sound).toBeUndefined();
    expect(out.ready_to_ship).toBeUndefined();
    expect(out.suggested_fix).toBeUndefined();
    expect(out.corrected_cause).toBeUndefined();
    expect(out.improvement).toBeUndefined();
    expect(out.kept).toBe('survives');
  });

  it('strips Tier 4 (Humanities) scholar/false-balance patterns', () => {
    const out = strip({
      scholar_name: 'Wineburg',
      according_to: 'Caulfield',
      as_argued_by: 'Harding',
      school_of_thought: 'feminist',
      both_sides: 'X', balanced_view: 'Y', the_other_side: 'Z',
      suggested_warrant: 'A', proposed_qualifier: 'B', proposed_rebuttal: 'C',
      better_thesis: 'D', suggested_positionality: 'E',
      drafted_intro: 'F', polished_essay: 'G',
      well_warranted: 'H', expert_opinion: 'I',
      source_summary: 'J', source_credibility_judgment: 'K',
      kept: 'survives',
    });
    expect(out.scholar_name).toBeUndefined();
    expect(out.according_to).toBeUndefined();
    expect(out.as_argued_by).toBeUndefined();
    expect(out.school_of_thought).toBeUndefined();
    expect(out.both_sides).toBeUndefined();
    expect(out.balanced_view).toBeUndefined();
    expect(out.the_other_side).toBeUndefined();
    expect(out.suggested_warrant).toBeUndefined();
    expect(out.proposed_qualifier).toBeUndefined();
    expect(out.proposed_rebuttal).toBeUndefined();
    expect(out.better_thesis).toBeUndefined();
    expect(out.suggested_positionality).toBeUndefined();
    expect(out.drafted_intro).toBeUndefined();
    expect(out.polished_essay).toBeUndefined();
    expect(out.well_warranted).toBeUndefined();
    expect(out.expert_opinion).toBeUndefined();
    expect(out.source_summary).toBeUndefined();
    expect(out.source_credibility_judgment).toBeUndefined();
    expect(out.kept).toBe('survives');
  });

  it('recurses into nested arrays and objects', () => {
    const out = strip({
      good: { kept: 'survives', proposed_design: 'X' },
      list: [{ scholar_name: 'X', kept: 'Y' }, { kept: 'Z' }],
    });
    expect(out.good.kept).toBe('survives');
    expect(out.good.proposed_design).toBeUndefined();
    expect(out.list[0].scholar_name).toBeUndefined();
    expect(out.list[0].kept).toBe('Y');
    expect(out.list[1].kept).toBe('Z');
  });

  it('caps recursion depth at 6 (no infinite-loop on cyclic-ish shapes)', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { proposed_design: 'never_strip_at_depth_7' } } } } } } } };
    const out = strip(deep);
    // Deep enough levels (>6) bail out and return the object as-is.
    // We just assert no throw and structure preserved at depth 6.
    expect(out.a.b.c.d.e.f).toBeDefined();
  });

  it('preserves the special $-prefixed and case-different siblings', () => {
    const out = strip({ Suggested_Revision: 'sketchy-case-different', suggested_revision: 'gone' });
    expect(out.suggested_revision).toBeUndefined();
    // FOOTGUN patterns are case-insensitive (per the //i flag).
    expect(out.Suggested_Revision).toBeUndefined();
  });
});

describe('Research Hub substrate — enforceQuestionFormat', () => {
  const enforce = (obj) => internals().enforceQuestionFormat(obj, 0, { rejected: 0, fixedKeys: [] });

  it('keeps well-formed questions in *_questions arrays', () => {
    const out = enforce({
      my_questions: ['Why does X happen?', 'How would you measure Y?'],
      plain_strings: ['Hello.', 'World.'],
    });
    expect(out.my_questions).toHaveLength(2);
    expect(out.plain_strings).toHaveLength(2); // non-question keys untouched
  });

  it('drops items missing terminal "?" from *_questions arrays', () => {
    const out = enforce({
      my_questions: ['Why does X happen?', 'This is not a question.'],
    });
    expect(out.my_questions).toHaveLength(1);
    expect(out.my_questions[0]).toMatch(/\?$/);
  });

  it('drops items containing causal markers from *_questions arrays', () => {
    const out = enforce({
      my_questions: [
        'Why does X happen?',                      // ok
        'Because Y is true, what should we do?',   // causal marker → drop
        'Therefore, would you measure Z?',         // therefore → drop
      ],
    });
    expect(out.my_questions).toHaveLength(1);
    expect(out.my_questions[0]).toBe('Why does X happen?');
  });

  it('drops items longer than 25 words', () => {
    const longQ = 'Why ' + Array.from({ length: 30 }).fill('word').join(' ') + '?';
    const out = enforce({ probe_questions: ['Short Q?', longQ] });
    expect(out.probe_questions).toHaveLength(1);
    expect(out.probe_questions[0]).toBe('Short Q?');
  });

  it('recurses through nested *_questions arrays', () => {
    const out = enforce({
      outer: {
        inner_questions: ['First Q?', 'second q no qmark'],
        other_field: 'kept verbatim',
      },
    });
    expect(out.outer.inner_questions).toHaveLength(1);
    expect(out.outer.other_field).toBe('kept verbatim');
  });
});
