// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let E, cfg;
beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab');
  E = cfg.engine;
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

const hotChicken = () => Object.assign(E.defaultState(), E.freshCookState('panSeared', 1000000), {
  recipeItemsInPan: ['oil', 'chicken'], recipeBurnerLevel: 8, recipePanTempF: 400,
  recipeBrowning: 4, recipeSimElapsedSec: 120, recipeFoodInternalF: 120,
  recipeMoisture: 0, recipeOptions: { dry: 'patted' }
});
const tick = (state, sec) => Object.assign({}, state,
  E.advanceDoneness(state, E.RECIPES.panSeared, 400, sec, 1000000 + sec * 1000),
  { recipeSimElapsedSec: state.recipeSimElapsedSec + sec });

describe('Kitchen Lab preserves browning history when food moves', () => {
  it('changes contact and attention without reversing colour, heating food, or advancing the clock', () => {
    const before = hotChicken();
    const saved = structuredClone(before);
    const patch = E.moveFood(before, E.RECIPES.panSeared);
    const moved = { ...before, ...patch };
    expect(before).toEqual(saved);
    expect(moved.recipeBrowning).toBe(4);
    expect(moved.recipeFoodInternalF).toBe(120);
    expect(moved.recipeSimElapsedSec).toBe(120);
    expect(moved.recipeLastTickAt).toBe(before.recipeLastTickAt);
    expect(moved.recipeLastStirSimSec).toBe(120);
    expect(moved.recipeStirCount).toBe(1);
    expect(moved.recipeContactRecoverySec).toBeGreaterThan(0);
    expect(patch).not.toHaveProperty('recipeBrowning');
  });

  it('slows only new browning, then restores its normal rate', () => {
    const prior = hotChicken();
    const moved = { ...prior, ...E.moveFood(prior, E.RECIPES.panSeared) };
    const early = tick(moved, 1);
    expect(early.recipeBrowning).toBeGreaterThan(prior.recipeBrowning);
    expect(early.recipeBrowning).toBeLessThan(tick(prior, 1).recipeBrowning);
    const settled = tick(moved, moved.recipeContactRecoverySec);
    expect(settled.recipeContactRecoverySec).toBe(0);
    expect(tick(settled, 1).recipeBrowning - settled.recipeBrowning)
      .toBeCloseTo(tick(prior, 1).recipeBrowning - prior.recipeBrowning, 10);
  });

  it('integrates recovery consistently across one long tick or many short ticks', () => {
    const prior = hotChicken();
    const moved = { ...prior, ...E.moveFood(prior, E.RECIPES.panSeared) };
    const duration = moved.recipeContactRecoverySec + 10;
    const whole = tick(moved, duration);
    let split = moved;
    for (let sec = 0; sec < duration; sec++) split = tick(split, 1);
    expect(whole.recipeBrowning).toBeCloseTo(split.recipeBrowning, 10);
    expect(whole.recipeContactRecoverySec).toBe(0);
    expect(split.recipeContactRecoverySec).toBe(0);
  });

  it('frequent movement reduces future growth without ever making colour run backwards', () => {
    let still = hotChicken(), frequent = hotChicken();
    for (let sec = 0; sec < 60; sec++) {
      const before = frequent.recipeBrowning;
      if (sec % 3 === 0) frequent = { ...frequent, ...E.moveFood(frequent, E.RECIPES.panSeared) };
      expect(frequent.recipeBrowning).toBe(before);
      frequent = tick(frequent, 1);
      still = tick(still, 1);
      expect(frequent.recipeBrowning).toBeGreaterThanOrEqual(before);
    }
    expect(frequent.recipeBrowning).toBeLessThan(still.recipeBrowning);
    expect(frequent.recipeFoodInternalF).toBeCloseTo(still.recipeFoodInternalF, 10);
  });

  it('leaves stirred recipes and pans without searing food free of contact penalties', () => {
    const eggs = { ...hotChicken(), recipeItemsInPan: ['butter', 'eggs'] };
    const stirred = E.moveFood(eggs, E.RECIPES.scrambledEggs);
    expect(stirred.recipeLastStirSimSec).toBe(120);
    expect(stirred).not.toHaveProperty('recipeContactRecoverySec');
    expect(E.moveFood({ ...hotChicken(), recipeItemsInPan: ['oil'] }, E.RECIPES.panSeared))
      .not.toHaveProperty('recipeContactRecoverySec');
    expect(E.moveFood({ ...hotChicken(), recipeItemsInPan: [] }, E.RECIPES.panSeared)).toEqual({});
    expect(E.moveFood(hotChicken(), E.RECIPES.panSeared, 0)).toEqual({});
  });

  it('starts fresh and safely supplies missing recovery state from older saves', () => {
    expect(E.defaultState().recipeContactRecoverySec).toBe(0);
    expect(E.freshCookState('panSeared', 1000000).recipeContactRecoverySec).toBe(0);
    expect(E.klCleanState({ recipeBrowning: 4 }).recipeContactRecoverySec).toBe(0);
    expect(E.klCleanState({ recipeContactRecoverySec: 'bad' }).recipeContactRecoverySec).toBe(0);
  });

  it('includes recovering contact in a forecast without changing the live cook', () => {
    const prior = { ...hotChicken(), recipeBrowning: 3.95 };
    const moved = { ...prior, ...E.moveFood(prior, E.RECIPES.panSeared) };
    const saved = structuredClone(moved);
    const stillShade = E.forecast(E.RECIPES.panSeared, prior, 60).marks.find(mark => mark.id === 'shade');
    const movedShade = E.forecast(E.RECIPES.panSeared, moved, 60).marks.find(mark => mark.id === 'shade');
    expect(stillShade).toBeDefined();
    expect(movedShade).toBeDefined();
    expect(movedShade.sec).toBeGreaterThan(stillShade.sec);
    expect(moved).toEqual(saved);
  });

  it('uses the same movement outcome for scheduled, logged, and live cooks', () => {
    const rec = E.RECIPES.panSeared;
    const base = [{ level: 8, add: ['oil'], until: 60 }, { level: 8, add: ['chicken'], until: 120 }];
    const before = E.simulateCook(rec, base, { fullState: true });
    const logged = E.simulateCook(rec, [...base, { level: 8, stirNow: 1, until: 120 }], { fullState: true });
    const expected = { ...before.state, ...E.moveFood(before.state, rec) };
    expect(logged.browning).toBe(before.browning);
    expect(logged.state.recipeContactRecoverySec).toBe(expected.recipeContactRecoverySec);
    expect(logged.state.recipeStirCount).toBe(expected.recipeStirCount);
    expect(logged.state.recipeSimElapsedSec).toBe(before.state.recipeSimElapsedSec);
    const scheduled = E.simulateCook(rec, [base[0], { ...base[1], stirEvery: 60 }], { fullState: true });
    expect(scheduled.browning).toBe(logged.browning);
    expect(scheduled.state.recipeContactRecoverySec).toBe(logged.state.recipeContactRecoverySec);

    vi.useFakeTimers();
    vi.setSystemTime(1000000);
    const live = { ...E.defaultState(), ...E.freshCookState('panSeared', Date.now()), ...before.state,
      activeSection: 'recipe', recipePhase: 'cooking', recipeActiveId: 'panSeared' };
    const store = newStore({ kitchenLab: live });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    try {
      React.act(() => root.render(cfg.render(makeCtx({ toolData: store.toolData }, store))));
      const button = host.querySelector('[data-kl-stir="disturbs"]');
      expect(button).not.toBeNull();
      React.act(() => button.click());
      const after = store.toolData.kitchenLab;
      expect(after.recipeBrowning).toBe(logged.browning);
      expect(after.recipeContactRecoverySec).toBe(logged.state.recipeContactRecoverySec);
      expect(after.recipeStirCount).toBe(logged.state.recipeStirCount);
      expect(after.recipeSimElapsedSec).toBe(before.state.recipeSimElapsedSec);
      expect(after.recipeLog.at(-1)).toMatchObject({ k: 'stir', t: before.state.recipeSimElapsedSec });
      React.act(() => root.render(cfg.render(makeCtx({ toolData: store.toolData }, store))));
      expect(host.querySelector('[data-kl-stir-caption]').textContent).toContain('existing colour stays');
    } finally {
      React.act(() => root.unmount());
      host.remove();
    }
  });
});
