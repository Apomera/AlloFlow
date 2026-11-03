import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

const validUtc = '2026-10-29T18:00:00.000Z';
const enteredUtc = '2026-10-29T18:05:00.000Z';

function forecast(overrides = {}) {
  return {
    schema: 'weather-live-checkpoint-v2', id: 'school-snapshot', location: 'School yard',
    source: 'Open-Meteo', sourceKind: 'model', latitude: 40, longitude: -75,
    retrievedAt: '2026-10-29T16:01Z', capturedAt: '2026-10-29T16:05Z',
    currentDataAt: '2026-10-29T12:00', validAt: '2026-10-29T14:00',
    validTimestamp: Date.parse(validUtc), timezone: 'EDT', utcOffsetSeconds: -14400,
    predicted: { temperature: 24 }, ...overrides,
  };
}

function check(input = {}, snapshot = forecast(), entered = enteredUtc) {
  return kernel.classroomThermometerCheck(snapshot, {
    temperatureC: 0, measuredAt: validUtc, sameSite: true, ...input,
  }, entered);
}

function checkEntered(input = {}, snapshot = forecast(), entered = enteredUtc) {
  return kernel.classroomThermometerCheck(snapshot, {
    enteredValue: 67, enteredUnit: 'F', measuredAt: validUtc, sameSite: true, ...input,
  }, entered);
}

function csvFields(checkpoint) {
  const csv = kernel.liveForecastReviewCsv([checkpoint], [], null);
  const cells = (line) => [...line.matchAll(/"((?:[^"]|"")*)"(?=,|$)/g)]
    .map((match) => match[1].replace(/""/g, '"'));
  const [headings, row] = csv.trimEnd().split('\r\n').map(cells);
  return Object.fromEntries(headings.map((heading, index) => [heading, row[index]]));
}

