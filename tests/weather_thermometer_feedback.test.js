import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = process.env.WEATHER_THERMOMETER_SOURCE
  || 'stem_lab/stem_tool_weathersystems.js';
const validUtc = '2026-10-29T18:00:00.000Z';
const recordedUtc = '2026-10-29T18:05:00.000Z';
let kernel;

beforeEach(() => {
  resetStemLab();
  loadTool(source, 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function forecast(overrides = {}) {
  return {
    schema: 'weather-live-checkpoint-v2',
    id: 'thermometer-feedback-school',
    location: 'School yard',
    source: 'Open-Meteo',
    sourceKind: 'model',
    latitude: 40,
    longitude: -75,
    retrievedAt: '2026-10-29T16:01Z',
    capturedAt: '2026-10-29T16:05Z',
    currentDataAt: '2026-10-29T12:00',
    validAt: '2026-10-29T14:00',
    validTimestamp: Date.parse(validUtc),
    timezone: 'EDT',
    utcOffsetSeconds: -14400,
    predicted: { temperature: 24, humidity: 55, pressure: 1012, windSpeed: 8, precipitation: 0 },
    learnerReasoning: 'Keep this original forecast and its evidence.',
    ...overrides,
  };
}

function reading(overrides = {}) {
  return { enteredValue: '67', enteredUnit: 'F', measuredAt: validUtc, sameSite: true, ...overrides };
}

function check(overrides = {}, checkpoint = forecast(), clock = recordedUtc) {
  return kernel.classroomThermometerCheck(checkpoint, reading(overrides), clock);
}

function change(checkpoints, input, clock = recordedUtc, id = 'thermometer-feedback-school') {
  return kernel.classroomThermometerChange(checkpoints, id, input, clock);
}

function withoutReading(checkpoint) {
  const copy = structuredClone(checkpoint);
  delete copy.classroomReading;
  return copy;
}

describe('Thermometer validation feedback without saved-data changes', () => {
  it('identifies an explicit site confirmation failure before accepting any measurement', () => {
    for (const sameSite of [false, undefined, null, 'true', 1]) {
      const result = check({ sameSite });
      expect(result).toMatchObject({ ok: false, field: 'sameSite' });
      expect(result.message).toContain('saved forecast site');
      expect(result).not.toHaveProperty('reading');
    }
    const missingInput = kernel.classroomThermometerCheck(forecast(), null, recordedUtc);
    expect(missingInput).toMatchObject({ ok: false, field: 'sameSite' });
  });

  it('distinguishes invalid or incomplete unit declarations from numeric-value errors', () => {
    for (const patch of [
      { enteredUnit: undefined }, { enteredUnit: null }, { enteredUnit: '' },
      { enteredUnit: 'f' }, { enteredUnit: '\u00b0F' }, { enteredUnit: 'K' },
      { schema: 'weather-classroom-temperature-v1' }, { schema: 'unsupported-reading' },
    ]) {
      expect(check(patch)).toMatchObject({ ok: false, field: 'enteredUnit' });
    }
    const missingValue = reading();
    delete missingValue.enteredValue;
    expect(kernel.classroomThermometerCheck(forecast(), missingValue, recordedUtc))
      .toMatchObject({ ok: false, field: 'enteredUnit' });
    expect(check({ enteredValue: '', enteredUnit: 'C' }))
      .toMatchObject({ ok: false, field: 'enteredValue' });
  });

  it('maps blank, nonnumeric, range and precision failures to the entered value in either unit', () => {
    const cases = [
      ['C', ['', ' ', null, undefined, false, true, {}, [], NaN, Infinity, -100.1, 70.1, 12.34]],
      ['F', ['', ' ', null, undefined, false, true, {}, [], NaN, Infinity, -148.1, 158.1, 67.01]],
    ];
    for (const [enteredUnit, values] of cases) {
      for (const enteredValue of values) {
        const result = check({ enteredUnit, enteredValue });
        expect(result, `${enteredUnit}: ${String(enteredValue)}`)
          .toMatchObject({ ok: false, field: 'enteredValue' });
        expect(result.message).toContain(`\u00b0${enteredUnit}`);
        expect(result).not.toHaveProperty('reading');
      }
    }
    expect(check({ temperatureC: 19.4 }))
      .toMatchObject({ ok: false, field: 'enteredValue' });
  });

  it('accepts boundary values, decimal readings and negative zero without failure metadata', () => {
    for (const [enteredUnit, enteredValue] of [
      ['C', -100], ['C', 70], ['C', -0], ['C', '-0'], ['C', 12.3],
      ['F', -148], ['F', 158], ['F', -0], ['F', '-0'], ['F', 67.1],
    ]) {
      const result = check({ enteredUnit, enteredValue });
      expect(result.ok, `${enteredValue} ${enteredUnit}`).toBe(true);
      expect(result).not.toHaveProperty('field');
      expect(result.reading).not.toHaveProperty('field');
      expect(result.reading.enteredValue === Number(enteredValue)).toBe(true);
      const expectedC = enteredUnit === 'F' ? (Number(enteredValue) - 32) * 5 / 9 : Number(enteredValue);
      expect(result.reading.temperatureC === expectedC).toBe(true);
    }
  });

  it('identifies time-entry errors while continuing to accept equivalent explicit UTC instants', () => {
    for (const measuredAt of ['', null, undefined, 'not-a-time', '2026-10-29T14:00',
      '2026-10-29T17:59Z', '2026-10-29T18:01Z', '2026-10-30T18:00Z']) {
      expect(check({ measuredAt })).toMatchObject({ ok: false, field: 'measuredAt' });
    }
    const equivalent = check({ measuredAt: '2026-10-29T14:00:00-04:00' });
    expect(equivalent.ok).toBe(true);
    expect(equivalent).not.toHaveProperty('field');
    expect(equivalent.reading.measuredAt).toBe(validUtc);
  });

  it('keeps unusable forecast and premature or invalid clock failures at form level', () => {
    for (const checkpoint of [
      forecast({ sourceKind: 'observation' }), forecast({ latitude: null }),
      forecast({ predicted: { temperature: null } }), forecast({ capturedAt: validUtc }),
    ]) {
      const result = check({}, checkpoint);
      expect(result.ok).toBe(false);
      expect(result.field ?? null).toBeNull();
      expect(result).not.toHaveProperty('reading');
    }
    for (const clock of ['2026-10-29T17:59:59.999Z', 'invalid-recording-clock', '']) {
      const result = check({}, forecast(), clock);
      expect(result.ok).toBe(false);
      expect(result.field ?? null).toBeNull();
      expect(result.message).toContain('after you take it');
    }
    const missing = change([], reading());
    expect(missing).toMatchObject({ ok: false, changed: false, checkpoints: [], undo: null });
    expect(missing.field ?? null).toBeNull();
    expect(check({}, forecast(), validUtc).ok).toBe(true);
  });

  it('preserves the exact successful 67 Fahrenheit response and unrounded Celsius conversion', () => {
    expect(check()).toEqual({
      ok: true,
      differenceC: 4.6,
      differenceF: 8.2,
      reading: {
        schema: 'weather-classroom-temperature-v2',
        enteredValue: 67,
        enteredUnit: 'F',
        temperatureC: (67 - 32) * 5 / 9,
        sameSite: true,
        measuredAt: validUtc,
        recordedAt: recordedUtc,
      },
    });
  });

  it('propagates failure fields through changes while preserving both cards and all scientific evidence', () => {
    const originalReading = check().reading;
    const checkpoints = kernel.normalizeLiveForecastCheckpoints([
      forecast({ classroomReading: originalReading }),
      forecast({ id: 'another-school', location: 'Another school yard', latitude: 41,
        learnerReasoning: 'This independent forecast must stay exact.' }),
    ]);
    const original = structuredClone(checkpoints);
    for (const [input, field] of [
      [reading({ sameSite: false }), 'sameSite'],
      [reading({ enteredUnit: 'K' }), 'enteredUnit'],
      [reading({ enteredValue: 67.01 }), 'enteredValue'],
      [reading({ measuredAt: '2026-10-29T18:01Z' }), 'measuredAt'],
    ]) {
      const result = change(checkpoints, input);
      expect(result).toMatchObject({ ok: false, changed: false, undo: null, field });
      expect(result.checkpoints).toEqual(original);
      expect(checkpoints).toEqual(original);
    }
    const unchanged = change(checkpoints, reading(), '2026-10-29T18:10:00.000Z');
    expect(unchanged).toMatchObject({ ok: true, changed: false, undo: null });
    expect(unchanged).not.toHaveProperty('field');
    expect(unchanged.checkpoints).toEqual(original);
  });

  it('keeps 67 Fahrenheit and its useful Undo after a failed correction, then saves and undoes a valid correction', () => {
    const baseline = kernel.normalizeLiveForecastCheckpoints([forecast()]);
    const saved = change(baseline, reading());
    expect(saved).toMatchObject({ ok: true, changed: true });
    expect(saved).not.toHaveProperty('field');
    const exact67 = structuredClone(saved.checkpoints);
    const failed = change(saved.checkpoints, reading({ enteredValue: 68.01 }), '2026-10-29T18:06:00.000Z');
    expect(failed).toMatchObject({ ok: false, changed: false, field: 'enteredValue', undo: null });
    expect(failed.checkpoints).toEqual(exact67);
    expect(saved.checkpoints).toEqual(exact67);
    expect(kernel.classroomThermometerUndo(failed.checkpoints, saved.undo).checkpoints).toEqual(baseline);

    const corrected = change(failed.checkpoints, reading({ enteredValue: 68 }), '2026-10-29T18:07:00.000Z');
    expect(corrected).toMatchObject({ ok: true, changed: true });
    expect(corrected).not.toHaveProperty('field');
    expect(corrected.checkpoints[0].classroomReading)
      .toMatchObject({ enteredValue: 68, enteredUnit: 'F', temperatureC: 20 });
    expect(withoutReading(corrected.checkpoints[0])).toEqual(baseline[0]);
    const undone = kernel.classroomThermometerUndo(corrected.checkpoints, corrected.undo);
    expect(undone.ok).toBe(true);
    expect(undone.checkpoints).toEqual(exact67);
    expect(corrected.checkpoints[0].classroomReading.enteredValue).toBe(68);
  });

  it('excludes transient notices and field metadata from every local, session and share payload and import', () => {
    const exactReading = check().reading;
    const checkpoint = forecast({ classroomReading: { ...exactReading, field: 'enteredValue' } });
    const data = {
      liveForecastCheckpoints: [checkpoint],
      classroomThermometerNotice: {
        id: checkpoint.id, error: true, field: 'enteredValue', message: 'PRIVATE_THERMOMETER_ERROR_159_F',
      },
    };
    const original = structuredClone(data);
    const local = kernel.immersiveLocalWorkspacePayload(data);
    const download = kernel.immersiveSessionDownloadPayload(data);
    const shared = kernel.immersiveSessionSharePayload(data, { includeLocation: true });
    const redacted = kernel.immersiveSessionSharePayload(data, { includeLocation: false });
    for (const payload of [local, download, shared, redacted]) {
      expect(payload.weatherSystems).not.toHaveProperty('classroomThermometerNotice');
      expect(JSON.stringify(payload)).not.toMatch(/PRIVATE_THERMOMETER_ERROR_159_F|"field"/);
    }
    for (const payload of [local, download, shared]) {
      expect(payload.weatherSystems.liveForecastCheckpoints[0].classroomReading).toEqual(exactReading);
    }
    expect(redacted.weatherSystems).not.toHaveProperty('liveForecastCheckpoints');

    const restored = [
      kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(local))),
      kernel.validateImmersiveSessionPayload(JSON.parse(JSON.stringify(download))),
      kernel.validateImmersiveSessionPayload(JSON.parse(JSON.stringify(shared))),
      kernel.validateImmersiveSessionPayload({ schema: 'weather-immersive-session-v1', weatherSystems: data }),
    ];
    for (const patch of restored) {
      expect(patch).not.toBeNull();
      expect(patch).not.toHaveProperty('classroomThermometerNotice');
      expect(patch.liveForecastCheckpoints[0].classroomReading).toEqual(exactReading);
      expect(JSON.stringify(patch)).not.toMatch(/PRIVATE_THERMOMETER_ERROR_159_F|"field"/);
    }
    expect(data).toEqual(original);
  });
});
