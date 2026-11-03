import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.WEATHER_CHECKPOINT_REVIEW_SOURCE || 'stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

const valid = '2026-10-29T14:00:00.000Z';
const retrieval = '2026-10-29T15:05:00.000Z';
function checkpoint(patch = {}) {
  return {
    schema: 'weather-live-checkpoint-v2', id: 'preserved-school-forecast', location: 'Synthetic school yard',
    latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
    retrievedAt: '2026-10-29T12:01:00.000Z', capturedAt: '2026-10-29T12:05:00.000Z',
    currentDataAt: '2026-10-29T12:00:00.000Z', validAt: valid, validTimestamp: Date.parse(valid),
    timezone: 'UTC', utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: 3600,
    predicted: { temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 350, weatherCode: 95, condition: 'Thunderstorms' },
    learnerReasoning: 'Keep the original explanation.\nDo not replace it.',
    timelineEvidence: 'Original two-hour evidence remains attached.', ...patch,
  };
}
function loaded(patch = {}) {
  return {
    label: 'Synthetic school yard', latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
    observedAt: '2026-10-29T15:00:00.000Z', retrievedAt: retrieval,
    timezone: 'UTC', utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: 900, ...patch,
  };
}
function point(patch = {}) {
  return {
    time: valid, role: 'earlier', offsetHours: -1, utcOffsetSeconds: 0,
    source: 'Open-Meteo', sourceKind: 'model', retrievedAt: retrieval,
    pressureType: 'surface', precipitationIntervalSeconds: 3600,
    temperature: 22, precipitation: 0.7, pressure: 1009, windSpeed: 18, windDir: 10, weatherCode: 61,
    ...patch,
  };
}
function status(hour = point(), saved = checkpoint(), live = loaded()) {
  return kernel.forecastCheckpointStatus(saved, [hour], live);
}
function withheld(result) {
  expect(result.ready).toBe(false);
  expect(result.code).not.toBe('compared');
  expect(result.comparison).toBeFalsy();
  expect(Object.values(result.metrics || {}).every((metric) => metric == null)).toBe(true);
  expect(result.conditionMatch == null).toBe(true);
}
function csvObjects(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (!quoted && char === ',') { row.push(value); value = ''; }
    else if (!quoted && (char === '\r' || char === '\n')) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); rows.push(row); row = []; value = '';
    } else value += char;
  }
  if (row.length || value) rows.push(row.concat(value));
  expect(quoted).toBe(false);
  const [headings, ...data] = rows;
  return data.map((cells) => {
    expect(cells).toHaveLength(headings.length);
    return Object.fromEntries(headings.map((heading, index) => [heading, cells[index]]));
  });
}

