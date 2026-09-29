import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let K;
let removalSource;
const BASE = { climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55,
  landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass' };
const VARIANTS = { climSolar: 1.2, climTemp: 20, climWind: 1.5, landRainIntensity: 80,
  landSaturation: 65, landPermeability: 'high', landSlope: 'steep', landCover: 'forest' };
const small = { evaporation: 0.1, runoff: 5, infiltration: -5 };
const clone = value => JSON.parse(JSON.stringify(value));
function entry(baseline = BASE, snapshot = { ...BASE, landCover: 'urban' }, extra = {}) {
  return { baseline: clone(baseline), snapshot: clone(snapshot), prediction: 'runoff',
    predictionLabel: 'More surface runoff', evidenceLabels: ['Runoff increased by 10 index points.'],
    deltas: { evaporation: 0, runoff: 10, infiltration: -11 },
    notes: { explanation: 'Paving left less opportunity for infiltration.', evidence: 'Runoff 48 → 58/100.', nextTest: 'Change permeability only.' },
    metrics: { baseline: { evaporation: 1, runoff: 48, infiltration: 56 },
      current: { evaporation: 1, runoff: 58, infiltration: 45 } },
    savedAt: 1720000000000, ...extra };
}

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_watercycle.js', 'utf8');
  const start = source.indexOf('var WCExploreNotebook =');
  const end = source.indexOf('// End Explore notebook helpers.', start);
  if (start < 0 || end < start) throw new Error('Explore notebook helper markers are missing.');
  K = vm.runInNewContext(source.slice(start, end) + '\nWCExploreNotebook;', { Object, Array, Number, String, Boolean, JSON, Math, Date, isFinite });
  const removalStart = source.indexOf('var collectWcRemovedEntries = function(indices)');
  const removalEnd = source.indexOf('var updateWcObservationNote = function(', removalStart);
  if (removalStart < 0 || removalEnd < removalStart) throw new Error('Explore removal handlers are missing.');
  removalSource = source.slice(removalStart, removalEnd);
});

describe('Explore evidence notebook comparison identity', () => {
  it('normalizes all eight inputs and excludes unrelated display and preset fields', () => {
    const normalized = K.normalizeScenario({ ...BASE, wcScenarioPreset: 'balanced', camera: 'immersive', note: 'Not a model input' });
    expect(Object.keys(normalized).sort()).toEqual(Object.keys(BASE).sort());
    expect(normalized).toEqual(BASE);
    expect(normalized).not.toHaveProperty('wcScenarioPreset');
  });

  it('produces a detached snapshot', () => {
    const input = { ...BASE };
    const normalized = K.normalizeScenario(input);
    input.landRainIntensity = 0;
    expect(normalized.landRainIntensity).toBe(55);
  });

  it('uses defaults for invalid numbers without clamping finite teaching inputs', () => {
    const normalized = K.normalizeScenario({ climSolar: NaN, climTemp: Infinity, climWind: -Infinity,
      landRainIntensity: 500, landSaturation: -10, landPermeability: 'invented', landSlope: 'invented', landCover: 'invented' });
    expect(normalized).toEqual({ ...BASE, landRainIntensity: 500, landSaturation: -10 });
    expect(K.normalizeScenario({ ...BASE, climSolar: 1.23456789 }).climSolar).toBe(1.234568);
  });

  it('returns no comparison identity when either recorded setup is incomplete or invalid', () => {
    const incomplete = { ...BASE }; delete incomplete.climWind;
    expect(K.identity(incomplete, BASE)).toBe('');
    expect(K.identity(BASE, incomplete)).toBe('');
    expect(K.identity({ ...BASE, climTemp: NaN }, BASE)).toBe('');
    expect(K.identity(BASE, { ...BASE, landCover: 'invented' })).toBe('');
  });

  it.each(Object.keys(VARIANTS))('includes %s in both halves of the comparison', key => {
    const identity = K.identity(BASE, BASE);
    expect(K.identity({ ...BASE, [key]: VARIANTS[key] }, BASE)).not.toBe(identity);
    expect(K.identity(BASE, { ...BASE, [key]: VARIANTS[key] })).not.toBe(identity);
  });

  it('is independent of property order, preset names, and visual choices', () => {
    const reordered = Object.fromEntries(Object.entries(BASE).reverse());
    expect(K.identity(BASE, BASE)).toBe(K.identity({ ...reordered, preset: 'one' }, { ...reordered, preset: 'two', journeyView: '3d' }));
  });

  it('reports every changed modeled input without counting display choices', () => {
    const changes = K.changedInputs(BASE, { ...BASE, climTemp: 20, landCover: 'forest', preset: 'heatwave', journeyView: '3d' });
    expect(changes.map(change => change.key)).toEqual(['climTemp', 'landCover']);
    expect(changes[0]).toMatchObject({ key: 'climTemp', before: 15, after: 20 });
    expect(typeof changes[0].label).toBe('string');
    expect(K.changedInputs(BASE, { ...BASE })).toEqual([]);
  });

  it('omits unrecorded inputs when listing legacy changes', () => {
    const incomplete = { climTemp: 15 };
    expect(K.changedInputs(incomplete, { ...BASE, climTemp: 20 }).map(change => change.key)).toEqual(['climTemp']);
  });
});

