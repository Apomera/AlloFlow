import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const STATE_KEY = 'fisherLab.state.v1';
const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');

function voyageInput(overrides = {}) {
  return {
    savedAt: 1_700_000_000_123,
    region: 'chesapeake',
    mode: 'guided',
    elapsed: 83.75,
    pose: { x: 12.5, z: -24.25, heading: -Math.PI / 2 },
    vessel: { fuel: 72.4, voyageAttempt: 3 },
    environment: { timeOfDay: 'sunset', weather: 'foggy', cameraView: 'firstperson' },
    progress: {
      passedRedNun: true,
      reachedHalfwayRock: true,
      fishLanded: 2,
      fishingAttempts: 3,
      lobstersHauled: 2,
      keeperLobsters: 1,
      targetFishDecision: true,
      trapDecisionMade: true,
      trafficEncounterTriggered: true,
      trafficDecisionMade: true,
      trafficDecisionCorrect: true,
      trafficManeuverComplete: true,
      trafficManeuverReviewed: false
    },
    scoring: {
      stewardshipScore: 145,
      decisionStreak: 3,
      correctDecisions: 4,
      totalDecisions: 5,
      fishIdentificationCorrect: 1,
      fishIdentificationTotal: 1,
      fishRuleCorrect: 1,
      fishRuleTotal: 1,
      regsViolations: 0
    },
    evidence: {
      catchDecisionHistory: [{
        kind: 'finfish',
        speciesId: 'stripedbass',
        label: 'Striped bass',
        length: 31,
        action: 'release',
        correct: true,
        evidence: 'Field marks and current rule checked',
        ts: 1_700_000_000_000
      }],
      retainedBySpecies: { stripedbass: 1 },
      trafficTrackHistory: [{ bearing: 12, range: 30 }, { bearing: 18, range: 44 }],
      hauledTrapIds: ['buoy-1', 'buoy-3']
    },
    ...overrides
  };
}

beforeEach(() => {
  window.localStorage.removeItem(STATE_KEY);
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
});

describe('Fisher Lab durable state writes', () => {
  it('reports a successful normalized write with a detached durable payload', () => {
    const { createCoreVoyageCheckpoint, writeFisherLabState } = window.__FisherLabCore;
    const checkpoint = createCoreVoyageCheckpoint(voyageInput());
    const input = { region: 'chesapeake', coreVoyageMode: 'guided', coreVoyageCheckpoint: checkpoint };
    const writes = [];
    const result = writeFisherLabState({
      setItem(key, value) { writes.push({ key, value }); }
    }, input);

    expect(result).toMatchObject({ ok: true, error: null });
    expect(result.bytes).toBe(writes[0].value.length);
    expect(writes[0].key).toBe(STATE_KEY);
    expect(JSON.parse(writes[0].value).coreVoyageCheckpoint).toEqual(checkpoint);
    expect(result.state.coreVoyageCheckpoint).toEqual(checkpoint);
    expect(result.state.coreVoyageCheckpoint).not.toBe(checkpoint);
    input.region = 'maine';
    expect(result.state.region).toBe('chesapeake');
  });

  it('returns exactly the JSON-recoverable state for hostile numeric evidence', () => {
    const { normalizeCoreVoyageCheckpoint, writeFisherLabState } = window.__FisherLabCore;
    const rawCheckpoint = { version: 1, ...voyageInput() };
    rawCheckpoint.evidence = {
      ...rawCheckpoint.evidence,
      catchDecisionHistory: [{
        ...rawCheckpoint.evidence.catchDecisionHistory[0],
        length: null,
        ts: Number.POSITIVE_INFINITY,
        correctionReviewedAt: 1e308
      }],
      trafficTrackHistory: [
        { bearing: Number.POSITIVE_INFINITY, range: Number.POSITIVE_INFINITY },
        { bearing: 725, range: 1e308 }
      ]
    };
    const writes = [];
    const result = writeFisherLabState({
      setItem(key, value) { writes.push({ key, value }); }
    }, { region: rawCheckpoint.region, coreVoyageMode: rawCheckpoint.mode, coreVoyageCheckpoint: rawCheckpoint });
    const durableState = JSON.parse(writes[0].value);
    const checkpoint = durableState.coreVoyageCheckpoint;

    expect(result).toMatchObject({ ok: true, error: null });
    expect(result.state).toEqual(durableState);
    expect(checkpoint.evidence.trafficTrackHistory).toEqual([
      { bearing: 0, range: 0 },
      { bearing: 5, range: 1000 }
    ]);
    expect(checkpoint.evidence.catchDecisionHistory[0]).toMatchObject({
      length: null,
      ts: 0,
      correctionReviewedAt: 8_640_000_000_000_000
    });
    expect(normalizeCoreVoyageCheckpoint(checkpoint)).toEqual(checkpoint);
  });

  it('returns retryable normalized state when storage is absent or rejects the write', () => {
    const { createCoreVoyageCheckpoint, writeFisherLabState } = window.__FisherLabCore;
    const checkpoint = createCoreVoyageCheckpoint(voyageInput());
    const input = { region: 'chesapeake', coreVoyageMode: 'guided', coreVoyageCheckpoint: checkpoint };
    const deniedStorage = { setItem() { throw new Error('quota denied'); } };

    expect(() => writeFisherLabState(deniedStorage, input)).not.toThrow();
    const denied = writeFisherLabState(deniedStorage, input);
    const missing = writeFisherLabState(null, input);
    [denied, missing].forEach((result) => {
      expect(result).toMatchObject({ ok: false, bytes: 0, error: 'storage-unavailable' });
      expect(result.state.coreVoyageCheckpoint).toEqual(checkpoint);
      expect(result.state.coreVoyageCheckpoint).not.toBe(checkpoint);
    });
  });
});

