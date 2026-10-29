import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const physics = require(resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js'));
const clone = (value) => JSON.parse(JSON.stringify(value));
function scan(path = 'axial', strength = 1, noise = 0, distances = [50, 65, 80, 100, 125, 150, 175]) {
  return physics.fieldScanSeries([{ x: 0, y: 0, angle: 0, polarity: 1, strength }], path, distances, 0, noise)
    .map((row, index) => ({ ...row, id: index + 1, strength }));
}
function state(extra = {}) {
  return {
    tab: 'field', fieldView: 'map', fieldMapProbe: { x: 130, y: -40 },
    fieldMapPath: 'axial', fieldMapStrength: 2, fieldMapNoise: 12,
    fieldMapSamples: scan('axial', 2, 12), fieldMapReference: scan('equatorial', 1, 5),
    fieldMapScanPrediction: 3, fieldMapPrediction: 1, fieldMapGraphScale: 'log', fieldMapModel: 2,
    fieldMapSelected: 2, fieldMapCompareSelected: 8,
    ...extra,
  };
}

describe('versioned field experiment evidence survives capture and reopening', () => {
  it('round-trips measurements, controls, both predictions, graph, and inspected readings through JSON', () => {
    const original = state();
    const snapshot = physics.fieldExperimentSnapshot({ magnetism: original });
    expect(snapshot).toMatchObject({ version: 1, type: 'field-measurements', prediction: 3, nextPrediction: 1, graphScale: 'log', model: 2, selection: { first: 2, second: 8 } });
    expect(snapshot.controls).toEqual({ probe: { x: 130, y: -40 }, path: 'axial', strength: 2, noisePercent: 12 });
    expect(snapshot.samples).toHaveLength(7);
    expect(snapshot.reference).toHaveLength(7);
    const restored = physics.fieldExperimentRestorePatch(clone(snapshot));
    expect(physics.fieldExperimentSnapshot(restored)).toEqual(snapshot);
    expect(physics.fieldMeasurementAnalysis(restored.fieldMapSamples).fit).toEqual(physics.fieldMeasurementAnalysis(original.fieldMapSamples).fit);
    expect(physics.fieldScanComparison(restored.fieldMapSamples, restored.fieldMapReference)).toEqual(physics.fieldScanComparison(original.fieldMapSamples, original.fieldMapReference));
    expect(physics.fieldExperimentSnapshot(original)).toEqual(snapshot);
  });

  it('preserves near-field, manual, and mixed experiments without inventing a controlled conclusion', () => {
    const source = { x: 0, y: 0, angle: 0, polarity: 1, strength: 1 };
    const manual = [[20, 0], [30, 40], [-30, 70]].map(([x, y], index) => ({
      ...physics.fieldProbeReading(x, y, [source], 0), distance: Math.hypot(x, y), path: 'manual', strength: 1, id: index + 1,
    }));
    const snapshot = physics.fieldExperimentSnapshot(state({ fieldMapSamples: manual, fieldMapReference: [], fieldMapScanPrediction: null }));
    expect(snapshot).not.toBeNull();
    expect(snapshot.samples.map((row) => [row.x, row.y])).toEqual([[20, 0], [30, 40], [-30, 70]]);
    expect(physics.fieldMeasurementAnalysis(snapshot.samples).controlled).toBe(false);
    expect(physics.fieldExperimentRestorePatch(snapshot).fieldMapSamples).toEqual(snapshot.samples);
  });

  it('supports a reference-only workbench and defaults missing v1 inspection and next-prediction fields', () => {
    const snapshot = physics.fieldExperimentSnapshot(state({ fieldMapSamples: [], fieldMapSelected: undefined, fieldMapCompareSelected: undefined }));
    expect(snapshot.selection).toEqual({ first: 0, second: 6 });
    delete snapshot.selection;
    delete snapshot.nextPrediction;
    const patch = physics.fieldExperimentRestorePatch(snapshot);
    expect(patch).toMatchObject({ fieldMapSelected: 0, fieldMapCompareSelected: 6, fieldMapPrediction: 3 });
    expect(patch.fieldMapSamples).toEqual([]);
    expect(patch.fieldMapReference).toHaveLength(7);
  });

  it('uses the visible last fourteen readings at capture but rejects oversized stored experiments', () => {
    const rows = scan('axial', 1, 0, Array.from({ length: 15 }, (_, i) => 50 + i * 5));
    const snapshot = physics.fieldExperimentSnapshot(state({ fieldMapSamples: rows, fieldMapReference: [] }));
    expect(snapshot.samples).toHaveLength(14);
    expect(snapshot.samples[0].distance).toBe(55);
    snapshot.samples.unshift(clone(snapshot.samples[0]));
    expect(physics.normalizeFieldExperiment(snapshot)).toBeNull();
    expect(physics.fieldExperimentRestorePatch(snapshot)).toBeNull();
  });

  it('isolates captured and normalized evidence from later mutations', () => {
    const source = state();
    const snapshot = physics.fieldExperimentSnapshot(source);
    const expected = clone(snapshot);
    source.fieldMapProbe.x = 0;
    source.fieldMapSamples[0].measuredMagnitude = 999;
    source.fieldMapReference[0].x = 999;
    expect(snapshot).toEqual(expected);
    const normalized = physics.normalizeFieldExperiment(snapshot);
    const patch = physics.fieldExperimentRestorePatch(snapshot);
    normalized.samples[0].x = 777;
    normalized.controls.probe.y = 777;
    normalized.selection.first = 777;
    patch.fieldMapReference[0].strength = 777;
    patch.fieldMapProbe.x = 777;
    expect(snapshot).toEqual(expected);
  });
});

describe('field experiment validation never repairs lost or inconsistent scientific evidence', () => {
  it.each([
    ['unsupported version', (s) => { s.version = 2; }],
    ['unknown type', (s) => { s.type = 'other'; }],
    ['missing run', (s) => { delete s.reference; }],
    ['non-array run', (s) => { s.samples = 'readings'; }],
    ['null row', (s) => { s.samples.push(null); }],
    ['non-finite measurement', (s) => { s.samples[0].measuredBx = Infinity; }],
    ['numeric text in stored reading', (s) => { s.samples[0].distance = '50'; }],
    ['unknown path', (s) => { s.samples[0].path = 'spiral'; }],
    ['wrong radius', (s) => { s.samples[0].distance = 51; }],
    ['wrong axis', (s) => { s.samples[0].path = 'equatorial'; }],
    ['wrong magnitude', (s) => { s.samples[0].measuredMagnitude *= 2; }],
    ['zero vector', (s) => { s.samples[0].measuredBx = s.samples[0].measuredBy = 0; s.samples[0].measuredMagnitude = 1e-20; }],
    ['negative uncertainty', (s) => { s.samples[0].uncertainty = -1; }],
    ['bad probe', (s) => { s.controls.probe.x = 200; }],
    ['bad control type', (s) => { s.controls.noisePercent = '12'; }],
    ['bad control path', (s) => { s.controls.path = 'manual'; }],
    ['bad strength', (s) => { s.controls.strength = 20; }],
    ['bad prediction', (s) => { s.prediction = 4; }],
    ['bad model', (s) => { s.model = 0; }],
    ['bad graph scale', (s) => { s.graphScale = 'symlog'; }],
  ])('rejects %s in reader and restore', (_label, corrupt) => {
    const snapshot = physics.fieldExperimentSnapshot(state());
    corrupt(snapshot);
    expect(physics.normalizeFieldExperiment(snapshot)).toBeNull();
    expect(physics.fieldExperimentRestorePatch(snapshot)).toBeNull();
  });

  it('rejects capture if any visible input reading would have been discarded', () => {
    expect(physics.fieldExperimentSnapshot(state({ fieldMapSamples: scan().concat([null]) }))).toBeNull();
    expect(physics.fieldExperimentSnapshot(state({ fieldMapReference: 'broken' }))).toBeNull();
    expect(physics.fieldExperimentSnapshot(state({ tab: 'motor' }))).toBeNull();
    expect(physics.fieldExperimentSnapshot(state({ fieldView: '3d' }))).toBeNull();
    expect(physics.fieldExperimentSnapshot(null)).toBeNull();
  });

  it('allows an empty snapshot only for the explicit undo path', () => {
    const empty = state({ fieldMapSamples: [], fieldMapReference: [] });
    expect(physics.fieldExperimentSnapshot(empty)).toBeNull();
    const undo = physics.fieldExperimentSnapshot(empty, true);
    expect(undo).not.toBeNull();
    expect(undo.selection).toEqual({ first: 0, second: 0 });
    expect(physics.normalizeFieldExperiment(undo)).toBeNull();
    expect(physics.fieldExperimentRestorePatch(undo)).toBeNull();
    expect(physics.fieldExperimentSnapshot(physics.fieldExperimentRestorePatch(undo, true), true)).toEqual(undo);
    undo.controls.strength = NaN;
    expect(physics.normalizeFieldExperiment(undo, true)).toBeNull();
  });

  it('clamps presentation indices without changing evidence', () => {
    const snapshot = physics.fieldExperimentSnapshot(state());
    snapshot.selection = { first: -5, second: 999 };
    const normalized = physics.normalizeFieldExperiment(snapshot);
    expect(normalized.selection).toEqual({ first: 0, second: 13 });
    expect(normalized.samples).toEqual(snapshot.samples);
    expect(normalized.reference).toEqual(snapshot.reference);
  });
});

describe('experiment restoration uses an explicit field-state allowlist', () => {
  it('never carries notebook, report, quest, prototype, or executable fields into the patch', () => {
    const snapshot = physics.fieldExperimentSnapshot(state());
    const hostile = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"prototype":{"polluted":true},"notebookTrials":["overwrite"],"notebookReasoning":"overwrite","missionId":"overwrite","quizDone":true,"fieldMapReopenUndo":"overwrite"}');
    Object.keys(hostile).forEach((key) => Object.defineProperty(snapshot, key, { value: hostile[key], enumerable: true, configurable: true }));
    snapshot.samples[0].onClick = () => { throw new Error('must not be copied'); };
    snapshot.controls.probe.notebookClaim = 'overwrite';
    const patch = physics.fieldExperimentRestorePatch(snapshot);
    expect(Object.keys(patch).sort()).toEqual(['tab', 'fieldView', 'fieldMapProbe', 'fieldMapPath', 'fieldMapStrength', 'fieldMapNoise', 'fieldMapSamples', 'fieldMapReference', 'fieldMapScanPrediction', 'fieldMapPrediction', 'fieldMapGraphScale', 'fieldMapModel', 'fieldMapSelected', 'fieldMapCompareSelected'].sort());
    expect(Object.getPrototypeOf(patch)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(patch.fieldMapSamples[0])).toBe(Object.prototype);
    expect(patch.fieldMapSamples[0]).not.toHaveProperty('onClick');
    expect(patch.fieldMapProbe).toEqual({ x: 130, y: -40 });
    expect({}.polluted).toBeUndefined();
  });

  it('does not execute accessors or accept inherited required data', () => {
    const snapshot = physics.fieldExperimentSnapshot(state());
    let calls = 0;
    Object.defineProperty(snapshot.samples[0], 'measuredMagnitude', { get() { calls++; return 16; }, enumerable: true });
    expect(physics.normalizeFieldExperiment(snapshot)).toBeNull();
    expect(calls).toBe(0);
    const inherited = Object.create(physics.fieldExperimentSnapshot(state()));
    expect(physics.normalizeFieldExperiment(inherited)).toBeNull();
  });
});
