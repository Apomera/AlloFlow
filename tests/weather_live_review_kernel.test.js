import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function future(patch = {}) {
  return {
    label: 'School', latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
    observedAt: '2026-10-29T12:00', validAt: '2026-10-29T14:00', timezone: 'UTC', utcOffsetSeconds: 0,
    retrievedAt: '2026-10-29T12:01:00Z', timelineRole: 'forecast',
    temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 220,
    weatherCode: 95, cloudCover: 90, pressureType: 'surface', precipitationIntervalSeconds: 3600,
    ...patch,
  };
}

function checkpoint(patch = {}) {
  return kernel.createLiveForecastCheckpoint(future(patch), '2026-10-29T12:02:00Z');
}

function loaded(patch = {}) {
  return {
    latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
    observedAt: '2026-10-29T15:00', timezone: 'UTC', utcOffsetSeconds: 0,
    retrievedAt: '2026-10-29T15:01:00Z', pressureType: 'surface', precipitationIntervalSeconds: 900,
    ...patch,
  };
}

function later(patch = {}) {
  return {
    time: '2026-10-29T14:00', role: 'earlier', utcOffsetSeconds: 0,
    temperature: 22, precipitation: 0.7, pressure: 1009, windSpeed: 18, windDir: 200,
    weatherCode: 61, pressureType: 'surface', precipitationIntervalSeconds: 3600,
    ...patch,
  };
}

function compare(saved = checkpoint(), point = later(), live = loaded()) {
  return kernel.forecastCheckpointStatus(saved, [point], live);
}

