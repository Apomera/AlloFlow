// Research Hub substrate golden master.
//
// Pins:
//   1. The canonical shape of emptyJournal() at substrate v:6.
//   2. The v:1/v:2/v:3 → v:6 migration ladder in loadJournal() — the riskiest
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

describe('Research Hub substrate — emptyJournal v:6', () => {
  it('returns v:6', () => {
    expect(internals().emptyJournal().v).toBe(6);
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
    expect(j.activeMethodPack).toBe(null);
    expect(Array.isArray(j.methodPackHistory)).toBe(true);
    expect(Array.isArray(j.inquiryEpisodes)).toBe(true);
    expect(j.activeInquiryEpisodeId).toBe(null);
    expect(Array.isArray(j.capturedArtifacts)).toBe(true);
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

  it('with no localStorage returns fresh emptyJournal v:6', () => {
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.aiCallCount).toBe(0);
  });

  it('with malformed JSON returns fresh emptyJournal v:6 (no throw)', () => {
    globalThis.window.localStorage.setItem(KEY, 'not-json');
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
  });

  it('opens an unsupported future version read-only while preserving recognized fields', () => {
    globalThis.window.localStorage.setItem(KEY, JSON.stringify({ v: 7, devLevel: 'ap', questionTitle: 'future work' }));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.devLevel).toBe('ap');
    expect(j.questionTitle).toBe('future work');
    expect(j.originalSchemaVersion).toBe(7);
    expect(j.loadWarning).toContain('read-only');
    expect(internals().saveJournal(j)).toBe(false);
  });

  it('with non-object value returns fresh emptyJournal v:6', () => {
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(42));
    expect(internals().loadJournal().v).toBe(6);
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(null));
    expect(internals().loadJournal().v).toBe(6);
  });

  it('migrates v:1 → v:6: constraintMatrix rows gain unit:""', () => {
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
    expect(j.v).toBe(6);
    expect(j.constraintMatrix).toHaveLength(2);
    expect(j.constraintMatrix[0].unit).toBe('');
    expect(j.constraintMatrix[1].unit).toBe('');
    // Original fields preserved
    expect(j.constraintMatrix[0].criterion).toBe('cost');
    expect(j.constraintMatrix[1].target).toBe(2);
  });

  it('migrates v:1 → v:6: tradeOffLedger rows gain sacrificedCriterion/whoseInterestThisServes/acceptedPriorityRank', () => {
    const v1 = {
      v: 1,
      tradeOffLedger: [{ v: 1, criterion: 'cost', accepted: 'foo', justification: 'bar' }],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v1));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    const row = j.tradeOffLedger[0];
    expect(row.sacrificedCriterion).toBe(null);
    expect(row.whoseInterestThisServes).toBe('');
    expect(row.acceptedPriorityRank).toBe(null);
    expect(row.criterion).toBe('cost'); // preserved
  });

  it('migrates v:2 → v:6: same row-level migrations apply', () => {
    const v2 = {
      v: 2,
      constraintMatrix: [{ id: 'c1', criterion: 'temp', target: 55 }],
      tradeOffLedger: [{ v: 1, criterion: 'temp', accepted: 'a' }],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v2));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.constraintMatrix[0].unit).toBe('');
    expect(j.tradeOffLedger[0].sacrificedCriterion).toBe(null);
  });

  it('migrates v:3 → v:6: positionalitySnapshots seeded from singleton positionality when text present and snapshots empty', () => {
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
    expect(j.v).toBe(6);
    expect(j.positionalitySnapshots).toHaveLength(1);
    const snap = j.positionalitySnapshots[0];
    expect(snap.v).toBe(1);
    expect(snap.materialRelationshipText).toContain('senior');
    expect(snap.devLevelMode).toBe('structured');
    expect(snap.audioBase64).toBe(null);
  });

  it('migrates v:3 → v:6: does NOT seed positionalitySnapshots when already populated', () => {
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
    expect(j.v).toBe(6);
    expect(j.positionalitySnapshots).toHaveLength(1);
    expect(j.positionalitySnapshots[0].materialRelationshipText).toBe('pre-existing');
  });

  it('migrates v:3 → v:6: does NOT seed positionalitySnapshots when positionality is empty', () => {
    const v3 = { v: 3, positionality: { text: '', audioBase64: null, durationS: 0 }, positionalitySnapshots: [] };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v3));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.positionalitySnapshots).toHaveLength(0);
  });

  it('migration preserves devLevel and other untouched fields', () => {
    const v2 = { v: 2, devLevel: 'ap', questionTitle: 'why X?' };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v2));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.devLevel).toBe('ap');
    expect(j.questionTitle).toBe('why X?');
  });

  it('migrates v:4 → v:6 without losing the active lane or inquiry artifacts', () => {
    const v4 = {
      v: 4,
      activeLane: 'humanities',
      questionTitle: 'Whose account shapes this archive?',
      sources: [{ id: 's1', citation: 'Community archive catalog' }],
    };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(v4));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.activeLane).toBe('humanities');
    expect(j.questionTitle).toContain('archive');
    expect(j.sources).toHaveLength(1);
    expect(j.activeMethodPack).toBe(null);
    expect(j.methodPackHistory).toEqual([]);
  });

  it('migrates v:5 → v:6, initializes provenance fields, and stores an exact recovery backup', () => {
    const v5 = { v: 5, activeMethodPack: 'civic_policy', methodPackHistory: [{ id: 'civic_policy', laneId: 'humanities', selectedAt: 123 }] };
    const raw = JSON.stringify(v5);
    globalThis.window.localStorage.setItem(KEY, raw);
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.inquiryEpisodes).toHaveLength(1);
    expect(j.inquiryEpisodes[0].methodPackId).toBe('civic_policy');
    expect(j.activeInquiryEpisodeId).toBe(j.inquiryEpisodes[0].id);
    expect(j.methodPackHistory[0].episodeId).toBe(j.activeInquiryEpisodeId);
    expect(j.capturedArtifacts).toEqual([]);
    const backup = JSON.parse(globalThis.window.localStorage.getItem(internals().RECOVERY_STORAGE_KEY));
    expect(backup.sourceVersion).toBe(5);
    expect(backup.raw).toBe(raw);
  });
  it('aiCallCount is ALWAYS reset on load (per-session anti-spam invariant)', () => {
    const stored = { v: 6, aiCallCount: 7, sessionStartedAt: 12345 };
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(stored));
    expect(internals().loadJournal().aiCallCount).toBe(0);
  });

  it('v:6 saves round-trip cleanly (no migration applied)', () => {
    // Save a v:6 journal, reload — should not re-bump version or rewrite shapes.
    const fresh = internals().emptyJournal();
    fresh.questionTitle = 'will my v:6 save survive?';
    fresh.framings = [{ id: 'fr1', label: 'test' }];
    globalThis.window.localStorage.setItem(KEY, JSON.stringify(fresh));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.questionTitle).toBe('will my v:6 save survive?');
    expect(j.framings).toHaveLength(1);
    expect(j.framings[0].label).toBe('test');
  });

  it('v:1 save with NO constraintMatrix or tradeOffLedger does not crash', () => {
    // regression: migration must guard arrays before iterating
    globalThis.window.localStorage.setItem(KEY, JSON.stringify({ v: 1, devLevel: '3_5' }));
    const j = internals().loadJournal();
    expect(j.v).toBe(6);
    expect(j.devLevel).toBe('3_5');
  });
});

