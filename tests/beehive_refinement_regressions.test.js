import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const IDENTITY_SUBSPECIES = { honey: 1, spring: 1, winter: 1, varroa: 1 };
const IDENTITY_SITE = { forage: 1, disease: 1 };

function noEventConfig(BH) {
  return {
    params: BH.SIMULATION_PARAMS,
    subMods: IDENTITY_SUBSPECIES,
    siteMods: IDENTITY_SITE,
    gardenBonus: 0,
    hiveEvents: [],
    diseaseEvents: [],
    rand: () => 0.99,
  };
}

function colony(overrides = {}) {
  return Object.assign({
    viewMode: 'beekeeper',
    beeView: 'scene',
    tutorialDone: true,
    day: 10,
    workers: 20_000,
    brood: 8_000,
    drones: 500,
    queenHealth: 100,
    honey: 40,
    pollen: 20,
    wax: 5,
    varroaLevel: 5,
    morale: 80,
    foragingEfficiency: 70,
    habitat: 50,
    pesticideExposure: 0,
    diseaseRisk: 0,
    capacity: 80,
    actionPoints: 3,
    activeEvent: null,
    colonySurvived: true,
    soundOn: false,
  }, overrides);
}

function canvasContext() {
  const gradient = { addColorStop: vi.fn() };
  return new Proxy({
    setTransform: vi.fn(),
    measureText: vi.fn(() => ({ width: 80 })),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      target[prop] = vi.fn();
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

describe('Beehive refinement regressions', () => {
  let host;
  let root;
  let config;
  let BH;
  let latest;
  let originalRaf;
  let originalCancelRaf;

  async function mountBee(initial, contextOverrides = {}) {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: initial });
      latest = toolData;
      return config.render(makeCtx(Object.assign({ toolData, setToolData }, contextOverrides)));
    };
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
  }

  async function pressKey(key, init = {}, target = document) {
    const event = new KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, init));
    await act(async () => {
      target.dispatchEvent(event);
      await Promise.resolve();
    });
    return event;
  }

  beforeEach(() => {
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    window.__testHooks = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => canvasContext());
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    vi.useRealTimers();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    delete window.__testHooks;
    vi.restoreAllMocks();
  });

  it('carries a just-applied Winterize intervention into the very next colony step', async () => {
    // At 40k workers, the 18% winterized consumption reduction survives the
    // simulator's one-decimal store rounding (59.7 lb wrapped vs 59.6 unwrapped).
    const initial = colony({ day: 90, workers: 40_000, brood: 4_000, honey: 60 });
    const pureState = Object.assign({}, initial, { winterized: true });
    const expectedWinterized = BH.bhStepColony(pureState, noEventConfig(BH)).next;
    const expectedUnwrapped = BH.bhStepColony(Object.assign({}, pureState, { winterized: false }), noEventConfig(BH)).next;
    await mountBee(initial);

    const winterize = host.querySelector('[data-management-action="Winterize"]');
    expect(winterize).toBeTruthy();
    expect(winterize.disabled).toBe(false);
    await act(async () => {
      winterize.click();
      await Promise.resolve();
    });
    expect(latest.beehive.winterized).toBe(true);

    const nextDay = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Next Day'));
    await act(async () => {
      nextDay.click();
      await Promise.resolve();
    });

    expect(latest.beehive.day).toBe(91);
    expect(latest.beehive.honey).toBe(expectedWinterized.honey);
    expect(latest.beehive.honey).toBeGreaterThan(expectedUnwrapped.honey);
    expect(latest.beehive.lastAdvance.honey).toBeCloseTo(expectedWinterized.honey - initial.honey, 1);
  });

  it('commits two rapid Next Day activations as two complete daily steps', async () => {
    await mountBee(colony({ day: 10, history: [], journal: [], activeEvent: null }));
    const nextDay = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Next Day'));
    expect(nextDay).toBeTruthy();

    await act(async () => {
      nextDay.click();
      nextDay.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest.beehive.day).toBe(12);
    expect(latest.beehive.history.map((entry) => entry.d)).toEqual([11, 12]);
    expect(latest.beehive.journal).toHaveLength(2);
  });

  it('stops a rapid double Next Day sequence after the first step raises an event', async () => {
    // Seed 7 begins with a draw below the model's 0.12 event threshold.
    // The daily simulation intentionally no longer reads global Math.random.
    await mountBee(colony({
      day: 10,
      history: [],
      journal: [],
      activeEvent: null,
      modelVersion: 'colony-daily-1.0',
      simulationSeed: 7,
      randomState: 7,
      seededFromDay: 0,
    }));
    const nextDay = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Next Day'));

    await act(async () => {
      nextDay.click();
      nextDay.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest.beehive.day).toBe(11);
    expect(latest.beehive.activeEvent).toBeTruthy();
    expect(latest.beehive.history).toHaveLength(1);
    expect(latest.beehive.journal).toHaveLength(1);
  });

  it('ignores auto-repeated one-key shortcuts', async () => {
    await mountBee(colony({ day: 10, autoAdvance: false }));
    const beeRoot = host.querySelector('[data-beehive-root="true"]');

    await pressKey('n', { repeat: true }, beeRoot);
    await pressKey(' ', { repeat: true }, beeRoot);

    expect(latest.beehive.day).toBe(10);
    expect(latest.beehive.autoAdvance).toBe(false);
  });

  it('disarms auto-advance while an event is awaiting acknowledgement', async () => {
    vi.useFakeTimers();
    const activeEvent = {
      id: 'audit_event',
      label: 'Audit event',
      desc: 'A deterministic event for the auto-advance guard.',
      lesson: 'Events require an explicit management response.',
      effect: { morale: -5 },
    };
    await mountBee(colony({ day: 10, autoAdvance: true, activeEvent }));

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });
    expect(latest.beehive.autoAdvance).toBe(false);
    expect(latest.beehive.day).toBe(10);

    const acknowledge = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Acknowledge'));
    await act(async () => {
      acknowledge.click();
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(latest.beehive.activeEvent).toBeNull();
    expect(latest.beehive.autoAdvance).toBe(false);
    expect(latest.beehive.day).toBe(10);
  });
  it('preserves tenths while pesticide exposure and disease risk accumulate or decay', () => {
    const pesticide = BH.bhStepColony(colony({ day: 0, pesticideExposure: 10 }), noEventConfig(BH)).next;
    expect(pesticide.pesticideExposure).toBeCloseTo(9.7, 5);

    const diseaseIncrease = BH.bhStepColony(
      colony({ day: 0, pesticideExposure: 35, diseaseRisk: 10 }),
      noEventConfig(BH),
    ).next;
    expect(diseaseIncrease.diseaseRisk).toBeCloseTo(10.3, 5);

    const diseaseDecay = BH.bhStepColony(
      colony({ day: 90, pesticideExposure: 0, diseaseRisk: 10 }),
      noEventConfig(BH),
    ).next;
    expect(diseaseDecay.diseaseRisk).toBeCloseTo(9.7, 5);
  });

  it('commits a rapid double-click on Add Super only once when one action point remains', async () => {
    const awardXP = vi.fn();
    const addToast = vi.fn();
    await mountBee(colony({
      day: 0,
      workers: 10_000,
      brood: 3_000,
      honey: 20,
      morale: 70,
      wax: 5,
      capacity: 80,
      actionPoints: 1,
    }), { awardXP, addToast });

    const addSuper = host.querySelector('[data-management-action="Super"]');
    expect(addSuper).toBeTruthy();
    expect(addSuper.disabled).toBe(false);
    await act(async () => {
      addSuper.click();
      addSuper.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest.beehive).toMatchObject({
      actionPoints: 0,
      capacity: 120,
      wax: 7,
      morale: 80,
    });
    expect(latest.beehive.managementTrail).toHaveLength(1);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('beehive', 5, 'Added super');
    const successToasts = addToast.mock.calls.filter((call) => call[1] === 'success');
    expect(successToasts).toHaveLength(1);
    expect(successToasts[0][0]).toContain('Added a honey super');
  });

  it('does not let an older beekeeper animation timer clear a newer animation', async () => {
    // Mount with real timers so unrelated React effects cannot leave async act
    // waiting on the fake clock; only the two action-animation timers matter.
    await mountBee(colony({
      day: 0,
      workers: 1_000,
      brood: 100,
      queenHealth: 40,
      honey: 1,
      pollen: 1,
      varroaLevel: 50,
      morale: 30,
      actionPoints: 3,
    }));
    vi.useFakeTimers();
    const feed = host.querySelector('[data-management-action="Feed"]');
    const addSuper = host.querySelector('[data-management-action="Super"]');

    act(() => feed.click());
    expect(latest.beehive.bkAnim.type).toBe('feed');

    act(() => vi.advanceTimersByTime(1000));
    act(() => addSuper.click());
    expect(latest.beehive.bkAnim.type).toBe('super');

    act(() => vi.advanceTimersByTime(4001));
    expect(latest.beehive.bkAnim.type).toBe('super');

    act(() => vi.advanceTimersByTime(999));
    expect(latest.beehive.bkAnim).toBeNull();
  });
  it('clamps malformed pesticide input while bounded drift events can increase exposure', () => {
    const malformed = BH.bhStepColony(
      colony({ day: 0, workers: 0, brood: 0, pesticideExposure: 250 }),
      noEventConfig(BH),
    ).next;
    expect(malformed.pesticideExposure).toBeCloseTo(99.7, 5);

    const drift = { id: 'pesticide_drift', effect: { pesticideExposure: 35 } };
    const randomValues = [0, 0];
    const driftResult = BH.bhStepColony(
      colony({ day: 45, workers: 5_000, capacity: 800, pesticideExposure: 90 }),
      Object.assign({}, noEventConfig(BH), {
        hiveEvents: [drift],
        rand: () => randomValues.length ? randomValues.shift() : 0.99,
      }),
    );
    expect(driftResult.event).toBe(drift);
    expect(driftResult.next.pesticideExposure).toBeGreaterThan(90);
    expect(driftResult.next.pesticideExposure).toBeLessThanOrEqual(100);
    expect(driftResult.next.pesticideExposure).toBeCloseTo(99.7, 5);
  });

  it.each([
    ['non-finite values', {
      day: Number.NaN,
      workers: Number.NaN,
      brood: Number.POSITIVE_INFINITY,
      drones: Number.NEGATIVE_INFINITY,
      honey: Number.NaN,
      pollen: Number.POSITIVE_INFINITY,
      wax: Number.NaN,
      capacity: Number.NEGATIVE_INFINITY,
    }],
    ['negative populations and stores', {
      day: -50,
      workers: -10,
      brood: -20,
      drones: -30,
      honey: -40,
      pollen: -50,
      wax: -60,
      capacity: -70,
    }],
    ['out-of-range health and exposure meters', {
      queenHealth: 180,
      varroaLevel: -25,
      morale: 400,
      foragingEfficiency: -80,
      habitat: 250,
      pesticideExposure: 250,
      diseaseRisk: 500,
    }],
  ])('normalizes malformed persisted state before colony biology: %s', (_label, patch) => {
    const result = BH.bhStepColony(colony(Object.assign({ activeEvent: {} }, patch)), noEventConfig(BH)).next;
    const finiteFields = [
      'day', 'workers', 'brood', 'drones', 'honey', 'pollen', 'wax',
      'queenHealth', 'varroaLevel', 'morale', 'foragingEfficiency',
      'habitat', 'pesticideExposure', 'diseaseRisk', 'capacity',
      'scoreGain', 'honeyGain', 'honeyGrossIn', 'honeyConsumed',
      'starveDeaths', 'starveBroodLost', 'pollenBroodReduced', 'flowerVisits',
    ];
    finiteFields.forEach((field) => expect(Number.isFinite(result[field]), field).toBe(true));
    ['day', 'workers', 'brood', 'drones', 'honey', 'pollen', 'wax', 'capacity']
      .forEach((field) => expect(result[field], field).toBeGreaterThanOrEqual(0));
    ['queenHealth', 'varroaLevel', 'morale', 'foragingEfficiency', 'habitat', 'pesticideExposure', 'diseaseRisk']
      .forEach((field) => {
        expect(result[field], field).toBeGreaterThanOrEqual(0);
        expect(result[field], field).toBeLessThanOrEqual(100);
      });
  });

  it('treats persisted pesticide exposure above 100 exactly like the 100% ceiling', () => {
    const step = (pesticideExposure) => BH.bhStepColony(
      colony({ day: 45, pesticideExposure, activeEvent: {} }),
      noEventConfig(BH),
    ).next;
    expect(step(250)).toEqual(step(100));
  });
  it('scales new brood across full, partial, and zero pollen with a 35% nurse-reserve floor', () => {
    const P = BH.SIMULATION_PARAMS;
    const base = colony({
      day: 0,
      workers: 20_000,
      brood: 10_000,
      foragingEfficiency: 0,
      capacity: 800,
    });
    const emerging = Math.round(base.brood * P.broodEmergeRate);
    const pollenDemand = (base.brood * P.pollenConsumePerBrood
      + base.workers * P.pollenConsumePerWorker) * 0.9;
    const step = (pollen) => BH.bhStepColony(
      Object.assign({}, base, { pollen }),
      noEventConfig(BH),
    ).next;
    const full = step(pollenDemand + 1);
    const partial = step(pollenDemand / 2);
    const zero = step(0);
    const newBrood = (next) => next.brood - base.brood + emerging;

    expect(full.pollenLimited).toBe(false);
    expect(full.pollenBroodReduced).toBe(0);
    expect(partial.pollenLimited).toBe(true);
    expect(partial.pollenBroodReduced).toBeGreaterThan(0);
    expect(partial.pollenBroodReduced).toBeLessThan(zero.pollenBroodReduced);
    expect(newBrood(partial)).toBeGreaterThan(newBrood(zero));
    expect(newBrood(partial)).toBeLessThan(newBrood(full));

    expect(P.pollenBroodDependence).toBe(0.65);
    const nurseReserveFloor = newBrood(full)
      - Math.round(newBrood(full) * P.pollenBroodDependence);
    expect(newBrood(zero)).toBe(nurseReserveFloor);
    expect(newBrood(zero) / newBrood(full)).toBeCloseTo(0.35, 2);
  });

  it('conserves each emerging cohort and classifies drones by the egg-laying season', () => {
    const P = BH.SIMULATION_PARAMS;
    const brood = 10_000;
    const emerging = Math.round(brood * P.broodEmergeRate);
    function adultCohortAt(day) {
      const base = colony({ day, workers: 20_000, brood: 0, drones: 500, capacity: 800 });
      const withoutBrood = BH.bhStepColony(base, noEventConfig(BH)).next;
      const withBrood = BH.bhStepColony(Object.assign({}, base, { brood }), noEventConfig(BH)).next;
      return {
        workers: withBrood.workers - withoutBrood.workers,
        drones: withBrood.drones - withoutBrood.drones,
      };
    }

    // Day 60 is autumn, but the emerging cohort was laid 21 days earlier in summer.
    const enteringAutumn = adultCohortAt(60);
    expect(enteringAutumn.drones).toBe(Math.round(emerging * P.droneBirthRate));
    expect(enteringAutumn.workers + enteringAutumn.drones).toBe(emerging);

    // Day 120 is spring, but this cohort was laid in winter and contains no drones.
    const enteringSpring = adultCohortAt(120);
    expect(enteringSpring.drones).toBe(0);
    expect(enteringSpring.workers + enteringSpring.drones).toBe(emerging);
    expect(P.workerDevelopmentDays).toBe(21);
  });
  it('resets all per-colony management state when starting a new colony', async () => {
    const earnedBadges = { first_day: true, survive_30: true };
    await mountBee(colony({
      colonySurvived: false,
      day: 84,
      workers: 120,
      capacity: 200,
      winterized: true,
      totalHarvested: 42.5,
      varietals: { buckwheat: { lbs: 42.5, jars: 43 } },
      treatmentsUsed: { formic: 3 },
      splitsMade: 2,
      varroaTreats: 4,
      conservationsDone: 7,
      hygieneActions: 5,
      supersAdded: 3,
      autoAdvance: true,
      exportedReport: 'Report for the collapsed colony',
      exportedReportTitle: 'Old Colony Report',
      quizOpen: true,
      quizIdx: 1,
      quizScore: 1,
      quizAnswered: 1,
      quizFeedback: { correct: true, explanation: 'Stale answer feedback' },
      quizQuestions: [
        { q: 'Stale question one', opts: ['A', 'B'], ans: 0, explain: 'Old explanation' },
        { q: 'Stale question two', opts: ['A', 'B'], ans: 1, explain: 'Old explanation' },
      ],
      badges: earnedBadges,
      bestQuizScore: 9,
      layersViewed: ['roles', 'honey_chem', 'lifecycle'],
      simulationSeed: 2468,
      randomState: 1357,
      seededFromDay: 0,
    }));

    const restart = host.querySelector('button[data-beehive-restart="same-seed"]');
    expect(restart).toBeTruthy();
    await act(async () => {
      restart.click();
      await Promise.resolve();
    });

    expect(latest.beehive).toMatchObject({
      colonySurvived: true,
      day: 0,
      capacity: 80,
      winterized: false,
      totalHarvested: 0,
      varietals: {},
      treatmentsUsed: {},
      splitsMade: 0,
      varroaTreats: 0,
      conservationsDone: 0,
      hygieneActions: 0,
      supersAdded: 0,
      autoAdvance: false,
      exportedReport: null,
      exportedReportTitle: null,
      quizOpen: false,
      quizIdx: 0,
      quizScore: 0,
      quizAnswered: 0,
      quizFeedback: null,
      quizQuestions: null,
      simulationSeed: 2468,
      randomState: 2468,
      seededFromDay: 0,
    });
    // Cross-run mastery survives. Additional badges may be auto-awarded from
    // the completed pre-reset run before the restart click is processed.
    expect(latest.beehive.badges).toMatchObject(earnedBadges);
    expect(latest.beehive.bestQuizScore).toBe(9);
    expect(latest.beehive.layersViewed).toEqual(['roles', 'honey_chem', 'lifecycle']);
  });

  it('awards each newly earned badge once under React StrictMode', async () => {
    vi.useFakeTimers();
    const awardXP = vi.fn();
    const addToast = vi.fn();
    const initial = colony({
      day: 1,
      workers: 1000,
      brood: 100,
      queenHealth: 40,
      honey: 1,
      varroaLevel: 50,
      morale: 30,
      badges: {},
    });
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: initial });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, awardXP, addToast }));
    };

    await act(async () => {
      root.render(React.createElement(React.StrictMode, null, React.createElement(Component)));
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(latest.beehive.badges.first_day).toBeTruthy();
    expect(awardXP.mock.calls.filter((call) => call[2] === 'Badge: First Dawn')).toHaveLength(1);
    expect(addToast.mock.calls.filter((call) => String(call[0]).includes('Badge earned: First Dawn'))).toHaveLength(1);
  });
  it('uses the autumn reserve in the Harvest gate, preview, copy, and applied result', async () => {
    await mountBee(colony({ day: 60, honey: 59.9 }));
    let harvest = host.querySelector('[data-management-action="Harvest"]');
    expect(harvest.disabled).toBe(true);
    expect(harvest.getAttribute('aria-label')).toMatch(/60\s*lb/i);
    expect(harvest.getAttribute('aria-label')).not.toMatch(/leave 15 lb|more than 15 lb/i);
    expect(harvest.textContent).toMatch(/leave 60 lb/i);
    expect(host.querySelector('[title*="Surplus ready to harvest"]')).toBeNull();

    await mountBee(colony({ day: 60, honey: 65 }));
    harvest = host.querySelector('[data-management-action="Harvest"]');
    expect(harvest.disabled).toBe(false);
    expect(harvest.getAttribute('aria-label')).toMatch(/leave 60 lb/i);
    const preview = host.querySelector('[title*="Surplus ready to harvest"]');
    expect(preview).toBeTruthy();
    expect(preview.textContent).toContain('5 lbs ready');

    await act(async () => {
      harvest.click();
      await Promise.resolve();
    });
    expect(latest.beehive.honey).toBe(60);
    expect(latest.beehive.totalHarvested).toBe(5);
    expect(latest.beehive.lastManagement.summary).toMatch(/left 60 lb for overwintering/i);
  });

  it('invokes fresh shortcut callbacks after each render instead of replaying the first-day closure', async () => {
    await mountBee(colony({ day: 10 }));
    const beeRoot = host.querySelector('[data-beehive-root="true"]');
    expect(beeRoot).toBeTruthy();

    await pressKey('n', {}, beeRoot);
    expect(latest.beehive.day).toBe(11);
    await pressKey('n', {}, beeRoot);
    expect(latest.beehive.day).toBe(12);
    expect(latest.beehive.lastAdvance).toMatchObject({ fromDay: 11, toDay: 12, days: 1 });
  });

  it('leaves Space to a focused button instead of toggling the global auto-advance shortcut', async () => {
    await mountBee(colony({ day: 10, autoAdvance: false }));
    const nextDay = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Next Day'));
    nextDay.focus();
    expect(document.activeElement).toBe(nextDay);

    const event = await pressKey(' ', {}, nextDay);
    expect(event.defaultPrevented).toBe(false);
    expect(latest.beehive.autoAdvance).toBe(false);
    expect(latest.beehive.day).toBe(10);
  });

  it('builds the AI tutor prompt from the live colony stores and calendar season', async () => {
    const callGemini = vi.fn().mockResolvedValue('  Bees turn nectar into concentrated stores.  ');
    await mountBee(colony({
      beeView: 'honey',
      day: 75,
      workers: 12_345,
      honey: 64.5,
      totalHoney: 999,
      season: 'spring',
    }), { callGemini });

    const explain = host.querySelector('button[aria-label^="Generate AI explanation"]');
    expect(explain).toBeTruthy();
    await act(async () => {
      explain.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(callGemini).toHaveBeenCalledOnce();
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('Current view: honey production');
    expect(prompt).toContain('75 days old');
    expect(prompt).toContain('12345 workers');
    expect(prompt).toMatch(/64\.5 lb currently stored/i);
    expect(prompt).toMatch(/season:\s*\uD83C\uDF42\s*autumn/i);
    expect(prompt).not.toMatch(/999[^.]*honey/i);
    expect(latest.beehive.aiExplain_honey).toBe('Bees turn nectar into concentrated stores.');
    expect(latest.beehive.aiLoading_honey).toBe(false);
  });

  it('requires a harvest in the current Summer and year before completing the surplus goal', async () => {
    await mountBee(colony({
      day: 150,
      honey: 30,
      totalHarvested: 5,
      lastHarvestSeason: 1,
      lastHarvestYear: 1,
      varietals: {
        summer_wildflower: {
          name: 'Summer Wildflower',
          emoji: '\uD83C\uDF3C',
          note: 'An earlier Summer harvest',
          lbs: 5,
          jars: 5,
          firstDay: 45,
          lastDay: 45,
        },
      },
    }));

    let summerGoals = host.querySelector('[role="region"][aria-label^="Summer goals:"]');
    expect(summerGoals).toBeTruthy();
    expect(summerGoals.querySelector('li').textContent).toMatch(/in progress/i);

    const harvest = host.querySelector('[data-management-action="Harvest"]');
    expect(harvest).toBeTruthy();
    expect(harvest.disabled).toBe(false);
    await act(async () => {
      harvest.click();
      await Promise.resolve();
    });

    expect(latest.beehive).toMatchObject({
      honey: 25,
      totalHarvested: 10,
      lastHarvestSeason: 1,
      lastHarvestYear: 2,
    });
    summerGoals = host.querySelector('[role="region"][aria-label^="Summer goals:"]');
    expect(summerGoals.querySelector('li').textContent).toMatch(/complete/i);
  });

  it('surfaces the low-store reflection below the Autumn reserve, not only in Winter', async () => {
    await mountBee(colony({ day: 75, honey: 59 }));
    let reflection = host.querySelector('[data-reflection-prompt="low_honey_winter"]');
    expect(reflection).toBeTruthy();
    expect(reflection.querySelector('p').textContent).toMatch(/honey|stores|reserve/i);

    await mountBee(colony({ day: 75, honey: 60 }));
    reflection = host.querySelector('[role="region"][aria-label="Reflection question"]');
    expect(reflection).toBeTruthy();
    expect(reflection.getAttribute('data-reflection-prompt')).not.toBe('low_honey_winter');
  });

  it('keeps authoritative and desktop Bee runtime copy aligned and free of stale claims', () => {
    const paths = [
      resolve(process.cwd(), 'ui_strings.js'),
      resolve(process.cwd(), 'desktop/web-app/public/ui_strings.js'),
    ];
    const catalogs = paths.map((path) => JSON.parse(readFileSync(path, 'utf8')).stem.beehive);
    expect(catalogs[1]).toEqual(catalogs[0]);

    const staleClaims = [
      /\b15\s*(?:lb|lbs|pounds)\b/i,
      /\b200\+\s*(?:ft|feet)\b/i,
      /\b90\s*seconds?\b/i,
      /\bQueen Command\b/i,
      /\bReign\b/i,
      /\bPheromone Commands\b/i,
    ];
    for (const catalog of catalogs) {
      const runtimeCopy = Object.values(catalog).join('\n');
      for (const staleClaim of staleClaims) {
        expect(runtimeCopy).not.toMatch(staleClaim);
      }
    }
  });
  it('ships and renders without Unicode replacement glyphs', async () => {
    const paths = [
      resolve(process.cwd(), 'stem_lab/stem_tool_beehive.js'),
      resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_beehive.js'),
    ];
    for (const path of paths) {
      expect(readFileSync(path, 'utf8')).not.toContain('\uFFFD');
    }

    await mountBee(colony());
    expect(host.textContent).not.toContain('\uFFFD');
  });
});
