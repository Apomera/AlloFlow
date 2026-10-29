import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function snapshot(patch = {}) {
  return {
    schema: 'weather-live-checkpoint-v2', id: 'snapshot-1', location: 'Portland, Maine',
    latitude: 43.6591, longitude: -70.2568, source: 'Open-Meteo', sourceKind: 'model',
    retrievedAt: '2026-10-29T16:00:00.000Z', capturedAt: '2026-10-29T16:02:00.000Z',
    currentDataAt: '2026-10-29T12:00', validAt: '2026-10-29T14:00', validTimestamp: Date.parse('2026-10-29T18:00:00Z'),
    timezone: 'America/New_York', utcOffsetSeconds: -14400, pressureType: 'surface', precipitationIntervalSeconds: 3600,
    predicted: { temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 350, weatherCode: 95, cloudCover: 90, condition: 'Thunderstorms' },
    ...patch,
  };
}

function loaded(patch = {}) {
  return {
    latitude: 43.6591, longitude: -70.2568, source: 'Open-Meteo', sourceKind: 'model',
    retrievedAt: '2026-10-29T19:05:00.000Z', observedAt: '2026-10-29T15:00',
    utcOffsetSeconds: -14400, timezone: 'America/New_York', pressureType: 'surface', precipitationIntervalSeconds: 900,
    ...patch,
  };
}

