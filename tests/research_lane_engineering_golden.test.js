// Engineering lane (Constraint Forge) golden master — assessment-integrity logic.
//
// Pins the PURE invariants the 2026-06-07 review flagged as unpinned:
//   1. computeParetoDominated — domination direction (minimize vs maximize),
//      strict-vs-equal, and null/incomplete non-comparability.
//   2. hasUnmetSafety — the physical-safety detector (constraint-measured-fail
//      OR every tested run of a physical-safety criterion failing).
//   3. stakeholderTranslatorGate — the SAFETY OVERRIDE: a design claim cannot
//      be labeled "meets_criteria" while a physical-safety criterion is unmet.
//      (This enforcement was added 2026-06-07; before, it was advisory copy.)
//
// Logic only — no React render. Re-baseline is N/A (explicit assertions).

import { describe, it, expect, beforeAll } from 'vitest';
import { setupLane, laneInternals } from './helpers/research_lane_harness.js';

beforeAll(() => setupLane('engineering'));
const E = () => laneInternals('engineering');

// ── computeParetoDominated ────────────────────────────────────────────────
describe('Engineering · computeParetoDominated', () => {
  const concepts = [{ id: 'A' }, { id: 'B' }];
  const cell = (candidateId, criterionId, score) => ({ candidateId, criterionId, score });

  it('maximize: a strictly-better-on-all concept dominates the other', () => {
    const criteria = [{ id: 'c1', direction: 'maximize' }, { id: 'c2', direction: 'maximize' }];
    const matrix = [cell('A', 'c1', 5), cell('A', 'c2', 5), cell('B', 'c1', 3), cell('B', 'c2', 3)];
    expect(E().computeParetoDominated(concepts, criteria, matrix)).toEqual(['B']);
  });

  it('minimize: lower score is better, so the high-cost concept is dominated', () => {
    const criteria = [{ id: 'cost', direction: 'minimize' }];
    const matrix = [cell('A', 'cost', 2), cell('B', 'cost', 5)];
    // A (cost 2) dominates B (cost 5) under minimize.
    expect(E().computeParetoDominated(concepts, criteria, matrix)).toEqual(['B']);
  });

  it('a genuine trade-off (each wins one criterion) dominates nobody', () => {
    const criteria = [{ id: 'c1', direction: 'maximize' }, { id: 'c2', direction: 'maximize' }];
    const matrix = [cell('A', 'c1', 5), cell('A', 'c2', 1), cell('B', 'c1', 1), cell('B', 'c2', 5)];
    expect(E().computeParetoDominated(concepts, criteria, matrix)).toEqual([]);
  });

  it('equal-on-all is NOT domination (needs at least one strict win)', () => {
    const criteria = [{ id: 'c1', direction: 'maximize' }];
    const matrix = [cell('A', 'c1', 3), cell('B', 'c1', 3)];
    expect(E().computeParetoDominated(concepts, criteria, matrix)).toEqual([]);
  });

  it('a missing/null score makes the pair non-comparable (no domination)', () => {
    const criteria = [{ id: 'c1', direction: 'maximize' }, { id: 'c2', direction: 'maximize' }];
    // A would dominate B on c1, but A has no score on c2 → not comparable.
    const matrix = [cell('A', 'c1', 5), cell('B', 'c1', 3), cell('B', 'c2', 3)];
    expect(E().computeParetoDominated(concepts, criteria, matrix)).toEqual([]);
  });
});