describe('Live forecast snapshots and model-response review', () => {
  it('saves immutable numeric provenance without inventing a provider issue time', () => {
    const input = future();
    const original = structuredClone(input);
    const saved = kernel.createLiveForecastCheckpoint(input, '2026-10-29T12:02:00Z');
    expect(input).toEqual(original);
    expect(saved).toMatchObject({ schema: 'weather-live-checkpoint-v2', sourceKind: 'model', currentDataAt: input.observedAt, retrievedAt: '2026-10-29T12:01:00.000Z', capturedAt: '2026-10-29T12:02:00.000Z', validTimestamp: Date.parse('2026-10-29T14:00Z'), pressureType: 'surface', precipitationIntervalSeconds: 3600 });
    expect(saved.issuedAt).toBeUndefined();
    expect(saved.predicted).not.toBe(input);
    input.temperature = -99;
    expect(saved.predicted.temperature).toBe(24);
  });

  it('uses retrieval provenance in stable snapshot identity rather than overwriting repeated saves', () => {
    const first = checkpoint();
    const second = kernel.createLiveForecastCheckpoint(future({ temperature: 25 }), '2026-10-29T12:03:00Z');
    expect(second.id).toBe(first.id);
    const newer = kernel.createLiveForecastCheckpoint(future({ retrievedAt: '2026-10-29T12:03:00Z' }), '2026-10-29T12:04:00Z');
    expect(newer.id).not.toBe(first.id);
  });

  it('accepts explicit zero measurements without confusing missing values with zero', () => {
    const saved = checkpoint({ temperature: 0, precipitation: 0, windSpeed: 0, windDir: 360, weatherCode: 0, cloudCover: 0 });
    expect(saved.predicted).toMatchObject({ temperature: 0, precipitation: 0, windSpeed: 0, windDir: 0, weatherCode: 0, cloudCover: 0 });
    for (const missing of [null, undefined, '', ' ', false, Infinity]) {
      const result = checkpoint({ temperature: missing });
      expect(result.predicted.temperature).toBeUndefined();
    }
  });

  it('rejects invalid locations, sources, and snapshots with no numeric measurement', () => {
    for (const patch of [{ latitude: null }, { longitude: NaN }, { latitude: 91 }, { longitude: -181 }, { source: 'another provider' }, { sourceKind: 'observation' }, { timelineRole: 'current' }]) expect(checkpoint(patch)).toBeNull();
    expect(checkpoint({ temperature: null, precipitation: null, pressure: null, windSpeed: null, windDir: null })).toBeNull();
  });

  it('requires a future absolute valid instant and a plausible capture/retrieval order', () => {
    expect(checkpoint({ utcOffsetSeconds: undefined })).toBeNull();
    expect(checkpoint({ validAt: '2026-10-29T12:00' })).toBeNull();
    expect(checkpoint({ validAt: '2026-10-29T12:01' })).toBeNull();
    expect(checkpoint({ retrievedAt: '2026-10-29T12:03:00Z' })).toBeNull();
    expect(checkpoint({ observedAt: '2026-10-29T13:00' })).toBeNull();
    expect(kernel.createLiveForecastCheckpoint(future(), '2026-10-29T12:02')).toBeNull();
  });

  it('rejects impossible dates and offsets rather than relying on browser wall time', () => {
    const timestamp = kernel.liveReviewTimestamp;
    for (const input of ['2026-02-30T12:00Z', '2026-13-01T12:00Z', '2026-10-29T24:00Z', '2026-10-29T12:70Z', '2026-10-29T12:00+14:30', '2026-10-29T12:00+08:99', 'not a time']) expect(Number.isNaN(timestamp(input, 0))).toBe(true);
    expect(timestamp('2026-10-29T14:00', -14400)).toBe(Date.parse('2026-10-29T18:00Z'));
    expect(timestamp('2026-10-29T14:00-04:00')).toBe(Date.parse('2026-10-29T18:00Z'));
    expect(Number.isNaN(timestamp('2026-10-29T14:00'))).toBe(true);
  });

  it('compares same-instant model values with signed differences and honest source labels', () => {
    const saved = checkpoint(), point = later(), live = loaded();
    const before = JSON.stringify({ saved, point, live });
    const result = compare(saved, point, live);
    expect(result).toMatchObject({ code: 'compared', ready: true, comparisonKind: 'model-revision', conditionMatch: false, validTimestamp: saved.validTimestamp });
    expect(result.detail).toContain('not forecast error against independent observations');
    expect(result.metrics.temperature).toMatchObject({ forecast: 24, comparison: 22, observed: 22, error: 2, absoluteError: 2 });
    expect(result.metrics.pressure.error).toBe(-2);
    expect(result.metrics.precipitation.error).toBe(0.5);
    expect(result.metrics.windDirection.error).toBe(20);
    expect(JSON.stringify({ saved, point, live })).toBe(before);
  });

  it('matches equivalent absolute times across offsets instead of matching text labels', () => {
    const saved = kernel.createLiveForecastCheckpoint(future({ observedAt: '2026-10-29T08:00-04:00', validAt: '2026-10-29T10:00-04:00', utcOffsetSeconds: -14400 }), '2026-10-29T12:02:00Z');
    expect(compare(saved, later({ time: '2026-10-29T14:00Z' })).ready).toBe(true);
    expect(compare(saved, later({ time: '2026-10-29T10:00', utcOffsetSeconds: 0 })).code).toBe('unavailable');
    expect(compare(saved, later({ time: '2026-10-29T14:01Z' })).code).toBe('unavailable');
  });

  it('keeps legacy or inconsistent absolute timestamp records unverified', () => {
    const original = checkpoint();
    for (const patch of [{ schema: undefined }, { retrievedAt: undefined }, { currentDataAt: undefined }, { capturedAt: undefined }, { validTimestamp: original.validTimestamp + 3600000 }]) expect(compare({ ...original, ...patch }).code).toBe('legacy');
  });

  it('does not compare locations or providers that are missing or differ', () => {
    expect(compare(checkpoint(), later(), loaded({ latitude: null })).code).toBe('location');
    expect(compare({ ...checkpoint(), longitude: null }).code).toBe('location');
    expect(compare(checkpoint(), later(), loaded({ latitude: 40.1 })).code).toBe('location');
    expect(compare(checkpoint(), later(), loaded({ source: 'Different source' })).code).toBe('source');
    expect(compare(checkpoint(), later({ sourceKind: 'observation' })).code).toBe('source');
  });

  it('matches only the same location at the four-decimal precision saved by the live normalizer', () => {
    expect(compare(checkpoint(), later(), loaded({ latitude: 40.00004, longitude: -74.99996 })).ready).toBe(true);
    for (const patch of [{ latitude: 40.0001 }, { longitude: -74.9999 }, { latitude: 40.001 }, { longitude: -74.99 }]) {
      expect(compare(checkpoint(), later(), loaded(patch)).code).toBe('location');
    }
    expect(compare(checkpoint({ latitude: 40.00004 }), later(), loaded({ latitude: 40.00006 })).code).toBe('location');
  });

  it('wraps the same rounded meridian across the date line without accepting distinct nearby locations', () => {
    expect(compare(checkpoint({ longitude: 179.99998 }), later(), loaded({ longitude: -179.99998 })).ready).toBe(true);
    expect(compare(checkpoint({ longitude: 180 }), later(), loaded({ longitude: -180 })).ready).toBe(true);
    expect(compare(checkpoint({ longitude: 179.999 }), later(), loaded({ longitude: -179.999 })).code).toBe('location');
  });

  it('shares strict finite coordinate validation with checkpoint navigation', () => {
    const location = { latitude: 40, longitude: -75 };
    expect(kernel.liveReviewSameLocation(location, { latitude: '40.0000', longitude: '-75' })).toBe(true);
    for (const invalid of [null, {}, { latitude: null, longitude: -75 }, { latitude: NaN, longitude: -75 }, { latitude: 91, longitude: -75 }, { latitude: 40, longitude: 181 }]) {
      expect(kernel.liveReviewSameLocation(location, invalid)).toBe(false);
      expect(kernel.liveReviewSameLocation(invalid, location)).toBe(false);
    }
  });

  it('requires the current data time and later retrieval to reach the saved valid instant', () => {
    expect(compare(checkpoint(), later(), loaded({ observedAt: '2026-10-29T13:00' })).code).toBe('pending');
    expect(compare(checkpoint(), later(), loaded({ retrievedAt: '2026-10-29T13:01:00Z' })).code).toBe('pending');
    expect(compare(checkpoint(), later(), loaded({ retrievedAt: undefined })).code).toBe('refresh');
  });

  it('refuses a self-comparison even after a stale response is relabeled as earlier', () => {
    expect(compare(checkpoint(), later(), loaded({ retrievedAt: '2026-10-29T12:01:00Z' })).code).toBe('refresh');
    expect(compare(checkpoint(), later(), loaded({ retrievedAt: '2026-10-29T12:02:00Z' })).code).toBe('refresh');
    expect(compare(checkpoint(), later({ retrievedAt: '2026-10-29T12:01:00Z' })).code).toBe('refresh');
  });

  it('does not promote future or unknown-role values into later comparison data', () => {
    expect(compare(checkpoint(), later({ role: 'forecast' })).code).toBe('pending');
    expect(compare(checkpoint(), later({ role: undefined })).code).toBe('pending');
    expect(kernel.forecastCheckpointStatus(checkpoint(), [], loaded()).code).toBe('unavailable');
  });

  it('withholds null and nonnumeric measurements and missing condition categories', () => {
    const result = compare({ ...checkpoint(), predicted: { temperature: null, pressure: 1007, weatherCode: null } }, later({ temperature: 22, pressure: 1009, weatherCode: null }));
    expect(result.ready).toBe(true);
    expect(result.metrics.temperature).toBeNull();
    expect(result.metrics.windSpeed).toBeNull();
    expect(result.conditionMatch).toBeNull();
    expect(result.metrics.pressure.error).toBe(-2);
    const missing = { ...checkpoint(), predicted: { temperature: null, precipitation: '', pressure: false, windSpeed: null, windDir: null, weatherCode: null } };
    expect(compare(missing).code).toBe('insufficient');
  });

  it('keeps real zero condition categories and numeric measurements comparable', () => {
    const result = compare(checkpoint({ weatherCode: 0, precipitation: 0, windSpeed: 0 }), later({ weatherCode: 0, precipitation: 0, windSpeed: 0 }));
    expect(result.conditionMatch).toBe(true);
    expect(result.metrics.precipitation.error).toBe(0);
    expect(result.metrics.windSpeed.error).toBe(0);
  });

  it('compares precipitation only when the accumulation intervals match explicitly', () => {
    expect(compare(checkpoint(), later({ precipitationIntervalSeconds: 900 })).metrics.precipitation).toBeNull();
    const unknown = compare(checkpoint(), later({ precipitationIntervalSeconds: null }), loaded({ precipitationIntervalSeconds: 3600 }));
    expect(unknown.metrics.precipitation).toBeNull();
    expect(unknown.excludedMetrics.precipitation).toContain('accumulation interval');
    expect(compare({ ...checkpoint(), precipitationIntervalSeconds: null }).metrics.precipitation).toBeNull();
  });

  it('compares pressure only at the same known reference level', () => {
    expect(compare(checkpoint(), later({ pressureType: 'seaLevel' })).metrics.pressure).toBeNull();
    const unknown = compare(checkpoint(), later({ pressureType: null }));
    expect(unknown.metrics.pressure).toBeNull();
    expect(unknown.excludedMetrics.pressure).toContain('surface pressure and sea-level pressure');
    expect(compare({ ...checkpoint(), pressureType: null }).metrics.pressure).toBeNull();
  });

  it('uses the shortest wind direction difference and exposes the 180-degree ambiguity', () => {
    expect(compare(checkpoint({ windDir: 350 }), later({ windDir: 10 })).metrics.windDirection.error).toBe(-20);
    expect(compare(checkpoint({ windDir: 10 }), later({ windDir: 350 })).metrics.windDirection.error).toBe(20);
    const opposite = compare(checkpoint({ windDir: 180 }), later({ windDir: 0 })).metrics.windDirection;
    expect(opposite).toMatchObject({ error: null, magnitude: 180, absoluteError: 180, ambiguous: true });
  });

  it('does not silently substitute a nearer current-condition precipitation interval', () => {
    const result = compare(checkpoint(), later({ role: 'current', precipitationIntervalSeconds: 900 }));
    expect(result.ready).toBe(true);
    expect(result.metrics.temperature).not.toBeNull();
    expect(result.metrics.precipitation).toBeNull();
  });

  it('carries actual retrieval provenance and distinct precipitation intervals through normalized timeline snapshots', () => {
    const fields = { temperature_2m: 24, relative_humidity_2m: 60, precipitation: 1.2, weather_code: 95, cloud_cover: 90, surface_pressure: 1007, wind_speed_10m: 24, wind_direction_10m: 220 };
    const payload = {
      utc_offset_seconds: 0, timezone: 'UTC',
      current: { time: '2026-10-29T12:00', interval: 900, ...fields },
      hourly: { time: ['2026-10-29T11:00', '2026-10-29T14:00'], ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, [value, value]])) },
    };
    const live = kernel.normalizeLiveWeatherResponse(payload, 'School', 40, -75);
    expect(live).toMatchObject({ source: 'Open-Meteo', sourceKind: 'model', pressureType: 'surface', precipitationIntervalSeconds: 900, observedAt: '2026-10-29T12:00' });
    expect(live.retrievedAt).toBeUndefined();
    expect(live.issuedAt).toBeUndefined();
    live.retrievedAt = '2026-10-29T12:01:00Z';
    const timeline = kernel.normalizeHourlyWeatherTimeline(payload, live);
    expect(timeline.map(point => point.role)).toEqual(['earlier', 'current', 'forecast']);
    for (const point of timeline) expect(point).toMatchObject({ source: 'Open-Meteo', sourceKind: 'model', retrievedAt: live.retrievedAt, utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: point.role === 'current' ? 900 : 3600 });
    const active = kernel.activeLiveWeather({ liveWeather: live, liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 2 });
    const saved = kernel.createLiveForecastCheckpoint(active, '2026-10-29T12:02:00Z');
    expect(saved).toMatchObject({ retrievedAt: '2026-10-29T12:01:00.000Z', currentDataAt: '2026-10-29T12:00', validAt: '2026-10-29T14:00', pressureType: 'surface', precipitationIntervalSeconds: 3600 });
  });

  it('preserves an unknown current precipitation interval without borrowing the hourly interval', () => {
    const fields = { temperature_2m: 24, relative_humidity_2m: 60, precipitation: 1.2, weather_code: 95, cloud_cover: 90, surface_pressure: 1007, wind_speed_10m: 24, wind_direction_10m: 220 };
    const payload = { utc_offset_seconds: 0, current: { time: '2026-10-29T12:00', ...fields }, hourly: { time: ['2026-10-29T14:00'], ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, [value]])) } };
    const live = kernel.normalizeLiveWeatherResponse(payload, 'School', 40, -75);
    live.retrievedAt = '2026-10-29T12:01:00Z';
    const timeline = kernel.normalizeHourlyWeatherTimeline(payload, live);
    expect(live.precipitationIntervalSeconds).toBeNull();
    expect(timeline.find(point => point.role === 'current').precipitationIntervalSeconds).toBeNull();
    expect(timeline.find(point => point.role === 'forecast').precipitationIntervalSeconds).toBe(3600);
  });
});
