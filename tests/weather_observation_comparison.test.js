import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function snapshot(hour = 0, station = 'central', patch = {}) {
  return kernel.weatherObservationSnapshot({ scenario: 'coldFront', simHour: hour, ...patch }, station);
}

describe('Weather station observation evidence', () => {
  it('captures exactly the modeled station readings with sea-level pressure and source setup', () => {
    const saved = snapshot(4, 'west');
    const station = kernel.stations.find((item) => item.id === 'west');
    const reading = kernel.stationObservation(saved.modelState, station);
    expect(saved).toMatchObject({ schema: 'weather-observation-v1', stationId: 'west', station: station.name,
      hour: 4, temperature: reading.temperature, dewPoint: reading.dewPoint,
      pressure: reading.seaLevelPressure, windSpeed: reading.windSpeed, windDir: reading.windDir,
      cloudCover: reading.cloudCover, precipPotential: reading.precipPotential, precipType: reading.precipType });
    expect(saved.pressure).not.toBe(reading.pressure);
    expect(saved.wind).toBe(`${kernel.cardinal(reading.windDir)} ${reading.windSpeed} km/h`);
    expect(saved.modelState.simHour).toBe(4);
  });

  it('uses stable reading identifiers and time-independent starting-condition fingerprints', () => {
    const first = snapshot(0);
    expect(snapshot(0)).toEqual(first);
    expect(snapshot(6).id).not.toBe(first.id);
    expect(snapshot(6).contextKey).toBe(first.contextKey);
    expect(snapshot(0, 'coast').id).not.toBe(first.id);
    expect(snapshot(0, 'coast').contextKey).toBe(first.contextKey);
    expect(snapshot(0, 'central', { humidity: 30 }).contextKey).not.toBe(first.contextKey);
    expect(snapshot(0, 'central', { motion: false, radar: false, tab: 'forecast' }).id).toBe(first.id);
  });

  it('bounds and normalizes source controls while keeping finite snapshot measurements', () => {
    const saved = kernel.weatherObservationSnapshot({ scenario: 'fair', simHour: 99, temp: NaN,
      humidity: -50, pressure: Infinity, windSpeed: true, windDir: -45, frontSpeed: 99, terrain: {} }, 'not-a-station');
    expect(saved.stationId).toBe('central');
    expect(saved.hour).toBe(24);
    expect(saved.modelState).toMatchObject({ temp: 21, humidity: 10, pressure: 1024, windDir: 315, frontSpeed: 65 });
    expect(Object.values(saved).filter((value) => typeof value === 'number').every(Number.isFinite)).toBe(true);
    expect(kernel.weatherObservationSnapshot(null, null).hour).toBe(0);
    expect(kernel.weatherObservationSnapshot({ simHour: '' }, 'central').hour).toBe(0);
    expect(kernel.weatherObservationSnapshot({ simHour: '2.5' }, 'central').hour).toBe(2.5);
  });

  it('does not mutate or retain source objects and uses canonical station identity', () => {
    const source = Object.freeze({ scenario: 'coldFront', simHour: 3, humidity: 50, note: 'Private UI state' });
    const station = Object.freeze({ id: 'west', elevation: 999999, name: 'Wrong station name' });
    const saved = kernel.weatherObservationSnapshot(source, station);
    expect(saved.station).toBe(kernel.stations.find((item) => item.id === 'west').name);
    expect(saved.modelState).not.toHaveProperty('note');
    saved.modelState.humidity = 30;
    expect(source.humidity).toBe(50);
  });

  it('compares saved endpoints without recomputing model output and gives interval-average rates', () => {
    const from = { ...snapshot(2), temperature: 11.5, pressure: 1002, humidity: 60 };
    const to = { ...snapshot(6), temperature: 13.5, pressure: 1000, humidity: 70 };
    const result = kernel.compareWeatherObservations(from, to);
    expect(result).toMatchObject({ kind: 'temporal', comparable: true, elapsedHours: 4 });
    expect(result.metrics.find((metric) => metric.id === 'temperature')).toMatchObject({ from: 11.5, to: 13.5, delta: 2, ratePerHour: 0.5 });
    expect(result.metrics.find((metric) => metric.id === 'pressure')).toMatchObject({ delta: -2, ratePerHour: -0.5 });
    expect(result.metrics.find((metric) => metric.id === 'humidity')).toMatchObject({ delta: 10, deltaUnit: ' percentage points', ratePerHour: 2.5 });
    expect(result.explanation).toContain('interval averages');
  });

  it('keeps selection direction explicit when comparing later readings to earlier ones', () => {
    const from = { ...snapshot(5), temperature: 15 };
    const to = { ...snapshot(2), temperature: 12 };
    const result = kernel.compareWeatherObservations(from, to);
    expect(result.elapsedHours).toBe(-3);
    expect(result.from.hour).toBe(5);
    expect(result.to.hour).toBe(2);
    expect(result.metrics.find((metric) => metric.id === 'temperature')).toMatchObject({ delta: -3, ratePerHour: 1 });
  });

  it('distinguishes same-hour station contrasts from time trends and does not assign rates', () => {
    const result = kernel.compareWeatherObservations(snapshot(4, 'central'), snapshot(4, 'coast'));
    expect(result).toMatchObject({ kind: 'spatial', comparable: true, elapsedHours: 0 });
    expect(result.explanation).toContain('not changes through time');
    expect(result.metrics.every((metric) => !Object.hasOwn(metric, 'ratePerHour'))).toBe(true);
  });

  it('marks simultaneous time and station changes as confounded', () => {
    const result = kernel.compareWeatherObservations(snapshot(0, 'central'), snapshot(6, 'west'));
    expect(result).toMatchObject({ kind: 'mixed', comparable: false, elapsedHours: 6 });
    expect(result.explanation).toContain('Both station location and model hour changed');
    expect(result.metrics).toHaveLength(8);
    expect(result.metrics.every((metric) => !Object.hasOwn(metric, 'ratePerHour'))).toBe(true);
  });

  it('does not interpret different model setups as a time trend', () => {
    const result = kernel.compareWeatherObservations(snapshot(0), snapshot(6, 'central', { humidity: 20 }));
    expect(result).toMatchObject({ kind: 'mixed', comparable: false });
    expect(result.explanation).toContain('different starting model conditions');
  });

  it('identifies repeat readings by station, hour, and setup rather than arbitrary IDs', () => {
    const result = kernel.compareWeatherObservations(snapshot(0), { ...snapshot(0), id: 'another-import-id' });
    expect(result).toMatchObject({ kind: 'same', comparable: false, elapsedHours: 0 });
    expect(result.explanation).toContain('same station at the same model hour');
  });

  it('keeps legacy and incompletely sourced readings descriptive without invented provenance', () => {
    const legacy = { id: 'legacy', station: 'Central School', hour: 0, temperature: 20, pressure: 1000 };
    const result = kernel.compareWeatherObservations(legacy, snapshot(6));
    expect(result).toMatchObject({ kind: 'unknown', comparable: false, elapsedHours: 6 });
    expect(result.from).not.toHaveProperty('stationId');
    expect(result.from).not.toHaveProperty('contextKey');
    expect(result.metrics.map((metric) => metric.id)).toEqual(['temperature', 'pressure']);
    expect(result.metrics.every((metric) => !Object.hasOwn(metric, 'ratePerHour'))).toBe(true);
  });

  it('requires complete consistent saved model provenance before accepting a fair comparison', () => {
    const valid = snapshot(6);
    for (const broken of [
      { ...valid, contextKey: 'not-the-saved-context' },
      { ...valid, modelState: { ...valid.modelState, simHour: 1 } },
      { ...valid, modelState: { scenario: 'coldFront', simHour: 6 } },
      { ...valid, stationId: 'unrecognized' },
      { ...valid, schema: 'unrecognized' },
    ]) {
      expect(kernel.compareWeatherObservations(snapshot(0), broken).kind).toBe('unknown');
    }
  });

  it('calculates shortest signed wind-from direction changes across north', () => {
    const from = { ...snapshot(0), windDir: 350 };
    const to = { ...snapshot(6), windDir: 10 };
    const forward = kernel.compareWeatherObservations(from, to).metrics.find((metric) => metric.id === 'windDir');
    expect(forward).toMatchObject({ delta: 20, magnitude: 20, ambiguous: false });
    expect(forward).not.toHaveProperty('ratePerHour');
    expect(kernel.compareWeatherObservations(to, from).metrics.find((metric) => metric.id === 'windDir').delta).toBe(-20);
    expect(kernel.compareWeatherObservations({ ...from, windDir: 360 }, { ...to, windDir: 0 }).metrics.find((metric) => metric.id === 'windDir').delta).toBe(0);
  });

  it('does not invent clockwise or counterclockwise movement for opposite wind directions', () => {
    const result = kernel.compareWeatherObservations({ ...snapshot(0), windDir: 0 }, { ...snapshot(6), windDir: 180 });
    const wind = result.metrics.find((metric) => metric.id === 'windDir');
    expect(wind).toMatchObject({ delta: null, magnitude: 180, ambiguous: true });
    expect(wind.explanation).toContain('neither clockwise nor counterclockwise');
  });

  it('omits unavailable or invalid measures without converting missing values to zero', () => {
    const result = kernel.compareWeatherObservations(
      { ...snapshot(0), temperature: null, humidity: true, pressure: '', windSpeed: NaN, cloudCover: 200 },
      { ...snapshot(6), dewPoint: Infinity, precipPotential: ' ' });
    expect(result.metrics.map((metric) => metric.id)).toEqual(['windDir']);
    expect(kernel.compareWeatherObservations(null, []).metrics).toEqual([]);
    expect(kernel.compareWeatherObservations({}, {}).elapsedHours).toBeNull();
  });

  it('returns independent saved snapshots and never mutates the supplied evidence', () => {
    const first = snapshot(0), second = snapshot(6);
    const before = JSON.stringify([first, second]);
    const result = kernel.compareWeatherObservations(first, second);
    result.from.temperature = -99;
    result.from.modelState.temp = -15;
    result.to.modelState.windSpeed = 1;
    expect(JSON.stringify([first, second])).toBe(before);
  });
});
