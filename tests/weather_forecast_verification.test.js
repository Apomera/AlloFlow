import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
const state = (overrides = {}) => kernel.resolvedState({ scenario: 'coldFront', ...overrides });

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

describe('Weather forecast windows follow the model', () => {
  it('forecasts six hours ahead of the selected time, rather than always grading T+6', () => {
    const first = kernel.expectedForecast(state());
    const later = kernel.expectedForecast(state({ simHour: 6 }));
    expect(first.window).toMatchObject({ startHour: 0, targetHour: 6, endHour: 12, hasFuture: true });
    expect(first.precip).toBe('rain');
    expect(later.window).toMatchObject({ startHour: 6, targetHour: 12, endHour: 18, leadHours: 6 });
    expect(later.precip).toBe('none');
    expect(later.future.temperature).toBeLessThan(first.future.temperature);
  });

  it('uses the same precipitation as the plotted regional model for every scenario and hour', () => {
    const mismatches = [];
    for (const scenario of kernel.scenarios) for (let hour = 0; hour < 24; hour += 3) {
      const model = state({ scenario: scenario.id, simHour: hour });
      const forecast = kernel.expectedForecast(model);
      if (forecast.precip !== kernel.projectConditions(model, Math.min(24, hour + 6)).precipType) mismatches.push([scenario.id, hour]);
    }
    expect(mismatches).toEqual([]);
  });

  it('uses observed modeled onset instead of a scenario-name timing answer', () => {
    const ordinary = kernel.forecastTimeline(state());
    expect(ordinary.firstPrecipHour).toBe(0);
    expect(kernel.expectedForecast(state()).timing).toBe('0-3');
    const dry = state({ humidity: 5, instability: 0, terrain: 0 });
    expect(kernel.forecastTimeline(dry).firstPrecipHour).toBeNull();
    expect(kernel.expectedForecast(dry)).toMatchObject({ timing: 'after12', precip: 'none', hazard: 'none' });
  });

  it('samples a delayed onset at its real model hour', () => {
    const model = state({ humidity: 55, instability: 0, terrain: 0 });
    const timeline = kernel.forecastTimeline(model);
    expect(timeline.firstPrecipHour).toBe(5);
    expect(kernel.expectedForecast(model).timing).toBe('4-6');
    expect(kernel.expectedForecast({ ...model, simHour: 2 }).timing).toBe('0-3');
    expect(timeline.points).toHaveLength(13);
    expect(timeline.points[0].conditions.hour).toBe(0);
    expect(timeline.points.at(-1).conditions.hour).toBe(12);
  });

  it('reports truncated horizons without pretending to know beyond T+24', () => {
    const timeline = kernel.forecastTimeline(state({ simHour: 21 }));
    expect(timeline.window).toMatchObject({ startHour: 21, targetHour: 24, endHour: 24, leadHours: 3, horizonHours: 3, availableHours: 3, truncated: true });
    expect(timeline.points.map((point) => point.hour)).toEqual([21, 22, 23, 24]);
    expect(timeline.points.map((point) => point.offsetHours)).toEqual([0, 1, 2, 3]);
  });

  it('retains fractional selected hours and the final partial interval', () => {
    const timeline = kernel.forecastTimeline(state({ simHour: 22.5 }));
    expect(timeline.points.map((point) => point.hour)).toEqual([22.5, 23.5, 24]);
    expect(timeline.window.leadHours).toBe(1.5);
  });

  it('does not score a zero-lead forecast at the end of the simulation', () => {
    const model = state({ simHour: 24 });
    const truth = kernel.expectedForecast(model);
    const result = kernel.scoreForecast(model, { ...truth, evidence: ['pressure', 'front', 'radar'] });
    expect(result.available).toBe(false);
    expect(result.score).toBe(0);
    expect(result.window.hasFuture).toBe(false);
    expect(result.notes.join(' ')).toContain('earlier hour');
  });

  it('bounds an invalid selected hour without producing invalid timeline measurements', () => {
    const timeline = kernel.forecastTimeline({ scenario: 'coldFront', simHour: Infinity, humidity: NaN });
    expect(timeline.window.startHour).toBe(0);
    expect(timeline.points.every((point) => Number.isFinite(point.conditions.temperature) && Number.isFinite(point.conditions.precipPotential))).toBe(true);
  });
});

