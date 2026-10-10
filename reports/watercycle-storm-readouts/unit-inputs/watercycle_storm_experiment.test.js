import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let K;

beforeAll(() => {
  const element = () => ({ style: {}, appendChild() {}, setAttribute() {} });
  const window = {};
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_watercycle.js', 'utf8'), {
    window,
    document: { head: element(), body: element(), createElement: element, getElementById: () => null },
    console, Math, Date, Object, Array, Number, String, Boolean, JSON, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
  });
  K = window.WaterCyclePrecipitationKernel;
});

describe('Storm Lab controlled experiments', () => {
  it('captures a normalized, immutable setup independent of mutable source data', () => {
    const input = { ...K.presets.gentleRain, moisture: 500, tempC: -100, note: 'Keep this elsewhere' };
    const snapshot = K.setupSnapshot(input);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot.moisture).toBe(100);
    expect(snapshot.tempC).toBe(-35);
    expect(snapshot).not.toHaveProperty('note');
    expect(snapshot).not.toHaveProperty('preset');
    input.surfaceTempC = -12;
    expect(snapshot.surfaceTempC).not.toBe(input.surfaceTempC);
    expect(() => { snapshot.moisture = 0; }).toThrow();
  });

  it('records the derived middle temperature so later replay does not derive a different profile', () => {
    const snapshot = K.setupSnapshot({ tempC: -10, surfaceTempC: 10 });
    expect(snapshot.midLevelTempC).toBe(1);
    const changed = { ...snapshot, surfaceTempC: 20 };
    const comparison = K.experiment(snapshot, changed);
    expect(comparison.kind).toBe('single');
    expect(comparison.changes.map(change => change.key)).toEqual(['surfaceTempC']);
    expect(comparison.modelB.config.midLevelTempC).toBe(1);
  });

  it('ignores display, playback, environment, and notebook choices', () => {
    const base = { ...K.presets.summerStorm, stormTime: 52 };
    const displayed = { ...base, viewMode: '3d', cameraFocus: 'immersive', environment: 'beach',
      stormTrack: 2, transitionSeconds: 20, paused: true, stormAutoPlay: true,
      showAirflow: false, showStormAnatomy: false, soundEnabled: true,
      lightningStudyStep: 'pressure-wave', preset: 'custom', hypothesis: 'A prediction',
      thunderEstimateKm: 20, thunderEstimateChecked: true, log: [{ result: 'Invented' }] };
    const comparison = K.experiment(base, displayed);
    expect(comparison.kind).toBe('identical');
    expect(comparison.changes).toHaveLength(0);
    expect(comparison.intensityDelta).toBe(0);
    expect(comparison.modelB.config.stormAutoPlay).toBe(false);
  });

  it('compares recomputed phases while intensity can remain unchanged', () => {
    const base = { ...K.presets.mountainSnow, tempC: -8, midLevelTempC: -3, surfaceTempC: -6, stormTime: 52 };
    const comparison = K.experiment(base, { ...base, surfaceTempC: 12, result: 'Hail', intensity: 100 });
    expect(comparison.kind).toBe('single');
    expect(comparison.modelA.visualType).toBe('snow');
    expect(comparison.modelB.visualType).toBe('rain');
    expect(comparison.intensityDelta).toBe(0);
    expect(comparison.intensityUnit).toBe('index points');
    expect(comparison.changes[0]).toMatchObject({
      key: 'surfaceTempC', label: 'Surface temperature', before: -6, after: 12,
      beforeLabel: '-6°C', afterLabel: '12°C', scope: 'precipitation',
    });
  });

  it('identifies lifecycle progress as a changed model condition', () => {
    const base = { ...K.presets.summerStorm, stormTime: 16 };
    const comparison = K.experiment(base, { ...base, stormTime: 52 });
    expect(comparison.kind).toBe('single');
    expect(comparison.changes[0].key).toBe('stormTime');
    expect(comparison.modelA.lifecycle.stageKey).toBe('developing');
    expect(comparison.modelB.lifecycle.stageKey).toBe('mature');
    expect(comparison.intensityDelta).toBeGreaterThan(0);
  });

  it('reports every changed condition rather than treating two presets as a fair one-variable test', () => {
    const comparison = K.experiment(K.presets.gentleRain, K.presets.hailstorm);
    expect(comparison.kind).toBe('multiple');
    expect(comparison.changes.length).toBeGreaterThan(5);
    expect(comparison.changes.map(change => change.key)).toContain('updraft');
    expect(comparison.changes.map(change => change.key)).toContain('cloudDepth');
    expect(Object.isFrozen(comparison.changes)).toBe(true);
    expect(Object.isFrozen(comparison.changes[0])).toBe(true);
  });

  it('distinguishes a timing-only distance change from precipitation changes', () => {
    const base = { ...K.presets.summerStorm, stormTime: 52, stormDistanceKm: 2 };
    const comparison = K.experiment(base, { ...base, stormDistanceKm: 8 });
    expect(comparison.kind).toBe('single');
    expect(comparison.changes[0]).toMatchObject({ key: 'stormDistanceKm', scope: 'timing', beforeLabel: '2 km', afterLabel: '8 km' });
    expect(comparison.intensityDelta).toBe(0);
    expect(comparison.modelA.visualType).toBe(comparison.modelB.visualType);
    expect(comparison.modelB.thunder.delaySeconds).toBeGreaterThan(comparison.modelA.thunder.delaySeconds);
  });

  it('counts wind and terrain choices even when a particular outcome does not change', () => {
    const base = { ...K.presets.gentleRain, windDirection: 'east', terrain: 'plains' };
    const comparison = K.experiment(base, { ...base, windDirection: 'west', terrain: 'coast' });
    expect(comparison.kind).toBe('multiple');
    expect(comparison.changes).toEqual([
      expect.objectContaining({ key: 'windDirection', beforeLabel: 'West to east', afterLabel: 'East to west' }),
      expect.objectContaining({ key: 'terrain', beforeLabel: 'Open plains', afterLabel: 'Coastline' }),
    ]);
  });

  it('keeps both computed models independent of inputs and later comparisons', () => {
    const base = { ...K.presets.summerStorm };
    const changed = { ...base, moisture: 60 };
    const comparison = K.experiment(base, changed);
    const intensity = comparison.modelB.relativeIntensity;
    changed.moisture = 0;
    base.tempC = 15;
    comparison.modelA.config.moisture = 0;
    K.experiment({ moisture: 0 }, { moisture: 100 });
    expect(comparison.after.moisture).toBe(60);
    expect(comparison.before.moisture).toBe(K.presets.summerStorm.moisture);
    expect(comparison.modelB.config.moisture).toBe(60);
    expect(comparison.modelB.relativeIntensity).toBe(intensity);
    expect(comparison.before).not.toBe(comparison.modelA.config);
  });
});
