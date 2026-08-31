import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
let BH;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

describe('Beehive seeded daily model', () => {
  it('replays an identical random stream from the same seed', () => {
    const first = BH.bhCreateSeededRandom(18436572);
    const second = BH.bhCreateSeededRandom(18436572);
    const a = Array.from({ length: 24 }, () => first.rand());
    const b = Array.from({ length: 24 }, () => second.rand());

    expect(a).toEqual(b);
    a.forEach((draw) => {
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(1);
    });
  });

  it('resumes at the exact next draw from a saved random-state cursor', () => {
    const uninterrupted = BH.bhCreateSeededRandom(90210);
    Array.from({ length: 11 }, () => uninterrupted.rand());
    const cursor = uninterrupted.getState();
    const expectedTail = Array.from({ length: 8 }, () => uninterrupted.rand());

    const resumed = BH.bhCreateSeededRandom(cursor);
    expect(Array.from({ length: 8 }, () => resumed.rand())).toEqual(expectedTail);
  });

  it('produces distinct streams for distinct seeds', () => {
    const a = BH.bhCreateSeededRandom(1);
    const b = BH.bhCreateSeededRandom(2);
    expect(Array.from({ length: 8 }, () => a.rand()))
      .not.toEqual(Array.from({ length: 8 }, () => b.rand()));
  });

  it('clamps learner-entered seeds instead of wrapping to a surprising value', () => {
    expect(BH.bhSeedFromInput(-25)).toBe(0);
    expect(BH.bhSeedFromInput(12.9)).toBe(12);
    expect(BH.bhSeedFromInput(4294967296)).toBe(4294967295);
    expect(BH.bhSeedFromInput('not a number')).toBe(BH.BEEHIVE_DEFAULT_SEED);
  });

  it('creates a bounded, different fresh seed without consuming the colony stream', () => {
    const first = BH.bhFreshExperimentSeed(1234, 987654321);
    const repeated = BH.bhFreshExperimentSeed(1234, 987654321);
    expect(first).toBe(repeated);
    expect(first).not.toBe(1234);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(4294967295);
  });

  it('creates replayable new colonies with normalized seed metadata', () => {
    const state = BH.bhCreateNewColonyState(4294967301, 3);
    expect(state.modelVersion).toBe(BH.BEEHIVE_COLONY_MODEL_VERSION);
    expect(state.simulationSeed).toBe(5);
    expect(state.randomState).toBe(5);
    expect(state.experimentRunSerial).toBe(3);
    expect(state.seededFromDay).toBe(0);
    expect(BH.bhExperimentProvenance(state)).toMatchObject({
      modelVersion: BH.BEEHIVE_COLONY_MODEL_VERSION,
      simulationSeed: 5,
      randomState: 5,
      runSerial: 3,
      seededFromDay: 0,
      exactFromStart: true,
    });
  });

  it('migrates an older save from its current day without overstating replay history', () => {
    const provenance = BH.bhExperimentProvenance({ day: 47 });
    expect(provenance.simulationSeed).toBe(BH.BEEHIVE_DEFAULT_SEED);
    expect(provenance.randomState).toBe(BH.BEEHIVE_DEFAULT_SEED);
    expect(provenance.runSerial).toBe(1);
    expect(provenance.seededFromDay).toBe(47);
    expect(provenance.exactFromStart).toBe(false);
  });
  it('creates a compact, bounded, non-mutating experiment checkpoint', () => {
    const state = {
      day: 12,
      modelVersion: BH.BEEHIVE_COLONY_MODEL_VERSION,
      simulationSeed: 99,
      randomState: 123,
      experimentRunSerial: 7,
      seededFromDay: 0,
      subspecies: 'russian',
      apiarySite: 'forest',
      workers: 12345.6,
      honey: -4,
      varroaLevel: 140,
      history: Array.from({ length: 120 }, (_, day) => ({ day })),
      journal: [{ text: 'large transient record' }],
      managementTrail: Array.from({ length: 30 }, (_, index) => ({
        day: index + 1,
        label: `Choice ${index + 1}`,
        cost: '1 AP',
        summary: 'x'.repeat(400),
      })),
    };
    const before = JSON.parse(JSON.stringify(state));

    const snapshot = BH.bhCreateExperimentSnapshot(state);

    expect(snapshot).toMatchObject({
      schemaVersion: BH.BEEHIVE_EXPERIMENT_SNAPSHOT_VERSION,
      modelVersion: BH.BEEHIVE_COLONY_MODEL_VERSION,
      simulationSeed: 99,
      runSerial: 7,
      seededFromDay: 0,
      exactFromStart: true,
      capturedDay: 12,
      stockId: 'russian',
      siteId: 'forest',
    });
    expect(snapshot.metrics.workers).toBe(12346);
    expect(snapshot.metrics.honey).toBe(0);
    expect(snapshot.metrics.varroaLevel).toBe(100);
    expect(snapshot.managementTrail).toHaveLength(24);
    expect(snapshot.managementTrail[0].label).toBe('Choice 7');
    expect(snapshot.managementTrail[0].summary).toHaveLength(220);
    expect(snapshot).not.toHaveProperty('history');
    expect(snapshot).not.toHaveProperty('journal');
    expect(state).toEqual(before);
    expect(BH.bhNormalizeExperimentSnapshot({ schemaVersion: 999, metrics: {} })).toBeNull();
    expect(BH.bhNormalizeExperimentSnapshot(snapshot)).toEqual(snapshot);
    const unverifiedTracking = { ...snapshot };
    delete unverifiedTracking.exactFromStart;
    expect(BH.bhNormalizeExperimentSnapshot(unverifiedTracking).exactFromStart).toBe(false);
    expect(BH.bhNormalizeExperimentSnapshot({ ...snapshot, exactFromStart: false }).exactFromStart).toBe(false);
    const legacyIdentity = { ...snapshot };
    delete legacyIdentity.runSerial;
    expect(BH.bhNormalizeExperimentSnapshot(legacyIdentity).runSerial).toBe(1);
  });

  it('distinguishes same-run, matched, timing-mismatched, and exploratory comparisons', () => {
    const runA = BH.bhCreateExperimentSnapshot({
      day: 20,
      simulationSeed: 2468,
      randomState: 1357,
      seededFromDay: 0,
      subspecies: 'russian',
      apiarySite: 'forest',
      workers: 18000,
      honey: 20,
      varroaLevel: 15,
      managementTrail: [{ day: 2, label: 'Inspect brood', cost: '1 AP' }, { day: 15, label: 'Feed syrup', cost: '1 AP' }],
    });
    const matchedPlan = {
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: 'Does more forage change honey stores?',
      hypothesis: 'More forage will increase honey stores.',
      changedVariable: 'Plant wildflowers once',
      prediction: 'Run B honey will be higher at Day 20.',
    };
    const matchedNotebook = {
      ...matchedPlan,
      registeredPlan: BH.bhCreateExperimentPlanRegistration(matchedPlan, 2, runA.runSerial),
    };
    const matched = BH.bhCompareExperiments(runA, {
      day: 20,
      simulationSeed: 2468,
      randomState: 9753,
      experimentRunSerial: 2,
      seededFromDay: 0,
      subspecies: 'russian',
      apiarySite: 'forest',
      workers: 19000,
      honey: 28,
      varroaLevel: 10,
      managementTrail: [{ day: 2, label: 'Inspect brood', cost: '1 AP' }, { day: 15, label: 'Plant wildflowers', cost: '1 AP' }],
      notebook: { experiment: matchedNotebook },
    });
    const timingMismatch = BH.bhCompareExperiments(runA, {
      day: 10,
      simulationSeed: 2468,
      experimentRunSerial: 2,
      seededFromDay: 0,
      subspecies: 'russian',
      apiarySite: 'forest',
      managementTrail: [{ day: 2, label: 'Inspect brood', cost: '1 AP' }],
    });
    const exploratory = BH.bhCompareExperiments(runA, {
      day: 20,
      simulationSeed: 2469,
      experimentRunSerial: 2,
      seededFromDay: 0,
      subspecies: 'italian',
      apiarySite: 'meadow',
    });
    const sameRun = BH.bhCompareExperiments(runA, {
      day: 20,
      simulationSeed: 2468,
      seededFromDay: 0,
      subspecies: 'russian',
      apiarySite: 'forest',
      managementTrail: [{ day: 2, label: 'Inspect brood', cost: '1 AP' }, { day: 15, label: 'Feed syrup', cost: '1 AP' }],
    });

    expect(sameRun.status).toBe('same-run');
    expect(sameRun.controlledSetup).toBe(true);
    expect(sameRun.distinctRuns).toBe(false);
    expect(sameRun.matchedCheckpoint).toBe(false);
    expect(sameRun.checks.find((check) => check.id === 'run').matched).toBe(false);
    expect(sameRun.management.status).toBe('identical');
    expect(sameRun.interpretationReady).toBe(false);
    expect(matched.status).toBe('matched');
    expect(matched.controlledSetup).toBe(true);
    expect(matched.distinctRuns).toBe(true);
    expect(matched.matchedCheckpoint).toBe(true);
    expect(matched.management).toMatchObject({ status: 'one-change', differenceCount: 1, comparedThroughDay: 20, checkpointAligned: true });
    expect(matched.management.differences[0].type).toBe('changed');
    expect(matched.plannedChoice).toMatchObject({ status: 'matched', plannedActionId: 'plant_wildflowers', observedActionId: 'plant_wildflowers' });
    expect(matched.prediction).toMatchObject({ status: 'aligned', metricId: 'honey', directionId: 'higher', observedDirectionId: 'higher', delta: 8 });
    expect(matched.planRegistration).toMatchObject({ status: 'matched', runSerial: 2, baselineRunSerial: 1 });
    expect(matched.planRegistration.registeredPlan.complete).toBe(true);
    expect(matched.planRegistration.missing).toEqual([]);
    expect(matched.planRegistration.differences).toEqual([]);
    expect(matched.interpretationReady).toBe(true);
    expect(matched.metrics.find((metric) => metric.id === 'honey').delta).toBe(8);
    expect(matched.metrics.find((metric) => metric.id === 'varroaLevel').delta).toBe(-5);
    expect(timingMismatch.status).toBe('checkpoint');
    expect(timingMismatch.controlledSetup).toBe(true);
    expect(timingMismatch.matchedCheckpoint).toBe(false);
    expect(timingMismatch.checks.find((check) => check.id === 'day').matched).toBe(false);
    expect(timingMismatch.management).toMatchObject({ status: 'identical', differenceCount: 0, comparedThroughDay: 10, checkpointAligned: false });
    expect(timingMismatch.interpretationReady).toBe(false);
    expect(exploratory.status).toBe('exploratory');
    expect(exploratory.controlledSetup).toBe(false);
    expect(exploratory.checks.filter((check) => !check.matched).map((check) => check.id))
      .toEqual(expect.arrayContaining(['seed', 'stock', 'site']));
  });
  it('audits identical, added, omitted, changed, and multiple management choices', () => {
    const runA = [
      { day: 2, label: 'Inspect brood', cost: '1 AP' },
      { day: 8, label: 'Feed syrup', cost: '1 AP' },
    ];
    const identical = BH.bhCompareManagementTrails(runA, runA);
    const changed = BH.bhCompareManagementTrails(runA, [
      { day: 2, label: 'Inspect brood', cost: '1 AP' },
      { day: 8, label: 'Plant wildflowers', cost: '1 AP' },
    ]);
    const added = BH.bhCompareManagementTrails(runA, runA.concat([{ day: 9, label: 'Treat mites', cost: '2 AP' }]));
    const omitted = BH.bhCompareManagementTrails(runA, runA.slice(0, 1));
    const multiple = BH.bhCompareManagementTrails(runA, [
      { day: 1, label: 'Plant wildflowers', cost: '1 AP' },
      { day: 4, label: 'Treat mites', cost: '2 AP' },
      { day: 9, label: 'Harvest honey', cost: '1 AP' },
    ]);

    expect(identical).toMatchObject({ status: 'identical', differenceCount: 0, baselineCount: 2, currentCount: 2 });
    expect(changed).toMatchObject({ status: 'one-change', differenceCount: 1 });
    expect(changed.differences[0]).toMatchObject({ type: 'changed', baseline: { label: 'Feed syrup' }, current: { label: 'Plant wildflowers' } });
    expect(added.differences[0]).toMatchObject({ type: 'added', current: { label: 'Treat mites' } });
    expect(omitted.differences[0]).toMatchObject({ type: 'omitted', baseline: { label: 'Feed syrup' } });
    expect(multiple.status).toBe('multiple-changes');
    expect(multiple.differenceCount).toBeGreaterThan(1);

    expect(BH.bhComparePlannedManagementChoice('plant_wildflowers', changed))
      .toMatchObject({ status: 'matched', plannedActionLabel: 'Plant wildflowers', observedActionLabel: 'Plant wildflowers' });
    expect(BH.bhComparePlannedManagementChoice('feed_bees', changed).status).toBe('mismatched');
    expect(BH.bhComparePlannedManagementChoice('', changed).status).toBe('unplanned');
    expect(BH.bhComparePlannedManagementChoice('plant_wildflowers', identical).status).toBe('waiting');
    expect(BH.bhManagementActionPlanId({ choiceId: 'water_station', label: 'Localized label' })).toBe('water_station');
    expect(BH.bhManagementActionPlanId({ label: 'Harvest Summer Wildflower' })).toBe('harvest_honey');
    expect(BH.bhManagementActionPlanId({ label: 'Oxalic Acid Dribble' })).toBe('varroa_treatment');

    const predictionComparison = { matchedCheckpoint: true, metrics: [
      { id: 'honey', label: 'Honey', suffix: ' lb', precision: 1, baseline: 20, current: 28, delta: 8 },
      { id: 'workers', label: 'Workers', suffix: '', precision: 0, baseline: 10000, current: 10000, delta: 0 },
    ] };
    expect(BH.bhEvaluateExperimentPrediction({ predictedMetricId: 'honey', predictedDirection: 'higher' }, predictionComparison))
      .toMatchObject({ status: 'aligned', metricId: 'honey', observedDirectionId: 'higher' });
    expect(BH.bhEvaluateExperimentPrediction({ predictedMetricId: 'honey', predictedDirection: 'lower' }, predictionComparison).status).toBe('not-aligned');
    expect(BH.bhEvaluateExperimentPrediction({ predictedMetricId: 'workers', predictedDirection: 'same' }, predictionComparison))
      .toMatchObject({ status: 'aligned', observedDirectionId: 'same', delta: 0 });
    expect(BH.bhEvaluateExperimentPrediction({ predictedMetricId: 'honey', predictedDirection: 'higher' }, { ...predictionComparison, matchedCheckpoint: false }).status).toBe('waiting');
    expect(BH.bhEvaluateExperimentPrediction({ predictedMetricId: '', predictedDirection: '' }, predictionComparison).status).toBe('unplanned');
    expect(BH.bhExperimentPredictionMetric('honey').label).toBe('Honey');
    expect(BH.bhExperimentPredictionMetric('unknown')).toBeNull();
    expect(BH.bhExperimentPredictionDirection('HIGHER').id).toBe('higher');
    expect(BH.bhExperimentPredictionDirection('unknown')).toBeNull();
  });

  it('registers a complete plan immutably and explains edits, omissions, and legacy runs', () => {
    const plan = {
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: 'Does forage support change honey stores?',
      hypothesis: 'More forage will increase honey stores.',
      changedVariable: 'Plant wildflowers once',
      prediction: 'Run B honey will be higher at Day 12.',
    };
    const registration = BH.bhCreateExperimentPlanRegistration(plan, 2, 1);

    expect(registration).toMatchObject({ schemaVersion: 1, runSerial: 2, baselineRunSerial: 1, complete: true });
    expect(registration).toMatchObject(plan);
    expect(BH.bhNormalizeExperimentPlanRegistration(registration)).toEqual(registration);
    expect(BH.bhNormalizeExperimentPlanRegistration({ ...registration, runSerial: 0 })).toBeNull();
    expect(BH.bhNormalizeExperimentPlanRegistration({ ...registration, schemaVersion: 99 })).toBeNull();
    expect(BH.bhExperimentPlanMissing(plan)).toEqual([]);

    const matched = BH.bhCompareExperimentPlanRegistration({ ...plan, registeredPlan: registration }, 2, 1);
    expect(matched).toMatchObject({ status: 'matched', runSerial: 2, baselineRunSerial: 1 });
    expect(matched.registeredPlan.complete).toBe(true);
    expect(matched.differences).toEqual([]);
    expect(matched.missing).toEqual([]);

    const changed = BH.bhCompareExperimentPlanRegistration({ ...plan, hypothesis: 'A revised explanation.', registeredPlan: registration }, 2, 1);
    expect(changed.status).toBe('changed');
    expect(changed.differences).toEqual([expect.objectContaining({ id: 'hypothesis', registered: plan.hypothesis, current: 'A revised explanation.' })]);

    const incompleteRegistration = BH.bhCreateExperimentPlanRegistration({ plannedActionId: 'plant_wildflowers' }, 2, 1);
    const incomplete = BH.bhCompareExperimentPlanRegistration({ ...plan, registeredPlan: incompleteRegistration }, 2, 1);
    expect(incomplete.status).toBe('incomplete');
    expect(incomplete.registeredPlan.complete).toBe(false);
    expect(incomplete.missing.map((field) => field.id)).toEqual(expect.arrayContaining(['predictedMetricId', 'predictedDirection', 'question', 'hypothesis', 'changedVariable', 'prediction']));

    expect(BH.bhCompareExperimentPlanRegistration(plan, 2, 1).status).toBe('unregistered');
    expect(BH.bhCompareExperimentPlanRegistration({ ...plan, registeredPlan: registration }, 3, 1).status).toBe('unregistered');
    expect(BH.bhCompareExperimentPlanRegistration({ ...plan, registeredPlan: registration }, 2, 9).status).toBe('unregistered');

    const notebook = BH.bhExperimentNotebookWithRegisteredPlan({ experiment: { ...plan }, reflection: 'preserved' }, 2, 1);
    expect(notebook.reflection).toBe('preserved');
    expect(notebook.experiment.registeredPlan).toEqual(registration);
    expect(notebook.experiment).not.toBe(plan);
  });

  it('normalizes bounded notebook evidence and exports comparison-aware reasoning', () => {
    const rawNotebook = {
      question: 'q'.repeat(500),
      hypothesis: 'If habitat changes, honey will change because forage changes.',
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      changedVariable: 'Plant wildflowers once',
      prediction: 'At Day 12, Run B honey will be higher.',
      observations: 'Run B had more honey.',
      alternativeExplanation: 'A later eligible event could also change stores.',
      conclusion: 'The evidence supported the prediction with uncertainty.',
      review: { singleVariable: true, numericEvidence: true, uncertainty: true },
      ignored: 'transient',
    };
    rawNotebook.registeredPlan = BH.bhCreateExperimentPlanRegistration(rawNotebook, 2, 1);
    const before = JSON.parse(JSON.stringify(rawNotebook));
    const notebook = BH.bhNormalizeExperimentNotebook(rawNotebook);
    expect(notebook.schemaVersion).toBe(BH.BEEHIVE_EXPERIMENT_NOTEBOOK_VERSION);
    expect(notebook.question).toHaveLength(300);
    expect(notebook.plannedActionId).toBe('plant_wildflowers');
    expect(notebook.predictedMetricId).toBe('honey');
    expect(notebook.predictedDirection).toBe('higher');
    expect(notebook.registeredPlan).toMatchObject({ schemaVersion: 1, runSerial: 2, baselineRunSerial: 1, complete: true });
    expect(BH.bhNormalizeExperimentNotebook({ predictedMetricId: 'unknown', predictedDirection: 'sideways' }))
      .toMatchObject({ predictedMetricId: '', predictedDirection: '' });
    expect(notebook).not.toHaveProperty('ignored');
    expect(notebook.review).toEqual({ singleVariable: true, numericEvidence: true, uncertainty: true });
    expect(rawNotebook).toEqual(before);

    const runA = BH.bhCreateExperimentSnapshot({
      day: 12,
      simulationSeed: 4321,
      randomState: 777,
      seededFromDay: 0,
      honey: 20,
      managementTrail: [{ day: 3, label: 'Inspect brood', cost: '1 AP' }],
    });
    const current = {
      day: 12,
      simulationSeed: 4321,
      randomState: 888,
      experimentRunSerial: 2,
      seededFromDay: 0,
      honey: 28,
      managementTrail: [{ day: 4, label: 'Plant wildflowers', cost: '1 AP' }],
    };
    const matchedRecord = BH.bhBuildExperimentEvidenceRecord(notebook, runA, current);
    expect(matchedRecord).toContain('## Guided Experiment Notebook');
    expect(matchedRecord).toContain('### Plan');
    expect(matchedRecord).toContain('**One intended change:** Plant wildflowers once');
    expect(matchedRecord).toContain('**Comparison status:** Protected comparison ready');
    expect(matchedRecord).toContain('**Plan registration:** Recorded before Colony Run 2 against Run A Colony Run 1 (complete)');
    expect(matchedRecord).toContain('### Plan-timing audit');
    expect(matchedRecord).toContain('**Result:** Complete plan matches the copy recorded before Run B');
    expect(matchedRecord).toContain('**Bound runs:** Run A Colony Run 1 / Run B Colony Run 2');
    expect(matchedRecord).toContain('**Recovery:** No timing repair needed.');
    expect(matchedRecord).toContain('**Planned management choice:** Plant wildflowers');
    expect(matchedRecord).toContain('**Prediction metric:** Honey');
    expect(matchedRecord).toContain('**Expected direction:** Run B will be higher');
    expect(matchedRecord).toContain('### Prediction audit');
    expect(matchedRecord).toContain('**Observed direction:** Run B was higher (+8 lb)');
    expect(matchedRecord).toContain('**Result:** Displayed numeric pattern aligns with the prediction');
    expect(matchedRecord).toContain('does not prove the management choice caused the result');
    expect(matchedRecord).toContain('| Honey | 20 lb | 28 lb | +8 lb |');
    expect(matchedRecord).toContain('**Run A recent choices:** Day 3: Inspect brood (1 AP)');
    expect(matchedRecord).toContain('**Run B recent choices:** Day 4: Plant wildflowers (1 AP)');
    expect(matchedRecord).toContain('### Management-choice audit');
    expect(matchedRecord).toContain('**Recorded-choice result:** One difference');
    expect(matchedRecord).toContain('**Plan alignment:** Recorded change matches the plan');
    expect(matchedRecord).toContain('**Difference 1 (changed):**');
    expect(matchedRecord).toContain('**Same-checkpoint numeric evidence cited:** Checked');
    expect(matchedRecord).toContain('one recorded choice difference');
    expect(matchedRecord).toContain('does not prove causation by itself');

    const changedPlanRecord = BH.bhBuildExperimentEvidenceRecord({ ...notebook, hypothesis: 'Revised after the run started.' }, runA, current);
    expect(changedPlanRecord).toContain('**Comparison status:** Matched checkpoint - plan changed after Run B started');
    expect(changedPlanRecord).toContain('**Result:** Current plan differs from the copy recorded before Run B');
    expect(changedPlanRecord).toContain('**Edited after Run B start - hypothesis:**');
    expect(changedPlanRecord).toContain('Complete the current plan and restart Run B');

    const incompletePlan = { ...notebook, registeredPlan: BH.bhCreateExperimentPlanRegistration({ plannedActionId: 'plant_wildflowers' }, 2, 1) };
    const incompletePlanRecord = BH.bhBuildExperimentEvidenceRecord(incompletePlan, runA, current);
    expect(incompletePlanRecord).toContain('**Comparison status:** Matched checkpoint - plan incomplete at Run B start');
    expect(incompletePlanRecord).toContain('**Result:** Plan copy recorded before Run B was incomplete');
    expect(incompletePlanRecord).toContain('**Missing at Run B start:** prediction metric');

    const unregisteredPlanRecord = BH.bhBuildExperimentEvidenceRecord({ ...notebook, registeredPlan: null }, runA, current);
    expect(unregisteredPlanRecord).toContain('**Comparison status:** Matched checkpoint - plan timing not recorded');
    expect(unregisteredPlanRecord).toContain('No plan copy is tied to this Run B and saved Run A');

    const directionMismatchRecord = BH.bhBuildExperimentEvidenceRecord({ ...notebook, predictedDirection: 'lower' }, runA, current);
    expect(directionMismatchRecord).toContain('**Result:** Displayed numeric pattern does not align with the prediction');
    const unstructuredPredictionRecord = BH.bhBuildExperimentEvidenceRecord({ ...notebook, predictedMetricId: '', predictedDirection: '' }, runA, current);
    expect(unstructuredPredictionRecord).toContain('**Structured prediction:** Not selected');
    expect(unstructuredPredictionRecord).toContain('Choose a metric and expected direction before evaluating the result');

    const mismatchedRecord = BH.bhBuildExperimentEvidenceRecord({ ...notebook, plannedActionId: 'feed_bees' }, runA, current);
    expect(mismatchedRecord).toContain('**Comparison status:** Matched checkpoint - recorded change differs from plan');
    expect(mismatchedRecord).toContain('**Plan alignment:** Recorded change does not match the plan (Plant wildflowers)');
    expect(mismatchedRecord).toContain('Treat this as an unplanned result');
    const unplannedRecord = BH.bhBuildExperimentEvidenceRecord({ ...notebook, plannedActionId: '' }, runA, current);
    expect(unplannedRecord).toContain('**Comparison status:** Matched checkpoint - planned choice not selected');
    expect(unplannedRecord).toContain('No structured planned choice selected');

    const noChangeRecord = BH.bhBuildExperimentEvidenceRecord(notebook, runA, { ...current, managementTrail: runA.managementTrail });
    expect(noChangeRecord).toContain('**Comparison status:** Matched checkpoint - no recorded choice change');
    expect(noChangeRecord).toContain('There is no changed variable to interpret');
    const multipleRecord = BH.bhBuildExperimentEvidenceRecord(notebook, runA, { ...current, managementTrail: [
      { day: 1, label: 'Feed syrup', cost: '1 AP' },
      { day: 5, label: 'Treat mites', cost: '2 AP' },
      { day: 9, label: 'Harvest honey', cost: '1 AP' },
    ] });
    expect(multipleRecord).toContain('**Comparison status:** Matched checkpoint - multiple recorded choice changes');
    expect(multipleRecord).toContain('result cannot isolate one changed variable');

    const exploratoryRecord = BH.bhBuildExperimentEvidenceRecord(notebook, runA, { ...current, simulationSeed: 9999 });
    expect(exploratoryRecord).toContain('**Comparison status:** Exploratory comparison');
    expect(exploratoryRecord).toContain('**Same-checkpoint numeric evidence cited:** Not checked');
    expect(exploratoryRecord).toContain('Treat these differences as observations');
    expect(BH.bhBuildExperimentEvidenceRecord(notebook, null, current)).toContain('Run A has not been saved yet');
  });
});

