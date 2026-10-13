import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Exercise the real helpers without mounting the canvas. Only the specimen's
// default state is fixed so threshold checks do not depend on a variation seed.
function loadProductionFunction(name, bindings = {}) {
  const declarations = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (declarations.length !== 1) throw new Error('Expected one production function: ' + name);
  const declaration = declarations[0];
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const defaultState = Object.freeze({
  moisture: 76, tension: 40, exposure: 8, trauma: 0, clarity: 84,
  stability: 18, risk: 8, salineDrops: 0, variantId: 'standard',
  variantLabel: 'Standard', lastAction: 'prepared', lastUpdatedAt: 1000,
  consequences: Object.freeze([]),
});
const clampTissueMetric = loadProductionFunction('clampTissueMetric');
const normalizeTissueState = loadProductionFunction('normalizeTissueState', {
  defaultTissueState: () => defaultState, clampTissueMetric,
});
const tissueMonitorMetrics = loadProductionFunction('tissueMonitorMetrics', { normalizeTissueState });
const tissuePreservationScore = loadProductionFunction('tissuePreservationScore', { normalizeTissueState, clampTissueMetric });
const tissueStatusData = loadProductionFunction('tissueStatusData', { normalizeTissueState, tissuePreservationScore });
const metric = (id, state) => tissueMonitorMetrics(state).find(item => item.id === id);

describe('dissection tissue monitor metric interpretation', () => {
  it('keeps the field measures in a predictable order with separate values and explanations', () => {
    const result = tissueMonitorMetrics(defaultState);
    expect(result.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'exposure', value: 8 }, { id: 'clarity', value: 84 },
      { id: 'stability', value: 18 }, { id: 'risk', value: 8 },
    ]);
    for (const item of result) {
      expect(item.label).toEqual(expect.any(String));
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.meaning).toEqual(expect.any(String));
      expect(item.meaning.length).toBeGreaterThan(0);
      expect(item.risk).toBe(false);
    }
  });

  it.each([
    [44, true, 'Low clarity'],
    [45, false, 'No clarity alert'],
    [46, false, 'No clarity alert'],
  ])('marks clarity %s at the existing alert boundary', (clarity, risk, note) => {
    expect(metric('clarity', { clarity })).toMatchObject({ value: clarity, risk, note });
  });

  it.each([
    [54, false, 'Below risk alert'],
    [55, true, 'Elevated risk'],
    [56, true, 'Elevated risk'],
  ])('marks tissue risk %s at the existing alert boundary', (value, risk, note) => {
    expect(metric('risk', { risk: value })).toMatchObject({ value, risk, note });
  });

  it.each([
    [44, 35, false, 'Recheck after opening'],
    [44, 36, true, 'Needs stabilization'],
    [45, 36, false, 'No stability alert'],
    [46, 80, false, 'No stability alert'],
    [0, 0, false, 'Recheck after opening'],
    [0, 100, true, 'Needs stabilization'],
    [100, 35, false, 'Recheck after opening'],
  ])('interprets stability %s with exposure %s', (stability, exposure, risk, note) => {
    expect(metric('stability', { stability, exposure })).toMatchObject({ value: stability, risk, note });
  });

  it.each([0, 35, 36, 100])('shows exposure %s as opening size without a pass/fail judgment', exposure => {
    expect(metric('exposure', { exposure })).toMatchObject({
      value: exposure, risk: false, note: 'Opening size', direction: 'Follow the protocol',
    });
  });

  it('explains that a lower risk value is better while clarity and stability increase with quality', () => {
    const result = tissueMonitorMetrics({ clarity: 20, exposure: 80, stability: 20, risk: 80 });
    expect(result.find(item => item.id === 'clarity')).toMatchObject({ risk: true, direction: 'Higher means clearer' });
    expect(result.find(item => item.id === 'stability')).toMatchObject({ risk: true, direction: 'Higher means steadier' });
    expect(result.find(item => item.id === 'risk')).toMatchObject({ risk: true, direction: 'Lower is better' });
    const improved = tissueMonitorMetrics({ clarity: 80, exposure: 80, stability: 80, risk: 20 });
    expect(improved.every(item => !item.risk)).toBe(true);
  });

  it('normalizes out-of-range inputs before displaying or evaluating the metrics', () => {
    expect(tissueMonitorMetrics({ exposure: 150, clarity: -15, stability: 400, risk: -1 })
      .map(({ id, value, risk }) => ({ id, value, risk }))).toEqual([
      { id: 'exposure', value: 100, risk: false },
      { id: 'clarity', value: 0, risk: true },
      { id: 'stability', value: 100, risk: false },
      { id: 'risk', value: 0, risk: false },
    ]);
  });

  it('uses the same rounded values for displayed numbers and warning boundaries', () => {
    expect(tissueMonitorMetrics({ exposure: '35.5', clarity: '44.5', stability: '44.49', risk: '54.5' })
      .map(({ id, value, risk }) => ({ id, value, risk }))).toEqual([
      { id: 'exposure', value: 36, risk: false },
      { id: 'clarity', value: 45, risk: false },
      { id: 'stability', value: 44, risk: true },
      { id: 'risk', value: 55, risk: true },
    ]);
  });

  it.each([undefined, null, { exposure: null, clarity: null, stability: null, risk: null }])(
    'uses specimen defaults for a missing state or missing metric values (%s)', state => {
      expect(tissueMonitorMetrics(state)).toEqual(tissueMonitorMetrics(defaultState));
    },
  );

  it('reads frozen tissue history without modifying the learner’s saved state', () => {
    const consequence = Object.freeze({ action: 'retract', message: 'Preserve this observation', at: 1200 });
    const state = Object.freeze({ ...defaultState, exposure: 70, stability: 20, risk: 63,
      lastAction: 'retract', consequences: Object.freeze([consequence]) });
    const saved = JSON.stringify(state);
    expect(() => tissueMonitorMetrics(state)).not.toThrow();
    expect(JSON.stringify(state)).toBe(saved);
    expect(state.consequences[0]).toBe(consequence);
    expect(state.lastAction).toBe('retract');
  });

  it('returns independent metric objects so presentation changes cannot alter later readings', () => {
    const before = tissueMonitorMetrics(defaultState);
    before[0].value = 100;
    before[1].note = 'Changed in the caller';
    const after = tissueMonitorMetrics(defaultState);
    expect(after[0].value).toBe(8);
    expect(after[1].note).toBe('No clarity alert');
    expect(after[0]).not.toBe(before[0]);
    expect(defaultState.exposure).toBe(8);
  });
});

