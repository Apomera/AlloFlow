import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js', 'utf8'), context);
const K = context.WaterWorldsKernel;
const depth = routes => routes.reduce((sum, route) => sum + route.depthMm, 0);

function wetWorld() {
  let world = K.create(95);
  for (let i = 0; i < 80; i++) world = K.step(world, 90, .25);
  return world;
}

describe('Water Worlds local water pathways', () => {
  it.each([
    ['dry valley', () => K.create(0), 0],
    ['initial rain', () => K.create(35), 45],
    ['saturated ground', () => K.create(100), 150],
    ['flowing valley', wetWorld, 90],
    ['rain has stopped', wetWorld, 0],
    ['completed experiment drainage', () => K.advance(K.begin(K.initial(), false), 240).world, 0]
  ])('balances every cell and reproduces the solver during %s', (_, create, rain) => {
    const world = create(), next = K.step(world, rain, .25);
    for (let i = 0; i < world.cells.length; i++) {
      const budget = K.cellBudget(world, rain, i), t = budget.transfers, before = budget.before, after = budget.after;
      expect(budget.selected).toBe(i);
      expect(budget.minutes).toBe(.25);
      expect(after).toEqual({surface: next.cells[i].surface, soil: next.cells[i].soil, ground: next.cells[i].ground});
      expect(before).toEqual({surface: world.cells[i].surface, soil: world.cells[i].soil, ground: world.cells[i].ground});
      expect(after.surface).toBeCloseTo(before.surface + t.rainMm + t.incomingSurfaceMm + t.streamReceiptMm - t.outgoingSurfaceMm - t.infiltrationMm - t.surfaceEvaporationMm, 10);
      expect(after.soil).toBeCloseTo(before.soil + t.infiltrationMm - t.drainageMm - t.soilEvapotranspirationMm, 10);
      expect(after.ground).toBeCloseTo(before.ground + t.drainageMm - t.releaseMm, 10);
      expect(Math.abs(budget.balance.errorMm)).toBeLessThan(1e-10);
      expect(budget.balance.inputsMm).toBe(t.rainMm + t.incomingSurfaceMm + t.streamReceiptMm);
      expect(budget.balance.outputsMm).toBe(t.outgoingSurfaceMm + t.releaseMm + t.surfaceEvaporationMm + t.soilEvapotranspirationMm);
      expect(budget.incoming.every(route => route.to === i)).toBe(true);
      expect(budget.outgoing.every(route => route.from === i)).toBe(true);
      expect(t.incomingSurfaceMm).toBe(depth(budget.incoming));
      expect(t.outgoingSurfaceMm).toBe(depth(budget.outgoing));
    }
  });

  it('shows zero transfers for a completely dry valley with no rain', () => {
    const budget = K.cellBudget(K.create(0), 0, 44);
    expect(Object.values(budget.transfers).every(value => value === 0)).toBe(true);
    expect(budget.incoming).toEqual([]);
    expect(budget.outgoing).toEqual([]);
    expect(budget.balance).toEqual({beforeMm: 0, inputsMm: 0, outputsMm: 0, afterMm: 0, errorMm: 0});
  });

  it('exposes the different infiltration of paving and woodland from the same water stores', () => {
    const source = K.initial();
    const paved = K.edit(source, [0], 'paved'), forest = K.edit(source, [0], 'forest');
    const a = K.cellBudget(paved.world, 45, 0), b = K.cellBudget(forest.world, 45, 0);
    expect(a.transfers.infiltrationMm).toBeCloseTo(.4 * (1 - .85 * 42 / 120) * .25 / 60, 12);
    expect(b.transfers.infiltrationMm).toBeGreaterThan(a.transfers.infiltrationMm);
    expect(a.transfers.soilEvapotranspirationMm).toBeCloseTo(.01 * .25 / 60, 12);
    expect(b.transfers.soilEvapotranspirationMm).toBeCloseTo(.18 * .25 / 60, 12);
  });

  it('separates surface evaporation from soil evapotranspiration without changing the combined trace', () => {
    const world = wetWorld(), trace = K.diagnose(world, 45);
    for (let i = 0; i < world.cells.length; i++) {
      const t = K.cellBudget(world, 45, i).transfers;
      expect(t.surfaceEvaporationMm).toBe(trace.cells[i].surfaceEvaporationMm);
      expect(t.soilEvapotranspirationMm).toBe(trace.cells[i].soilEvapotranspirationMm);
      expect(t.surfaceEvaporationMm + t.soilEvapotranspirationMm).toBe(trace.cells[i].evaporationMm);
    }
  });

  it('shares pooled delayed release evenly across the 16 stream cells', () => {
    const world = wetWorld(), trace = K.diagnose(world, 0);
    const totalRelease = trace.cells.reduce((sum, cell) => sum + cell.releaseMm, 0);
    let receipts = 0;
    expect(totalRelease).toBeGreaterThan(0);
    for (let i = 0; i < world.cells.length; i++) {
      const t = K.cellBudget(world, 0, i).transfers;
      expect(t.releaseMm).toBe(trace.cells[i].releaseMm);
      expect(t.streamReceiptMm).toBe(world.cells[i].cover === 'stream' ? totalRelease / 16 : 0);
      receipts += t.streamReceiptMm;
    }
    expect(receipts).toBeCloseTo(totalRelease, 12);
  });

  it('keeps the open outlet distinct from a neighboring cell and accounts for its water', () => {
    const world = wetWorld(), next = K.step(world, 0, .25);
    let exported = 0;
    for (const i of [89, 90]) {
      const budget = K.cellBudget(world, 0, i);
      const outlet = budget.outgoing.find(route => route.to === -1);
      expect(outlet).toBeDefined();
      expect(outlet.depthMm).toBeGreaterThan(0);
      expect(outlet.flowM3s).toBeCloseTo(outlet.depthMm * K.area / 1000 / 15, 12);
      exported += outlet.depthMm * K.area / 1000;
    }
    expect(exported).toBeCloseTo(next.outM3 - world.outM3, 10);
  });

  it('does not mutate the world and returns detached stores and routes', () => {
    const world = wetWorld(), saved = JSON.stringify(world), budget = K.cellBudget(world, 45, 89);
    expect(budget.outgoing.length).toBeGreaterThan(0);
    budget.before.soil = -10;
    budget.after.surface = -10;
    budget.outgoing[0].depthMm = -10;
    expect(JSON.stringify(world)).toBe(saved);
    expect(K.cellBudget(world, 45, 89).outgoing.every(route => route.depthMm >= 0)).toBe(true);
  });

  it('rejects invalid worlds and cell indices and follows solver rain bounds', () => {
    const world = K.create(35);
    for (const index of [-1, 96, .5, NaN, Infinity, '44', null, undefined]) expect(K.cellBudget(world, 45, index)).toBeNull();
    for (const invalid of [null, {}, {cells: []}, {...world, version: -1}]) expect(K.cellBudget(invalid, 45, 0)).toBeNull();
    expect(K.cellBudget(world, 999, 0).transfers.rainMm).toBe(150 * .25 / 60);
    for (const rain of [-5, NaN, Infinity, '45', null, undefined]) expect(K.cellBudget(world, rain, 0).transfers.rainMm).toBe(0);
  });
});
