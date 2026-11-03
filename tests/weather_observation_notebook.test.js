import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.WEATHER_NOTEBOOK_SOURCE || 'stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function row(index = 0, patch = {}) {
  return {
    schema: 'weather-observation-v1', id: `row-${index}`, stationId: 'central', station: 'Central School',
    scenarioName: 'Approaching Cold Front', contextKey: 'original-model-setup', hour: index % 25,
    temperature: 17.8, dewPoint: 10.4, humidity: 61, pressure: 1013.3,
    windSpeed: 39, windDir: 300, wind: 'NW 39 km/h', cloudCover: 48, precipPotential: 56, precipType: 'rain',
    modelState: { scenario: 'coldFront', simHour: index % 25, temp: 25, humidity: 72, pressure: 1008, windSpeed: 24, windDir: 220, frontSpeed: 36, instability: 68, terrain: 25 },
    createdAt: '2026-10-29T12:05:00.000Z', note: `Original saved note ${index}.`, ...patch,
  };
}

function notebook(count = 2) {
  const log = Array.from({ length: count }, (_, index) => row(index));
  return {
    observationLog: log, observationCompareFrom: log[0]?.id || '',
    observationCompareTo: log[log.length - 1]?.id || '', observationNote: 'Keep the explanation and selected comparison.',
  };
}

