import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function exploration(patch = {}) {
  const currentTimestamp = Date.parse('2026-10-29T16:00:00Z');
  return {
    available: true, source: 'Open-Meteo', sourceKind: 'model', location: 'Portland, Maine',
    retrievedAt: '2026-10-29T16:05:00Z', currentDataAt: '2026-10-29T12:00', currentTimestamp,
    timezone: 'America/New_York', utcOffsetSeconds: -14400, hours: 6,
    window: { label: 'Next 6 hours from current model time', startTimestamp: currentTimestamp, endTimestamp: currentTimestamp + 21600000 },
    metric: { id: 'temperature', label: 'Temperature', unit: '°C', decimals: 1 },
    points: [
      { index: 0, time: '2026-10-29T12:00', timestamp: currentTimestamp, offsetHours: 0, role: 'current', value: 0, reason: '', pressureType: 'surface', precipitationIntervalSeconds: 900 },
      { index: 1, time: '2026-10-29T13:00', timestamp: currentTimestamp + 3600000, offsetHours: 1, role: 'forecast', value: 4.5, reason: '', pressureType: 'surface', precipitationIntervalSeconds: 3600 },
      { index: 2, time: '2026-10-29T14:00', timestamp: currentTimestamp + 7200000, offsetHours: 2, role: 'forecast', value: null, reason: 'Temperature missing', pressureType: 'surface', precipitationIntervalSeconds: 3600 },
    ],
    ...patch,
  };
}

function csvRows(text) {
  const rows = [];
  let quoted = false, value = '', row = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i += 1; } else quoted = !quoted;
    } else if (!quoted && ch === ',') { row.push(value); value = ''; }
    else if (!quoted && (ch === '\r' || ch === '\n')) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value); rows.push(row); row = []; value = '';
    } else value += ch;
  }
  if (value || row.length) rows.push(row.concat(value));
  return rows;
}

function records(data = exploration()) {
  const [headings, ...rows] = csvRows(kernel.liveTimelineExplorerCsv(data));
  expect(rows.every((row) => row.length === headings.length)).toBe(true);
  return rows.map((row) => Object.fromEntries(headings.map((key, index) => [key, row[index]])));
}

