import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive management decision preview', () => {
  let BH, config, host, root, latest, awardXP, oldRaf, oldCancelRaf;

  beforeEach(() => {
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    oldRaf = globalThis.requestAnimationFrame;
    oldCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    awardXP = vi.fn();
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    root = host = null;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = oldRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = oldCancelRaf;
    vi.restoreAllMocks();
  });
  function colony(overrides = {}) {
    return { ...BH.bhCreateNewColonyState(777, 1), viewMode: 'beekeeper', tutorialDone: true,
      soundOn: false, motionPaused: true, day: 10, workers: 22000,
      honey: 80, pollen: 80, syrup: 12, diseaseRisk: 30, actionPoints: 3, ...overrides };
  }
  function cfg(overrides = {}) {
    return { params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 },
      siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [],
      rand: vi.fn(() => { throw new Error('Preview consumed a live random draw'); }), ...overrides };
  }
  async function mount(initial, transformUpdater) {
    let transformArmed = false;
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: initial, wave: { retained: true } });
      latest = toolData;
      const setter = transformUpdater ? (update) => setToolData((prev) => typeof update === 'function' ? update(transformArmed ? transformUpdater(prev) : prev) : update) : setToolData;
      return config.render(makeCtx({ toolData, setToolData: setter, awardXP }));
    };
    await act(async () => root.render(React.createElement(Component)));
    transformArmed = true;
    // Loading a saved colony legitimately awards any previously unclaimed
    // milestone badges. Measure action rewards only after that mount completes.
    awardXP.mockClear();
  }
  async function openPreview() {
    const details = host.querySelector('[data-management-preview]');
    await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle', { bubbles: true })); });
  }
  async function choose(selector, value) {
    const select = host.querySelector(selector);
    await act(async () => { select.value = String(value); select.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  async function click(selector) {
    const button = host.querySelector(selector); expect(button).toBeTruthy();
    await act(async () => button.click());
  }

  it('projects 7/30 days without mutating colony, nested evidence, AP, or randomness', () => {
    const state = colony({ notebook: { synthesis: 'Retain this reasoning' }, activeEvent: { id: 'rain', effect: { honey: -3 } } });
    const original = structuredClone(state), options = cfg();
    for (const action of BH.BEEHIVE_MANAGEMENT_PREVIEW_CHOICES) {
      for (const days of [7, 30]) {
        const eligible = action.id === 'winterize' ? { ...state, day: 65 } : state;
        const preview = BH.bhPreviewManagementChoice(eligible, options, action.id, days);
        expect(preview.action.eligible).toBe(true);
        expect(preview.baseline.daysRequested).toBe(days);
        expect(preview.withAction.daysRequested).toBe(days);
        expect(preview.immediate.actionPoints).toBe(3 - action.cost);
      }
    }
    expect(state).toEqual(original);
    expect(options.rand).not.toHaveBeenCalled();
  });

  it.each([
    ['feed_bees', { actionPoints: 0 }, 'Need 1 AP'],
    ['hive_hygiene', { diseaseRisk: 4 }, 'Disease risk is low'],
    ['requeen', { queenTransition: { kind: 'requeen', daysRemaining: 2, pendingHealth: 100 }, queenHealth: 0 }, 'already in progress'],
    ['split_colony', { workers: 17999 }, '18,000'],
    ['split_colony', { day: 60 }, 'Too late'],
    ['split_colony', { queenHealth: 0 }, 'laying queen'],
    ['split_colony', { brood: 0, broodCohorts: { schemaVersion: 1, workers: Array(21).fill(0), drones: Array(24).fill(0) } }, 'young worker brood'],
    ['winterize', { day: 59 }, 'Autumn onward'],
    ['winterize', { day: 65, winterized: true }, 'Already winterized'],
  ])('explains %s eligibility and produces no hypothetical action when blocked', (id, overrides, reason) => {
    const state = colony(overrides), original = structuredClone(state);
    const preview = BH.bhPreviewManagementChoice(state, cfg(), id, 30);
    expect(preview.action.eligible).toBe(false);
    expect(preview.action.reason).toContain(reason);
    expect(preview.action.patch).toEqual({});
    expect(preview.immediate).toBeNull(); expect(preview.baseline).toBeNull();
    expect(state).toEqual(original);
  });

  it('uses supplied stock, site, garden, and biology settings in both branches', () => {
    const state = colony({ queenHealth: 25 });
    const options = cfg({ gardenBonus: 30, subMods: { honey: 1.5, spring: 1.2, winter: 2, varroa: 0.8 },
      siteMods: { forage: 0.6, disease: 1.4 }, params: { ...BH.SIMULATION_PARAMS, requeenAcceptanceDays: 5 } });
    const preview = BH.bhPreviewManagementChoice(state, options, 'requeen', 7);
    expect(preview.immediate.queenTransition.daysRemaining).toBe(5);
    expect(preview.baseline).toEqual(BH.bhForecastColony(state, options, 7));
    expect(preview.withAction).toEqual(BH.bhForecastColony(preview.immediate, options, 7));
    expect(preview.baseline.end.honey).not.toBe(BH.bhPreviewManagementChoice(state, cfg(), 'requeen', 7).baseline.end.honey);
    expect(options.rand).not.toHaveBeenCalled();
  });

  it('distinguishes added syrup from nectar honey and retains aged brood during queen changes', () => {
    const state = colony(), original = structuredClone(state.broodCohorts);
    const feed = BH.bhPreviewManagementChoice(state, cfg(), 'feed_bees', 7);
    expect(feed.immediate.honey - feed.immediate.syrup).toBe(state.honey - state.syrup);
    expect(feed.immediate.syrup).toBe(state.syrup + 5);
    const requeen = BH.bhPreviewManagementChoice(state, cfg(), 'requeen', 7);
    expect(requeen.immediate.broodCohorts).toEqual(original);
    expect(requeen.withAction.timeline[1].queenHealth).toBe(0);
    expect(requeen.withAction.timeline[2].queenHealth).toBe(100);
    const split = BH.bhPreviewManagementChoice(state, cfg(), 'split_colony', 30);
    expect(BH.bhBroodCohortTotal(split.immediate.broodCohorts)).toBe(Math.round(state.brood * 0.6));
    expect(split.withAction.timeline[19].queenHealth).toBe(0);
    expect(split.withAction.timeline[20].queenHealth).toBe(90);
    expect(state.broodCohorts).toEqual(original);
  });

  it('exposes pollen stores from each existing forecast at the shared endpoint without adding an immediate pollen effect', () => {
    for (const choice of BH.BEEHIVE_MANAGEMENT_PREVIEW_CHOICES) {
      for (const horizon of [7, 30]) {
        const state = colony(choice.id === 'winterize' ? { day: 65 } : {}), saved = structuredClone(state), options = cfg();
        const preview = BH.bhPreviewManagementChoice(state, options, choice.id, horizon);
        expect(preview.action.eligible).toBe(true);
        const common = preview.daysCompared - 1;
        const baseline = preview.baseline.timeline[common].pollen, withAction = preview.withAction.timeline[common].pollen;
        expect(preview.differences.filter(entry => entry.key === 'pollen')).toEqual([{
          key: 'pollen', label: 'Pollen stores', baseline, withAction,
          delta: Math.round((withAction - baseline) * 10) / 10, suffix: ' lb'
        }]);
        expect(preview.differences.map(entry => entry.key).slice(4, 7)).toEqual(['syrup', 'pollen', 'varroaLevel']);
        expect(preview.action.patch).not.toHaveProperty('pollen');
        expect(preview.immediate.pollen).toBe(state.pollen);
        expect(state).toEqual(saved); expect(options.rand).not.toHaveBeenCalled();
      }
    }
  });

  it('compares early collapse branches at the same simulated day', () => {
    const preview = BH.bhPreviewManagementChoice(colony({ day: 95, workers: 510, honey: 0, pollen: 0, brood: 0, broodCohorts: null }), cfg(), 'feed_bees', 30);
    expect(preview.daysCompared).toBeLessThan(30);
    const common = preview.daysCompared - 1;
    const workers = preview.differences.find((entry) => entry.key === 'workers');
    expect(workers.baseline).toBe(preview.baseline.timeline[common].workers);
    expect(workers.withAction).toBe(preview.withAction.timeline[common].workers);
    const pollen = preview.differences.find((entry) => entry.key === 'pollen');
    expect(pollen.baseline).toBe(preview.baseline.timeline[common].pollen);
    expect(pollen.withAction).toBe(preview.withAction.timeline[common].pollen);
  });

  it('opening, selecting and locating remains a local UI-only exploration', async () => {
    await mount(colony());
    const saved = structuredClone(latest);
    await openPreview();
    await choose('[data-management-preview-choice]', 'requeen');
    await choose('[data-management-preview-horizon]', 30);
    expect(host.querySelector('[data-management-preview-results]').textContent).toContain('after 30 days');
    expect(host.querySelector('[data-management-preview-immediate]').textContent).toContain('Paused for 3 modeled days');
    await click('[data-management-preview-locate]');
    expect(document.activeElement).toBe(host.querySelector('[data-management-choice="requeen"]'));
    expect(latest).toEqual(saved);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it.each(['feed_bees', 'hive_hygiene', 'add_super', 'requeen', 'split_colony', 'winterize'])('live %s exactly matches the preview patch and commits one evidence/reward record', async (id) => {
    const initial = colony(id === 'winterize' ? { day: 65 } : {});
    const expected = BH.bhManagementAction(initial, id);
    await mount(initial);
    await click('[data-management-choice="' + id + '"]');
    expect(latest.beehive).toMatchObject(expected.patch);
    expect(latest.beehive.actionPoints).toBe(initial.actionPoints - expected.cost);
    expect(latest.beehive.managementTrail).toHaveLength(1);
    expect(latest.beehive.lastManagement.choiceId).toBe(id);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(latest.wave).toEqual({ retained: true });
  });

  it('revalidates a winterize action against live queued state before spending or rewarding', async () => {
    await mount(colony({ day: 65 }), (prev) => ({ ...prev, beehive: { ...prev.beehive, day: 10 } }));
    await click('[data-management-choice="winterize"]');
    expect(latest.beehive.winterized).toBeFalsy();
    expect(latest.beehive.actionPoints).toBe(3);
    expect(latest.beehive.managementTrail).toHaveLength(0);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('blocks batched duplicate queen introductions and keeps preview AP readiness current', async () => {
    await mount(colony({ actionPoints: 4 }));
    const button = host.querySelector('[data-management-choice="requeen"]');
    await act(async () => { button.click(); button.click(); });
    expect(latest.beehive.actionPoints).toBe(2);
    expect(latest.beehive.managementTrail).toHaveLength(1);
    expect(awardXP).toHaveBeenCalledTimes(1);
    await openPreview(); await choose('[data-management-preview-choice]', 'requeen');
    expect(host.querySelector('[data-management-preview-readiness]').textContent).toContain('already in progress');
    expect(host.querySelector('[data-management-preview-results]')).toBeNull();
  });

  it('marks Harvest unavailable when total stores exceed reserve but nectar honey does not', async () => {
    await mount(colony({ honey: 30, syrup: 20 }));
    const harvest = host.querySelector('[data-management-choice="harvest_honey"]');
    expect(harvest.getAttribute('aria-disabled')).toBe('true');
    expect(harvest.getAttribute('data-unavailable-reason')).toContain('syrup is excluded');
  });
});