describe('Classroom hazard signals are derived from the forecast window', () => {
  it('removes icy travel when a winter scenario is changed to warm conditions', () => {
    expect(kernel.expectedForecast(state({ scenario: 'winterStorm' })).hazard).toBe('ice');
    const warm = kernel.expectedForecast(state({ scenario: 'winterStorm', temp: 20 }));
    expect(warm.precip).toBe('rain');
    expect(warm.hazard).not.toBe('ice');
  });

  it('does not invent snow solely from the winter scenario name when moisture is removed', () => {
    expect(kernel.expectedForecast(state({ scenario: 'winterStorm', humidity: 5, instability: 0, terrain: 0 }))).toMatchObject({ precip: 'none', hazard: 'none' });
  });

  it('keeps high-wind evidence even on a dry clear day', () => {
    const outcome = kernel.expectedForecast(state({ scenario: 'fair', windSpeed: 70 }));
    expect(outcome).toMatchObject({ precip: 'none', hazard: 'highWind' });
    expect(outcome.reasons.hazard).toContain('70 km/h');
    expect(outcome.reasons.hazard).toContain('illustrative');
  });

  it('only flags lightning while modeled thunderstorms occur in the window', () => {
    expect(kernel.expectedForecast(state({ scenario: 'summerStorm' })).hazard).toBe('lightning');
    expect(kernel.expectedForecast(state({ scenario: 'coldFront', instability: 85, simHour: 0 })).hazard).toBe('lightning');
    expect(kernel.expectedForecast(state({ scenario: 'coldFront', instability: 85, simHour: 12 })).hazard).toBe('none');
  });

  it('explains the provisional prolonged-rain flag without representing it as an actual flood', () => {
    const outcome = kernel.expectedForecast(state({ scenario: 'warmFront' }));
    expect(outcome.hazard).toBe('flood');
    expect(outcome.reasons.hazard).toContain('classroom prolonged-rain flag');
  });
});

describe('Forecast scoring explains evidence and preserves context', () => {
  it('scores unique recognized evidence instead of duplicate or invented entries', () => {
    const model = state();
    const truth = kernel.expectedForecast(model);
    const result = kernel.scoreForecast(model, { ...truth, evidence: ['pressure', 'pressure', 'madeUp'] });
    expect(result.evidenceIds).toEqual(['pressure']);
    expect(result.score).toBe(94);
    expect(result.breakdown.find((item) => item.id === 'evidence')).toMatchObject({ selected: 1, expected: 3, earned: 4, possible: 10, matched: false });
    expect(kernel.forecastEvidenceIds('pressure')).toEqual([]);
  });

  it('makes individual credit and deductions add up to the final grade', () => {
    const result = kernel.scoreForecast(state(), { precip: 'rain', timing: '4-6', hazard: 'lightning', evidence: ['pressure', 'tempDew', 'windShift'] });
    expect(result.score).toBe(50);
    expect(result.breakdown.map((item) => item.earned)).toEqual([40, 0, 0, 10]);
    expect(result.breakdown.reduce((total, item) => total + item.earned, 0)).toBe(result.score);
    expect(result.breakdown.every((item) => typeof item.explanation === 'string' && item.explanation.length > 20)).toBe(true);
    expect(result.breakdown.find((item) => item.id === 'timing')).toMatchObject({ selected: '4-6', expected: '0-3', matched: false });
  });

  it('fingerprints every model control but ignores decorative layer toggles', () => {
    const base = state();
    const fingerprint = kernel.forecastContextKey(base);
    expect(kernel.forecastContextKey({ ...base, radar: false, fronts: false, windLayer: false })).toBe(fingerprint);
    for (const key of ['simHour', 'temp', 'humidity', 'pressure', 'windSpeed', 'windDir', 'frontSpeed', 'instability', 'terrain']) {
      expect(kernel.forecastContextKey({ ...base, [key]: base[key] + 1 }), key).not.toBe(fingerprint);
    }
  });

  it('does not mutate source state or evidence while producing deterministic results', () => {
    const model = Object.freeze(state());
    const forecast = Object.freeze({ precip: 'rain', timing: '0-3', hazard: 'none', evidence: Object.freeze(['pressure', 'radar', 'front']) });
    expect(kernel.scoreForecast(model, forecast)).toEqual(kernel.scoreForecast(model, forecast));
    expect(forecast.evidence).toEqual(['pressure', 'radar', 'front']);
  });
});