describe('Live timeline explorer CSV', () => {
  it('keeps retrieval, current valid time and each row valid instant separate', () => {
    const rows = records();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      Provider: 'Open-Meteo', 'Source data kind': 'model', Location: 'Portland, Maine',
      'Retrieved at': '2026-10-29T16:05:00Z', 'Current model valid time': '2026-10-29T12:00',
      'Current model valid UTC': '2026-10-29T16:00:00.000Z', Timezone: 'America/New_York',
      'UTC offset (seconds)': '-14400',
    });
    expect(rows[1]['Model valid time']).toBe('2026-10-29T13:00');
    expect(rows[1]['Model valid UTC']).toBe('2026-10-29T17:00:00.000Z');
    expect(rows[1]['Hours from current model time']).toBe('1');
    expect(rows[1]['Time role']).toBe('forecast');
    expect(Object.keys(rows[0]).join('|')).not.toMatch(/issued|accuracy|probability/i);
  });

  it('labels model data and requested time window without claiming measured observations', () => {
    const row = records()[0];
    expect(row['Data description']).toContain('Loaded weather model values');
    expect(row['Data description']).toContain('not independent station observations');
    expect(row.Window).toBe('Next 6 hours from current model time');
    expect(row['Window start UTC']).toBe('2026-10-29T16:00:00.000Z');
    expect(row['Window end UTC']).toBe('2026-10-29T22:00:00.000Z');
    expect(row.Metric).toBe('Temperature');
    expect(row.Unit).toBe('°C');
  });

  it('preserves real zero and negative numeric values while leaving missing values blank', () => {
    const data = exploration();
    data.points[1].value = -4.5;
    const rows = records(data);
    expect(rows[0].Value).toBe('0');
    expect(rows[0]['Chart inclusion']).toBe('included');
    expect(rows[1].Value).toBe('-4.5');
    expect(rows[2].Value).toBe('');
    expect(rows[2]['Chart inclusion']).toBe('excluded');
    expect(rows[2]['Exclusion reason']).toBe('Temperature missing');
  });

  it('does not turn invalid, boolean or numeric-string measurements into chart values', () => {
    for (const value of [undefined, null, '', false, true, NaN, Infinity, '0', '12']) {
      const data = exploration();
      data.points = [{ ...data.points[0], value }];
      const row = records(data)[0];
      expect(row.Value).toBe('');
      expect(row['Chart inclusion']).toBe('excluded');
      expect(row['Exclusion reason']).toBe('Value unavailable');
    }
  });

  it('exports interval and pressure exclusions without retaining incompatible values', () => {
    const data = exploration({ metric: { id: 'precipitation', label: 'Hourly precipitation', unit: 'mm' } });
    data.points[0].reason = 'Only one-hour precipitation intervals are included';
    data.points[0].value = 0.8;
    data.points[1].value = 0;
    const rows = records(data);
    expect(rows[0].Value).toBe('');
    expect(rows[0]['Precipitation interval (seconds)']).toBe('900');
    expect(rows[0]['Exclusion reason']).toContain('one-hour');
    expect(rows[1].Value).toBe('0');
    expect(rows[1]['Precipitation interval (seconds)']).toBe('3600');
    expect(rows[1]['Pressure basis']).toBe('surface');
  });

  it('escapes formula-leading strings and CSV quotes, commas and line breaks', () => {
    const data = exploration({ location: '=HYPERLINK("https://example.invalid", "School")', timezone: ' UTC\nZone, "A"', source: '\t@command' });
    data.points[0].time = '+bad';
    data.points[1].reason = '-invalid';
    data.points[2].reason = 'Missing, "value"\nretained';
    const rows = records(data);
    expect(rows[0].Location).toBe("'" + data.location);
    expect(rows[0].Provider).toBe("'" + data.source);
    expect(rows[0].Timezone).toBe(data.timezone);
    expect(rows[0]['Model valid time']).toBe("'+bad");
    expect(rows[1]['Exclusion reason']).toBe("'-invalid");
    expect(rows[2]['Exclusion reason']).toBe(data.points[2].reason);
  });

  it('returns a stable header-only CSV for empty exploration and malformed row timestamps', () => {
    for (const data of [null, {}, { points: [] }, { points: [null, {}, { timestamp: null }, { timestamp: false }, { timestamp: '2026-10-29' }, { timestamp: NaN }, { timestamp: Infinity }] }]) {
      const rows = csvRows(kernel.liveTimelineExplorerCsv(data));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain('Model valid UTC');
      expect(rows[0]).toContain('Exclusion reason');
    }
  });

  it('does not mutate points, metadata or window selections during export', () => {
    const data = exploration();
    const original = JSON.stringify(data);
    kernel.liveTimelineExplorerCsv(data);
    expect(JSON.stringify(data)).toBe(original);
  });

  it('exports exactly the normalized selected window from the explorer kernel', () => {
    const live = { label: 'School', source: 'Open-Meteo', sourceKind: 'model', latitude: 40, longitude: -75, observedAt: '2026-10-29T12:00Z', retrievedAt: '2026-10-29T12:05Z', timezone: 'UTC', utcOffsetSeconds: 0, temperature: 5, pressureType: 'surface', precipitationIntervalSeconds: 900 };
    const timeline = [
      { time: '2026-10-29T11:00Z', role: 'earlier', temperature: 3 },
      { time: '2026-10-29T12:00Z', role: 'current', temperature: 5 },
      { time: '2026-10-29T13:00Z', role: 'forecast', temperature: 0 },
      { time: '2026-10-29T15:00Z', role: 'forecast', temperature: null },
      { time: '2026-10-29T19:00Z', role: 'forecast', temperature: 8 },
    ];
    const built = kernel.buildLiveTimelineExploration(timeline, live, { metric: 'temperature', hours: 6 });
    const rows = records(built);
    expect(rows).toHaveLength(built.points.length);
    expect(rows.map((row) => row['Model valid UTC'])).toEqual(built.points.map((point) => new Date(point.timestamp).toISOString()));
    expect(rows.map((row) => row['Model valid UTC'])).not.toContain('2026-10-29T11:00:00.000Z');
    expect(rows.map((row) => row['Model valid UTC'])).not.toContain('2026-10-29T19:00:00.000Z');
    expect(rows.find((row) => row['Model valid UTC'] === '2026-10-29T13:00:00.000Z').Value).toBe('0');
    expect(rows.find((row) => row['Model valid UTC'] === '2026-10-29T15:00:00.000Z').Value).toBe('');
  });
});