describe('Classroom thermometer check', () => {
  it('records a real zero and compares against the original saved temperature', () => {
    const snapshot = forecast();
    const original = structuredClone(snapshot);
    const result = check({ temperatureC: '0', measuredAt: '2026-10-29T14:00:00-04:00' }, snapshot);
    expect(result).toEqual({
      ok: true, differenceC: 24,
      reading: {
        schema: 'weather-classroom-temperature-v1', temperatureC: 0,
        measuredAt: validUtc, recordedAt: enteredUtc, sameSite: true,
      },
    });
    expect(snapshot).toEqual(original);
    expect(check({ temperatureC: 25.3 }).differenceC).toBe(-1.3);
  });

  it('requires a usable numeric reading, an explicit site confirmation, and the exact valid instant', () => {
    for (const temperatureC of [null, undefined, '', '  ', false, NaN, Infinity, -101, 71, 1.23]) {
      expect(check({ temperatureC }).ok).toBe(false);
    }
    for (const sameSite of [false, null, 'true']) expect(check({ sameSite }).ok).toBe(false);
    for (const measuredAt of ['2026-10-29T17:59Z', '2026-10-29T14:00', '', '2026-10-30T18:00Z']) {
      expect(check({ measuredAt }).ok).toBe(false);
    }
    expect(check({}, forecast(), '2026-10-29T17:59:59Z').ok).toBe(false);
    expect(check({}, forecast(), validUtc).ok).toBe(true);
  });

  it('rejects legacy or incompatible forecasts without preventing their display', () => {
    for (const changes of [
      { schema: undefined }, { predicted: { temperature: null } }, { sourceKind: 'observation' },
      { latitude: null }, { validTimestamp: Date.parse(validUtc) + 1 },
      { capturedAt: validUtc }, { retrievedAt: undefined },
    ]) expect(check({}, forecast(changes)).ok).toBe(false);
    const legacy = forecast({ schema: undefined, validTimestamp: undefined });
    const [restored] = kernel.normalizeLiveForecastCheckpoints([{ ...legacy, classroomReading: check().reading }]);
    expect(restored.id).toBe(legacy.id);
    expect(restored.classroomReading).toBeUndefined();
  });

  it('round-trips only validated measurement fields and removes classroom data from redacted shares', () => {
    const snapshot = forecast({ classroomReading: { ...check().reading, extra: 'private draft' } });
    const data = { liveForecastCheckpoints: [snapshot] };
    const restored = kernel.validateImmersiveLocalWorkspacePayload(kernel.immersiveLocalWorkspacePayload(data));
    expect(restored.liveForecastCheckpoints[0].classroomReading).toEqual(check().reading);
    const redacted = kernel.immersiveSessionSharePayload(data, { includeLocation: false });
    expect(JSON.stringify(redacted)).not.toMatch(/school-snapshot|School yard|classroomReading|private draft/);
    for (const changes of [{ schema: 'unknown' }, { sameSite: false }, { recordedAt: '2026-10-29T17:00Z' }, { measuredAt: '2026-10-29T18:01Z' }]) {
      const [record] = kernel.normalizeLiveForecastCheckpoints([forecast({ classroomReading: { ...check().reading, ...changes } })]);
      expect(record.predicted.temperature).toBe(24);
      expect(record.classroomReading).toBeUndefined();
    }
  });

  it('exports the measurement separately even when a later model has not been loaded', () => {
    const saved = forecast({ classroomReading: check({ temperatureC: 25.3 }).reading });
    const text = kernel.liveForecastReviewText([saved], [], null);
    expect(text).toContain('Classroom thermometer check');
    expect(text).toMatch(/[-−]1\.3 °C/);
    expect(text).toContain(validUtc);
    expect(text).toContain(enteredUtc);
    function readingColumns(checkpoint) {
      const csv = kernel.liveForecastReviewCsv([checkpoint], [], null);
      const cells = (line) => [...line.matchAll(/"((?:[^"]|"")*)"(?=,|$)/g)].map((match) => match[1].replace(/""/g, '"'));
      const [headings, row] = csv.trimEnd().split('\r\n').map(cells);
      return ['Classroom outdoor thermometer (°C)', 'Classroom measurement time (UTC)', 'Classroom reading last entered (UTC)', 'Classroom measurement at saved forecast site', 'Saved forecast minus classroom thermometer (°C)']
        .map((heading) => row[headings.indexOf(heading)]);
    }
    expect(readingColumns(saved)).toEqual(['25.3', validUtc, enteredUtc, 'true', '-1.3']);
    expect(readingColumns(forecast())).toEqual(['', '', '', '', '']);
  });

  it('preserves the entered Fahrenheit reading and converts before rounding either difference', () => {
    const snapshot = forecast();
    const before = structuredClone(snapshot);
    const result = checkEntered({ enteredValue: '67' }, snapshot);
    expect(result).toEqual({
      ok: true, differenceC: 4.6, differenceF: 8.2,
      reading: {
        schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F',
        temperatureC: (67 - 32) * 5 / 9, measuredAt: validUtc,
        recordedAt: enteredUtc, sameSite: true,
      },
    });
    expect(result.reading.temperatureC).toBeCloseTo(19.444444444444443, 12);
    expect(result.reading.temperatureC).not.toBe(19.4);
    expect(snapshot).toEqual(before);
  });

  it.each([
    [32, 'F', 0], [0, 'F', -160 / 9], [-4, 'F', -20], [-40, 'F', -40],
    [0, 'C', 0], [-40, 'C', -40], [32.1, 'F', 0.1 * 5 / 9],
    [-148, 'F', -100], [158, 'F', 70], [-100, 'C', -100], [70, 'C', 70],
  ])('accepts %s °%s as an explicit entered reading with canonical %s °C', (enteredValue, enteredUnit, expectedC) => {
    const result = checkEntered({ enteredValue, enteredUnit });
    expect(result.ok).toBe(true);
    expect(result.reading).toMatchObject({
      schema: 'weather-classroom-temperature-v2', enteredValue, enteredUnit,
      measuredAt: validUtc, recordedAt: enteredUtc, sameSite: true,
    });
    expect(result.reading.temperatureC).toBeCloseTo(expectedC, 12);
  });

  it('validates the entered unit and its precision without applying Celsius entry precision to converted values', () => {
    for (const enteredValue of [null, undefined, '', ' ', false, true, NaN, Infinity, {}, [], 67.01, -148.1, 158.1]) {
      expect(checkEntered({ enteredValue }).ok, `F value ${String(enteredValue)}`).toBe(false);
    }
    for (const enteredValue of [-100.1, 70.1, 12.34]) {
      expect(checkEntered({ enteredValue, enteredUnit: 'C' }).ok).toBe(false);
    }
    for (const enteredUnit of [null, undefined, '', 'f', '°F', 'K', false]) {
      expect(checkEntered({ enteredUnit }).ok, `unit ${String(enteredUnit)}`).toBe(false);
    }
    expect(checkEntered({ schema: 'weather-classroom-temperature-v2' }).ok).toBe(true);
    expect(checkEntered({ schema: 'weather-classroom-temperature-v1' }).ok).toBe(false);
    expect(checkEntered({ schema: 'unknown' }).ok).toBe(false);
    expect(checkEntered({ temperatureC: 19.4 }).ok).toBe(false);
    expect(checkEntered({ temperatureC: (67 - 32) * 5 / 9 }).ok).toBe(true);
    expect(check({ enteredUnit: 'F' }).ok).toBe(false);
    expect(check({ enteredValue: 32 }).ok).toBe(false);
  });

  it('retains site, forecast provenance, valid-time and recorded-time requirements for Fahrenheit', () => {
    for (const sameSite of [false, null, 'true']) expect(checkEntered({ sameSite }).ok).toBe(false);
    for (const measuredAt of ['2026-10-29T17:59Z', '2026-10-29T14:00', '', '2026-10-30T18:00Z']) {
      expect(checkEntered({ measuredAt }).ok).toBe(false);
    }
    expect(checkEntered({}, forecast(), '2026-10-29T17:59:59Z').ok).toBe(false);
    expect(checkEntered({}, forecast(), validUtc).ok).toBe(true);
    for (const changes of [
      { schema: undefined }, { predicted: { temperature: null } }, { sourceKind: 'observation' },
      { latitude: null }, { validTimestamp: Date.parse(validUtc) + 1 },
      { capturedAt: validUtc }, { retrievedAt: undefined },
    ]) expect(checkEntered({}, forecast(changes)).ok).toBe(false);
  });

  it('round-trips original units and unrounded Celsius through local JSON without leaking readings in redacted shares', () => {
    const reading = checkEntered().reading;
    const snapshot = forecast({ classroomReading: { ...reading, extra: 'private reading draft' }, learnerReasoning: 'Private site notes' });
    const data = { liveForecastCheckpoints: [snapshot] };
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(kernel.immersiveLocalWorkspacePayload(data))));
    expect(restored.liveForecastCheckpoints[0].classroomReading).toEqual(reading);
    expect(restored.liveForecastCheckpoints[0].predicted).toEqual(snapshot.predicted);
    expect(restored.liveForecastCheckpoints[0].learnerReasoning).toBe(snapshot.learnerReasoning);
    const included = kernel.immersiveSessionSharePayload(data, { includeLocation: true });
    expect(included.weatherSystems.liveForecastCheckpoints[0].classroomReading).toEqual(reading);
    const redacted = kernel.immersiveSessionSharePayload(data, { includeLocation: false });
    expect(JSON.stringify(redacted)).not.toMatch(/school-snapshot|School yard|classroomReading|enteredUnit|private reading|Private site notes/);
  });

  it('recomputes canonical Celsius on import and drops malformed or contradictory readings while preserving forecasts', () => {
    const reading = checkEntered().reading;
    const [withinTolerance] = kernel.normalizeLiveForecastCheckpoints([forecast({ classroomReading: { ...reading, temperatureC: reading.temperatureC + 5e-10 } })]);
    expect(withinTolerance.classroomReading).toEqual(reading);
    for (const patch of [
      { schema: 'unknown' }, { enteredUnit: undefined }, { enteredUnit: 'K' },
      { enteredValue: undefined }, { enteredValue: '' }, { enteredValue: false },
      { enteredValue: Infinity }, { enteredValue: 67.01 }, { temperatureC: undefined },
      { temperatureC: null }, { temperatureC: 19.4 }, { temperatureC: reading.temperatureC + 1e-7 },
      { sameSite: false }, { measuredAt: '2026-10-29T18:01Z' }, { recordedAt: '2026-10-29T17:59Z' },
    ]) {
      const [record] = kernel.normalizeLiveForecastCheckpoints([forecast({ classroomReading: { ...reading, ...patch } })]);
      expect(record.id).toBe('school-snapshot');
      expect(record.predicted.temperature).toBe(24);
      expect(record.classroomReading, JSON.stringify(patch)).toBeUndefined();
    }
    for (const patch of [{ enteredValue: 0 }, { enteredUnit: 'C' }]) {
      const [record] = kernel.normalizeLiveForecastCheckpoints([forecast({ classroomReading: { ...check().reading, ...patch } })]);
      expect(record.classroomReading).toBeUndefined();
      expect(record.predicted.temperature).toBe(24);
    }
  });

  it('exports original entered units alongside canonical Celsius and independently rounded Fahrenheit differences', () => {
    const saved = forecast({ classroomReading: checkEntered().reading });
    const text = kernel.liveForecastReviewText([saved], [], null);
    expect(text).toContain('67 °F');
    expect(text).toContain(String(saved.classroomReading.temperatureC));
    expect(text).toMatch(/\+?4\.6\s*°C/);
    expect(text).toMatch(/\+?8\.2\s*°F/);
    expect(text).not.toMatch(/8\.3\s*°F/);
    const fields = csvFields(saved);
    expect(fields['Classroom reading schema']).toBe('weather-classroom-temperature-v2');
    expect(fields['Classroom entered thermometer value']).toBe('67');
    expect(fields['Classroom entered thermometer unit']).toBe('F');
    expect(Number(fields['Classroom outdoor thermometer (°C)'])).toBe(saved.classroomReading.temperatureC);
    expect(fields['Saved forecast minus classroom thermometer (°C)']).toBe('4.6');
    expect(fields['Saved forecast minus classroom thermometer (°F)']).toBe('8.2');
    const legacy = csvFields(forecast({ classroomReading: check({ temperatureC: 0 }).reading }));
    expect(legacy['Classroom reading schema']).toBe('weather-classroom-temperature-v1');
    expect(legacy['Classroom entered thermometer value']).toBe('0');
    expect(legacy['Classroom entered thermometer unit']).toBe('C');
    const blank = csvFields(forecast());
    for (const heading of ['Classroom reading schema', 'Classroom entered thermometer value', 'Classroom entered thermometer unit', 'Saved forecast minus classroom thermometer (°F)']) {
      expect(blank[heading]).toBe('');
    }
  });
});

