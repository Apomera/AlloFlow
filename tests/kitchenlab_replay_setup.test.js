// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let E, cfg;
beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab');
  E = cfg.engine;
});
afterEach(() => vi.useRealTimers());

const eggLog = [
  { t: 0, k: 'dial', level: 3 }, { t: 30, k: 'add', id: 'butter' },
  { t: 40, k: 'add', id: 'eggs' }, { t: 48, k: 'stir' },
  { t: 52, k: 'dial', level: 0 }, { t: 52, k: 'add', id: 'saltPepper' }
];
const setup = () => E.captureCookSetup({ klPanMaterial: 'castIron', recipeOptions: { eggs: 'pasteurised' }, recipeOil: 'Butter', klAltitudeFt: 5280 });
const replay = (original, variable = 'dial', choice = '0', log = eggLog, end = 82) => E.runReplay(E.RECIPES.scrambledEggs, log, end, 'same-cook-key', variable, choice, original);

describe('Kitchen Lab replays preserve the recorded setup', () => {
  it('reproduces the original ingredient choice instead of judging a different egg cook', () => {
    const original = E.captureCookSetup({ recipeOptions: { eggs: 'pasteurised' } });
    const direct = E.simulateCook(E.RECIPES.scrambledEggs, E.logToSchedule(eggLog, 82), original);
    const result = replay(original).result;
    expect(direct.judgement.score).toBe(90);
    expect(result.judgement).toEqual(direct.judgement);
    expect(result.snapshot).toEqual(direct.snapshot);
    expect(result.history).toEqual(direct.history);
    expect(replay(E.captureCookSetup({})).result.judgement.score).toBe(49);
  });

  it.each(['castIron', 'stainless', 'nonstick'])('keeps %s material, oil, altitude and options in unchanged replay', (material) => {
    const original = { ...setup(), material };
    const direct = E.simulateCook(E.RECIPES.scrambledEggs, E.logToSchedule(eggLog, 82), original);
    expect(replay(original).result.snapshot).toEqual(direct.snapshot);
    expect(replay(original).result.history).toEqual(direct.history);
  });

  it('changes only the chosen factor and never mutates the original options', () => {
    const original = setup();
    Object.freeze(original.options);
    Object.freeze(original);
    const changed = replay(original, 'opt:eggs', 'regular');
    expect(changed.setup).toMatchObject({ material: 'castIron', oil: 'Butter', altitudeFt: 5280, options: { eggs: 'regular' } });
    expect(original.options).toEqual({ eggs: 'pasteurised' });
    expect(replay(original, 'pan', 'stainless').setup).toMatchObject({ material: 'stainless', oil: 'Butter', altitudeFt: 5280, options: { eggs: 'pasteurised' } });
    expect(replay(original, 'stir', 'never').setup).toMatchObject({ material: 'castIron', oil: 'Butter', altitudeFt: 5280, options: { eggs: 'pasteurised' }, noStir: true });
  });

  it('preserves altitude and independent pot actions in a multi-pot replay', () => {
    const rec = E.RECIPES.pastaSauce;
    const log = [{ t: 0, k: 'pot', action: 'start' }, { t: 0, k: 'dial', level: 4 },
      { t: 30, k: 'add', id: 'oil' }, { t: 40, k: 'add', id: 'garlic' },
      { t: 70, k: 'add', id: 'tomatoes' }, { t: 500, k: 'pot', action: 'drop' },
      { t: 600, k: 'pot', action: 'dial', level: 4 }, { t: 700, k: 'pot', action: 'drainKeep' }];
    const original = E.captureCookSetup({ klPanMaterial: 'castIron', recipeOil: 'Canola oil', recipeOptions: { lid: 'covered' }, klAltitudeFt: 10000 });
    const direct = E.simulateCook(rec, E.logToSchedule(log, 750), original);
    const unchanged = E.runReplay(rec, log, 750, 'pot', 'dial', '0', original).result;
    expect(unchanged.snapshot).toEqual(direct.snapshot);
    expect(unchanged.state.potWaterReserved).toBe(direct.state.potWaterReserved);
    expect(unchanged.state.potTempF).toBe(direct.state.potTempF);
    expect(unchanged.snapshot.boilF).toBeLessThan(212);
  });

  it('keys cached replays by actual settings, actions and finish time', () => {
    const original = setup();
    const a = replay(original);
    expect(replay(original)).toBe(a);
    const b = replay({ ...original, options: { eggs: 'regular' } });
    expect(b).not.toBe(a);
    expect(b.result.snapshot.options.eggs).toBe('regular');
    expect(replay(original, 'dial', '0', eggLog, 100)).not.toBe(a);
    expect(replay(original, 'dial', '0', eggLog.filter(e => e.k !== 'stir'))).not.toBe(a);
  });

  it('keeps detached completed settings through serialization and later picker changes', () => {
    const state = { klPanMaterial: 'castIron', recipeOptions: { eggs: 'pasteurised' }, klAltitudeFt: 5280 };
    state.recipeReplaySetup = E.captureCookSetup(state);
    state.klPanMaterial = 'stainless';
    state.klAltitudeFt = 0;
    state.recipeOptions.eggs = 'regular';
    const saved = E.klCleanState(JSON.parse(JSON.stringify(state)));
    expect(E.recordedCookSetup(saved)).toMatchObject({ material: 'castIron', altitudeFt: 5280, options: { eggs: 'pasteurised' } });
    const detached = E.recordedCookSetup(saved);
    detached.options.eggs = 'regular';
    expect(saved.recipeReplaySetup.options.eggs).toBe('pasteurised');
    expect(E.freshCookState('scrambledEggs', 1).recipeReplaySetup).toBeNull();
  });

  it('uses available settings for older or malformed saved snapshots', () => {
    const legacy = { klPanMaterial: 'castIron', recipeOptions: { eggs: 'pasteurised' }, klAltitudeFt: 5280 };
    for (const bad of [null, 5, [], { version: 1, options: [] }, { version: 8, material: 'stainless', options: {} }]) {
      expect(E.recordedCookSetup({ ...legacy, recipeReplaySetup: bad })).toEqual(E.captureCookSetup(legacy));
    }
  });

  it('identifies the actual recorded choices, including a custom saved altitude', () => {
    const original = { ...setup(), altitudeFt: 4321 };
    expect(E.replayVariables(E.RECIPES.scrambledEggs, original).find(v => v.id === 'pan').original).toBe('castIron');
    expect(E.replayVariables(E.RECIPES.scrambledEggs, original).find(v => v.id === 'opt:eggs').original).toBe('pasteurised');
    const alt = E.replayVariables(E.RECIPES.pastaSauce, original).find(v => v.id === 'alt');
    expect(alt.original).toBe('4321');
    expect(alt.choices.some(c => c.id === '4321')).toBe(true);
  });
});