describe('Saved forecast comparison point provenance', () => {
  it('compares one matching documented later hour and retains the signed differences', () => {
    const result = status(point({ latitude: 40, longitude: -75 }));
    expect(result.ready).toBe(true);
    expect(result.metrics.temperature).toMatchObject({ forecast: 24, comparison: 22, error: 2 });
    expect(result.metrics.pressure.error).toBe(-2);
    expect(result.metrics.windDirection.error).toBe(-20);
    expect(result.comparedRetrievedAt).toBe(retrieval);
  });

  it.each([
    ['another latitude', { latitude: 40.0001, longitude: -75 }],
    ['another longitude', { latitude: 40, longitude: -74.9999 }],
    ['only latitude', { latitude: 40 }],
    ['only longitude', { longitude: -75 }],
    ['null latitude', { latitude: null, longitude: -75 }],
    ['undefined longitude', { latitude: 40, longitude: undefined }],
    ['blank latitude', { latitude: '', longitude: -75 }],
    ['boolean latitude', { latitude: false, longitude: -75 }],
    ['out-of-range longitude', { latitude: 40, longitude: 181 }],
  ])('withholds explicitly incompatible hourly coordinates: %s', (_name, patch) => {
    withheld(status(point(patch)));
  });

  it.each([
    ['numeric coordinate strings', { latitude: '40', longitude: '-75' }],
    ['the same four-decimal cell', { latitude: 40.00001, longitude: -75.00001 }],
  ])('accepts documented matching hourly coordinates: %s', (_name, patch) => {
    expect(status(point(patch)).ready).toBe(true);
  });

  it('accepts the equivalent date-line coordinate rather than inventing a location mismatch', () => {
    expect(status(point({ latitude: '0.00003', longitude: '-180' }),
      checkpoint({ latitude: 0, longitude: 180 }), loaded({ latitude: 0, longitude: 180 })).ready).toBe(true);
  });

  it('keeps legacy hours with genuinely omitted optional provenance comparable', () => {
    const { source, sourceKind, retrievedAt, ...legacyHour } = point();
    expect(status(legacyHour).ready).toBe(true);
    expect(status(legacyHour).metrics.temperature.error).toBe(2);
  });

  it.each([
    ['null', null], ['undefined', undefined], ['empty', ''], ['invalid', 'not-an-instant'],
    ['a different retrieval', '2026-10-29T15:04:00.000Z'],
  ])('withholds an explicitly unusable hourly retrieval: %s', (_name, retrievedAt) => {
    withheld(status(point({ retrievedAt })));
  });

  it('accepts a retrieval written with an equivalent explicit offset', () => {
    expect(status(point({ retrievedAt: '2026-10-29T11:05:00-04:00' })).ready).toBe(true);
  });

  it('retains available metrics on a flagged partial hour without turning a missing measurement into zero', () => {
    const result = status(point({ partial: true, temperature: 22, windSpeed: null }));
    expect(result.ready).toBe(true);
    expect(result.metrics.temperature).toMatchObject({ comparison: 22, error: 2 });
    expect(result.metrics.windSpeed).toBeNull();
  });

  it.each([
    ['another provider', { source: 'Different provider' }],
    ['an observation source kind', { sourceKind: 'observation' }],
    ['an explicit null provider', { source: null }],
  ])('withholds a matching hour that explicitly identifies %s', (_name, patch) => {
    withheld(status(point(patch)));
  });

  it.each(['earlier', 'current', 'forecast'])('withholds duplicate absolute instants, including a second %s role, in either order', (role) => {
    const first = point(), duplicate = point({ time: '2026-10-29T10:00:00-04:00', role, temperature: -10 });
    for (const timeline of [[first, duplicate], [duplicate, first]]) {
      withheld(kernel.forecastCheckpointStatus(checkpoint(), timeline, loaded()));
    }
  });

  it('does not let irrelevant foreign hours or duplicates at another instant suppress a unique matching hour', () => {
    const unrelated = point({ time: '2026-10-29T13:00:00Z', latitude: null, source: 'Other' });
    const result = kernel.forecastCheckpointStatus(checkpoint(), [unrelated, point(), { ...unrelated }], loaded());
    expect(result.ready).toBe(true);
    expect(result.metrics.temperature.error).toBe(2);
  });

  it('leaves saved forecasts, loaded response and every supplied hourly object unchanged', () => {
    const saved = checkpoint(), live = loaded(), timeline = [point({ latitude: null, longitude: -75 }), point({ time: '2026-10-29T15:00Z', role: 'current' })];
    const before = structuredClone({ saved, live, timeline });
    kernel.forecastCheckpointStatus(saved, timeline, live);
    kernel.liveForecastReviewText([saved], timeline, live);
    kernel.liveForecastReviewCsv([saved], timeline, live);
    expect({ saved, live, timeline }).toEqual(before);
  });

  it.each(['foreign location', 'ambiguous instant'])('withholds %s in UI, TXT and CSV while preserving a legitimate saved Fahrenheit reading and original work', (reason) => {
    const saved = checkpoint();
    const checked = kernel.classroomThermometerCheck(saved,
      { enteredValue: 67, enteredUnit: 'F', measuredAt: valid, sameSite: true }, '2026-10-29T14:05:00Z');
    expect(checked.ok).toBe(true);
    saved.classroomReading = checked.reading;
    const timeline = reason === 'foreign location'
      ? [point({ latitude: 41, longitude: -75 })]
      : [point(), point({ time: '2026-10-29T10:00:00-04:00', role: 'forecast', temperature: -10 })];
    const before = structuredClone(saved);
    const text = kernel.liveForecastReviewText([saved], timeline, loaded());
    const [csv] = csvObjects(kernel.liveForecastReviewCsv([saved], timeline, loaded()));
    expect(text).not.toContain('Later-model comparison:');
    expect(text).toContain('Classroom thermometer check');
    expect(text).toContain('67 °F');
    expect(text).toContain(saved.learnerReasoning);
    expect(csv['Comparison status']).not.toBe('compared');
    expect(csv['Comparison retrieval']).toBe('');
    for (const [heading, value] of Object.entries(csv)) {
      if (/^(Newer model|Saved minus newer model|Absolute difference)/.test(heading)) expect(value, heading).toBe('');
    }
    expect(csv['Original forecast explanation']).toBe(saved.learnerReasoning);
    expect(csv['Attached timeline evidence']).toBe(saved.timelineEvidence);
    expect(csv['Classroom entered thermometer value']).toBe('67');
    expect(csv['Classroom entered thermometer unit']).toBe('F');
    expect(Number(csv['Classroom outdoor thermometer (°C)'])).toBe(saved.classroomReading.temperatureC);
    expect(csv['Saved forecast minus classroom thermometer (°F)']).toBe('8.2');
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', liveWeather: loaded(), liveWeatherTimeline: timeline, liveForecastCheckpoints: [saved] } });
    const root = document.createElement('div'); root.innerHTML = html;
    expect(root.querySelectorAll('[data-weather-forecast-error]')).toHaveLength(0);
    expect(root.querySelector('[data-weather-classroom-result]')?.textContent).toContain('Thermometer 67 °F');
    expect(saved).toEqual(before);
  });
});
