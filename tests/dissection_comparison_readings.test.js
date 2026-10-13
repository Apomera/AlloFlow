import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function loadProductionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}', end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

function freeze(value) {
  if (value && typeof value === 'object') Object.values(value).forEach(freeze);
  return value && typeof value === 'object' ? Object.freeze(value) : value;
}

const techniqueComparisonValue = loadProductionFunction('techniqueComparisonValue');
const techniqueComparisonDelta = loadProductionFunction('techniqueComparisonDelta', { techniqueComparisonValue });
const techniqueComparisonMetricData = loadProductionFunction('techniqueComparisonMetricData', { techniqueComparisonValue, techniqueComparisonDelta });

const invalidReadings = [
  ['missing', undefined], ['null', null], ['blank', ''], ['whitespace', ' \t\n '],
  ['invalid text', 'not recorded'], ['NaN', NaN], ['infinity', Infinity], ['negative infinity', -Infinity],
  ['text infinity', 'Infinity'], ['true', true], ['false', false], ['array', []], ['object', {}],
  ['negative', -1], ['negative text', '-1'],
];

describe('dissection comparison value validation', () => {
  it.each(invalidReadings)('keeps %s readings unavailable instead of inventing zero', (_name, value) => {
    for (const count of [false, true]) {
      expect(techniqueComparisonValue(value, count)).toBeNull();
      expect(techniqueComparisonDelta(80, value, count)).toBeNull();
      expect(techniqueComparisonDelta(value, 80, count)).toBeNull();
    }
    const metric = freeze({ kind: 'percentage', previous: value, current: 80 });
    expect(techniqueComparisonMetricData(metric)).toMatchObject({
      previous: null, previousText: 'Not recorded', current: 80, currentText: '80%',
      delta: null, changeText: 'Change unavailable', tone: 'unavailable',
    });
  });

  it.each([0, '0', ' 0 ', 100, '100', 72.5, ' 72.5 '])('accepts measured percentage %s', value => {
    expect(techniqueComparisonValue(value)).toBe(Number(value));
    expect(techniqueComparisonDelta(value, value)).toBe(0);
  });

  it.each([100.01, 101, '101'])('rejects percentage readings above 100: %s', value => {
    expect(techniqueComparisonValue(value)).toBeNull();
    expect(techniqueComparisonMetricData({ kind: 'score', previous: value, current: 80 }).changeText).toBe('Change unavailable');
  });

  it('allows whole caution counts above 100 but rejects fractional counts', () => {
    for (const value of [0, '0', 101, '101']) expect(techniqueComparisonValue(value, true)).toBe(Number(value));
    for (const value of [0.5, '1.5']) expect(techniqueComparisonValue(value, true)).toBeNull();
    expect(techniqueComparisonDelta('103', '101', true)).toBe(2);
    expect(techniqueComparisonDelta(2, '1.5', true)).toBeNull();
  });

  it('rounds subtraction noise without losing a real zero baseline', () => {
    expect(techniqueComparisonDelta(80.3, 80.1)).toBe(0.2);
    expect(techniqueComparisonDelta(80.1, 80.3)).toBe(-0.2);
    expect(techniqueComparisonDelta('25', '0')).toBe(25);
    expect(techniqueComparisonDelta('0', '25')).toBe(-25);
  });
});

