import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
function colony(extra = {}) {
  return { ...BH.bhCreateNewColonyState(777, 3, 0), day: 12,
    history: [{ d: 6, w: 12001, h: 21.125, v: 0, m: 82 }, { d: 12, w: 12235, h: 18.5, v: 2 }],
    notebook: { beekeeper: { evidence: 'My original evidence. ', explanation: 'An explanation.', review: { evidence: true, explanation: true } }, drone: { evidence: 'Flight notes.' }, synthesis: 'Connections.' }, ...extra };
}
function record(id, day, extra = {}) {
  return { id, source: 'daily-history', day, savedOnDay: 12, runSerial: 3, simulationSeed: 777,
    modelVersion: 'colony-daily-1.2', metrics: { workers: 12001, food: 21.125, mites: 0, stability: 82 }, ...extra };
}
function records(value) { return value.notebook.colonyObservations.entries; }

describe('Saved colony observation integrity', () => {
  it('normalizes a display-safe copy, preserves actual zero, and does not invent missing provenance', () => {
    const raw = Object.freeze({ ...record(1, 6), savedOnDay: 2, runSerial: undefined, simulationSeed: '777', modelVersion: '',
      metrics: Object.freeze({ workers: 0, food: 21.125, mites: '0', stability: 101 }) });
    expect(BH.bhNormalizeColonyObservation(raw)).toEqual({ id: 1, source: 'daily-history', day: 6, savedOnDay: null,
      runSerial: null, simulationSeed: null, modelVersion: null, metrics: { workers: 0, food: 21.125, mites: null, stability: null } });
    for (const value of [null, [], { ...record(1, 6), day: -1 }, { ...record(1, 6), id: 1.5 }, { ...record(1, 6), source: 'live' }]) {
      expect(BH.bhNormalizeColonyObservation(value)).toBeNull();
    }
  });

  it('retains imported valid records above the new-save limit and replaces a whole duplicate without reviving old values', () => {
    const entries = Array.from({ length: 13 }, (_, index) => record(index + 1, index));
    entries.push({ ...record(1, 0), metrics: {} }, null);
    const result = BH.bhNormalizeColonyObservations({ schemaVersion: 1, nextId: 2, entries });
    expect(result.entries).toHaveLength(13);
    expect(result.nextId).toBe(14);
    expect(result.entries[0].metrics).toEqual({ workers: null, food: null, mites: null, stability: null });
    expect(BH.bhNormalizeColonyObservations(result)).toEqual(result);
  });

  it('captures the recorded checkpoint, not live fields, and refuses empty or future measurements', () => {
    const state = colony({ workers: 90000, honey: 600, morale: 100, varroaLevel: 98 });
    expect(BH.bhCreateColonyObservation(state, 6)).toMatchObject({ day: 6, savedOnDay: 12,
      metrics: { workers: 12001, food: 21.125, mites: 0, stability: 82 } });
    expect(BH.bhCreateColonyObservation(state, 12).metrics.stability).toBeNull();
    expect(BH.bhCreateColonyObservation(state, 13)).toBeNull();
    expect(BH.bhCreateColonyObservation(colony({ history: [{ d: 6 }] }), 6)).toBeNull();
    expect(BH.bhCreateColonyObservation(colony({ history: [{ d: 6, h: 0 }] }), 6).metrics.food).toBe(0);
  });

  it('saves without changing writing, model inputs, random state, history or the source object', () => {
    const state = colony(), before = JSON.stringify(state), candidate = BH.bhCreateColonyObservation(state, 6);
    const saved = BH.bhSaveColonyObservation(state, candidate);
    expect(saved.status).toBe('saved'); expect(records(saved.state)).toHaveLength(1);
    expect(JSON.stringify(state)).toBe(before);
    expect(saved.state.history).toBe(state.history);
    expect(saved.state.notebook.beekeeper).toBe(state.notebook.beekeeper);
    expect(saved.state.notebook.drone).toBe(state.notebook.drone);
    expect({ ...saved.state, notebook: state.notebook }).toEqual(state);
    state.history[0].h = 99;
    expect(records(saved.state)[0].metrics.food).toBe(21.125);
  });

  it('rejects stale candidates, makes repeated capture idempotent and never evicts at capacity', () => {
    const state = colony(), candidate = BH.bhCreateColonyObservation(state, 6);
    const saved = BH.bhSaveColonyObservation(state, candidate).state;
    expect(BH.bhSaveColonyObservation(saved, candidate)).toEqual({ state: saved, status: 'duplicate' });
    expect(BH.bhSaveColonyObservation({ ...state, simulationSeed: 888 }, candidate).status).toBe('changed');
    expect(BH.bhSaveColonyObservation({ ...state, history: [{ d: 6, h: 99 }] }, candidate).status).toBe('changed');
    const full = colony({ notebook: { colonyObservations: { schemaVersion: 1, nextId: 13,
      entries: Array.from({ length: 12 }, (_, index) => record(index + 1, index, { simulationSeed: 222 })) } } });
    expect(BH.bhSaveColonyObservation(full, candidate)).toEqual({ state: full, status: 'full' });
  });

  it('orders snapshots chronologically and leaves a missing endpoint delta unavailable', () => {
    const before = record(1, 6), after = record(2, 12, { metrics: { workers: 12235, food: 18.5, mites: 0, stability: null } });
    const comparison = BH.bhCompareColonyObservations(after, before);
    expect(comparison).toMatchObject({ ok: true, elapsedDays: 6, before: { day: 6 }, after: { day: 12 } });
    expect(comparison.metrics.map(metric => [metric.id, metric.delta])).toEqual([['workers', 234], ['food', -2.625], ['mites', 0], ['stability', null]]);
    const text = BH.bhColonyObservationComparisonText(comparison);
    expect(text).toContain('Workers: 12001 workers → 12235 workers; Increased 234 workers.');
    expect(text).toContain('Colony stability: 82 points → Unavailable; Unavailable.');
    expect(text).toContain('seed 777'); expect(text).toContain('do not establish its cause');
  });

  it.each([
    [{ runSerial: 4 }, 'different colony runs'], [{ simulationSeed: 888 }, 'different colony runs'],
    [{ modelVersion: 'colony-daily-1.0' }, 'model versions differ'], [{ modelVersion: null }, 'information is missing'],
    [{ day: 6 }, 'same recorded day'], [{ id: 1 }, 'two different observations'],
  ])('blocks an unsupported comparison (%j)', (extra, reason) => {
    const comparison = BH.bhCompareColonyObservations(record(1, 6), record(2, 12, extra));
    expect(comparison.ok).toBe(false); expect(comparison.reason).toContain(reason);
    expect(comparison.metrics).toEqual([]); expect(BH.bhColonyObservationComparisonText(comparison)).toBe('');
  });

  it('adds exact evidence atomically, preserves writing, avoids duplicates and invalidates only its review', () => {
    const entry = Object.freeze({ evidence: 'My exact writing. ', prediction: 'Keep this.', review: Object.freeze({ prediction: true, evidence: true, explanation: true }) });
    const result = BH.bhAppendNotebookEvidence(entry, 'A measured comparison.');
    expect(result.entry.evidence).toBe('My exact writing. \nA measured comparison.');
    expect(result.entry.review).toEqual({ prediction: true, evidence: false, explanation: true });
    expect(BH.bhAppendNotebookEvidence(result.entry, 'A measured comparison.')).toMatchObject({ status: 'duplicate', entry: result.entry });
    expect(entry.evidence).toBe('My exact writing. ');
    const full = { evidence: 'x'.repeat(1200), review: { evidence: true } };
    expect(BH.bhAppendNotebookEvidence(full, 'Reading')).toEqual({ status: 'full', entry: full, needed: 8 });
    expect(BH.bhAppendNotebookEvidence({ evidence: 'x'.repeat(1192) }, 'Reading').entry.evidence).toHaveLength(1200);
  });

  it('round-trips frozen evidence through backups, all host loaders and a fresh experiment without losing other writing', () => {
    let state = colony();
    state = BH.bhSaveColonyObservation(state, BH.bhCreateColonyObservation(state, 6)).state;
    state = BH.bhSaveColonyObservation(state, BH.bhCreateColonyObservation(state, 12)).state;
    const backup = BH.bhReadBeeBackup(BH.bhBuildBeeBackup(state, '2026-10-04T12:00:00Z'));
    expect(backup.state.notebook).toEqual(state.notebook);
    const recovered = BH.bhRecoverBeehiveState(state);
    expect(recovered.state).toBe(state); expect(recovered.repairs).toEqual([]);
    for (const file of ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js']) {
      const source = fs.readFileSync(file, 'utf8'), start = source.indexOf('// BEEHIVE_PERSISTENCE_HELPER_START'), end = source.indexOf('// BEEHIVE_PERSISTENCE_HELPER_END');
      const contract = Function(source.slice(start, end) + '\nreturn { save: _serializeBeehiveForPersistence, load: _deserializeBeehiveFromPersistence };')();
      const restored = contract.load(JSON.parse(JSON.stringify(contract.save(state))));
      expect(restored.notebook).toEqual(state.notebook);
    }
    const notebook = BH.bhExperimentNotebookWithRegisteredPlan(state.notebook, 4, 3);
    expect(notebook.colonyObservations).toEqual(state.notebook.colonyObservations);
    const report = BH.bhBuildColonyObservationEvidence(state.notebook.colonyObservations);
    expect(report).toContain('Day 6'); expect(report).toContain('Day 12');
    expect(report).toContain('21.125 lb'); expect(report).toContain('Colony stability: Unavailable');
  });

  it('preserves unsupported observation formats and refuses a capture that would overwrite them', () => {
    const future = { schemaVersion: 2, entries: [{ originalEvidence: 'Preserve this future record.' }] };
    const state = colony({ notebook: { colonyObservations: future, beekeeper: { evidence: 'Keep my writing.' } } });
    expect(BH.bhRecoverBeehiveState(state).state).toBe(state);
    expect(BH.bhSaveColonyObservation(state, BH.bhCreateColonyObservation(state, 6))).toEqual({ status: 'unsupported', state });
    expect(BH.bhReadBeeBackup(BH.bhBuildBeeBackup(state, '2026-10-04T12:00:00Z')).state.notebook.colonyObservations).toEqual(future);
  });
});
