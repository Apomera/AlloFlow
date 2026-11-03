import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
});

function payload(overrides = {}) {
  return {
    timezone: 'America/New_York', utc_offset_seconds: -14400,
    current: {
      time: '2026-10-29T12:00', temperature_2m: 0, relative_humidity_2m: 72,
      precipitation: 0, cloud_cover: 0, surface_pressure: 1012,
      wind_speed_10m: 0, wind_direction_10m: 0, weather_code: 0,
      ...overrides
    }
  };
}

function live(overrides = {}) {
  return window.WeatherSystemsKernel.normalizeLiveWeatherResponse(payload(overrides), 'School', 40, -75);
}

function hourly(times, overrides = {}) {
  const current = payload().current;
  const record = Object.fromEntries(Object.keys(current).filter((key) => key !== 'time').map((key) => [key, times.map(() => current[key])]));
  return { hourly: { ...record, time: times, ...overrides } };
}

describe('Live weather values and condition labels', () => {
  it.each([
    [1, 'Mainly clear'], [3, 'Overcast'], [48, 'Rime fog'],
    [56, 'Freezing drizzle'], [67, 'Freezing rain'], [77, 'Snow grains'],
    [95, 'Thunderstorms'], [97, 'Thunderstorms'], [99, 'Thunderstorms with hail']
  ])('preserves the weather meaning of WMO code %s', (code, expected) => {
    expect(window.WeatherSystemsKernel.weatherCodeLabel(code)).toBe(expected);
  });

  it.each([null, undefined, '', ' ', false, -1, 4, 52, 98, 100, Infinity, NaN])('does not invent clear skies or storms from invalid code %s', (code) => {
    expect(window.WeatherSystemsKernel.weatherCodeLabel(code)).toBe('Variable conditions');
    const normalized = live({ weather_code: code });
    expect(normalized.weatherCode).toBeNull();
    expect(normalized.condition).toBe('Variable conditions');
  });

  it.each(['temperature_2m', 'relative_humidity_2m', 'surface_pressure', 'precipitation', 'cloud_cover', 'wind_speed_10m', 'wind_direction_10m'])('rejects missing %s rather than fabricating a zero', (field) => {
    for (const value of [null, undefined, '', false, Infinity, 'unavailable']) {
      expect(() => live({ [field]: value })).toThrow(/incomplete or invalid current measurements/);
    }
  });

  it('retains genuine zero readings and treats missing optional values as unknown', () => {
    const normalized = live();
    expect(normalized).toMatchObject({ temperature: 0, precipitation: 0, cloudCover: 0, windSpeed: 0, windDir: 0, weatherCode: 0, visibility: null });
    const withoutOffset = payload();
    delete withoutOffset.utc_offset_seconds;
    expect(window.WeatherSystemsKernel.normalizeLiveWeatherResponse(withoutOffset, '', 0, 0).utcOffsetSeconds).toBeNull();
    expect(live({ visibility: -10 }).visibility).toBeNull();
  });

  it('rejects invalid coordinates, timestamps and physical measurements', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(() => kernel.normalizeLiveWeatherResponse(payload(), '', null, -75)).toThrow(/coordinates/);
    expect(() => kernel.normalizeLiveWeatherResponse(payload(), '', 95, -75)).toThrow(/coordinates/);
    expect(() => live({ time: '' })).toThrow(/timestamp/);
    expect(() => live({ time: 'not a date' })).toThrow(/timestamp/);
    expect(() => live({ relative_humidity_2m: 101 })).toThrow(/measurements/);
    expect(() => live({ surface_pressure: 0 })).toThrow(/measurements/);
    expect(() => live({ wind_speed_10m: -1 })).toThrow(/measurements/);
  });
});