function point(patch = {}) {
  return {
    time: '2026-10-29T14:00', role: 'earlier', utcOffsetSeconds: -14400,
    source: 'Open-Meteo', sourceKind: 'model', pressureType: 'surface', precipitationIntervalSeconds: 3600,
    temperature: 22, precipitation: 0.7, pressure: 1009, windSpeed: 18, windDir: 10, weatherCode: 61,
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

function csvObject(text) {
  const [head, first] = csvRows(text);
  return Object.fromEntries(head.map((key, index) => [key, first[index]]));
}

describe('Live forecast snapshot journal', () => {
  it('clones the original prediction and keeps the first valid copy of a repeated snapshot ID', () => {
    const original = snapshot();
    const changed = snapshot({ predicted: { temperature: 99 } });
    const saved = kernel.normalizeLiveForecastCheckpoints([original, changed]);
    original.predicted.temperature = -90;
    expect(saved).toHaveLength(1);
    expect(saved[0].predicted.temperature).toBe(24);
    expect(saved[0].capturedAt).toBe('2026-10-29T16:02:00.000Z');
    expect(saved[0].retrievedAt).toBe('2026-10-29T16:00:00.000Z');
  });

  it('keeps the last eight distinct forecasts while retaining different retrievals of the same valid hour', () => {
    const entries = Array.from({ length: 11 }, (_, index) => snapshot({ id: `retrieval-${index}`, retrievedAt: `2026-10-29T16:${String(index).padStart(2, '0')}:00Z` }));
    entries.push(snapshot({ id: 'retrieval-3', predicted: { temperature: 60 } }));
    const saved = kernel.normalizeLiveForecastCheckpoints(entries);
    expect(saved.map((row) => row.id)).toEqual(Array.from({ length: 8 }, (_, index) => `retrieval-${index + 3}`));
    expect(saved[0].predicted.temperature).toBe(24);
    expect(new Set(saved.map((row) => row.validAt)).size).toBe(1);
  });

  it('keeps legacy provenance absent rather than inventing a retrieval or provider issue time', () => {
    const legacy = { id: 'old', location: 'Saved location', latitude: 0, longitude: 0, validAt: '2026-07-25T14:00', issuedAt: '2026-07-25T12:00', predicted: { temperature: 0 } };
    expect(kernel.normalizeLiveForecastCheckpoints([legacy])).toEqual([legacy]);
    const restored = kernel.normalizeLiveForecastCheckpoints([legacy])[0];
    for (const key of ['schema', 'validTimestamp', 'utcOffsetSeconds', 'source', 'sourceKind', 'retrievedAt', 'currentDataAt', 'capturedAt']) expect(restored[key]).toBeUndefined();
  });

  it('rejects invalid coordinates, missing identities and unusable measurements without turning null into zero', () => {
    expect(kernel.normalizeLiveForecastCheckpoints([null, [], {}, snapshot({ schema: 'unknown' }), snapshot({ id: ' ' }), snapshot({ latitude: null }), snapshot({ longitude: false }), snapshot({ latitude: 91 }), snapshot({ longitude: 181 }), snapshot({ validAt: '' }), snapshot({ predicted: { temperature: null, windSpeed: true, weatherCode: ' ' } })])).toEqual([]);
    expect(kernel.normalizeLiveForecastCheckpoints('wrong')).toEqual([]);
    const zero = kernel.normalizeLiveForecastCheckpoints([snapshot({ latitude: 0, longitude: 0, predicted: { temperature: 0, precipitation: 0, windSpeed: 0, windDir: 0, weatherCode: 0, cloudCover: 0 } })])[0];
    expect(zero.predicted.temperature).toBe(0);
    expect(zero.predicted.precipitation).toBe(0);
    expect(zero.longitude).toBe(0);
  });

  it('allowlists nested values and omits malformed optional metadata instead of claiming compatibility', () => {
    const saved = kernel.normalizeLiveForecastCheckpoints([snapshot({
      predicted: { temperature: '24', windSpeed: Infinity, pressure: false, weatherCode: 1.5, condition: 'x'.repeat(200), injected: { unsafe: true } },
      validTimestamp: NaN, utcOffsetSeconds: 999999, precipitationIntervalSeconds: 0, pressureType: 'not-a-pressure-kind', sourceKind: 'model', arbitrary: { nested: true },
    })])[0];
    expect(saved.predicted).toEqual({ temperature: 24, condition: 'x'.repeat(150) });
    for (const key of ['validTimestamp', 'utcOffsetSeconds', 'precipitationIntervalSeconds', 'pressureType', 'arbitrary']) expect(saved[key]).toBeUndefined();
    const prototypeId = kernel.normalizeLiveForecastCheckpoints([snapshot({ id: '__proto__' }), snapshot({ id: '__proto__' })]);
    expect(prototypeId).toHaveLength(1);
  });

  it('persists complete snapshots through device save/import, excluding unrelated transient data', () => {
    const entry = snapshot();
    const payload = kernel.immersiveLocalWorkspacePayload({ liveForecastCheckpoints: [entry], liveForecastStatus: 'Transient', liveForecastUndo: [entry] });
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(payload)));
    expect(restored.liveForecastCheckpoints).toEqual([entry]);
    expect(restored.liveForecastStatus).toBeUndefined();
    expect(restored.liveForecastUndo).toBeUndefined();
  });

  it('removes the entire location-bearing checkpoint list from location-redacted shares', () => {
    const data = { liveForecastCheckpoints: [snapshot()] };
    const redacted = kernel.immersiveSessionSharePayload(data, { includeLocation: false });
    expect(redacted.weatherSystems.liveForecastCheckpoints).toBeUndefined();
    expect(JSON.stringify(redacted)).not.toContain('43.6591');
    expect(JSON.stringify(redacted)).not.toContain('Portland');
    expect(kernel.immersiveSessionSharePayload(data, { includeLocation: true }).weatherSystems.liveForecastCheckpoints).toEqual([snapshot()]);
  });

  it('reports separate retrieval, save, current-data and valid times without asserting a provider issue time', () => {
    const text = kernel.liveForecastReviewText([snapshot()], [point()], loaded());
    expect(text).toContain('Original retrieval: 2026-10-29T16:00:00.000Z');
    expect(text).toContain('Saved at: 2026-10-29T16:02:00.000Z');
    expect(text).toContain('Original current-data timestamp: 2026-10-29T12:00');
    expect(text).toContain('Forecast valid time: 2026-10-29T14:00');
    expect(text).toContain('Comparison retrieval: 2026-10-29T19:05:00.000Z');
    expect(text).toContain('Provider forecast issue time is not supplied');
    expect(text).toContain('does not compare forecasts with independent station observations');
    expect(text).toContain('Difference +2°C');
    expect(text).toContain('Difference -2 hPa');
    expect(text).toContain('Difference -20°');
  });

  it('leaves saved forecasts and loaded model data unchanged while producing both report formats', () => {
    const entries = [snapshot()], timeline = [point()], live = loaded();
    const before = JSON.stringify({ entries, timeline, live });
    kernel.liveForecastReviewText(entries, timeline, live);
    kernel.liveForecastReviewCsv(entries, timeline, live);
    expect(JSON.stringify({ entries, timeline, live })).toBe(before);
  });

  it('does not generate zero differences or condition matches from missing data', () => {
    const entry = snapshot({ predicted: { pressure: 1007, temperature: null, windDir: null, weatherCode: null } });
    const later = point({ temperature: null, windDir: null, weatherCode: null });
    const text = kernel.liveForecastReviewText([entry], [later], loaded());
    expect(text).toContain('Temperature: no comparable pair.');
    expect(text).toContain('Condition-code comparison: not available.');
    const csv = csvObject(kernel.liveForecastReviewCsv([entry], [later], loaded()));
    expect(csv['Saved Temperature (°C)']).toBe('');
    expect(csv['Newer model Temperature (°C)']).toBe('');
    expect(csv['Saved minus newer model Temperature (°C)']).toBe('');
    expect(csv['Same model condition code']).toBe('');
  });

  it('records exclusion reasons for precipitation intervals and incompatible pressure bases', () => {
    const later = point({ pressureType: 'seaLevel', precipitationIntervalSeconds: 900 });
    const text = kernel.liveForecastReviewText([snapshot()], [later], loaded());
    expect(text).toContain('Pressure: no comparable pair.');
    expect(text).toContain('Precipitation: no comparable pair.');
    expect(text).toMatch(/Not compared:.*pressure/i);
    expect(text).toMatch(/Not compared:.*precipitation/i);
    const csv = csvObject(kernel.liveForecastReviewCsv([snapshot()], [later], loaded()));
    expect(csv['Saved minus newer model Pressure (hPa)']).toBe('');
    expect(csv['Saved minus newer model Precipitation (mm)']).toBe('');
    expect(csv['Metrics excluded from comparison']).toMatch(/pressure|precipitation/);
  });

  it('exports opposite wind directions as ambiguous rather than inventing a turning sign', () => {
    const entry = snapshot({ predicted: { ...snapshot().predicted, windDir: 10 } });
    const later = point({ windDir: 190 });
    const text = kernel.liveForecastReviewText([entry], [later], loaded());
    expect(text).toContain('directions are 180° apart');
    expect(text).toContain('signed turning direction is indeterminate');
    const csv = csvObject(kernel.liveForecastReviewCsv([entry], [later], loaded()));
    expect(csv['Saved minus newer model Wind from direction (degrees)']).toBe('');
    expect(csv['Absolute difference Wind from direction (degrees)']).toBe('180');
    expect(csv['Direction ambiguity: Wind from direction (degrees)']).toBe('true');
  });

  it('keeps pending snapshots in reports without filling newer-model measurements', () => {
    const future = point({ role: 'forecast' });
    const csv = csvObject(kernel.liveForecastReviewCsv([snapshot()], [future], loaded()));
    expect(csv['Comparison status']).toBe('pending');
    expect(csv['Saved Temperature (°C)']).toBe('24');
    expect(csv['Newer model Temperature (°C)']).toBe('');
    expect(kernel.liveForecastReviewText([snapshot()], [future], loaded())).not.toContain('Later-model comparison:');
  });

  it('quotes spreadsheet text safely while preserving negative measurements as numbers', () => {
    const entry = snapshot({ location: '=SUM(1,2)\n"Quoted city"', predicted: { ...snapshot().predicted, temperature: -2 } });
    const csv = csvObject(kernel.liveForecastReviewCsv([entry], [point()], loaded()));
    expect(csv.Location).toBe('\'=SUM(1,2)\n"Quoted city"');
    expect(csv['Saved Temperature (°C)']).toBe('-2');
    expect(csv['Comparison type']).toContain('not independent observations');
    expect(csvRows(kernel.liveForecastReviewCsv([entry], [point()], loaded()))).toHaveLength(2);
  });

  it('exports legacy snapshot uncertainty and only headers for an empty journal', () => {
    const legacy = { id: 'legacy', latitude: 43.6591, longitude: -70.2568, validAt: '2026-10-29T14:00', issuedAt: '2026-10-29T12:00', predicted: { temperature: 24 } };
    const report = kernel.liveForecastReviewText([legacy], [point()], loaded());
    expect(report).toContain('Legacy issuedAt field (unverified; not asserted as provider issue time)');
    const csv = csvObject(kernel.liveForecastReviewCsv([legacy], [point()], loaded()));
    expect(csv['Comparison status']).toBe('legacy');
    expect(csv['Original retrieval']).toBe('');
    expect(csv['Newer model Temperature (°C)']).toBe('');
    expect(csvRows(kernel.liveForecastReviewCsv([], [], null))).toHaveLength(1);
    expect(kernel.liveForecastReviewText([], [], null)).toContain('No live forecast snapshots saved.');
  });
});
