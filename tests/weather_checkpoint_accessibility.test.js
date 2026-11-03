import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.WEATHER_CHECKPOINT_A11Y_SOURCE || 'stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

const valid = '2026-10-29T14:00:00.000Z';
function checkpoint(patch = {}) {
  return {
    schema: 'weather-live-checkpoint-v2', id: 'opaque-checkpoint-id-do-not-announce',
    location: 'Synthetic school yard', latitude: 40, longitude: -75,
    source: 'Open-Meteo', sourceKind: 'model', retrievedAt: '2026-10-29T12:01:00.000Z',
    capturedAt: '2026-10-29T12:05:00.000Z', currentDataAt: '2026-10-29T12:00:00.000Z',
    validAt: valid, validTimestamp: Date.parse(valid), timezone: 'UTC', utcOffsetSeconds: 0,
    pressureType: 'surface', precipitationIntervalSeconds: 3600,
    predicted: { temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 350, weatherCode: 95, condition: 'Thunderstorms' },
    learnerReasoning: 'Keep this original explanation.\n"Quoted evidence" stays.',
    timelineEvidence: 'Keep the original two-hour evidence.',
    classroomReading: {
      schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F',
      temperatureC: (67 - 32) * 5 / 9, measuredAt: valid,
      recordedAt: '2026-10-29T14:05:00.000Z', sameSite: true,
    }, ...patch,
  };
}
function context(saved, position = 1, total = 2) {
  expect(kernel.liveForecastCheckpointControlContext).toBeTypeOf('function');
  return kernel.liveForecastCheckpointControlContext(saved, position, total);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('Saved forecast control context', () => {
  it('identifies display position, site, verified UTC valid time and original retrieval without an opaque ID', () => {
    const saved = checkpoint();
    expect(context(saved)).toBe('saved forecast 1 of 2 for Synthetic school yard, valid 2026-10-29 14:00 UTC, original retrieval 2026-10-29 12:01 UTC');
    expect(context(saved)).not.toContain(saved.id);
    expect(context(saved, 8, 8)).toContain('saved forecast 8 of 8 for Synthetic school yard');
  });

  it('keeps both retrieval provenance and ordinal useful when sites and valid hours coincide', () => {
    const first = checkpoint(), second = checkpoint({ retrievedAt: '2026-10-29T12:02:00.000Z' });
    expect(context(first, 2, 2)).toContain('original retrieval 2026-10-29 12:01 UTC');
    expect(context(second, 1, 2)).toContain('original retrieval 2026-10-29 12:02 UTC');
    expect(context(first, 2, 2)).not.toBe(context(second, 1, 2));
    expect(context(first, 2, 2)).not.toBe(context(first, 1, 2));
  });

  it('normalizes equivalent explicit offsets and preserves meaningful seconds and milliseconds', () => {
    expect(context(checkpoint({ validAt: '2026-10-29T10:00:00-04:00', retrievedAt: '2026-10-29T08:01:00-04:00' }))).toBe(context(checkpoint()));
    expect(context(checkpoint({ retrievedAt: '2026-10-29T12:01:12.125Z' }))).toContain('original retrieval 2026-10-29 12:01:12.125 UTC');
    const instant = '2026-10-29T14:00:09.050Z';
    expect(context(checkpoint({ validAt: instant, validTimestamp: Date.parse(instant) }))).toContain('valid 2026-10-29 14:00:09.050 UTC');
  });

  it.each([
    ['another instant', Date.parse(valid) + 3600000], ['null', null], ['undefined', undefined],
    ['blank', ''], ['false', false], ['nonfinite', Infinity], ['NaN', NaN],
  ])('does not describe a verified valid hour when explicit validTimestamp is %s', (_label, validTimestamp) => {
    const label = context(checkpoint({ validTimestamp }));
    expect(label).toContain('valid time unverified');
    expect(label).not.toContain('valid 2026-10-29 14:00 UTC');
    expect(label).toContain('original retrieval 2026-10-29 12:01 UTC');
  });

  it('accepts a legacy omitted validTimestamp only with a strictly interpretable stored validAt', () => {
    const legacy = checkpoint({ validAt: '2026-10-29T10:00', utcOffsetSeconds: -14400 });
    delete legacy.validTimestamp;
    expect(context(legacy)).toContain('valid 2026-10-29 14:00 UTC');
    delete legacy.utcOffsetSeconds;
    expect(context(legacy)).toContain('valid time unverified');
    legacy.validAt = '2026-10-29T14:00Z';
    expect(context(legacy)).toContain('valid 2026-10-29 14:00 UTC');
  });

  it.each(['2026-02-30T14:00Z', '2026-10-29T25:00Z', '2026-10-29T14:00+14:01', 'not a date'])('rejects a malformed calendar or offset rather than guessing: %s', (value) => {
    expect(context(checkpoint({ validAt: value }))).toContain('valid time unverified');
    expect(context(checkpoint({ retrievedAt: value }))).toContain('original retrieval unverified');
  });

  it('states missing and unverified metadata honestly without leaking a saved key', () => {
    expect(context(null)).toBe('saved forecast 1 of 2 for location not recorded, valid time not recorded, original retrieval not recorded');
    const unknown = checkpoint({ location: ' \n\t ', validAt: null, retrievedAt: ' ' });
    delete unknown.validTimestamp;
    expect(context(unknown)).toContain('location not recorded, valid time not recorded, original retrieval not recorded');
    expect(context(unknown)).not.toContain(unknown.id);
    expect(context(checkpoint({ retrievedAt: '2026-10-29T12:01' }))).toContain('original retrieval unverified');
  });

  it('collapses whitespace and bounds a long Unicode site while preserving meaningful words', () => {
    expect(context(checkpoint({ location: '  Synthetic\n\t school\u0000 yard  ' }))).toContain('for Synthetic school yard, valid');
    const label = context(checkpoint({ location: '🌦'.repeat(140) }));
    const site = label.split(' for ')[1].split(', valid')[0];
    expect(Array.from(site)).toHaveLength(120);
    expect(site.endsWith('...')).toBe(true);
    expect(site).not.toContain('\ufffd');
    expect(label.length).toBeLessThan(420);
  });

  it.each([[0, 2], [3, 2], [1, 9], [1.5, 2], ['1', 2], [1, '2']])('does not invent a position for invalid display metadata %s/%s', (position, total) => {
    const label = context(checkpoint(), position, total);
    expect(label).toContain('saved forecast for Synthetic school yard');
    expect(label).not.toMatch(/saved forecast \d+ of/);
  });

  it('leaves frozen scientific evidence and Fahrenheit readings unchanged and keeps context out of saved JSON', () => {
    const saved = freeze(checkpoint()), data = { liveForecastCheckpoints: [saved] };
    const before = JSON.stringify(saved), sessionBefore = kernel.immersiveSessionDownloadPayload(data);
    const label = context(saved);
    expect(JSON.stringify(saved)).toBe(before);
    expect(kernel.immersiveSessionDownloadPayload(data)).toEqual(sessionBefore);
    const json = JSON.stringify(sessionBefore);
    expect(json).not.toContain(label);
    expect(json).not.toContain('aria-label');
    expect(sessionBefore.weatherSystems.liveForecastCheckpoints[0].classroomReading).toEqual(saved.classroomReading);
  });
});

describe('Saved forecast semantic markup', () => {
  it('names repeated actions, native summaries and form landmarks while preserving short visible and inner input labels', () => {
    const saved = [checkpoint({ id: 'first' }), checkpoint({ id: 'second', retrievedAt: '2026-10-29T12:02:00.000Z' })];
    const before = structuredClone(saved), root = document.createElement('div');
    root.innerHTML = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', liveForecastCheckpoints: saved } });
    const list = root.querySelector('ol[aria-label="Saved live forecast checkpoints"]');
    expect(list).not.toBeNull();
    const rows = [...list.children];
    expect(rows).toHaveLength(2);
    rows.forEach((row, index) => {
      const label = context(saved[saved.length - index - 1], index + 1, saved.length);
      for (const action of ['Open checkpoint hour', 'Remove']) {
        const button = [...row.querySelectorAll('button')].find((node) => node.textContent === action);
        expect(button?.getAttribute('aria-label')).toBe(action + ', ' + label);
        expect(button?.textContent).toBe(action);
      }
      expect(row.querySelector('summary')?.getAttribute('aria-label')).toBe('Classroom thermometer check, ' + label);
      expect(row.querySelector('summary')?.textContent).toBe('Classroom thermometer check');
      const form = row.querySelector('form');
      expect(form?.getAttribute('aria-label')).toBe('Thermometer reading, ' + label);
      expect(form?.textContent).toContain('Thermometer unit');
      expect(form?.textContent).toContain('Outdoor thermometer reading (°F)');
      expect(form?.textContent).toContain('Measurement time (UTC)');
      expect([...form.querySelectorAll('button')].map((button) => button.textContent)).toContain('Update thermometer reading');
    });
    expect(saved).toEqual(before);
  });
});