describe('Live timeline data integrity', () => {
  it('uses timestamp distance across gaps instead of array position', () => {
    const timeline = window.WeatherSystemsKernel.normalizeHourlyWeatherTimeline(hourly([
      '2026-10-29T15:00', '2026-10-29T09:00', 'invalid', '2026-10-29T15:00'
    ]), live());
    expect(timeline.map((point) => point.offsetHours)).toEqual([-3, 0, 3]);
    expect(timeline.map((point) => point.role)).toEqual(['earlier', 'current', 'forecast']);
    expect(window.WeatherSystemsKernel.weatherTimelineCurrentIndex(timeline)).toBe(1);
  });

  it('keeps the actual current readings even when hourly data disagree', () => {
    const timeline = window.WeatherSystemsKernel.normalizeHourlyWeatherTimeline(hourly([
      '2026-10-29T12:00', '2026-10-29T13:00'
    ], { temperature_2m: [8, 10] }), live());
    expect(timeline[0]).toMatchObject({ role: 'current', temperature: 0 });
    expect(timeline[1]).toMatchObject({ role: 'forecast', temperature: 10 });
  });

  it('never copies current readings into incomplete forecast hours', () => {
    const timeline = window.WeatherSystemsKernel.normalizeHourlyWeatherTimeline(hourly([
      '2026-10-29T13:00', '2026-10-29T14:00', '2026-10-29T15:00'
    ], { temperature_2m: [null, 5, 8], surface_pressure: [1012, null, 1010] }), live());
    expect(timeline.map((point) => point.offsetHours)).toEqual([0, 3]);
    expect(timeline[1]).toMatchObject({ temperature: 8, pressure: 1010, visibility: null });
    const empty = window.WeatherSystemsKernel.normalizeHourlyWeatherTimeline({ hourly: { time: ['2026-10-29T15:00'] } }, live());
    expect(empty).toHaveLength(1);
    expect(empty[0].role).toBe('current');
  });

  it('preserves each usable field in the evidence series while the scene retains complete hours', () => {
    const kernel = window.WeatherSystemsKernel;
    const current = { ...live(), retrievedAt: '2026-10-29T16:01:00Z' };
    const payload = hourly(['2026-10-29T13:00', '2026-10-29T14:00', '2026-10-29T15:00'], {
      temperature_2m: [null, 5, 8], surface_pressure: [1012, null, 1010], precipitation: [0, 0, 0.1],
    });
    const loaded = kernel.normalizeHourlyWeatherTimeline(payload, current, { includePartial: true });
    const state = { liveWeather: { ...current, partialHours: loaded.filter(hour => hour.partial) }, liveWeatherTimeline: loaded.filter(hour => !hour.partial) };
    const evidence = kernel.liveForecastEvidenceTimeline(state);
    expect(state.liveWeatherTimeline.map(hour => hour.offsetHours)).toEqual([0, 3]);
    expect(evidence.map(hour => hour.offsetHours)).toEqual([0, 1, 2, 3]);
    const atTwo = evidence.find(hour => hour.offsetHours === 2);
    expect(atTwo).toMatchObject({ temperature: 5, pressure: null, precipitation: 0, partial: true });
    const temperature = kernel.buildLiveTimelineExploration(evidence, state.liveWeather, { metric: 'temperature' });
    const pressure = kernel.buildLiveTimelineExploration(evidence, state.liveWeather, { metric: 'pressure' });
    expect(temperature.points.map(point => point.value)).toEqual([0, null, 5, 8]);
    expect(pressure.points.map(point => point.value)).toEqual([1012, 1012, null, 1010]);
    expect(kernel.liveTimelineExplorerCsv(pressure).split('\r\n').find(line => line.includes('2026-10-29T14:00'))).toContain('"","excluded"');
    const saved = kernel.createLiveForecastCheckpoint(kernel.liveForecastPointWeather(current, atTwo), '2026-10-29T16:05Z');
    expect(saved.predicted).toMatchObject({ temperature: 5, precipitation: 0 });
    expect(saved.predicted.pressure).toBeUndefined();
    const legacy = { time: atTwo.time, role: 'forecast', temperature: 5 };
    expect(kernel.createLiveForecastCheckpoint(kernel.liveForecastPointWeather(current, legacy), '2026-10-29T16:05Z').predicted).toEqual({ temperature: 5 });
    expect(kernel.liveForecastPointWeather(current, { ...legacy, retrievedAt: '2026-10-29T17:30Z' })).toBeNull();
    expect(kernel.liveForecastPointWeather(current, { ...legacy, latitude: 43, longitude: -75 })).toBeNull();
  });

  it('prefers a complete record over a duplicate partial row and validates restored partial records', () => {
    const kernel = window.WeatherSystemsKernel;
    const current = { ...live(), retrievedAt: '2026-10-29T16:01Z' };
    const loaded = kernel.normalizeHourlyWeatherTimeline(hourly(
      ['2026-10-29T13:00', '2026-10-29T13:00', '2026-10-29T14:00', '2026-10-29T14:00'],
      { temperature_2m: [5, 8, 6, 7], surface_pressure: [null, 1004, -100, null] },
    ), current, { includePartial: true });
    expect(loaded).toHaveLength(3);
    expect(loaded[1]).toMatchObject({ temperature: 8, pressure: 1004 });
    expect(loaded[1].partial).toBeUndefined();
    const partial = loaded[2];
    const state = { liveWeather: { ...current, partialHours: [null, { ...partial, note: 'private-extra', visibility: 6750 }, { ...partial }, { ...partial, time: '2026-10-29T15:00', source: 'Unknown provider' }, { ...partial, time: '2026-10-29T16:00', latitude: 2, longitude: 9 }] }, liveWeatherTimeline: loaded.slice(0, 2) };
    state.liveWeather.partialHours.push({ ...partial, time: '2026-10-29T17:00', latitude: undefined, longitude: undefined });
    const payload = kernel.immersiveLocalWorkspacePayload(state);
    expect(payload.weatherSystems.liveWeather.partialHours).toHaveLength(1);
    expect(payload.weatherSystems.liveWeather.partialHours[0].note).toBeUndefined();
    const restored = kernel.validateImmersiveLocalWorkspacePayload(payload);
    expect(restored.liveWeather.partialHours).toHaveLength(1);
    expect(restored.liveWeather.partialHours[0]).toMatchObject({ temperature: 6, pressure: null, visibility: 6750, latitude: 40, longitude: -75 });
    expect(restored.liveWeather.partialHours[0].note).toBeUndefined();
    expect(kernel.liveForecastEvidenceTimeline(restored).map(point => point.offsetHours)).toEqual([0, 1, 2]);
    expect(kernel.immersiveSessionSharePayload(state, { includeLocation: false }).weatherSystems.liveWeather).toBeUndefined();
  });

  it('keeps a current anchor when the series lies entirely before or after it', () => {
    const kernel = window.WeatherSystemsKernel;
    const before = kernel.normalizeHourlyWeatherTimeline(hourly(['2026-10-29T09:00']), live());
    const after = kernel.normalizeHourlyWeatherTimeline(hourly(['2026-10-29T15:00']), live());
    expect(before.map((point) => point.role)).toEqual(['earlier', 'current']);
    expect(after.map((point) => point.role)).toEqual(['current', 'forecast']);
    expect(kernel.weatherTimelineCurrentIndex(before)).toBe(1);
    expect(kernel.weatherTimelineCurrentIndex(after)).toBe(0);
  });

  it('handles quarter-hour current data and explicit offsets independently of browser timezone', () => {
    const kernel = window.WeatherSystemsKernel;
    const current = live({ time: '2026-10-29T12:15' });
    const timeline = kernel.normalizeHourlyWeatherTimeline(hourly([
      '2026-10-29T16:00Z', '2026-10-29T17:00Z'
    ]), current);
    expect(timeline.map((point) => point.offsetHours)).toEqual([-0.25, 0, 0.75]);
    expect(kernel.weatherTimelineLabel(timeline[2], 'EDT')).toMatch(/^\+0.75 h forecast/);
  });
});
