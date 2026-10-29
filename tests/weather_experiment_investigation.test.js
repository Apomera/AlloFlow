import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
const model = (overrides = {}) => kernel.resolvedState({ scenario: 'coldFront', ...overrides });

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

describe('Controlled weather investigations', () => {
  it('compares absolute model hours independently of playback time', () => {
    const early = kernel.runExperiment(model({ simHour: 0 }), 'humidity', 90, 6);
    const late = kernel.runExperiment(model({ simHour: 22 }), 'humidity', 90, 6);
    expect(late).toEqual(early);
    expect(late.control.hour).toBe(6);
    expect(late.modelState.simHour).toBe(0);
    expect(late.timeline.map((point) => point.hour)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('uses the same regional calculations for both setups at every sampled hour', () => {
    const source = model({ humidity: 60 });
    const result = kernel.runExperiment(source, 'humidity', 90, 12);
    expect(result.timeline).toHaveLength(13);
    for (const point of result.timeline) {
      expect(point.control).toEqual(kernel.projectConditions(source, point.hour));
      expect(point.test).toEqual(kernel.projectConditions({ ...source, humidity: 90 }, point.hour));
      expect(point.deltas.precipPotential).toBe(point.test.precipPotential - point.control.precipPotential);
    }
    expect(result.control).toEqual(result.timeline.at(-1).control);
    expect(result.test).toEqual(result.timeline.at(-1).test);
    expect(result.deltas).toEqual(result.timeline.at(-1).deltas);
  });

  it('retains an exact fractional endpoint and samples T+0 only once', () => {
    const result = kernel.runExperiment(model(), 'temp', 10, 2.5);
    expect(result.timeline.map((point) => point.hour)).toEqual([0, 1, 2, 2.5]);
    expect(result.hour).toBe(2.5);
    expect(result.control.hour).toBe(2.5);
    const initial = kernel.runExperiment(model(), 'temp', 10, 0);
    expect(initial.timeline).toHaveLength(1);
    expect(initial.control.hour).toBe(0);
  });

  it('changes exactly one input without mutating or retaining source UI state', () => {
    const source = Object.freeze({ ...model({ humidity: 50 }), reasoning: 'private note', radar: false });
    const result = kernel.runExperiment(source, 'humidity', 80, 3);
    expect(source.humidity).toBe(50);
    expect(result.modelState.humidity).toBe(50);
    expect(result.modelState).not.toHaveProperty('reasoning');
    expect(result.modelState).not.toHaveProperty('radar');
    expect(result.test).toEqual(kernel.projectConditions({ ...result.modelState, humidity: 80 }, 3));
    result.modelState.humidity = 40;
    expect(source.humidity).toBe(50);
  });

  it('falls back to scenario defaults for nonnumeric, missing, and nonfinite inputs', () => {
    const broken = { scenario: 'winterStorm', temp: Infinity, humidity: NaN, pressure: '', windSpeed: null,
      frontSpeed: undefined, instability: false, terrain: {}, windDir: -Infinity };
    const result = kernel.runExperiment(broken, 'humidity', 'not a number', NaN);
    const valid = kernel.runExperiment(model({ scenario: 'winterStorm' }), 'humidity', 91, 6);
    expect(result).toEqual(valid);
    expect(kernel.runExperiment(null, 'unknown', null).variable).toBe('humidity');
    expect(kernel.runExperiment(null, 'unknown', null).hour).toBe(6);
  });

  it('bounds every starting control and normalizes wind direction before projecting', () => {
    const result = kernel.runExperiment({ scenario: 'fair', temp: 1000, humidity: -50, pressure: 9999,
      windSpeed: -1, frontSpeed: 1000, instability: 200, terrain: -50, windDir: -45 }, 'temp', -1000, 1000);
    expect(result.modelState).toEqual({ scenario: 'fair', simHour: 0, temp: 38, humidity: 10,
      pressure: 1040, windSpeed: 0, frontSpeed: 65, instability: 100, terrain: 0, windDir: 315 });
    expect(result.testValue).toBe(-15);
    expect(result.hour).toBe(12);
    expect(result.timeline.every((point) => [point.control, point.test, point.deltas].every((record) =>
      Object.values(record).every((value) => typeof value !== 'number' || Number.isFinite(value))))).toBe(true);
  });

  it('accepts numeric strings and clamps negative horizons to T+0', () => {
    const result = kernel.runExperiment({ scenario: 'fair', humidity: '50' }, 'humidity', '80', '-2');
    expect(result.baselineValue).toBe(50);
    expect(result.testValue).toBe(80);
    expect(result.hour).toBe(0);
    expect(result.timeline).toHaveLength(1);
  });

  it('reports a true no-change control trial as steady', () => {
    const source = model();
    const result = kernel.runExperiment(source, 'humidity', source.humidity, 6);
    expect(result.test).toEqual(result.control);
    expect(Object.values(result.deltas)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(result.direction).toBe('steady');
    expect(result.interpretation).toContain('4 percentage points');
    expect(result.interpretation).toContain('not an observed chance of rain');
  });

  it('fingerprints inputs and selected test settings but ignores playback and visual state', () => {
    const source = model();
    const key = kernel.experimentContextKey(source, 'humidity', 90, 6);
    expect(kernel.runExperiment(source, 'humidity', 90, 6).contextKey).toBe(key);
    expect(kernel.experimentContextKey({ ...source, simHour: 24, radar: false, selectedStation: 'coast' }, 'humidity', 90, 6)).toBe(key);
    for (const [changed, variable, value, hour] of [
      [{ ...source, pressure: 1010 }, 'humidity', 90, 6],
      [source, 'temp', 30, 6],
      [source, 'humidity', 89, 6],
      [source, 'humidity', 90, 3]
    ]) expect(kernel.experimentContextKey(changed, variable, value, hour)).not.toBe(key);
  });

  it('fingerprints equivalent normalized inputs identically', () => {
    const source = model({ windDir: 315 });
    expect(kernel.experimentContextKey({ ...source, windDir: -45 }, 'humidity', 500, 20))
      .toBe(kernel.experimentContextKey(source, 'humidity', 100, 12));
  });
});

describe('Weather model sensitivity experiments', () => {
  it('includes seven aligned values spanning the variable range and the exact baseline', () => {
    const sweep = kernel.experimentSensitivity(model(), 'humidity', 6);
    expect(sweep.points.map((point) => point.value)).toEqual([10, 25, 40, 55, 70, 72, 85, 100]);
    expect(sweep.points.filter((point) => point.isBaseline)).toHaveLength(1);
    expect(sweep.points.find((point) => point.isBaseline).deltas.precipPotential).toBe(0);
    expect(sweep.baselineValue).toBe(72);
    expect(sweep.hour).toBe(6);
  });

  it('deduplicates a baseline already present in the sweep', () => {
    const sweep = kernel.experimentSensitivity(model({ humidity: 70 }), 'humidity', 6);
    expect(sweep.points).toHaveLength(7);
    expect(sweep.points.filter((point) => point.value === 70)).toHaveLength(1);
  });

  it('matches independent controlled runs at each value for every available variable', () => {
    const source = model();
    for (const variable of kernel.experimentVariables) {
      const sweep = kernel.experimentSensitivity(source, variable.id, 3);
      expect(sweep.points[0].value).toBe(variable.min);
      expect(sweep.points.at(-1).value).toBe(variable.max);
      expect(sweep.points.length).toBeGreaterThanOrEqual(7);
      expect(sweep.points.length).toBeLessThanOrEqual(8);
      for (const point of sweep.points) {
        const run = kernel.runExperiment(source, variable.id, point.value, 3);
        expect(point.control).toEqual(run.control);
        expect(point.test).toEqual(run.test);
        expect(point.deltas).toEqual(run.deltas);
        expect(point.precipPotential).toBe(point.test.precipPotential);
        expect(point.temperature).toBe(point.test.temperature);
        expect(point.cloudCover).toBe(point.test.cloudCover);
        if (!point.isBaseline) expect((point.value - variable.min) % variable.step).toBe(0);
      }
    }
  });

  it('preserves clipped plateaus rather than inventing a linear response', () => {
    const sweep = kernel.experimentSensitivity(model({ scenario: 'summerStorm' }), 'humidity', 2);
    expect(sweep.points[0].test.precipPotential).toBe(0);
    const last = sweep.points.slice(-2);
    expect(last.map((point) => point.test.precipPotential)).toEqual([100, 100]);
    expect(sweep.interpretation).toContain('not a probability forecast');
  });

  it('does not claim pressure directly changes the model precipitation index', () => {
    const sweep = kernel.experimentSensitivity(model(), 'pressure', 6);
    expect(sweep.points.every((point) => point.deltas.precipPotential === 0)).toBe(true);
    expect(new Set(sweep.points.map((point) => point.test.pressure)).size).toBe(sweep.points.length);
  });

  it('normalizes invalid requests deterministically without mutating the source', () => {
    const source = Object.freeze({ scenario: 'fair', humidity: '50', simHour: 20 });
    const sweep = kernel.experimentSensitivity(source, 'missing', Infinity);
    expect(sweep.variable).toBe('humidity');
    expect(sweep.hour).toBe(6);
    expect(sweep.contextKey).toBe(kernel.experimentContextKey(source, 'humidity', 50, 6));
    expect(source).toEqual({ scenario: 'fair', humidity: '50', simHour: 20 });
    expect(sweep).toEqual(kernel.experimentSensitivity({ ...source, simHour: 0 }, 'humidity', 6));
  });
});