// ── hasUnmetSafety ────────────────────────────────────────────────────────
describe('Engineering · hasUnmetSafety', () => {
  it('true when a safety-sourced constraint is measured and failed', () => {
    const j = { constraintMatrix: [{ source: 'safety', measured: 70, passed: false }], criteria: [], testRun: [] };
    expect(E().hasUnmetSafety(j)).toBe(true);
  });

  it('false when the safety constraint passed', () => {
    const j = { constraintMatrix: [{ source: 'safety', measured: 70, passed: true }], criteria: [], testRun: [] };
    expect(E().hasUnmetSafety(j)).toBe(false);
  });

  it('false when the safety constraint has no measurement yet', () => {
    const j = { constraintMatrix: [{ source: 'safety', measured: null, passed: false }], criteria: [], testRun: [] };
    expect(E().hasUnmetSafety(j)).toBe(false);
  });

  it('true when every tested run of a physical-safety criterion failed', () => {
    const j = {
      constraintMatrix: [],
      criteria: [{ id: 'c1', kind: 'physical-safety' }],
      testRun: [{ criterionId: 'c1', passed: false }, { criterionId: 'c1', passed: false }],
    };
    expect(E().hasUnmetSafety(j)).toBe(true);
  });

  it('false when at least one run of the physical-safety criterion passed', () => {
    const j = {
      constraintMatrix: [],
      criteria: [{ id: 'c1', kind: 'physical-safety' }],
      testRun: [{ criterionId: 'c1', passed: false }, { criterionId: 'c1', passed: true }],
    };
    expect(E().hasUnmetSafety(j)).toBe(false);
  });

  it('false on an empty journal', () => {
    expect(E().hasUnmetSafety({})).toBe(false);
  });
});

// ── stakeholderTranslatorGate: safety override ────────────────────────────
describe('Engineering · stakeholderTranslatorGate safety override', () => {
  // Real prose comfortably over the 6_8 floors (rationale 160 / accountability
  // 120 / designClaimText 25) so the gate reaches the safety check.
  const RATIONALE = 'The final insulated tote holds fifty six degrees celsius at ninety minutes which clears the fifty five degree floor by using preheated ceramic plus cork plus foil at a material cost of three dollars forty while staying under two kilograms loaded.';
  const ACCOUNTABILITY = 'If the cafeteria manager reviewed this she would still ask whether it survives five full days a week of preheating cycles, and our prototype was only tested three times so daily wear remains genuinely untested for now.';
  const CLAIM = 'The finished design holds its internal temperature above the required floor for the entire ninety minute window.';

  function baseJournal(overrides) {
    return Object.assign({
      devLevel: '6_8',
      stageNotes: { communicate: { designRationale: RATIONALE, stakeholderAccountabilityStatement: ACCOUNTABILITY } },
      designClaims: [
        { id: 'dc1', text: CLAIM, label: 'meets_criteria' },
        { id: 'dc2', text: CLAIM + ' It was also affordable.', label: 'partial' },
      ],
      constraintMatrix: [],
      criteria: [],
      testRun: [],
      buildLog: [],
    }, overrides || {});
  }

  it('REJECTS a meets_criteria claim while a physical-safety constraint is unmet', () => {
    const j = baseJournal({ constraintMatrix: [{ source: 'safety', measured: 70, passed: false }] });
    const res = E().stakeholderTranslatorGate(j);
    expect(res.ok).toBe(false);
    expect(res.bypass_signals).toContain('safety_override_meets_label');
  });

  it('does NOT fire the safety override when no safety constraint is unmet (proceeds past it)', () => {
    // meets_criteria present, but the safety constraint passed → safety check is
    // skipped and the gate falls through to the next requirement (iteration).
    const j = baseJournal({ constraintMatrix: [{ source: 'safety', measured: 70, passed: true }] });
    const res = E().stakeholderTranslatorGate(j);
    expect(res.ok).toBe(false);
    expect(res.bypass_signals).not.toContain('safety_override_meets_label');
  });

  it('does NOT fire the safety override when no claim is labeled meets_criteria', () => {
    const j = baseJournal({
      constraintMatrix: [{ source: 'safety', measured: 70, passed: false }],
      designClaims: [
        { id: 'dc1', text: CLAIM, label: 'partial' },
        { id: 'dc2', text: CLAIM + ' It was also affordable.', label: 'not_yet' },
      ],
    });
    const res = E().stakeholderTranslatorGate(j);
    expect(res.ok).toBe(false);
    expect(res.bypass_signals).not.toContain('safety_override_meets_label');
  });
});
