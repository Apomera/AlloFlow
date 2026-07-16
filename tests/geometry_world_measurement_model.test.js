import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const SOURCE = fs.readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');

function loadMeasurementMath() {
  const start = SOURCE.indexOf('  function formatVolume(vol)');
  const end = SOURCE.indexOf('  var ACHIEVEMENTS = [', start);
  const body = SOURCE.slice(start, end);
  return new Function(body + '\nreturn { measuredVolume, enrichMeasurement, formatVolume, parseVolumePrediction, compareVolumePrediction, diagnoseVolumePrediction, comparePredictionRevision, evaluateVolumePrediction, objectiveEvidenceFor, buildEvidenceReflectionPrompt, buildVolumeRepresentations, buildRepresentationExploration, determinePredictionScaffold, buildRetrievalCheckpoint, checkRetrievalAnswer, escapeReportHtml, misconceptionGuidance, summarizeLearningEvidence, countExposedCubeFaces, completeMeasurementRecords, summarizePredictionAccuracy, serializeEventDetailValue, formatSessionEventDetails, measurementDetailsForReport, elapsedSecondsForEvent, questionDetailsForReport, compareMeasurementRecords, measurementLayerFor, belongsToMeasuredComponent };')();
}

describe('Geometry World measurement model', () => {
  const math = loadMeasurementMath();

  it('uses L x W x H for a completely filled rectangular prism', () => {
    const result = math.enrichMeasurement({ count: 24, totalVolume: 24, boundingVolume: 24, hasFractions: false });

    expect(result.isSolidPrism).toBe(true);
    expect(result.occupiedVolume).toBe(24);
    expect(result.missingVolume).toBe(0);
    expect(result.fillPercent).toBe(100);
  });

  it('separates occupied volume from bounding-box volume for composite forms', () => {
    const result = math.enrichMeasurement({ count: 8, totalVolume: 8, boundingVolume: 12, hasFractions: false });

    expect(result.isSolidPrism).toBe(false);
    expect(result.formattedOccupiedVolume).toBe('8');
    expect(result.missingVolume).toBe(4);
    expect(result.fillPercent).toBe(67);
  });

  it('preserves fractional occupied volume', () => {
    const result = math.enrichMeasurement({ count: 2, totalVolume: 1.5, boundingVolume: 2, hasFractions: true });

    expect(result.isSolidPrism).toBe(false);
    expect(result.formattedOccupiedVolume).toBe('1 1/2');
    expect(result.missingVolume).toBe(0.5);
    expect(result.fillPercent).toBe(75);
  });

  it('counts exposed unit faces for solid and composite cube structures', () => {
    const single = math.countExposedCubeFaces([{ x: 0, y: 0, z: 0 }]);
    const pair = math.countExposedCubeFaces([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]);
    const cube = [];
    for (let x = 0; x < 2; x += 1) for (let y = 0; y < 2; y += 1) for (let z = 0; z < 2; z += 1) cube.push({ x, y, z });
    expect(single.surfaceArea).toBe(6);
    expect(pair).toMatchObject({ xFaces: 2, yFaces: 4, zFaces: 4, surfaceArea: 10 });
    expect(math.countExposedCubeFaces(cube).surfaceArea).toBe(24);
    expect(math.countExposedCubeFaces([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }]).surfaceArea).toBe(14);
  });

  it('compares equal-volume structures by exposed surface efficiency', () => {
    const efficient = math.compareMeasurementRecords({ occupiedVolume: 24, surfaceArea: 52 }, { occupiedVolume: 24, surfaceArea: 46 });
    expect(efficient).toMatchObject({ sameVolume: true, surfaceAreaDifference: -6, moreSurfaceEfficient: 'latest' });
    expect(efficient.volumeDifference).toBe(0);
    const changed = math.compareMeasurementRecords({ occupiedVolume: 18, surfaceArea: 42 }, { occupiedVolume: 24, surfaceArea: 52 });
    expect(changed).toMatchObject({ sameVolume: false, volumeDifference: 6, moreSurfaceEfficient: null });
    const legacy = math.compareMeasurementRecords({ vol: '1 1/2' }, { vol: '2' });
    expect(legacy).toMatchObject({ previousVolume: 1.5, latestVolume: 2, volumeDifference: 0.5 });
  });
  it('marks capped measurements incomplete and excludes them from comparisons', () => {
    const incomplete = math.enrichMeasurement({ count: 1500, totalVolume: 1500, boundingVolume: 1500, hasFractions: false, shapeCounts: { cube: 1500 }, blocks: [{ x: 0, y: 0, z: 0 }], isComplete: false });
    expect(incomplete).toMatchObject({ isComplete: false, isSolidPrism: false, surfaceAreaExact: false, exposedSurfaceArea: null, exposedFaces: null });
    expect(math.compareMeasurementRecords(incomplete, { occupiedVolume: 10, surfaceArea: 20, isComplete: true })).toBeNull();
  });

  it('retains incomplete scans but skips them when selecting complete history', () => {
    const records = [{ id: 'first' }, { id: 'capped', isComplete: false }, { id: 'latest', isComplete: true }];
    expect(math.completeMeasurementRecords(records).map((record) => record.id)).toEqual(['first', 'latest']);
    expect(math.completeMeasurementRecords(null)).toEqual([]);
  });

  it('summarizes actual prediction quality instead of cube shape', () => {
    const summary = math.summarizePredictionAccuracy([{ data: { predictionPercentError: 0 } }, { data: { predictionPercentError: 5 } }, { percentError: 25 }, { data: { predictionPercentError: null } }]);
    expect(summary).toEqual({ predictionsMade: 3, exactPredictions: 1, predictionsWithin10Percent: 2, averagePredictionPercentError: 10, measurementsWithoutPrediction: 1 });
  });

  it('preserves structured event details for deterministic CSV export', () => {
    const details = math.formatSessionEventDetails({ prediction: null, note: 'a "quote"', materialCounts: { stone: 2, gold: 1 } });
    expect(details).toBe('materialCounts={"stone":2,"gold":1}; note=a "quote"; prediction=');
    expect(math.serializeEventDetailValue([1, 2])).toBe('[1,2]');
  });

  it('builds deterministic measurement-level educator evidence', () => {
    const detail = math.measurementDetailsForReport([{ elapsed: '2.5s', data: { L: 2, W: 3, H: 4, isSolidPrism: true, volume: 24, prediction: 20, predictionPercentError: 17, surfaceArea: 52, blocks: 24, materialCounts: { stone: 20, gold: 4 } } }])[0];
    expect(detail).toEqual({ sequence: 1, elapsed: '2.5s', dimensions: '2\u00d73\u00d74', shape: 'Rectangular prism', occupiedVolume: 24, prediction: 20, predictionPercentError: 17, surfaceArea: 52, blocks: 24, materials: ['gold', 'stone'] });
  });

  it('keeps question evidence chronological with valid report times', () => {
    const details = math.questionDetailsForReport([{ type: 'answer_wrong', timestamp: 1250, elapsed: '1.3s', data: { question: 'First', choice: 'A' } }, { type: 'block_place', timestamp: 1800, data: {} }, { type: 'answer_correct', elapsed: '2.6s', data: { question: 'Second', chosenAnswer: 'B' } }]);
    expect(details.map((detail) => detail.correct)).toEqual([false, true]);
    expect(details.map((detail) => detail.elapsedSeconds)).toEqual([1, 3]);
    expect(details.map((detail) => detail.sequence)).toEqual([1, 2]);
    expect(math.elapsedSecondsForEvent({ elapsed: 'not available' })).toBeNull();
  });





  it('keeps world layers separate while combining connected student materials', () => {
    const student = { blockType: 'stone', _measurementLayer: 'student' };
    const anotherStudent = { blockType: 'stone', _measurementLayer: 'student' };
    const ground = { blockType: 'stone', _measurementLayer: 'ground', _lessonBlock: true };
    const lesson = { blockType: 'stone', _measurementLayer: 'lesson', _lessonBlock: true };
    expect(math.measurementLayerFor({ blockType: 'stone' })).toBe('student');
    expect(math.belongsToMeasuredComponent(student, anotherStudent)).toBe(true);
    expect(math.belongsToMeasuredComponent(student, ground)).toBe(false);
    expect(math.belongsToMeasuredComponent(lesson, ground)).toBe(false);
    expect(math.belongsToMeasuredComponent(student, { blockType: 'gold', _measurementLayer: 'student' })).toBe(true);
  });

  it('parses decimal, simple-fraction, and mixed-number predictions', () => {
    expect(math.parseVolumePrediction('24.5')).toBe(24.5);
    expect(math.parseVolumePrediction('3/4')).toBe(0.75);
    expect(math.parseVolumePrediction('1 1/2')).toBe(1.5);
    expect(math.parseVolumePrediction('not a number')).toBeNull();
  });

  it('compares predictions without treating an estimate as a score', () => {
    const exact = math.compareVolumePrediction('24', 24);
    const over = math.compareVolumePrediction('30', 24);
    const under = math.compareVolumePrediction('23', 24);
    expect(exact).toMatchObject({ relation: 'exact', percentError: 0, accuracyLabel: 'Exact match!' });
    expect(over).toMatchObject({ relation: 'over', percentError: 25 });
    expect(under).toMatchObject({ relation: 'under', percentError: 4 });
  });


  it('turns common volume errors into targeted learning prompts', () => {
    const prism = { L: 4, W: 3, H: 2, occupiedVolume: 24, boundingVolume: 24, missingVolume: 0, count: 24, isSolidPrism: true, hasFractions: false };
    const oneLayer = math.evaluateVolumePrediction(prism, { input: '12', strategy: 'layers', reason: 'I counted the base' });
    expect(oneLayer).toMatchObject({ diagnosisCode: 'one_layer', strategy: 'layers', reason: 'I counted the base' });
    expect(oneLayer.learningPrompt).toContain('area of one layer');

    const composite = { L: 3, W: 2, H: 2, occupiedVolume: 8, boundingVolume: 12, missingVolume: 4, count: 8, isSolidPrism: false, hasFractions: false };
    expect(math.evaluateVolumePrediction(composite, { input: '12' }).diagnosisCode).toBe('bounding_box');

    const fractional = { L: 2, W: 1, H: 1, occupiedVolume: 1.5, boundingVolume: 2, missingVolume: 0.5, count: 2, isSolidPrism: false, hasFractions: true };
    expect(math.evaluateVolumePrediction(fractional, { input: '2' }).diagnosisCode).toBe('fraction_count');
  });

  it('shows whether revising a prediction improves the estimate', () => {
    const original = math.compareVolumePrediction('12', 24);
    expect(math.comparePredictionRevision(original, '20')).toMatchObject({ prediction: 20, percentError: 17, improvement: 33 });
    expect(math.comparePredictionRevision(original, '24')).toMatchObject({ percentError: 0, improvement: 50, feedback: 'Revision matches the measured volume exactly.' });
    expect(math.comparePredictionRevision(original, '')).toBeNull();
  });

  it('requires meaningful evidence for geometry objectives', () => {
    const base = { answered: 0, totalQuestions: 2, blocksPlaced: 1, measurements: [], structureCount: 3 };
    expect(math.objectiveEvidenceFor('Build a room', base)).toMatchObject({ done: false, evidence: '1/5 blocks placed' });
    expect(math.objectiveEvidenceFor('Build a room', { ...base, blocksPlaced: 5 }).done).toBe(true);
    expect(math.objectiveEvidenceFor('Explore the structures', { ...base, measurements: [{}, { isComplete: false }] })).toMatchObject({ done: false, evidence: '1/2 structures investigated' });
    expect(math.objectiveEvidenceFor('Explore the structures', { ...base, measurements: [{}, {}] }).done).toBe(true);
    expect(math.objectiveEvidenceFor('Compare two shapes', { ...base, measurements: [{}, {}] }).done).toBe(true);
    expect(math.objectiveEvidenceFor('Answer every question', { ...base, answered: 2 }).done).toBe(true);
  });

  it('requires reasoning for prediction objectives', () => {
    const unexplained = { measurements: [{ prediction: 20 }], structureCount: 1 };
    const explained = { measurements: [{ prediction: 20, strategy: 'layers' }], structureCount: 1 };
    expect(math.objectiveEvidenceFor('Make and explain a volume prediction', unexplained).done).toBe(false);
    expect(math.objectiveEvidenceFor('Make and explain a volume prediction', explained)).toMatchObject({ done: true, evidence: '1 explained prediction' });
    expect(math.objectiveEvidenceFor('Revise using evidence', { revisionCompleted: true }).done).toBe(true);
  });

  it('builds reflection prompts from the student?s measurement evidence', () => {
    const prompt = math.buildEvidenceReflectionPrompt(
      { occupiedVolume: 24, prediction: 12, strategy: 'layers' },
      { prediction: 12, strategy: 'layers' },
      { prediction: 20 }
    );
    expect(prompt).toContain('predicted 12 cubic units using layers');
    expect(prompt).toContain('measured 24');
    expect(prompt).toContain('revised your prediction to 20');
    expect(prompt).toContain('I first thought');
    expect(math.buildEvidenceReflectionPrompt(null, null, null)).toContain('what evidence you noticed');
  });

  it('fades prediction scaffolds as evidence becomes stronger', () => {
    expect(math.determinePredictionScaffold([])).toMatchObject({ level: 'guided', label: 'Guided support' });
    const supported = [
      { prediction: 20, strategy: 'layers', percentError: 8 },
      { prediction: 30, reason: 'counted cubes', percentError: 20 }
    ];
    expect(math.determinePredictionScaffold(supported)).toMatchObject({ level: 'supported', label: 'Light support' });
    const independent = supported.concat([
      { prediction: 24, strategy: 'decomposition', percentError: 4 },
      { prediction: 18, reason: 'used layers', percentError: 6 }
    ]);
    expect(math.determinePredictionScaffold(independent)).toMatchObject({ level: 'independent', label: 'Independent transfer' });
    expect(SOURCE).toContain("'data-geometry-prediction-scaffold': predictionScaffold.level");
  });

  it('connects solid, composite, and fractional volume representations', () => {
    const solid = math.buildVolumeRepresentations({
      isComplete: true, occupiedVolume: 24, isSolidPrism: true, hasFractions: false,
      L: 2, W: 3, H: 4, shapeCounts: { cube: 24 }
    });
    expect(solid.map((view) => view.key)).toEqual(['layers', 'rotated_layers', 'occupied_units']);
    expect(solid[0].expression).toContain('2\u00d73');
    expect(solid[0].expression).toContain('= 24');

    const composite = math.buildVolumeRepresentations({
      isComplete: true, occupiedVolume: 8, boundingVolume: 12, missingVolume: 4,
      isSolidPrism: false, hasFractions: false, shapeCounts: { cube: 8 }
    });
    expect(composite.map((view) => view.key)).toEqual(['bounding_subtraction', 'decomposition', 'occupied_units']);
    expect(composite[0].expression).toContain('12 \u2212 4 = 8');

    const fractional = math.buildVolumeRepresentations({
      isComplete: true, occupiedVolume: 1.5, boundingVolume: 2,
      isSolidPrism: false, hasFractions: true, shapeCounts: { cube: 1, halfA: 1 }
    });
    expect(fractional.map((view) => view.key)).toEqual(['fraction_composition', 'whole_equivalent', 'occupied_units']);
    expect(fractional[0].expression).toContain('1\u00d71 + 1\u00d71/2 = 1 1/2');
    expect(math.buildVolumeRepresentations({ isComplete: false })).toEqual([]);
  });

  it('guides learners to compare at least two equivalent views', () => {
    const views = [
      { key: 'layers', label: 'Base layers' },
      { key: 'rotated_layers', label: 'Reoriented layers' },
      { key: 'occupied_units', label: 'Occupied units' }
    ];
    const started = math.buildRepresentationExploration(views, ['unknown', 'layers', 'layers'], 'layers');
    expect(started).toMatchObject({ visitedKeys: ['layers'], remainingKeys: ['rotated_layers', 'occupied_units'], visitedCount: 1, total: 3, target: 2, progressValue: 1, percent: 50, complete: false });
    expect(started.prompt).toContain('Explore one more view');

    const compared = math.buildRepresentationExploration(views, ['layers'], 'rotated_layers');
    expect(compared).toMatchObject({ visitedKeys: ['layers', 'rotated_layers'], visitedCount: 2, progressValue: 2, percent: 100, complete: true });
    expect(compared.prompt).toContain('Explain what stays equal');

    expect(math.buildRepresentationExploration([], [], '')).toMatchObject({ visitedCount: 0, target: 0, percent: 0, complete: false });
    expect(SOURCE).toContain('data-geometry-representation-progress');
    expect(SOURCE).toContain("'aria-label': 'Equivalent volume views explored'");
    expect(SOURCE).toContain('viewsExplored: representationExploration.visitedCount');
  });

  it('records representation switching as teacher learning evidence', () => {
    const summary = math.summarizeLearningEvidence([
      { type: 'representation_view', data: { representation: 'layers' } },
      { type: 'representation_view', data: { representation: 'rotated_layers' } },
      { type: 'representation_view', data: { representation: 'layers' } },
      { type: 'representation_connection', data: { from: 'layers', to: 'rotated_layers', text: 'The factors are regrouped but still multiply to 24.' } },
      { type: 'representation_connection', data: { from: 'rotated_layers', to: 'layers', text: 'Both count all 24 cubes in different layer directions.' } },
      { type: 'representation_connection', data: { from: 'layers', to: 'rotated_layers', text: '   ' } }
    ]);
    expect(summary).toMatchObject({ representationViews: 3, representationConnections: 2 });
    expect(summary.representationConnectionExamples).toEqual([
      { from: 'layers', to: 'rotated_layers', text: 'The factors are regrouped but still multiply to 24.' },
      { from: 'rotated_layers', to: 'layers', text: 'Both count all 24 cubes in different layer directions.' }
    ]);
    expect(summary.representations).toEqual([
      { representation: 'layers', count: 2 },
      { representation: 'rotated_layers', count: 1 }
    ]);
    expect(SOURCE).toContain('data-geometry-volume-representation');
    expect(SOURCE).toContain("eng.logEvent('representation_view'");
    expect(SOURCE).toContain('Equivalent views explored');
    expect(SOURCE).toContain('data-geometry-representation-connection');
    expect(SOURCE).toContain("eng.logEvent('representation_connection'");
    expect(SOURCE).toContain('Connections explained');
    expect(SOURCE).toContain('Student connections between equivalent views');
  });

  it('interleaves layer and scaling retrieval from complete measurements', () => {
    const earlier = { L: 1, W: 2, H: 3, occupiedVolume: 6, isSolidPrism: true, t: 1 };
    const latest = { L: 2, W: 3, H: 4, occupiedVolume: 24, isSolidPrism: true, t: 2 };
    expect(math.buildRetrievalCheckpoint([earlier, { ...latest, isComplete: false }])).toBeNull();

    const scaling = math.buildRetrievalCheckpoint([earlier, latest]);
    expect(scaling).toMatchObject({ concept: 'scale_height', expected: 8 });
    expect(scaling.prompt).toContain('doubles the volume');

    const layer = math.buildRetrievalCheckpoint([earlier, latest, { ...latest, t: 3 }]);
    expect(layer).toMatchObject({ concept: 'layer_area', expected: 6 });
  });

  it('retrieves composite and fractional volume relationships', () => {
    const earlier = { occupiedVolume: 4, L: 1, W: 2, H: 2, isSolidPrism: true, t: 1 };
    const composite = { occupiedVolume: 8, boundingVolume: 12, blocks: 8, hasFractions: false, isSolidPrism: false, t: 2 };
    const emptySpace = math.buildRetrievalCheckpoint([earlier, composite]);
    expect(emptySpace).toMatchObject({ concept: 'empty_space', expected: 4 });

    const fractional = { occupiedVolume: 1.5, boundingVolume: 2, blocks: 2, hasFractions: true, isSolidPrism: false, t: 3 };
    const fractionalCheck = math.buildRetrievalCheckpoint([earlier, fractional]);
    expect(fractionalCheck).toMatchObject({ concept: 'fractional_volume', expected: 0.5 });
    expect(math.checkRetrievalAnswer(fractionalCheck, '1/2')).toMatchObject({ correct: true, valid: true });
    expect(math.checkRetrievalAnswer(fractionalCheck, '1', 1)).toMatchObject({ correct: false, valid: true, feedback: expect.stringContaining('what stays the same') });
    expect(math.checkRetrievalAnswer(fractionalCheck, '1', 2)).toMatchObject({ correct: false, valid: true, feedback: fractionalCheck.hint });
    expect(math.checkRetrievalAnswer(fractionalCheck, '1/2', 2)).toMatchObject({ correct: true, valid: true });
    expect(math.checkRetrievalAnswer(fractionalCheck, '')).toMatchObject({ correct: false, valid: false });
  });

  it('logs retrieval accuracy as teacher learning evidence', () => {
    const summary = math.summarizeLearningEvidence([
      { type: 'retrieval_check', data: { checkpointId: 'a', concept: 'layer_area', attempt: 1, correct: false } },
      { type: 'retrieval_check', data: { checkpointId: 'a', concept: 'layer_area', attempt: 2, correct: true } },
      { type: 'retrieval_check', data: { checkpointId: 'b', concept: 'empty_space', attempt: 1, correct: true } }
    ]);
    expect(summary).toMatchObject({ retrievalAttempts: 3, retrievalCorrect: 2, retrievalCheckpoints: 2, retrievalCheckpointsCorrect: 2, retrievalFirstTryCorrect: 1 });
    expect(SOURCE).toContain("'data-geometry-retrieval-checkpoint': activeRetrievalCheckpoint.concept");
    expect(SOURCE).toContain("'data-geometry-retrieval-result': retrievalResult.correct ? 'correct' : 'retry'");
    expect(SOURCE).toContain("eng.logEvent('retrieval_check'");
    expect(SOURCE).toContain('Checkpoints mastered');
    expect(SOURCE).toContain('First-try retrieval');
  });

  it('summarizes misconception patterns and learning from revisions', () => {
    const summary = math.summarizeLearningEvidence([
      { type: 'measurement', data: { prediction: 12, predictionStrategy: 'layers', predictionReason: 'one layer', misconception: 'one_layer' } },
      { type: 'measurement', data: { prediction: 18, predictionStrategy: 'layers', misconception: 'one_layer' } },
      { type: 'measurement', data: { prediction: 24, predictionReason: 'full box', misconception: 'bounding_box' } },
      { type: 'measurement', data: { prediction: 100, predictionStrategy: 'guessing', misconception: 'overestimate', isComplete: false } },
      { type: 'prediction_revision', data: { improvement: 33 } },
      { type: 'prediction_revision', data: { improvement: -5 } },
      { type: 'reflection', data: { text: 'I changed my strategy.' } },
      { type: 'reflection', data: { text: '   ' } }
    ]);
    expect(summary).toMatchObject({
      explainedPredictions: 3,
      revisionsMade: 2,
      revisionsImproved: 1,
      averageRevisionImprovement: 14,
      reflectionsCompleted: 1
    });
    expect(summary.strategies).toEqual([{ strategy: 'layers', count: 2 }]);
    expect(summary.mostCommonMisconception).toMatchObject({ code: 'one_layer', count: 2 });
    expect(summary.misconceptions.map((item) => item.code)).toEqual(['one_layer', 'bounding_box']);
  });

  it('provides safe, actionable printable report guidance', () => {
    expect(math.misconceptionGuidance('fraction_count').nextStep).toContain('fractional pieces');
    expect(math.misconceptionGuidance('<unknown>')).toMatchObject({ label: 'Unclassified pattern' });
    expect(math.escapeReportHtml('<script>"x" & y</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');
    expect(SOURCE).toContain('learningEvidence: learningEvidence');
    expect(SOURCE).toContain('<h2>Learning Evidence</h2>');
    expect(SOURCE).toContain('Suggested instructional response');
  });

  it('keeps touch measurements in history and exposes accessible prediction feedback in the HUD', () => {
    expect(SOURCE).toContain('var mobileHistory = (measureHistory || []).concat');
    expect(SOURCE).toContain("'Composite structure'");
    expect(SOURCE).toContain("'Bounding box ' + measureResult.boundingVolume");
    expect(SOURCE).toContain("'aria-label': 'Predicted volume in cubic units'");
    expect(SOURCE).toContain("'data-geometry-prediction-result': 'true'");
    expect(SOURCE).toContain('var mobilePrediction = m.isComplete === false ? null : evaluateVolumePrediction');
    expect(SOURCE).toContain("'data-geometry-prediction-cycle': 'predict-explain'");
    expect(SOURCE).toContain("'data-geometry-misconception-feedback': predictionResult.diagnosisCode");
    expect(SOURCE).toContain("'data-geometry-revision-result': 'true'");
    expect(SOURCE).toContain("eng.logEvent('prediction_revision'");
    expect(SOURCE).toContain("if (!nm.isSolidPrism) {");
    expect(SOURCE).toContain("'data-geometry-surface-area': measureResult.surfaceAreaExact ? 'exact' : 'partial'");
    expect(SOURCE).toContain('hasFractions: hasPartialShapes');
    expect(SOURCE).toContain("'data-geometry-measurement-comparison': 'true'");
    expect(SOURCE).toContain("_measurementLayer: engine._measurementLayer || (engine._placingLessonBlocks ? 'lesson' : 'student')");
    expect(SOURCE).toContain('belongsToMeasuredComponent(seedData, mesh.userData)');
    expect(SOURCE).toContain("'data-geometry-material-breakdown': 'true'");
    expect(SOURCE).not.toContain('candidateData.blockType === blockType');
    expect(SOURCE).toContain('MEASUREMENT_BLOCK_LIMIT = MAX_BLOCKS');
    expect(SOURCE).toContain("'data-geometry-measurement-incomplete': 'true'");
    expect(SOURCE).toContain('queue[queueIndex++]');
    expect(SOURCE).not.toContain('result.length < 500');
    expect(SOURCE).toContain('COMPARE LATEST TWO COMPLETE');
    expect(SOURCE).toContain('incompleteMeasurementAttempts: allMeasurements.length - measurements.length');
    expect(SOURCE).toContain("completedMeasurements.length + ' complete measurements taken'");
    expect(SOURCE).toContain('correctMeasurements: predictionSummary.predictionsWithin10Percent');
    expect(SOURCE).toContain('Predictions within 10%');
    expect(SOURCE).toContain('Avg prediction error');
    expect(SOURCE).not.toContain('m.data.blocks === m.data.volume');
    expect(SOURCE).toContain('var details = formatSessionEventDetails(entry.data)');
    expect(SOURCE).not.toContain("key + '=' + entry.data[key]");
    expect(SOURCE).toContain('measurementDetails: measurementDetailsForReport(measurements)');
    expect(SOURCE).toContain('Measurement-Level Evidence');
    expect(SOURCE).toContain('questionDetails: questionDetailsForReport(log)');
    expect(SOURCE).not.toContain('Math.round(q.timestamp)');
  });

  it('keeps touch HUD layers clear and keyboard focus visible', () => {
    expect(SOURCE).toContain("uiStyle.id = 'allo-geometryworld-ui-css'");
    expect(SOURCE).toContain('.gw-focusable:focus-visible');
    expect(SOURCE).toContain("bottom: isMobile ? '196px' : '80px'");
    expect(SOURCE).toContain("whiteSpace: 'normal'");
    expect(SOURCE).toContain("maxWidth: isMobile ? 'calc(100vw - 168px)'");
    expect(SOURCE).toContain("'aria-label': 'Place block'");
    expect(SOURCE).toContain("'aria-label': 'Measure structure'");
    expect(SOURCE).toContain("'aria-label': 'Undo last block action'");
    expect(SOURCE).toContain("engine._undoStack && engine._undoStack.length > 0 && el('button'");
    expect(SOURCE).toContain("engine._redoStack && engine._redoStack.length > 0 && el('button'");
    expect(SOURCE).toContain("'aria-label': 'Toggle fly mode'");
    expect(SOURCE).toContain("'aria-label': 'Return to spawn point'");
    expect(SOURCE).toContain("'aria-label': 'Clear my placed blocks'");
    expect(SOURCE).not.toContain("engine._undoStack && engine._undoStack.length > 0 && el('div'");
  });
});