describe('Fisher Lab voyage checkpoint schema', () => {
  it('creates a versioned, detached checkpoint that round-trips canonically', () => {
    const { createCoreVoyageCheckpoint, normalizeCoreVoyageCheckpoint } = window.__FisherLabCore;
    const input = voyageInput();
    const checkpoint = createCoreVoyageCheckpoint(input);

    expect(checkpoint).toMatchObject({
      version: 1,
      savedAt: 1_700_000_000_123,
      region: 'chesapeake',
      mode: 'guided',
      resumePolicy: 'paused-neutral',
      elapsed: 83.75,
      pose: { x: 12.5, z: -24.25 },
      vessel: { fuel: 72.4, voyageAttempt: 3 },
      environment: { timeOfDay: 'sunset', weather: 'foggy', cameraView: 'firstperson' }
    });
    expect(checkpoint.pose.heading).toBeCloseTo(Math.PI * 1.5);

    input.pose.x = 499;
    input.evidence.hauledTrapIds.push('buoy-2');
    expect(checkpoint.pose.x).toBe(12.5);
    expect(checkpoint.evidence.hauledTrapIds).toEqual(['buoy-1', 'buoy-3']);

    const roundTrip = normalizeCoreVoyageCheckpoint(checkpoint);
    expect(roundTrip).toEqual(checkpoint);
    expect(roundTrip).not.toBe(checkpoint);
    expect(roundTrip.pose).not.toBe(checkpoint.pose);
    expect(roundTrip.evidence.catchDecisionHistory).not.toBe(checkpoint.evidence.catchDecisionHistory);
  });

  it('preserves the legitimate zero-bonus maneuver-complete grade', () => {
    const { createCoreVoyageCheckpoint, normalizeCoreVoyageCheckpoint } = window.__FisherLabCore;
    const input = voyageInput();
    input.progress = {
      ...input.progress,
      trafficGradeId: 'complete',
      trafficGradeLabel: 'Maneuver complete',
      trafficGradeBonus: 0
    };
    const checkpoint = createCoreVoyageCheckpoint(input);

    expect(checkpoint.progress).toMatchObject({
      trafficGradeId: 'complete',
      trafficGradeLabel: 'Maneuver complete',
      trafficGradeBonus: 0
    });
    expect(normalizeCoreVoyageCheckpoint(checkpoint)).toEqual(checkpoint);
  });

  it('clamps numeric state and bounds persisted evidence', () => {
    const { normalizeCoreVoyageCheckpoint } = window.__FisherLabCore;
    const catchHistory = Array.from({ length: 6 }, (_, index) => ({
      speciesId: 'fish-' + index,
      label: 'Fish ' + index,
      length: 10 + index,
      action: index % 2 ? 'keep' : 'release',
      correct: true,
      ts: index + 1
    }));
    const radarHistory = Array.from({ length: 8 }, (_, index) => ({
      bearing: index * 4,
      range: index === 7 ? -40 : 60 - index
    }));
    const checkpoint = normalizeCoreVoyageCheckpoint({
      version: 1,
      ...voyageInput({
        savedAt: 12.9,
        elapsed: 99_999,
        pose: { x: 900, z: -900, heading: -Math.PI / 2 },
        vessel: { fuel: 900, voyageAttempt: 90_000 },
        environment: { timeOfDay: 'midnight', weather: 'storm', cameraView: 'drone' },
        progress: {
          passedRedNun: true,
          fishLanded: 1,
          fishingAttempts: 2_000,
          lobstersHauled: 2,
          keeperLobsters: 1,
          trapDecisionMade: true,
          trafficEncounterTriggered: true,
          trafficDecisionMade: true,
          trafficDecisionCorrect: true,
          trafficManeuverComplete: true
        },
        scoring: {
          stewardshipScore: -20,
          decisionStreak: 9,
          correctDecisions: 8,
          totalDecisions: 4,
          fishIdentificationCorrect: 7,
          fishIdentificationTotal: 1,
          fishRuleCorrect: 5,
          fishRuleTotal: 1,
          regsViolations: -1
        },
        evidence: {
          catchDecisionHistory: catchHistory,
          retainedBySpecies: { stripedbass: 0, invalid: -3 },
          trafficTrackHistory: radarHistory,
          hauledTrapIds: ['buoy-3', 'bogus', 'buoy-3', 'buoy-1']
        }
      })
    });

    expect(checkpoint.savedAt).toBe(12);
    expect(checkpoint.elapsed).toBe(21_600);
    expect(checkpoint.pose).toMatchObject({ x: 500, z: -500 });
    expect(checkpoint.pose.heading).toBeCloseTo(Math.PI * 1.5);
    expect(checkpoint.vessel).toEqual({ fuel: 100, voyageAttempt: 9_999 });
    expect(checkpoint.environment).toEqual({ timeOfDay: 'day', weather: 'clear', seaState: 'calm', cameraView: 'chase' });
    expect(checkpoint.progress).toMatchObject({ fishLanded: 1, fishingAttempts: 999, lobstersHauled: 2, keeperLobsters: 1, trapDecisionMade: true });
    expect(checkpoint.scoring).toMatchObject({
      stewardshipScore: 0,
      decisionStreak: 4,
      correctDecisions: 4,
      totalDecisions: 4,
      fishIdentificationCorrect: 1,
      fishIdentificationTotal: 1,
      fishRuleCorrect: 1,
      fishRuleTotal: 1,
      regsViolations: 0
    });
    expect(checkpoint.evidence.catchDecisionHistory.map((entry) => entry.speciesId)).toEqual(['fish-2', 'fish-3', 'fish-4', 'fish-5']);
    expect(checkpoint.evidence.trafficTrackHistory).toHaveLength(6);
    expect(checkpoint.evidence.trafficTrackHistory.at(-1).range).toBe(0);
    expect(checkpoint.evidence.hauledTrapIds).toEqual(['buoy-3', 'buoy-1']);
    expect(checkpoint.evidence.retainedBySpecies).toEqual({});
  });

  it('accepts every stable boundary in a coherent voyage timeline', () => {
    const { createCoreVoyageCheckpoint, normalizeCoreVoyageCheckpoint } = window.__FisherLabCore;
    const emptyEvidence = { catchDecisionHistory: [], retainedBySpecies: {}, trafficTrackHistory: [], hauledTrapIds: [] };
    const initial = {
      savedAt: 1_700_000_100_000,
      region: 'chesapeake',
      mode: 'guided',
      progress: {},
      scoring: {},
      evidence: emptyEvidence
    };
    const buoyPass = { ...initial, progress: { passedRedNun: true } };
    const traffic = {
      ...initial,
      progress: {
        passedRedNun: true,
        trafficEncounterTriggered: true,
        trafficDecisionMade: true,
        trafficDecisionCorrect: true,
        trafficManeuverComplete: true,
        trafficGradeId: 'complete',
        trafficGradeLabel: 'Maneuver complete'
      },
      scoring: { totalDecisions: 1, correctDecisions: 1, decisionStreak: 1 },
      evidence: { ...emptyEvidence, trafficTrackHistory: [{ bearing: 8, range: 22 }, { bearing: 16, range: 28 }] }
    };
    const fishingGrounds = {
      ...traffic,
      progress: { ...traffic.progress, reachedHalfwayRock: true, fishingAttempts: 1 }
    };
    const fishDecision = {
      ...fishingGrounds,
      progress: { ...fishingGrounds.progress, fishLanded: 1, targetFishDecision: true },
      scoring: {
        totalDecisions: 2,
        correctDecisions: 2,
        decisionStreak: 2,
        fishIdentificationTotal: 1,
        fishIdentificationCorrect: 1,
        fishRuleTotal: 1,
        fishRuleCorrect: 1
      },
      evidence: {
        ...fishingGrounds.evidence,
        catchDecisionHistory: [{ kind: 'finfish', speciesId: 'stripedbass', action: 'release', correct: true, ts: 1_700_000_101_000 }]
      }
    };
    const reviewedTrap = {
      ...fishDecision,
      progress: { ...fishDecision.progress, lobstersHauled: 1, keeperLobsters: 0, trapDecisionMade: false },
      scoring: { ...fishDecision.scoring, totalDecisions: 3, correctDecisions: 2, decisionStreak: 0 },
      evidence: { ...fishDecision.evidence, hauledTrapIds: ['buoy-1'] }
    };
    const keeperTrap = {
      ...reviewedTrap,
      progress: { ...reviewedTrap.progress, lobstersHauled: 2, keeperLobsters: 1, trapDecisionMade: true },
      scoring: { ...reviewedTrap.scoring, totalDecisions: 4, correctDecisions: 3, decisionStreak: 1 },
      evidence: { ...reviewedTrap.evidence, hauledTrapIds: ['buoy-1', 'buoy-2'] }
    };

    const checkpoints = [initial, buoyPass, traffic, fishingGrounds, fishDecision, reviewedTrap, keeperTrap].map((stage) => {
      const checkpoint = createCoreVoyageCheckpoint(stage);
      expect(checkpoint).not.toBeNull();
      expect(normalizeCoreVoyageCheckpoint(checkpoint)).toEqual(checkpoint);
      return checkpoint;
    });
    expect(checkpoints[4].evidence.catchDecisionHistory[0].length).toBeNull();
  });

  it('rejects checkpoints whose individually valid fields tell an impossible voyage story', () => {
    const { createCoreVoyageCheckpoint, normalizeCoreVoyageCheckpoint } = window.__FisherLabCore;
    const valid = createCoreVoyageCheckpoint(voyageInput());
    const progress = (changes) => ({ ...valid, progress: { ...valid.progress, ...changes } });
    const scoring = (changes) => ({ ...valid, scoring: { ...valid.scoring, ...changes } });
    const evidence = (changes) => ({ ...valid, evidence: { ...valid.evidence, ...changes } });
    const noTraffic = {
      trafficEncounterTriggered: false,
      trafficDecisionMade: false,
      trafficDecisionCorrect: false,
      trafficManeuverComplete: false,
      trafficManeuverReviewed: false,
      trafficGradeId: null,
      trafficGradeLabel: null,
      trafficGradeBonus: 0,
      radarCallMade: false,
      radarCallCorrect: false,
      radarCallBonus: 0
    };
    const impossible = [
      progress({ passedRedNun: false }),
      progress({ reachedHalfwayRock: false }),
      progress({ fishLanded: 4, fishingAttempts: 3 }),
      progress({ lobstersHauled: 1 }),
      progress({ keeperLobsters: 3 }),
      { ...progress({ lobstersHauled: 0, keeperLobsters: 0, trapDecisionMade: true }), evidence: { ...valid.evidence, hauledTrapIds: [] } },
      progress({ trapDecisionMade: false, keeperLobsters: 1 }),
      scoring({ totalDecisions: 4, correctDecisions: 4, decisionStreak: 3 }),
      scoring({ correctDecisions: 2, decisionStreak: 2 }),
      { ...scoring({ correctDecisions: 3, decisionStreak: 3 }), evidence: { ...valid.evidence, retainedBySpecies: { stripedbass: 2 } } },
      scoring({ fishIdentificationTotal: 3, fishIdentificationCorrect: 2 }),
      scoring({ fishRuleTotal: 3, fishRuleCorrect: 2 }),
      scoring({ regsViolations: 6 }),
      scoring({ correctDecisions: 3, decisionStreak: 4 }),
      evidence({ retainedBySpecies: { stripedbass: 3 } }),
      progress({ ...noTraffic, trafficGradeId: 'complete', trafficGradeLabel: 'Maneuver complete' }),
      progress({ radarCallMade: false, radarCallCorrect: true }),
      progress({ radarCallMade: false, radarCallLabel: 'Opening range' }),
      progress({ radarCallMade: true, radarCallCorrect: false, radarCallBonus: 5 }),
      { ...progress(noTraffic), evidence: { ...valid.evidence, trafficTrackHistory: [{ bearing: 4, range: 20 }] } },
      progress({ trafficGradeId: 'review', trafficGradeLabel: 'Review required' }),
      progress({ trafficDecisionCorrect: false, trafficGradeId: 'safe', trafficGradeLabel: 'Safe separation', trafficGradeBonus: 5 }),
      progress({ trafficGradeId: 'complete', trafficGradeLabel: 'Maneuver complete', trafficGradeBonus: 5 })
    ];

    impossible.forEach((candidate) => expect(normalizeCoreVoyageCheckpoint(candidate)).toBeNull());
  });

  it('rejects incompatible, terminal, and interaction-unsafe checkpoints', () => {
    const { createCoreVoyageCheckpoint, normalizeCoreVoyageCheckpoint } = window.__FisherLabCore;
    const valid = createCoreVoyageCheckpoint(voyageInput());
    const progress = (changes) => ({ ...valid, progress: { ...valid.progress, ...changes } });
    [
      { ...valid, version: '1' },
      { ...valid, version: 2 },
      { ...valid, savedAt: String(valid.savedAt) },
      { ...valid, savedAt: Number.NaN },
      { ...valid, region: 'toString' },
      { ...valid, mode: '__proto__' },
      progress({ missionComplete: true }),
      progress({ missionAttemptComplete: true }),
      progress({ returnedHome: true }),
      progress({ trafficEncounterTriggered: true, trafficDecisionMade: false, trafficManeuverComplete: false }),
      progress({ trafficEncounterTriggered: true, trafficDecisionMade: true, trafficManeuverComplete: false }),
      progress({ trafficEncounterTriggered: false, trafficDecisionMade: false, trafficManeuverComplete: false, trafficManeuverReviewed: true })
    ].forEach((candidate) => expect(normalizeCoreVoyageCheckpoint(candidate)).toBeNull());
  });

  it('summarizes recovery progress and normalizes it into saved state', () => {
    const {
      createCoreVoyageCheckpoint,
      getCoreVoyageCheckpointSummary,
      normalizeFisherLabState
    } = window.__FisherLabCore;
    const checkpoint = createCoreVoyageCheckpoint(voyageInput());

    expect(getCoreVoyageCheckpointSummary(checkpoint)).toEqual({
      version: 1,
      savedAt: 1_700_000_000_123,
      region: 'chesapeake',
      regionLabel: 'Chesapeake Bay',
      mode: 'guided',
      modeLabel: 'Guided',
      completedObjectives: 5,
      totalObjectives: 5,
      fuel: 72,
      elapsed: 83.75
    });
    const normalized = normalizeFisherLabState({
      region: 'chesapeake',
      coreVoyageCheckpoint: checkpoint
    });
    expect(normalized.coreVoyageCheckpoint).toEqual(checkpoint);
    expect(normalized.coreVoyageCheckpoint).not.toBe(checkpoint);
    expect(normalizeFisherLabState({
      coreVoyageCheckpoint: { ...checkpoint, version: 4 }
    }).coreVoyageCheckpoint).toBeNull();
  });
});