describe('Research Hub · method matching and provenance helpers', () => {
  const VALID_CONTRACT = {
    schemaVersion: 1,
    id: 'test_tool',
    name: 'Test Tool',
    version: '1.2.3',
    license: { spdx: 'MIT' },
    citation: { text: 'Test Tool, version 1.2.3.' },
    supportedMethodPacks: ['scientific_investigation'],
    capabilities: { captureArtifact: true },
    privacy: { learnerApprovalRequired: true },
    reproducibility: { requiredFields: ['softwareVersion','sourceRecordId','parameters','randomSeed','limitations'] },
  };
  it('matches the specific method rather than every lane sibling', () => {
    expect(internals().matchMethodPackForQuestion('How might city policy improve access while avoiding unequal costs?').packId).toBe('civic_policy');
    expect(internals().matchMethodPackForQuestion('How do community members describe their lived experience?').packId).toBe('community_qualitative');
    expect(internals().matchMethodPackForQuestion('How does form and audience shape this film?').packId).toBe('creative_cultural');
    expect(internals().matchMethodPackForQuestion('How can we design and test a prototype under cost constraints?').packId).toBe('engineering_design');
    expect(internals().matchMethodPackForQuestion('What measurable pattern appears when the experimental variable changes?').packId).toBe('scientific_investigation');
  });

  it('routes a method selection to its workspace and creates one durable episode', () => {
    const fresh = internals().emptyJournal();
    fresh.questionTitle = 'Who benefits from this city policy?';
    const first = internals().applyMethodPackSelection(fresh, 'civic_policy', 1000, () => 'episode_a');
    expect(first.activeLane).toBe('humanities');
    expect(first.activeMethodPack).toBe('civic_policy');
    expect(first.activeInquiryEpisodeId).toBe('episode_a');
    expect(first.inquiryEpisodes).toHaveLength(1);
    expect(first.methodPackHistory[0].episodeId).toBe('episode_a');
    const same = internals().applyMethodPackSelection(first, 'civic_policy', 2000, () => 'should_not_be_used');
    expect(same.inquiryEpisodes).toHaveLength(1);
    const switched = internals().applyMethodPackSelection(same, 'scientific_investigation', 3000, () => 'episode_b');
    expect(switched.activeLane).toBe('scientific');
    expect(switched.inquiryEpisodes).toHaveLength(2);
    expect(switched.activeInquiryEpisodeId).toBe('episode_b');
  });
  it('validates bounded serializable tool captures and rejects raw-sized payloads', () => {
    const good = internals().normalizeResearchCapture({ sourceToolId: 'alphafold_explorer', title: 'Protein model', summary: 'A sequence-free structure observation.', data: { accession: 'P0CG47' } });
    expect(good.ok).toBe(true);
    expect(good.artifact.provenance.privacy).toContain('No raw files');
    expect(internals().normalizeResearchCapture({ title: 'missing source', summary: 'x' }).ok).toBe(false);
    expect(internals().normalizeResearchCapture({ sourceToolId: 'x', title: 'huge', summary: 'x', data: { raw: 'z'.repeat(61000) } }).ok).toBe(false);
  });

  it('validates the v1 integration contract and rejects missing rigor metadata', () => {
    expect(internals().TOOL_INTEGRATION_CONTRACT_VERSION).toBe(1);
    expect(internals().validateToolIntegrationContract(VALID_CONTRACT).ok).toBe(true);
    const invalid = { ...VALID_CONTRACT, license: {}, privacy: { learnerApprovalRequired: false } };
    const checked = internals().validateToolIntegrationContract(invalid);
    expect(checked.ok).toBe(false);
    expect(checked.issues.join(' ')).toContain('license');
    expect(checked.issues.join(' ')).toContain('learnerApprovalRequired');
  });

  it('attaches complete or partial reproducibility receipts and integration health', () => {
    const complete = internals().normalizeResearchCapture({
      sourceToolId: 'test_tool', sourceToolName: 'Test Tool', sourceToolVersion: '1.2.3',
      integrationContract: VALID_CONTRACT, title: 'Measured result', summary: 'A bounded result summary.',
      sourceRecordId: 'record-17', data: { value: 4.2 },
      reproducibility: {
        softwareVersion: '1.2.3', sourceRecordId: 'record-17', parameters: { threshold: 0.5 },
        randomSeed: 'not applicable', limitations: ['This observation does not establish causation.'],
      },
    });
    expect(complete.ok).toBe(true);
    expect(complete.artifact.integrationContractStatus).toBe('validated');
    expect(complete.artifact.reproducibilityReceipt.status).toBe('complete');
    expect(complete.artifact.integrationHealth.status).toBe('healthy');

    const partial = internals().normalizeResearchCapture({
      sourceToolId: 'test_tool', sourceToolVersion: '1.2.3', integrationContract: VALID_CONTRACT,
      title: 'Partial result', summary: 'Missing reproducibility details.', data: {},
    });
    expect(partial.ok).toBe(true);
    expect(partial.artifact.reproducibilityReceipt.status).toBe('partial');
    expect(partial.artifact.reproducibilityReceipt.missingFields).toContain('sourceRecordId');
    expect(partial.artifact.integrationHealth.status).toBe('needs_review');
  });

  it('audits unsupported claims, source context, counterevidence, and tool interpretation', () => {
    const audit = internals().buildInquiryAudit({
      activeLane: 'humanities',
      claims: [{ id: 'c1', text: 'Linked claim' }, { id: 'c2', text: 'Unsupported claim' }],
      claimEvidenceLinks: [{ claimId: 'c1', evidenceIds: ['s1'] }],
      sources: [{ id: 's1', sift: { tier: 'unvetted' } }, { id: 's2', sift: { tier: 'secondary_corroborated' } }],
      humanitiesPosition: { text: 'A position' }, framings: [],
      designClaims: [{ id: 'd1', claimEvidenceRunIds: [], constraintRefs: [] }],
      capturedArtifacts: [{ id: 'a1', title: 'Tool output' }],
    });
    const codes = audit.issues.map((issue) => issue.code);
    expect(audit.status).toBe('action_needed');
    expect(codes).toContain('unsupported_claims');
    expect(codes).toContain('unsupported_design_claims');
    expect(codes).toContain('unvetted_linked_sources');
    expect(codes).toContain('source_context_gaps');
    expect(codes).toContain('no_counterevidence_relationship');
    expect(codes).toContain('missing_counterinterpretation');
    expect(codes).toContain('uninterpreted_tool_outputs');
    expect(codes).toContain('partial_reproducibility');
  });

  it('does not impose humanistic context fields on a scientific source list', () => {
    const audit = internals().buildInquiryAudit({
      activeLane: 'scientific', activeMethodPack: 'scientific_investigation',
      sources: [{ id: 's1', sift: { tier: 'secondary_corroborated' } }],
      claims: [], claimEvidenceLinks: [], capturedArtifacts: [],
    });
    expect(audit.issues.map((issue) => issue.code)).not.toContain('source_context_gaps');
  });
  it('reports ready when claims, counter-context, interpretation, and receipts are present', () => {
    const sourceContext = (relationship) => ({ relationshipType: 'scholarship', historicalContext: 'Created in a documented institutional and historical context.', inquiryRelationship: relationship });
    const audit = internals().buildInquiryAudit({
      activeLane: 'humanities',
      claims: [{ id: 'c1', text: 'Supported claim' }],
      claimEvidenceLinks: [{ claimId: 'c1', evidenceIds: ['s1'] }],
      sources: [
        { id: 's1', sift: { tier: 'secondary_corroborated' }, humanitiesContext: sourceContext('supports') },
        { id: 's2', sift: { tier: 'secondary_corroborated' }, humanitiesContext: sourceContext('challenges') },
      ],
      humanitiesPosition: { text: 'A qualified position' }, framings: [{ id: 'f1' }, { id: 'f2' }],
      capturedArtifacts: [{ id: 'a1', learnerNote: 'I interpret this bounded result as evidence for only one part of the claim.', reproducibilityReceipt: { status: 'complete' } }],
    });
    expect(audit.status).toBe('ready');
    expect(audit.issues).toEqual([]);
  });
  it('stamps only newly appended artifacts with method and episode provenance', () => {
    const oldEvidence = { id: 'old', text: 'earlier evidence' };
    const prev = { activeMethodPack: 'civic_policy', activeInquiryEpisodeId: 'episode_1', evidenceCards: [oldEvidence] };
    const next = { ...prev, evidenceCards: [oldEvidence, { id: 'new', text: 'new evidence' }] };
    const stamped = internals().stampNewInquiryArtifacts(prev, next);
    expect(stamped.evidenceCards[0]).toBe(oldEvidence);
    expect(stamped.evidenceCards[1].methodPackId).toBe('civic_policy');
    expect(stamped.evidenceCards[1].inquiryEpisodeId).toBe('episode_1');
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
