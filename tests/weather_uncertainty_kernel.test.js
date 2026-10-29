import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function model(patch = {}) { return kernel.resolvedState({ scenario: 'coldFront', ...patch }); }

describe('Deterministic weather uncertainty exploration', () => {
  it('retains one exact control and leaves the supplied model untouched', () => {
    const source = model({ simHour: 6 });
    const before = JSON.stringify(source);
    const ensemble = kernel.ensembleForecast(source);
    expect(kernel.ensembleForecast(source)).toEqual(ensemble);
    expect(JSON.stringify(source)).toBe(before);
    expect(ensemble.members).toHaveLength(9);
    const control = ensemble.members.find((member) => member.control);
    expect(control.id).toBe(5);
    expect(ensemble.members.filter((member) => member.control)).toHaveLength(1);
    expect(control.modelState).toEqual(ensemble.modelState);
    expect(Object.values(control.inputDeltas)).toEqual(Array(8).fill(0));
    const truth = kernel.expectedForecast(source);
    expect(control).toMatchObject({ precip: truth.precip, timing: truth.timing, hazard: truth.hazard, temperature: truth.future.temperature, pressure: truth.future.pressure });
  });

  it('uses the selected issue hour for every member and includes the whole timing horizon', () => {
    const ensemble = kernel.ensembleForecast(model({ simHour: 6 }));
    expect(ensemble.window).toMatchObject({ startHour: 6, targetHour: 12, endHour: 18, leadHours: 6, horizonHours: 12 });
    expect(ensemble.timeline.map((point) => point.hour)).toEqual(Array.from({ length: 13 }, (_, i) => i + 6));
    for (const member of ensemble.members) {
      expect(member.timeline.map((point) => point.hour)).toEqual(ensemble.timeline.map((point) => point.hour));
      const atTarget = member.timeline.find((point) => point.hour === 12).conditions;
      expect(member.precip).toBe(atTarget.precipType);
      expect(member.temperature).toBe(atTarget.temperature);
    }
  });

  it('keeps exact fractional and truncated endpoint windows', () => {
    const ensemble = kernel.ensembleForecast(model({ simHour: 22.5 }));
    expect(ensemble.window).toMatchObject({ startHour: 22.5, targetHour: 24, endHour: 24, leadHours: 1.5, truncated: true });
    expect(ensemble.timeline.map((point) => point.hour)).toEqual([22.5, 23.5, 24]);
    expect(ensemble.members.every((member) => member.timeline.at(-1).hour === 24)).toBe(true);
  });

  it('identifies the final instant as unavailable for a future forecast', () => {
    const ensemble = kernel.ensembleForecast(model({ simHour: 24 }));
    expect(ensemble.available).toBe(false);
    expect(ensemble.window.hasFuture).toBe(false);
    expect(ensemble.timeline.map((point) => point.hour)).toEqual([24]);
    expect(ensemble.members.every((member) => member.timeline.length === 1)).toBe(true);
  });

  it('collapses to one distinct starting setup at zero spread without implying independent agreement', () => {
    const ensemble = kernel.ensembleForecast(model(), { spreadScale: 0 });
    expect(ensemble.scale).toBe(0);
    expect(ensemble.distinctMemberCount).toBe(1);
    expect(ensemble.agreement).toBe(1);
    expect(ensemble.temperatureRange[0]).toBe(ensemble.temperatureRange[1]);
    expect(ensemble.members.every((member) => Object.values(member.inputDeltas).every((value) => value === 0))).toBe(true);
    expect(ensemble.interpretation).toContain('not a confidence interval');
    expect(ensemble.interpretation).toContain('not a real-world probability');
    expect(ensemble.interpretation).toContain('independent evidence');
  });

  it('scales the authored perturbations while holding the remaining inputs fixed', () => {
    const ordinary = kernel.ensembleForecast(model());
    const expanded = kernel.ensembleForecast(model(), { spreadScale: 2 });
    expect(ordinary.members[0].inputDeltas).toMatchObject({ temp: -2, humidity: -7, pressure: 2, windSpeed: -5, instability: -10 });
    expect(expanded.members[0].inputDeltas).toMatchObject({ temp: -4, humidity: -14, pressure: 4, windSpeed: -10, instability: -20 });
    for (const member of expanded.members) expect(member.inputDeltas).toMatchObject({ windDir: 0, frontSpeed: 0, terrain: 0 });
  });

  it('reports actual clipped input changes at the teaching model boundaries', () => {
    const ensemble = kernel.ensembleForecast(model({ temp: 38, humidity: 100, pressure: 1040, windSpeed: 80, instability: 100 }), { spreadScale: 2 });
    expect(ensemble.members[3].inputDeltas.humidity).toBe(0);
    expect(ensemble.members[0].inputDeltas.humidity).toBe(-14);
    expect(ensemble.members[6].inputDeltas.windSpeed).toBe(0);
    for (const member of ensemble.members) for (const variable of kernel.experimentVariables) {
      expect(member.modelState[variable.id]).toBeGreaterThanOrEqual(variable.min);
      expect(member.modelState[variable.id]).toBeLessThanOrEqual(variable.max);
    }
  });

  it('normalizes malformed source controls without NaN, infinity, or invented boolean measurements', () => {
    const ensemble = kernel.ensembleForecast({ scenario: 'coldFront', simHour: Infinity, temp: NaN, humidity: null, pressure: '', windSpeed: true, windDir: -10, instability: 500, terrain: -50 });
    expect(ensemble.modelState).toMatchObject({ simHour: 0, temp: 25, humidity: 72, pressure: 1008, windSpeed: 24, windDir: 350, instability: 100, terrain: 0 });
    function inspect(value) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      else if (value && typeof value === 'object') Object.values(value).forEach(inspect);
    }
    inspect(ensemble);
  });

  it('bounds spread settings and defaults missing or non-numeric settings to the standard ensemble', () => {
    for (const spreadScale of [null, '', false, NaN, Infinity]) expect(kernel.ensembleForecast(model(), { spreadScale }).scale).toBe(1);
    expect(kernel.ensembleForecast(model(), { spreadScale: -4 }).scale).toBe(0);
    expect(kernel.ensembleForecast(model(), { spreadScale: 9 }).scale).toBe(2);
    expect(kernel.ensembleForecast(model(), { spreadScale: '0.5' }).scale).toBe(0.5);
  });

  it('exposes tied leading categories instead of declaring a unique winner', () => {
    const ensemble = kernel.ensembleForecast(model({ scenario: 'winterStorm', temp: -3.5, humidity: 90 }), { spreadScale: 1.5 });
    expect(ensemble.counts).toMatchObject({ rain: 1, snow: 4, mixed: 4 });
    expect(ensemble.tiedPrecip).toEqual(['snow', 'mixed']);
    expect(ensemble.dominantPrecip).toBe('snow');
    expect(ensemble.agreement).toBe(4 / 9);
    expect(ensemble.tiedHazards.length).toBeGreaterThan(0);
  });

  it('summarizes the full member range and counts at each actual sampled time', () => {
    const ensemble = kernel.ensembleForecast(model({ scenario: 'winterStorm', simHour: 9 }), { spreadScale: 1.5 });
    for (const point of ensemble.timeline) {
      const members = ensemble.members.map((member) => member.timeline.find((sample) => sample.hour === point.hour).conditions);
      for (const [key, rangeKey] of [['temperature', 'temperatureRange'], ['pressure', 'pressureRange'], ['precipPotential', 'precipPotentialRange']]) {
        expect(point[rangeKey]).toEqual([Math.min(...members.map((member) => member[key])), Math.max(...members.map((member) => member[key]))]);
      }
      expect(Object.values(point.counts).reduce((total, count) => total + count, 0)).toBe(9);
      expect(point.agreement).toBe(Math.max(...Object.values(point.counts)) / 9);
    }
  });

  it('fingerprints weather inputs, issue time, and spread but ignores presentation settings', () => {
    const standard = kernel.ensembleForecast(model()).contextKey;
    expect(kernel.ensembleForecast(model({ motion: false, radar: false })).contextKey).toBe(standard);
    expect(kernel.ensembleForecast(model({ simHour: 1 })).contextKey).not.toBe(standard);
    expect(kernel.ensembleForecast(model({ humidity: 75 })).contextKey).not.toBe(standard);
    expect(kernel.ensembleForecast(model(), { spreadScale: 0.5 }).contextKey).not.toBe(standard);
  });
});

