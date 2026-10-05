import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

function config() {
  return { params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 },
    siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [], rand: () => 1 };
}

describe('Conserved Bee food origins', () => {
  it('does not turn feed into harvestable honey when demand is zero', () => {
    expect(BH.bhFoodBudget(200, 190, 200, 0, 0)).toMatchObject({ honey: 200, syrup: 190, nectarHoney: 10, consumed: 0 });
  });
  it('consumes actual demand from syrup first without increasing nectar-derived honey', () => {
    expect(BH.bhFoodBudget(200, 190, 200, 0, 2)).toMatchObject({ honey: 198, syrup: 188, nectarHoney: 10, syrupConsumed: 2, nectarHoneyConsumed: 0 });
  });
  it('only draws on nectar-derived honey after syrup is exhausted', () => {
    expect(BH.bhFoodBudget(20, 3, 20, 0, 5)).toMatchObject({ honey: 15, syrup: 0, nectarHoney: 15, syrupConsumed: 3, nectarHoneyConsumed: 2 });
  });
  it('keeps incoming nectar separate from remaining feed', () => {
    expect(BH.bhFoodBudget(20, 15, 20, 8, 2)).toMatchObject({ honey: 26, syrup: 13, nectarHoney: 13 });
  });
  it('removes both origins proportionally when a store-loss event occurs', () => {
    expect(BH.bhFoodBudget(20, 10, 10, 0, 0)).toMatchObject({ honey: 10, syrup: 5, nectarHoney: 5, syrupLostToEvent: 5 });
  });
  it('reports actual consumption and a shortfall instead of consuming nonexistent stores', () => {
    expect(BH.bhFoodBudget(2, 1, 2, 0, 8)).toMatchObject({ honey: 0, syrup: 0, nectarHoney: 0, consumed: 2, demand: 8, shortfall: 6 });
  });
  it.each([
    ['exactly met demand', 0, false],
    ['a positive remainder that rounds to zero', 0.01, false],
    ['a true shortage that rounds to zero', -0.01, true],
  ])('bases starvation on actual food supply for %s', (_label, difference, shortage) => {
    const workers = 10000;
    const demand = workers * BH.SIMULATION_PARAMS.honeyConsumePerWorker * 0.45;
    const stores = demand + difference;
    const budget = BH.bhFoodBudget(stores, stores, stores, 0, demand);
    expect(budget.honey).toBe(0);
    expect(budget.shortfall).toBe(0); // all three boundaries share a rounded display
    expect(budget.hasShortfall).toBe(shortage);
    const initial = { ...BH.bhCreateNewColonyState(4411, 1),
      day: 90, workers, brood: 1000,
      broodCohorts: BH.bhNormalizeBroodCohorts(null, 1000, BH.SIMULATION_PARAMS, 90),
      honey: stores, syrup: stores, varroaLevel: 0, activeEvent: { id: 'hold' } };
    const cfg = { ...config(), params: { ...BH.SIMULATION_PARAMS, baseWorkerMortality: 0 } };
    const next = BH.bhStepColony(initial, cfg).next;
    expect(next.honey).toBe(0);
    expect(next.foodShortfall).toBe(0);
    expect(next.starving).toBe(shortage);
    if (shortage) {
      expect(next.starveDeaths).toBeGreaterThan(0);
      expect(next.starveBroodLost).toBeGreaterThan(0);
    } else {
      expect(next.starveDeaths).toBe(0);
      expect(next.starveBroodLost).toBe(0);
    }
    expect(BH.bhForecastColony(initial, cfg, 1).timeline[0])
      .toMatchObject({ workers: next.workers, honey: next.honey, syrup: next.syrup });
  });
  it('bounds damaged inputs without creating a negative origin', () => {
    expect(BH.bhFoodBudget(5, 500, 5, 0, 1)).toMatchObject({ honey: 4, syrup: 4, nectarHoney: 0 });
    expect(BH.bhFoodBudget(NaN, Infinity, NaN, -10, -2)).toMatchObject({ honey: 20, syrup: 0, nectarHoney: 20 });
  });
  it('treats decimal food equality as met demand despite floating-point arithmetic noise', () => {
    const workers = 15000;
    const demand = workers * BH.SIMULATION_PARAMS.honeyConsumePerWorker;
    expect(demand).toBeGreaterThan(0.3); // binary arithmetic produces 0.30000000000000004
    expect(BH.bhFoodBudget(0.3, 0.3, 0.3, 0, demand).hasShortfall).toBe(false);
    const initial = { ...BH.bhCreateNewColonyState(4411, 1), day: 30, workers,
      honey: 0.3, syrup: 0.3, foragingEfficiency: 0, activeEvent: { id: 'hold' } };
    const next = BH.bhStepColony(initial, config()).next;
    expect(next.honey).toBe(0);
    expect(next.starving).toBe(false);
    expect(next.starveDeaths).toBe(0);
    expect(next.starveBroodLost).toBe(0);
  });
  it('uses identical food origins in forecasts and successive daily steps', () => {
    const initial = { ...BH.bhCreateNewColonyState(4411, 1), day: 90, workers: 10000, honey: 200, syrup: 190, activeEvent: { id: 'hold' } };
    const before = structuredClone(initial);
    let current = initial;
    for (let day = 0; day < 7; day++) current = { ...current, ...BH.bhStepColony(current, config()).next };
    const forecast = BH.bhForecastColony(initial, config(), 7);
    expect(forecast.timeline.at(-1)).toMatchObject({ honey: current.honey, syrup: current.syrup, nectarHoney: current.nectarHoney });
    expect(current.nectarHoney).toBeLessThanOrEqual(10);
    expect(current.syrup).toBeGreaterThan(0);
    expect(initial).toEqual(before);
  });
  it('applies event losses to the origin budget in the canonical colony step', () => {
    const initial = { ...BH.bhCreateNewColonyState(4411, 1), day: 90, honey: 20, syrup: 10 };
    const cfg = { ...config(), params: { ...BH.SIMULATION_PARAMS, randomEventChance: 1, eventSeasons: {} }, hiveEvents: [{ id: 'robbing', effect: { honey: -10 } }], rand: () => 0 };
    const result = BH.bhStepColony(initial, cfg);
    expect(result.event.id).toBe('robbing');
    expect(result.next.syrupLostToEvent).toBe(5);
    expect(result.next.syrup).toBeLessThanOrEqual(5);
    expect(result.next.honey).toBeCloseTo(result.next.syrup + result.next.nectarHoney, 1);
  });
});