describe('dissection comparison labels and improvement directions', () => {
  it.each([
    ['score', 79, 80, '79/100', '80/100', '1 point higher', 'improved'],
    ['score', 80, 79, '80/100', '79/100', '1 point lower', 'declined'],
    ['score', 78, 80, '78/100', '80/100', '2 points higher', 'improved'],
    ['score', 80, 78, '80/100', '78/100', '2 points lower', 'declined'],
    ['percentage', 79, 80, '79%', '80%', '1 percentage point higher', 'improved'],
    ['percentage', 80, 79, '80%', '79%', '1 percentage point lower', 'declined'],
    ['percentage', 78, 80, '78%', '80%', '2 percentage points higher', 'improved'],
    ['percentage', 80, 78, '80%', '78%', '2 percentage points lower', 'declined'],
    ['count', 2, 1, '2', '1', '1 fewer caution', 'improved'],
    ['count', 1, 2, '1', '2', '1 more caution', 'declined'],
    ['count', 3, 1, '3', '1', '2 fewer cautions', 'improved'],
    ['count', 1, 3, '1', '3', '2 more cautions', 'declined'],
  ])('%s compares %s to %s with units and direction', (kind, previous, current, previousText, currentText, changeText, tone) => {
    const metric = freeze({ kind, previous, current });
    expect(techniqueComparisonMetricData(metric)).toEqual({
      previous, current, delta: current - previous, previousText, currentText, changeText, tone,
    });
  });

  it.each([['score', '0/100'], ['percentage', '0%'], ['count', '0']])('preserves a genuine zero %s reading', (kind, text) => {
    expect(techniqueComparisonMetricData(freeze({ kind, previous: '0', current: 0 }))).toEqual({
      previous: 0, current: 0, delta: 0, previousText: text, currentText: text, changeText: 'No change', tone: 'unchanged',
    });
  });

  it.each(['score', 'percentage', 'count'])('shows unavailable changes for missing %s readings on either side', kind => {
    expect(techniqueComparisonMetricData(freeze({ kind, previous: 80, current: null }))).toMatchObject({
      current: null, currentText: 'Not recorded', delta: null, changeText: 'Change unavailable', tone: 'unavailable',
    });
    expect(techniqueComparisonMetricData(freeze({ kind }))).toMatchObject({
      previous: null, current: null, previousText: 'Not recorded', currentText: 'Not recorded', delta: null,
    });
  });

  it.each([undefined, 0, 80])('does not score a pending stroke with current reading %s', current => {
    expect(techniqueComparisonMetricData(freeze({ kind: 'percentage', previous: '75', current, pending: true }))).toEqual({
      previous: 75, current: null, delta: null, previousText: '75%', currentText: 'No scored stroke yet',
      changeText: 'Change unavailable', tone: 'unavailable',
    });
  });
});

const baseline = {
  id: 'saved', score: 70, precision: 60, coverage: 65, control: 70, angleControl: 75,
  cautions: 3, preservation: 80, observationQuality: 85, completedSteps: 2,
};
const incision = { precision: 80, coverage: 85, control: 90, angleControl: 95, alignment: 90 };

// Snapshot selection and comparison logic are production implementations. The
// unrelated score, tissue, and observation calculations supply fixed readings.
function comparisonHarness(entries = [baseline], patch = {}, otherLayers = {}) {
  const currentProcedure = freeze({
    score: 80, errors: 2, completedSteps: 3, preservation: 90, observationQuality: 95,
    tissueState: { moisture: 75, trauma: 0, risk: 0, tension: 20 }, ...patch,
  });
  const d = freeze({ attemptArchive: { muscle: [{ id: 'other-layer', score: 100 }], ...otherLayers, skin: entries } });
  const before = JSON.stringify({ d, currentProcedure });
  const observationFieldData = state => ({ quality: state.observationQuality });
  const procedureMetricSnapshot = loadProductionFunction('procedureMetricSnapshot', {
    procedureTechniqueScore: state => state.score,
    observationFieldData,
    procedureStepIndex: state => state.completedSteps,
    tissuePreservationScore: state => state.preservation,
    procedureDecisionScore: () => 90,
    procedureExposureData: () => ({ score: 90 }),
    normalizeTissueState: tissue => tissue,
    normalizeToolCalibration: calibration => calibration,
    toolCalibration: freeze({}),
  });
  const compare = loadProductionFunction('techniqueComparisonData', {
    d, activeLayer: 'skin', currentProcedure, procedureMetricSnapshot, techniqueComparisonDelta,
  });
  const coach = loadProductionFunction('adaptiveCoachingData', {
    d, currentProcedure, techniqueComparisonData: compare, normalizeTissueState: tissue => tissue,
    observationFieldData, currentScenarioDefinition: () => ({ id: 'practice' }), instructorMaxCautions: 4,
    nextProcedureInfo: () => ({ instrument: 'probe' }), instrumentCalibrationAssessment: () => ({ score: 100 }),
    toolCalibration: freeze({}),
  });
  return { compare, coach, d, currentProcedure, expectPreserved() {
    expect(JSON.stringify({ d, currentProcedure })).toBe(before);
  } };
}