describe('Fisher Lab voyage rescue files', () => {
  it('round-trips a versioned portable checkpoint with a deterministic safe filename', () => {
    const {
      createCoreVoyageCheckpoint,
      getCoreVoyageRescueFilename,
      parseCoreVoyageRescue,
      serializeCoreVoyageRescue
    } = window.__FisherLabCore;
    const checkpoint = createCoreVoyageCheckpoint(voyageInput());
    const serialized = serializeCoreVoyageRescue(checkpoint, 1_800_000_000_987);
    const envelope = JSON.parse(serialized);

    expect(envelope).toMatchObject({
      format: 'fisherlab-voyage-rescue',
      version: 1,
      exportedAt: 1_800_000_000_987,
      checkpoint
    });
    expect(getCoreVoyageRescueFilename(checkpoint)).toBe('fisherlab-voyage-chesapeake-guided-2023-11-14.json');

    const parsed = parseCoreVoyageRescue('\uFEFF \n' + serialized);
    expect(parsed).toEqual({
      ok: true,
      checkpoint,
      error: null,
      exportedAt: 1_800_000_000_987
    });
    expect(parsed.checkpoint).not.toBe(checkpoint);
    parsed.checkpoint.pose.x = 999;
    expect(parseCoreVoyageRescue(serialized).checkpoint.pose.x).toBe(12.5);
  });

  it('rejects malformed, oversized, unsupported, and inconsistent rescue envelopes', () => {
    const {
      createCoreVoyageCheckpoint,
      getCoreVoyageRescueErrorMessage,
      parseCoreVoyageRescue,
      serializeCoreVoyageRescue
    } = window.__FisherLabCore;
    const checkpoint = createCoreVoyageCheckpoint(voyageInput());
    const valid = JSON.parse(serializeCoreVoyageRescue(checkpoint, 1_800_000_000_000));

    expect(parseCoreVoyageRescue(null)).toMatchObject({ ok: false, error: 'invalid-file' });
    expect(parseCoreVoyageRescue(' \n ')).toMatchObject({ ok: false, error: 'invalid-file' });
    expect(parseCoreVoyageRescue('{')).toMatchObject({ ok: false, error: 'invalid-json' });
    expect(parseCoreVoyageRescue(JSON.stringify({ ...valid, format: 'not-fisher-lab' }))).toMatchObject({ ok: false, error: 'unsupported-file' });
    expect(parseCoreVoyageRescue(JSON.stringify({ ...valid, version: 2 }))).toMatchObject({ ok: false, error: 'unsupported-file' });
    expect(parseCoreVoyageRescue(JSON.stringify({ ...valid, exportedAt: 0 }))).toMatchObject({ ok: false, error: 'invalid-file' });
    expect(parseCoreVoyageRescue(JSON.stringify({ ...valid, checkpoint: { ...checkpoint, version: 99 } }))).toMatchObject({ ok: false, error: 'invalid-checkpoint' });
    expect(parseCoreVoyageRescue('\u00e9'.repeat(131_073))).toMatchObject({ ok: false, error: 'file-too-large' });
    expect(parseCoreVoyageRescue(' '.repeat(262_144) + JSON.stringify(valid))).toMatchObject({ ok: false, error: 'file-too-large' });
    expect(getCoreVoyageRescueErrorMessage('invalid-checkpoint')).toContain('safe, consistent voyage checkpoint');
    expect(getCoreVoyageRescueErrorMessage('unknown')).toContain('valid Fisher Lab voyage rescue');
  });

  it('selects the newest valid checkpoint without returning a shared reference', () => {
    const {
      createCoreVoyageCheckpoint,
      getCoreNewestVoyageCheckpoint
    } = window.__FisherLabCore;
    const older = createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_100 }));
    const newer = createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_900 }));
    const selected = getCoreNewestVoyageCheckpoint([
      { ...newer, version: 99 },
      older,
      null,
      newer
    ]);

    expect(selected).toEqual(newer);
    expect(selected).not.toBe(newer);
    selected.pose.z = 500;
    expect(newer.pose.z).toBe(-24.25);
    expect(getCoreNewestVoyageCheckpoint([])).toBeNull();
  });

  it('compares rescue and local checkpoints without exposing mutable state', () => {
    const {
      createCoreVoyageCheckpoint,
      getCoreVoyageRescueComparison
    } = window.__FisherLabCore;
    const savedAt = 1_700_000_000_500;
    const current = createCoreVoyageCheckpoint(voyageInput({ savedAt }));
    const later = createCoreVoyageCheckpoint(voyageInput({ savedAt: savedAt + 500 }));
    const earlier = createCoreVoyageCheckpoint(voyageInput({ savedAt: savedAt - 500 }));
    const sameTimeDifferent = createCoreVoyageCheckpoint(voyageInput({
      savedAt,
      pose: { x: 18.25, z: -24.25, heading: -Math.PI / 2 }
    }));

    expect(getCoreVoyageRescueComparison(current, null)).toMatchObject({
      relation: 'no-local',
      replacesLocal: false,
      sameCheckpoint: false,
      current: null,
      checkpoint: { savedAt }
    });
    expect(getCoreVoyageRescueComparison(current, current)).toMatchObject({
      relation: 'same',
      replacesLocal: true,
      sameCheckpoint: true
    });
    expect(getCoreVoyageRescueComparison(later, current)).toMatchObject({
      relation: 'newer',
      replacesLocal: true,
      sameCheckpoint: false
    });
    expect(getCoreVoyageRescueComparison(earlier, current).relation).toBe('older');
    expect(getCoreVoyageRescueComparison(sameTimeDifferent, current).relation).toBe('same-time');
    expect(getCoreVoyageRescueComparison({ ...current, version: 99 }, current)).toBeNull();

    const comparison = getCoreVoyageRescueComparison(current, later);
    comparison.checkpoint.fuel = 0;
    expect(window.__FisherLabCore.getCoreVoyageCheckpointSummary(current).fuel).toBe(72);
  });

  it('previews a validated rescue before explicitly restoring it', async () => {
    const checkpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput());
    const serialized = window.__FisherLabCore.serializeCoreVoyageRescue(checkpoint, 1_800_000_000_000);
    const config = window.StemLab._registry.fisherLab;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const Component = function() { return config.render({ React }); };
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await React.act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      const simTab = Array.from(host.querySelectorAll('[role="tab"]')).find((button) => button.textContent.includes('3D Sim'));
      expect(simTab).toBeTruthy();
      await React.act(async () => {
        simTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });

      const controls = host.querySelector('[data-fisherlab-voyage-files="true"]');
      const input = controls && controls.querySelector('input[type="file"]');
      expect(controls).toBeTruthy();
      expect(input?.getAttribute('accept')).toBe('.json,application/json');
      const file = { size: serialized.length, text: vi.fn(() => Promise.resolve(serialized)) };
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });

      await React.act(async () => {
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const preview = host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]');
      const confirmButton = preview && Array.from(preview.querySelectorAll('button')).find((button) => button.textContent.includes('Use rescued voyage'));
      expect(file.text).toHaveBeenCalledTimes(1);
      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toBeNull();
      expect(host.querySelector('[data-fisherlab-voyage-recovery="true"]')).toBeNull();
      expect(preview?.textContent).toContain('No local voyage checkpoint will be replaced');
      expect(host.querySelector('[data-fisherlab-voyage-rescue-status="preview"]')?.textContent).toContain('No saved progress has changed');
      expect(confirmButton).toBeTruthy();
      expect(document.activeElement).toBe(confirmButton);

      await React.act(async () => {
        confirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toEqual(checkpoint);
      expect(host.querySelector('[data-fisherlab-voyage-recovery="true"]')).toBeTruthy();
      expect(host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]')).toBeNull();
      expect(host.querySelector('[data-fisherlab-voyage-rescue-status="ready"]')?.textContent).toContain('Choose Resume saved voyage');
      const resumeButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Resume saved voyage'));
      expect(document.activeElement).toBe(resumeButton);
      expect(input.value).toBe('');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('keeps a later local checkpoint untouched when rescue preview is cancelled', async () => {
    const localCheckpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_900 }));
    const rescueCheckpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_100 }));
    const serialized = window.__FisherLabCore.serializeCoreVoyageRescue(rescueCheckpoint, 1_800_000_000_000);
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      region: localCheckpoint.region,
      coreVoyageMode: localCheckpoint.mode,
      coreVoyageCheckpoint: localCheckpoint
    }));
    const config = window.StemLab._registry.fisherLab;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const Component = function() { return config.render({ React }); };
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await React.act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      const simTab = Array.from(host.querySelectorAll('[role="tab"]')).find((button) => button.textContent.includes('3D Sim'));
      await React.act(async () => {
        simTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
      const input = host.querySelector('[data-fisherlab-voyage-files="true"] input[type="file"]');
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [{ size: serialized.length, text: () => Promise.resolve(serialized) }]
      });
      await React.act(async () => {
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const preview = host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]');
      expect(preview?.textContent).toContain('Rescue file:');
      expect(preview?.textContent).toContain('Current local:');
      expect(preview?.textContent).toContain('earlier checkpoint timestamp');
      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toEqual(localCheckpoint);
      const cancelButton = Array.from(preview.querySelectorAll('button')).find((button) => button.textContent === 'Cancel');

      await React.act(async () => {
        cancelButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toEqual(localCheckpoint);
      expect(host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]')).toBeNull();
      expect(host.querySelector('[data-fisherlab-voyage-rescue-status="cancelled"]')?.textContent).toContain('unchanged');
      expect(document.activeElement?.textContent).toContain('Choose rescue file');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it("ignores an earlier selection's asynchronous read after a newer selection finishes", async () => {
    const firstCheckpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_900 }));
    const secondCheckpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_100 }));
    const firstSerialized = window.__FisherLabCore.serializeCoreVoyageRescue(firstCheckpoint, 1_800_000_000_100);
    const secondSerialized = window.__FisherLabCore.serializeCoreVoyageRescue(secondCheckpoint, 1_800_000_000_200);
    let resolveFirst;
    let resolveSecond;
    const firstRead = new Promise((resolve) => { resolveFirst = resolve; });
    const secondRead = new Promise((resolve) => { resolveSecond = resolve; });
    const config = window.StemLab._registry.fisherLab;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const Component = function() { return config.render({ React }); };
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await React.act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      const simTab = Array.from(host.querySelectorAll('[role="tab"]')).find((button) => button.textContent.includes('3D Sim'));
      await React.act(async () => {
        simTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
      let input = host.querySelector('[data-fisherlab-voyage-files="true"] input[type="file"]');
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [{ size: firstSerialized.length, text: () => firstRead }]
      });
      await React.act(async () => {
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
        await Promise.resolve();
      });

      input = host.querySelector('[data-fisherlab-voyage-files="true"] input[type="file"]');
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [{ size: secondSerialized.length, text: () => secondRead }]
      });
      await React.act(async () => {
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
        await Promise.resolve();
      });
      await React.act(async () => {
        resolveSecond(secondSerialized);
        await secondRead;
        await Promise.resolve();
      });
      await React.act(async () => {
        resolveFirst(firstSerialized);
        await firstRead;
        await Promise.resolve();
      });

      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toBeNull();
      const preview = host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]');
      const confirmButton = Array.from(preview.querySelectorAll('button')).find((button) => button.textContent.includes('Use rescued voyage'));
      await React.act(async () => {
        confirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });

      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint.savedAt).toBe(secondCheckpoint.savedAt);
      expect(host.querySelector('[data-fisherlab-voyage-rescue-status="ready"]')).toBeTruthy();
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('refreshes the comparison instead of overwriting a checkpoint changed during preview', async () => {
    const initialLocal = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_100 }));
    const changedLocal = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_500 }));
    const rescueCheckpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput({ savedAt: 1_700_000_000_900 }));
    const serialized = window.__FisherLabCore.serializeCoreVoyageRescue(rescueCheckpoint, 1_800_000_000_000);
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      region: initialLocal.region,
      coreVoyageMode: initialLocal.mode,
      coreVoyageCheckpoint: initialLocal
    }));
    const config = window.StemLab._registry.fisherLab;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const Component = function() { return config.render({ React }); };
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await React.act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      const simTab = Array.from(host.querySelectorAll('[role="tab"]')).find((button) => button.textContent.includes('3D Sim'));
      await React.act(async () => {
        simTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
      const input = host.querySelector('[data-fisherlab-voyage-files="true"] input[type="file"]');
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [{ size: serialized.length, text: () => Promise.resolve(serialized) }]
      });
      await React.act(async () => {
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      window.localStorage.setItem(STATE_KEY, JSON.stringify({
        region: changedLocal.region,
        coreVoyageMode: changedLocal.mode,
        coreVoyageCheckpoint: changedLocal
      }));
      let confirmButton = Array.from(host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]').querySelectorAll('button')).find((button) => button.textContent.includes('Use rescued voyage'));
      await React.act(async () => {
        confirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toEqual(changedLocal);
      expect(host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]')).toBeTruthy();
      expect(host.querySelector('[data-fisherlab-voyage-rescue-status="preview"]')?.textContent).toContain('changed while this preview was open');

      confirmButton = Array.from(host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]').querySelectorAll('button')).find((button) => button.textContent.includes('Use rescued voyage'));
      await React.act(async () => {
        confirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });

      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toEqual(rescueCheckpoint);
      expect(host.querySelector('[data-fisherlab-voyage-rescue-preview="true"]')).toBeNull();
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('downloads the saved checkpoint and revokes the temporary object URL', async () => {
    const checkpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput());
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      region: checkpoint.region,
      coreVoyageMode: checkpoint.mode,
      coreVoyageCheckpoint: checkpoint
    }));

    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    const createObjectURL = vi.fn(() => 'blob:fisherlab-rescue');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });
    let downloadedAnchor = null;
    const clickSpy = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
      downloadedAnchor = this;
    });
    const config = window.StemLab._registry.fisherLab;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const Component = function() { return config.render({ React }); };
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await React.act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      const downloadButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Download rescue file'));
      expect(downloadButton).toBeTruthy();

      await React.act(async () => {
        downloadButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(window.Blob);
      expect(downloadedAnchor?.download).toBe('fisherlab-voyage-chesapeake-guided-2023-11-14.json');
      expect(downloadedAnchor?.href).toBe('blob:fisherlab-rescue');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fisherlab-rescue');
      expect(host.querySelector('[data-fisherlab-voyage-rescue-status="downloaded"]')?.textContent).toContain('downloaded');
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL === undefined) delete window.URL.createObjectURL;
      else Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, writable: true, value: originalCreateObjectURL });
      if (originalRevokeObjectURL === undefined) delete window.URL.revokeObjectURL;
      else Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, writable: true, value: originalRevokeObjectURL });
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('wires strict file acceptance, visible status, and stale-read invalidation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("'data-fisherlab-voyage-files': 'true'");
    expect(source).toContain("accept: '.json,application/json'");
    expect(source).toContain("'data-fisherlab-voyage-rescue-status': voyageRescueStatus.id");
    expect(source).toContain("'data-fisherlab-voyage-rescue-preview': 'true'");
    expect(source).toContain('No saved progress changes until you confirm.');
    expect(source).toContain('function confirmVoyageRescueRestore()');
    expect(source).toContain('readGeneration !== voyageRescueReadGenerationRef.current');
    expect(source).toContain('voyageRescueReadGenerationRef.current += 1;');
    expect(source).toContain('urlApi.revokeObjectURL(cleanupUrl)');
    expect(source).toContain('it does not include your field journal or profile');
  });
});

