import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Run trusted repository code in this realm so multi-day integrations measure
// the solver without a second VM's cross-context lookups on every fixed step.
const host = {};
new Function('window', readFileSync('stem_lab/water_worlds_kernel.js', 'utf8'))(host);
const K = host.WaterWorldsKernel;
const clone = value => JSON.parse(JSON.stringify(value));
function finish(state) { return K.advance(K.begin(state, false), 240); }
function wetStorm() {
  const s = K.initial();
  s.world = K.create(95);
  s.settings = K.settings({ rain: 80, duration: 60, wetness: 95 });
  return finish(s);
}
const firstStorm = wetStorm();

describe('Water Worlds dry weather between storms', () => {
  it('routes and evaporates existing water with no rain while closing the water balance', () => {
    const original = K.record(clone(firstStorm));
    original.editHistory = [{ covers: original.world.cells.map(c => c.cover), run: null }];
    const beforeJSON = JSON.stringify(original), before = K.measure(original.world);
    const recovered = K.recover(original, 6), after = K.measure(recovered.world), receipt = recovered.recovery;
    expect(JSON.stringify(original)).toBe(beforeJSON);
    expect(recovered.run).toBeNull();
    expect(recovered.running).toBe(false);
    expect(recovered.editHistory).toEqual([]);
    expect(recovered.baseline).toBe(original.baseline);
    expect(recovered.world.minutes).toBe(original.world.minutes + 360);
    expect(after.rainM3).toBe(before.rainM3);
    expect(receipt).toMatchObject({ durationHours: 6, durationMinutes: 360, startMinute: original.world.minutes, endMinute: recovered.world.minutes });
    for (const store of ['surfaceM3', 'soilM3', 'groundM3', 'storedM3']) {
      expect(receipt.before[store]).toBe(before[store]);
      expect(receipt.after[store]).toBe(after[store]);
    }
    expect(receipt.outflowM3).toBeCloseTo(after.outM3 - before.outM3, 10);
    expect(receipt.evaporationM3).toBeCloseTo(after.evapM3 - before.evapM3, 10);
    expect(receipt.outflowM3).toBeGreaterThan(0);
    expect(receipt.evaporationM3).toBeGreaterThan(0);
    expect(receipt.before.storedM3 - receipt.outflowM3 - receipt.evaporationM3).toBeCloseTo(receipt.after.storedM3, 7);
    expect(Math.abs(receipt.errorM3)).toBeLessThan(1e-7);
    expect(Math.abs(after.errorM3)).toBeLessThan(1e-7);
    expect(recovered.world.cells.map(c => [c.cover, c.elevation])).toEqual(original.world.cells.map(c => [c.cover, c.elevation]));
    expect(K.validWorld(recovered.world)).toBe(true);
  });

  it('keeps the receipt detached from its input, output, and later storm', () => {
    const recovered = K.recover(clone(firstStorm), 1);
    expect(recovered.recovery.provenance.start).toEqual(firstStorm.world);
    expect(recovered.recovery.provenance.end).toEqual(recovered.world);
    const started = K.begin(recovered, false), recoveredJSON = JSON.stringify(recovered);
    expect(started.run.recovery).toEqual(recovered.recovery);
    expect(started.run.recovery).not.toBe(recovered.recovery);
    expect(started.run.recovery).not.toBe(started.recovery);
    started.run.recovery.before.soilM3 = 0;
    started.run.recovery.provenance.start.cells[0].soil = 0;
    expect(JSON.stringify(recovered)).toBe(recoveredJSON);
    const outputSoil = recovered.world.cells[0].soil;
    recovered.recovery.provenance.end.cells[0].soil = 0;
    expect(recovered.world.cells[0].soil).toBe(outputSoil);
    expect(firstStorm.world.cells[0].soil).toBeGreaterThan(0);
  });

  it('allows more drainage and water loss over a longer interval and changes the next storm', () => {
    const short = K.recover(clone(firstStorm), 1), long = K.recover(clone(firstStorm), 24);
    expect(long.recovery.after.storedM3).toBeLessThan(short.recovery.after.storedM3);
    expect(long.recovery.after.soilM3).toBeLessThan(short.recovery.after.soilM3);
    expect(long.recovery.after.groundM3).toBeLessThan(short.recovery.after.groundM3);
    expect(long.recovery.evaporationM3).toBeGreaterThan(short.recovery.evaporationM3);
    const nextShort = finish(short), nextLong = finish(long);
    expect(nextLong.run.forcing).toEqual(nextShort.run.forcing);
    expect(K.result(nextLong.world, nextLong.run).outflowM3).toBeLessThan(K.result(nextShort.world, nextShort.run).outflowM3);
  });

  it('bounds intervals to one through 72 hours with a six-hour default and supports fractional hours', () => {
    const s = K.initial();
    expect(K.recover(s, 0).recovery.durationHours).toBe(1);
    expect(K.recover(s, Infinity).recovery.durationHours).toBe(6);
    expect(K.recover(s).recovery.durationHours).toBe(6);
    const long = K.recover(s, 1000);
    expect(long.recovery.durationHours).toBe(72);
    expect(long.world.minutes).toBe(72 * 60);
    expect(Math.abs(K.measure(long.world).errorM3)).toBeLessThan(1e-7);
    const partial = K.recover(s, 1.123);
    expect(partial.world.minutes).toBeCloseTo(1.123 * 60, 10);
    expect(partial.recovery.durationMinutes).toBe(1.123 * 60);
  }, 20000);

  it('keeps an empty watershed empty and blocks both running and paused unfinished storms', () => {
    const s = K.initial(); s.world = K.create(0);
    const dry = K.recover(s, 6);
    expect(dry.recovery.after.storedM3).toBe(0);
    expect(dry.recovery.evaporationM3).toBe(0);
    expect(dry.recovery.outflowM3).toBe(0);
    const active = K.advance(K.begin(K.initial(), false), 20), before = JSON.stringify(active);
    expect(K.recover(active, 6)).toBe(active);
    expect(K.recover({ ...active, running: false }, 6).world).toBe(active.world);
    expect(JSON.stringify(active)).toBe(before);
  });

  it('keeps recovery antecedents through a storm and drops them when the endpoint no longer matches', () => {
    const recovered = K.recover(clone(firstStorm), 1), end = finish(recovered);
    expect(end.run.recovery).toEqual(recovered.recovery);
    expect(K.begin(end, false).run.recovery).toBeNull();
    const edited = K.edit(recovered, [0], 'paved'), next = K.begin(edited, false);
    expect(next.run.recovery).toEqual(recovered.recovery);
    expect(next.run.start.cells[0].cover).toBe('paved');
    expect(next.run.recovery.provenance.start.cells[0].cover).toBe('forest');
  });

  it('uses only the pinned baseline antecedent for land and rainfall timing replays', () => {
    const plainBaseline = K.record(clone(firstStorm)), unrelated = K.recover(plainBaseline, 1);
    for (const replay of [true, 'timing']) {
      const started = K.begin(unrelated, replay);
      expect(started.recovery).toBeNull();
      expect(started.run.recovery).toBeNull();
    }
    const recoveredBaseline = K.record(finish(K.recover(clone(firstStorm), 1)));
    const baselineJSON = JSON.stringify(recoveredBaseline.baseline), later = K.recover(recoveredBaseline, 6);
    for (const replay of [true, 'timing']) {
      const started = K.begin(later, replay);
      expect(started.run.recovery).toEqual(recoveredBaseline.baseline.run.recovery);
      expect(started.run.recovery.durationHours).toBe(1);
      expect(started.run.start.minutes).toBe(recoveredBaseline.baseline.run.start.minutes);
    }
    expect(JSON.stringify(recoveredBaseline.baseline)).toBe(baselineJSON);
  });

  it('restores legacy states and recomputes pending receipt claims from their captured start', () => {
    const legacy = clone(firstStorm); delete legacy.recovery; delete legacy.run.recovery;
    expect(K.restore(legacy).recovery).toBeNull();
    const recovered = K.recover(clone(firstStorm), 1), saved = clone(recovered);
    saved.question = 'recovery';
    saved.recovery.before.soilM3 = -500;
    saved.recovery.after.storedM3 = 9999999;
    saved.recovery.evaporationM3 = 123456;
    saved.recovery.errorM3 = 10;
    saved.recovery.endMinute = 0;
    saved.recovery.provenance.end = { arbitrary: 'cached output' };
    const restored = K.restore(saved);
    expect(restored.recovery).toEqual(recovered.recovery);
    expect(restored.world).toEqual(recovered.world);
    expect(restored.question).toBe('recovery');
    expect(restored.running).toBe(false);
    expect(K.restore(K.edit(recovered, [0], 'paved')).recovery).toEqual(recovered.recovery);
  });

  it('rejects invalid or unrelated recovery provenance without changing the saved water', () => {
    const recovered = K.recover(clone(firstStorm), 1);
    for (const change of [
      receipt => { receipt.durationHours = 0; },
      receipt => { receipt.durationHours = 73; },
      receipt => { receipt.durationHours = Infinity; },
      receipt => { receipt.durationHours = '1'; },
      receipt => { receipt.durationHours = 2; },
      receipt => { receipt.provenance.start.cells[0].soil = -1; },
      receipt => { receipt.provenance.start.cells[0].soil -= 1; },
      receipt => { receipt.provenance.start.minutes = 2 ** 52; },
      receipt => { receipt.provenance.start.minutes = 2 ** 51 + .5; },
      receipt => { receipt.provenance = null; },
    ]) {
      const saved = clone(recovered); change(saved.recovery);
      const restored = K.restore(saved);
      expect(restored.recovery).toBeNull();
      expect(restored.world).toEqual(recovered.world);
    }
  });

  it('rebuilds current and pinned storm antecedents independently and ignores unrelated state metadata', () => {
    const recovered = K.recover(clone(firstStorm), 1), pinned = K.record(finish(recovered));
    const current = K.advance(K.begin(K.recover(pinned, 2), false), 8), saved = clone(current);
    saved.run.recovery.outflowM3 = -123;
    saved.baseline.run.recovery.after.soilM3 = -123;
    saved.recovery = { fake: true };
    const restored = K.restore(saved);
    expect(restored.run.recovery).toEqual(current.run.recovery);
    expect(restored.recovery).toEqual(current.run.recovery);
    expect(restored.baseline.run.recovery).toEqual(pinned.baseline.run.recovery);
    const invalid = clone(current); invalid.run.recovery.durationHours = 3;
    expect(K.restore(invalid).run.recovery).toBeNull();
  });

  it('exports a detached dry interval and explains its units, stores, boundary losses, and model assumption', () => {
    const pending = K.recover(clone(firstStorm), 1), evidence = K.evidence(pending), text = K.report(pending);
    expect(evidence.recovery).toEqual(pending.recovery);
    evidence.recovery.provenance.start.cells[0].soil = 0;
    expect(pending.recovery.provenance.start.cells[0].soil).toBeGreaterThan(0);
    expect(text).toContain('Latest dry interval: 1 h without rain (60 min)');
    expect(text).toContain('Surface water before / after:');
    expect(text).toContain('Soil water before / after:');
    expect(text).toContain('Delayed storage before / after:');
    expect(text).toContain('Dry-interval outflow:');
    expect(text).toContain('m³; evaporation:');
    expect(text).toContain('balance error:');
    expect(text).toContain('no climate feedback');
    const started = K.begin(pending, false);
    expect(K.evidence(started).run.recovery).toEqual(pending.recovery);
    expect(K.report(started)).toContain('Current run antecedent dry interval: 1 h without rain');
    expect(K.report(K.record(finish(pending)))).toContain('Pinned baseline antecedent dry interval: 1 h without rain');
  });
});