describe('Explore evidence notebook keeps learner records', () => {
  it('appends without mutating or replacing existing entries', () => {
    const original = entry();
    const log = [original];
    const next = entry({ ...BASE, climTemp: 25 }, { ...BASE, climTemp: 20 });
    const result = K.append(log, next);
    expect(result.status).toBe('saved');
    expect(log).toEqual([original]);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toBe(original);
    expect(result.entries[1]).toBe(next);
  });

  it('detects duplicate comparisons from snapshots despite stale or absent keys', () => {
    const original = entry(BASE, { ...BASE, landCover: 'urban' }, { key: 'old-current-only-key' });
    const duplicate = entry(BASE, { ...BASE, landCover: 'urban' }, { key: 'untrusted-different-key', preset: 'new label' });
    const result = K.append([original], duplicate);
    expect(result.status).toBe('duplicate');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toBe(original);
  });

  it('allows the same current scenario compared with a different baseline', () => {
    const current = { ...BASE, climTemp: 20 };
    const result = K.append([entry(BASE, current)], entry({ ...BASE, climTemp: 25 }, current));
    expect(result.status).toBe('saved');
    expect(result.entries).toHaveLength(2);
  });

  it('preserves legacy observations without a baseline and lets a complete comparison save', () => {
    const legacy = { key: 'legacy', snapshot: { ...BASE, landCover: 'urban' }, label: 'Earlier observation' };
    const result = K.append([legacy], entry());
    expect(result.status).toBe('saved');
    expect(result.entries[0]).toBe(legacy);
    expect(result.entries[0]).not.toHaveProperty('baseline');
  });

  it('stops at four entries without deleting the oldest or changing any saved objects', () => {
    const log = [0, 1, 2, 3].map(i => entry({ ...BASE, climTemp: 10 + i }, { ...BASE, climTemp: 20 + i }));
    const original = clone(log);
    const result = K.append(log, entry({ ...BASE, climTemp: 29 }, { ...BASE, climTemp: 30 }));
    expect(result.status).toBe('full');
    expect(result.entries).toEqual(original);
    log.forEach((saved, i) => expect(result.entries[i]).toBe(saved));
    expect(log).toEqual(original);
  });

  it('reports a duplicate at capacity instead of asking the learner to remove a record', () => {
    const log = [0, 1, 2, 3].map(i => entry({ ...BASE, climTemp: 10 + i }, { ...BASE, climTemp: 20 + i }));
    expect(K.append(log, clone(log[2])).status).toBe('duplicate');
  });

  it.each([[0, 2], [2, 0], [1, 0]])('undo preserves original order and notes after removing current indices %s then %s', (first, second) => {
    const log = [0, 1, 2, 3].map(i => entry({ ...BASE, climTemp: 10 + i }, { ...BASE, climTemp: 20 + i },
      { notes: { explanation: 'Unique explanation ' + i, evidence: 'Unique evidence ' + i, nextTest: 'Unique next test ' + i } }));
    const original = clone(log);
    const state = { wcExperimentLog: log, wcExperimentUndo: null };
    function execute(action) {
      vm.runInNewContext(removalSource + '\n' + action, {
        d: state, wcExperimentLog: state.wcExperimentLog,
        updMulti: patch => Object.assign(state, patch), requestAnimationFrame: () => {},
        document: { getElementById: () => null }, Object, Array, Math,
      });
    }
    execute('removeWcObservation(' + first + ');');
    execute('removeWcObservation(' + second + ');');
    expect(state.wcExperimentLog).toHaveLength(2);
    execute('undoWcObservationRemoval();');
    expect(state.wcExperimentLog).toEqual(original);
    state.wcExperimentLog.forEach((saved, index) => expect(saved).toBe(log[index]));
    expect(state.wcExperimentUndo).toBeNull();
  });
});

