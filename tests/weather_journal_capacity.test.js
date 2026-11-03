import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.WEATHER_CAPACITY_SOURCE || 'stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

const validUtc = '2026-10-29T18:00:00.000Z';
const reading = {
  schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F',
  temperatureC: (67 - 32) * 5 / 9, measuredAt: validUtc,
  recordedAt: '2026-10-29T18:05:00.000Z', sameSite: true,
};

function checkpoint(id, patch = {}) {
  return {
    schema: 'weather-live-checkpoint-v2', id, location: 'Synthetic school yard',
    source: 'Open-Meteo', sourceKind: 'model', latitude: 40, longitude: -75,
    retrievedAt: '2026-10-29T16:01Z', capturedAt: '2026-10-29T16:05Z',
    currentDataAt: '2026-10-29T12:00', validAt: '2026-10-29T14:00',
    validTimestamp: Date.parse(validUtc), timezone: 'EDT', utcOffsetSeconds: -14400,
    predicted: { temperature: 24 }, ...patch,
  };
}

function journal(count = 8) {
  return Array.from({ length: count }, (_, index) => checkpoint(`saved-${index}`, {
    learnerReasoning: `Keep original note ${index}.`, timelineEvidence: `Original evidence ${index}.`,
    classroomReading: { ...reading },
  }));
}