describe('Fisher Lab voyage recovery lifecycle', () => {
  it('checkpoints only stable boundaries and restores paused at neutral throttle', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const engine = source.slice(source.indexOf('function initHarborSim'), source.indexOf('function _renderFisherLab'));
    const restore = engine.slice(engine.indexOf('function applyInitialVoyageCheckpoint'), engine.indexOf('function setPaused'));

    expect(engine).toContain('var pendingInteraction = null;');
    expect(engine).toContain("pendingInteraction = 'traffic';");
    expect(engine).toContain("pendingInteraction = 'fishing';");
    expect(engine).toContain("pendingInteraction = 'catch';");
    expect(engine).toContain('if (pendingInteraction || haulActive || boatState.missionComplete || boatState.missionAttemptComplete) return null;');
    expect(engine).toContain('if (boatState.trafficDecisionMade && !boatState.trafficManeuverComplete) return null;');
    expect(engine).toContain("emitVoyageCheckpoint('cruise', false);");
    expect(engine).toContain("emitVoyageCheckpoint('pagehide', true);");
    expect(engine).toContain('setPaused(true, false);');
    expect(engine).toContain("window.addEventListener('pagehide', onPageHide);");
    expect(engine).toContain("window.removeEventListener('pagehide', onPageHide);");
    expect(engine).toContain("window.addEventListener('blur', onWindowBlur);");
    expect(engine).toContain("window.removeEventListener('blur', onWindowBlur);");
    expect(engine).toContain("pauseForInactivity('window-blur');");
    expect(engine).toContain("window.addEventListener('focus', onActivityReturn);");
    expect(engine).toContain("window.removeEventListener('focus', onActivityReturn);");
    expect(engine).toContain("window.addEventListener('pageshow', onActivityReturn);");
    expect(engine).toContain("window.removeEventListener('pageshow', onActivityReturn);");
    expect(engine).toContain("if (!pauseForInactivity('pagehide')) emitVoyageCheckpoint('pagehide', true);");
    expect(engine).toContain('releaseHeldControls();');
    expect(engine).toContain("clearVoyageCheckpoint('mission-complete');");
    expect(restore).toContain('boatState.speed = 0;');
    expect(restore).toContain('boatState.throttle = 0;');
    expect(restore).toContain('boatState.paused = true;');
    expect(engine).toContain('restoredFromCheckpoint: restoredFromCheckpoint');
    expect(engine).toContain('getCheckpoint: function() { return createCurrentVoyageCheckpoint(); }');
    expect(engine).toContain("checkpoint: function(reason) { return emitVoyageCheckpoint(reason || 'host-request', true); }");
  });

  it('wires host persistence, recovery actions, completion clearing, and unmount capture', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const render = source.slice(source.indexOf('function _renderFisherLab'));

    expect(render).toContain('var savedVoyageHook = useState(stateInit.coreVoyageCheckpoint);');
    expect(render).toContain('var pendingVoyageWriteRef = useRef(null);');
    expect(render).toContain('function commitVoyageState(nextState, updateUi)');
    expect(render).toContain('pendingVoyageWriteRef.current = { state:');
    expect(render).toContain("if (savedVoyageCheckpoint && !clearSavedVoyageCheckpoint('start-new'))");
    expect(render).toContain('function retryVoyagePersistence()');
    expect(render).toContain("'data-fisherlab-voyage-storage': 'error'");
    expect(render).toContain("'data-fisherlab-voyage-save-status': statusId");
    expect(render).toContain('voyageStorageWarning(),');
    expect(render).toContain('initialCheckpoint: checkpointToRestore');
    expect(render).toContain('onCheckpoint: persistVoyageCheckpoint');
    expect(render).toContain('function resumeSavedVoyage()');
    expect(render).toContain('function discardSavedVoyage()');
    expect(render).toContain("harborRef.current.checkpoint('leave-simulator')");
    expect(render).toContain('if (harborRef.current && harborRef.current.getCheckpoint)');
    expect(render).toContain('saved.coreVoyageCheckpoint = null;');
    expect(render).toContain("'data-fisherlab-voyage-recovery': 'true'");
    expect(render).toContain('Saved voyage restored and paused.');
    expect(render).toContain('Start new ');
  });

  it('renders a global, explicit recovery choice from persisted state', () => {
    const checkpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput());
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      region: checkpoint.region,
      coreVoyageMode: checkpoint.mode,
      coreVoyageCheckpoint: checkpoint
    }));

    const html = renderTool('fisherLab');
    expect(html).toContain('data-fisherlab-voyage-recovery="true"');
    expect(html).toContain('Saved voyage ready');
    expect(html).toContain('Resume saved voyage');
    expect(html).toContain('Discard checkpoint');
    expect(html).toContain('restores paused with throttle neutral');
  });
});

