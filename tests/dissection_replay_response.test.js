import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Exercise the production data functions together; changed anchors fail closed.
function loadProductionFunction(name, bindings = {}) {
  const declarations = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (declarations.length !== 1) throw new Error('Expected one production function: ' + name);
  const declaration = declarations[0];
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (start < 0 || end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const fictionalDefaults = freezeDeep({
  moisture: 33, tension: 44, exposure: 97, trauma: 0,
  clarity: 98, stability: 96, risk: 95, salineDrops: 4,
  variantId: 'fictional', variantLabel: 'Fictional test baseline',
  lastAction: 'prepared', lastUpdatedAt: 999, consequences: [],
});
const clamp = loadProductionFunction('clampTissueMetric');
const normalize = loadProductionFunction('normalizeTissueState', {
  clampTissueMetric: clamp, defaultTissueState: () => fictionalDefaults,
});
const metrics = loadProductionFunction('procedureReviewMetricData', { normalizeTissueState: normalize });
const response = loadProductionFunction('procedureReplayResponseData', { procedureReviewMetricData: metrics });
const metricKeys = ['clarity', 'exposure', 'stability', 'risk'];
const state = value => Object.fromEntries(metricKeys.map(key => [key, value]));
const action = (before = 40, after = 60) => ({
  action: 'dropper', label: 'Hydrated', at: 100,
  outcomeDetail: 'The saved field changed.',
  tissueBefore: state(before), tissueAfter: state(after),
});
const values = result => result.metrics.map(({ key, before, after, delta, direction, changeLabel, available }) => ({
  key, before, after, delta, direction, changeLabel, available,
}));

function expectUnavailable(metric) {
  expect(metric.available).toBe(false);
  expect(metric.changeLabel).toBe('Before/after unavailable');
  for (const key of ['before', 'after', 'delta', 'direction']) expect(metric).not.toHaveProperty(key);
}

describe('dissection replay saved response', () => {
  it('returns the four named tissue measures with their recorded explanations', () => {
    const result = response([action()], 0);
    expect(result.availableCount).toBe(4);
    expect(result.explanation).toBe('The saved field changed.');
    expect(result.metrics.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: 'clarity', label: 'Clarity' }, { key: 'exposure', label: 'Exposure' },
      { key: 'stability', label: 'Stability' }, { key: 'risk', label: 'Risk' },
    ]);
    result.metrics.forEach(metric => expect(metric.meaning.length).toBeGreaterThan(20));
    expect(result.metrics[3].meaning).toContain('Lower values are better.');
  });

  it('identifies increases and decreases in clarity, exposure and stability', () => {
    const improving = response([action(20, 70)], 0).metrics.slice(0, 3);
    const declining = response([action(70, 20)], 0).metrics.slice(0, 3);
    expect(improving.map(metric => [metric.before, metric.after, metric.delta, metric.direction, metric.changeLabel])).toEqual([
      [20, 70, 50, 'improve', 'More clear'],
      [20, 70, 50, 'improve', 'More exposure'],
      [20, 70, 50, 'improve', 'More stable'],
    ]);
    expect(declining.map(metric => [metric.delta, metric.direction, metric.changeLabel])).toEqual([
      [-50, 'caution', 'Less clear'], [-50, 'caution', 'Less exposure'], [-50, 'caution', 'Less stable'],
    ]);
  });

  it('reverses the favorable direction for the recorded risk measure', () => {
    expect(response([action(70, 20)], 0).metrics[3]).toMatchObject({
      before: 70, after: 20, delta: -50, direction: 'improve', changeLabel: 'Lower risk',
    });
    expect(response([action(20, 70)], 0).metrics[3]).toMatchObject({
      before: 20, after: 70, delta: 50, direction: 'caution', changeLabel: 'Higher risk',
    });
  });

  it('keeps all unchanged measures neutral, including risk', () => {
    const result = response([action(42, 42)], 0);
    expect(result.availableCount).toBe(4);
    result.metrics.forEach(metric => expect(metric).toMatchObject({
      before: 42, after: 42, delta: 0, direction: 'neutral', changeLabel: 'Unchanged', available: true,
    }));
  });

  it('accepts both zero and one hundred as recorded endpoints', () => {
    const forward = response([action(0, 100)], 0);
    const reverse = response([action(100, 0)], 0);
    expect(forward.availableCount).toBe(4);
    expect(reverse.availableCount).toBe(4);
    forward.metrics.forEach(metric => expect(metric).toMatchObject({ before: 0, after: 100, delta: 100 }));
    reverse.metrics.forEach(metric => expect(metric).toMatchObject({ before: 100, after: 0, delta: -100 }));
  });

  it('uses production rounding consistently for fractional recorded values', () => {
    const entry = action();
    entry.tissueBefore = { clarity: 40.49, exposure: 40.5, stability: 0.49, risk: 99.5 };
    entry.tissueAfter = { clarity: 40.5, exposure: 40.49, stability: 0.4, risk: 99.49 };
    expect(values(response([entry], 0))).toEqual([
      { key: 'clarity', before: 40, after: 41, delta: 1, direction: 'improve', changeLabel: 'More clear', available: true },
      { key: 'exposure', before: 41, after: 40, delta: -1, direction: 'caution', changeLabel: 'Less exposure', available: true },
      { key: 'stability', before: 0, after: 0, delta: 0, direction: 'neutral', changeLabel: 'Unchanged', available: true },
      { key: 'risk', before: 100, after: 99, delta: -1, direction: 'improve', changeLabel: 'Lower risk', available: true },
    ]);
  });

  it('reports only the complete pairs in partial tissue snapshots', () => {
    const entry = { tissueBefore: { clarity: 20, exposure: 10, risk: 80 }, tissueAfter: { clarity: 60, stability: 50, risk: 30 } };
    const result = response([entry], 0);
    expect(result.availableCount).toBe(2);
    expect(result.metrics[0]).toMatchObject({ before: 20, after: 60, available: true });
    expect(result.metrics[3]).toMatchObject({ before: 80, after: 30, available: true });
    expectUnavailable(result.metrics[1]);
    expectUnavailable(result.metrics[2]);
  });

  it('retains the response explanation when either tissue snapshot is absent', () => {
    for (const entry of [
      { outcomeDetail: 'Observation retained.' },
      { outcomeDetail: 'Observation retained.', tissueBefore: state(50) },
      { outcomeDetail: 'Observation retained.', tissueAfter: state(50) },
      { outcomeDetail: 'Observation retained.', tissueBefore: null, tissueAfter: null },
    ]) {
      const result = response([entry], 0);
      expect(result.explanation).toBe('Observation retained.');
      expect(result.availableCount).toBe(0);
      result.metrics.forEach(expectUnavailable);
    }
  });

  it('rejects invalid before values without losing the other valid measures', () => {
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, false, {}, []]) {
      const entry = action();
      entry.tissueBefore.clarity = invalid;
      const result = response([entry], 0);
      expect(result.availableCount).toBe(3);
      expectUnavailable(result.metrics[0]);
      expect(result.metrics[1]).toMatchObject({ before: 40, after: 60, available: true });
    }
  });

  it('rejects invalid after values without losing the other valid measures', () => {
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, true, {}, []]) {
      const entry = action();
      entry.tissueAfter.risk = invalid;
      const result = response([entry], 0);
      expect(result.availableCount).toBe(3);
      expectUnavailable(result.metrics[3]);
      expect(result.metrics[2]).toMatchObject({ before: 40, after: 60, available: true });
    }
  });

  it('rejects out-of-range raw values instead of presenting clamped evidence', () => {
    for (const invalid of [-0.001, -1, 100.001, 101]) {
      for (const side of ['tissueBefore', 'tissueAfter']) {
        const entry = action();
        entry[side] = state(invalid);
        const result = response([entry], 0);
        expect(result.availableCount).toBe(0);
        result.metrics.forEach(expectUnavailable);
      }
    }
  });

  it('does not coerce numeric strings or boxed numbers into recorded evidence', () => {
    for (const invalid of ['0', '40', '100', '', new Number(40)]) {
      for (const side of ['tissueBefore', 'tissueAfter']) {
        const entry = action();
        entry[side] = state(invalid);
        const result = response([entry], 0);
        expect(result.availableCount).toBe(0);
        result.metrics.forEach(expectUnavailable);
      }
    }
  });

  it('does not fill missing recorded pairs from the current model defaults', () => {
    expect(normalize({})).toMatchObject({ clarity: 98, exposure: 97, stability: 96, risk: 95 });
    for (const entry of [{}, { tissueBefore: {}, tissueAfter: {} }, { tissueBefore: state(30), tissueAfter: {} }]) {
      const result = response([entry], 0);
      expect(result.availableCount).toBe(0);
      result.metrics.forEach(expectUnavailable);
    }
  });

  it('selects the exact index when actions share names and timestamps', () => {
    const actions = [action(10, 20), action(30, 40), action(50, 60)];
    actions.forEach((entry, index) => { entry.outcomeDetail = 'Recorded response ' + index; });
    expect(actions.map((_, index) => response(actions, index).explanation))
      .toEqual(['Recorded response 0', 'Recorded response 1', 'Recorded response 2']);
    expect(actions.map((_, index) => response(actions, index).metrics[0].before)).toEqual([10, 30, 50]);
  });

  it('reads earlier full-log entries beyond the eighteen-item history window', () => {
    const actions = Array.from({ length: 30 }, (_, index) => ({
      ...action(index, index + 1), outcomeDetail: 'Full action ' + (index + 1),
    }));
    for (const index of [0, 5, 11, 12, 29]) {
      const result = response(actions, index);
      expect(result.explanation).toBe('Full action ' + (index + 1));
      expect(result.metrics[0]).toMatchObject({ before: index, after: index + 1 });
    }
  });

  it('rejects non-array action collections and empty lists', () => {
    for (const invalid of [undefined, null, {}, { 0: action(), length: 1 }, 'actions', 1, true, []]) {
      expect(response(invalid, 0)).toBeNull();
    }
  });

  it('rejects noninteger, nonnumeric and out-of-range action indices', () => {
    for (const invalid of [undefined, null, '0', false, true, {}, new Number(0), NaN, Infinity, -Infinity, -1, 0.5, 1, 100]) {
      expect(response([action()], invalid)).toBeNull();
    }
  });

  it('rejects missing, primitive and array action records', () => {
    for (const invalid of [undefined, null, false, true, 0, 20, 'dropper', [], [action()]]) {
      expect(response([invalid], 0)).toBeNull();
    }
  });

  it('rejects sparse or inherited action slots while accepting an own record', () => {
    const sparse = Array(2);
    sparse[1] = action();
    expect(response(sparse, 0)).toBeNull();
    expect(response(sparse, 1).availableCount).toBe(4);
    const inherited = Array(1);
    Object.setPrototypeOf(inherited, Object.assign(Object.create(Array.prototype), { 0: action() }));
    expect(inherited[0]).toBeTruthy();
    expect(response(inherited, 0)).toBeNull();
  });

  it('trims the saved explanation and preserves literal markup as text data', () => {
    const entry = { ...action(), outcomeDetail: ' \n <b>Saved & observed</b>\nSecond line. \t' };
    const result = response([entry], 0);
    expect(result.explanation).toBe('<b>Saved & observed</b>\nSecond line.');
    expect(typeof result.explanation).toBe('string');
    expect(entry.outcomeDetail).toBe(' \n <b>Saved & observed</b>\nSecond line. \t');
  });

  it('returns an empty explanation for absent, blank and non-string details', () => {
    for (const outcomeDetail of [undefined, null, '', ' \n\t ', false, 42, {}, [], new String('Saved')]) {
      const result = response([{ ...action(), outcomeDetail }], 0);
      expect(result.explanation).toBe('');
      expect(result.availableCount).toBe(4);
    }
  });

  it('leaves frozen saved records and nested tissue snapshots unchanged', () => {
    const actions = freezeDeep([{ ...action(), point: { x: 0.3, y: 0.4 }, toolCalibration: { salineDose: 1 } }]);
    const before = JSON.stringify(actions);
    const result = response(actions, 0);
    expect(result.availableCount).toBe(4);
    expect(JSON.stringify(actions)).toBe(before);
    expect(result.metrics).not.toBe(actions[0].tissueBefore);
    expect(result.metrics[0]).not.toBe(actions[0].tissueAfter);
  });

  it('returns fresh result rows without sharing mutable results between calls', () => {
    const actions = freezeDeep([action()]);
    const first = response(actions, 0);
    const second = response(actions, 0);
    expect(first).not.toBe(second);
    expect(first.metrics).not.toBe(second.metrics);
    first.metrics.forEach((metric, index) => expect(metric).not.toBe(second.metrics[index]));
    first.metrics[0].before = 99;
    first.metrics[0].meaning = 'Changed by a consumer';
    first.metrics.pop();
    expect(second.metrics).toHaveLength(4);
    expect(second.metrics[0]).toMatchObject({ before: 40, after: 60 });
    expect(second.metrics[0].meaning).toContain('viewing field');
    expect(response(actions, 0)).toEqual(second);
  });
});