describe('dissection comparison selects and preserves attempt evidence', () => {
  it.each([['null', null], ['empty', []]])('has no baseline when the active layer archive is %s', (_name, entries) => {
    const h = comparisonHarness(entries);
    expect(h.compare()).toBeNull();
    h.expectPreserved();
  });

  it('selects the most recent baseline within the active layer', () => {
    const latest = { ...baseline, id: 'latest', score: 75 };
    const h = comparisonHarness([baseline, latest], { lastSavedAttemptId: baseline.id });
    expect(h.compare().previous).toBe(latest);
    expect(h.compare().scoreDelta).toBe(5);
    h.expectPreserved();
  });

  it('skips the current saved attempt and uses the preceding baseline', () => {
    const latest = { ...baseline, id: 'just-saved', score: 80 };
    const h = comparisonHarness([baseline, latest], { lastSavedAttemptId: 'just-saved' });
    expect(h.compare().previous).toBe(baseline);
    expect(h.compare().scoreDelta).toBe(10);
    h.expectPreserved();
    const firstSave = comparisonHarness([latest], { lastSavedAttemptId: 'just-saved' });
    expect(firstSave.compare()).toBeNull();
    firstSave.expectPreserved();
  });

  it('leaves stroke deltas unavailable before any scored stroke while retaining whole-attempt comparisons', () => {
    const h = comparisonHarness();
    expect(h.compare()).toMatchObject({
      strokeRecorded: false, scoreDelta: 10, precisionDelta: null, coverageDelta: null,
      controlDelta: null, angleDelta: null, cautionDelta: -1, preservationDelta: 10, observationDelta: 10,
    });
    h.expectPreserved();
  });

  it('compares the incision when it is the latest scored stroke', () => {
    const h = comparisonHarness([baseline], { incisionMetrics: incision });
    expect(h.compare()).toMatchObject({
      strokeRecorded: true, current: { precision: 80, coverage: 85, control: 90, angleControl: 95 },
      precisionDelta: 20, coverageDelta: 20, controlDelta: 20, angleDelta: 20,
    });
    h.expectPreserved();
  });

  it('uses extension values including zero instead of incision values or smoothness', () => {
    const h = comparisonHarness([baseline], {
      incisionMetrics: incision, extensionMetrics: { precision: 0, coverage: 0, control: 0, smoothness: 99, angleControl: 0 },
    });
    expect(h.compare()).toMatchObject({
      strokeRecorded: true, current: { precision: 0, coverage: 0, control: 0, angleControl: 0 },
      precisionDelta: -60, coverageDelta: -65, controlDelta: -70, angleDelta: -75,
    });
    h.expectPreserved();
  });

  it('retains the smoothness fallback for legacy recorded control', () => {
    const h = comparisonHarness([baseline], { incisionMetrics: { ...incision, control: null, smoothness: 88 } });
    expect(h.compare()).toMatchObject({ current: { control: 88 }, controlDelta: 18 });
    h.expectPreserved();
  });

  it('keeps incomplete saved readings unavailable independently', () => {
    const h = comparisonHarness([{
      id: 'legacy', precision: null, coverage: '', control: 'bad', angleControl: Infinity,
      cautions: true, preservation: 101, observationQuality: -1,
    }], { incisionMetrics: incision });
    expect(h.compare()).toMatchObject({
      strokeRecorded: true, scoreDelta: null, precisionDelta: null, coverageDelta: null,
      controlDelta: null, angleDelta: null, cautionDelta: null, preservationDelta: null, observationDelta: null,
    });
    h.expectPreserved();
  });
});

describe('dissection comparison consumers preserve unavailable scores', () => {
  it.each([
    [undefined, 'Independent refinement'], [null, 'Independent refinement'], ['', 'Independent refinement'],
    [true, 'Independent refinement'], [101, 'Independent refinement'], [79, 'Independent refinement'],
    [80, 'Strategy change'], [81, 'Strategy change'],
  ])('uses saved score %s only when it supports coaching', (score, focus) => {
    const h = comparisonHarness([{ ...baseline, score }], { errors: 0, incisionMetrics: incision });
    expect(h.coach().focus).toBe(focus);
    h.expectPreserved();
  });

  it.each([
    [undefined, 'Change unavailable'], [null, 'Change unavailable'], ['', 'Change unavailable'],
    [false, 'Change unavailable'], [Infinity, 'Change unavailable'], [101, 'Change unavailable'],
    [0, '80 points higher'], ['79', '1 point higher'], [80, 'No change'], [81, '1 point lower'],
  ])('exports saved score %s with the same comparison meaning', (score, changeText) => {
    const lines = source.split(/\r?\n/).filter(line => line.includes("report += 'Attempt score change: '"));
    expect(lines).toHaveLength(1);
    // Execute the report's comparison statement so a consumer cannot silently
    // reintroduce numeric coercion even when the standalone helpers stay correct.
    const exportComparison = new Function('techniqueComparison', 'techniqueComparisonMetricData',
      '"use strict"; var report = ""; ' + lines[0] + '; return report;');
    const h = comparisonHarness([{ ...baseline, score }]);
    expect(exportComparison(h.compare(), techniqueComparisonMetricData)).toBe('Attempt score change: ' + changeText + '\n');
    expect(exportComparison(null, techniqueComparisonMetricData)).toBe('');
    h.expectPreserved();
  });
});