describe('Confidence compared with a chosen outcome, not claimed calibration', () => {
  it('compares confidence with the selected minority outcome instead of the ensemble majority', () => {
    const ensemble = kernel.ensembleForecast(model());
    expect(ensemble.counts).toMatchObject({ rain: 6, storms: 3 });
    const comparison = kernel.calibrateConfidence(model(), 33, 'storms');
    expect(comparison).toMatchObject({ available: true, targetPrecip: 'storms', supportCount: 3, memberCount: 9, agreement: 33, status: 'well', label: 'Near model agreement', scale: 1 });
    expect(kernel.calibrateConfidence(model(), 67, 'storms')).toMatchObject({ status: 'over', label: 'Above model agreement' });
    expect(comparison.explanation).toContain('not statistical calibration');
    expect(comparison.explanation).toContain('not statistical calibration or a real-world probability');
  });

  it('reports zero member support for a known unrepresented category', () => {
    expect(kernel.calibrateConfidence(model(), 80, 'snow')).toMatchObject({ targetPrecip: 'snow', supportCount: 0, agreement: 0, gap: 80, status: 'over' });
    expect(kernel.calibrateConfidence(model(), 0, 'snow')).toMatchObject({ selected: 0, available: true, status: 'well' });
  });

  it('uses a documented majority fallback only when no choice was supplied', () => {
    expect(kernel.calibrateConfidence(model(), 67)).toMatchObject({ targetPrecip: 'rain', supportCount: 6, agreement: 67, status: 'well' });
    expect(kernel.calibrateConfidence(model(), 67, 'unrecognized')).toMatchObject({ available: false, targetPrecip: null, supportCount: null, agreement: null, status: 'unavailable' });
  });

  it('keeps invalid confidence absent instead of coercing it to zero', () => {
    for (const confidence of [undefined, null, '', ' ', true, NaN, Infinity]) {
      expect(kernel.calibrateConfidence(model(), confidence, 'rain')).toMatchObject({ available: false, selected: null, gap: null, status: 'unavailable' });
    }
    expect(kernel.calibrateConfidence(model(), '0', 'rain')).toMatchObject({ available: true, selected: 0, status: 'under', label: 'Below model agreement' });
  });

  it('preserves zero confidence in verification without changing forecast points', () => {
    const source = model();
    const truth = kernel.expectedForecast(source);
    const forecast = { precip: truth.precip, timing: truth.timing, hazard: truth.hazard, evidence: ['pressure', 'front', 'radar'] };
    const noConfidence = kernel.scoreForecast(source, forecast);
    const zero = kernel.scoreForecast(source, { ...forecast, confidence: 0 });
    expect(noConfidence.calibration).toBeNull();
    expect(zero.calibration).toMatchObject({ selected: 0, targetPrecip: truth.precip, status: 'under' });
    expect(zero.score).toBe(noConfidence.score);
    expect(zero.notes.join(' ')).not.toMatch(/reasonably calibrated|overconfident|underconfident/);
  });

  it('does not offer future confidence comparison at the simulation endpoint', () => {
    const source = model({ simHour: 24 });
    expect(kernel.calibrateConfidence(source, 80, 'rain')).toMatchObject({ available: false, status: 'unavailable' });
    expect(kernel.calibrateConfidence(source, 80, 'rain').explanation).toContain('earlier issue hour');
    expect(kernel.scoreForecast(source, { precip: 'rain', confidence: 80 }).calibration).toBeNull();
  });
});