describe('Kitchen Lab replay controls use the same preserved setup', () => {
  function finished(overrides = {}) {
    const original = setup();
    const result = replay(original).result;
    return Object.assign(E.defaultState(), result.state, { activeSection: 'recipe', recipeActiveId: 'scrambledEggs',
      recipePhase: 'done', recipeStartedAt: 4242, recipeJudgement: result.judgement,
      recipeLog: eggLog, recipeSimElapsedSec: 82, recipeReplaySetup: original,
      klReplayVar: 'pan', klReplayChoice: 'castIron' }, overrides);
  }

  it('labels the recorded pan as unchanged even when current picker settings differ', () => {
    const html = renderTool('kitchenLab', { kitchenLab: finished({ klPanMaterial: 'stainless' }) });
    expect(html.includes('data-kl-replay="same"')).toBe(true);
    expect(html.includes('That is what you did.')).toBe(true);
  });

  it('compares replay results on both sides while preserving the recorded grade', () => {
    const original = setup(), baseline = replay(original).result;
    const state = finished({ klReplayVar: 'opt:eggs', klReplayChoice: 'regular', recipeJudgement: { ...baseline.judgement, score: 77, grade: 'C' } });
    const html = renderTool('kitchenLab', { kitchenLab: state });
    expect(html.includes('Your recorded score remains 77.')).toBe(true);
    expect(html.includes('The unchanged replay scores ' + baseline.judgement.score)).toBe(true);
    expect(state.recipeJudgement.score).toBe(77);
  });

  it('labels each comparison boiling point from its own setup, not the current picker', () => {
    const html = renderTool('kitchenLab', { kitchenLab: finished({ recipeActiveId: 'pastaSauce',
      klAltitudeFt: 0, klReplayVar: 'alt', klReplayChoice: '10000' }) });
    expect(html.includes('Boil A 201°F')).toBe(true);
    expect(html.includes('Boil B 192°F')).toBe(true);
    expect(html.includes('A · unchanged replay')).toBe(true);
  });

  it('starts the selected variation with every other recorded setting intact', () => {
    vi.useFakeTimers();
    const store = newStore({ kitchenLab: finished({ klReplayVar: 'opt:eggs', klReplayChoice: 'regular', klAltitudeFt: 0, klPanMaterial: 'stainless' }) });
    const host = document.createElement('div'); document.body.append(host);
    const root = ReactDOMClient.createRoot(host);
    try {
      React.act(() => root.render(cfg.render(makeCtx({ toolData: store.toolData }, store))));
      React.act(() => host.querySelector('[data-kl-replay-live]').click());
      expect(store.toolData.kitchenLab).toMatchObject({ recipePhase: 'cooking', klPanMaterial: 'castIron',
        klAltitudeFt: 5280, recipeOil: 'Butter', recipeOptions: { eggs: 'regular' }, recipeReplaySetup: null });
    } finally { React.act(() => root.unmount()); host.remove(); vi.clearAllTimers(); }
  });
});