describe('Interactive weather observation notebook preservation', () => {
  it('keeps the original row on duplicate log attempts instead of replacing its evidence or notes', () => {
    const log = [row(0), row(1)], before = structuredClone(log);
    const duplicate = row(0, { temperature: 99, note: 'A duplicate must not replace original notes.' });
    const result = kernel.appendWeatherObservationLog(log, [duplicate]);
    expect(result).toMatchObject({ ok: true, changed: false, code: 'duplicate', added: 0 });
    expect(result.log).toEqual(before);
    expect(log).toEqual(before);
    expect(result.log[0].note).toBe('Original saved note 0.');
  });

  it('rejects a distinct twenty-fifth observation without evicting existing records', () => {
    const log = Array.from({ length: 24 }, (_, index) => row(index));
    const before = structuredClone(log);
    const result = kernel.appendWeatherObservationLog(log, [row(24)]);
    expect(result).toMatchObject({ ok: false, changed: false, code: 'capacity', added: 0 });
    expect(result.log).toEqual(before);
    expect(log).toEqual(before);
    expect(result.message).toMatch(/24|full|clear|download/i);
  });

  it('makes network logging atomic when three missing records cannot fit in one remaining space', () => {
    const log = Array.from({ length: 23 }, (_, index) => row(index));
    const candidates = [row(23), row(24), row(25)];
    const result = kernel.appendWeatherObservationLog(log, candidates);
    expect(result).toMatchObject({ ok: false, changed: false, code: 'capacity', added: 0 });
    expect(result.log).toEqual(log);
    expect(result.log.some((entry) => candidates.some((incoming) => incoming.id === entry.id))).toBe(false);
  });

  it('adds only two missing network identities at twenty-two records, retaining original duplicates', () => {
    const log = Array.from({ length: 22 }, (_, index) => row(index));
    const result = kernel.appendWeatherObservationLog(log, [
      row(0, { note: 'Overwrite forbidden' }), row(21), row(22), row(23), row(22, { temperature: -40 }),
    ]);
    expect(result).toMatchObject({ ok: true, changed: true, code: 'added', added: 2 });
    expect(result.log).toHaveLength(24);
    expect(result.log.slice(0, 22)).toEqual(log);
    expect(result.log.slice(-2)).toEqual([row(22), row(23)]);
    expect(log).toHaveLength(22);
  });

  it('uses the latest queued log for a second addition without losing independently recorded work', () => {
    const first = kernel.appendWeatherObservationLog([row(0)], [row(1)]);
    const second = kernel.appendWeatherObservationLog(first.log, [row(2)]);
    expect(first).toMatchObject({ ok: true, changed: true, added: 1 });
    expect(second).toMatchObject({ ok: true, changed: true, added: 1 });
    expect(second.log).toEqual([row(0), row(1), row(2)]);
    const duplicate = kernel.appendWeatherObservationLog(second.log, [row(0), row(1), row(2)]);
    expect(duplicate).toMatchObject({ ok: true, changed: false, code: 'duplicate', added: 0, log: second.log });
  });

  it('checks duplicates before a full-capacity failure and rejects batches with no usable candidate', () => {
    const log = Array.from({ length: 24 }, (_, index) => row(index));
    expect(kernel.appendWeatherObservationLog(log, [row(0), row(1)]))
      .toMatchObject({ ok: true, changed: false, code: 'duplicate', added: 0, log });
    for (const candidates of [null, [], [null, {}, [], row(30, { station: '' })], [row(30, { hour: 25 })]]) {
      expect(kernel.appendWeatherObservationLog(log, candidates)).toMatchObject({ ok: false, changed: false, code: 'invalid', added: 0, log });
    }
  });

  it('rejects a mixed valid and invalid network batch atomically rather than saving a partial network', () => {
    const log = [row(0), row(1)], before = structuredClone(log);
    for (const candidates of [
      [row(2), null], [row(2), row(3, { station: '' })],
      [row(2), row(3, { hour: 25 })], [row(2), { schema: 'unknown', id: 'bad' }],
    ]) {
      const result = kernel.appendWeatherObservationLog(log, candidates);
      expect(result).toMatchObject({ ok: false, changed: false, code: 'invalid', added: 0 });
      expect(result.log).toEqual(before);
      expect(log).toEqual(before);
    }
  });

  it('clears and restores the complete notebook including exact recorded rows, explanation and selected pair', () => {
    const original = notebook(3), before = structuredClone(original);
    const cleared = kernel.clearWeatherObservationNotebook(original);
    expect(cleared).toMatchObject({ ok: true, changed: true });
    expect(cleared.patch).toEqual({ observationLog: [], observationCompareFrom: '', observationCompareTo: '', observationNote: '' });
    expect(cleared.receipt).toMatchObject({ schema: 'weather-observation-notebook-clear-v1', notebook: before });
    expect(cleared.receipt.afterNotebookKey).toEqual(expect.any(String));
    expect(original).toEqual(before);
    const restored = kernel.restoreClearedWeatherObservationNotebook({ ...original, ...cleared.patch }, cleared.receipt);
    expect(restored).toMatchObject({ ok: true, changed: true, patch: before });
    expect(restored.patch.observationLog[0].createdAt).toBe(original.observationLog[0].createdAt);
    const repeated = kernel.restoreClearedWeatherObservationNotebook({ ...original, ...restored.patch }, cleared.receipt);
    expect(repeated.ok).toBe(false);
    expect(repeated.changed).toBe(false);
  });

  it('will not restore a cleared notebook over newer observations, explanation or selection', () => {
    const original = notebook(), cleared = kernel.clearWeatherObservationNotebook(original);
    for (const patch of [
      { observationLog: [row(9)] }, { observationNote: 'New independent explanation.' },
      { observationCompareFrom: 'new-from' }, { observationCompareTo: 'new-to' },
    ]) {
      const latest = { ...cleared.patch, ...patch }, before = structuredClone(latest);
      const result = kernel.restoreClearedWeatherObservationNotebook(latest, cleared.receipt);
      expect(result).toMatchObject({ ok: false, changed: false, patch: {} });
      expect(latest).toEqual(before);
    }
  });

  it('does not let unrelated view changes block restoration and normalizes bounded prior prose', () => {
    const original = notebook(), cleared = kernel.clearWeatherObservationNotebook(original);
    const latest = { ...cleared.patch, tab: 'forecast', simHour: 12, observationStatus: 'View changed' };
    expect(kernel.restoreClearedWeatherObservationNotebook(latest, cleared.receipt)).toMatchObject({ ok: true, changed: true, patch: original });
    const long = kernel.clearWeatherObservationNotebook({ ...original, observationNote: '\u0000' + 'x'.repeat(1700) });
    expect(long.receipt.notebook.observationNote).toBe('x'.repeat(1500));
    const empty = kernel.clearWeatherObservationNotebook({ observationLog: [], observationNote: '', observationCompareFrom: '', observationCompareTo: '' });
    expect(empty).toMatchObject({ ok: true, changed: false, patch: {}, receipt: null });
  });

  it('rejects malformed recovery receipts without applying any patch', () => {
    const cleared = kernel.clearWeatherObservationNotebook(notebook());
    for (const receipt of [null, {}, { ...cleared.receipt, schema: 'unknown' },
      { ...cleared.receipt, notebook: null }, { ...cleared.receipt, afterNotebookKey: 'stale' }]) {
      expect(kernel.restoreClearedWeatherObservationNotebook(cleared.patch, receipt))
        .toMatchObject({ ok: false, changed: false, patch: {} });
    }
  });

  it('keeps normalization/import last-twenty-four behavior and legacy records unchanged', () => {
    const imported = Array.from({ length: 27 }, (_, index) => row(index));
    expect(kernel.normalizeWeatherObservationLog(imported)).toEqual(imported.slice(-24));
    const legacy = { id: 'legacy', station: 'Old school', hour: 0, temperature: 0, note: 'Legacy evidence' };
    const appended = kernel.appendWeatherObservationLog([], [legacy]);
    expect(appended).toMatchObject({ ok: true, changed: true, log: [legacy] });
    expect(appended.log[0].schema).toBeUndefined();
    const local = kernel.immersiveLocalWorkspacePayload({ observationLog: imported });
    expect(kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(local))).observationLog).toEqual(imported.slice(-24));
  });

  it('exports original rows and never serializes the clear-log Undo receipt in any supported payload', () => {
    const original = notebook(3), cleared = kernel.clearWeatherObservationNotebook(original);
    const restored = kernel.restoreClearedWeatherObservationNotebook(cleared.patch, cleared.receipt).patch;
    const data = { ...restored, observationNotebookUndo: cleared.receipt, observationLogUndo: cleared.receipt };
    const outputs = [kernel.immersiveLocalWorkspacePayload(data), kernel.immersiveSessionDownloadPayload(data),
      kernel.immersiveSessionSharePayload(data, { includeLocation: true }), kernel.immersiveSessionSharePayload(data, { includeLocation: false }),
      kernel.observationJournalCsv(data.observationLog)];
    for (const output of outputs) expect(typeof output === 'string' ? output : JSON.stringify(output))
      .not.toMatch(/weather-observation-notebook-clear-v1|afterNotebookKey|observationNotebookUndo|observationLogUndo/);
    const saved = kernel.validateImmersiveSessionPayload(JSON.parse(JSON.stringify(outputs[1])));
    expect(saved.observationLog).toEqual(original.observationLog);
    expect(saved.observationNote).toBe(original.observationNote);
    expect(saved.observationCompareFrom).toBe(original.observationCompareFrom);
    expect(saved.observationCompareTo).toBe(original.observationCompareTo);
    const csv = outputs[4];
    expect(csv.trimEnd().split('\r\n')).toHaveLength(4);
    for (const entry of original.observationLog) {
      expect(csv).toContain(entry.id);
      expect(csv).toContain(entry.createdAt);
      expect(csv).toContain(entry.note);
    }
  });
});