describe('Interactive live forecast journal capacity', () => {
  it('blocks a ninth distinct save without evicting any original reading, note or forecast', () => {
    const saved = journal();
    const before = structuredClone(saved);
    const incoming = checkpoint('ninth');
    const incomingBefore = structuredClone(incoming);
    const result = kernel.appendLiveForecastCheckpoint(saved, incoming);
    expect(result).toMatchObject({ ok: false, changed: false, code: 'capacity' });
    expect(result.message).toMatch(/eight|8|full|remove/i);
    expect(result.checkpoints).toEqual(before);
    expect(saved).toEqual(before);
    expect(incoming).toEqual(incomingBefore);
    for (let index = 0; index < 8; index += 1) {
      expect(result.checkpoints[index].classroomReading).toEqual(reading);
      expect(result.checkpoints[index].learnerReasoning).toBe(`Keep original note ${index}.`);
      expect(result.checkpoints[index].timelineEvidence).toBe(`Original evidence ${index}.`);
    }
  });

  it('checks duplicate identity before capacity and keeps the first saved version unchanged', () => {
    const saved = journal();
    const incoming = checkpoint('saved-0', {
      predicted: { temperature: 50 }, learnerReasoning: 'Do not replace the original.',
      classroomReading: { ...reading, enteredValue: 68, temperatureC: 20 },
    });
    const result = kernel.appendLiveForecastCheckpoint(saved, incoming);
    expect(result).toMatchObject({ ok: true, changed: false, code: 'duplicate' });
    expect(result.checkpoints).toEqual(saved);
    expect(result.checkpoints[0].predicted.temperature).toBe(24);
    expect(result.checkpoints[0].classroomReading.enteredValue).toBe(67);
  });

  it('appends below eight without changing the previous entries or caller arrays', () => {
    const saved = journal(7), before = structuredClone(saved), incoming = checkpoint('eighth');
    const result = kernel.appendLiveForecastCheckpoint(saved, incoming);
    expect(result).toMatchObject({ ok: true, changed: true, code: 'saved' });
    expect(result.checkpoints).toHaveLength(8);
    expect(result.checkpoints.slice(0, 7)).toEqual(before);
    expect(result.checkpoints[7]).toEqual(incoming);
    expect(saved).toEqual(before);
  });

  it('accepts a valid wind-only forecast instead of requiring a temperature measurement', () => {
    const incoming = checkpoint('wind-only', { predicted: { windSpeed: 7, windDir: 0 } });
    const result = kernel.appendLiveForecastCheckpoint([], incoming);
    expect(result).toMatchObject({ ok: true, changed: true, code: 'saved' });
    expect(result.checkpoints[0].predicted).toEqual({ windSpeed: 7, windDir: 0 });
    expect(result.checkpoints[0].predicted.temperature).toBeUndefined();
  });

  it('rejects malformed new entries and incompatible provenance while retaining existing entries', () => {
    const saved = journal(3);
    for (const incoming of [
      null, [], {}, checkpoint(' '), checkpoint('new', { schema: 'unknown' }),
      checkpoint('new', { latitude: null }), checkpoint('new', { predicted: { temperature: null } }),
      checkpoint('new', { source: 'Other source' }), checkpoint('new', { sourceKind: 'observation' }),
      checkpoint('new', { capturedAt: validUtc }), checkpoint('new', { retrievedAt: undefined }),
      checkpoint('new', { validTimestamp: Date.parse(validUtc) + 1 }),
    ]) {
      const result = kernel.appendLiveForecastCheckpoint(saved, incoming);
      expect(result, JSON.stringify(incoming)).toMatchObject({ ok: false, changed: false, code: 'invalid' });
      expect(result.checkpoints).toEqual(saved);
    }
  });

  it('evaluates the latest seven-to-eight boundary and rejects a second queued distinct save', () => {
    const original = journal(7);
    const first = kernel.appendLiveForecastCheckpoint(original, checkpoint('eighth'));
    const second = kernel.appendLiveForecastCheckpoint(first.checkpoints, checkpoint('ninth'));
    expect(first).toMatchObject({ ok: true, changed: true, code: 'saved' });
    expect(second).toMatchObject({ ok: false, changed: false, code: 'capacity' });
    expect(second.checkpoints).toEqual(first.checkpoints);
    expect(second.checkpoints.map((entry) => entry.id)).toEqual([...original.map((entry) => entry.id), 'eighth']);
    expect(original).toHaveLength(7);
  });

  it('restores a removed entry below capacity with its exact saved reading and notes', () => {
    const saved = journal();
    const removed = saved[2];
    const remaining = saved.filter((entry) => entry.id !== removed.id);
    const result = kernel.restoreLiveForecastCheckpoint(remaining, removed);
    expect(result).toMatchObject({ ok: true, changed: true, code: 'restored' });
    expect(result.checkpoints).toHaveLength(8);
    expect(result.checkpoints.find((entry) => entry.id === removed.id)).toEqual(removed);
    expect(result.checkpoints.filter((entry) => entry.id !== removed.id)).toEqual(remaining);
    expect(remaining).toHaveLength(7);
    expect(removed.classroomReading).toEqual(reading);
  });

  it('never overwrites an existing identity or evicts another entry while restoring', () => {
    const saved = journal();
    const duplicate = { ...saved[0], learnerReasoning: 'An older removed version', predicted: { temperature: 99 } };
    const repeated = kernel.restoreLiveForecastCheckpoint(saved, duplicate);
    expect(repeated).toMatchObject({ ok: true, changed: false, code: 'duplicate' });
    expect(repeated.checkpoints).toEqual(saved);
    const blocked = kernel.restoreLiveForecastCheckpoint(saved, checkpoint('removed-ninth'));
    expect(blocked).toMatchObject({ ok: false, changed: false, code: 'capacity' });
    expect(blocked.checkpoints).toEqual(saved);
  });

  it('restores valid legacy entries without inventing modern provenance and rejects unusable removals', () => {
    const legacy = {
      id: 'legacy', location: 'Saved legacy site', latitude: 0, longitude: 0,
      validAt: '2026-07-25T14:00', issuedAt: '2026-07-25T12:00', predicted: { temperature: 0 },
      learnerReasoning: 'Original legacy note',
    };
    const result = kernel.restoreLiveForecastCheckpoint([], legacy);
    expect(result).toMatchObject({ ok: true, changed: true, code: 'restored' });
    expect(result.checkpoints).toEqual([legacy]);
    expect(result.checkpoints[0]).not.toHaveProperty('schema');
    expect(result.checkpoints[0]).not.toHaveProperty('retrievedAt');
    for (const removed of [null, [], {}, { ...legacy, id: '' }, { ...legacy, latitude: null }]) {
      expect(kernel.restoreLiveForecastCheckpoint([checkpoint('current')], removed))
        .toMatchObject({ ok: false, changed: false, code: 'invalid', checkpoints: [checkpoint('current')] });
    }
  });

  it('leaves import normalization at its existing last-eight policy', () => {
    const imported = journal(11);
    const normalized = kernel.normalizeLiveForecastCheckpoints(imported);
    expect(normalized).toEqual(imported.slice(-8));
    const local = kernel.immersiveLocalWorkspacePayload({ liveForecastCheckpoints: imported });
    const reopened = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(local)));
    expect(reopened.liveForecastCheckpoints).toEqual(imported.slice(-8));
  });

  it('exports all eight preserved original entries after a blocked ninth save', () => {
    const saved = journal();
    const result = kernel.appendLiveForecastCheckpoint(saved, checkpoint('ninth'));
    const text = kernel.liveForecastReviewText(result.checkpoints, [], null);
    const csv = kernel.liveForecastReviewCsv(result.checkpoints, [], null);
    expect(csv.trimEnd().split('\r\n')).toHaveLength(9);
    for (let index = 0; index < 8; index += 1) {
      expect(text).toContain(`Keep original note ${index}.`);
      expect(csv).toContain(`Keep original note ${index}.`);
      expect(text).toContain(`Original evidence ${index}.`);
    }
    expect(text).toContain('67 °F');
    expect(csv).toContain('Classroom entered thermometer unit');
    expect(result.checkpoints).toEqual(saved);
  });
});