describe('Explore claims represent modeled evidence honestly', () => {
  it('can support runoff and infiltration independently in the same comparison', () => {
    const deltas = { evaporation: 0, runoff: 8, infiltration: 8 };
    expect(K.evaluateClaim('runoff', deltas, BASE, BASE)).toBe(true);
    expect(K.evaluateClaim('infiltration', deltas, BASE, BASE)).toBe(true);
    expect(K.evaluateClaim('mixed', deltas, BASE, BASE)).toBe(false);
  });

  it.each([-0.15, 0.15])('supports a direction-neutral evaporation change at %sx', evaporation => {
    expect(K.evaluateClaim('evaporation', { evaporation, runoff: 0, infiltration: 0 }, BASE, BASE)).toBe(true);
  });

  it('requires an actual crossing into colder below-freezing surface conditions', () => {
    expect(K.evaluateClaim('storage', small, BASE, { ...BASE, climTemp: -1 })).toBe(true);
    expect(K.evaluateClaim('storage', small, { ...BASE, climTemp: -3 }, { ...BASE, climTemp: -1 })).toBe(false);
    expect(K.evaluateClaim('storage', small, BASE, { ...BASE, climTemp: 0 })).toBe(false);
    expect(K.evaluateClaim('mixed', small, BASE, { ...BASE, climTemp: -1 })).toBe(false);
  });

  it('reserves mixed/small for changes below every threshold', () => {
    expect(K.evaluateClaim('mixed', small, BASE, BASE)).toBe(true);
    expect(K.evaluateClaim('mixed', { ...small, runoff: -8 }, BASE, BASE)).toBe(false);
    expect(K.evaluateClaim('mixed', { ...small, infiltration: -8 }, BASE, BASE)).toBe(false);
    expect(K.evaluateClaim('mixed', { ...small, evaporation: -0.15 }, BASE, BASE)).toBe(false);
    expect(K.evaluateClaim('runoff', { ...small, runoff: -10 }, BASE, BASE)).toBe(false);
    expect(K.evaluateClaim('infiltration', { ...small, infiltration: -10 }, BASE, BASE)).toBe(false);
  });

  it('does not support unknown claims', () => {
    expect(K.evaluateClaim('invented-water-budget', small, BASE, BASE)).toBe(false);
  });
});

describe('Explore notebook readable report', () => {
  it('exports recorded learner notes, inputs, and evidence without recomputing the result', () => {
    const saved = entry(BASE, { ...BASE, landCover: 'urban' }, {
      predictionLabel: 'Recorded claim label', evidenceLabels: ['Recorded evidence label'],
      metrics: { baseline: { evaporation: 0.73, runoff: 17, infiltration: 83 },
        current: { evaporation: 1.61, runoff: 92, infiltration: 8 } },
      notes: { explanation: 'Explanation kept verbatim.', evidence: 'Evidence kept verbatim.', nextTest: 'Next test kept verbatim.' },
    });
    const report = K.buildReport([saved]);
    ['Recorded claim label', 'Recorded evidence label', 'Explanation kept verbatim.', 'Evidence kept verbatim.', 'Next test kept verbatim.', '0.73', '1.61', '17', '92', 'urban', 'grass'].forEach(text => expect(report).toContain(text));
    expect(report).toMatch(/teaching|qualitative/i);
    expect(report).toMatch(/not.*(?:measured|forecast|water volume)/i);
  });

  it('labels missing legacy information without inventing baseline values or notes', () => {
    const legacy = { label: 'Earlier observation', snapshot: { ...BASE }, prediction: 'runoff', deltas: { runoff: 3 } };
    const original = clone(legacy);
    const report = K.buildReport([legacy]);
    expect(report).toContain('Earlier observation');
    expect(report).toMatch(/(?:not recorded|unavailable|missing)/i);
    expect(legacy).toEqual(original);
    expect(legacy).not.toHaveProperty('baseline');
  });
});
