import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
const BASE = Date.parse('2026-10-29T12:00:00Z');
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function live(patch = {}) {
  return {
    label: 'School', latitude: 40, longitude: -75,
    source: 'Open-Meteo', sourceKind: 'model', timezone: 'UTC', utcOffsetSeconds: 0,
    observedAt: new Date(BASE).toISOString(), retrievedAt: '2026-10-29T12:01:00Z',
    temperature: 20, windSpeed: 10, pressure: 1000, precipitation: 0.1,
    pressureType: 'surface', precipitationIntervalSeconds: 900,
    ...patch,
  };
}

function point(hours, patch = {}) {
  return {
    time: new Date(BASE + hours * 3600000).toISOString(),
    role: hours < 0 ? 'earlier' : hours > 0 ? 'forecast' : 'current',
    temperature: 20 + hours, windSpeed: 10 + hours, pressure: 1000 + hours,
    precipitation: hours > 0 ? 0.5 : 0, pressureType: 'surface', precipitationIntervalSeconds: 3600,
    ...patch,
  };
}

function explore(points = [], options = {}, weather = live()) {
  return kernel.buildLiveTimelineExploration(points, weather, options);
}

describe('Loaded live weather timeline exploration', () => {
  it('sorts absolute instants, keeps raw indexes, and does not mutate the response', () => {
    const points = [point(2), point(-1), point(1)];
    const weather = live();
    const original = structuredClone({ points, weather });
    const result = explore(points, { hours: 'all' }, weather);
    expect(result.points.map((p) => p.offsetHours)).toEqual([-1, 0, 1, 2]);
    expect(result.points.map((p) => p.index)).toEqual([1, -1, 2, 0]);
    expect(result.stats).toMatchObject({ count: 4, min: 19, max: 22, first: 19, last: 22, change: 3 });
    expect(result.sourceKind).toBe('model');
    expect({ points, weather }).toEqual(original);
  });

  it('includes the precise horizon boundary but excludes earlier and later values', () => {
    const result = explore([point(-1), point(6), point(6.001), point(12)], { hours: 6 });
    expect(result.points.map((p) => p.offsetHours)).toEqual([0, 6]);
    expect(result.window).toMatchObject({ startTimestamp: BASE, endTimestamp: BASE + 6 * 3600000 });
    expect(result.stats.max).toBe(26);
  });

  it('defines all-loaded bounds from the actual records instead of assuming a 24-hour horizon', () => {
    const result = explore([point(-3), point(2)], { hours: 'all' });
    expect(result.window).toMatchObject({ startTimestamp: BASE - 3 * 3600000, endTimestamp: BASE + 2 * 3600000 });
    expect(result.coverage).toEqual({ pointCount: 3, validCount: 3, missingCount: 0, gapCount: 2 });
  });

  it('uses offsets and quarter-hour timestamps independently of browser timezone', () => {
    const result = explore([
      point(1, { time: '2026-10-29T09:00', utcOffsetSeconds: -14400 }),
      point(2, { time: '2026-10-29T16:00+02:00' }),
    ], {}, live({ observedAt: '2026-10-29T08:15', utcOffsetSeconds: -14400 }));
    expect(result.currentTimestamp).toBe(BASE + 900000);
    expect(result.points.map((p) => p.offsetHours)).toEqual([0, 0.75, 1.75]);
    expect(result.segments).toHaveLength(1);
    expect(result.points[2].timestamp - result.points[1].timestamp).toBe(3600000);
  });

  it('rejects malformed dates and explicitly unknown per-point offsets', () => {
    const result = explore([
      point(1, { time: '2026-02-30T13:00Z' }),
      point(2, { time: '2026-10-29T14:00', utcOffsetSeconds: null }),
      point(3, { time: 'yesterday' }), null,
      point(4),
    ]);
    expect(result.diagnostics.invalidTimes).toBe(4);
    expect(result.points.map((p) => p.offsetHours)).toEqual([0, 4]);
    expect(result.coverage.gapCount).toBe(1);
  });

  it('requires valid loaded source, location and time provenance', () => {
    for (const patch of [{ source: 'Other provider' }, { sourceKind: 'station' }]) {
      expect(explore([point(1)], {}, live(patch))).toMatchObject({ available: false, code: 'source', points: [] });
    }
    for (const patch of [{ latitude: null }, { observedAt: '2026-10-29T12:00', utcOffsetSeconds: undefined }, { retrievedAt: '' }]) {
      expect(explore([point(1)], {}, live(patch))).toMatchObject({ available: false, code: 'provenance', points: [] });
    }
  });

  it('keeps valid zero readings while excluding missing and impossible values', () => {
    const result = explore([point(1, { temperature: 0 }), point(2, { temperature: null }), point(3, { temperature: '' }), point(4, { temperature: false }), point(5, { temperature: -101 }), point(6, { temperature: Infinity })]);
    expect(result.points.map((p) => p.value)).toEqual([20, 0, null, null, null, null, null]);
    expect(result.stats).toMatchObject({ count: 2, min: 0, max: 20, first: 20, last: 0, change: -20 });
    expect(result.coverage.missingCount).toBe(5);
  });

  it('excludes explicitly mismatched retrievals, sources and coordinates without hiding their gaps', () => {
    const result = explore([
      point(1, { source: 'another provider' }),
      point(2, { sourceKind: 'observation' }),
      point(3, { retrievedAt: '2026-10-29T11:59Z' }),
      point(4, { retrievedAt: null }),
      point(5, { latitude: 40.001, longitude: -75 }),
      point(6),
    ]);
    expect(result.points.map((p) => p.value)).toEqual([20, null, null, null, null, null, 26]);
    expect(result.points[1].reason).toContain('source');
    expect(result.points[3].reason).toContain('retrieval');
    expect(result.points[5].reason).toContain('location');
    expect(result.segments.map((s) => s.map((p) => p.offsetHours))).toEqual([[0], [6]]);
  });

  it('inherits absent source fields from the response and accepts equivalent explicit provenance', () => {
    const result = explore([point(1), point(2, { source: 'Open-Meteo', sourceKind: 'model', retrievedAt: '2026-10-29T08:01:00-04:00', latitude: 40, longitude: -75 })]);
    expect(result.points.map((p) => p.value)).toEqual([20, 21, 22]);
    expect(result.coverage.missingCount).toBe(0);
  });

  it('excludes contradictory temporal roles while retaining the valid absolute instant', () => {
    const result = explore([point(-1, { role: 'forecast' }), point(1, { role: 'current' }), point(2)], { hours: 'all' });
    expect(result.points.map((p) => p.role)).toEqual(['earlier', 'current', 'forecast', 'forecast']);
    expect(result.points[0]).toMatchObject({ value: null, timestamp: BASE - 3600000 });
    expect(result.points[2].reason).toMatch(/label disagree/);
    expect(result.points[3].value).toBe(22);
  });

  it('breaks chart segments across missing values even when spacing is exactly one hour', () => {
    const result = explore([point(1), point(2, { temperature: null }), point(3), point(4)]);
    expect(result.segments.map((s) => s.map((p) => p.offsetHours))).toEqual([[0, 1], [3, 4]]);
    expect(result.coverage.gapCount).toBe(0);
    expect(result.coverage.missingCount).toBe(1);
  });

  it('breaks chart segments for missing hours rather than stretching them across the gap', () => {
    const result = explore([point(1), point(3), point(4)]);
    expect(result.segments.map((s) => s.map((p) => p.offsetHours))).toEqual([[0, 1], [3, 4]]);
    expect(result.coverage.gapCount).toBe(1);
  });

  it('deduplicates instants and prefers the actual current estimate over hourly current data', () => {
    const result = explore([point(1, { temperature: 21 }), point(0, { temperature: -50 }), point(1, { time: '2026-10-29T09:00-04:00', temperature: 60 })]);
    expect(result.points.map((p) => p.value)).toEqual([20, 21]);
    expect(result.points[0].index).toBe(1);
    expect(result.diagnostics.duplicates).toBe(2);
  });

  it('does not relabel shorter current precipitation as an hourly amount', () => {
    const result = explore([point(0, { precipitation: 8 }), point(1, { precipitation: 0 }), point(2, { precipitation: 1.4 })], { metric: 'precipitation' });
    expect(result.metric).toMatchObject({ label: 'Hourly precipitation', unit: 'mm' });
    expect(result.points[0]).toMatchObject({ value: null, precipitationIntervalSeconds: 900 });
    expect(result.points[0].reason).toContain('1-hour');
    expect(result.points.slice(1).map((p) => p.value)).toEqual([0, 1.4]);
    expect(result.stats).toMatchObject({ min: 0, max: 1.4, count: 2 });
    expect(result.stats.total).toBeUndefined();
  });

  it('excludes precipitation with unknown or incompatible intervals instead of inferring hourly totals', () => {
    const result = explore([point(1, { precipitationIntervalSeconds: null }), point(2, { precipitationIntervalSeconds: 900 }), point(3, { precipitationIntervalSeconds: undefined }), point(4)], { metric: 'precipitation' });
    expect(result.points.map((p) => p.value)).toEqual([null, null, null, null, 0.5]);
    expect(result.coverage.validCount).toBe(1);
  });

  it('plots only surface pressure and never substitutes sea-level pressure', () => {
    const result = explore([point(1, { pressureType: 'seaLevel' }), point(2, { pressureType: null }), point(3, { pressure: 1004 })], { metric: 'pressure' });
    expect(result.points.map((p) => p.value)).toEqual([1000, null, null, 1004]);
    expect(result.points[1].reason).toContain('surface-pressure');
    expect(result.metric.unit).toBe('hPa');
  });

  it('keeps zero wind calm and rejects negative speeds', () => {
    const result = explore([point(1, { windSpeed: 0 }), point(2, { windSpeed: -1 })], { metric: 'windSpeed' });
    expect(result.points.map((p) => p.value)).toEqual([10, 0, null]);
    expect(result.metric.unit).toBe('km/h');
  });

  it('keeps a selected missing-data row but resets an out-of-window selection to current', () => {
    const points = [point(1, { temperature: null }), point(8)];
    expect(explore(points, { hours: 6, selectedTimestamp: BASE + 3600000 }).selectedTimestamp).toBe(BASE + 3600000);
    expect(explore(points, { hours: 6, selectedTimestamp: BASE + 8 * 3600000 }).selectedTimestamp).toBe(BASE);
  });

  it('has honest empty and single-point summaries without a made-up change', () => {
    const single = explore([]);
    expect(single.stats).toEqual({ count: 1, min: 20, max: 20, first: 20, last: 20, change: null });
    const empty = explore([], { metric: 'precipitation' });
    expect(empty).toMatchObject({ available: false, code: 'empty', stats: { count: 0, min: null, max: null, change: null } });
    expect(empty.points).toHaveLength(1);
    expect(empty.segments).toEqual([]);
  });

  it('uses safe defaults and resets context after a new location or retrieval', () => {
    const normal = explore([point(1)]);
    expect(explore([], { metric: '__proto__', hours: -1 })).toMatchObject({ metric: { id: 'temperature' }, hours: 12 });
    expect(explore([], { hours: '24' }).hours).toBe(24);
    expect(explore([point(1)], {}, live({ latitude: 41 })).contextKey).not.toBe(normal.contextKey);
    expect(explore([point(1)], {}, live({ retrievedAt: '2026-10-29T12:02Z' })).contextKey).not.toBe(normal.contextKey);
    expect(explore([point(1)], { metric: 'windSpeed', hours: 6 }).contextKey).toBe(normal.contextKey);
  });
});
