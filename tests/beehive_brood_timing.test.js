import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive brood ages and queen transitions', () => {
  let BH;
  let config;
  let host;
  let root;
  let latest;
  let originalRaf;
  let originalCancelRaf;

  beforeEach(() => {
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    root = null;
    host = null;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
  });

  function colony(overrides = {}) {
    return {
      ...BH.bhCreateNewColonyState(777, 1),
      viewMode: 'beekeeper', beeView: 'scene', tutorialDone: true, soundOn: false,
      workers: 20_000, brood: 0, broodCohorts: null, drones: 0,
      honey: 500, pollen: 500, capacity: 800, varroaLevel: 0,
      ...overrides,
    };
  }

  function cfg(overrides = {}, extras = {}) {
    return {
      params: { ...BH.SIMULATION_PARAMS, randomEventChance: 0, supersedureChance: 0,
        baseWorkerMortality: 0, droneBaseMortality: 0, droneEvictionRate: 0, ...overrides },
      subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 },
      siteMods: { forage: 1, disease: 1 }, gardenBonus: 0,
      hiveEvents: [], diseaseEvents: [], rand: () => 0.99,
      ...extras,
    };
  }

  function step(state, options) {
    return { ...state, ...BH.bhStepColony(state, options).next };
  }

  async function mount(initial) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: initial });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => root.render(React.createElement(Component)));
  }

  async function click(selector) {
    const button = host.querySelector(selector);
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).not.toBe('true');
    await act(async () => button.click());
  }

  it.each([
    ['worker', 0, 21, 'emergedWorkers'],
    ['drone', 1, 24, 'emergedDrones'],
  ])('keeps a newly laid %s cohort immature until its full development interval', (_role, droneBirthRate, duration, metric) => {
    // Lay in late summer, then stop laying: the drone cohort must retain its
    // caste when it emerges in autumn, rather than borrowing today's season.
    const options = cfg({ baseBroodPerDay: 100, droneBirthRate });
    let state = step(colony({ day: 50 }), options);
    const eggs = state.eggsLaid;
    expect(eggs).toBeGreaterThan(0);
    expect(state.emergedWorkers + state.emergedDrones).toBe(0);
    state.queenHealth = 0;
    for (let elapsed = 1; elapsed < duration; elapsed += 1) {
      state = step(state, options);
      expect(state.emergedWorkers + state.emergedDrones, `day ${elapsed} after laying`).toBe(0);
      expect(state.brood).toBe(eggs);
    }
    state = step(state, options);
    expect(state[metric]).toBe(eggs);
    expect(state.emergedWorkers + state.emergedDrones).toBe(eggs);
    expect(state.brood).toBe(0);
  });

  it('resumes stored age buckets without resetting their clock or changing the forecast', () => {
    const options = cfg({ baseBroodPerDay: 100, droneBirthRate: 0.2 });
    let original = step(colony({ day: 45 }), options);
    original.queenHealth = 0;
    for (let day = 0; day < 12; day += 1) original = step(original, options);
    let resumed = JSON.parse(JSON.stringify(original));
    const saved = structuredClone(resumed);
    const beforeForecast = BH.bhForecastColony(original, options, 12);
    expect(BH.bhForecastColony(resumed, options, 12)).toEqual(beforeForecast);
    expect(resumed).toEqual(saved);
    for (let day = 0; day < 12; day += 1) {
      original = step(original, options);
      resumed = step(resumed, options);
      expect(resumed).toEqual(original);
    }
    expect(resumed.brood).toBe(0);
  });

  it('reconciles event brood losses before emergence and never resurrects destroyed brood', () => {
    const cohorts = BH.bhNormalizeBroodCohorts(null, 0, BH.SIMULATION_PARAMS, 10);
    cohorts.workers[0] = 100;
    cohorts.drones[23] = 50;
    const initial = colony({ day: 10, brood: 150, broodCohorts: cohorts, queenHealth: 0 });
    const before = structuredClone(initial);
    const options = cfg({ randomEventChance: 1 }, {
      hiveEvents: [{ id: 'brood_loss', effect: { brood: -150 } }], rand: () => 0.5,
    });
    const result = BH.bhStepColony(initial, options);
    expect(result.event.id).toBe('brood_loss');
    expect(result.next.brood).toBe(0);
    expect(result.next.emergedWorkers + result.next.emergedDrones).toBe(0);
    expect(BH.bhBroodCohortTotal(result.next.broodCohorts)).toBe(0);
    expect(initial).toEqual(before);
    expect(step({ ...initial, ...result.next }, cfg()).brood).toBe(0);
  });

  it('scales age buckets exactly for a split and repairs malformed legacy ages without mutating saves', () => {
    const initial = BH.bhNormalizeBroodCohorts(null, 3000, BH.SIMULATION_PARAMS, 10);
    const before = structuredClone(initial);
    const scaled = BH.bhNormalizeBroodCohorts(initial, 1800, BH.SIMULATION_PARAMS, 10);
    expect(BH.bhBroodCohortTotal(scaled)).toBe(1800);
    expect(initial).toEqual(before);
    expect(scaled.workers.every((count) => Number.isInteger(count) && count >= 0)).toBe(true);
    expect(scaled.workers[0]).toBeGreaterThan(0);
    expect(scaled.workers[20]).toBeGreaterThan(0);
    const broken = { schemaVersion: 1, workers: [NaN, -10], drones: null };
    const repaired = BH.bhNormalizeBroodCohorts(broken, 937, BH.SIMULATION_PARAMS, 10);
    expect(BH.bhBroodCohortTotal(repaired)).toBe(937);
    expect(repaired.workers).toHaveLength(21);
    expect(repaired.drones).toHaveLength(24);
    expect(broken.workers).toEqual([NaN, -10]);
  });

  it('pauses laying through all three queen-introduction days while old brood still emerges', () => {
    const cohorts = BH.bhNormalizeBroodCohorts(null, 0, BH.SIMULATION_PARAMS, 10);
    cohorts.workers[0] = 100;
    let state = colony({ day: 10, brood: 100, broodCohorts: cohorts,
      queenHealth: 0, queenTransition: { kind: 'requeen', daysRemaining: 3, pendingHealth: 100 } });
    for (let remaining = 2; remaining >= 0; remaining -= 1) {
      state = step(state, cfg());
      expect(state.eggsLaid).toBe(0);
      expect(state.queenHealth).toBe(remaining ? 0 : 100);
      expect(state.queenTransition?.daysRemaining ?? 0).toBe(remaining);
      if (remaining === 2) expect(state.emergedWorkers).toBe(100);
    }
    expect(step(state, cfg()).eggsLaid).toBeGreaterThan(0);
  });

  it('raises a supersedure queen over time rather than restoring her health on the trigger day', () => {
    const cohorts = BH.bhNormalizeBroodCohorts(null, 0, BH.SIMULATION_PARAMS, 10);
    cohorts.workers[20] = 100;
    const initial = colony({ day: 10, brood: 100, broodCohorts: cohorts, queenHealth: 10 });
    const options = cfg({ supersedureChance: 1 }, { rand: () => 0 });
    const result = BH.bhStepColony(initial, options);
    expect(result.event.id).toBe('supersedure');
    expect(result.next.queenHealth).toBe(0);
    expect(result.next.eggsLaid).toBe(0);
    expect(result.next.queenTransition).toEqual({ kind: 'supersedure', daysRemaining: 21, pendingHealth: 85 });
    let state = { ...initial, ...result.next };
    for (let remaining = 20; remaining >= 0; remaining -= 1) {
      state = step(state, options);
      expect(state.eggsLaid).toBe(0);
      expect(state.queenTransition?.daysRemaining ?? 0).toBe(remaining);
    }
    expect(state.queenHealth).toBe(85);
    expect(state.brood).toBe(0);
    expect(step(state, options).eggsLaid).toBeGreaterThan(0);
  });

  it('keeps queen-health event damage during the pending introduction', () => {
    const options = cfg({ randomEventChance: 1 }, {
      hiveEvents: [{ id: 'queen_stress', effect: { queenHealth: -15 } }], rand: () => 0.5,
    });
    const result = BH.bhStepColony(colony({ day: 10, queenHealth: 0,
      queenTransition: { kind: 'requeen', daysRemaining: 1, pendingHealth: 100 } }), options);
    expect(result.next.queenTransition).toBeNull();
    expect(result.next.queenHealth).toBe(85);
    expect(result.next.eggsLaid).toBe(0);
  });

  it('commits the Requeen control as a saved countdown that advances only on Next Day', async () => {
    await mount(colony({ day: 0, queenHealth: 30, actionPoints: 5 }));
    await click('[data-management-choice="requeen"]');
    expect(latest.beehive.queenHealth).toBe(0);
    expect(latest.beehive.queenTransition).toEqual({ kind: 'requeen', daysRemaining: 3, pendingHealth: 100 });
    const paidAP = latest.beehive.actionPoints;
    const unavailableRequeen = host.querySelector('[data-management-choice="requeen"]');
    expect(unavailableRequeen.getAttribute('aria-disabled')).toBe('true');
    // Unavailable actions remain focusable so they can explain the reason.
    await act(async () => unavailableRequeen.click());
    expect(latest.beehive.day).toBe(0);
    expect(latest.beehive.actionPoints).toBe(paidAP);
    for (let remaining = 2; remaining >= 0; remaining -= 1) {
      await click('#beehive-next-day');
      expect(latest.beehive.queenTransition?.daysRemaining ?? 0).toBe(remaining);
      expect(latest.beehive.queenHealth).toBe(remaining ? 0 : 100);
      expect(latest.beehive.brood).toBe(0);
    }
    await click('#beehive-next-day');
    expect(latest.beehive.brood).toBeGreaterThan(0);
    expect(BH.bhBroodCohortTotal(latest.beehive.broodCohorts)).toBe(latest.beehive.brood);
  }, 30000);

  it('keeps the split parent queenless and preserves the ages of its retained brood', async () => {
    const broodCohorts = BH.bhNormalizeBroodCohorts(null, 3000, BH.SIMULATION_PARAMS, 0);
    await mount(colony({ day: 0, brood: 3000, broodCohorts, actionPoints: 5 }));
    await click('[data-management-choice="split_colony"]');
    expect(latest.beehive.workers).toBe(11600);
    expect(latest.beehive.brood).toBe(1800);
    expect(BH.bhBroodCohortTotal(latest.beehive.broodCohorts)).toBe(1800);
    expect(latest.beehive.queenHealth).toBe(0);
    expect(latest.beehive.queenTransition).toEqual({ kind: 'split', daysRemaining: 21, pendingHealth: 90 });
    await click('#beehive-next-day');
    expect(latest.beehive.queenTransition.daysRemaining).toBe(20);
    expect(latest.beehive.queenHealth).toBe(0);
    expect(latest.beehive.brood).toBeLessThan(1800);
    expect(BH.bhBroodCohortTotal(latest.beehive.broodCohorts)).toBe(latest.beehive.brood);
    // A purchased, mated queen can shorten the parent colony's natural wait.
    await click('[data-management-choice="requeen"]');
    expect(latest.beehive.queenTransition).toEqual({ kind: 'requeen', daysRemaining: 3, pendingHealth: 100 });
  }, 30000);

  it('carries formic queen stress through the end of an introduction', async () => {
    await mount(colony({ day: 40, varroaLevel: 25, actionPoints: 3, queenHealth: 0,
      queenTransition: { kind: 'requeen', daysRemaining: 1, pendingHealth: 100 } }));
    await click('[data-management-choice="varroa_treatment"]');
    await click('[data-treatment-id="formic"]');
    const stressedHealth = latest.beehive.queenTransition.pendingHealth;
    expect(stressedHealth).toBeLessThan(100);
    expect(stressedHealth).toBeGreaterThan(0);
    await click('#beehive-next-day');
    expect(latest.beehive.queenTransition).toBeNull();
    expect(latest.beehive.queenHealth).toBe(stressedHealth);
  }, 30000);

  it('explains why a colony without young brood cannot supply the split parent a queen', async () => {
    await mount(colony({ day: 0, actionPoints: 3, workers: 20_000, brood: 0 }));
    const split = host.querySelector('[data-management-choice="split_colony"]');
    expect(split.getAttribute('aria-disabled')).toBe('true');
    expect(split.getAttribute('data-unavailable-reason')).toBe('Needs young worker brood');
    await act(async () => split.click());
    expect(latest.beehive.actionPoints).toBe(3);
    expect(latest.beehive.workers).toBe(20_000);
    expect(latest.beehive.queenTransition).toBeNull();
  }, 30000);

  it.each(['missing', 'malformed', 'mismatched'])('ends full-run tracking after %s current-model brood ages are recovered', (damage) => {
    const original = BH.bhCreateNewColonyState(777, 1);
    original.day = 17;
    if (damage === 'missing') delete original.broodCohorts;
    if (damage === 'malformed') original.broodCohorts.workers[0] = NaN;
    if (damage === 'mismatched') original.broodCohorts.workers[0] += 500;
    const before = structuredClone(original);
    const recovered = BH.bhRecoverBeehiveState(original);
    expect(recovered.state.seededFromDay).toBe(17);
    expect(recovered.state.broodCohorts).toBeUndefined();
    expect(recovered.state.simulationSeed).toBe(777);
    expect(recovered.state.randomState).toBe(777);
    expect(BH.bhExperimentProvenance(recovered.state).exactFromStart).toBe(false);
    expect(BH.bhRecoverBeehiveState(recovered.state).repairs).toEqual([]);
    const advanced = step(recovered.state, cfg());
    expect(BH.bhBroodCohortTotal(advanced.broodCohorts)).toBe(advanced.brood);
    expect(original).toEqual(before);
  });

  it('preserves valid ages, zero brood, and fractional fixture totals without changing tracking', () => {
    for (const brood of [0, 3000, 3000.2]) {
      const original = BH.bhCreateNewColonyState(777, 1);
      original.day = 17;
      original.brood = brood;
      original.broodCohorts = BH.bhNormalizeBroodCohorts(null, brood, BH.SIMULATION_PARAMS, 17);
      original.queenTransition = { kind: 'requeen', daysRemaining: 2, pendingHealth: 92 };
      const recovered = BH.bhRecoverBeehiveState(original);
      expect(recovered.repairs).toEqual([]);
      expect(recovered.state).toBe(original);
      expect(recovered.state.seededFromDay).toBe(0);
    }
  });

  it('defers old-model age inference to migration and ends current tracking for a damaged queen timer', () => {
    const old = { ...BH.bhCreateNewColonyState(777, 1), day: 17, modelVersion: 'colony-daily-1.1' };
    delete old.broodCohorts;
    expect(BH.bhRecoverBeehiveState(old).repairs).toEqual([]);
    expect(BH.bhRecoverBeehiveState(old).state.seededFromDay).toBe(0);
    const current = { ...BH.bhCreateNewColonyState(777, 1), day: 17,
      queenTransition: { kind: 'requeen', daysRemaining: '3', pendingHealth: 100 } };
    const before = structuredClone(current);
    const recovered = BH.bhRecoverBeehiveState(current);
    expect(recovered.state.queenTransition).toBeNull();
    expect(recovered.state.seededFromDay).toBe(17);
    expect(BH.bhExperimentProvenance(recovered.state).exactFromStart).toBe(false);
    expect(BH.bhRecoverBeehiveState(recovered.state).repairs).toEqual([]);
    expect(current).toEqual(before);
  });

  it('rejects sparse age arrays rather than letting an undefined emergence corrupt adult populations', () => {
    const sparse = { schemaVersion: 1, workers: Array(21), drones: Array(24) };
    const normalized = BH.bhNormalizeBroodCohorts(sparse, 100, BH.SIMULATION_PARAMS, 17);
    expect(BH.bhBroodCohortTotal(normalized)).toBe(100);
    expect(Number.isFinite(step(colony({ brood: 100, broodCohorts: sparse }), cfg()).workers)).toBe(true);
    const recovered = BH.bhRecoverBeehiveState({ ...BH.bhCreateNewColonyState(777, 1),
      day: 17, brood: 0, broodCohorts: sparse });
    expect(recovered.state.broodCohorts).toBeUndefined();
    expect(recovered.state.seededFromDay).toBe(17);
  });
});