describe('Beehive reproducibility surfaces', () => {
  it('shows an editable seed before Day 1 and locks it after the run begins', () => {
    const setup = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 0, simulationSeed: 1234 } });
    const active = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 1, simulationSeed: 1234, randomState: 5678, seededFromDay: 0 } });

    expect(setup).toContain('data-beehive-experiment-provenance="true"');
    expect(setup).toContain('data-beehive-seed="1234"');
    expect(setup).toContain('data-beehive-seed-input="true"');
    expect(setup).toContain('<fieldset');
    expect(setup).toContain('Repeatable experiment setup');
    expect(setup).toContain('A seed is the recipe for the simulation');
    expect(setup).toContain('data-beehive-seed-status="setup"');
    expect(setup).toContain('data-beehive-fresh-seed="true"');
    expect(setup).toContain('Fair-comparison tip:');
    expect(setup).toMatch(/data-beehive-seed-input="true"[^>]*aria-readonly="false"|aria-readonly="false"[^>]*data-beehive-seed-input="true"/);

    expect(active).toContain('data-beehive-seed="1234"');
    expect(active).toContain('data-beehive-seed-status="locked"');
    expect(active).toContain('The recipe is read-only after Day 1');
    expect(active).not.toContain('data-beehive-fresh-seed="true"');
    expect(active).toMatch(/data-beehive-seed-input="true"[^>]*aria-readonly="true"|aria-readonly="true"[^>]*data-beehive-seed-input="true"/);
  });

  it('explains legacy migration honestly and offers two clear restart paths', () => {
    const legacy = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 47 } });
    const collapsed = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 68, colonySurvived: false, simulationSeed: 2468, randomState: 1357, seededFromDay: 0 } });

    expect(legacy).toContain('data-beehive-seed-migration-note="true"');
    expect(legacy).toContain('days before that point cannot be replayed exactly');
    expect(collapsed).toContain('Choose your next experiment');
    expect(collapsed).toContain('data-beehive-restart="same-seed"');
    expect(collapsed).toContain('data-beehive-restart="fresh-seed"');
    expect(collapsed).toContain('Replay same seed');
    expect(collapsed).toContain('Use a new seed');
  });

  it('renders a clear, semantic Run A and Run B evidence workspace', () => {
    const baseline = BH.bhCreateExperimentSnapshot({
      day: 12,
      simulationSeed: 4321,
      randomState: 777,
      seededFromDay: 0,
      workers: 14000,
      honey: 31,
      managementTrail: [{ day: 4, label: 'Inspect brood', cost: '1 AP' }],
    });
    const protectedPlan = {
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: 'Does more forage change honey stores?',
      hypothesis: 'More forage will increase honey stores.',
      changedVariable: 'Plant wildflowers once',
      prediction: 'Run B honey will be higher at Day 12.',
    };
    const html = renderTool('beehive', { beehive: {
      viewMode: 'beekeeper',
      day: 12,
      simulationSeed: 4321,
      randomState: 888,
      experimentRunSerial: 2,
      seededFromDay: 0,
      workers: 15000,
      honey: 36,
      experimentBaseline: baseline,
      managementTrail: [{ day: 5, label: 'Plant wildflowers', cost: '1 AP' }],
      notebook: { experiment: { ...protectedPlan, registeredPlan: BH.bhCreateExperimentPlanRegistration(protectedPlan, 2, baseline.runSerial) } },
    } });

    expect(html).toContain('data-beehive-experiment-compare="true"');
    expect(html).toContain('data-experiment-compare-state="matched"');
    expect(html).toContain('data-experiment-compare-table="true"');
    expect(html).toContain('<caption');
    expect(html).toContain('Run A at Day 12 and Run B at Day 12');
    expect(html).toContain('Difference (B - A)');
    expect(html).toContain('data-experiment-check="seed"');
    expect(html).toContain('data-experiment-check-result="matched"');
    expect(html).toContain('data-experiment-actions="baseline"');
    expect(html).toContain('data-experiment-actions="current"');
    expect(html).toContain('data-experiment-evidence-prompt="true"');
    expect(html).toContain('data-experiment-protocol="true"');
    expect(html.match(/data-experiment-protocol-step=/g)).toHaveLength(8);
    expect(html).toContain('Start a separate Run B');
    expect(html).toContain('data-experiment-check="run"');
    expect(html).toContain('data-experiment-management-audit="true"');
    expect(html).toContain('data-management-audit-status="one-change"');
    expect(html).toContain('data-management-audit-final="true"');
    expect(html).toContain('data-management-difference="changed"');
    expect(html).toContain('data-experiment-plan-alignment="matched"');
    expect(html).toContain('data-experiment-plan-registration="true"');
    expect(html).toContain('data-plan-registration-status="matched"');
    expect(html).toContain('data-experiment-protocol-step="registration"');
    expect(html).toContain('data-experiment-prediction-audit="true"');
    expect(html).toContain('data-prediction-audit-status="aligned"');
    expect(html).toContain('Numeric direction aligned');
    expect(html).toContain('Protected comparison ready');
    expect(html).toContain('Replace Run A with current');
    expect(html).toContain('Clear Run A');
  });
  it('renders the guided evidence chain with progressive, semantic controls', () => {
    const baseline = BH.bhCreateExperimentSnapshot({ day: 12, simulationSeed: 4321, seededFromDay: 0, honey: 20, managementTrail: [{ day: 4, label: 'Inspect brood', cost: '1 AP' }] });
    const html = renderTool('beehive', { beehive: {
      viewMode: 'beekeeper',
      day: 12,
      simulationSeed: 4321,
      randomState: 888,
      experimentRunSerial: 2,
      seededFromDay: 0,
      honey: 28,
      experimentBaseline: baseline,
      managementTrail: [{ day: 4, label: 'Plant wildflowers', cost: '1 AP' }],
      experimentNotebookOpen: true,
      notebook: { experiment: {
        plannedActionId: 'plant_wildflowers',
        predictedMetricId: 'honey',
        predictedDirection: 'higher',
        question: 'Does forage support change honey stores?',
        hypothesis: 'More forage will increase honey.',
        changedVariable: 'Plant wildflowers once',
        prediction: 'Run B honey will be higher at Day 12.',
        observations: 'Run A had 20 lb and Run B had 28 lb.',
        registeredPlan: BH.bhCreateExperimentPlanRegistration({
          plannedActionId: 'plant_wildflowers',
          predictedMetricId: 'honey',
          predictedDirection: 'higher',
          question: 'Does forage support change honey stores?',
          hypothesis: 'More forage will increase honey.',
          changedVariable: 'Plant wildflowers once',
          prediction: 'Run B honey will be higher at Day 12.',
        }, 2, baseline.runSerial),
      } },
    } });

    expect(html).toContain('data-beehive-experiment-notebook="true"');
    expect(html).toContain('data-experiment-notebook-phase="plan"');
    expect(html).toContain('data-experiment-notebook-phase="analyze"');
    expect(html).toContain('data-experiment-notebook-review="true"');
    expect(html).toContain('data-experiment-notebook-field="question"');
    expect(html).toContain('data-experiment-notebook-field="alternativeExplanation"');
    expect(html.match(/data-experiment-notebook-field=/g)).toHaveLength(7);
    expect(html.match(/data-experiment-notebook-review-check=/g)).toHaveLength(3);
    expect(html).toContain('data-experiment-notebook-capture="true"');
    expect(html).toContain('data-experiment-planned-action="true"');
    expect(html).toContain('data-experiment-structured-prediction="true"');
    expect(html).toContain('data-experiment-prediction-metric="true"');
    expect(html).toContain('data-experiment-prediction-direction="true"');
    expect(html).toContain('data-experiment-protocol-step="choice"');
    expect(html).toContain('data-experiment-protocol-step="prediction"');
    expect(html).toContain('data-experiment-protocol-step="registration"');
    expect(html).toContain('data-plan-registration-status="matched"');
    expect(html).toContain('data-management-audit-status="one-change"');
    expect(html).toContain('data-beehive-copy-experiment="true"');
    expect(html).toContain('aria-valuemax="10"');
    expect(html).toContain('aria-valuenow="8"');
    expect(html).toContain('Plan, observe, explain, and export the evidence chain.');
    expect(SOURCE.match(/lines\.push\(bhBuildExperimentEvidenceRecord/g)).toHaveLength(2);
  });
  it('includes model, seed, cursor, migration day, scope, and replay requirements in exports', () => {
    [
      '## Repeatable Experiment Details',
      '**Colony run:**',
      '**Event recipe (seed):**',
      '**Daily colony model:**',
      '**Resume code:**',
      '**Tracking began:** Day',
      '**Exact replay:** Use the same model version, seed, starting colony, and management choices.',
      '**Controlled comparison:** Keep the seed, stock, site, and timing the same; change one management choice.',
      '**Scope:** Covers Beekeeper daily colony outcomes.',
    ].forEach((text) => expect(SOURCE).toContain(text));
  });

  it('persists one seeded cursor across a batch instead of reseeding each day', () => {
    expect(SOURCE).toContain('var seededRandom = bhCreateSeededRandom(savedProvenance.randomState);');
    expect(SOURCE).toContain('var seededCfg = bhCfg(seededRandom.rand);');
    expect(SOURCE).toContain('var _br = bhStepColony(_bs, seededCfg);');
    expect(SOURCE).toContain('b.randomState = seededRandom.getState();');
  });
});
