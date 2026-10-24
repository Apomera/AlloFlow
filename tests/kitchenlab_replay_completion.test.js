// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let E, cfg;
beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab');
  E = cfg.engine;
});
afterEach(() => vi.useRealTimers());

function mount(state) {
  const store = newStore({ kitchenLab: state });
  const host = document.createElement('div');
  document.body.append(host);
  const root = ReactDOMClient.createRoot(host);
  const draw = () => React.act(() => root.render(cfg.render(makeCtx({ toolData: store.toolData }, store))));
  draw();
  return { store, host, draw, close: () => { React.act(() => root.unmount()); host.remove(); vi.clearAllTimers(); } };
}

describe('Kitchen Lab saves replay settings when the live cook finishes', () => {
  it.each([
    ['ordinary recipe', 'steak', {}],
    ['competition', 'steak', { competitionActive: true, competitionConstraints: [] }],
    ['tournament round', 'steak', { competitionActive: true, competitionConstraints: [], tournamentActive: true, tournamentRound: 0, tournamentScores: [] }],
    ['sandbox readout', 'freeCook', { sandboxFood: 'steak' }]
  ])('captures detached setup through the %s completion branch', (_name, recipeId, extra) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T02:00:00Z'));
    const state = Object.assign(E.defaultState(), E.freshCookState(recipeId, Date.now() - 600000), {
      activeSection: 'recipe', recipeCurrentStep: E.RECIPES[recipeId].steps.length - 1,
      klPanMaterial: 'castIron', klAltitudeFt: 5280, recipeOil: 'Canola oil',
      recipeOptions: { dry: 'wet', target: 'mediumWell' },
      recipeItemsInPan: ['oil', 'steak'], recipeIngredientOrder: ['oil', 'steak'],
      recipeFoodPeakF: 151, recipeFoodInternalF: 148, recipeBrowning: 5,
      recipeMaxPanTempF: 440, recipePanTempF: 200, recipeActiveTimeSec: 450,
      recipeSimElapsedSec: 600, recipeHeatRemovedSimSec: 400,
      recipeHeatRemovedAt: Date.now() - 200000, recipeLastTickAt: Date.now(),
      recipeLog: [{ t: 0, k: 'dial', level: 8 }, { t: 60, k: 'add', id: 'oil' }, { t: 70, k: 'add', id: 'steak' }, { t: 400, k: 'dial', level: 0 }]
    }, extra);
    const expected = E.captureCookSetup(state);
    const m = mount(state);
    try {
      const finish = [...m.host.querySelectorAll('button')].find(b => /Slice \+ serve|Finish \+ read/.test(b.textContent));
      expect(finish).toBeDefined();
      React.act(() => finish.click());
      const completed = m.store.toolData.kitchenLab;
      expect(completed.recipePhase).toBe('done');
      expect(completed.recipeReplaySetup).toEqual(expected);
      expect(completed.recipeReplaySetup.options).not.toBe(completed.recipeOptions);
      if (extra.competitionActive) expect(completed.recipeJudgement.compResult).toBeTruthy();
      if (extra.tournamentActive) expect(completed.tournamentScores[0]).toBe(completed.recipeJudgement.compResult.finalScore);
      if (recipeId === 'freeCook') expect(completed.recipeJudgement.score).toBeNull();

      const gradeBefore = JSON.stringify(completed.recipeJudgement);
      completed.recipeOptions.target = 'well';
      completed.klPanMaterial = 'nonstick';
      completed.klAltitudeFt = 0;
      m.draw();
      expect(E.recordedCookSetup(m.store.toolData.kitchenLab)).toEqual(expected);
      expect(JSON.stringify(m.store.toolData.kitchenLab.recipeJudgement)).toBe(gradeBefore);
    } finally { m.close(); }
  });

  it('captures the final ingredient completion after automatic advancement', () => {
    vi.useFakeTimers();
    const state = Object.assign(E.defaultState(), E.freshCookState('scrambledEggs'), {
      activeSection: 'recipe', recipeCurrentStep: E.RECIPES.scrambledEggs.steps.length - 1,
      klPanMaterial: 'nonstick', klAltitudeFt: 7000, recipeOil: 'Butter',
      recipeOptions: { eggs: 'pasteurised' }, recipeItemsInPan: ['butter', 'eggs'],
      recipeFoodPeakF: 150, recipeFoodInternalF: 150, recipeFoodSetAt: Date.now(),
      recipePanTempF: 250, recipeMaxPanTempF: 270, recipeSimElapsedSec: 90
    });
    const expected = E.captureCookSetup(state);
    const m = mount(state);
    try {
      const salt = [...m.host.querySelectorAll('button')].find(b => /Add Salt/.test(b.textContent));
      expect(salt).toBeDefined();
      React.act(() => salt.click());
      m.draw();
      React.act(() => vi.advanceTimersByTime(0));
      expect(m.store.toolData.kitchenLab.recipePhase).toBe('done');
      expect(m.store.toolData.kitchenLab.recipeReplaySetup).toEqual(expected);
      expect(m.store.toolData.kitchenLab.recipeLog.some(e => e.k === 'add' && e.id === 'saltPepper')).toBe(true);
    } finally { m.close(); }
  });
});