describe('Fisher Lab autosave failure recovery', () => {
  it('keeps the confirmed checkpoint visible and retries the exact failed discard', async () => {
    const checkpoint = window.__FisherLabCore.createCoreVoyageCheckpoint(voyageInput());
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      region: checkpoint.region,
      coreVoyageMode: checkpoint.mode,
      coreVoyageCheckpoint: checkpoint
    }));
    const config = window.StemLab._registry.fisherLab;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const Component = function() { return config.render({ React }); };
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let storageSpy = null;

    try {
      await React.act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      expect(host.querySelector('[data-fisherlab-voyage-recovery="true"]')).toBeTruthy();

      const storagePrototype = Object.getPrototypeOf(window.localStorage);
      const originalSetItem = storagePrototype.setItem;
      storageSpy = vi.spyOn(storagePrototype, 'setItem').mockImplementation(function(key, value) {
        if (key === STATE_KEY) throw new Error('quota denied');
        return originalSetItem.call(this, key, value);
      });
      const discardButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Discard checkpoint'));
      expect(discardButton).toBeTruthy();
      await React.act(async () => {
        discardButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });

      expect(host.querySelector('[data-fisherlab-voyage-storage="error"]')).toBeTruthy();
      expect(Array.from(host.querySelectorAll('[data-fisherlab-voyage-storage="error"] button')).some((button) => button.textContent.includes('Download rescue file'))).toBe(true);
      expect(host.querySelector('[data-fisherlab-voyage-recovery="true"]')).toBeTruthy();
      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toEqual(checkpoint);

      storageSpy.mockRestore();
      storageSpy = null;
      const retryButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Retry autosave'));
      expect(retryButton).toBeTruthy();
      await React.act(async () => {
        retryButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });

      expect(host.querySelector('[data-fisherlab-voyage-storage="error"]')).toBeNull();
      expect(host.querySelector('[data-fisherlab-voyage-recovery="true"]')).toBeNull();
      expect(JSON.parse(window.localStorage.getItem(STATE_KEY)).coreVoyageCheckpoint).toBeNull();
    } finally {
      if (storageSpy) storageSpy.mockRestore();
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });
});
