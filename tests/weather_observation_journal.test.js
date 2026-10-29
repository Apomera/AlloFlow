import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
});

function row(overrides = {}) {
  return {
    schema: 'weather-observation-v1', id: 'central-6', stationId: 'central', station: 'Central School',
    scenarioName: 'Approaching Cold Front', contextKey: 'saved-starting-setup', hour: 6,
    temperature: 17.8, dewPoint: 10.4, humidity: 61, pressure: 1013.3,
    windSpeed: 39, windDir: 300, wind: 'NW 39 km/h', cloudCover: 48, precipPotential: 56, precipType: 'rain',
    modelState: { scenario: 'coldFront', simHour: 6, temp: 25, humidity: 72, pressure: 1008, windSpeed: 24, windDir: 220, frontSpeed: 36, instability: 68, terrain: 25 },
    note: 'Compare both stations at the same hour.',
    ...overrides,
  };
}

// Read RFC4180-style records, including escaped quotes and newlines inside cells.
function parseCsv(input) {
  const rows = [];
  let quoted = false, cell = '', row = [];
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted;
    } else if (!quoted && ch === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (ch === '\r' || ch === '\n')) {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (row.length || cell) { row.push(cell); rows.push(row); }
  return rows;
}

describe('Weather observation journal', () => {
  it('clones saved measurements and model setup without resampling the active model', () => {
    const original = row();
    const saved = window.WeatherSystemsKernel.normalizeWeatherObservationLog([original])[0];
    original.modelState.temp = -15;
    original.temperature = 99;
    original.note = 'Edited later';
    expect(saved.modelState.temp).toBe(25);
    expect(saved.modelState.simHour).toBe(6);
    expect(saved.temperature).toBe(17.8);
    expect(saved.note).toBe('Compare both stations at the same hour.');
  });

  it('retains the last24 unique snapshots, replacing a repeated observation in place in recency order', () => {
    const log = Array.from({ length: 27 }, (_, i) => row({ id: `row-${i}` }));
    log.push(row({ id: 'row-5', note: 'Newest copy' }));
    const normalized = window.WeatherSystemsKernel.normalizeWeatherObservationLog(log);
    expect(normalized).toHaveLength(24);
    expect(normalized[0].id).toBe('row-3');
    expect(normalized.at(-1).id).toBe('row-5');
    expect(normalized.at(-1).note).toBe('Newest copy');
    expect(new Set(normalized.map((item) => item.id)).size).toBe(24);
  });

  it('keeps legacy evidence without inferring its station ID, model setup, or numeric wind', () => {
    const legacy = { id: 'old', station: 'Central School', hour: 3, temperature: 20, dewPoint: 17, pressure: 1004, wind: 'S 30 km/h', cloudCover: 90 };
    const normalized = window.WeatherSystemsKernel.normalizeWeatherObservationLog([legacy])[0];
    expect(normalized).toEqual(legacy);
    expect(normalized.schema).toBeUndefined();
    expect(normalized.stationId).toBeUndefined();
    expect(normalized.contextKey).toBeUndefined();
    expect(normalized.windSpeed).toBeUndefined();
  });

  it('rejects missing identities and invalid hours while retaining zero-valued measurements', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.normalizeWeatherObservationLog([null, [], {}, row({ id: '' }), row({ station: ' ' }), row({ hour: null }), row({ hour: false }), row({ hour: ' ' }), row({ hour: Infinity }), row({ hour: 25 }), row({ schema: 'unknown' })])).toEqual([]);
    const zero = kernel.normalizeWeatherObservationLog([{ id: 'zero', station: 'Saved', hour: 0, temperature: 0, windSpeed: 0, cloudCover: 0 }])[0];
    expect(zero).toEqual({ id: 'zero', station: 'Saved', hour: 0, temperature: 0, windSpeed: 0, cloudCover: 0 });
    expect(kernel.normalizeWeatherObservationLog([{ id: 'missing', station: 'Saved', hour: 0, temperature: null, cloudCover: false }])).toEqual([]);
  });

  it('omits invalid optional measurements instead of silently changing them to zero', () => {
    const normalized = window.WeatherSystemsKernel.normalizeWeatherObservationLog([row({
      temperature: null, dewPoint: false, humidity: ' ', windSpeed: Infinity,
      windDir: 400, precipPotential: -1, pressure: '1008', cloudCover: '0',
    })])[0];
    expect(normalized.pressure).toBe(1008);
    expect(normalized.cloudCover).toBe(0);
    for (const key of ['temperature', 'dewPoint', 'humidity', 'windSpeed', 'windDir', 'precipPotential']) expect(normalized[key]).toBeUndefined();
  });

  it('bounds prose and IDs and allowlists nested inputs', () => {
    const saved = window.WeatherSystemsKernel.normalizeWeatherObservationLog([row({
      id: 'x'.repeat(800), station: 'n'.repeat(200), note: '\u0000' + 'z'.repeat(1500),
      modelState: { scenario: 'coldFront', simHour: 6, temp: 25, humidity: null, injected: { script: true } },
      callback: () => 'unsafe', stationId: 'nonexistent',
    })])[0];
    expect(saved.id).toHaveLength(500);
    expect(saved.station).toHaveLength(150);
    expect(saved.note).toHaveLength(1200);
    expect(saved.modelState).toEqual({ scenario: 'coldFront', simHour: 6, temp: 25 });
    expect(saved.callback).toBeUndefined();
    expect(saved.stationId).toBeUndefined();
  });

  it('roundtrips independent notebook entries through device save and shared payloads', () => {
    const kernel = window.WeatherSystemsKernel;
    const source = { observationLog: [row()], observationComparisonResult: { transient: true } };
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(kernel.immersiveLocalWorkspacePayload(source))));
    expect(restored.observationLog).toEqual(kernel.normalizeWeatherObservationLog(source.observationLog));
    expect(restored.observationComparisonResult).toBeUndefined();
    expect(kernel.immersiveSessionSharePayload(source, { includeLocation: false }).weatherSystems.observationLog).toHaveLength(1);
  });

  it('exports provenance, metric units and saved starting inputs with missing values left blank', () => {
    const data = parseCsv(window.WeatherSystemsKernel.observationJournalCsv([row({ humidity: null })]));
    const record = Object.fromEntries(data[0].map((heading, i) => [heading, data[1][i]]));
    expect(record.Source).toContain('not a real weather observation');
    expect(record['Model hour']).toBe('6');
    expect(record['Starting setup fingerprint']).toBe('saved-starting-setup');
    expect(record['Temperature (°C)']).toBe('17.8');
    expect(record['Sea-level pressure (hPa)']).toBe('1013.3');
    expect(record['Starting temperature (°C)']).toBe('25');
    expect(record['Relative humidity (%)']).toBe('');
    expect(record['Precipitation potential (model index 0–100)']).toBe('56');
    expect(record['Learner note']).toContain('same hour');
  });

  it('escapes quotes, commas, multiline text and formula-like strings without altering negative numeric temperatures', () => {
    const data = parseCsv(window.WeatherSystemsKernel.observationJournalCsv([row({
      station: '=HYPERLINK("unsafe","station")', scenarioName: '\t+SUM(1,1)',
      note: 'Line one, with "quotes"\nLine two', wind: '@unsafe', temperature: -8.2,
    })]));
    expect(data).toHaveLength(2);
    expect(data[1]).toHaveLength(data[0].length);
    const record = Object.fromEntries(data[0].map((heading, i) => [heading, data[1][i]]));
    expect(record.Station).toBe('\'=HYPERLINK("unsafe","station")');
    expect(record.Scenario).toBe("'\t+SUM(1,1)");
    expect(record['Wind description']).toBe("'@unsafe");
    expect(record['Temperature (°C)']).toBe('-8.2');
    expect(record['Learner note']).toBe('Line one, with "quotes"\nLine two');
  });

  it('labels unknown legacy provenance and exports an empty notebook as a valid header-only CSV', () => {
    const kernel = window.WeatherSystemsKernel;
    const rows = parseCsv(kernel.observationJournalCsv([{ id: 'legacy', station: 'Old station', hour: 4, temperature: 11 }]));
    expect(rows[1][0]).toContain('source and setup not recorded');
    expect(rows[1][1]).toBe('');
    expect(rows[1][6]).toBe('');
    expect(parseCsv(kernel.observationJournalCsv(null))).toHaveLength(1);
  });

  it('formats saved comparison evidence, directional ambiguity and model limits without fabricating missing values', () => {
    const kernel = window.WeatherSystemsKernel;
    const text = kernel.observationComparisonText({ kind: 'temporal', comparable: true, explanation: 'Same station and starting setup.', from: row({ hour: 2 }), to: row({ hour: 6 }), metrics: [
      { id: 'temperature', label: 'Temperature', unit: '°C', deltaUnit: '°C', from: 20, to: 16, delta: -4, ratePerHour: -1 },
      { id: 'windDir', label: 'Wind direction', unit: '°', from: 0, to: 180, delta: null, magnitude: 180, ambiguous: true },
      { id: 'windSpeed', label: 'Wind speed', unit: ' km/h', from: 20, to: 20.5, delta: 0.5, ratePerHour: 0.125 },
      { id: 'invalid', from: null, to: 4, delta: 4 },
    ] }, 'A front may explain the change.');
    expect(text).toContain('Central School at T+2 h to Central School at T+6 h');
    expect(text).toContain('Temperature: 20°C → 16°C (difference -4°C)');
    expect(text).toContain('-1°C/h');
    expect(text).toContain('+0.125 km/h per hour');
    expect(text).toContain('clockwise versus counterclockwise is indeterminate');
    expect(text).toContain('My explanation: A front may explain the change.');
    expect(text).toContain('Differences alone do not prove a cause');
    expect(text).not.toMatch(/NaN|undefined|null|invalid:/);
    expect(kernel.observationComparisonText(null)).toContain('Choose two saved');
  });

  it('retains full kernel provenance through normalization so a saved pair remains comparable', () => {
    const kernel = window.WeatherSystemsKernel;
    const first = kernel.weatherObservationSnapshot({ scenario: 'coldFront', simHour: 2 }, 'central');
    const second = kernel.weatherObservationSnapshot({ scenario: 'coldFront', simHour: 8 }, 'central');
    const normalized = kernel.normalizeWeatherObservationLog([first, second]);
    const comparison = kernel.compareWeatherObservations(...normalized);
    expect(comparison.kind).toBe('temporal');
    expect(comparison.comparable).toBe(true);
    expect(kernel.observationComparisonText(comparison)).toContain('Change through time');
  });

  it('reports a shared verified starting setup once and distinct saved origins separately', () => {
    const kernel = window.WeatherSystemsKernel;
    const first = kernel.weatherObservationSnapshot({ scenario: 'coldFront', simHour: 2 }, 'central');
    const later = kernel.weatherObservationSnapshot({ scenario: 'coldFront', simHour: 8 }, 'central');
    const shared = kernel.observationComparisonText(kernel.compareWeatherObservations(first, later));
    expect(shared).toContain('First observation saved scenario: Approaching Cold Front (scenario ID: coldFront).');
    expect(shared).toContain('Second observation saved scenario: Approaching Cold Front (scenario ID: coldFront).');
    expect(shared).toContain('Shared starting conditions (verified saved setup)');
    expect(shared.match(/Starting temperature:/g)).toHaveLength(1);
    expect(shared).toContain('Starting temperature: 25°C');
    expect(shared).toContain('Starting relative humidity: 72%');
    expect(shared).toContain('Front speed: 36 km/h');
    const other = kernel.weatherObservationSnapshot({ scenario: 'fair', temp: 21, simHour: 8 }, 'central');
    const mixed = kernel.observationComparisonText(kernel.compareWeatherObservations(first, other));
    expect(mixed).toContain('First observation saved scenario: ' + first.scenarioName);
    expect(mixed).toContain('Second observation saved scenario: ' + other.scenarioName);
    expect(mixed).toContain('First starting conditions (verified saved setup)');
    expect(mixed).toContain('Second starting conditions (verified saved setup)');
    expect(mixed).toContain('Starting temperature: 21°C');
    expect(mixed.match(/Starting temperature:/g)).toHaveLength(2);
    expect(mixed).not.toContain('Shared starting conditions');
  });

  it('keeps absent legacy origins explicit and includes the full1500-character explanation', () => {
    const kernel = window.WeatherSystemsKernel;
    const comparison = kernel.compareWeatherObservations({ id: 'a', station: 'Old', hour: 1, temperature: 4 }, { id: 'b', station: 'Old', hour: 2, temperature: 5 });
    const text = kernel.observationComparisonText(comparison, 'a'.repeat(1499) + 'Z' + 'discard');
    expect(text).toContain('First observation saved scenario: not recorded (scenario ID: not recorded).');
    expect(text).toContain('First starting conditions: not recorded; not inferred from the active model.');
    expect(text).toContain('My explanation: ' + 'a'.repeat(1499) + 'Z');
    expect(text).not.toContain('discard');
  });

  it('persists bounded comparison selections and note drafts without undo or status state', () => {
    const kernel = window.WeatherSystemsKernel;
    const source = { observationLog: [row()], observationCompareFrom: 'x'.repeat(600), observationCompareTo: 'central-6', observationNote: '\u0000' + 'n'.repeat(1600), observationLogUndo: [row({ id: 'undo' })], observationStatus: 'Transient status' };
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(kernel.immersiveLocalWorkspacePayload(source))));
    expect(restored.observationCompareFrom).toHaveLength(500);
    expect(restored.observationCompareTo).toBe('central-6');
    expect(restored.observationNote).toHaveLength(1500);
    expect(restored.observationLogUndo).toBeUndefined();
    expect(restored.observationStatus).toBeUndefined();
    const invalid = kernel.immersiveSessionSharePayload({ observationCompareFrom: {}, observationCompareTo: null, observationNote: [] }).weatherSystems;
    expect(invalid.observationCompareFrom).toBeUndefined();
    expect(invalid.observationCompareTo).toBeUndefined();
    expect(invalid.observationNote).toBeUndefined();
  });
});