describe('dissection tissue priority guidance', () => {
  it.each([
    [54, 'Continue with the current protocol and pre-contact checks.'],
    [55, 'Pause manipulation and protect the current corridor.'],
  ])('provides tissue risk %s guidance consistent with its monitor alert', (risk, priority) => {
    expect(tissueStatusData({ risk }).priority).toBe(priority);
  });

  it.each([
    [44, 'Review surface clarity before the next controlled action.'],
    [45, 'Continue with the current protocol and pre-contact checks.'],
  ])('provides clarity %s guidance consistent with its monitor alert', (clarity, priority) => {
    expect(tissueStatusData({ clarity }).priority).toBe(priority);
  });

  it('prioritizes elevated handling risk when low clarity is also present', () => {
    expect(tissueStatusData({ risk: 55, clarity: 44 }).priority)
      .toBe('Pause manipulation and protect the current corridor.');
  });

  it.each([
    ['moisture', { moisture: 37, tension: 90, trauma: 70, stability: 20, exposure: 70 },
      'Restore surface moisture before further manipulation.'],
    ['tension', { tension: 83, trauma: 70, stability: 20, exposure: 70 },
      'Reduce handling and avoid adding tension near the flap edge.'],
    ['trauma', { trauma: 43, stability: 20, exposure: 70 },
      'Use gentler pressure and protect the current access corridor.'],
    ['stability', { stability: 44, exposure: 36 },
      'Stabilize the retracted tissue before probing.'],
  ])('preserves the existing %s recovery priority ahead of risk and clarity', (_name, state, priority) => {
    expect(tissueStatusData({ risk: 80, clarity: 20, ...state }).priority).toBe(priority);
  });

  it('retains the preservation score and condition label alongside the revised priority', () => {
    const state = Object.freeze({ ...defaultState, risk: 55 });
    const result = tissueStatusData(state);
    expect(result).toEqual({
      label: 'At risk',
      preservation: 80,
      priority: 'Pause manipulation and protect the current corridor.',
    });
    expect(state).toEqual({ ...defaultState, risk: 55 });
  });
});