describe('Classroom thermometer change and Undo', () => {
  const input = (enteredValue = 67, enteredUnit = 'F') => ({ enteredValue, enteredUnit, measuredAt: validUtc, sameSite: true });
  const change = (checkpoints, reading = input(), id = 'school-snapshot', recordedAt = enteredUtc) =>
    kernel.classroomThermometerChange(checkpoints, id, reading, recordedAt);
  const onlyForecast = (checkpoint) => {
    const copy = structuredClone(checkpoint);
    delete copy.classroomReading;
    return copy;
  };

  it('undoes a first save by removing only the reading and leaves caller data unchanged', () => {
    const checkpoints = [forecast({ learnerReasoning: 'Keep this original explanation.' })];
    const before = structuredClone(checkpoints);
    const saved = change(checkpoints);
    expect(saved).toMatchObject({ ok: true, changed: true });
    expect(saved.undo).toMatchObject({
      schema: 'weather-classroom-thermometer-undo-v1', checkpointId: 'school-snapshot', beforeReading: null,
    });
    expect(saved.undo.afterCheckpointKey).toEqual(expect.any(String));
    expect(saved.undo.afterCheckpointKey.length).toBeGreaterThan(0);
    expect(saved.checkpoints[0].classroomReading).toEqual(checkEntered().reading);
    expect(onlyForecast(saved.checkpoints[0])).toEqual(before[0]);
    expect(checkpoints).toEqual(before);
    const afterSave = structuredClone(saved.checkpoints);
    const undone = kernel.classroomThermometerUndo(saved.checkpoints, saved.undo);
    expect(undone.ok).toBe(true);
    expect(undone.checkpoints).toEqual(before);
    expect(saved.checkpoints).toEqual(afterSave);
  });

  it('restores the exact original Fahrenheit value, precision and recording time after a correction', () => {
    const original = forecast({ classroomReading: checkEntered().reading, learnerReasoning: 'Do not replace my forecast.' });
    const saved = change([original], input(68), 'school-snapshot', '2026-10-29T18:10:00.000Z');
    expect(saved).toMatchObject({ ok: true, changed: true });
    expect(saved.checkpoints[0].classroomReading).toMatchObject({ enteredValue: 68, enteredUnit: 'F', temperatureC: 20 });
    expect(saved.undo.beforeReading).toEqual(original.classroomReading);
    expect(onlyForecast(saved.checkpoints[0])).toEqual(onlyForecast(original));
    const undone = kernel.classroomThermometerUndo(saved.checkpoints, saved.undo);
    expect(undone.ok).toBe(true);
    expect(undone.checkpoints).toEqual([original]);
    expect(undone.checkpoints[0].classroomReading.temperatureC).toBe((67 - 32) * 5 / 9);
    expect(undone.checkpoints[0].classroomReading.recordedAt).toBe(enteredUtc);
  });

  it('restores a cleared reading without changing the original prediction, notes or provenance', () => {
    const original = forecast({ classroomReading: checkEntered().reading, learnerReasoning: 'Keep notes too.' });
    const cleared = change([original], null);
    expect(cleared).toMatchObject({ ok: true, changed: true });
    expect(cleared.checkpoints[0].classroomReading).toBeUndefined();
    expect(cleared.undo.beforeReading).toEqual(original.classroomReading);
    expect(onlyForecast(cleared.checkpoints[0])).toEqual(onlyForecast(original));
    const restored = kernel.classroomThermometerUndo(cleared.checkpoints, cleared.undo);
    expect(restored.ok).toBe(true);
    expect(restored.checkpoints).toEqual([original]);
  });

  it('restores legacy Celsius zero exactly across an equivalent-temperature correction under the same clock', () => {
    const original = forecast({ classroomReading: check({ temperatureC: 0 }).reading });
    const saved = change([original], input(32));
    expect(saved).toMatchObject({ ok: true, changed: true });
    expect(saved.checkpoints[0].classroomReading).toMatchObject({
      schema: 'weather-classroom-temperature-v2', enteredValue: 32, enteredUnit: 'F',
      temperatureC: 0, recordedAt: enteredUtc,
    });
    expect(saved.undo.beforeReading).toEqual(original.classroomReading);
    const undone = kernel.classroomThermometerUndo(saved.checkpoints, saved.undo);
    expect(undone.ok).toBe(true);
    expect(undone.checkpoints).toEqual([original]);
    expect(undone.checkpoints[0].classroomReading).not.toHaveProperty('enteredUnit');
  });

  it('does not manufacture a new Undo receipt for invalid or unchanged actions', () => {
    const original = forecast({ classroomReading: checkEntered().reading });
    for (const result of [
      change([original], input()),
      change([forecast()], null),
      change([original], { ...input(), sameSite: false }),
      change([original], { ...input(), enteredValue: 'invalid' }),
      change([original], input(), 'missing-card'),
    ]) {
      expect(result.changed).toBe(false);
      expect(result.undo).toBeNull();
    }
    expect(change([original], input()).ok).toBe(true);
    expect(change([forecast()], null).ok).toBe(true);
    expect(change([original], { ...input(), sameSite: false }).ok).toBe(false);
    expect(change([original], input(), 'missing-card').ok).toBe(false);
    expect(original.classroomReading).toEqual(checkEntered().reading);
  });

  it('preserves the last reading time and useful Undo after an unchanged later-clock submission', () => {
    const original = forecast({ classroomReading: checkEntered().reading });
    const input = { enteredValue: 68, enteredUnit: 'F', measuredAt: validUtc, sameSite: true };
    const corrected = kernel.classroomThermometerChange([original], original.id, input, '2026-10-29T18:10:00.000Z');
    expect(corrected.changed).toBe(true);
    const same = kernel.classroomThermometerChange(corrected.checkpoints, original.id, input, '2026-10-29T18:11:00.000Z');
    expect(same).toMatchObject({ ok: true, changed: false, undo: null });
    expect(same.checkpoints).toEqual(corrected.checkpoints);
    expect(same.checkpoints[0].classroomReading.recordedAt).toBe('2026-10-29T18:10:00.000Z');
    const undone = kernel.classroomThermometerUndo(same.checkpoints, corrected.undo);
    expect(undone.ok).toBe(true);
    expect(undone.checkpoints[0].classroomReading).toEqual(original.classroomReading);
  });

  it('rejects a receipt when any normalized target forecast or reading field changed after the action', () => {
    const saved = change([forecast({ learnerReasoning: 'Original notes' })]);
    for (const patch of [
      { predicted: { temperature: 25 } }, { learnerReasoning: 'New notes' },
      { timelineEvidence: 'A newly attached hour comparison' }, { location: 'Different yard' },
      { latitude: 41 }, { retrievedAt: '2026-10-29T16:02Z' }, { capturedAt: '2026-10-29T16:06Z' },
      { classroomReading: checkEntered({ enteredValue: 68 }).reading },
    ]) {
      const current = [{ ...saved.checkpoints[0], ...patch }];
      const before = structuredClone(current);
      const undone = kernel.classroomThermometerUndo(current, saved.undo);
      expect(undone.ok, JSON.stringify(patch)).toBe(false);
      expect(undone.checkpoints).toEqual(kernel.normalizeLiveForecastCheckpoints(current));
      expect(current).toEqual(before);
    }
    const missing = kernel.classroomThermometerUndo([], saved.undo);
    expect(missing.ok).toBe(false);
    expect(missing.checkpoints).toEqual([]);
    const replaced = [forecast({ id: 'replacement-card', classroomReading: saved.checkpoints[0].classroomReading })];
    expect(kernel.classroomThermometerUndo(replaced, saved.undo).ok).toBe(false);
  });

  it('restores only the target reading and preserves an unrelated card edited afterward', () => {
    const other = forecast({ id: 'second-card', location: 'Field site', latitude: 41, learnerReasoning: 'Original second notes' });
    const saved = change([forecast(), other]);
    const current = saved.checkpoints.map((checkpoint) => checkpoint.id === other.id
      ? { ...checkpoint, learnerReasoning: 'Edited second notes', predicted: { temperature: 17 } } : checkpoint);
    const undone = kernel.classroomThermometerUndo(current, saved.undo);
    expect(undone.ok).toBe(true);
    expect(undone.checkpoints[0].classroomReading).toBeUndefined();
    expect(undone.checkpoints[1]).toEqual(current[1]);
  });

  it('rejects malformed receipts and invalid prior readings instead of applying them', () => {
    const corrected = change([forecast({ classroomReading: checkEntered().reading })], input(68));
    for (const receipt of [
      null, {}, { ...corrected.undo, schema: 'unknown' }, { ...corrected.undo, checkpointId: '' },
      { ...corrected.undo, afterCheckpointKey: 'stale' }, { ...corrected.undo, afterCheckpointKey: null },
      { ...corrected.undo, beforeReading: { ...corrected.undo.beforeReading, enteredUnit: 'K' } },
      { ...corrected.undo, beforeReading: { ...corrected.undo.beforeReading, temperatureC: 999 } },
      { ...corrected.undo, beforeReading: { ...corrected.undo.beforeReading, sameSite: false } },
    ]) {
      const undone = kernel.classroomThermometerUndo(corrected.checkpoints, receipt);
      expect(undone.ok).toBe(false);
      expect(undone.checkpoints).toEqual(corrected.checkpoints);
    }
  });

  it('never includes Undo recovery state in local/session/share payloads or reports', () => {
    const saved = change([forecast({ classroomReading: checkEntered().reading })], input(68));
    const data = {
      liveForecastCheckpoints: saved.checkpoints,
      classroomThermometerUndo: saved.undo, classroomThermometerUndoReceipt: saved.undo,
    };
    const outputs = [
      kernel.immersiveLocalWorkspacePayload(data), kernel.immersiveSessionDownloadPayload(data),
      kernel.immersiveSessionSharePayload(data, { includeLocation: true }),
      kernel.immersiveSessionSharePayload(data, { includeLocation: false }),
      kernel.liveForecastReviewText(saved.checkpoints, [], null),
      kernel.liveForecastReviewCsv(saved.checkpoints, [], null),
    ];
    for (const output of outputs) {
      expect(typeof output === 'string' ? output : JSON.stringify(output))
        .not.toMatch(/weather-classroom-thermometer-undo-v1|afterCheckpointKey|beforeReading|classroomThermometerUndo/);
    }
    const reopened = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(outputs[0])));
    expect(reopened.liveForecastCheckpoints).toEqual(saved.checkpoints);
    expect(reopened.classroomThermometerUndo).toBeUndefined();
    expect(reopened.classroomThermometerUndoReceipt).toBeUndefined();
  });
});
