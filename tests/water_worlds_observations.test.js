import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const host = {};
vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js', 'utf8'), host);
const K = host.WaterWorldsKernel;
const clone = value => JSON.parse(JSON.stringify(value));
const started = (minutes = 15) => K.advance(K.begin(K.initial(), false), minutes);

describe('Water Worlds saved observation evidence', () => {
  it('requires an experiment and captures the selected cell at its exact recorded time', () => {
    const initial = K.initial();
    expect(K.observe(initial)).toBe(initial);
    const s = { ...started(18), selected: 21 };
    const original = JSON.stringify(s);
    const saved = K.observe(s, 7.125, '  Water remains on the paving.  ');
    const entry = saved.observations[0];
    const recorded = K.atTime(s.run, 7.125);
    expect(JSON.stringify(s)).toBe(original);
    expect(saved.world).toBe(s.world);
    expect(saved.run).toBe(s.run);
    expect(saved.running).toBe(s.running);
    expect(entry).toMatchObject({ id: 'observation-1', minute: 7.125, modelMinute: 7.125, selected: 21, note: '  Water remains on the paving.  ' });
    expect(entry.cell).toEqual(recorded.cells[21]);
    expect(entry.totals).toEqual(K.measure(recorded));
    expect(entry.result).toEqual(K.result(recorded, s.run));
    expect(entry.provenance.start).toEqual(s.run.start);
    expect(entry.provenance.start).not.toBe(s.run.start);
    expect(entry.cell).not.toBe(s.world.cells[21]);
  });

  it('captures now by default and never records the future of an incomplete run', () => {
    const s = started(8.25);
    expect(K.observe(s).observations[0].minute).toBe(8.25);
    expect(K.observe(s, 60).observations[0].minute).toBe(8.25);
    expect(K.observe(s, -4).observations[0].minute).toBe(0);
    expect(K.observe(s, NaN).observations[0].minute).toBe(8.25);
    expect(K.observe(s, 60).observations[0].cell).toEqual(K.atTime(s.run, 8.25).cells[s.selected]);
  });

  it('distinguishes elapsed time from model time on a consecutive storm', () => {
    const first = K.advance(K.begin(K.initial(), false), 240);
    const next = K.advance(K.begin(first, false), 12);
    const entry = K.observe(next, 4.5).observations[0];
    expect(next.run.start.minutes).toBe(100);
    expect(entry.minute).toBe(4.5);
    expect(entry.modelMinute).toBe(104.5);
    expect(entry.result.elapsedMinutes).toBe(4.5);
    expect(entry.result.rainfallM3).toBeCloseTo(45 * 4.5 / 60 * 96 * 400 / 1000, 7);
    expect(entry.totals.rainM3).toBeGreaterThan(entry.result.rainfallM3);
  });

  it('keeps recorded readings unchanged after advancing, editing, and starting another experiment', () => {
    let s = K.observe(started(8), 4, 'My first evidence');
    const recorded = JSON.stringify(s.observations[0]);
    s = K.advance(s, 240);
    s = K.edit(s, [0, 1], 'paved');
    expect(s.run).toBeNull();
    s = K.advance(K.begin(s, false), 10);
    expect(JSON.stringify(s.observations[0])).toBe(recorded);
    expect(K.observationContext(s, s.observations[0]).reason).toBe('different-run');
  });

  it('keeps all six records until one is explicitly removed and does not reuse removed IDs', () => {
    let s = started(12);
    for (let i = 0; i < K.observationLimit; i++) s = K.observe(s, i);
    const full = JSON.stringify(s.observations);
    expect(s.observations).toHaveLength(6);
    expect(K.observe(s, 9)).toBe(s);
    expect(JSON.stringify(s.observations)).toBe(full);
    expect(K.removeObservation(s, 'missing')).toBe(s);
    const reduced = K.removeObservation(s, 'observation-3');
    expect(reduced.observations).toHaveLength(5);
    expect(s.observations).toHaveLength(6);
    const replaced = K.observe(reduced, 9);
    expect(K.report(K.removeObservation(replaced, 'observation-1'))).toContain('Observation 7 — elapsed minute 9');
    expect(K.report(K.removeObservation(replaced, 'observation-1'))).not.toContain('Observation 1 —');
    expect(replaced.observations.map(entry => entry.id)).toEqual(['observation-1', 'observation-2', 'observation-4', 'observation-5', 'observation-6', 'observation-7']);
  });

  it('edits learner notes without changing the saved physical evidence', () => {
    const s = K.observe(started(), 6, 'Old note');
    const before = JSON.stringify(s.observations[0]);
    const updated = K.updateObservationNote(s, s.observations[0].id, '  The same storm had a different pathway.  ');
    expect(JSON.stringify(s.observations[0])).toBe(before);
    expect(updated.observations[0].note).toBe('  The same storm had a different pathway.  ');
    expect({ ...updated.observations[0], note: 'Old note' }).toEqual(s.observations[0]);
    expect(K.updateObservationNote(updated, 'missing', 'note')).toBe(updated);
    expect(K.updateObservationNote(updated, updated.observations[0].id, updated.observations[0].note)).toBe(updated);
    expect(K.updateObservationNote(s, s.observations[0].id, 'x'.repeat(800)).observations[0].note).toHaveLength(600);
  });

  it('requires matching forcing and the entire starting world before offering a revisit', () => {
    const s = K.observe(started(20), 12);
    const entry = s.observations[0];
    expect(K.observationContext(s, entry)).toMatchObject({ canRevisit: true, reason: null, minute: 12, selected: s.selected });
    for (const alter of [
      state => { state.run.forcing.pattern = 'late'; },
      state => { state.run.forcing.rain = 50; },
      state => { state.run.forcing.duration = 60; },
      state => { state.run.start.cells[0].cover = 'paved'; },
      state => { state.run.start.cells[0].soil += 1; },
      state => { state.run.start.cells[0].surface += 1; },
      state => { state.run.start.cells[0].ground += 1; },
      state => { state.run.start.cells[0].elevation += 1; },
      state => { state.run.start.minutes += 1; }
    ]) {
      const changed = clone(s); alter(changed);
      expect(K.observationContext(changed, entry)).toMatchObject({ canRevisit: false, reason: 'different-run' });
    }
    const noRun = { ...s, run: null };
    expect(K.observationContext(noRun, entry).reason).toBe('no-run');
    const replay = K.begin(K.record(K.advance(s, 240)), true);
    expect(K.observationContext(replay, entry)).toMatchObject({ canRevisit: false, reason: 'not-yet-reached' });
    expect(K.observationContext(K.advance(replay, 12), entry).canRevisit).toBe(true);
  });

  it('normalizes legacy steady rain forcing when identifying an equivalent run', () => {
    const legacy = started(10);
    delete legacy.run.forcing.pattern;
    const s = K.observe(legacy, 5);
    expect(s.observations[0].provenance.forcing.pattern).toBe('steady');
    expect(K.observationContext(s, s.observations[0]).canRevisit).toBe(true);
  });

  it('restores old saves with no observations and restores observations independently of the current run', () => {
    const legacy = clone(started());
    delete legacy.observations; delete legacy.observationSequence;
    expect(K.restore(legacy).observations).toEqual([]);
    expect(K.restore(legacy).observationSequence).toBe(0);
    const saved = clone(K.observe(started(18), 6.5, 'Water in soil'));
    saved.run = null;
    const restored = K.restore(saved);
    expect(restored.running).toBe(false);
    expect(restored.observations).toEqual(saved.observations);
    expect(restored.observations[0].provenance.start).not.toBe(saved.observations[0].provenance.start);
    expect(K.observationContext(restored, restored.observations[0]).reason).toBe('no-run');
    expect(restored.observationSequence).toBe(1);
  });

  it('reconstructs imported numeric evidence and rejects invalid or duplicate observation identities', () => {
    const saved = clone(K.observe(started(15), 6));
    const expected = clone(saved.observations[0]);
    saved.observations[0].cell.soil = 9000;
    saved.observations[0].totals.discharge = -8;
    saved.observations[0].result.rainfallM3 = 'invented';
    expect(K.restore(saved).observations[0]).toEqual(expected);
    const duplicate = clone(saved.observations[0]);
    const invalid = clone(duplicate); invalid.id = 'observation-2'; invalid.minute = 999;
    const invalidWorld = clone(duplicate); invalidWorld.id = 'observation-3'; invalidWorld.provenance.start.cells[0].soil = -1;
    saved.observations.push(duplicate, invalid, invalidWorld);
    expect(K.restore(saved).observations).toEqual([expected]);
  });

  it('exports detached observations and gives readable evidence enough units and context to interpret them', () => {
    const s = K.observe(started(15), 4, 'Surface water is moving toward the channel.');
    const evidence = K.evidence(s);
    expect(evidence.observations).toEqual(s.observations);
    evidence.observations[0].cell.surface = 999;
    evidence.observations[0].provenance.start.cells[0].soil = 999;
    expect(s.observations[0].cell.surface).not.toBe(999);
    expect(s.observations[0].provenance.start.cells[0].soil).not.toBe(999);
    const text = K.report({ ...s, run: null });
    expect(text).toContain('Saved observations');
    expect(text).toContain('elapsed minute 4; model minute 4');
    expect(text).toContain('saved from another run');
    expect(text).toContain('Cell water: surface');
    expect(text).toContain('mm; soil');
    expect(text).toContain('Valley water: surface');
    expect(text).toContain('m³; soil');
    expect(text).toContain('Surface water is moving toward the channel.');
  });

  it('ships the same observation kernel in desktop and source builds', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/water_worlds_kernel.js', 'utf8')).toBe(readFileSync('stem_lab/water_worlds_kernel.js', 'utf8'));
  });
});
